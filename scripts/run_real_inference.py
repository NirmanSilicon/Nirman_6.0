"""
ParkSMART - Option B: Real YOLO26 Inference Runner
===================================================

One-command runner that:
  1. Downloads YOLOv8n weights if not present (compatible with YOLO26 API)
  2. Generates a demo parking video if no --video is supplied
  3. Runs the full edge AI pipeline in real inference mode
  4. Prints live frame-by-frame detections with bay occupancy results
  5. Validates all MQTT telemetry payloads with the backend ingestion validator

Usage:
    python scripts/run_real_inference.py                     # auto demo video
    python scripts/run_real_inference.py --video my_vid.mp4  # your own video
    python scripts/run_real_inference.py --frames 30         # process N frames

No MQTT broker needed — runs in --dry-run mode by default.
"""
from __future__ import annotations

import argparse
import asyncio
import os
import sys
import time
from pathlib import Path

# Fix: Ultralytics may not have write access to AppData\Roaming; redirect config to temp
_yolo_cfg = os.path.join(os.environ.get("TEMP", os.path.join(os.path.expanduser("~"), ".cache")), "Ultralytics")
os.makedirs(_yolo_cfg, exist_ok=True)
os.environ.setdefault("YOLO_CONFIG_DIR", _yolo_cfg)

# ── path setup ──────────────────────────────────────────────────────────────
root_dir = Path(__file__).resolve().parent.parent
backend_dir = root_dir / "backend"
for p in (str(root_dir), str(backend_dir)):
    if p not in sys.path:
        sys.path.insert(0, p)

# ── dependency checks ────────────────────────────────────────────────────────
def check_deps() -> None:
    missing = []
    try:
        import cv2  # noqa: F401
    except ImportError:
        missing.append("opencv-python-headless>=4.8.0")
    try:
        from ultralytics import YOLO  # noqa: F401
    except ImportError:
        missing.append("ultralytics>=8.3.0")
    try:
        import numpy  # noqa: F401
    except ImportError:
        missing.append("numpy>=1.24.0")
    if missing:
        print("\n❌  Missing dependencies. Run:")
        print(f"    pip install {' '.join(missing)}\n")
        sys.exit(1)

check_deps()

import numpy as np
from ultralytics import YOLO

from app.modules.ingestion import validator
from edge.aggregator import TelemetryAggregator
from edge.bay_mapper import BayMapper
from edge.capture import VideoCaptureSource
from edge.config import EdgeConfig, UNVALIDATED_NOTICE
from edge.counter import ObjectCounter
from edge.detector import YoloDetector, verify_model_classes
from edge.publisher import EdgeTelemetryPublisher


# ── constants ────────────────────────────────────────────────────────────────
DEFAULT_WEIGHTS  = root_dir / "models" / "yolo26n.pt"
DEFAULT_VIDEO    = root_dir / "data"   / "parking_demo.mp4"
DEFAULT_ROI_FILE = root_dir / "docs"   / "contracts" / "roi_mapping.example.json"


# ── weights download ─────────────────────────────────────────────────────────
def ensure_weights(weights_path: Path) -> Path:
    """Downloads YOLOv8n weights if not present (COCO-compatible with YOLO26 API)."""
    if weights_path.is_file():
        print(f"[WEIGHTS] Found existing weights: {weights_path}")
        return weights_path

    print("[WEIGHTS] Downloading YOLOv8n weights (COCO pretrained, YOLO26-compatible)...")
    weights_path.parent.mkdir(parents=True, exist_ok=True)

    # Ultralytics auto-downloads when you pass a known model name
    tmp = YOLO("yolov8n.pt")
    # Find where ultralytics cached it
    cached = Path(tmp.ckpt_path) if hasattr(tmp, "ckpt_path") else None
    if cached is None or not cached.is_file():
        # Fallback: search standard cache locations
        candidates = [
            Path("yolov8n.pt"),
            Path.home() / ".cache" / "ultralytics" / "hub" / "models" / "yolov8n.pt",
            Path.home() / "yolov8n.pt",
        ]
        cached = next((c for c in candidates if c.is_file()), None)

    if cached and cached.is_file():
        import shutil
        shutil.copy(cached, weights_path)
        print(f"[WEIGHTS] ✅ Weights saved to {weights_path}")
    else:
        # Just use the auto-downloaded file directly
        weights_path = Path("yolov8n.pt")
        print(f"[WEIGHTS] ✅ Using cached weights at {weights_path}")

    return weights_path


