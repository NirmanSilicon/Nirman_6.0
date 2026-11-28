# SmartPPE — Warden's Eye: AI / ML Computer Vision Layer (`ml-model/` & `app/`)

## 1. Directory Structure

```text
Warden-s-Eye/
├── app/                              # Core Python AI Monitoring Package & Backend Bridge
│   ├── config.py                     # Model path resolver, confidence thresholds & UI theme
│   ├── detection/
│   │   ├── ppe_detector.py           # YOLO11n PPE detector (person, helmet, no_helmet, vest, boots)
│   │   └── fire_detector.py          # YOLO11n Fire & Smoke detector (fire, smoke)
│   ├── events/
│   │   ├── manager.py                # State-transition hysteresis event manager
│   │   └── backend_client.py         # Non-blocking HTTP bridge to Node.js Backend (/api/detections)
│   ├── safety/
│   │   └── engine.py                 # Safety priority engine (FIRE > SMOKE > HELMET > VEST > BOOTS)
│   ├── ui/
│   │   ├── overlay.py                # OpenCV bounding box & status overlay renderer
│   │   └── window.py                 # Tkinter desktop console (Webcam, Video File & Smartphone Stream)
│   ├── utils/
│   │   └── logger.py                 #Rotating file & console logger
│   └── video/
│       └── source.py                 # Unified video capture (Webcam, File & Smartphone Wi-Fi Stream)
├── ml-model/
│   ├── models/
│   │   ├── fire_smoke_best.pt        # Trained Fire & Smoke YOLO11n weights ({0: 'smoke', 1: 'fire'})
│   │   ├── yolo11n.pt                # Base YOLO11n person detection weights
│   │   └── ppe_best.pt               # (Drop custom trained PPE weights here: person, helmet, no_helmet, vest, boots)
│   ├── experiments/                  # Prototype training & evaluation scripts
│   └── requirements.txt              # Python package dependencies
└── run.py                            # Desktop AI Monitoring & Backend Bridge entry point
```

## 2. Adding Custom PPE Weights (`ppe_best.pt`)

Place the custom-trained PPE weights file (`person`, `helmet`, `no_helmet`, `vest`, `boots`) at:

```text
ml-model/models/ppe_best.pt
```

`app/config.py` automatically detects `ml-model/models/ppe_best.pt` on startup. If `ppe_best.pt` is not yet placed in `ml-model/models/`, `PPEDetector` falls back to `ml-model/models/yolo11n.pt` for person detection without generating false missing-vest/missing-boots violations, while `FireSmokeDetector` runs full fire and smoke detection using `ml-model/models/fire_smoke_best.pt`.
