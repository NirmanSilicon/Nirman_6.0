"""
Unit tests for backend/app/modules/ingestion/validator.py (File 201)
Tests database-aware and clock-aware ingestion validation rules, envelope integrity,
and error formatting.
"""

from __future__ import annotations

import asyncio
import sys
import unittest
import uuid
from dataclasses import dataclass, field
from datetime import UTC, datetime, timedelta
from pathlib import Path

# Ensure backend directory is in sys.path
backend_dir = Path(__file__).resolve().parent.parent.parent
if str(backend_dir) not in sys.path:
    sys.path.insert(0, str(backend_dir))

from app.modules.ingestion import repository as repo
from app.modules.ingestion.validator import (
    IngestRejected,
    ValidatedOccupancy,
    parse_utc_timestamp,
    validate_crowd,
    validate_envelope,
    validate_health,
    validate_occupancy,
)


@dataclass
class MockCamera:
    """In-memory mock for Camera model (constructed in-memory per File 201)."""

    id: uuid.UUID = field(default_factory=uuid.uuid4)
    zone_id: uuid.UUID = field(default_factory=uuid.uuid4)
    name: str = "SIM-camera-1"
    is_active: bool = True
    config: dict = field(
        default_factory=lambda: {
            "conf_threshold": 0.50,
            "interval_s": 300,
            "area_m2": 500.0,
        }
    )


@dataclass
class MockSettings:
    """In-memory settings mock."""

    max_future_skew_s: int = 30
    agg_interval_min: int = 15


