# Local AI Service (FastAPI)

This service accepts short cricket audio clips and returns a strict JSON scoring decision.

## Stack
- FastAPI
- faster-whisper (`base.en` by default)
- Ollama (`phi3:mini` by default)

## Setup
```bash
cd services/local-ai
python3 -m venv .venv
source .venv/bin/activate
pip install -r requirements.txt
```

## Run
```bash
uvicorn app.main:app --host 127.0.0.1 --port 8000 --reload
```

## Endpoints
- `GET /health` -> dependency health (whisper + ollama)
- `POST /score-from-audio` -> multipart form with `file` and optional `match_id`

Example:
```bash
curl -X POST "http://127.0.0.1:8000/score-from-audio" \
  -F "file=@/path/to/clip.webm" \
  -F "match_id=AB12CD"
```

## Env vars
- `AI_WHISPER_MODEL` (default `base.en`)
- `AI_WHISPER_DEVICE` (default `auto`)
- `AI_WHISPER_COMPUTE` (default `int8`)
- `AI_OLLAMA_URL` (default `http://127.0.0.1:11434`)
- `AI_OLLAMA_MODEL` (default `phi3:mini`)
- `AI_REQUEST_TIMEOUT_S` (default `25`)
