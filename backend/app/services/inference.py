"""Client for the inference service. The ML models live behind this contract
(see inference/README.md) so they can be swapped in without touching the API."""
import httpx

from ..config import Settings
from .engine import CLASSES

# Presence-model class -> product taxonomy (classes with no mapping are shown but not valued).
PRESENCE_MAP = {"ic": "IC", "bga": "IC", "connector": "CONNECTOR", "capacitor": "CAPACITOR", "electrolytic capacitor": "CAPACITOR",
                "capacitor jumper": "CAPACITOR", "resistor": "RESISTOR", "resistor jumper": "RESISTOR", "resistor network": "RESISTOR", "clock": "CRYSTAL"}


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
    presence = data.get("presence") or []
    mapped: dict[str, float] = {}
    for pr in presence:
        cls = PRESENCE_MAP.get(pr["class"])
        if cls:
            mapped[cls] = max(mapped.get(cls, 0.0), float(pr["confidence"]))
    # one count-unknown pseudo-detection per mapped class: the model says "present", not "how many/where"
    dets += [{"class": c, "confidence": v, "bbox": [0.0, 0.0, 0.0, 0.0], "ocr_text": None, "count_unknown": True} for c, v in mapped.items()]
    return {"board": data["board"], "detections": dets, "presence": presence, "model": data.get("model", {})}


def healthy(s: Settings) -> bool:
    try:
        return httpx.get(f"{s.inference_url}/healthz", timeout=3).status_code == 200
    except httpx.HTTPError:
        return False
