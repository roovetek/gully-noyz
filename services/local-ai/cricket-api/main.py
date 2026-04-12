"""
Cricket Vision API: YOLO pose + ball detect, rules engine, Ollama narrative, WebSocket telemetry.
"""

from __future__ import annotations

import os
import shutil
import tempfile
from contextlib import asynccontextmanager
from pathlib import Path
from typing import Any

from fastapi import FastAPI, File, HTTPException, UploadFile, WebSocket, WebSocketDisconnect
from fastapi.middleware.cors import CORSMiddleware

import logging

from processing import SessionManager
from vision.pipeline import VisionPipeline

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

ALLOWED_VIDEO = frozenset({".mp4", ".webm", ".mov", ".mkv", ".avi"})

_pipeline: VisionPipeline | None = None
manager = SessionManager()


def _max_upload_bytes() -> int:
    mb = float(os.environ.get("CRICKET_MAX_UPLOAD_MB", "200"))
    return int(mb * 1024 * 1024)


def _cors_origins() -> list[str]:
    raw = os.environ.get(
        "CRICKET_CORS_ORIGINS",
        "http://localhost:5173,http://127.0.0.1:5173,"
        "http://localhost:5174,http://127.0.0.1:5174,"
        "http://localhost:5175,http://127.0.0.1:5175",
    )
    return [o.strip() for o in raw.split(",") if o.strip()]


@asynccontextmanager
async def lifespan(app: FastAPI):
    global _pipeline
    logger.info("Loading vision pipeline (YOLO weights may download on first run)...")
    _pipeline = VisionPipeline()
    manager.attach_pipeline(_pipeline)
    yield
    _app_pipeline_cleanup(_pipeline)

async def _app_pipeline_cleanup(pipeline: VisionPipeline):
    global _pipeline
    _pipeline = None
    logger.info("Vision pipeline cleaned up.")


app = FastAPI(title="Cricket Vision API", version="0.1.0", lifespan=lifespan)

app.add_middleware(
    CORSMiddleware,
    allow_origins=_cors_origins(),
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


def _validate_video(name: str) -> str:
    if not name:
        raise HTTPException(status_code=400, detail="Missing filename")
    suf = Path(name).suffix.lower()
    if suf not in ALLOWED_VIDEO:
        raise HTTPException(
            status_code=400,
            detail=f"Allowed video types: {', '.join(sorted(ALLOWED_VIDEO))}",
        )
    return suf


async def _save_upload(upload: UploadFile) -> str:
    _validate_video(upload.filename or "")
    max_b = _max_upload_bytes()
    await upload.seek(0)
    suf = Path(upload.filename or "video.mp4").suffix.lower()
    tmp = tempfile.NamedTemporaryFile(delete=False, suffix=suf)
    path = tmp.name
    tmp.close()
    try:
        with open(path, "wb") as out:
            shutil.copyfileobj(upload.file, out)
        size = os.path.getsize(path)
        if size == 0:
            raise HTTPException(status_code=400, detail="Empty file")
        if size > max_b:
            raise HTTPException(
                status_code=413,
                detail=f"File too large (max {max_b // (1024 * 1024)} MB)",
            )
    except HTTPException:
        try:
            os.unlink(path)
        except OSError:
            pass
        raise
    except Exception as e:
        logger.error(f"Upload error: {e}")
        try:
            os.unlink(path)
        except OSError:
            pass
        raise HTTPException(status_code=500, detail="Internal server error during upload")
    return path


@app.get("/sessions")
async def list_sessions() -> list[str]:
    return list(manager.sessions.keys())

@app.get("/sessions/{session_id}")
async def get_session_info(session_id: str) -> dict[str, Any]:
    session = manager.sessions.get(session_id)
    if not session:
        raise HTTPException(status_code=404, detail="Session not found")
    return {"session_id": session_id, "video_path": session.video_path}

@app.get("/health")
async def health() -> dict[str, str]:
    return {"status": "ok"}


@app.post("/upload")
async def upload_video(file: UploadFile = File(...)) -> dict[str, str]:
    path = await _save_upload(file)
    session_id = manager.create_session(path)
    return {"session_id": session_id, "video_path": path}

@app.websocket("/ws/{session_id}")
async def websocket_endpoint(websocket: WebSocket, session_id: str):
    await manager.connect_websocket(websocket, session_id)
    try:
        while True:
            await websocket.receive_text()
    except WebSocketDisconnect:
        await manager.disconnect_websocket(session_id)
    except Exception as e:
        logger.error(f"WebSocket error: {e}")
        await manager.disconnect_websocket(session_id)
    if not sess:
        await websocket.close(code=4004)
        return
    try:
        while True:
            await websocket.receive_text()
    except WebSocketDisconnect:
        pass
    finally:
        await manager.unsubscribe_ws(session_id, websocket)
