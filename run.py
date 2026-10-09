import os
import sys
import webbrowser
import uvicorn
from pathlib import Path

# Ensure UTF-8 console output
if sys.stdout and hasattr(sys.stdout, 'reconfigure'):
    sys.stdout.reconfigure(encoding='utf-8')

# Add backend directory to sys.path
BASE_DIR = Path(__file__).resolve().parent
BACKEND_DIR = BASE_DIR / "backend"
sys.path.insert(0, str(BACKEND_DIR))

def main():
    print("=" * 60)
    print(" سامانه مدیریت و پاکسازی چند حساب ایتا (Eitaa Account Manager)")
    print("=" * 60)
    print(" [OK] در حال راه اندازی سرور و رابط کاربری تحت وب...")
    print(" [OK] پایگاه داده محلی و ماژول رمزنگاری AES-256-GCM فعال شد.")
    print(" [OK] پورت ارتباطی: 8000")
    print(" [OK] آدرس دسترسی در مرورگر: http://127.0.0.1:8000")
    print("=" * 60)

    # Automatically open browser
    try:
        webbrowser.open("http://127.0.0.1:8000")
    except Exception:
        pass

    host = os.getenv("HOST", "127.0.0.1")
    port = int(os.getenv("PORT", "8000"))
    reload = os.getenv("RELOAD", "false").lower() in ("true", "1")

    # Start FastAPI server via Uvicorn
    uvicorn.run(
        "app.main:app",
        host=host,
        port=port,
        reload=reload,
        reload_dirs=[str(BACKEND_DIR)] if reload else None,
        log_level="info"
    )

if __name__ == "__main__":
    main()
