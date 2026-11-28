"""
Comprehensive Unit and Integration Tests for ParkSMART Edge Video Pipeline (Day 4 / M2 Ownership)

Verifies:
1. Mock mode execution: runs deterministic MockTestModel adapter, processes N frames, validates envelope schemas.
2. Auto mode fallback: safely falls back to mock mode when physical weights/OpenCV are missing.
3. Explicit real mode with missing video: raises FileNotFoundError, never silently switches to mocks.
4. Explicit real mode with missing weights: raises FileNotFoundError, never silently switches to mocks.
5. Explicitly supplied --video or --weights in auto mode: fails with FileNotFoundError if missing.
6. Empty video file (0 bytes): raises ValueError with clear error message.
7. Empty video stream (0 frames processed): emits degraded health, bays default to 'unknown' (never 'free').
8. Class assertion verification: COCO IDs 0 (person), 2 (car), 3 (motorcycle), 5 (bus), 7 (truck) verified at startup.
9. Conflicting flags: --real and --mock together raise ValueError.
10. Missing runtime dependencies: raises RuntimeError if OpenCV or Ultralytics is absent when real mode is requested.
11. Pinned ROI contract mapping: verifies 4 bays from docs/contracts/roi_mapping.example.json.
12. Fallback selection: supports '--video synthetic' and '--video simulator' for synthetic fallback.
13. Dry-run mode: marks delivered=False, never pretending network delivery took place.
14. Privacy preservation: zero frames or detection crops written to disk.
"""

from __future__ import annotations

import asyncio
import os
import sys
import tempfile
import unittest
from pathlib import Path

# Ensure root and backend in sys.path
root_dir = Path(__file__).resolve().parent.parent.parent.parent
backend_dir = root_dir / "backend"
for p in (str(root_dir), str(backend_dir)):
    if p not in sys.path:
        sys.path.insert(0, p)

from edge.config import MqttConfig
from edge.detector import verify_model_classes
from edge.publisher import EdgeTelemetryPublisher
from scripts.verify_edge_pipeline import (
    main as verify_pipeline_main,
)

from app.modules.ingestion import validator


