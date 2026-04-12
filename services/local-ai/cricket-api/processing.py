"""Video decode, inference loop, WebSocket broadcast."""

from __future__ import annotations

import asyncio
import json
import logging
import os
import time
import uuid
from collections import deque
from dataclasses import dataclass, field
from typing import Any

import cv2
from fastapi import WebSocket

from llm.narrative import OllamaNarrator, build_narrative_payload
from rules.engine import RulesEngine, VisionEvent
from vision.pipeline import InferenceResult, VisionPipeline, make_trajectory_deque

logger = logging.getLogger(__name__)


@dataclass
class Session:
    id: str
    video_path: str
    subscribers: list[WebSocket] = field(default_factory=list)
    processing: bool = False
    task: asyncio.Task[None] | None = None
    rules: RulesEngine = field(default_factory=RulesEngine)
    narrator: OllamaNarrator = field(default_factory=OllamaNarrator)
    trajectory: deque[dict[str, float]] = field(default_factory=make_trajectory_deque)
    frame_stride: int = 2
    prev_ball_y: float | None = None
    delivery_armed: bool = True


class SessionManager:
    def __init__(self, pipeline: VisionPipeline | None = None) -> None:
        self._sessions: dict[str, Session] = {}
        self._lock = asyncio.Lock()
        self._pipeline = pipeline

    async def create_session(self, video_path: str) -> Session:
        sid = str(uuid.uuid4())
        sess = Session(id=sid, video_path=video_path)
        async with self._lock:
            self._sessions[sid] = sess
        return sess

    async def get(self, session_id: str) -> Session | None:
        async with self._lock:
            return self._sessions.get(session_id)

    async def remove(self, session_id: str) -> None:
        async with self._lock:
            s = self._sessions.pop(session_id, None)
        if s and s.task and not s.task.done():
            s.task.cancel()
            try:
                await s.task
            except asyncio.CancelledError:
                pass
        if s:
            try:
                os.unlink(s.video_path)
            except OSError:
                pass

    def attach_pipeline(self, pipeline: VisionPipeline) -> None:
        self._pipeline = pipeline

    async def subscribe_ws(self, session_id: str, ws: WebSocket) -> Session | None:
        sess = await self.get(session_id)
        if not sess:
            return None
        sess.subscribers.append(ws)
        if not sess.processing and self._pipeline:
            sess.processing = True
            sess.task = asyncio.create_task(run_session_loop(sess, self._pipeline))
        return sess

    async def unsubscribe_ws(self, session_id: str, ws: WebSocket) -> None:
        sess = await self.get(session_id)
        if not sess:
            return
        if ws in sess.subscribers:
            sess.subscribers.remove(ws)


async def broadcast(session: Session, message: dict[str, Any]) -> None:
    dead: list[WebSocket] = []
    text = json.dumps(message)
    for ws in session.subscribers:
        try:
            await ws.send_text(text)
        except Exception:
            dead.append(ws)
    for ws in dead:
        if ws in session.subscribers:
            session.subscribers.remove(ws)


def _vision_to_event(
    inf: InferenceResult,
    frame_w: int,
    frame_h: int,
    session: Session,
) -> VisionEvent:
    ball_xn = ball_yn = None
    if inf.ball_center and frame_w > 0 and frame_h > 0:
        bx, by = inf.ball_center
        ball_xn = bx / frame_w
        ball_yn = by / frame_h

    delivery_completed = False
    runs_off_bat = 0
    if ball_yn is not None and session.prev_ball_y is not None:
        if session.delivery_armed and session.prev_ball_y < 0.38 and ball_yn >= 0.48:
            delivery_completed = True
            session.delivery_armed = False
            if ball_xn is not None:
                d = abs(ball_xn - 0.5)
                if d < 0.08:
                    runs_off_bat = 4
                elif d < 0.18:
                    runs_off_bat = 1
                else:
                    runs_off_bat = 0
    if ball_yn is not None and ball_yn < 0.32:
        session.delivery_armed = True
    session.prev_ball_y = ball_yn

    wide_threshold = float(os.environ.get("CRICKET_WIDE_THRESHOLD", "0.42"))
    foot_fake = False
    if inf.bowler_wrist_y is not None and frame_h > 0:
        foot_fake = inf.bowler_wrist_y > frame_h * 0.92

    return VisionEvent(
        ball_x_norm=ball_xn,
        ball_y_norm=ball_yn,
        ball_visible=inf.ball_center is not None and inf.ball_confidence >= 0.25,
        bowler_front_foot_over_crease=foot_fake,
        wide_threshold=wide_threshold,
        delivery_completed=delivery_completed,
        runs_off_bat=runs_off_bat,
    )