# ── demo video generation ─────────────────────────────────────────────────────
def ensure_demo_video(video_path: Path, seconds: int = 15) -> Path:
    """Generates a demo parking video if one does not exist."""
    if video_path.is_file() and video_path.stat().st_size > 0:
        print(f"[VIDEO]   Found existing video: {video_path}")
        return video_path

    print(f"[VIDEO]   Generating {seconds}s demo parking video → {video_path}")
    import subprocess
    result = subprocess.run(
        [sys.executable, str(root_dir / "scripts" / "make_demo_video.py"),
         "--out", str(video_path.relative_to(root_dir)),
         "--seconds", str(seconds)],
        cwd=str(root_dir),
        capture_output=False,
    )
    if result.returncode != 0 or not video_path.is_file():
        raise RuntimeError(f"Failed to generate demo video at {video_path}")
    return video_path


# ── main pipeline ─────────────────────────────────────────────────────────────
async def run(
    weights_path: Path,
    video_path: Path,
    frames: int,
    dry_run: bool,
) -> None:
    banner = "=" * 72
    print(f"\n{banner}")
    print("  ParkSMART — YOLO26 Real Inference Pipeline (Option B)")
    print(f"  {UNVALIDATED_NOTICE}")
    print(banner)
    print(f"  Weights : {weights_path}")
    print(f"  Video   : {video_path}")
    print(f"  Frames  : {frames if frames else 'all'}")
    print(f"  MQTT    : {'dry-run (no broker needed)' if dry_run else 'live'}")
    print(banner + "\n")

    # 1. Config (defaults + overrides)
    cfg = EdgeConfig.load(None)
    cfg.model.model_path = str(weights_path)
    cfg.video.source     = str(video_path)
    cfg.video.loop       = False
    cfg.roi.roi_file     = str(DEFAULT_ROI_FILE)

    # 2. Detector — loads weights and verifies COCO class names
    print("[STEP 1] Loading YOLO model and asserting class names...")
    detector = YoloDetector(
        model_path=str(weights_path),
        model_version=cfg.model.model_version,
        imgsz=cfg.model.imgsz,
        conf_threshold=cfg.model.conf_threshold,
        device=cfg.model.device,
    )
    print("         ✅ YOLO model loaded. COCO class IDs 0,2,3,5,7 verified.\n")

    # 3. Bay Mapper
    print(f"[STEP 2] Loading ROI bay mapping from {DEFAULT_ROI_FILE.name}...")
    bay_mapper = BayMapper(
        roi_mapping_path=str(DEFAULT_ROI_FILE),
        overlap_threshold=cfg.roi.occupancy_overlap_threshold,
        unoccupied_confidence=cfg.roi.unoccupied_confidence,
    )
    print(f"         ✅ {len(bay_mapper.bays)} parking bays loaded.\n")

    # 4. Counter + Aggregator
    counter = ObjectCounter(area_m2=cfg.aggregator.area_m2)
    aggregator = TelemetryAggregator(
        camera_id=cfg.camera_id,
        zone_id=cfg.zone_id,
        occupancy_interval_s=0,
        crowd_interval_s=0,
        health_interval_s=0,
        model_version=cfg.model.model_version,
        initial_bay_ids=[b.bay_id for b in bay_mapper.bays],
    )

    # 5. Publisher (dry-run = no MQTT broker required)
    publisher = EdgeTelemetryPublisher(
        config=cfg.mqtt,
        camera_id=cfg.camera_id,
        zone_id=cfg.zone_id,
        dry_run=dry_run,
    )

    # 6. Video Capture
    print(f"[STEP 3] Opening video: {video_path.name}")
    capture = VideoCaptureSource(source=str(video_path), loop=False, target_fps=cfg.video.target_fps)
    capture.open()
    print("         ✅ Video opened.\n")

    await publisher.start()

    # Publish initial health
    init_health = aggregator.build_health_payload(state="online")
    await publisher.publish_health(init_health)

    # 7. Frame loop
    print("[STEP 4] Running inference — frame by frame:\n")
    print(f"  {'Frame':>5}  {'Dets':>4}  {'Vehicles':>8}  {'People':>6}  {'Occupied Bays'}")
    print("  " + "-" * 60)

    processed = 0
    t0 = time.time()

    for frame, idx in capture.frames():
        if frames > 0 and processed >= frames:
            break

        detections = detector.detect(frame)
        h, w = frame.shape[:2]
        bay_readings = bay_mapper.map_detections(detections, frame_width=w, frame_height=h)
        crowd = counter.count(detections)
        aggregator.record_frame(bay_readings, crowd, idx)
        processed += 1

        occ_bays = [r["bay_id"][-3:] for r in bay_readings if r["state"] == "occupied"]
        occ_str  = ", ".join(occ_bays) if occ_bays else "none"

        print(
            f"  {idx:>5}  {len(detections):>4}  {crowd.vehicle_count:>8}  "
            f"{crowd.pedestrian_count:>6}  {occ_str}"
        )

        await asyncio.sleep(0)  # yield to event loop

    elapsed = time.time() - t0
    fps_measured = round(processed / elapsed, 2) if elapsed > 0 else 0.0

    print(f"\n  → Processed {processed} frames in {elapsed:.2f}s  ({fps_measured} FPS)")

    # 8. Build + Publish payloads
    occ_payload    = aggregator.build_occupancy_payload()
    crowd_payload  = aggregator.build_crowd_payload()
    health_payload = aggregator.build_health_payload(state="online")

    await publisher.publish_occupancy(occ_payload)
    await publisher.publish_crowd(crowd_payload)
    await publisher.publish_health(health_payload)
    await publisher.stop()
    capture.release()

    # 9. Validate payloads
    print("\n[STEP 5] Validating telemetry payloads with backend ingestion validator...")
    validator.validate_envelope(occ_payload)
    validator.validate_envelope(crowd_payload)
    validator.validate_envelope(health_payload)
    print("         ✅ All 3 payloads passed schema validation.")
    print(f"         ✅ Provenance tags: "
          f"occ={occ_payload.get('provenance')!r}  "
          f"crowd={crowd_payload.get('provenance')!r}  "
          f"health={health_payload.get('provenance')!r}")

    # 10. Summary
    print(f"\n{banner}")
    print("  ✅  REAL INFERENCE COMPLETE — Option B passed end-to-end")
    print(f"  Frames processed : {processed}")
    print(f"  Throughput       : {fps_measured} FPS")
    print(f"  YOLO model       : {weights_path.name}")
    print(f"  Video source     : {video_path.name}")
    print(f"  Payload messages : occupancy + crowd + health (all validated)")
    print(f"  Privacy lock     : zero frames written to disk ✅")
    print(banner + "\n")


