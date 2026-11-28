"""
Unit and Integration Tests for ParkSMART Edge AI Pipeline (Day 2 / M2 Ownership)

Verifies:
1. VideoCaptureSource: opening, reading, looping, resource cleanup, missing file handling.
2. YoloDetector: class verification (IDs 0, 2, 3, 5, 7), failure on mismatch, missing weights,
   NMS-free inference, privacy lock (no frames/crops to disk).
3. BayMapper: ROI loading, vehicle-to-bay spatial mapping, pedestrian exclusion, free bay confidence.
4. ObjectCounter: separate vehicle and pedestrian counts, COCO category mapping, density calculation.
5. TelemetryAggregator: OccupancyMessage, CrowdMessage, HealthMessage with provenance "observed".
6. Ingestion compatibility: all edge-generated payloads pass backend ingestion validator.
7. EdgeTelemetryPublisher: topic hierarchy, QoS 1, graceful shutdown.
8. End-to-end pipeline run on a recorded video stream.
"""

from __future__ import annotations

import asyncio
import sys
import unittest
from pathlib import Path
from typing import Any

# Ensure project root in sys.path
root_dir = Path(__file__).resolve().parent.parent.parent.parent
backend_dir = root_dir / "backend"
for p in (str(root_dir), str(backend_dir)):
    if p not in sys.path:
        sys.path.insert(0, p)

from edge.aggregator import TelemetryAggregator
from edge.bay_mapper import BayMapper, point_in_polygon
from edge.capture import VideoCaptureSource
from edge.config import EdgeConfig, MqttConfig
from edge.counter import ObjectCounter
from edge.detector import (
    Detection,
    YoloDetector,
    verify_model_classes,
)
from edge.publisher import EdgeTelemetryPublisher

from app.modules.ingestion import validator


class MockYoloResult:
    """Simulates Ultralytics inference result container."""

    def __init__(self, boxes: MockBoxes):
        self.boxes = boxes


class MockBoxes:
    """Simulates Ultralytics detection boxes."""

    def __init__(self, coords: list[list[float]], confs: list[float], clss: list[int]):
        import numpy as np
        self.xyxy = np.array(coords, dtype=float) if coords else np.empty((0, 4))
        self.conf = np.array(confs, dtype=float) if confs else np.empty((0,))
        self.cls = np.array(clss, dtype=float) if clss else np.empty((0,))


class MockYoloModel:
    """Mock YOLO model for testing without downloading real weights."""

    def __init__(self, names: dict[int, str] | None = None, return_detections: list[dict[str, Any]] | None = None):
        self.names = names or {
            0: "person",
            1: "bicycle",
            2: "car",
            3: "motorcycle",
            4: "airplane",
            5: "bus",
            6: "train",
            7: "truck",
        }
        self.return_detections = return_detections or []
        self.last_predict_kwargs: dict[str, Any] = {}

    def predict(self, **kwargs: Any) -> list[MockYoloResult]:
        self.last_predict_kwargs = kwargs
        # Ensure privacy locks are passed
        assert kwargs.get("save") is False, "Privacy violation: save must be False"
        assert kwargs.get("save_txt") is False, "Privacy violation: save_txt must be False"
        assert kwargs.get("save_crop") is False, "Privacy violation: save_crop must be False"
        assert "iou" not in kwargs, "YOLO26 must not rely on NMS/IoU parameter"

        coords = [d["box"] for d in self.return_detections]
        confs = [d["conf"] for d in self.return_detections]
        clss = [d["cls"] for d in self.return_detections]
        return [MockYoloResult(MockBoxes(coords, confs, clss))]


