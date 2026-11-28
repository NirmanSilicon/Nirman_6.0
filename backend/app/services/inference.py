"""Client for the inference service. The ML models live behind this contract
(see inference/README.md) so they can be swapped in without touching the API."""
import httpx

from ..config import Settings
from .engine import CLASSES


class InferenceError(Exception):
    pass


def predict(jpeg: bytes, s: Settings) -> dict:
    try:
        r = httpx.post(f"{s.inference_url}/predict", files={"image": ("scan.jpg", jpeg, "image/jpeg")},
                       timeout=s.inference_timeout_s)
        r.raise_for_status()
        data = r.json()
    except (httpx.HTTPError, ValueError) as e:
        raise InferenceError(str(e)) from e
    dets = [
        {"class": d["class"], "confidence": float(d["confidence"]), "bbox": [float(v) for v in d["bbox"]],
         "ocr_text": d.get("ocr_text")}
        for d in data.get("detections", []) if d.get("class") in CLASSES and len(d.get("bbox", [])) == 4
    ]
    return {"board": data["board"], "detections": dets, "model": data.get("model", {})}


def healthy(s: Settings) -> bool:
    try:
        return httpx.get(f"{s.inference_url}/healthz", timeout=3).status_code == 200
    except httpx.HTTPError:
        return False