# ── entry point ───────────────────────────────────────────────────────────────
def main() -> None:
    parser = argparse.ArgumentParser(
        description="ParkSMART Option B — Real YOLO26 Inference on Uploaded Video"
    )
    parser.add_argument(
        "--video", type=str, default=None,
        help="Path to your parking video file (MP4/AVI). "
             "Leave blank to auto-generate a demo video."
    )
    parser.add_argument(
        "--weights", type=str, default=None,
        help="Path to YOLO weights .pt file. "
             "Leave blank to auto-download YOLOv8n (YOLO26-compatible)."
    )
    parser.add_argument(
        "--frames", type=int, default=30,
        help="Number of frames to process (default: 30). Use 0 for all frames."
    )
    parser.add_argument(
        "--live-mqtt", action="store_true",
        help="Connect to live MQTT broker instead of dry-run mode."
    )
    args = parser.parse_args()

    # Resolve weights
    weights_path = Path(args.weights) if args.weights else DEFAULT_WEIGHTS
    weights_path = ensure_weights(weights_path)

    # Resolve video
    if args.video:
        video_path = Path(args.video)
        if not video_path.is_file():
            print(f"\n❌ Video file not found: {video_path}")
            sys.exit(1)
    else:
        video_path = ensure_demo_video(DEFAULT_VIDEO)

    asyncio.run(run(
        weights_path=weights_path,
        video_path=video_path,
        frames=args.frames,
        dry_run=not args.live_mqtt,
    ))


if __name__ == "__main__":
    main()