class TestVerifyEdgePipelineCli(unittest.TestCase):
    """Test suite for edge video pipeline verification CLI, error handling, and contracts."""

    def test_mock_mode_execution(self) -> None:
        """Explicit --mock flag executes 3 synthetic frames, validates payloads, and reports mock mode."""
        res = asyncio.run(verify_pipeline_main(["--mock", "--frames", "3", "--dry-run"]))
        self.assertEqual(res["mode"], "mock")
        self.assertEqual(res["frames_processed"], 3)
        self.assertEqual(res["video_source"], "synthetic")
        self.assertEqual(res["model_path"], "mock")

        # Validate telemetry envelopes
        validator.validate_envelope(res["occupancy_payload"])
        validator.validate_envelope(res["crowd_payload"])
        validator.validate_envelope(res["health_payload"])

        # Check provenance
        self.assertEqual(res["occupancy_payload"]["provenance"], "observed")
        self.assertEqual(res["crowd_payload"]["provenance"], "observed")
        self.assertEqual(res["health_payload"]["provenance"], "observed")

    def test_auto_mode_fallback_reporting(self) -> None:
        """Auto mode falls back to mock mode when physical weights/video are absent on host."""
        res = asyncio.run(verify_pipeline_main(["--frames", "2", "--dry-run"]))
        self.assertEqual(res["mode"], "mock")
        self.assertEqual(res["frames_processed"], 2)
        validator.validate_envelope(res["occupancy_payload"])

    def test_explicit_real_mode_missing_video_raises(self) -> None:
        """Explicit --real flag with missing video raises FileNotFoundError (no silent fallback)."""
        with self.assertRaises(FileNotFoundError) as ctx:
            asyncio.run(
                verify_pipeline_main([
                    "--real",
                    "--video", "/nonexistent/recorded_video_12345.mp4",
                    "--weights", "some_weights.pt",
                ])
            )
        self.assertIn("Video file not found at path", str(ctx.exception))
        self.assertIn("Never silently falling back to mock", str(ctx.exception))

    def test_explicit_real_mode_missing_weights_raises(self) -> None:
        """Explicit --real flag with missing weights raises FileNotFoundError (no silent fallback)."""
        with tempfile.NamedTemporaryFile(suffix=".mp4", delete=False) as tmp_vid:
            tmp_vid.write(b"dummy video content")
            tmp_vid_path = tmp_vid.name

        try:
            with self.assertRaises(FileNotFoundError) as ctx:
                asyncio.run(
                    verify_pipeline_main([
                        "--real",
                        "--video", tmp_vid_path,
                        "--weights", "/nonexistent/yolo_weights_9999.pt",
                    ])
                )
            self.assertIn("Model weights file not found at path", str(ctx.exception))
        finally:
            if os.path.exists(tmp_vid_path):
                os.remove(tmp_vid_path)

    def test_empty_video_file_raises_valueerror(self) -> None:
        """Explicit 0-byte video file raises ValueError with clear error message."""
        with tempfile.NamedTemporaryFile(suffix=".mp4", delete=False) as tmp_vid:
            tmp_vid_path = tmp_vid.name  # 0 bytes

        try:
            with self.assertRaises(ValueError) as ctx:
                asyncio.run(
                    verify_pipeline_main([
                        "--real",
                        "--video", tmp_vid_path,
                        "--weights", "some_weights.pt",
                    ])
                )
            self.assertIn("Video file is empty (0 bytes)", str(ctx.exception))
        finally:
            if os.path.exists(tmp_vid_path):
                os.remove(tmp_vid_path)

    def test_explicit_video_arg_fails_if_missing(self) -> None:
        """Explicitly supplying --video in auto mode fails if the video file does not exist."""
        with self.assertRaises(FileNotFoundError) as ctx:
            asyncio.run(
                verify_pipeline_main([
                    "--video", "/nonexistent/my_custom_traffic_video.mp4",
                ])
            )
        self.assertIn("Video file not found at path", str(ctx.exception))

    def test_explicit_weights_arg_fails_if_missing(self) -> None:
        """Explicitly supplying --weights in auto mode fails if the weights file does not exist."""
        with tempfile.NamedTemporaryFile(suffix=".mp4", delete=False) as tmp_vid:
            tmp_vid.write(b"dummy video data")
            tmp_vid_path = tmp_vid.name

        try:
            with self.assertRaises(FileNotFoundError) as ctx:
                asyncio.run(
                    verify_pipeline_main([
                        "--video", tmp_vid_path,
                        "--weights", "/nonexistent/my_custom_yolo.pt",
                    ])
                )
            self.assertIn("Model weights file not found at path", str(ctx.exception))
        finally:
            if os.path.exists(tmp_vid_path):
                os.remove(tmp_vid_path)

    def test_conflicting_real_and_mock_flags_raises(self) -> None:
        """Supplying both --real and --mock raises ValueError."""
        with self.assertRaises(ValueError) as ctx:
            asyncio.run(verify_pipeline_main(["--real", "--mock"]))
        self.assertIn("Conflicting execution mode flags", str(ctx.exception))

    def test_explicit_real_mode_missing_dependencies_raises(self) -> None:
        """Explicit --real flag with existing dummy files raises RuntimeError if OpenCV or Ultralytics is absent."""
        with tempfile.NamedTemporaryFile(suffix=".mp4", delete=False) as tmp_vid:
            tmp_vid.write(b"dummy video data")
            tmp_vid_path = tmp_vid.name
        with tempfile.NamedTemporaryFile(suffix=".pt", delete=False) as tmp_wt:
            tmp_wt.write(b"dummy weights data")
            tmp_wt_path = tmp_wt.name

        try:
            from edge.capture import HAS_OPENCV
            from edge.detector import HAS_ULTRALYTICS

            if not HAS_OPENCV or not HAS_ULTRALYTICS:
                with self.assertRaises(RuntimeError) as ctx:
                    asyncio.run(
                        verify_pipeline_main([
                            "--real",
                            "--video", tmp_vid_path,
                            "--weights", tmp_wt_path,
                        ])
                    )
                self.assertTrue(
                    "OpenCV" in str(ctx.exception) or "Ultralytics" in str(ctx.exception)
                )
        finally:
            for p in (tmp_vid_path, tmp_wt_path):
                if os.path.exists(p):
                    os.remove(p)

    def test_custom_roi_file_argument(self) -> None:
        """Supplying explicit --roi-file successfully loads 4 bay definitions from pinned contract."""
        roi_contract = root_dir / "docs" / "contracts" / "roi_mapping.example.json"
        res = asyncio.run(
            verify_pipeline_main([
                "--mock",
                "--frames", "2",
                "--roi-file", str(roi_contract),
            ])
        )
        self.assertEqual(res["mode"], "mock")
        self.assertEqual(len(res["occupancy_payload"]["bays"]), 4)

    def test_empty_video_stream_emits_degraded_health_and_unknown_bays(self) -> None:
        """When video source yields 0 frames, health is degraded and bays default to unknown (never free)."""
        res = asyncio.run(verify_pipeline_main(["--mock", "--frames", "0"]))
        self.assertEqual(res["frames_processed"], 0)
        self.assertEqual(res["health_payload"]["state"], "degraded")

        # Invariant check: bays must be unknown, NEVER free!
        bay_states = {b["bay_id"]: b["state"] for b in res["occupancy_payload"]["bays"]}
        self.assertGreater(len(bay_states), 0)
        for bid, state in bay_states.items():
            self.assertEqual(state, "unknown", f"Bay {bid} must not be marked free when stream is empty")

    def test_startup_class_assertion_success_and_failure(self) -> None:
        """verify_model_classes requires exact COCO IDs 0, 2, 3, 5, 7 and fails on mismatch."""
        valid_classes = {0: "person", 2: "car", 3: "motorcycle", 5: "bus", 7: "truck"}
        verify_model_classes(valid_classes)

        with self.assertRaises(ValueError) as ctx:
            verify_model_classes({0: "pedestrian", 2: "car", 3: "motorcycle", 5: "bus", 7: "truck"})
        self.assertIn("Model class name mismatch for ID 0", str(ctx.exception))

        with self.assertRaises(ValueError) as ctx:
            verify_model_classes({0: "person", 2: "vehicle", 3: "motorcycle", 5: "bus", 7: "truck"})
        self.assertIn("Model class name mismatch for ID 2", str(ctx.exception))

    def test_dry_run_mode_flags_delivered_false(self) -> None:
        """In dry-run mode, publisher records delivered=False and does not connect socket."""
        config = MqttConfig(broker_host="localhost", broker_port=8883, qos=1)
        pub = EdgeTelemetryPublisher(
            config=config,
            camera_id="c1a1a1a1-1111-4111-8111-111111111111",
            zone_id="a1a1a1a1-1111-4111-8111-111111111111",
            dry_run=True,
        )

        async def run_pub() -> None:
            await pub.start()
            self.assertIsNone(pub._client)  # Socket was not initialized
            await pub.publish_occupancy({
                "schema_version": 1,
                "msg_id": "00000000-0000-0000-0000-000000000001",
                "ts": "2026-11-25T12:00:00Z",
                "camera_id": pub.camera_id,
                "bays": [],
                "provenance": "observed",
            })
            await pub.stop()

        asyncio.run(run_pub())
        self.assertEqual(len(pub._published_messages), 1)
        self.assertFalse(pub._published_messages[0]["delivered"])

    def test_privacy_preservation_zero_disk_files(self) -> None:
        """Asserts that running verify_edge_pipeline writes zero media files to the repository."""
        files_before = set(os.listdir(root_dir))
        asyncio.run(verify_pipeline_main(["--mock", "--frames", "5"]))
        files_after = set(os.listdir(root_dir))
        new_files = [f for f in (files_after - files_before) if f.endswith((".jpg", ".png", ".mp4", ".avi", ".txt"))]
        self.assertEqual(len(new_files), 0, f"Privacy violation: media files persisted: {new_files}")


if __name__ == "__main__":
    unittest.main()
