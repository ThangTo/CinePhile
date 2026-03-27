import argparse
import asyncio
import json
import logging
import os
import re
import sys
import unicodedata
from collections import Counter
from datetime import datetime, timezone
from http.server import BaseHTTPRequestHandler, ThreadingHTTPServer
from urllib.parse import parse_qs, urlparse

DEFAULT_COUNT = max(1, int(os.getenv("TIKTOK_TRENDING_COUNT", "30")))
DEFAULT_BROWSER = os.getenv("TIKTOK_BROWSER", "chromium")
DEFAULT_HOST = os.getenv("TIKTOK_WORKER_HOST", "127.0.0.1")
DEFAULT_PORT = int(os.getenv("TIKTOK_WORKER_PORT", "8787"))

# Keep worker output machine-readable for Node command mode.
logging.getLogger("TikTokApi").setLevel(logging.CRITICAL)
logging.getLogger("TikTokApi.tiktok").setLevel(logging.CRITICAL)
logging.getLogger("playwright").setLevel(logging.ERROR)

GENERIC_TERMS = {
    "phim",
    "movie",
    "series",
    "review",
    "trailer",
    "vietsub",
    "thuyet minh",
    "tap",
    "episode",
    "full",
    "clip",
    "hot",
    "trend",
}


def normalize_text(value: str) -> str:
    text = str(value or "")
    text = text.replace("\u0111", "d").replace("\u0110", "D")
    text = unicodedata.normalize("NFD", text)
    text = "".join(ch for ch in text if unicodedata.category(ch) != "Mn")
    text = re.sub(r"[^a-zA-Z0-9\s-]", " ", text).lower()
    return re.sub(r"\s+", " ", text).strip()


def is_useful_keyword(value: str) -> bool:
    normalized = normalize_text(value)
    return bool(normalized) and len(normalized) >= 4 and normalized not in GENERIC_TERMS


def unique_strings(values):
    seen = set()
    result = []
    for value in values or []:
        raw = str(value or "").strip()
        if not raw:
            continue
        key = normalize_text(raw)
        if not key or key in seen:
            continue
        seen.add(key)
        result.append(raw)
    return result


def extract_candidates_from_text(text: str):
    cleaned = str(text or "").strip()
    if not cleaned:
        return []

    candidates = []
    hash_tags = re.findall(r"#([A-Za-z0-9_]+)", cleaned)
    candidates.extend(tag.replace("_", " ") for tag in hash_tags)

    plain = re.sub(r"#([A-Za-z0-9_]+)", " ", cleaned)
    segments = re.split(r"[|/\\,;:\-\u2022()\[\]]+", plain)
    for segment in segments:
        segment = segment.strip().strip('"').strip("'")
        if not segment:
            continue
        if 4 <= len(segment) <= 80:
            candidates.append(segment)

    normalized = normalize_text(cleaned)
    if normalized:
        candidates.append(cleaned)

    return unique_strings(candidate for candidate in candidates if is_useful_keyword(candidate))


def build_keyword_entries(videos):
    keyword_counter = Counter()

    for video in videos:
        for candidate in video.get("raw_title_candidates", []):
            normalized = normalize_text(candidate)
            if not normalized:
                continue
            keyword_counter[(candidate, normalized)] += 1

    entries = []
    for (keyword, normalized), count in keyword_counter.most_common():
        entries.append(
            {
                "keyword": keyword,
                "normalized": normalized,
                "score": count,
                "source": "video_candidate",
                "videoCount": count,
            }
        )

    return entries


