import base64
import os
from cryptography.hazmat.primitives.ciphers.aead import AESGCM
from cryptography.hazmat.primitives.kdf.pbkdf2 import PBKDF2HMAC
from cryptography.hazmat.primitives import hashes
from app.config import SECRET_KEY

# Derive 256-bit key using PBKDF2
def derive_key(secret: str, salt: bytes) -> bytes:
    kdf = PBKDF2HMAC(
        algorithm=hashes.SHA256(),
        length=32,
        salt=salt,
        iterations=100_000,
    )
    return kdf.derive(secret.encode("utf-8"))

def encrypt_data(plaintext: str, custom_key: str = None) -> dict:
    """
    Encrypts string using AES-256-GCM.
    Returns dict with base64 encoded payload, salt, and iv.
    """
    key_secret = custom_key or SECRET_KEY
    salt = os.urandom(16)
    key = derive_key(key_secret, salt)
    aesgcm = AESGCM(key)
    iv = os.urandom(12) # Standard 96-bit nonce for GCM
    ciphertext = aesgcm.encrypt(iv, plaintext.encode("utf-8"), None)
    
    return {
        "ciphertext": base64.b64encode(ciphertext).decode("utf-8"),
        "salt": base64.b64encode(salt).decode("utf-8"),
        "iv": base64.b64encode(iv).decode("utf-8"),
    }

def decrypt_data(encrypted_data: dict, custom_key: str = None) -> str:
    """
    Decrypts AES-256-GCM encrypted payload.
    """
    key_secret = custom_key or SECRET_KEY
    salt = base64.b64decode(encrypted_data["salt"])
    iv = base64.b64decode(encrypted_data["iv"])
    ciphertext = base64.b64decode(encrypted_data["ciphertext"])
    
    key = derive_key(key_secret, salt)
    aesgcm = AESGCM(key)
    plaintext_bytes = aesgcm.decrypt(iv, ciphertext, None)
    return plaintext_bytes.decode("utf-8")
