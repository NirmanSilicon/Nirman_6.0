# Model weights (integrated later)

Models are trained elsewhere. Drop weights here; they are mounted read-only into the inference service at `/models`.

| File | Purpose | Required |
|---|---|---|
| `detector.pt` | Ultralytics YOLOv8n / YOLO11n component detector (640px) | for `INFERENCE_MODE=yolo` |
| `board_classifier.pt` | Ultralytics YOLO *classification* weights: MVP board vs other | optional (falls back to a detector heuristic) |
| `classes.json` | Optional map `{ "<model class name>": "RAM_IC|IC|CAPACITOR|RESISTOR|CONNECTOR|CRYSTAL" }` | optional |

Then: `INFERENCE_MODE=yolo INSTALL_ML=1 docker compose up -d --build inference`.
See `inference/README.md` for the contract.
