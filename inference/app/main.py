"""Inference service. Models are trained elsewhere and plugged in here.

Contract:  POST /predict  (multipart field `image`)
  -> {"board": {"type": "DDR4_RAM"|"UNKNOWN", "confidence": 0-1},
      "detections": [{"class": RAM_IC|IC|CAPACITOR|RESISTOR|CONNECTOR|CRYSTAL,
                      "confidence": 0-1, "bbox": [x, y, w, h] (px), "ocr_text": null}],
      "image": {"width": int, "height": int},
      "model": {"name": str, "version": str, "mode": "mock"|"yolo"}}

INFERENCE_MODE=auto (default) picks pcb_classifier / yolo when weights exist, else mock
INFERENCE_MODE=pcb_classifier  /models/ouroboros_pcb_classifier.pt (timm ConvNeXt multi-label presence model)
INFERENCE_MODE=mock  deterministic DEMO output, clearly flagged mode="mock" (UI shows a banner)
INFERENCE_MODE=yolo  Ultralytics weights from /models (see models/README.md)
"""
import hashlib
import io
import os
import random

from fastapi import FastAPI, File, HTTPException, UploadFile
from PIL import Image

MODE_ENV = os.getenv("INFERENCE_MODE", "auto")
MODELS_DIR = os.getenv("MODELS_DIR", "/models")
BOARD_TYPE = "DDR4_RAM"
CLASSIFIER = "ouroboros_pcb_classifier.pt"


def resolve_mode() -> str:
    """auto: trained weights if present, else clearly-flagged mock."""
    if MODE_ENV != "auto":
        return MODE_ENV
    if os.path.exists(os.path.join(MODELS_DIR, CLASSIFIER)):
        return "pcb_classifier"
    return "yolo" if os.path.exists(os.path.join(MODELS_DIR, "detector.pt")) else "mock"


MODE = resolve_mode()

app = FastAPI(title="Ouroboros inference", version="1.0.0")
_detector = None


def mock_predict(img: Image.Image, raw: bytes) -> dict:
    """NOT a model: layout-plausible fake boxes seeded by the image hash, for UI/pipeline development."""
    rnd = random.Random(int(hashlib.sha256(raw).hexdigest(), 16))
    W, H = img.size
    dets = []

    def box(cls, x, y, w, h, lo=0.7, hi=0.95):
        dets.append({"class": cls, "confidence": round(rnd.uniform(lo, hi), 3),
                     "bbox": [round(x * W), round(y * H), round(w * W), round(h * H)], "ocr_text": None})

    for i in range(8):
        box("RAM_IC", 0.08 + i * 0.105, 0.36, 0.085, 0.26)
    for i in range(6):
        box("CAPACITOR", 0.10 + i * 0.14, 0.68, 0.04, 0.08, 0.5, 0.9)
    for i in range(4):
        box("RESISTOR", 0.15 + i * 0.2, 0.22, 0.03, 0.05, 0.45, 0.85)
    box("CONNECTOR", 0.05, 0.86, 0.9, 0.1, 0.75, 0.95)
    box("CRYSTAL", 0.88, 0.25, 0.05, 0.07, 0.55, 0.85)
    return {"board": {"type": BOARD_TYPE, "confidence": round(rnd.uniform(0.82, 0.95), 3)},
            "detections": dets, "model": {"name": "mock-demo", "version": "0", "mode": "mock"}}


def _yolo():
    global _detector
    if _detector is None:
        from ultralytics import YOLO  # imported lazily: only needed in yolo mode
        path = os.path.join(MODELS_DIR, "detector.pt")
        if not os.path.exists(path):
            raise HTTPException(503, f"{path} not found; see models/README.md")
        cls_map = {}
        cm = os.path.join(MODELS_DIR, "classes.json")
        if os.path.exists(cm):
            import json
            cls_map = json.load(open(cm))
        gate = os.path.join(MODELS_DIR, "board_classifier.pt")
        _detector = {"det": YOLO(path), "map": cls_map, "gate": YOLO(gate) if os.path.exists(gate) else None}
    return _detector


