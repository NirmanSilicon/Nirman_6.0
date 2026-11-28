"""Optional online brain (PRD 5.0.1 item 6, D43, D51): one camera frame and the user's question go to
Google's Gemini API; the answer text goes back to the phone, which checks it against its own world map
before saying anything ("the cloud says X, but I see Y; I'm not sure").

Off unless a key is present: laptop/secrets/gemini_api_key.txt (gitignored), or the GEMINI_API_KEY
environment variable. Optional laptop/secrets/gemini_model.txt names the model; otherwise the newest
stable numbered Flash model the key may use is chosen once, from the API's own model list. No SDK: plain HTTPS from
the standard library, so nothing new is installed. Images are never written to disk or recorded.
"""
from __future__ import annotations

import concurrent.futures
import http.client
import json
import os
import re
import threading
import time
import urllib.error
import urllib.request
from pathlib import Path

ROOT = Path(__file__).resolve().parents[2]
SECRETS = ROOT / "laptop" / "secrets"
API = "https://generativelanguage.googleapis.com/v1beta"
API_HOST = "generativelanguage.googleapis.com"
PROMPT = (
    "You help a blind person. The photo is from a phone held at their chest: it may show a table in front of "
    "them, things in their hand, a page or screen, or the room and people around them; image left is their "
    "left. Answer their question in one or two short spoken "
    "sentences, plain words. Use 'on your left', 'on your right', 'in front of you' or 'in your hand' for "
    "places. Never give distances in numbers. If you cannot tell from the photo, say so plainly. If the "
    "question is about something earlier in this session, answer from the session notes below. People: "
    "say how many and where, and what they are doing or holding if asked; never identify anyone, never guess "
    "names, age, gender or feelings, never describe faces.\n"
    "Reply only with JSON: {\"answer\": \"<what to say>\", \"things\": [{\"name\": \"<short name, e.g. "
    "'Ocean fruit drink'>\", \"kind\": \"drink|food|object|person|text|other\", \"where\": \"on your left|on your "
    "right|in front of you|in your hand|not in the photo\"}]}, listing the things your answer is about.\n"
)


def keys() -> list[str]:
    """GEMINI_API_KEY, else every non-empty line of laptop/secrets/gemini_api_key.txt (a spare for when one hits its limit)."""
    if os.environ.get("GEMINI_API_KEY"):
        return [os.environ["GEMINI_API_KEY"].strip()]
    f = SECRETS / "gemini_api_key.txt"
    if not f.is_file():
        return []
    out = []
    for line in f.read_text(encoding="utf-8").splitlines():
        # A bare key, or a line like GEMINI_API_KEY = "…": keep only the value.
        value = re.split(r"[=:]", line, maxsplit=1)[-1].strip().strip("'\"").strip()
        if value:
            out.append(value)
    return out


def key() -> str | None:
    ks = keys()
    return ks[0] if ks else None


_models: list[str] | None = None


def models(api_key: str) -> list[str]:
    """Models to try, best first: laptop/secrets/gemini_model.txt, else the two newest stable Flash-Lite models
    this key can call, then the newest stable Flash (D51)."""
    global _models
    if _models:
        return _models
    f = SECRETS / "gemini_model.txt"
    if f.is_file() and f.read_text(encoding="utf-8").strip():
        _models = [f.read_text(encoding="utf-8").strip()]
        return _models
    req = urllib.request.Request(f"{API}/models?pageSize=200", headers={"x-goog-api-key": api_key})
    with urllib.request.urlopen(req, timeout=5) as r:
        names = [m["name"].split("/", 1)[1] for m in json.load(r).get("models", [])
                 if "generateContent" in m.get("supportedGenerationMethods", [])]
    # Stable numbered models only (no preview, image or speech variants). Flash-Lite first: measured on the
    # free tier (1 Nov), gemini-3.5-flash-lite answered a photo question in 2.2 s, correctly; the full Flash
    # models took 14 s (3.7) or were busy (3.8, HTTP 503). One full Flash stays as the last resort.
    def newest(suffix: str, n: int) -> list[str]:
        found = sorted(((tuple(int(x) for x in v.group(1).split(".")), name) for name in names
                        if (v := re.fullmatch(r"gemini-(\d+(?:\.\d+)*)-" + suffix, name))), reverse=True)
        return [name for _, name in found[:n]]
    _models = newest("flash-lite", 2) + newest("flash", 1)
    # The team's backup (3 Nov, D58): Google's always-current Flash alias, if this key can use it.
    if "gemini-flash-latest" in names and "gemini-flash-latest" not in _models:
        _models.append("gemini-flash-latest")
    if not _models:
        raise RuntimeError("no Flash model available to this key")
    return _models


def model(api_key: str) -> str:
    return models(api_key)[0]


