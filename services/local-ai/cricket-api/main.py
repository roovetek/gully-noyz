"""Cricket Vision API entrypoint.

Exposes video upload sessions and websocket telemetry streaming.
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

from processing import SessionManager
from vision.pipeline import VisionPipeline

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
async def lifespan(_app: FastAPI):
    global _pipeline
    _pipeline = VisionPipeline()
    manager.attach_pipeline(_pipeline)
    try:
        yield
    finally:
        _pipeline = None


app = FastAPI(title="Cricket Vision API", version="0.2.0", lifespan=lifespan)

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
        try:
            os.unlink(path)
        except OSError:
            pass
        raise HTTPException(status_code=500, detail=f"Upload failed: {e}") from e

    return path


@app.get("/health")
async def health() -> dict[str, str]:
    return {"status": "ok"}


@app.post("/sessions")
async def create_session(file: UploadFile = File(...)) -> dict[str, Any]:
    path = await _save_upload(file)
    sess = await manager.create_session(path)

    ws_path = f"/ws/stream/{sess.id}"
    ws_base = os.environ.get("CRICKET_PUBLIC_WS_BASE", "").strip().rstrip("/")
    websocket_url = f"{ws_base}{ws_path}" if ws_base else None

    return {
        "session_id": sess.id,
        "ws_path": ws_path,
        "websocket_url": websocket_url,
    }


# Backward compatibility for frontend variants that post to /upload.
@app.post("/upload")
async def upload_alias(file: UploadFile = File(...)) -> dict[str, str]:
    data = await create_session(file)
    return {"session_id": str(data["session_id"]) }


@app.get("/sessions/{session_id}")
async def get_session(session_id: str) -> dict[str, str]:
    sess = await manager.get(session_id)
    if not sess:
        raise HTTPException(status_code=404, detail="Session not found")
    return {"session_id": sess.id, "video_path": sess.video_path}


async def _stream_loop(websocket: WebSocket, session_id: str) -> None:
    await websocket.accept()
    sess = await manager.subscribe_ws(session_id, websocket)
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


@app.websocket("/ws/stream/{session_id}")
async def stream_websocket(websocket: WebSocket, session_id: str) -> None:
    await _stream_loop(websocket, session_id)


# Backward compatibility for clients using /ws/{session_id}.
@app.websocket("/ws/{session_id}")
async def stream_websocket_alias(websocket: WebSocket, session_id: str) -> None:
    await _stream_loop(websocket, session_id)
