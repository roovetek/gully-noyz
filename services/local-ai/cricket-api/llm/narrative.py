"""Compact narrative from vision + rules; Ollama HTTP client with throttling."""

from __future__ import annotations

import json
import logging
import os
import time
from typing import Any

import httpx

logger = logging.getLogger(__name__)


def build_narrative_payload(
    rules_snapshot: dict[str, Any],
    trajectory_summary: list[dict[str, float]],
    bowler_wrist_y: float | None,
    ball_confidence: float,
    num_persons: int,
) -> str:
    """Structured text for the LLM (not raw coordinates)."""
    traj = trajectory_summary[-8:] if len(trajectory_summary) > 8 else trajectory_summary
    parts = [
        "Cricket vision summary (structured):",
        f"Players detected: {num_persons}",
        f"Ball model confidence: {ball_confidence:.2f}",
        f"Bowler wrist Y (px, if known): {bowler_wrist_y}",
        f"Recent ball trail (up to 8 samples): {json.dumps(traj)}",
        f"Rules state: {json.dumps(rules_snapshot)}",
        "Task: In2-4 sentences, as an umpire, explain the current situation and why the last "
        "classification (legal/wide/no-ball) would or would not apply. If uncertain, say what is missing.",
    ]
    return "\n".join(parts)


class OllamaNarrator:
    def __init__(self) -> None:
        self._base = os.environ.get("OLLAMA_HOST", "http://127.0.0.1:11434").rstrip("/")
        self._model = os.environ.get("OLLAMA_MODEL", "phi3.5")
        self._min_interval = float(os.environ.get("OLLAMA_MIN_INTERVAL_SEC", "1.0"))
        self._last_call = 0.0
        self._last_reasoning = ""
        self._last_rules_hash: str | None = None

    @property
    def last_reasoning(self) -> str:
        return self._last_reasoning

    def maybe_refresh(
        self,
        prompt: str,
        rules_snapshot: dict[str, Any],
        force: bool = False,
    ) -> str:
        """Call Ollama if throttling allows or rules snapshot changed meaningfully."""
        now = time.monotonic()
        rules_hash = json.dumps(rules_snapshot, sort_keys=True)
        changed = rules_hash != self._last_rules_hash
        self._last_rules_hash = rules_hash

        if not force and not changed and (now - self._last_call) < self._min_interval:
            return self._last_reasoning

        self._last_call = now
        deterministic = (
            f"[Deterministic] {rules_snapshot.get('last_outcome_summary', '')} "
            f"Delivery={rules_snapshot.get('last_delivery')} "
            f"Score={rules_snapshot.get('runs_total')}/{rules_snapshot.get('wickets')}"
        )

        try:
            with httpx.Client(timeout=120.0) as client:
                r = client.post(
                    f"{self._base}/api/generate",
                    json={
                        "model": self._model,
                        "prompt": prompt,
                        "stream": False,
                    },
                )
                r.raise_for_status()
                data = r.json()
                text = (data.get("response") or "").strip()
        except Exception as e:
            logger.warning("Ollama request failed: %s", e)
            text = ""

        if text:
            self._last_reasoning = f"{deterministic}\n\n{text}"
        else:
            self._last_reasoning = f"{deterministic}\n\n(Umpire narrative unavailable — check Ollama and model {self._model}.)"
        return self._last_reasoning
