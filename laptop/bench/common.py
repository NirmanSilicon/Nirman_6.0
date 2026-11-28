"""Shared helpers for the Phase 0 laptop benchmarks: timing, percentiles, images, results files.

Percentiles use the nearest-rank method, exactly like android/.../perf/LatencyStats.kt, so phone
and laptop numbers mean the same thing.
"""
from __future__ import annotations

import datetime as dt
import json
import math
import platform
import time
from pathlib import Path
from typing import Callable

import numpy as np
import openvino as ov
from PIL import Image

ROOT = Path(__file__).resolve().parents[2]
CACHE = ROOT / "laptop" / "models_cache"
RESULTS = ROOT / "tools" / "results"

# Real photos from the SecondSense reference copy (read-only), until the team's table photos exist.
IMAGES = sorted(p for p in (ROOT / "secondsense").glob("*") if p.suffix.lower() in {".jpg", ".jpeg"})

DEVICES = ("CPU", "GPU", "NPU")


def percentile(sorted_ms: list[float], p: float) -> float:
    rank = min(max(math.ceil(p / 100.0 * len(sorted_ms)), 1), len(sorted_ms))
    return sorted_ms[rank - 1]


def summarize(ms: list[float]) -> dict | None:
    if not ms:
        return None
    s = sorted(ms)
    return {
        "count": len(s),
        "meanMs": round(sum(s) / len(s), 2),
        "p50Ms": round(percentile(s, 50), 2),
        "p90Ms": round(percentile(s, 90), 2),
        "maxMs": round(s[-1], 2),
    }


def timed(fn: Callable[[], object]) -> tuple[object, float]:
    t0 = time.perf_counter()
    out = fn()
    return out, (time.perf_counter() - t0) * 1000.0


def load_rgb(path: Path) -> Image.Image:
    return Image.open(path).convert("RGB")


def normalize(img: Image.Image, size: tuple[int, int], mean, std) -> np.ndarray:
    """Resize to (width, height), scale to 0..1, normalise, return NCHW float32."""
    a = np.asarray(img.resize(size, Image.BICUBIC), dtype=np.float32) / 255.0
    a = (a - np.asarray(mean, np.float32)) / np.asarray(std, np.float32)
    return a.transpose(2, 0, 1)[None].copy()


def environment() -> dict:
    core = ov.Core()
    return {
        "openvino": ov.__version__,
        "python": platform.python_version(),
        "devices": {d: core.get_property(d, "FULL_DEVICE_NAME") for d in core.available_devices},
        "images": [p.name for p in IMAGES],
        "imagesSource": "secondsense/ reference copy (real photos), read-only",
    }


def save(name: str, data: dict) -> Path:
    RESULTS.mkdir(parents=True, exist_ok=True)
    stamp = dt.datetime.now().strftime("%Y%m%d_%H%M%S")
    path = RESULTS / f"laptop_{name}_{stamp}.json"
    data = {"run": f"laptop_{name}", "savedAt": dt.datetime.now().isoformat(timespec="seconds"),
            "environment": environment(), **data}
    path.write_text(json.dumps(data, indent=2), encoding="utf-8")
    return path