def yolo_predict(img: Image.Image) -> dict:
    m = _yolo()
    res = m["det"].predict(img, imgsz=640, conf=0.25, verbose=False)[0]
    names = res.names
    dets = []
    for b in res.boxes:
        raw_name = names[int(b.cls)]
        cls = m["map"].get(raw_name, raw_name)
        x1, y1, x2, y2 = [float(v) for v in b.xyxy[0]]
        dets.append({"class": cls, "confidence": round(float(b.conf), 3),
                     "bbox": [round(x1), round(y1), round(x2 - x1), round(y2 - y1)], "ocr_text": None})
    if m["gate"] is not None:
        p = m["gate"].predict(img, verbose=False)[0].probs
        label = m["gate"].names[int(p.top1)]
        board = {"type": BOARD_TYPE if label == BOARD_TYPE else "UNKNOWN", "confidence": round(float(p.top1conf), 3)}
    else:  # fallback heuristic until a board classifier is supplied
        ram = [d["confidence"] for d in dets if d["class"] == "RAM_IC"]
        conf = (sum(ram) / len(ram)) * min(1.0, len(ram) / 8) if ram else 0.0
        board = {"type": BOARD_TYPE if conf >= 0.3 else "UNKNOWN", "confidence": round(conf, 3)}
    return {"board": board, "detections": dets,
            "model": {"name": "yolo", "version": os.getenv("MODEL_VERSION", "unversioned"), "mode": "yolo"}}


_clf = None


def _classifier():
    global _clf
    if _clf is None:
        import torch, timm  # imported lazily: only needed for this mode
        ck = torch.load(os.path.join(MODELS_DIR, CLASSIFIER), map_location="cpu", weights_only=True)
        net = timm.create_model(ck["model_name"], pretrained=False, num_classes=len(ck["classes"]))
        net.load_state_dict(ck["state_dict"], strict=True)
        net.eval()
        _clf = {"net": net, "classes": ck["classes"], "thr": ck["thresholds"], "img": int(ck["img"]), "name": ck["model_name"], "torch": torch}
    return _clf


def classifier_predict(img: Image.Image) -> dict:
    """Multi-label component *presence* model (timm ConvNeXt). It says which part types appear, not where or how many.
    confidence = margin above the class's tuned threshold, mapped to 0.5..1 (probabilities are not calibrated)."""
    import numpy as np
    c = _classifier(); torch = c["torch"]
    x = np.asarray(img.convert("RGB").resize((c["img"], c["img"]), Image.BICUBIC), dtype=np.float32) / 255.0
    x = (x - np.array([0.485, 0.456, 0.406], dtype=np.float32)) / np.array([0.229, 0.224, 0.225], dtype=np.float32)
    with torch.inference_mode():
        prob = torch.sigmoid(c["net"](torch.from_numpy(x).permute(2, 0, 1).unsqueeze(0)))[0].tolist()
    presence = []
    for name, p, t in zip(c["classes"], prob, c["thr"]):
        if p >= t:
            presence.append({"class": name, "probability": round(p, 4), "threshold": round(t, 3),
                             "confidence": round(0.5 + 0.5 * (p - t) / max(1e-6, 1 - t), 3)})
    presence.sort(key=lambda d: -d["confidence"])
    top = [d["confidence"] for d in presence[:3]]
    # Heuristic gate: the model has no "not a PCB" class, so require several component types.
    conf = round(sum(top) / len(top), 3) if len(presence) >= 3 else 0.4
    return {"board": {"type": "GENERIC_PCB", "confidence": conf}, "detections": [], "presence": presence,
            "model": {"name": c["name"], "version": os.getenv("MODEL_VERSION", "ouroboros_pcb_classifier"), "mode": "classifier", "kind": "presence"}}


def _metrics():
    import csv
    d = os.path.join(MODELS_DIR, "metrics")
    try:
        rows = {r[""]: r for r in csv.DictReader(open(os.path.join(d, "metrics.csv")))}
        return {k: round(float(rows[k]["TEST"]), 3) for k in ("mAP", "micro_F1", "micro_precision", "micro_recall", "macro_F1") if k in rows}
    except Exception:
        return None


@app.get("/healthz")
def healthz():
    return {"ok": True, "mode": MODE}


@app.get("/info")
def info():
    present = {f: os.path.exists(os.path.join(MODELS_DIR, f)) for f in (CLASSIFIER, "detector.pt", "board_classifier.pt", "classes.json")}
    return {"mode": MODE, "board_type": BOARD_TYPE, "weights": present, "test_metrics": _metrics() if MODE == "pcb_classifier" else None,
            "kind": "presence" if MODE == "pcb_classifier" else ("boxes" if MODE == "yolo" else "demo"),
            "ready": MODE == "mock" or (MODE == "pcb_classifier" and present[CLASSIFIER]) or (MODE == "yolo" and present["detector.pt"]),
            "classes": ["RAM_IC", "IC", "CAPACITOR", "RESISTOR", "CONNECTOR", "CRYSTAL"]}


@app.post("/predict")
def predict(image: UploadFile = File(...)):
    raw = image.file.read()
    try:
        img = Image.open(io.BytesIO(raw)).convert("RGB")
    except Exception:
        raise HTTPException(400, "Not a valid image")
    out = mock_predict(img, raw) if MODE == "mock" else classifier_predict(img) if MODE == "pcb_classifier" else yolo_predict(img)
    return {**out, "image": {"width": img.width, "height": img.height}}