async def fetch_tiktok_payload(count: int):
    try:
        from TikTokApi import TikTokApi
    except Exception as exc:
        return {
            "fetchedAt": datetime.now(timezone.utc).isoformat(),
            "sourceHealth": {
                "status": "error",
                "provider": "tiktok-api",
                "message": f"import_failed: {exc}",
            },
            "sampleCount": 0,
            "videos": [],
            "keywords": [],
        }

    ms_token = os.getenv("TIKTOK_MS_TOKEN")
    proxy_url = os.getenv("TIKTOK_PROXY_URL")
    browser = DEFAULT_BROWSER

    sessions_args = {}
    if ms_token:
        sessions_args["ms_tokens"] = [ms_token]
    if proxy_url:
        sessions_args["proxies"] = [proxy_url]

    api = TikTokApi()

    try:
        await api.create_sessions(
            num_sessions=1,
            browser=browser,
            headless=True,
            **sessions_args,
        )

        videos = []
        async for video in api.trending.videos(count=count):
            item = {}
            as_dict = getattr(video, "as_dict", None)

            if isinstance(as_dict, dict):
                item = as_dict
            elif callable(as_dict):
                item = as_dict()
            else:
                info = getattr(video, "info", None)
                if callable(info):
                    maybe_item = await info()
                    if isinstance(maybe_item, dict):
                        item = maybe_item

            desc = item.get("desc") or ""
            author = item.get("author", {})
            author_name = author.get("nickname") or author.get("uniqueId") or ""
            hashtags = [
                challenge.get("title", "")
                for challenge in item.get("challenges", []) or []
                if challenge.get("title")
            ]

            raw_candidates = extract_candidates_from_text(desc)
            raw_candidates.extend(extract_candidates_from_text(" ".join(hashtags)))
            raw_candidates.extend(extract_candidates_from_text(author_name))

            videos.append(
                {
                    "desc": desc,
                    "author": author_name,
                    "hashtags": unique_strings(hashtags),
                    "stats": item.get("stats", {}),
                    "createTime": item.get("createTime"),
                    "raw_title_candidates": unique_strings(raw_candidates),
                }
            )

        return {
            "fetchedAt": datetime.now(timezone.utc).isoformat(),
            "sourceHealth": {
                "status": "ok",
                "provider": "tiktok-api",
                "browser": browser,
            },
            "sampleCount": len(videos),
            "videos": videos,
            "keywords": build_keyword_entries(videos),
        }
    except Exception as exc:
        return {
            "fetchedAt": datetime.now(timezone.utc).isoformat(),
            "sourceHealth": {
                "status": "error",
                "provider": "tiktok-api",
                "message": str(exc),
            },
            "sampleCount": 0,
            "videos": [],
            "keywords": [],
        }
    finally:
        try:
            await api.close_sessions()
        except Exception:
            pass


def fetch_payload_sync(count: int):
    return asyncio.run(fetch_tiktok_payload(count))


def write_json(handler: BaseHTTPRequestHandler, status_code: int, payload):
    data = json.dumps(payload, ensure_ascii=False).encode("utf-8")
    handler.send_response(status_code)
    handler.send_header("Content-Type", "application/json; charset=utf-8")
    handler.send_header("Content-Length", str(len(data)))
    handler.end_headers()
    handler.wfile.write(data)


class TikTokWorkerHandler(BaseHTTPRequestHandler):
    def do_GET(self):
        parsed = urlparse(self.path)
        if parsed.path == "/health":
            payload = {
                "status": "ok",
                "service": "tiktok-worker",
                "time": datetime.now(timezone.utc).isoformat(),
            }
            write_json(self, 200, payload)
            return

        if parsed.path == "/trending":
            params = parse_qs(parsed.query or "")
            count = int(params.get("count", [DEFAULT_COUNT])[0])
            payload = fetch_payload_sync(max(1, count))
            status_code = 200 if payload.get("sourceHealth", {}).get("status") == "ok" else 503
            write_json(self, status_code, payload)
            return

        write_json(self, 404, {"status": "error", "message": "Not found"})

    def log_message(self, format, *args):
        return


def main():
    parser = argparse.ArgumentParser(description="TikTok trending sidecar worker")
    parser.add_argument("--once-json", action="store_true", help="Fetch once and print JSON to stdout")
    parser.add_argument("--count", type=int, default=DEFAULT_COUNT, help="Trending sample size")
    args = parser.parse_args()

    if args.once_json:
        payload = fetch_payload_sync(max(1, args.count))
        sys.stdout.write(json.dumps(payload, ensure_ascii=False))
        return

    server = ThreadingHTTPServer((DEFAULT_HOST, DEFAULT_PORT), TikTokWorkerHandler)
    print(
        json.dumps(
            {
                "status": "ready",
                "service": "tiktok-worker",
                "host": DEFAULT_HOST,
                "port": DEFAULT_PORT,
            }
        ),
        flush=True,
    )
    server.serve_forever()


if __name__ == "__main__":
    main()
