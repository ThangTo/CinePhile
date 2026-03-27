# TikTok Worker

Python sidecar for CinePhine's social trending pipeline.

## What it does

- Fetches trending TikTok videos via `TikTokApi`
- Normalizes video metadata into machine-readable JSON
- Exposes:
  - `GET /health`
  - `GET /trending?count=30`
- Also supports one-shot CLI mode:

```bash
python app.py --once-json
```

## Required env vars

- `TIKTOK_MS_TOKEN`
- `TIKTOK_PROXY_URL` (optional, recommended when TikTok blocks your server IP)
- `TIKTOK_TRENDING_COUNT`
- `TIKTOK_BROWSER`
- `TIKTOK_WORKER_HOST`
- `TIKTOK_WORKER_PORT`

## Local setup

```bash
pip install -r requirements.txt
python -m playwright install chromium
python app.py
```

## PM2 / sidecar mode

The Node backend should call this worker through:

- `TIKTOK_WORKER_URL=http://127.0.0.1:8787`

Or, for a one-shot fetch:

- `TIKTOK_WORKER_CMD=python ./tiktok_worker/app.py --once-json`
