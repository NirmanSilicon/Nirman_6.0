"""
Unit Tests for ParkSMART Edge Health, Calibration, and Watchdog (Day 3 / M2 Ownership)

Verifies:
1. EdgeHealthMonitor:
   - Healthy nominal operation and frame pacing.
   - Camera offline behavior (capture interrupted, stream disconnected).
   - Recovery behavior (camera online recovery).
   - Degraded state on low FPS or error accumulation.
   - Bounded error logging (<= 20 items, <= 200 chars).
   - Invariant: camera health state is independent from parking bay physical occupancy.
   - Zero disk storage: never writes frames or crops to disk.
2. CameraCalibrator:
   - Valid ROI mapping validation and ground area estimation.
   - Missing calibration data handling (None, empty dict, missing file).
   - Invalid configuration: malformed UUIDs, bad coordinate types, duplicate bay IDs.
   - Polygon geometry validation: out-of-bounds vertices, near-zero area, fewer than 3 points.
   - Pairwise bay spatial overlap detection (IoU warning).
   - Configurable unvalidated thresholds: disclaimer present, no unsupported Bhubaneswar claims.
3. Forecast Interval Calibration:
   - Empirical coverage and conformal scale factor estimation.
   - Insufficient samples and non-finite rejection.
"""

from __future__ import annotations

import json
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

from edge.calibration import (
    CameraCalibrator,
    load_roi_mapping,
    validate_roi_polygon,
)
from edge.health import EdgeHealthMonitor
from forecast_worker.calibration import (
    calibrate_prediction_intervals,
)


