import gzip
import json
import struct
from pathlib import Path
from typing import Any, Dict, List, Optional, Tuple

SCHEMA_PATH = Path(__file__).parent / "schema.json"
CONSTRUCTORS_BY_ID: Dict[int, Dict[str, Any]] = {}
CONSTRUCTORS_BY_PREDICATE: Dict[str, Dict[str, Any]] = {}

if SCHEMA_PATH.exists():
    with open(SCHEMA_PATH, "r", encoding="utf-8") as f:
        CONSTRUCTORS_LIST = json.load(f)
    for c in CONSTRUCTORS_LIST:
        cid = c["id"]
        unsigned_id = cid & 0xFFFFFFFF
        CONSTRUCTORS_BY_ID[cid] = c
        CONSTRUCTORS_BY_ID[unsigned_id] = c
        CONSTRUCTORS_BY_PREDICATE[c["predicate"]] = c

VECTOR_ID = 0x1CB5C415
GZIP_PACKED_ID = 0x3072C41E
RPC_ERROR_ID = 0xC4B9F9BB
AUTH_AUTHORIZATION_ID = -855308010 & 0xFFFFFFFF # 0xcd050916

CHANNEL_CONSTRUCTOR_ID = -2107528095 & 0xFFFFFFFF # 0x8261ac61
CHAT_CONSTRUCTOR_ID = 1103884886 & 0xFFFFFFFF    # 0x41cbf256
CHANNEL_FORBIDDEN_ID = 399807445 & 0xFFFFFFFF   # 0x17d49bd5
CHAT_FORBIDDEN_ID = 1704108455 & 0xFFFFFFFF     # 0x6592a1a7

class TLBuffer:
    def __init__(self, data: bytes):
        self.data = data
        self.offset = 0

    def remaining(self) -> int:
        return len(self.data) - self.offset

    def read_int(self) -> int:
        if self.remaining() < 4:
            raise ValueError("Buffer underflow reading int")
        val = struct.unpack_from("<i", self.data, self.offset)[0]
        self.offset += 4
        return val

    def read_uint(self) -> int:
        if self.remaining() < 4:
            raise ValueError("Buffer underflow reading uint")
        val = struct.unpack_from("<I", self.data, self.offset)[0]
        self.offset += 4
        return val

    def read_long(self) -> int:
        if self.remaining() < 8:
            raise ValueError("Buffer underflow reading long")
        val = struct.unpack_from("<q", self.data, self.offset)[0]
        self.offset += 8
        return val

    def read_double(self) -> float:
        if self.remaining() < 8:
            raise ValueError("Buffer underflow reading double")
        val = struct.unpack_from("<d", self.data, self.offset)[0]
        self.offset += 8
        return val

    def read_raw(self, count: int) -> bytes:
        if self.remaining() < count:
            raise ValueError("Buffer underflow reading raw bytes")
        val = self.data[self.offset : self.offset + count]
        self.offset += count
        return val

    def read_bytes(self) -> bytes:
        if self.remaining() < 1:
            return b""
        first = self.data[self.offset]
        self.offset += 1
        if first <= 253:
            length = first
            header_len = 1
        else:
            if self.remaining() < 3:
                return b""
            length = (
                self.data[self.offset]
                | (self.data[self.offset + 1] << 8)
                | (self.data[self.offset + 2] << 16)
            )
            self.offset += 3
            header_len = 4
        if self.remaining() < length:
            return b""
        val = self.data[self.offset : self.offset + length]
        self.offset += length
        pad = (4 - ((length + header_len) % 4)) % 4
        self.offset += min(pad, self.remaining())
        return val

    def read_string(self) -> str:
        b = self.read_bytes()
        return b.decode("utf-8", errors="ignore")


def decompress_if_needed(data: bytes) -> bytes:
    """Handles Gzip packed TL wrapper or raw gzip stream."""
    if len(data) >= 4:
        cid = struct.unpack_from("<I", data, 0)[0]
        if cid == GZIP_PACKED_ID:
            buf = TLBuffer(data)
            buf.offset = 4
            packed = buf.read_bytes()
            try:
                return gzip.decompress(packed)
            except Exception:
                pass
    if data.startswith(b"\x1f\x8b"):
        try:
            return gzip.decompress(data)
        except Exception:
            pass
    return data


def extract_auth_token(data: bytes) -> Optional[str]:
    """Extracts session token from auth.authorization response."""
    raw = decompress_if_needed(data)
    if len(raw) < 8:
        return None

    # Search for AUTH_AUTHORIZATION_ID (0xcd050916) in the raw buffer
    for offset in range(0, len(raw) - 8, 4):
        cid = struct.unpack_from("<I", raw, offset)[0]
        if cid == AUTH_AUTHORIZATION_ID:
            try:
                buf = TLBuffer(raw)
                buf.offset = offset + 4
                flags = buf.read_uint()
                token = buf.read_string()
                if token and len(token) >= 5:
                    return token
            except Exception:
                continue
    return None


