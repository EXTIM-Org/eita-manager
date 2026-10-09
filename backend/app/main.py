import os
from contextlib import asynccontextmanager
from pathlib import Path
from fastapi import FastAPI, WebSocket, WebSocketDisconnect
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles
from fastapi.responses import FileResponse

from app.database.connection import init_db
from app.engine.cleaner import cleaner_engine
from app.api.websocket import ws_manager
from app.api.routes_auth import router as auth_router
from app.api.routes_accounts import router as accounts_router
from app.api.routes_clean import router as clean_router
from app.api.routes_stats import router as stats_router
from app.api.routes_reports import router as reports_router
from app.api.routes_settings import router as settings_router

FRONTEND_DIR = Path(__file__).resolve().parent.parent.parent / "frontend"

@asynccontextmanager
async def lifespan(app: FastAPI):
    # Startup: initialize database and start cleaner queue
    await init_db()
    cleaner_engine.set_broadcaster(ws_manager.broadcast)
    await cleaner_engine.start()
    yield
    # Shutdown
    await cleaner_engine.stop()

app = FastAPI(
    title="Eitaa Account Manager & Cleaner API",
    version="1.0.0",
    lifespan=lifespan
)

# CORS Middleware
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Include Routers
app.include_router(auth_router)
app.include_router(accounts_router)
app.include_router(clean_router)
app.include_router(stats_router)
app.include_router(reports_router)
app.include_router(settings_router)

# WebSocket Endpoint
@app.websocket("/ws/live")
async def websocket_endpoint(websocket: WebSocket):
    await ws_manager.connect(websocket)
    try:
        while True:
            # Keep socket alive and listen for client messages
            await websocket.receive_text()
    except WebSocketDisconnect:
        ws_manager.disconnect(websocket)
    except Exception:
        ws_manager.disconnect(websocket)

# Mount Frontend Static Files
if FRONTEND_DIR.exists():
    app.mount("/static", StaticFiles(directory=str(FRONTEND_DIR)), name="static")

    @app.get("/")
    async def serve_index():
        return FileResponse(FRONTEND_DIR / "index.html")

    @app.get("/{full_path:path}")
    async def serve_spa_paths(full_path: str):
        file_path = FRONTEND_DIR / full_path
        if file_path.exists() and file_path.is_file():
            return FileResponse(file_path)
        return FileResponse(FRONTEND_DIR / "index.html")
