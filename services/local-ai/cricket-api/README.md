# Cricket Vision API

Local FastAPI service: **YOLO11 pose** (players) + **YOLO11 detect** (COCO `sports ball`), deterministic **ICC T20** rules subset, **Ollama** umpire narrative, and **WebSocket** telemetry for the Vite React app.

## Prerequisites

1. **Python 3.11+** and PyTorch with **MPS** on Apple Silicon ([pytorch.org](https://pytorch.org/)).
2. **Ollama** running in the background with a Phi-family model, e.g. `phi3.5` (see `OLLAMA_MODEL`).

```bash
ollama pull phi3.5
```

## Setup

```bash
cd cricket-api
python -m venv .venv
source .venv/bin/activate
pip install -r requirements.txt
```

Ultralytics will download `yolo11n-pose.pt` and `yolo11n.pt` on first run if missing.

## Run

```bash
cd cricket-api
source .venv/bin/activate
uvicorn main:app --host 127.0.0.1 --port 8002
```

- **CORS:** Defaults to Vite dev origins on **5174** and **5175** (`localhost` and `127.0.0.1`). Override with `CRICKET_CORS_ORIGINS` (comma-separated).
- **WebSocket URL in JSON:** Set `CRICKET_PUBLIC_WS_BASE=ws://127.0.0.1:8002` so `POST /sessions` includes `websocket_url`.

## API

| Method | Path | Description |
|--------|------|-------------|
| GET | `/health` | Liveness |
| POST | `/sessions` | Multipart field `file` — video upload; returns `session_id`, `ws_path`, optional `websocket_url` |
| WS | `/ws/stream/{session_id}` | JSON telemetry per processed frame |

### Telemetry fields (`schema_version` 1)

- `frame_width`, `frame_height`, `frame_index`, `timestamp_ms`
- `keypoints`, `bounding_boxes`, `trajectory` (last N ball positions, default 20)
- `rules` — snapshot from the rules engine
- `reasoning` — deterministic line + Ollama text (throttled)

## Environment

| Variable | Default | Purpose |
|----------|---------|---------|
| `CRICKET_FRAME_STRIDE` | `2` | Process every Nth frame |
| `CRICKET_DEVICE` | auto `mps`/`cuda`/`cpu` | Force device |
| `CRICKET_POSE_MODEL` | `yolo11n-pose.pt` | Pose weights |
| `CRICKET_DETECT_MODEL` | `yolo11n.pt` | Detect weights |
| `CRICKET_BOWLER_ON_LEFT` | `true` | Camera heuristic |
| `OLLAMA_HOST` | `http://127.0.0.1:11434` | Ollama base URL |
| `OLLAMA_MODEL` | `phi3.5` | Model name |
| `OLLAMA_MIN_INTERVAL_SEC` | `1.0` | Min time between LLM calls |

## Tests

```bash
cd cricket-api
python -m unittest discover -s tests -p 'test_*.py'
```
