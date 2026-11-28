"""
ParkSMART - Edge AI Pipeline Verification on Recorded Video (M2 Ownership)

Usage:
  python scripts/verify_edge_pipeline.py [--video PATH] [--weights PATH] [--mode {auto,real,mock}] [--frames N] [--dry-run]

Executes the Day 4 edge AI pipeline verification on a recorded video file or synthetic frame sequence:
- Real mode: loads physical YOLO weights, asserts COCO class definitions at startup, opens real video via OpenCV,
  maps vehicle detections to bay ROIs, validates telemetry envelopes, and asserts zero frames/crops saved to disk.
- Mock mode: uses deterministic MockTestModel adapter and in-memory synthetic frames.
- Fails with a clear error if real mode or a specific video/weights path is requested but missing.
- Never silently switches an explicitly requested real-inference run to mocks.
"""

from __future__ import annotations

import argparse
import asyncio
import os
import sys
import tempfile
import time
from pathlib import Path
from typing import Any

# Add project root and backend to sys.path
root_dir = Path(__file__).resolve().parent.parent
backend_dir = root_dir / "backend"
for p in (str(root_dir), str(backend_dir)):
    if p not in sys.path:
        sys.path.insert(0, p)

import numpy as np

from app.modules.ingestion import validator
from edge.aggregator import TelemetryAggregator
from edge.bay_mapper import BayMapper
from edge.capture import VideoCaptureSource, HAS_OPENCV
from edge.config import EdgeConfig, UNVALIDATED_NOTICE
from edge.counter import ObjectCounter
from edge.detector import (
    Detection,
    YoloDetector,
    verify_model_classes,
    HAS_ULTRALYTICS,
)
from edge.publisher import EdgeTelemetryPublisher


class MockTestModel:
    """Mock model simulating YOLO26 detection for testing without GPU/weights."""

    def __init__(self) -> None:
        self.names = {
            0: "person",
            1: "bicycle",
            2: "car",
            3: "motorcycle",
            4: "airplane",
            5: "bus",
            6: "train",
            7: "truck",
        }

    def predict(self, **kwargs: object) -> list[Any]:
        # Enforce privacy and NMS locks
        assert kwargs.get("save") is False, "Privacy violation: save must be False"
        assert kwargs.get("save_txt") is False, "Privacy violation: save_txt must be False"
        assert kwargs.get("save_crop") is False, "Privacy violation: save_crop must be False"
        assert "iou" not in kwargs, "YOLO26 must not rely on NMS/IoU parameter"

        class MockBoxContainer:
            def __init__(self) -> None:
                # 1 vehicle in Bay A01 (X: 150..300, Y: 500..800), 1 pedestrian outside bays
                self.xyxy = np.array([
                    [150.0, 500.0, 300.0, 800.0],
                    [900.0, 200.0, 950.0, 350.0],
                ])
                self.conf = np.array([0.91, 0.83])
                self.cls = np.array([2.0, 0.0])  # car, person

        class MockResult:
            def __init__(self) -> None:
                self.boxes = MockBoxContainer()

        return [MockResult()]


def generate_synthetic_video_frames(n_frames: int = 10, width: int = 1920, height: int = 1080) -> list[np.ndarray]:
    """Generates synthetic video frames for pipeline testing."""
    frames = []
    for i in range(n_frames):
        frame = np.full((height, width, 3), fill_value=128, dtype=np.uint8)
        frames.append(frame)
    return frames