async def run_session_loop(session: Session, pipeline: VisionPipeline) -> None:
    path = session.video_path
    stride = int(os.environ.get("CRICKET_FRAME_STRIDE", "2"))
    session.frame_stride = max(1, stride)

    cap = cv2.VideoCapture(path)
    if not cap.isOpened():
        await broadcast(
            session,
            {
                "schema_version": 1,
                "error": "Could not open video",
                "frame_index": 0,
                "timestamp_ms": int(time.time() * 1000),
            },
        )
        return

    frame_w = int(cap.get(cv2.CAP_PROP_FRAME_WIDTH)) or 640
    frame_h = int(cap.get(cv2.CAP_PROP_FRAME_HEIGHT)) or 360
    frame_idx = 0
    processed = 0
    loop = asyncio.get_event_loop()

    try:
        while True:
            ret, frame = cap.read()
            if not ret:
                break
            if frame_idx % session.frame_stride != 0:
                frame_idx += 1
                continue

            def _infer() -> InferenceResult:
                return pipeline.infer(frame, frame_w, frame_h)

            inf: InferenceResult = await loop.run_in_executor(None, _infer)

            if inf.ball_center:
                bx, by = inf.ball_center
                session.trajectory.append({"x": float(bx), "y": float(by), "t": float(processed)})

            event = _vision_to_event(inf, frame_w, frame_h, session)
            session.rules.step(event)
            rules_snap = session.rules.state.to_rules_snapshot()

            traj_list = list(session.trajectory)
            prompt = build_narrative_payload(
                rules_snap,
                traj_list,
                inf.bowler_wrist_y,
                inf.ball_confidence,
                inf.num_persons,
            )

            def _ollama() -> str:
                return session.narrator.maybe_refresh(prompt, rules_snap)

            await loop.run_in_executor(None, _ollama)
            reasoning = session.narrator.last_reasoning

            boxes = []
            for b in inf.bounding_boxes:
                boxes.append(
                    {
                        "x": b["x"],
                        "y": b["y"],
                        "w": b["w"],
                        "h": b["h"],
                        "label": b["label"],
                        "confidence": b["confidence"],
                    }
                )

            kpts_out = []
            for k in inf.keypoints:
                kpts_out.append(
                    {
                        "x": k["x"],
                        "y": k["y"],
                        "label": k["label"],
                        "person_id": k.get("person_id"),
                    }
                )

            msg = {
                "schema_version": 1,
                "frame_index": processed,
                "timestamp_ms": int(time.time() * 1000),
                "frame_width": frame_w,
                "frame_height": frame_h,
                "keypoints": kpts_out,
                "bounding_boxes": boxes,
                "trajectory": traj_list,
                "rules": rules_snap,
                "reasoning": reasoning,
            }
            await broadcast(session, msg)

            frame_idx += 1
            processed += 1
            await asyncio.sleep(0)

    finally:
        cap.release()
        session.processing = False
        await broadcast(
            session,
            {
                "schema_version": 1,
                "event": "stream_end",
                "frame_index": processed,
                "timestamp_ms": int(time.time() * 1000),
            },
        )