def extract_chats_and_channels(data: bytes) -> List[Dict[str, Any]]:
    """
    Scans TL packet for all channel and group records, returning
    unified metadata for dialog inspection and cleaner engine.
    """
    raw = decompress_if_needed(data)
    if len(raw) < 16:
        return []

    results = []
    seen_ids = set()

    for offset in range(0, len(raw) - 16, 4):
        cid = struct.unpack_from("<I", raw, offset)[0]

        # 1. Channel / Supergroup constructor
        if cid == CHANNEL_CONSTRUCTOR_ID:
            try:
                buf = TLBuffer(raw)
                buf.offset = offset + 4
                flags = buf.read_uint()
                channel_id = buf.read_long()

                if channel_id in seen_ids or channel_id <= 0:
                    continue

                access_hash = buf.read_long() if (flags & (1 << 13)) else 0
                title = buf.read_string()

                if not title or len(title.strip()) == 0:
                    continue

                is_creator = bool(flags & (1 << 0))
                is_left = bool(flags & (1 << 2))
                is_broadcast = bool(flags & (1 << 5))
                is_megagroup = bool(flags & (1 << 8))
                is_admin = bool(flags & (1 << 14)) or is_creator

                if is_left:
                    continue

                seen_ids.add(channel_id)
                results.append({
                    "peer_id": str(channel_id),
                    "access_hash": access_hash,
                    "title": title.strip(),
                    "type": "channel" if is_broadcast else "supergroup",
                    "is_creator": is_creator,
                    "is_admin": is_admin,
                    "members_count": 0
                })
            except Exception:
                continue

        # 2. Basic Group constructor
        elif cid == CHAT_CONSTRUCTOR_ID:
            try:
                buf = TLBuffer(raw)
                buf.offset = offset + 4
                flags = buf.read_uint()
                chat_id = buf.read_long()

                if chat_id in seen_ids or chat_id <= 0:
                    continue

                is_creator = bool(flags & (1 << 0))
                is_kicked = bool(flags & (1 << 1))
                is_left = bool(flags & (1 << 2))
                is_deactivated = bool(flags & (1 << 5))

                if is_left or is_kicked or is_deactivated:
                    continue

                title = buf.read_string()
                if not title or len(title.strip()) == 0:
                    continue

                seen_ids.add(chat_id)
                results.append({
                    "peer_id": str(chat_id),
                    "access_hash": 0,
                    "title": title.strip(),
                    "type": "basic_group",
                    "is_creator": is_creator,
                    "is_admin": is_creator,
                    "members_count": 0
                })
            except Exception:
                continue

    return results


def extract_dialogs_pagination_offset(raw_data: bytes, chat_map: Optional[Dict[str, Any]] = None) -> Optional[Tuple[int, int, bytes]]:
    """
    Parses a messages.dialogsSlice TL payload and calculates the pagination
    offsets (offset_date, offset_id, offset_peer bytes) needed to request the next slice.
    Returns None if there are no more slices or if offsets cannot be determined.
    """
    raw = decompress_if_needed(raw_data)
    if len(raw) < 16:
        return None

    try:
        buf = TLBuffer(raw)
        cid = buf.read_uint()
        if cid != 0x71e094f3: # Not messages.dialogsSlice (e.g. messages.dialogs complete)
            return None
        
        total_count = buf.read_int()
        vec_id = buf.read_uint()
        d_count = buf.read_int()
        if d_count == 0:
            return None

        dialogs = []
        for _ in range(d_count):
            d_cid = buf.read_uint()
            flags = buf.read_uint()
            peer_cid = buf.read_uint()
            peer_id = buf.read_long()
            top_message = buf.read_int()
            read_inbox_max_id = buf.read_int()
            read_outbox_max_id = buf.read_int()
            unread_count = buf.read_int()
            unread_mentions = buf.read_int()
            if flags & (1 << 3): # unread_reactions
                _ = buf.read_int()
            _ = buf.read_uint() # notify_cid
            _ = buf.read_uint() # notify_flags
            if flags & (1 << 0): # pts
                _ = buf.read_int()
            if flags & (1 << 1): # draft
                _ = buf.read_uint()
            if flags & (1 << 4): # folder_id
                _ = buf.read_int()

            dialogs.append({
                "peer_cid": peer_cid,
                "peer_id": peer_id,
                "top_message": top_message
            })

        msg_vec_start = buf.offset

        # Scan dialogs in reverse to find a dialog with top_message and valid date in messages vector
        for d in reversed(dialogs):
            top_msg = d["top_message"]
            if top_msg <= 0:
                continue

            needle = struct.pack("<i", top_msg)
            idx = raw.find(needle, msg_vec_start)
            if idx == -1:
                continue

            found_date = None
            for off in range(max(msg_vec_start, idx - 16), min(len(raw) - 4, idx + 48), 4):
                val = struct.unpack_from("<I", raw, off)[0]
                if 1600000000 < val < 2100000000:
                    found_date = val
                    break

            if found_date:
                peer_cid = d["peer_cid"]
                peer_id = d["peer_id"]
                acc_hash = 0
                if chat_map and str(peer_id) in chat_map:
                    acc_hash = chat_map[str(peer_id)].get("access_hash", 0)

                if peer_cid == 0xa2a5371e: # peerChannel
                    input_peer = struct.pack("<I", 0x20adaef8) + struct.pack("<q", peer_id) + struct.pack("<q", acc_hash)
                elif peer_cid == 0x36c60888: # peerChat
                    input_peer = struct.pack("<I", 0x3960e6f0) + struct.pack("<q", peer_id)
                elif peer_cid == 0x59511761: # peerUser
                    input_peer = struct.pack("<I", 0x7b8e7de6) + struct.pack("<q", peer_id) + struct.pack("<q", acc_hash)
                else:
                    input_peer = struct.pack("<I", 0x7f3b18ea) # inputPeerEmpty

                return (found_date, top_msg, input_peer)

    except Exception:
        return None

    return None