class TestIngestionValidator(unittest.TestCase):
    def setUp(self):
        self.camera = MockCamera()
        self.settings = MockSettings()
        self.now = datetime(2026, 11, 24, 12, 0, 0, tzinfo=UTC)
        self.bay_id_1 = uuid.uuid4()
        self.bay_id_2 = uuid.uuid4()
        self.mapped_bays = {self.bay_id_1, self.bay_id_2}

        # Monkeypatch get_camera_bay_ids on repository per File 201 specification
        async def fake_get_camera_bay_ids(db, camera_id):
            return self.mapped_bays

        self._orig_get_camera_bay_ids = repo.get_camera_bay_ids
        repo.get_camera_bay_ids = fake_get_camera_bay_ids

    def tearDown(self):
        repo.get_camera_bay_ids = self._orig_get_camera_bay_ids

    def run_async(self, coro):
        loop = asyncio.new_event_loop()
        try:
            return loop.run_until_complete(coro)
        finally:
            loop.close()

    # ========================================================================
    # Clock Skew & Timestamp Tests
    # ========================================================================

    def test_future_timestamp_rejected(self):
        """ts = now + 31 s rejected beyond MAX_FUTURE_SKEW_S (30s)."""
        future_ts = (self.now + timedelta(seconds=31)).strftime("%Y-%m-%dT%H:%M:%SZ")
        payload = {
            "schema_version": 1,
            "msg_id": str(uuid.uuid4()),
            "camera_id": str(self.camera.id),
            "ts": future_ts,
            "bays": [{"bay_id": str(self.bay_id_1), "state": "occupied", "confidence": 0.9}],
        }
        with self.assertRaises(IngestRejected) as ctx:
            self.run_async(
                validate_occupancy(
                    None, self.camera, None, payload, settings=self.settings, now=self.now
                )
            )
        self.assertEqual(ctx.exception.reason, "future_timestamp")
        self.assertGreater(ctx.exception.details["skew_s"], 30.0)

    def test_timestamp_at_skew_boundary_accepted(self):
        """ts = now + 30 s exactly at boundary accepted."""
        boundary_ts = (self.now + timedelta(seconds=30)).strftime("%Y-%m-%dT%H:%M:%SZ")
        payload = {
            "schema_version": 1,
            "msg_id": str(uuid.uuid4()),
            "camera_id": str(self.camera.id),
            "ts": boundary_ts,
            "bays": [{"bay_id": str(self.bay_id_1), "state": "occupied", "confidence": 0.9}],
        }
        res = self.run_async(
            validate_occupancy(
                None, self.camera, None, payload, settings=self.settings, now=self.now
            )
        )
        self.assertIsInstance(res, ValidatedOccupancy)
        self.assertEqual(res.observed_at, self.now + timedelta(seconds=30))

    def test_invalid_timestamps_rejected(self):
        """Malformed or timezone-naive timestamps rejected."""
        # Naive string without Z
        with self.assertRaises(IngestRejected) as ctx1:
            parse_utc_timestamp("2026-11-24T12:00:00")
        self.assertEqual(ctx1.exception.reason, "invalid_payload")

        # Completely invalid format
        with self.assertRaises(IngestRejected) as ctx2:
            parse_utc_timestamp("not-a-timestamp")
        self.assertEqual(ctx2.exception.reason, "invalid_payload")

        # Naive datetime
        with self.assertRaises(IngestRejected) as ctx3:
            parse_utc_timestamp(datetime(2026, 11, 24, 12, 0, 0))
        self.assertEqual(ctx3.exception.reason, "invalid_payload")

    # ========================================================================
    # Camera & Topic Mismatch Tests
    # ========================================================================

    def test_camera_mismatch_rejected(self):
        """msg.camera_id != camera.id raises camera_mismatch."""
        payload = {
            "schema_version": 1,
            "msg_id": str(uuid.uuid4()),
            "camera_id": str(uuid.uuid4()),  # Different camera
            "ts": self.now.strftime("%Y-%m-%dT%H:%M:%SZ"),
            "bays": [{"bay_id": str(self.bay_id_1), "state": "occupied", "confidence": 0.9}],
        }
        with self.assertRaises(IngestRejected) as ctx:
            self.run_async(
                validate_occupancy(
                    None, self.camera, None, payload, settings=self.settings, now=self.now
                )
            )
        self.assertEqual(ctx.exception.reason, "camera_mismatch")

    def test_zone_mismatch_rejected(self):
        """topic_zone != camera.zone_id raises zone_mismatch."""
        payload = {
            "schema_version": 1,
            "msg_id": str(uuid.uuid4()),
            "camera_id": str(self.camera.id),
            "ts": self.now.strftime("%Y-%m-%dT%H:%M:%SZ"),
            "bays": [{"bay_id": str(self.bay_id_1), "state": "occupied", "confidence": 0.9}],
        }
        other_zone = uuid.uuid4()
        with self.assertRaises(IngestRejected) as ctx:
            self.run_async(
                validate_occupancy(
                    None,
                    self.camera,
                    topic_zone=other_zone,
                    msg=payload,
                    settings=self.settings,
                    now=self.now,
                )
            )
        self.assertEqual(ctx.exception.reason, "zone_mismatch")

    def test_inactive_camera_rejected(self):
        """Inactive camera raises inactive_camera."""
        self.camera.is_active = False
        payload = {
            "schema_version": 1,
            "msg_id": str(uuid.uuid4()),
            "camera_id": str(self.camera.id),
            "ts": self.now.strftime("%Y-%m-%dT%H:%M:%SZ"),
            "bays": [{"bay_id": str(self.bay_id_1), "state": "occupied", "confidence": 0.9}],
        }
        with self.assertRaises(IngestRejected) as ctx:
            self.run_async(
                validate_occupancy(
                    None, self.camera, None, payload, settings=self.settings, now=self.now
                )
            )
        self.assertEqual(ctx.exception.reason, "inactive_camera")

    # ========================================================================
    # Bay Mapping & Confidence Tests
    # ========================================================================

    def test_unmapped_bay_rejects_whole_message(self):
        """Unmapped bay in payload rejects entire message (unmapped_bay)."""
        unmapped_bay = uuid.uuid4()
        payload = {
            "schema_version": 1,
            "msg_id": str(uuid.uuid4()),
            "camera_id": str(self.camera.id),
            "ts": self.now.strftime("%Y-%m-%dT%H:%M:%SZ"),
            "bays": [
                {"bay_id": str(self.bay_id_1), "state": "occupied", "confidence": 0.95},
                {"bay_id": str(unmapped_bay), "state": "free", "confidence": 0.90},
            ],
        }
        with self.assertRaises(IngestRejected) as ctx:
            self.run_async(
                validate_occupancy(
                    None, self.camera, None, payload, settings=self.settings, now=self.now
                )
            )
        self.assertEqual(ctx.exception.reason, "unmapped_bay")
        self.assertEqual(ctx.exception.details["bay_id"], str(unmapped_bay))

    def test_low_confidence_becomes_unknown(self):
        """Reading with confidence 0.49 and threshold 0.50 becomes state 'unknown'."""
        self.camera.config["conf_threshold"] = 0.50
        payload = {
            "schema_version": 1,
            "msg_id": str(uuid.uuid4()),
            "camera_id": str(self.camera.id),
            "ts": self.now.strftime("%Y-%m-%dT%H:%M:%SZ"),
            "bays": [{"bay_id": str(self.bay_id_1), "state": "occupied", "confidence": 0.49}],
        }
        res = self.run_async(
            validate_occupancy(
                None, self.camera, None, payload, settings=self.settings, now=self.now
            )
        )
        self.assertEqual(len(res.readings), 1)
        bid, final_state, conf = res.readings[0]
        self.assertEqual(bid, self.bay_id_1)
        self.assertEqual(final_state, "unknown")
        self.assertEqual(conf, 0.49)

    def test_confidence_at_threshold_stays_state(self):
        """Reading with confidence 0.50 exactly at threshold 0.50 keeps 'occupied'."""
        self.camera.config["conf_threshold"] = 0.50
        payload = {
            "schema_version": 1,
            "msg_id": str(uuid.uuid4()),
            "camera_id": str(self.camera.id),
            "ts": self.now.strftime("%Y-%m-%dT%H:%M:%SZ"),
            "bays": [{"bay_id": str(self.bay_id_1), "state": "occupied", "confidence": 0.50}],
        }
        res = self.run_async(
            validate_occupancy(
                None, self.camera, None, payload, settings=self.settings, now=self.now
            )
        )
        _bid, final_state, conf = res.readings[0]
        self.assertEqual(final_state, "occupied")
        self.assertEqual(conf, 0.50)

    # ========================================================================
    # Envelope & Malformed Input Tests
    # ========================================================================

    def test_missing_required_fields_rejected(self):
        """Missing required envelope fields raise invalid_payload."""
        valid_base = {
            "schema_version": 1,
            "msg_id": str(uuid.uuid4()),
            "camera_id": str(self.camera.id),
            "ts": self.now.strftime("%Y-%m-%dT%H:%M:%SZ"),
            "bays": [{"bay_id": str(self.bay_id_1), "state": "occupied", "confidence": 0.9}],
        }

        # Missing schema_version
        p1 = dict(valid_base)
        del p1["schema_version"]
        with self.assertRaises(IngestRejected):
            validate_envelope(p1)

        # Missing msg_id
        p2 = dict(valid_base)
        del p2["msg_id"]
        with self.assertRaises(IngestRejected):
            validate_envelope(p2)

        # Missing camera_id
        p3 = dict(valid_base)
        del p3["camera_id"]
        with self.assertRaises(IngestRejected):
            validate_envelope(p3)

        # Missing ts
        p4 = dict(valid_base)
        del p4["ts"]
        with self.assertRaises(IngestRejected):
            validate_envelope(p4)

    def test_malformed_uuids_rejected(self):
        """Malformed UUID strings raise invalid_payload."""
        p_bad_msg = {
            "schema_version": 1,
            "msg_id": "not-a-valid-uuid",
            "camera_id": str(self.camera.id),
            "ts": self.now.strftime("%Y-%m-%dT%H:%M:%SZ"),
        }
        with self.assertRaises(IngestRejected):
            validate_envelope(p_bad_msg)

        p_bad_cam = {
            "schema_version": 1,
            "msg_id": str(uuid.uuid4()),
            "camera_id": "not-a-valid-uuid",
            "ts": self.now.strftime("%Y-%m-%dT%H:%M:%SZ"),
        }
        with self.assertRaises(IngestRejected):
            validate_envelope(p_bad_cam)

    def test_duplicate_bay_ids_rejected(self):
        """Duplicate bay_id entries in bays list raise invalid_payload."""
        payload = {
            "schema_version": 1,
            "msg_id": str(uuid.uuid4()),
            "camera_id": str(self.camera.id),
            "ts": self.now.strftime("%Y-%m-%dT%H:%M:%SZ"),
            "bays": [
                {"bay_id": str(self.bay_id_1), "state": "occupied", "confidence": 0.9},
                {"bay_id": str(self.bay_id_1), "state": "free", "confidence": 0.8},
            ],
        }
        with self.assertRaises(IngestRejected) as ctx:
            self.run_async(
                validate_occupancy(
                    None, self.camera, None, payload, settings=self.settings, now=self.now
                )
            )
        self.assertEqual(ctx.exception.reason, "invalid_payload")
        self.assertIn("Duplicate", ctx.exception.details["message"])

    # ========================================================================
    # Crowd & Health Validation Tests
    # ========================================================================

    def test_crowd_interval_must_divide_aggregation_interval(self):
        """interval_s=300 divides 900s (accepted); interval_s=7 does not (bad_interval)."""
        valid_crowd = {
            "schema_version": 1,
            "msg_id": str(uuid.uuid4()),
            "camera_id": str(self.camera.id),
            "ts": self.now.strftime("%Y-%m-%dT%H:%M:%SZ"),
            "interval_s": 300,
            "vehicle_count": 10,
            "vehicle_by_category": {"car": 8, "two_wheeler": 2},
            "pedestrian_count": 15,
            "quality": "ok",
        }
        res = self.run_async(
            validate_crowd(
                None, self.camera, None, valid_crowd, settings=self.settings, now=self.now
            )
        )
        self.assertEqual(res["interval_s"], 300)

        # 7 seconds does not divide 900
        bad_crowd = dict(valid_crowd)
        bad_crowd["interval_s"] = 7
        with self.assertRaises(IngestRejected) as ctx:
            self.run_async(
                validate_crowd(
                    None, self.camera, None, bad_crowd, settings=self.settings, now=self.now
                )
            )
        self.assertEqual(ctx.exception.reason, "bad_interval")

    def test_crowd_category_sum_over_total_rejected(self):
        """sum(vehicle_by_category) > vehicle_count raises bad_counts."""
        bad_crowd = {
            "schema_version": 1,
            "msg_id": str(uuid.uuid4()),
            "camera_id": str(self.camera.id),
            "ts": self.now.strftime("%Y-%m-%dT%H:%M:%SZ"),
            "interval_s": 300,
            "vehicle_count": 10,
            "vehicle_by_category": {"car": 8, "two_wheeler": 5},  # sum = 13 > 10
            "pedestrian_count": 15,
            "quality": "ok",
        }
        with self.assertRaises(IngestRejected) as ctx:
            self.run_async(
                validate_crowd(
                    None, self.camera, None, bad_crowd, settings=self.settings, now=self.now
                )
            )
        self.assertEqual(ctx.exception.reason, "bad_counts")

    def test_density_dropped_without_area(self):
        """density_per_m2 dropped to None if camera lacks area_m2."""
        self.camera.config["area_m2"] = None
        crowd_payload = {
            "schema_version": 1,
            "msg_id": str(uuid.uuid4()),
            "camera_id": str(self.camera.id),
            "ts": self.now.strftime("%Y-%m-%dT%H:%M:%SZ"),
            "interval_s": 300,
            "vehicle_count": 10,
            "vehicle_by_category": {"car": 8, "two_wheeler": 2},
            "pedestrian_count": 15,
            "density_per_m2": 0.25,
            "quality": "ok",
        }
        res = self.run_async(
            validate_crowd(
                None, self.camera, None, crowd_payload, settings=self.settings, now=self.now
            )
        )
        self.assertIsNone(res["density_per_m2"])

    def test_health_validation_and_future_timestamp(self):
        """Health message validated, future timestamp rejected."""
        valid_health = {
            "schema_version": 1,
            "msg_id": str(uuid.uuid4()),
            "camera_id": str(self.camera.id),
            "ts": self.now.strftime("%Y-%m-%dT%H:%M:%SZ"),
            "state": "online",
            "fps": 15.0,
            "errors": [],
        }
        res = validate_health(
            self.camera, None, valid_health, settings=self.settings, now=self.now
        )
        self.assertEqual(res["state"], "online")

        # Future timestamp in health
        future_health = dict(valid_health)
        future_health["ts"] = (self.now + timedelta(seconds=45)).strftime("%Y-%m-%dT%H:%M:%SZ")
        with self.assertRaises(IngestRejected) as ctx:
            validate_health(
                self.camera, None, future_health, settings=self.settings, now=self.now
            )
        self.assertEqual(ctx.exception.reason, "future_timestamp")

    def test_boolean_values_rejected_for_integers(self):
        """Python booleans (True/False) must be rejected for schema_version and counts."""
        # 1. schema_version = True
        payload_bool_schema = {
            "schema_version": True,
            "msg_id": str(uuid.uuid4()),
            "camera_id": str(self.camera.id),
            "ts": self.now.strftime("%Y-%m-%dT%H:%M:%SZ"),
        }
        with self.assertRaises(IngestRejected) as ctx:
            validate_envelope(payload_bool_schema)
        self.assertEqual(ctx.exception.reason, "invalid_payload")
        self.assertEqual(ctx.exception.details["field"], "schema_version")

        # 2. confidence = True
        payload_bool_conf = {
            "schema_version": 1,
            "msg_id": str(uuid.uuid4()),
            "camera_id": str(self.camera.id),
            "ts": self.now.strftime("%Y-%m-%dT%H:%M:%SZ"),
            "bays": [{"bay_id": str(self.bay_id_1), "state": "occupied", "confidence": True}],
        }
        with self.assertRaises(IngestRejected) as ctx:
            self.run_async(validate_occupancy(None, self.camera, None, payload_bool_conf, settings=self.settings, now=self.now))
        self.assertEqual(ctx.exception.reason, "invalid_payload")
        self.assertIn("confidence", ctx.exception.details["field"])

        # 3. vehicle_count = True
        payload_bool_count = {
            "schema_version": 1,
            "msg_id": str(uuid.uuid4()),
            "camera_id": str(self.camera.id),
            "ts": self.now.strftime("%Y-%m-%dT%H:%M:%SZ"),
            "interval_s": 300,
            "vehicle_count": True,
            "pedestrian_count": 0,
            "vehicle_by_category": {},
        }
        with self.assertRaises(IngestRejected) as ctx:
            self.run_async(validate_crowd(None, self.camera, None, payload_bool_count, settings=self.settings, now=self.now))
        self.assertEqual(ctx.exception.reason, "invalid_payload")
        self.assertEqual(ctx.exception.details["field"], "vehicle_count")

    def test_error_envelope_formatting(self):
        """Verify IngestRejected produces valid API error envelope."""
        err = IngestRejected("future_timestamp", {"observed_at": "...", "skew_s": 45.0})
        envelope = err.to_error_envelope(request_id="req-test-123")
        self.assertIn("error", envelope)
        self.assertEqual(envelope["error"]["code"], "VALIDATION_ERROR")
        self.assertEqual(envelope["error"]["request_id"], "req-test-123")
        self.assertEqual(envelope["error"]["details"]["reason"], "future_timestamp")


if __name__ == "__main__":
    unittest.main()
