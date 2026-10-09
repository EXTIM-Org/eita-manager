import struct
from typing import Any, Dict, List, Tuple

# Eitaa Protocol Constants
EITAA_OBJECT_ID = 0x7abe77ed
CODE_SETTINGS_ID = 0xdebebe83
AUTH_SEND_CODE_ID = 0xa677244f
AUTH_SIGN_IN_ID = 0xbcd51581
RPC_ERROR_ID = 0x2144ca19
RPC_RESULT_ID = 0xf35c6d01
VECTOR_ID = 0x1cb5c415

INPUT_CHANNEL_ID = 0xf35aec28
CHANNELS_LEAVE_CHANNEL_ID = 0xf836aa95
MESSAGES_DELETE_CHAT_USER_ID = 0xa210f066
INPUT_USER_SELF_ID = 0xf7c1b13f
MESSAGES_GET_DIALOGS_ID = 0xa0f4cb4f

def tl_int(val: int) -> bytes:
    return struct.pack("<i", val)

def tl_uint(val: int) -> bytes:
    return struct.pack("<I", val)

def tl_long(val: int) -> bytes:
    return struct.pack("<q", val)

def tl_ulong(val: int) -> bytes:
    return struct.pack("<Q", val)

def tl_string(val: str) -> bytes:
    if val is None:
        val = ""
    data = val.encode("utf-8")
    length = len(data)
    if length <= 253:
        res = bytes([length]) + data
    else:
        res = bytes([254, length & 0xFF, (length >> 8) & 0xFF, (length >> 16) & 0xFF]) + data
    pad = (4 - (len(res) % 4)) % 4
    return res + (b"\x00" * pad)

def tl_bytes(data: bytes) -> bytes:
    if data is None:
        data = b""
    length = len(data)
    if length <= 253:
        res = bytes([length]) + data
    else:
        res = bytes([254, length & 0xFF, (length >> 8) & 0xFF, (length >> 16) & 0xFF]) + data
    pad = (4 - (len(res) % 4)) % 4
    return res + (b"\x00" * pad)

def tl_vector(items: List[bytes]) -> bytes:
    res = tl_uint(VECTOR_ID) + tl_int(len(items))
    for item in items:
        res += item
    return res

def build_eitaa_object(packed_data: bytes, token: str = "", imei: str = "", layer: int = 135, flags: int = 128) -> bytes:
    """
    Wraps payload inside official EitaaObject.
    """
    return (
        tl_uint(EITAA_OBJECT_ID)
        + tl_string(token)
        + tl_string(imei)
        + tl_bytes(packed_data)
        + tl_int(layer)
        + tl_int(flags)
    )

def build_send_code(phone: str, api_id: int, api_hash: str) -> bytes:
    code_settings = tl_uint(CODE_SETTINGS_ID) + tl_int(0) # flags = 0
    return (
        tl_uint(AUTH_SEND_CODE_ID)
        + tl_string(phone)
        + tl_int(api_id)
        + tl_string(api_hash)
        + code_settings
    )

def build_sign_in(phone: str, phone_code_hash: str, phone_code: str) -> bytes:
    return (
        tl_uint(AUTH_SIGN_IN_ID)
        + tl_string(phone)
        + tl_string(phone_code_hash)
        + tl_string(phone_code)
    )

def build_leave_channel(channel_id: int, access_hash: int) -> bytes:
    input_channel = (
        tl_uint(INPUT_CHANNEL_ID)
        + tl_long(channel_id)
        + tl_long(access_hash)
    )
    return tl_uint(CHANNELS_LEAVE_CHANNEL_ID) + input_channel

def build_delete_chat_user(chat_id: int) -> bytes:
    user_self = tl_uint(INPUT_USER_SELF_ID)
    # id: 0xa210f06b
    # params: flags:#, chat_id:long, user_id:InputUser
    # We pass flags = 0 (no revoke_history)
    return (
        tl_uint(0xa210f06b)
        + tl_int(0)
        + tl_long(chat_id)
        + user_self
    )

def build_messages_delete_history(peer_id: int, access_hash: int, is_channel: bool = True) -> bytes:
    # messages.deleteHistory#1c015b09 flags:# just_clear:flags.0?true revoke:flags.1?true peer:InputPeer max_id:int = messages.AffectedHistory
    # We want to DELETE the dialog entirely, so just_clear=False, revoke=False -> flags = 0
    if is_channel:
        input_peer = tl_uint(0x20adaef8) + tl_long(peer_id) + tl_long(access_hash)
    else:
        input_peer = tl_uint(0x3960e6f0) + tl_long(peer_id) # InputPeerChat
        
    return (
        tl_uint(0x1c015b09)
        + tl_int(0) # flags
        + input_peer
        + tl_int(2147483647) # max_id (delete all)
    )

class TLReader:
    def __init__(self, data: bytes):
        self.data = data
        self.offset = 0

    def remaining(self) -> int:
        return len(self.data) - self.offset

    def read_int(self) -> int:
        val = struct.unpack_from("<i", self.data, self.offset)[0]
        self.offset += 4
        return val

    def read_uint(self) -> int:
        val = struct.unpack_from("<I", self.data, self.offset)[0]
        self.offset += 4
        return val

    def read_long(self) -> int:
        val = struct.unpack_from("<q", self.data, self.offset)[0]
        self.offset += 8
        return val

    def read_ulong(self) -> int:
        val = struct.unpack_from("<Q", self.data, self.offset)[0]
        self.offset += 8
        return val

    def read_string(self) -> str:
        b = self.read_bytes()
        return b.decode("utf-8", errors="ignore")

    def read_bytes(self) -> bytes:
        if self.offset >= len(self.data):
            return b""
        first = self.data[self.offset]
        self.offset += 1
        if first <= 253:
            length = first
        else:
            length = (
                self.data[self.offset]
                | (self.data[self.offset + 1] << 8)
                | (self.data[self.offset + 2] << 16)
            )
            self.offset += 3
        data = self.data[self.offset : self.offset + length]
        self.offset += length
        pad = (4 - ((length + (1 if first <= 253 else 4)) % 4)) % 4
        self.offset += pad
        return data

def parse_eitaa_response(data: bytes) -> Dict[str, Any]:
    """
    Parses an incoming TL response from Eitaa server.
    """
    if len(data) < 4:
        return {"type": "error", "message": "Response too short", "code": 500}
    
    reader = TLReader(data)
    cid = reader.read_uint()

    # RPC Result wrapper
    if cid == RPC_RESULT_ID:
        if reader.remaining() >= 8:
            req_msg_id = reader.read_long()
            inner_cid = reader.read_uint()
            if inner_cid == RPC_ERROR_ID:
                code = reader.read_int()
                msg = reader.read_string()
                return {
                    "type": "rpc_error",
                    "error_code": code,
                    "error_message": msg
                }
            # Otherwise it is a successful RPC result, return raw data including inner result
            return {
                "type": "rpc_result",
                "req_msg_id": req_msg_id,
                "constructor_id": hex(inner_cid),
                "raw_bytes": data[12:] # Exclude rpc_result header and req_msg_id
            }

    # RPC Error constructor
    if cid == RPC_ERROR_ID:
        code = reader.read_int()
        msg = reader.read_string()
        return {
            "type": "rpc_error",
            "error_code": code,
            "error_message": msg
        }
    
    return {
        "type": "raw_response",
        "constructor_id": hex(cid),
        "raw_bytes": data
    }
