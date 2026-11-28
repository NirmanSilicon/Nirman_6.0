"""Export the published weights to ONNX at the image sizes the server may run.

    python scripts/export_onnx.py [SIZE ...]      (default: 512 640)

The detector picks up ``models/<name>_<size>.onnx`` automatically when
onnxruntime is installed; the Docker image runs this at build time.
"""
import sys
from pathlib import Path

from ultralytics import YOLO

MODELS = Path(__file__).resolve().parent.parent / "models"
sizes = [int(s) for s in sys.argv[1:]] or [512, 640]
for pt in ("belt_v1.pt", "belt_v2.pt"):
    src = MODELS / pt
    if not src.exists():
        continue
    for size in sizes:
        out = Path(YOLO(str(src)).export(format="onnx", imgsz=size, simplify=True,
                                         dynamic=False, verbose=False))
        out.replace(src.with_name(f"{src.stem}_{size}.onnx"))
        print(f"exported {src.stem}_{size}.onnx")
