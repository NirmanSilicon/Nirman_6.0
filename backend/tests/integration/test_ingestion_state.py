"""
Integration tests for ParkSMART Simulator to Backend Ingestion Pipeline (File 205)
Verifies:
- Simulator payload generation and MQTT topic contract: parksmart/{zone_id}/{camera_id}/occupancy
- Ingestion consumer message processing, validation, deduplication, and state application
- Rejection of future timestamps (> 30s) and malformed payloads
- Protection against out-of-order stale updates overwriting newer state
- Failure handling and logging resilience
- Privacy preservation: zero camera frames or detection crops written to disk
"""

from __future__ import annotations

import asyncio
import glob
import json
import sys
import unittest
import uuid
from dataclasses import dataclass, field
from datetime import UTC, datetime, timedelta
from pathlib import Path
from typing import Any

# Ensure backend and root directory in sys.path
backend_dir = Path(__file__).resolve().parent.parent.parent
root_dir = backend_dir.parent
for p in (str(backend_dir), str(root_dir)):
    if p not in sys.path:
        sys.path.insert(0, p)

from simulator.profiles import generate_occupancy_message

from app.modules.ingestion import dedup
from app.modules.ingestion import repository as repo
from app.modules.ingestion.mqtt_consumer import MqttConsumer


class IntegrationMockDatabase:
    """
    Simulates database persistence for integration tests:
    - Camera registry
    - Bay mapping set
    - current_bay_status table
    - occupancy_event table
    - occupancy_history table
    """

    def __init__(self, camera: Any, mapped_bays: set[uuid.UUID]):
        self.camera = camera
        self.mapped_bays = mapped_bays
        self.events: dict[tuple[uuid.UUID, uuid.UUID], int] = {}
        self.status: dict[uuid.UUID, tuple[str, datetime | None, int | None]] = {
            bid: ("unknown", None, None) for bid in mapped_bays
        }
        self.history: dict[uuid.UUID, list[list]] = {bid: [] for bid in mapped_bays}
        self.unapplied_events: set[int] = set()
        self.event_counter = 1

    async def get_camera(self, camera_id: uuid.UUID) -> Any | None:
        if self.camera and uuid.UUID(str(self.camera.id)) == camera_id:
            return self.camera
        return None

    async def get_camera_bay_ids(self, camera_id: uuid.UUID) -> set[uuid.UUID]:
        return self.mapped_bays

    async def lock_status_rows(self, bay_ids: list[uuid.UUID]) -> dict[uuid.UUID, tuple[str, datetime | None]]:
        return {bid: (self.status[bid][0], self.status[bid][1]) for bid in bay_ids if bid in self.status}

    async def insert_event(
        self,
        *,
        msg_id: uuid.UUID,
        bay_id: uuid.UUID,
        camera_id: uuid.UUID | None,
        state: str,
        confidence: float | None,
        observed_at: datetime,
        source: str,
        applied: bool,
        schema_version: int = 1,
    ) -> int | None:
        key = (msg_id, bay_id)
        if key in self.events:
            return None  # ON CONFLICT DO NOTHING
        eid = self.event_counter
        self.event_counter += 1
        self.events[key] = eid
        return eid

    async def upsert_status(
        self,
        *,
        bay_id: uuid.UUID,
        occupancy: str,
        observed_at: datetime,
        event_id: int | None,
        source: str,
    ) -> bool:
        stored = self.status.get(bay_id)
        if stored is not None and stored[1] is not None and observed_at <= stored[1]:
            return False
        self.status[bay_id] = (occupancy, observed_at, event_id)
        return True

    async def get_open_history_state(self, bay_id: uuid.UUID) -> str | None:
        intervals = self.history.get(bay_id, [])
        for state, from_ts, to_ts in intervals:
            if to_ts is None:
                return state
        return None

    async def close_open_history(self, bay_id: uuid.UUID, to_ts: datetime) -> None:
        intervals = self.history.get(bay_id, [])
        for item in intervals:
            if item[2] is None and to_ts > item[1]:
                item[2] = to_ts

    async def open_history(self, bay_id: uuid.UUID, state: str, from_ts: datetime) -> None:
        self.history.setdefault(bay_id, []).append([state, from_ts, None])

    async def set_camera_state(self, camera_id: uuid.UUID, status: str, last_seen_at: datetime) -> None:
        if self.camera:
            self.camera.status = status
            self.camera.last_seen_at = last_seen_at

    async def insert_device_health_event(self, *args, **kwargs) -> None:
        pass

    async def mark_event_unapplied(self, event_id: int | None) -> None:
        if event_id is not None:
            self.unapplied_events.add(event_id)


