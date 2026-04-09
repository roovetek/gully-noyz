from __future__ import annotations

import json
import os
import tempfile
from dataclasses import dataclass
from typing import Any

import httpx
from fastapi import FastAPI, File, Form, HTTPException, UploadFile
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel, Field


ALLOWED_OUTCOMES = {"dot", "1", "2", "3", "4", "6", "wicket", "wide", "noball", "other"}


class AIScoreDecision(BaseModel):
    outcome: str = Field(description="One of dot,1,2,3,4,6,wicket,wide,noball,other")
    dismissal_type: str | None = None
    extra_runs: int = 0
    confidence: float = 0.0
    rationale: str = ""
    transcript: str = ""


class HealthResponse(BaseModel):
    ok: bool
    whisper: str
    ollama: str
    model: str


@dataclass
class Settings:
    whisper_model: str = os.getenv("AI_WHISPER_MODEL", "base.en")
    whisper_device: str = os.getenv("AI_WHISPER_DEVICE", "auto")
    whisper_compute_type: str = os.getenv("AI_WHISPER_COMPUTE", "int8")
    ollama_url: str = os.getenv("AI_OLLAMA_URL", "http://127.0.0.1:11434")
    ollama_model: str = os.getenv("AI_OLLAMA_MODEL", "phi3:mini")
    request_timeout_s: float = float(os.getenv("AI_REQUEST_TIMEOUT_S", "25"))


settings = Settings()
app = FastAPI(title="Gully Local AI Service", version="1.0.0")
app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        "http://localhost:5173",
        "http://127.0.0.1:5173",
        "http://localhost:4173",
        "http://127.0.0.1:4173",
    ],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

_whisper_model = None


def get_whisper_model():
    global _whisper_model
    if _whisper_model is not None:
        return _whisper_model
    try:
        from faster_whisper import WhisperModel
    except Exception as exc:  # pragma: no cover - import check is runtime env dependent
        raise RuntimeError("faster-whisper is not installed") from exc
    _whisper_model = WhisperModel(
        settings.whisper_model,
        device=settings.whisper_device,
        compute_type=settings.whisper_compute_type,
    )
    return _whisper_model


def build_prompt(transcript: str) -> str:
    return f"""
You are a strict cricket scoring parser. Convert the transcript into one scoring decision.

Return ONLY valid JSON (no markdown, no commentary) with this exact schema:
{{
  "outcome": "dot|1|2|3|4|6|wicket|wide|noball|other",
  "dismissal_type": "bowled|caught|lbw|runout|stumped|hitwicket|hitballtwice|obstructing|timedout|handledball|unknown|null",
  "extra_runs": 0,
  "confidence": 0.0,
  "rationale": "short reason"
}}

Rules:
- If transcript implies wide, set outcome="wide".
- If transcript implies no-ball, set outcome="noball".
- For dot ball, set outcome="dot".
- For numeric runs, set outcome to one of "1","2","3","4","6".
- If wicket but dismissal type unknown, use dismissal_type="unknown".
- If not confident, use outcome="other" with low confidence.
- extra_runs must be integer >= 0.
- confidence must be number between 0 and 1.

Transcript:
{transcript}
""".strip()


async def ask_ollama_for_decision(transcript: str) -> dict[str, Any]:
    prompt = build_prompt(transcript)
    payload = {
        "model": settings.ollama_model,
        "prompt": prompt,
        "stream": False,
        "format": "json",
    }
    timeout = httpx.Timeout(settings.request_timeout_s)
    async with httpx.AsyncClient(timeout=timeout) as client:
        resp = await client.post(f"{settings.ollama_url}/api/generate", json=payload)
        resp.raise_for_status()
        raw = resp.json().get("response", "{}")
    try:
        return json.loads(raw)
    except json.JSONDecodeError as exc:
        raise HTTPException(status_code=502, detail=f"Ollama JSON parse failed: {exc}") from exc


def normalize_decision(transcript: str, raw: dict[str, Any]) -> AIScoreDecision:
    outcome = str(raw.get("outcome", "other")).strip().lower()
    if outcome not in ALLOWED_OUTCOMES:
        outcome = "other"

    dismissal_type = raw.get("dismissal_type")
    if dismissal_type is not None:
        dismissal_type = str(dismissal_type).strip().lower() or None

    try:
        extra_runs = int(raw.get("extra_runs", 0))
    except (TypeError, ValueError):
        extra_runs = 0
    extra_runs = max(0, extra_runs)

    try:
        confidence = float(raw.get("confidence", 0.0))
    except (TypeError, ValueError):
        confidence = 0.0
    confidence = max(0.0, min(1.0, confidence))

    rationale = str(raw.get("rationale", "")).strip()
    return AIScoreDecision(
        outcome=outcome,
        dismissal_type=dismissal_type if outcome == "wicket" else None,
        extra_runs=extra_runs if outcome in {"wide", "noball"} else 0,
        confidence=confidence,
        rationale=rationale,
        transcript=transcript,
    )


@app.get("/health", response_model=HealthResponse)
async def health() -> HealthResponse:
    whisper_state = "ok"
    try:
        get_whisper_model()
    except Exception:
        whisper_state = "unavailable"

    ollama_state = "ok"
    try:
        async with httpx.AsyncClient(timeout=httpx.Timeout(3.0)) as client:
            res = await client.get(f"{settings.ollama_url}/api/tags")
            if res.status_code >= 400:
                ollama_state = "unavailable"
    except Exception:
        ollama_state = "unavailable"

    ok = whisper_state == "ok" and ollama_state == "ok"
    return HealthResponse(ok=ok, whisper=whisper_state, ollama=ollama_state, model=settings.ollama_model)


@app.post("/score-from-audio", response_model=AIScoreDecision)
async def score_from_audio(
    file: UploadFile = File(...),
    match_id: str | None = Form(default=None),
) -> AIScoreDecision:
    if not file.filename:
        raise HTTPException(status_code=400, detail="Missing audio file")

    whisper = get_whisper_model()
    suffix = os.path.splitext(file.filename)[1] or ".webm"
    with tempfile.NamedTemporaryFile(delete=False, suffix=suffix) as tmp:
        tmp_path = tmp.name
        data = await file.read()
        tmp.write(data)

    try:
        segments, _info = whisper.transcribe(tmp_path, beam_size=5, language="en")
        transcript = " ".join(seg.text.strip() for seg in segments).strip()
        if not transcript:
            transcript = "unknown"
        raw = await ask_ollama_for_decision(transcript)
        decision = normalize_decision(transcript, raw)
        if match_id:
            # place-holder for optional future match-context prompting
            _ = match_id
        return decision
    finally:
        try:
            os.unlink(tmp_path)
        except OSError:
            pass