def ask(question: str, jpeg_b64: str, budget_s: float = 6.0, notes: str = "") -> dict:
    """{'text', 'things', 'model', 'ms'} or {'error', 'ms'}. Faster (D56): the two best models are asked
    **at the same time** (one key each when there are two) and the first good answer wins; if both fail,
    the last-resort model is tried with what time is left. Blocking: run it in a thread."""
    t0 = time.monotonic()
    ks = keys()
    if not ks:
        return {"error": "no API key on the laptop (laptop/secrets/gemini_api_key.txt)", "ms": 0}
    try:
        candidates = models(ks[0])
    except Exception as e:
        return {"error": f"model list: {type(e).__name__}: {e}", "ms": round((time.monotonic() - t0) * 1000)}
    first, rest = candidates[:2], candidates[2:]
    pool = _POOL
    futures = [pool.submit(_ask_with, ks[i % len(ks)], m, question, jpeg_b64, budget_s - 0.5, notes) for i, m in enumerate(first)]
    out: dict = {"error": "no answer"}
    try:
        for f in concurrent.futures.as_completed(futures, timeout=budget_s):
            r = f.result()
            if "text" in r:
                out = r
                break
            out = r
    except concurrent.futures.TimeoutError:
        out = {"error": "timeout"}
    for f in futures:
        f.cancel()
    left = budget_s - (time.monotonic() - t0)
    if "text" not in out and rest and left > 1.0:
        # Both best models failed (busy, over quota): the backups, also at the same time.
        pool = _POOL
        futures = [pool.submit(_ask_with, ks[(i + 1) % len(ks)], m, question, jpeg_b64, left - 0.3, notes) for i, m in enumerate(rest)]
        try:
            for f in concurrent.futures.as_completed(futures, timeout=left):
                r = f.result()
                out = r
                if "text" in r:
                    break
        except concurrent.futures.TimeoutError:
            out = {"error": "timeout"}
        for f in futures:
            f.cancel()
    out["ms"] = round((time.monotonic() - t0) * 1000)
    return out




_local = threading.local()
# Long-lived workers, so each keeps its HTTPS connection open between questions (D58).
_POOL = concurrent.futures.ThreadPoolExecutor(max_workers=4, thread_name_prefix="gemini")


def _post(path: str, body: bytes, headers: dict, timeout_s: float) -> tuple[int, bytes]:
    """POST on this thread's kept-open HTTPS connection to the API host (reconnects once if it was closed)."""
    for attempt in (0, 1):
        conn = getattr(_local, "conn", None)
        if conn is None:
            conn = _local.conn = http.client.HTTPSConnection(API_HOST, timeout=timeout_s)
        try:
            conn.timeout = timeout_s
            if conn.sock is not None:
                conn.sock.settimeout(timeout_s)
            conn.request("POST", path, body=body, headers=headers)
            r = conn.getresponse()
            return r.status, r.read()
        except (http.client.HTTPException, ConnectionError, OSError):
            conn.close()
            _local.conn = None
            if attempt:
                raise
    raise RuntimeError("unreachable")


def warm() -> None:
    """Open the workers' connections ahead of the first question (online mode just turned on, D58)."""
    def one():
        try:
            _post("/v1beta/models?pageSize=1", b"", {"x-goog-api-key": (keys() or [""])[0]}, 5)
        except Exception:
            pass
    for _ in range(2):
        _POOL.submit(one)


def _ask_with(k: str, m: str, question: str, jpeg_b64: str, timeout_s: float, notes: str = "") -> dict:
    t0 = time.monotonic()
    try:
        prompt = PROMPT + (f"Session notes (earlier questions and what was seen, oldest first):\n{notes}\n" if notes else "") + "Question: " + question
        body = {
            "contents": [{"parts": [{"text": prompt},
                                    {"inline_data": {"mime_type": "image/jpeg", "data": jpeg_b64}}]}],
            "generationConfig": {"maxOutputTokens": 300, "temperature": 0.2, "responseMimeType": "application/json"},
        }
        status, data = _post(f"/v1beta/models/{m}:generateContent", json.dumps(body).encode(),
                             {"x-goog-api-key": k, "Content-Type": "application/json"}, timeout_s)
        if status != 200:
            return {"error": f"HTTP {status}: {data.decode(errors='replace')[:200]}", "ms": round((time.monotonic() - t0) * 1000)}
        out = json.loads(data)
        parts = out.get("candidates", [{}])[0].get("content", {}).get("parts", [])
        raw = " ".join(p.get("text", "") for p in parts).strip()
        text, things = raw, []
        try:
            j = json.loads(raw)
            text = str(j.get("answer", "")).strip() or raw
            things = [t for t in j.get("things", []) if isinstance(t, dict) and t.get("name")][:8]
        except (ValueError, AttributeError):
            pass   # not JSON after all: say the text as it came
        if not text:
            return {"error": "empty answer", "model": m, "ms": round((time.monotonic() - t0) * 1000)}
        return {"text": text, "things": things, "model": m, "ms": round((time.monotonic() - t0) * 1000)}
    except urllib.error.HTTPError as e:
        detail = e.read().decode(errors="replace")[:200]
        return {"error": f"HTTP {e.code}: {detail}", "ms": round((time.monotonic() - t0) * 1000)}
    except Exception as e:  # no internet, timeout, bad key: the phone says it could not reach the cloud
        return {"error": f"{type(e).__name__}: {e}", "ms": round((time.monotonic() - t0) * 1000)}


if __name__ == "__main__":
    # Check the key and the model without a photo: python laptop/online/cloud_brain.py
    ks = keys()
    print(f"keys: {len(ks)} found" if ks else "keys: MISSING (laptop/secrets/gemini_api_key.txt)")
    for i, k in enumerate(ks, 1):
        try:
            req = urllib.request.Request(f"{API}/models?pageSize=1", headers={"x-goog-api-key": k})
            urllib.request.urlopen(req, timeout=5).read()
            print(f"key {i}: works")
        except Exception as e:
            print(f"key {i}: FAILED ({e})")
    if ks:
        print("models, in order:", ", ".join(models(ks[0])))