@dataclass
class MockCamera:
    id: uuid.UUID = field(default_factory=uuid.uuid4)
    zone_id: uuid.UUID = field(default_factory=uuid.uuid4)
    name: str = "SIM-camera-1"
    status: str = "online"
    is_active: bool = True
    last_seen_at: datetime | None = None
    config: dict = field(
        default_factory=lambda: {
            "conf_threshold": 0.50,
            "interval_s": 10,
            "area_m2": 500.0,
        }
    )


class TestIngestionPipelineIntegration(unittest.TestCase):
    def setUp(self):
        dedup.cache.clear()
        self.zone_id = uuid.uuid4()
        self.camera_id = uuid.uuid4()
        self.camera = MockCamera(id=self.camera_id, zone_id=self.zone_id)

        self.bay_1 = uuid.uuid4()
        self.bay_2 = uuid.uuid4()
        self.mapped_bays = {self.bay_1, self.bay_2}
        self.db = IntegrationMockDatabase(self.camera, self.mapped_bays)
        self.now = datetime(2026, 11, 24, 12, 0, 0, tzinfo=UTC)

        # Wire repository calls to IntegrationMockDatabase
        self._orig_get_camera = repo.get_camera
        self._orig_get_camera_bay_ids = repo.get_camera_bay_ids
        self._orig_lock = repo.lock_status_rows
        self._orig_insert = repo.insert_event
        self._orig_upsert = repo.upsert_status
        self._orig_get_open = repo.get_open_history_state
        self._orig_close_open = repo.close_open_history
        self._orig_open = repo.open_history
        self._orig_set_cam = repo.set_camera_state
        self._orig_unapply = getattr(repo, "mark_event_unapplied", None)

        async def wrap_get_camera(db, cid):
            return await self.db.get_camera(cid)

        async def wrap_get_camera_bay_ids(db, cid):
            return await self.db.get_camera_bay_ids(cid)

        async def wrap_lock(db, bay_ids):
            return await self.db.lock_status_rows(bay_ids)

        async def wrap_insert(db, **kwargs):
            return await self.db.insert_event(**kwargs)

        async def wrap_upsert(db, **kwargs):
            return await self.db.upsert_status(**kwargs)

        async def wrap_get_open(db, bay_id):
            return await self.db.get_open_history_state(bay_id)

        async def wrap_close_open(db, bay_id, to_ts):
            return await self.db.close_open_history(bay_id, to_ts)

        async def wrap_open(db, bay_id, state, from_ts):
            return await self.db.open_history(bay_id, state, from_ts)

        async def wrap_set_cam(db, cid, status, ts):
            return await self.db.set_camera_state(cid, status, ts)

        async def wrap_unapply(db, eid):
            return await self.db.mark_event_unapplied(eid)

        repo.get_camera = wrap_get_camera
        repo.get_camera_bay_ids = wrap_get_camera_bay_ids
        repo.lock_status_rows = wrap_lock
        repo.insert_event = wrap_insert
        repo.upsert_status = wrap_upsert
        repo.get_open_history_state = wrap_get_open
        repo.close_open_history = wrap_close_open
        repo.open_history = wrap_open
        repo.set_camera_state = wrap_set_cam
        repo.mark_event_unapplied = wrap_unapply

        self.consumer = MqttConsumer(session_factory=lambda: self.db)

    def tearDown(self):
        repo.get_camera = self._orig_get_camera
        repo.get_camera_bay_ids = self._orig_get_camera_bay_ids
        repo.lock_status_rows = self._orig_lock
        repo.insert_event = self._orig_insert
        repo.upsert_status = self._orig_upsert
        repo.get_open_history_state = self._orig_get_open
        repo.close_open_history = self._orig_close_open
        repo.open_history = self._orig_open
        repo.set_camera_state = self._orig_set_cam
        if self._orig_unapply:
            repo.mark_event_unapplied = self._orig_unapply

    def run_async(self, coro):
        return asyncio.run(coro)

    def test_end_to_end_simulator_to_ingestion(self):
        """
        End-to-End: Simulator generates occupancy payload -> published topic
        parksmart/{zone_id}/{camera_id}/occupancy -> Ingestion consumer processes,
        validates, updates current_bay_status, and opens history.
        """
        # 1. Simulator generates payload
        bay_states = {self.bay_1: "occupied", self.bay_2: "free"}
        msg = generate_occupancy_message(
            camera_id=self.camera_id,
            bay_states=bay_states,
            ts=self.now,
            confidence=0.96,
        )
        payload_str = json.dumps(msg)

        # 2. Topic adhering to contract
        topic = f"parksmart/{self.zone_id}/{self.camera_id}/occupancy"

        # 3. Process through Ingestion Consumer
        result = self.run_async(self.consumer.process_message(topic, payload_str, now=self.now))

        self.assertIsNotNone(result)
        self.assertTrue(result.accepted)
        self.assertFalse(result.duplicate)
        self.assertEqual(result.applied_bays, 2)
        self.assertEqual(self.consumer.stats["received"], 1)
        self.assertEqual(self.consumer.stats["accepted"], 1)

        # 4. Verify database state
        self.assertEqual(self.db.status[self.bay_1][0], "occupied")
        self.assertEqual(self.db.status[self.bay_2][0], "free")
        self.assertEqual(len(self.db.events), 2)
        # History opened for occupied bay
        open_state = self.run_async(self.db.get_open_history_state(self.bay_1))
        self.assertEqual(open_state, "occupied")

    def test_duplicate_msg_id_suppression(self):
        """Duplicate message delivery with identical msg_id does not apply changes twice."""
        msg = generate_occupancy_message(
            camera_id=self.camera_id,
            bay_states={self.bay_1: "occupied"},
            ts=self.now,
        )
        payload_str = json.dumps(msg)
        topic = f"parksmart/{self.zone_id}/{self.camera_id}/occupancy"

        # Delivery 1: Accepted
        res1 = self.run_async(self.consumer.process_message(topic, payload_str, now=self.now))
        self.assertFalse(res1.duplicate)
        self.assertEqual(res1.applied_bays, 1)

        # Delivery 2: Duplicate
        res2 = self.run_async(self.consumer.process_message(topic, payload_str, now=self.now))
        self.assertTrue(res2.duplicate)
        self.assertEqual(res2.applied_bays, 0)
        self.assertEqual(self.consumer.stats["duplicates"], 1)
        # Exactly 1 event stored in database
        self.assertEqual(len(self.db.events), 1)

    def test_future_timestamp_rejected_beyond_30s(self):
        """Telemetry timestamp > 30s ahead of server time is rejected."""
        future_ts = self.now + timedelta(seconds=45)
        msg = generate_occupancy_message(
            camera_id=self.camera_id,
            bay_states={self.bay_1: "occupied"},
            ts=future_ts,
        )
        payload_str = json.dumps(msg)
        topic = f"parksmart/{self.zone_id}/{self.camera_id}/occupancy"

        result = self.run_async(self.consumer.process_message(topic, payload_str, now=self.now))
        self.assertIsNone(result)
        self.assertEqual(self.consumer.stats["rejected_future"], 1)
        # Database status remains initial "unknown"
        self.assertEqual(self.db.status[self.bay_1][0], "unknown")

    def test_older_observation_cannot_overwrite_newer_bay_state(self):
        """An out-of-order older observation cannot overwrite newer bay state."""
        # Step 1: Ingest newer event at 12:00:00 -> occupied
        msg_newer = generate_occupancy_message(
            camera_id=self.camera_id,
            bay_states={self.bay_1: "occupied"},
            ts=self.now,
        )
        topic = f"parksmart/{self.zone_id}/{self.camera_id}/occupancy"
        self.run_async(self.consumer.process_message(topic, json.dumps(msg_newer), now=self.now))
        self.assertEqual(self.db.status[self.bay_1][0], "occupied")

        # Step 2: Ingest older event at 11:50:00 -> free
        msg_older = generate_occupancy_message(
            camera_id=self.camera_id,
            bay_states={self.bay_1: "free"},
            ts=self.now - timedelta(minutes=10),
        )
        res_older = self.run_async(self.consumer.process_message(topic, json.dumps(msg_older), now=self.now))

        self.assertIsNotNone(res_older)
        self.assertEqual(res_older.applied_bays, 0)
        self.assertEqual(res_older.stale_bays, 1)
        # Database status stays occupied at 12:00:00
        self.assertEqual(self.db.status[self.bay_1][0], "occupied")
        self.assertEqual(self.db.status[self.bay_1][1], self.now)
        # Regression check: camera last_seen_at must remain at newer timestamp (12:00:00), not roll back
        self.assertEqual(self.camera.last_seen_at, self.now)

    def test_concurrency_race_marks_event_unapplied(self):
        """When an upsert_status race occurs, mark_event_unapplied is triggered for audit accuracy."""
        # Force upsert_status to simulate losing the concurrency race
        orig_upsert = self.db.upsert_status

        async def failing_upsert(*args, **kwargs):
            return False

        self.db.upsert_status = failing_upsert
        try:
            msg = generate_occupancy_message(
                camera_id=self.camera_id,
                bay_states={self.bay_1: "occupied"},
                ts=self.now,
            )
            topic = f"parksmart/{self.zone_id}/{self.camera_id}/occupancy"
            res = self.run_async(self.consumer.process_message(topic, json.dumps(msg), now=self.now))
            self.assertIsNotNone(res)
            self.assertEqual(res.applied_bays, 0)
            self.assertEqual(res.stale_bays, 1)
            # Event was recorded, but unapplied due to losing the conditional upsert
            self.assertEqual(len(self.db.unapplied_events), 1)
        finally:
            self.db.upsert_status = orig_upsert

    def test_malformed_topic_rejected(self):
        """Topics not matching parksmart/{zone_id}/{camera_id}/{kind} are rejected."""
        msg = generate_occupancy_message(
            camera_id=self.camera_id,
            bay_states={self.bay_1: "occupied"},
            ts=self.now,
        )
        payload_str = json.dumps(msg)

        # Invalid segment count
        res1 = self.run_async(self.consumer.process_message("parksmart/zone1/occupancy", payload_str, now=self.now))
        self.assertIsNone(res1)
        self.assertEqual(self.consumer.stats["rejected_invalid"], 1)

        # Invalid root prefix
        res2 = self.run_async(self.consumer.process_message(f"other/{self.zone_id}/{self.camera_id}/occupancy", payload_str, now=self.now))
        self.assertIsNone(res2)
        self.assertEqual(self.consumer.stats["rejected_invalid"], 2)

    def test_unknown_camera_rejected(self):
        """Messages for cameras not found in database are rejected and logged."""
        unknown_cam = uuid.uuid4()
        msg = generate_occupancy_message(
            camera_id=unknown_cam,
            bay_states={self.bay_1: "occupied"},
            ts=self.now,
        )
        topic = f"parksmart/{self.zone_id}/{unknown_cam}/occupancy"
        res = self.run_async(self.consumer.process_message(topic, json.dumps(msg), now=self.now))
        self.assertIsNone(res)
        self.assertEqual(self.consumer.stats["rejected_unknown_camera"], 1)

    def test_zone_mismatch_rejected(self):
        """Topic zone differing from camera's registered zone is rejected."""
        mismatched_zone = uuid.uuid4()
        msg = generate_occupancy_message(
            camera_id=self.camera_id,
            bay_states={self.bay_1: "occupied"},
            ts=self.now,
        )
        topic = f"parksmart/{mismatched_zone}/{self.camera_id}/occupancy"
        res = self.run_async(self.consumer.process_message(topic, json.dumps(msg), now=self.now))
        self.assertIsNone(res)
        self.assertEqual(self.consumer.stats["rejected_invalid"], 1)

    def test_payload_over_max_size_rejected(self):
        """Payloads exceeding MAX_PAYLOAD_BYTES (256 KB) are rejected."""
        huge_payload = json.dumps({"schema_version": 1, "data": "X" * 300000})
        topic = f"parksmart/{self.zone_id}/{self.camera_id}/occupancy"
        res = self.run_async(self.consumer.process_message(topic, huge_payload, now=self.now))
        self.assertIsNone(res)
        self.assertEqual(self.consumer.stats["rejected_invalid"], 1)

    def test_privacy_no_frames_or_crops_on_disk(self):
        """
        Privacy Rule: Verifies that during the entire simulator and ingestion cycle,
        no camera frames, detection crops, or raw image files (*.jpg, *.png, *.pt, *.bin)
        are written to disk.
        """
        # Run a simulated pipeline cycle
        bay_states = {self.bay_1: "occupied", self.bay_2: "free"}
        msg = generate_occupancy_message(
            camera_id=self.camera_id,
            bay_states=bay_states,
            ts=self.now,
        )
        topic = f"parksmart/{self.zone_id}/{self.camera_id}/occupancy"
        self.run_async(self.consumer.process_message(topic, json.dumps(msg), now=self.now))

        # Check for image and crop artifacts in workspace (excluding vendor dependencies)
        image_extensions = ("*.jpg", "*.jpeg", "*.png", "*.bmp", "*.pt", "*.raw", "*.crop")
        found_files = []
        for ext in image_extensions:
            for p in glob.glob(f"**/{ext}", recursive=True):
                if any(ignored in p for ignored in ("node_modules", ".git", ".venv", "__pycache__")):
                    continue
                found_files.append(p)

        self.assertEqual(
            found_files,
            [],
            f"Privacy violation: image/crop files detected in repository: {found_files}",
        )


if __name__ == "__main__":
    unittest.main()