async def main(argv: list[str] | None = None) -> dict[str, Any]:
    parser = argparse.ArgumentParser(
        description="Verify ParkSMART Edge AI Pipeline on Recorded Video or Synthetic Frames"
    )
    parser.add_argument(
        "--video",
        type=str,
        default=None,
        help="Path to recorded video file (e.g. /data/parking_sample.mp4)",
    )
    parser.add_argument(
        "--weights",
        "--model-path",
        dest="weights",
        type=str,
        default=None,
        help="Path to YOLO model weights file (e.g. /models/yolo26n.pt)",
    )
    parser.add_argument(
        "--mode",
        type=str,
        choices=["auto", "real", "mock"],
        default="auto",
        help="Execution mode: 'real' (requires real video & weights), 'mock' (synthetic frames & mock detector), or 'auto' (default)",
    )
    parser.add_argument(
        "--real",
        action="store_true",
        help="Explicit real-inference mode (fails if video/weights/OpenCV/Ultralytics are missing)",
    )
    parser.add_argument(
        "--mock",
        action="store_true",
        help="Explicit mock mode (uses synthetic frames and mock YOLO adapter)",
    )
    parser.add_argument(
        "--frames",
        type=int,
        default=5,
        help="Number of frames to process (default: 5)",
    )
    parser.add_argument(
        "--dry-run",
        action=argparse.BooleanOptionalAction,
        default=True,
        help="Run without connecting to live MQTT broker (default: true)",
    )
    parser.add_argument(
        "--config",
        type=str,
        default=None,
        help="Path to edge config YAML file",
    )
    parser.add_argument(
        "--roi-file",
        type=str,
        default=None,
        help="Path to ROI mapping JSON file (overrides config)",
    )
    args = parser.parse_args(argv)

    print("=" * 78)
    print("ParkSMART Edge AI Pipeline Verification (Day 4)")
    print(UNVALIDATED_NOTICE)
    print("=" * 78)

    # 1. Determine execution mode and resolve explicit user requests
    explicit_real = bool(args.real or (args.mode == "real"))
    explicit_mock = bool(args.mock or (args.mode == "mock"))
    user_supplied_files = bool(args.video is not None or args.weights is not None)

    if explicit_real and explicit_mock:
        raise ValueError("Conflicting execution mode flags: both --real and --mock were specified.")

    # 2. Load Edge Configuration
    config = EdgeConfig.load(args.config)
    print(f"[CONFIG] Camera ID : {config.camera_id}")
    print(f"[CONFIG] Zone ID   : {config.zone_id}")
    print(f"[CONFIG] Model Path: {config.model.model_path} (version: {config.model.model_version})")
    print(f"[CONFIG] ImgSz     : {config.model.imgsz} (conf_threshold: {config.model.conf_threshold}) [UNVALIDATED]")

    # Resolve mode:
    # If the user explicitly passed --mock, run mock.
    # If the user explicitly passed --real OR explicitly provided --video / --weights, require real inference!
    # In 'auto' mode without explicit arguments, probe whether real files & dependencies exist; otherwise fallback to mock.
    if explicit_mock:
        mode = "mock"
    elif explicit_real or user_supplied_files:
        mode = "real"
    else:
        # Auto mode without user-supplied paths: probe environment
        configured_video = Path(config.video.source)
        configured_weights = Path(config.model.model_path)
        if configured_video.is_file() and configured_weights.is_file() and HAS_OPENCV and HAS_ULTRALYTICS:
            mode = "real"
        else:
            mode = "mock"

    video_path: str | None = None
    weights_path: str | None = None
    mock_model: Any | None = None

    # 3. Setup Capture and Detector by Mode
    if mode == "real":
        video_path = args.video or config.video.source
        weights_path = args.weights or config.model.model_path

        # 1. Validate video file existence
        if not video_path:
            raise ValueError(
                "Real inference mode requires a video source path. "
                "Specify --video PATH or configure video.source in edge config."
            )
        v_path = Path(video_path)
        if not v_path.is_file():
            raise FileNotFoundError(
                f"Video file not found at path: {video_path}. "
                "Real inference requires an existing recorded video file. "
                "Never silently falling back to mock when real mode is requested."
            )
        if v_path.stat().st_size == 0:
            raise ValueError(
                f"Video file is empty (0 bytes): {video_path}. "
                "Real inference requires a valid non-empty recorded video file."
            )

        # 2. Validate model weights existence
        if not weights_path:
            raise ValueError(
                "Real inference mode requires a model weights path. "
                "Specify --weights PATH or configure model.model_path in edge config."
            )
        w_path = Path(weights_path)
        if not w_path.is_file():
            raise FileNotFoundError(
                f"Model weights file not found at path: {weights_path}. "
                "Real inference requires existing YOLO weights. "
                "Mount weights read-only under /models. Do not commit weights to git."
            )

        # 3. Validate runtime dependencies
        if not HAS_OPENCV:
            raise RuntimeError(
                "Real inference mode requires OpenCV ('cv2') for video decoding, "
                "but it is not installed in the current environment. "
                "Install opencv-python-headless or run inside the ParkSMART edge container."
            )

        if not HAS_ULTRALYTICS:
            raise RuntimeError(
                "Real inference mode requires Ultralytics ('ultralytics') for YOLO inference, "
                "but it is not installed in the current environment. "
                "Install ultralytics or run inside the ParkSMART edge container."
            )

        print("\n" + "=" * 78)
        print("[EXECUTION MODE] REAL INFERENCE")
        print(f"  - Video capture : OpenCV (cv2) decoding recorded file: '{video_path}'")
        print(f"  - Model weights : Ultralytics YOLO26 loaded from: '{weights_path}'")
        print(f"  - Model version : {config.model.model_version}")
        print(f"  - Resolution    : {config.model.imgsz}x{config.model.imgsz} (conf: {config.model.conf_threshold}) [UNVALIDATED]")
        print("  - Inference type: Real neural network forward pass (NMS-free, zero disk saving)")
        print("=" * 78 + "\n")

        # Initialize detector with real weights
        detector = YoloDetector(
            model_path=str(weights_path),
            model_version=config.model.model_version,
            imgsz=config.model.imgsz,
            conf_threshold=config.model.conf_threshold,
            device=config.model.device,
            mock_model=None,
        )
        print(f"[PASS] Startup class assertion succeeded: IDs 0, 2, 3, 5, 7 verified against model '{weights_path}'.")

        # Initialize video capture with real file
        capture = VideoCaptureSource(source=str(video_path), loop=False, target_fps=config.video.target_fps)
        capture.open()
        print(f"[CAPTURE] Successfully opened recorded video file: {video_path}")

    else:
        # Mock mode
        auto_note = " (Auto-fallback: weights or OpenCV not found)" if not explicit_mock else ""
        print("\n" + "=" * 78)
        print(f"[EXECUTION MODE] MOCK VERIFICATION{auto_note}")
        print("  - Video capture : Synthetic recorded frames (in-memory numpy arrays)")
        print("  - Model adapter : MockTestModel simulating YOLO26 detection")
        print("  - Inference type: Deterministic mock detections (Bay A01 vehicle, pedestrian outside bays)")
        print("  - Note          : Real weights and video were NOT loaded; physical model inference was NOT executed.")
        print("=" * 78 + "\n")

        mock_model = MockTestModel()
        detector = YoloDetector(
            model_path="/models/mock.pt",
            model_version=config.model.model_version,
            imgsz=config.model.imgsz,
            conf_threshold=config.model.conf_threshold,
            device=config.model.device,
            mock_model=mock_model,
        )
        print("[PASS] Startup class assertion succeeded: IDs 0, 2, 3, 5, 7 verified against MockTestModel adapter.")

        capture = VideoCaptureSource(source="synthetic", loop=False, target_fps=30.0)
        frames = generate_synthetic_video_frames(n_frames=args.frames)
        capture.set_custom_frame_provider(iter(frames))
        print(f"[CAPTURE] Generated {len(frames)} synthetic in-memory frames for mock verification.")

    # 4. Initialize Bay Mapper
    roi_file = Path(args.roi_file) if args.roi_file else Path(config.roi.roi_file)
    if not roi_file.is_file():
        roi_file = root_dir / "docs" / "contracts" / "roi_mapping.example.json"
    bay_mapper = BayMapper(
        roi_mapping_path=str(roi_file),
        overlap_threshold=config.roi.occupancy_overlap_threshold,
        unoccupied_confidence=config.roi.unoccupied_confidence,
    )
    print(f"[PASS] Bay ROI mapping loaded: {len(bay_mapper.bays)} bays registered from '{roi_file.name}'.")

    # 5. Initialize Counter and Aggregator
    counter = ObjectCounter(area_m2=config.aggregator.area_m2)
    aggregator = TelemetryAggregator(
        camera_id=config.camera_id,
        zone_id=config.zone_id,
        occupancy_interval_s=0,  # Immediate for verification run
        crowd_interval_s=0,
        health_interval_s=0,
        model_version=config.model.model_version,
        initial_bay_ids=[b.bay_id for b in bay_mapper.bays],
    )
    publisher = EdgeTelemetryPublisher(
        config=config.mqtt,
        camera_id=config.camera_id,
        zone_id=config.zone_id,
        dry_run=args.dry_run,
    )

    # Track pre-existing files to verify zero frames/crops are written to disk
    files_before = set(os.listdir(root_dir))

    await publisher.start()
    processed_count = 0
    start_time = time.time()

    print("\n--- Processing Video Frames ---")
    for frame, idx in capture.frames():
        if processed_count >= args.frames:
            break

        # A. Detect objects
        detections = detector.detect(frame)

        # B. Map to bays
        h, w = (frame.shape[:2]) if hasattr(frame, "shape") else (1080, 1920)
        bay_readings = bay_mapper.map_detections(detections, frame_width=w, frame_height=h)

        # C. Count vehicles and pedestrians separately
        crowd_counts = counter.count(detections)

        # D. Aggregate
        aggregator.record_frame(bay_readings, crowd_counts, idx)

        processed_count += 1
        print(
            f"  Frame {idx:02d}: {len(detections)} detections -> "
            f"vehicles: {crowd_counts.vehicle_count}, pedestrians: {crowd_counts.pedestrian_count}, "
            f"occupied bays: {sum(1 for b in bay_readings if b['state'] == 'occupied')}/{len(bay_readings)}"
        )

    elapsed = time.time() - start_time
    fps = round(processed_count / elapsed, 2) if elapsed > 0 else 0.0
    print(f"\n[METRICS] Processed {processed_count} frames in {elapsed:.3f}s (measured rate: {fps} FPS)")

    # Handle 0-frame empty video scenario
    if processed_count == 0:
        print("\n[WARNING] Video source yielded 0 frames (empty video stream). Emitting degraded health message.")
        aggregator.record_error("Video source yielded 0 frames (empty video stream)")
        health_payload = aggregator.build_health_payload(state="degraded")
    else:
        health_payload = aggregator.build_health_payload(state="online")

    # 6. Build and Validate Payloads
    occ_payload = aggregator.build_occupancy_payload()
    crowd_payload = aggregator.build_crowd_payload()

    await publisher.publish_occupancy(occ_payload)
    await publisher.publish_crowd(crowd_payload)
    await publisher.publish_health(health_payload)

    await publisher.stop()
    capture.release()

    # 7. Validate Payloads with Ingestion Validator
    print("\n--- Validating Payloads with Backend Ingestion Validator ---")
    validator.validate_envelope(occ_payload)
    validator.validate_envelope(crowd_payload)
    validator.validate_envelope(health_payload)
    print("[PASS] All edge telemetry payloads passed backend envelope validation.")
    print(f"[PASS] OccupancyMessage provenance: {occ_payload.get('provenance')!r}")
    print(f"[PASS] CrowdMessage provenance:     {crowd_payload.get('provenance')!r}")
    print(f"[PASS] HealthMessage provenance:    {health_payload.get('provenance')!r}")

    # 8. Verify Privacy Locks: Zero frames or crops on disk
    files_after = set(os.listdir(root_dir))
    new_files = files_after - files_before
    frame_files = [f for f in new_files if f.endswith((".jpg", ".png", ".bmp", ".avi", ".mp4", ".txt"))]
    assert len(frame_files) == 0, f"Privacy violation: unexpected files written: {frame_files}"
    print("[PASS] Privacy preservation verified: Zero camera frames or detection crops written to disk.")

    print("\n" + "=" * 78)
    if mode == "real":
        print("[SUMMARY] Real-video inference verified successfully!")
        print(f"          Processed {processed_count} real video frames via loaded model weights.")
    else:
        print("[SUMMARY] Mock pipeline verification succeeded.")
        print(f"          Processed {processed_count} synthetic frames via MockTestModel adapter.")
        print("          NOTE: Physical model inference was not executed (mock mode active).")
    print("          No camera frames or crops persisted to disk.")
    print("          All telemetry payloads passed backend envelope validation.")
    print("NOTE: No model accuracy or detection efficacy is claimed for physical Bhubaneswar deployments.")
    print("=" * 78)

    return {
        "mode": mode,
        "frames_processed": processed_count,
        "fps": fps,
        "video_source": str(video_path) if mode == "real" else "synthetic",
        "model_path": str(weights_path) if mode == "real" else "mock",
        "occupancy_payload": occ_payload,
        "crowd_payload": crowd_payload,
        "health_payload": health_payload,
        "published_count": len(publisher._published_messages),
    }


if __name__ == "__main__":
    asyncio.run(main())
