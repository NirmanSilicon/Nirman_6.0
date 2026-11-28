"""Capture quality gate (F1): blur + darkness/glare, on a downscaled grey copy."""
import numpy as np
from PIL import Image

from ..config import Settings


def measure(img: Image.Image) -> dict:
    g = img.convert("L")
    g.thumbnail((640, 640))
    a = np.asarray(g, dtype=np.float32)
    lap = -4 * a[1:-1, 1:-1] + a[:-2, 1:-1] + a[2:, 1:-1] + a[1:-1, :-2] + a[1:-1, 2:]
    return {"sharpness": round(float(lap.var()), 1), "brightness": round(float(a.mean()), 1)}


def check(img: Image.Image, s: Settings) -> dict:
    m = measure(img)
    issues = []
    if m["sharpness"] < s.blur_threshold:
        issues.append("blurry")
    if m["brightness"] < s.dark_threshold:
        issues.append("too_dark")
    if m["brightness"] > s.bright_threshold:
        issues.append("too_bright")
    return {**m, "ok": not issues, "issues": issues}