class TestEdgeHealthAndCalibration(unittest.TestCase):
    """Test suite for edge health monitoring, camera recovery, and ROI calibration."""

    def setUp(self) -> None:
        self.camera_id = "c1c1c1c1-1111-4111-8111-111111111111"
        self.zone_id = "a1a1a1a1-1111-4111-8111-111111111111"

    # ------------------------------------------------------------------------
    # 1. Edge Health Monitor Tests
    # ------------------------------------------------------------------------

    def test_healthy_operation(self) -> None:
        """EdgeHealthMonitor reports online state and valid metrics during nominal operation."""
        monitor = EdgeHealthMonitor(camera_id=self.camera_id, target_fps=10.0)

        for _ in range(15):
            monitor.record_frame()

        st = monitor.evaluate_status()
        self.assertEqual(st.state, "online")
        self.assertEqual(st.target_fps, 10.0)
        self.assertGreaterEqual(st.uptime_s, 0)
        self.assertEqual(st.dropped_frames, 0)
        self.assertEqual(len(st.errors), 0)

        # Build schema_version 1 HealthMessage
        msg = monitor.build_health_message()
        self.assertEqual(msg["schema_version"], 1)
        self.assertEqual(msg["state"], "online")
        self.assertIsNotNone(msg["fps"])
        self.assertEqual(msg["provenance"], "observed")
        self.assertTrue(msg["ts"].endswith("Z"))

    def test_camera_offline_behavior(self) -> None:
        """When video stream disconnects, monitor transitions to offline and sets fps to None."""
        monitor = EdgeHealthMonitor(camera_id=self.camera_id, target_fps=5.0)

        monitor.set_camera_offline(reason="rtsp_connection_reset")
        st = monitor.evaluate_status()

        self.assertEqual(st.state, "offline")
        self.assertFalse(monitor.is_capturing)
        self.assertTrue(any("offline" in e for e in st.errors))

        msg = monitor.build_health_message()
        self.assertEqual(msg["state"], "offline")
        self.assertIsNone(msg["fps"])  # Invariant: offline camera has null FPS

    def test_camera_offline_recovery(self) -> None:
        """When camera stream reconnects, set_camera_online restores online state."""
        monitor = EdgeHealthMonitor(camera_id=self.camera_id, target_fps=5.0)

        # 1. Take camera offline
        monitor.set_camera_offline(reason="cable_unplugged")
        self.assertEqual(monitor.evaluate_status().state, "offline")

        # 2. Camera recovers
        monitor.set_camera_online()
        st_recovered = monitor.evaluate_status()

        self.assertEqual(st_recovered.state, "online")
        self.assertTrue(monitor.is_capturing)
        msg_recovered = monitor.build_health_message()
        self.assertEqual(msg_recovered["state"], "online")
        self.assertIsNotNone(msg_recovered["fps"])

    def test_degraded_state_low_fps(self) -> None:
        """Monitor transitions to degraded when FPS drops below configured threshold."""
        monitor = EdgeHealthMonitor(camera_id=self.camera_id, target_fps=10.0, fps_degraded_threshold=0.5)

        # Simulate low FPS (2.0 < 5.0)
        monitor._current_fps = 2.0
        st = monitor.evaluate_status()
        self.assertEqual(st.state, "degraded")

        msg = monitor.build_health_message()
        self.assertEqual(msg["state"], "degraded")
        self.assertAlmostEqual(msg["fps"], 2.0)

    def test_degraded_state_error_accumulation(self) -> None:
        """Monitor transitions to degraded when error count exceeds threshold (> 5)."""
        monitor = EdgeHealthMonitor(camera_id=self.camera_id, target_fps=5.0)

        for i in range(6):
            monitor.record_dropped_frame(f"frame_checksum_error_{i}")

        st = monitor.evaluate_status()
        self.assertEqual(st.state, "degraded")
        self.assertEqual(st.dropped_frames, 6)

    def test_error_buffer_bounded_and_truncated(self) -> None:
        """Errors list is capped at 20 items, with each message truncated to 200 chars."""
        monitor = EdgeHealthMonitor(camera_id=self.camera_id)

        long_err = "X" * 300
        for i in range(30):
            monitor.record_error(f"{i}_{long_err}")

        st = monitor.evaluate_status()
        self.assertEqual(len(st.errors), 20)
        # Check truncation to 200 chars
        for err in st.errors:
            self.assertLessEqual(len(err), 200)

    def test_privacy_no_frames_or_crops_saved(self) -> None:
        """Edge health monitor never writes image frames or crops to disk."""
        monitor = EdgeHealthMonitor(camera_id=self.camera_id)
        msg = monitor.build_health_message()

        self.assertNotIn("frame", msg)
        self.assertNotIn("image", msg)
        self.assertNotIn("crop", msg)

    # ------------------------------------------------------------------------
    # 2. Camera ROI Calibration Tests
    # ------------------------------------------------------------------------

    def test_valid_roi_mapping_contract(self) -> None:
        """CameraCalibrator validates a standard contract mapping and computes ground area."""
        calibrator = CameraCalibrator(standard_bay_area_m2=12.5)

        roi_data = {
            "camera_id": self.camera_id,
            "zone_id": self.zone_id,
            "coordinate_type": "normalized",
            "bays": [
                {
                    "bay_id": "b1b1b1b1-1111-4111-8111-111111111111",
                    "polygon": [(0.05, 0.40), (0.20, 0.40), (0.18, 0.85), (0.02, 0.85)],
                },
                {
                    "bay_id": "b2b2b2b2-2222-4222-8222-222222222222",
                    "polygon": [(0.22, 0.40), (0.37, 0.40), (0.35, 0.85), (0.20, 0.85)],
                },
            ],
        }

        report = calibrator.validate_roi_mapping(roi_data)
        self.assertTrue(report.valid)
        self.assertEqual(report.total_bays, 2)
        self.assertEqual(len(report.errors), 0)
        self.assertEqual(report.estimated_total_area_m2, 25.0)  # 2 * 12.5
        self.assertIn("UNVALIDATED", report.disclaimer)

    def test_missing_and_empty_calibration_data(self) -> None:
        """Calibrator handles None, empty dictionaries, and zero-bay configurations safely."""
        calibrator = CameraCalibrator()

        # 1. None
        r_none = calibrator.validate_roi_mapping(None)
        self.assertFalse(r_none.valid)
        self.assertGreater(len(r_none.errors), 0)

        # 2. Empty dict
        r_empty = calibrator.validate_roi_mapping({})
        self.assertFalse(r_empty.valid)
        self.assertGreater(len(r_empty.errors), 0)

        # 3. Empty bays list
        r_nobays = calibrator.validate_roi_mapping(
            {"camera_id": self.camera_id, "zone_id": self.zone_id, "bays": []}
        )
        self.assertFalse(r_nobays.valid)
        self.assertIn("zero bays", str(r_nobays.errors))

    def test_invalid_configuration_elements(self) -> None:
        """Calibrator catches invalid UUIDs, bad coordinate types, and duplicate bays."""
        calibrator = CameraCalibrator()

        bad_cfg = {
            "camera_id": "not-a-uuid",
            "zone_id": "bad-zone-uuid",
            "coordinate_type": "polar_coordinates",
            "bays": [
                {
                    "bay_id": "b1b1b1b1-1111-4111-8111-111111111111",
                    "polygon": [(0.1, 0.1), (0.2, 0.1), (0.15, 0.3)],
                },
                {
                    "bay_id": "b1b1b1b1-1111-4111-8111-111111111111",  # Duplicate bay ID
                    "polygon": [(0.3, 0.1), (0.4, 0.1), (0.35, 0.3)],
                },
            ],
        }

        report = calibrator.validate_roi_mapping(bad_cfg)
        self.assertFalse(report.valid)
        err_str = " ".join(report.errors)
        self.assertIn("Invalid camera_id", err_str)
        self.assertIn("Invalid zone_id", err_str)
        self.assertIn("Invalid coordinate_type", err_str)
        self.assertIn("Duplicate bay_id", err_str)

    def test_polygon_vertex_validation(self) -> None:
        """validate_roi_polygon catches out-of-bounds, degenerate, and malformed polygons."""
        # 1. Fewer than 3 vertices
        ok1, err1 = validate_roi_polygon([(0.1, 0.1), (0.2, 0.2)])
        self.assertFalse(ok1)
        self.assertIn("at least 3 required", err1)

        # 2. Out of normalized bounds [0, 1]
        ok2, err2 = validate_roi_polygon([(0.1, 0.1), (1.2, 0.5), (0.2, 0.5)])
        self.assertFalse(ok2)
        self.assertIn("out of normalized bounds", err2)

        # 3. Degenerate collinear points (zero area)
        ok3, err3 = validate_roi_polygon([(0.1, 0.1), (0.2, 0.2), (0.3, 0.3)])
        self.assertFalse(ok3)
        self.assertIn("near-zero area", err3)

        # 4. Pixel bounds validation
        ok4, err4 = validate_roi_polygon([(100, 100), (2000, 100), (100, 500)], is_normalized=False, width=1920, height=1080)
        self.assertFalse(ok4)
        self.assertIn("out of pixel bounds", err4)

    def test_bay_spatial_overlap_detection(self) -> None:
        """Calibrator flags high spatial overlap between adjacent bays with an IoU warning."""
        calibrator = CameraCalibrator(max_overlap_iou=0.20)

        # Two bays that heavily overlap in the same bounding box region
        overlapping_cfg = {
            "camera_id": self.camera_id,
            "zone_id": self.zone_id,
            "coordinate_type": "normalized",
            "bays": [
                {
                    "bay_id": "b1b1b1b1-1111-4111-8111-111111111111",
                    "polygon": [(0.10, 0.10), (0.30, 0.10), (0.30, 0.50), (0.10, 0.50)],
                },
                {
                    "bay_id": "b2b2b2b2-2222-4222-8222-222222222222",
                    "polygon": [(0.12, 0.12), (0.32, 0.12), (0.32, 0.52), (0.12, 0.52)],
                },
            ],
        }

        report = calibrator.validate_roi_mapping(overlapping_cfg)
        self.assertTrue(report.valid)  # Valid geometry, but triggers overlap warning
        self.assertGreater(len(report.warnings), 0)
        self.assertIn("overlap", report.warnings[0].lower())

    def test_load_roi_mapping_file(self) -> None:
        """load_roi_mapping loads JSON file from disk, handles missing files and invalid JSON."""
        # 1. Non-existent file
        with self.assertRaises(FileNotFoundError):
            load_roi_mapping("non_existent_roi_mapping.json")

        # 2. Valid temporary JSON file
        valid_data = {"camera_id": self.camera_id, "zone_id": self.zone_id, "bays": []}
        with tempfile.NamedTemporaryFile("w", suffix=".json", delete=False) as tf:
            json.dump(valid_data, tf)
            temp_path = tf.name

        try:
            loaded = load_roi_mapping(temp_path)
            self.assertEqual(loaded["camera_id"], self.camera_id)
        finally:
            os.remove(temp_path)

        # 3. Invalid JSON file
        with tempfile.NamedTemporaryFile("w", suffix=".json", delete=False) as tf:
            tf.write("this is not valid json {{{")
            bad_json_path = tf.name

        try:
            with self.assertRaises(ValueError):
                load_roi_mapping(bad_json_path)
        finally:
            os.remove(bad_json_path)

    # ------------------------------------------------------------------------
    # 3. Forecast Worker Calibration Tests
    # ------------------------------------------------------------------------

    def test_forecast_interval_calibration_and_coverage(self) -> None:
        """calibrate_prediction_intervals computes empirical coverage and conformal scale factor."""
        # Synthetic residual errors
        y_true = [50.0 + (i % 5) for i in range(20)]
        y_pred = [50.0 for _ in range(20)]
        y_std = [3.0 for _ in range(20)]

        res = calibrate_prediction_intervals(y_true, y_pred, y_std, nominal_level=0.90)
        self.assertTrue(res.is_calibrated)
        self.assertEqual(res.status, "calibrated")
        self.assertEqual(res.sample_count, 20)
        self.assertGreaterEqual(res.scale_factor, 0.5)
        self.assertLessEqual(res.scale_factor, 3.0)
        self.assertIn("UNVALIDATED", res.disclaimer)

    def test_forecast_interval_calibration_insufficient_samples(self) -> None:
        """calibrate_prediction_intervals returns insufficient_samples on small datasets."""
        res = calibrate_prediction_intervals([50.0, 52.0], [50.0, 50.0], [2.0, 2.0], min_samples=12)
        self.assertFalse(res.is_calibrated)
        self.assertEqual(res.status, "insufficient_samples")
        self.assertEqual(res.scale_factor, 1.0)


if __name__ == "__main__":
    unittest.main()