class TestEdgePipeline(unittest.TestCase):
    """Unit test suite for the ParkSMART Edge AI pipeline."""

    def setUp(self) -> None:
        self.camera_id = "c1a1a1a1-1111-4111-8111-111111111111"
        self.zone_id = "a1a1a1a1-1111-4111-8111-111111111111"
        self.roi_path = str(root_dir / "docs" / "contracts" / "roi_mapping.example.json")

    # ------------------------------------------------------------------------
    # 1. Video Capture Tests
    # ------------------------------------------------------------------------

    def test_capture_missing_file_raises_filenotfound(self) -> None:
        """VideoCaptureSource must raise FileNotFoundError if local file does not exist."""
        cap = VideoCaptureSource(source="/nonexistent/path/to/video.mp4")
        with self.assertRaises(FileNotFoundError) as ctx:
            cap.open()
        self.assertIn("Video source file not found", str(ctx.exception))

    def test_capture_custom_provider_and_release(self) -> None:
        """VideoCaptureSource safely yields frames and releases resources cleanly."""
        dummy_frames = [f"frame_{i}" for i in range(5)]
        cap = VideoCaptureSource(source="dummy", loop=False, target_fps=100.0)
        cap.set_custom_frame_provider(iter(dummy_frames))

        frames_read = []
        with cap:
            self.assertTrue(cap.is_opened())
            while True:
                success, frame, _idx = cap.read_frame()
                if not success:
                    break
                frames_read.append(frame)

        self.assertEqual(len(frames_read), 5)
        self.assertEqual(frames_read[0], "frame_0")
        self.assertFalse(cap.is_opened())

    # ------------------------------------------------------------------------
    # 2. Detector & Class Assertion Tests
    # ------------------------------------------------------------------------

    def test_verify_model_classes_success(self) -> None:
        """Class verification passes when IDs 0, 2, 3, 5, 7 match standard COCO names."""
        valid_names = {0: "person", 2: "car", 3: "motorcycle", 5: "bus", 7: "truck"}
        verify_model_classes(valid_names)

    def test_verify_model_classes_failure_person(self) -> None:
        """Class verification fails clearly if person class (0) is mismatched."""
        invalid_names = {0: "pedestrian", 2: "car", 3: "motorcycle", 5: "bus", 7: "truck"}
        with self.assertRaises(ValueError) as ctx:
            verify_model_classes(invalid_names)
        self.assertIn("Model class name mismatch for ID 0", str(ctx.exception))

    def test_verify_model_classes_failure_vehicle(self) -> None:
        """Class verification fails clearly if vehicle class (e.g. 2 car) is mismatched."""
        invalid_names = {0: "person", 2: "automobile", 3: "motorcycle", 5: "bus", 7: "truck"}
        with self.assertRaises(ValueError) as ctx:
            verify_model_classes(invalid_names)
        self.assertIn("Model class name mismatch for ID 2", str(ctx.exception))

    def test_detector_missing_weights_raises_filenotfound(self) -> None:
        """Detector raises FileNotFoundError if model weights do not exist under /models."""
        with self.assertRaises(FileNotFoundError) as ctx:
            YoloDetector(model_path="/models/missing_weights.pt")
        self.assertIn("Model weights not found", str(ctx.exception))

    def test_detector_inference_privacy_and_nms_free(self) -> None:
        """Detector inference enforces save=False, save_crop=False and no NMS parameter."""
        mock = MockYoloModel(return_detections=[
            {"box": [100, 100, 200, 200], "conf": 0.88, "cls": 2},  # car
            {"box": [300, 300, 350, 400], "conf": 0.75, "cls": 0},  # person
        ])
        det = YoloDetector(mock_model=mock)
        results = det.detect("dummy_frame")

        self.assertEqual(len(results), 2)
        self.assertEqual(results[0].class_name, "car")
        self.assertTrue(results[0].is_vehicle)
        self.assertEqual(results[1].class_name, "person")
        self.assertTrue(results[1].is_pedestrian)

        # Verify privacy kwargs
        kwargs = mock.last_predict_kwargs
        self.assertFalse(kwargs["save"])
        self.assertFalse(kwargs["save_txt"])
        self.assertFalse(kwargs["save_crop"])
        self.assertNotIn("iou", kwargs)

    # ------------------------------------------------------------------------
    # 3. Bay Mapper & Geometry Tests
    # ------------------------------------------------------------------------

    def test_point_in_polygon(self) -> None:
        """Point in polygon ray-casting correctly distinguishes interior and exterior points."""
        poly = [(0.0, 0.0), (10.0, 0.0), (10.0, 10.0), (0.0, 10.0)]
        self.assertTrue(point_in_polygon(5.0, 5.0, poly))
        self.assertFalse(point_in_polygon(15.0, 5.0, poly))
        self.assertFalse(point_in_polygon(-1.0, 5.0, poly))

    def test_bay_mapper_loads_roi_contract(self) -> None:
        """BayMapper successfully loads bays from roi_mapping.example.json."""
        mapper = BayMapper(roi_mapping_path=self.roi_path)
        self.assertEqual(len(mapper.bays), 4)
        self.assertEqual(mapper.camera_id, self.camera_id)
        self.assertEqual(mapper.zone_id, self.zone_id)

    def test_bay_mapper_occupancy_and_pedestrian_isolation(self) -> None:
        """
        BayMapper marks bays occupied only for vehicle detections.
        Pedestrian detections inside bay ROIs must NEVER mark a bay occupied.
        """
        mapper = BayMapper(roi_mapping_path=self.roi_path)

        # Bay A01 normalized bounds: [0.05, 0.40] to [0.20, 0.85]
        # In 1920x1080 resolution:
        # X: 96 to 384, Y: 432 to 918
        vehicle_in_bay1 = Detection(
            box=(150.0, 500.0, 300.0, 800.0),
            class_id=2,  # car
            class_name="car",
            confidence=0.92,
        )
        person_in_bay2 = Detection(
            box=(500.0, 500.0, 550.0, 650.0),  # inside Bay A02
            class_id=0,  # person
            class_name="person",
            confidence=0.85,
        )

        readings = mapper.map_detections([vehicle_in_bay1, person_in_bay2], frame_width=1920, frame_height=1080)
        readings_by_id = {r["bay_id"]: r for r in readings}

        # Bay A01 must be occupied
        bay1_id = "b1a1a1a1-1111-4111-8111-111111111111"
        self.assertEqual(readings_by_id[bay1_id]["state"], "occupied")
        self.assertAlmostEqual(readings_by_id[bay1_id]["confidence"], 0.92)

        # Bay A02 has only a person: must remain free!
        bay2_id = "b2a2a2a2-2222-4222-8222-222222222222"
        self.assertEqual(readings_by_id[bay2_id]["state"], "free")
        self.assertAlmostEqual(readings_by_id[bay2_id]["confidence"], 1.0)

    # ------------------------------------------------------------------------
    # 4. Object & Crowd Counter Tests
    # ------------------------------------------------------------------------

    def test_counter_preserves_vehicle_and_pedestrian_counts(self) -> None:
        """ObjectCounter preserves vehicle_count strictly separate from pedestrian_count."""
        counter = ObjectCounter(area_m2=100.0)
        detections = [
            Detection(box=(0, 0, 10, 10), class_id=2, class_name="car", confidence=0.9),
            Detection(box=(0, 0, 10, 10), class_id=2, class_name="car", confidence=0.8),
            Detection(box=(0, 0, 10, 10), class_id=3, class_name="motorcycle", confidence=0.85),
            Detection(box=(0, 0, 10, 10), class_id=5, class_name="bus", confidence=0.7),
            Detection(box=(0, 0, 10, 10), class_id=0, class_name="person", confidence=0.8),
            Detection(box=(0, 0, 10, 10), class_id=0, class_name="person", confidence=0.82),
            Detection(box=(0, 0, 10, 10), class_id=0, class_name="person", confidence=0.84),
        ]
        counts = counter.count(detections)
        self.assertEqual(counts.vehicle_count, 4)
        self.assertEqual(counts.pedestrian_count, 3)
        self.assertEqual(counts.vehicle_by_category["car"], 2)
        self.assertEqual(counts.vehicle_by_category["two_wheeler"], 1)
        self.assertEqual(counts.vehicle_by_category["bus"], 1)
        self.assertEqual(counts.vehicle_by_category["truck"], 0)
        self.assertEqual(counts.vehicle_by_category["van"], 0)
        self.assertAlmostEqual(counts.density_per_m2, 0.03)  # 3 pedestrians / 100 m2

    # ------------------------------------------------------------------------
    # 5. Telemetry Aggregator & Ingestion Compatibility Tests
    # ------------------------------------------------------------------------

    def test_aggregator_payload_contracts_and_provenance(self) -> None:
        """Aggregator builds schema-valid messages with provenance 'observed'."""
        agg = TelemetryAggregator(
            camera_id=self.camera_id,
            zone_id=self.zone_id,
            occupancy_interval_s=10,
            crowd_interval_s=60,
            health_interval_s=30,
        )

        bay_readings = [
            {"bay_id": "b1a1a1a1-1111-4111-8111-111111111111", "state": "occupied", "confidence": 0.95},
            {"bay_id": "b2a2a2a2-2222-4222-8222-222222222222", "state": "free", "confidence": 1.0},
        ]
        counter = ObjectCounter(area_m2=150.0)
        crowd = counter.count([
            Detection(box=(0, 0, 10, 10), class_id=2, class_name="car", confidence=0.9),
            Detection(box=(0, 0, 10, 10), class_id=0, class_name="person", confidence=0.8),
        ])

        agg.record_frame(bay_readings, crowd, frame_idx=1)

        # 1. Occupancy Payload
        occ = agg.build_occupancy_payload()
        self.assertEqual(occ["schema_version"], 1)
        self.assertEqual(occ["provenance"], "observed")
        self.assertEqual(occ["camera_id"], self.camera_id)
        self.assertEqual(len(occ["bays"]), 2)

        # 2. Crowd Payload
        crowd_msg = agg.build_crowd_payload()
        self.assertEqual(crowd_msg["schema_version"], 1)
        self.assertEqual(crowd_msg["provenance"], "observed")
        self.assertEqual(crowd_msg["vehicle_count"], 1)
        self.assertEqual(crowd_msg["pedestrian_count"], 1)
        self.assertEqual(crowd_msg["interval_s"], 60)

        # 3. Health Payload
        health_msg = agg.build_health_payload(state="online")
        self.assertEqual(health_msg["schema_version"], 1)
        self.assertEqual(health_msg["provenance"], "observed")
        self.assertEqual(health_msg["state"], "online")

        # 4. Ingestion Envelope Validation
        # Verify edge payloads pass the backend's validate_envelope
        validator.validate_envelope(occ)
        validator.validate_envelope(crowd_msg)
        validator.validate_envelope(health_msg)

    # ------------------------------------------------------------------------
    # 6. Publisher Topic Hierarchy & QoS Tests
    # ------------------------------------------------------------------------

    def test_publisher_topic_formatting_and_qos1(self) -> None:
        """Publisher configures QoS 1 and topics matching parksmart/{zone_id}/{camera_id}/*."""
        config = MqttConfig(broker_host="localhost", broker_port=8883, qos=1)
        pub = EdgeTelemetryPublisher(
            config=config,
            camera_id=self.camera_id,
            zone_id=self.zone_id,
            dry_run=True,
        )

        self.assertEqual(
            pub.occupancy_topic,
            f"parksmart/{self.zone_id}/{self.camera_id}/occupancy",
        )
        self.assertEqual(
            pub.crowd_topic,
            f"parksmart/{self.zone_id}/{self.camera_id}/crowd",
        )
        self.assertEqual(
            pub.health_topic,
            f"parksmart/{self.zone_id}/{self.camera_id}/health",
        )
        self.assertEqual(pub.config.qos, 1)

    # ------------------------------------------------------------------------
    # 7. End-to-End Edge Pipeline Execution Test
    # ------------------------------------------------------------------------

    def test_end_to_end_edge_pipeline_recorded_frames(self) -> None:
        """Runs the entire edge pipeline for 3 frames using a mock detector and dry-run publisher."""
        cfg = EdgeConfig.load()
        cfg.camera_id = self.camera_id
        cfg.zone_id = self.zone_id
        cfg.roi.roi_file = self.roi_path
        cfg.aggregator.occupancy_interval_s = 0  # Force immediate publish
        cfg.aggregator.crowd_interval_s = 0
        cfg.aggregator.health_interval_s = 0

        # Mock detector returning 1 vehicle and 1 pedestrian
        mock_model = MockYoloModel(return_detections=[
            {"box": [150.0, 500.0, 300.0, 800.0], "conf": 0.94, "cls": 2},  # car in Bay A01
            {"box": [800.0, 200.0, 850.0, 300.0], "conf": 0.82, "cls": 0},  # pedestrian outside bays
        ])

        # Create dummy synthetic video frames
        import numpy as np
        synthetic_frames = [np.zeros((1080, 1920, 3), dtype=np.uint8) for _ in range(3)]

        # Custom pipeline runner with injected custom frame provider
        async def run_test() -> None:
            capture = VideoCaptureSource(source="test_video.mp4", loop=False, target_fps=100.0)
            capture.set_custom_frame_provider(iter(synthetic_frames))

            detector = YoloDetector(mock_model=mock_model)
            mapper = BayMapper(roi_mapping_path=self.roi_path)
            counter = ObjectCounter(area_m2=150.0)
            aggregator = TelemetryAggregator(
                camera_id=self.camera_id,
                zone_id=self.zone_id,
                occupancy_interval_s=0,
                crowd_interval_s=0,
                health_interval_s=0,
            )
            publisher = EdgeTelemetryPublisher(
                config=cfg.mqtt,
                camera_id=self.camera_id,
                zone_id=self.zone_id,
                dry_run=True,
            )

            await publisher.start()
            for frame, idx in capture.frames():
                detections = detector.detect(frame)
                bay_readings = mapper.map_detections(detections, 1920, 1080)
                crowd_counts = counter.count(detections)
                aggregator.record_frame(bay_readings, crowd_counts, idx)

                if aggregator.should_publish_occupancy():
                    await publisher.publish_occupancy(aggregator.build_occupancy_payload())
                if aggregator.should_publish_crowd():
                    await publisher.publish_crowd(aggregator.build_crowd_payload())
                if aggregator.should_publish_health():
                    await publisher.publish_health(aggregator.build_health_payload())

            await publisher.stop()
            capture.release()

            # Assert published messages
            pub_msgs = publisher._published_messages
            self.assertGreater(len(pub_msgs), 0)

            # Check that occupancy message recorded Bay A01 as occupied
            occ_msgs = [m["payload"] for m in pub_msgs if "occupancy" in m["topic"]]
            self.assertGreater(len(occ_msgs), 0)
            latest_occ = occ_msgs[-1]
            bay_map = {b["bay_id"]: b["state"] for b in latest_occ["bays"]}
            self.assertEqual(bay_map["b1a1a1a1-1111-4111-8111-111111111111"], "occupied")
            self.assertEqual(bay_map["b2a2a2a2-2222-4222-8222-222222222222"], "free")
            self.assertEqual(latest_occ["provenance"], "observed")

            # Check crowd message
            crowd_msgs = [m["payload"] for m in pub_msgs if "crowd" in m["topic"]]
            self.assertGreater(len(crowd_msgs), 0)
            latest_crowd = crowd_msgs[-1]
            self.assertEqual(latest_crowd["vehicle_count"], 1)
            self.assertEqual(latest_crowd["pedestrian_count"], 1)
            self.assertEqual(latest_crowd["vehicle_by_category"]["car"], 1)
            self.assertEqual(latest_crowd["provenance"], "observed")

        asyncio.run(run_test())


if __name__ == "__main__":
    unittest.main()
