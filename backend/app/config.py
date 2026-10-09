import os
from pathlib import Path

BASE_DIR = Path(__file__).resolve().parent.parent.parent
DATA_DIR = BASE_DIR / "data"
DATA_DIR.mkdir(exist_ok=True)

DB_PATH = DATA_DIR / "eitaa_cleaner.db"
DATABASE_URL = f"sqlite+aiosqlite:///{DB_PATH.as_posix()}"

# Secret key for local session encryption
# Can be overridden by environment variable or set via panel master password
SECRET_KEY = os.getenv("EITAA_SECRET_KEY", "eitaa-cleaner-master-key-2026-secure-vault")

# Eitaa API constants (extracted from official web client)
EITAA_API_ID = 1025907
EITAA_API_HASH = "452b0359b988148995f22ff0f4229750"
EITAA_LAYER = 135
EITAA_FLAGS = 128

# Official Eitaa datacenters
EITAA_DC_LIST = [
    "https://hasan.eitaa.ir/eitaa/",
    "https://hosna.eitaa.com/eitaa/",
    "https://armita.eitaa.com/eitaa/",
    "https://majid.eitaa.com/eitaa/",
    "https://alireza.eitaa.com/eitaa/",
    "https://mostafa.eitaa.com/eitaa/",
    "https://sajad.eitaa.ir/eitaa/",
    "https://bagher.eitaa.ir/eitaa/",
    "https://sadegh.eitaa.ir/eitaa/",
    "https://kazem.eitaa.ir/eitaa/"
]

# Server host & port
HOST = os.getenv("HOST", "127.0.0.1")
PORT = int(os.getenv("PORT", "8000"))
