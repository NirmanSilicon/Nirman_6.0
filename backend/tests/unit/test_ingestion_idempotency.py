"""
Unit and Concurrency tests for Ingestion Idempotency & Database Authority
Tests duplicate rejection, concurrency safety, out-of-order handling, and database-enforced uniqueness.
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

from app.modules.ingestion import dedup, service
from app.modules.ingestion import repository as repo
from app.modules.ingestion.validator import IngestRejected


class MockDatabase:
    """
    Simulates PostgreSQL PostGIS engine enforcing:
      1. uq_occupancy_event_msg_bay UNIQUE(msg_id, bay_id)
      2. Row-level locks (FOR UPDATE) in sorted bay_id order
      3. Conditional upsert guarding against stale updates (WHERE observed_at > current)
      4. Occupancy history interval tracking
    """

    def __init__(self, mapped_bays: set[uuid.UUID]):
        self.mapped_bays = mapped_bays
        # (msg_id, bay_id) -> event_id
        self.events: dict[tuple[uuid.UUID, uuid.UUID], int] = {}
        # bay_id -> (occupancy, observed_at, last_event_id)
        self.status: dict[uuid.UUID, tuple[str, datetime | None, int | None]] = {
            bid: ("unknown", None, None) for bid in mapped_bays
        }
        # bay_id -> list of (state, from_ts, to_ts)
        self.history: dict[uuid.UUID, list[list]] = {bid: [] for bid in mapped_bays}
        self.event_counter = 1
        # Async locks per bay to simulate row-level locking
        self.bay_locks: dict[uuid.UUID, asyncio.Lock] = {bid: asyncio.Lock() for bid in mapped_bays}

    async def get_camera_bay_ids(self, *args) -> set[uuid.UUID]:
        return self.mapped_bays

    async def lock_status_rows(self, bay_ids: list[uuid.UUID]) -> dict[uuid.UUID, tuple[str, datetime | None]]:
        # Acquire locks in sorted bay_id order to prevent deadlocks
        for bid in sorted(bay_ids):
            if bid in self.bay_locks:
                await self.bay_locks[bid].acquire()
        return {bid: (self.status[bid][0], self.status[bid][1]) for bid in bay_ids if bid in self.status}

    def release_locks(self, bay_ids: list[uuid.UUID]) -> None:
        for bid in sorted(bay_ids):
            if bid in self.bay_locks and self.bay_locks[bid].locked():
                self.bay_locks[bid].release()

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
        # Database UNIQUE constraint uq_occupancy_event_msg_bay
        if key in self.events:
            # ON CONFLICT DO NOTHING -> returns None
            return None

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
        # WHERE current_bay_status.observed_at IS NULL OR EXCLUDED.observed_at > current_bay_status.observed_at
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
        intervals = self.history.setdefault(bay_id, [])
        intervals.append([state, from_ts, None])

    async def insert_observations(self, **kwargs) -> bool:
        return True

    async def set_camera_state(self, camera_id: uuid.UUID, status: str, last_seen_at: datetime) -> None:
        pass

    async def insert_device_health_event(self, *args, **kwargs) -> None:
        pass


@dataclass
class MockCamera:
    id: uuid.UUID = field(default_factory=uuid.uuid4)
    zone_id: uuid.UUID = field(default_factory=uuid.uuid4)
    name: str = "SIM-camera-1"
    is_active: bool = True
    config: dict = field(default_factory=lambda: {"conf_threshold": 0.5, "interval_s": 10})


class TestIngestionIdempotency(unittest.TestCase):
    def setUp(self):
        dedup.cache.clear()
        self.camera = MockCamera()
        self.bay_1 = uuid.uuid4()
        self.bay_2 = uuid.uuid4()
        self.mapped_bays = {self.bay_1, self.bay_2}
        self.db = MockDatabase(self.mapped_bays)
        self.now = datetime(2026, 11, 24, 12, 0, 0, tzinfo=UTC)

        # Wire repository functions to MockDatabase
        self._orig_get_camera_bay_ids = repo.get_camera_bay_ids
        self._orig_lock = repo.lock_status_rows
        self._orig_insert = repo.insert_event
        self._orig_upsert = repo.upsert_status
        self._orig_get_open = repo.get_open_history_state
        self._orig_close_open = repo.close_open_history
        self._orig_open = repo.open_history

        async def wrap_get_camera_bay_ids(db, camera_id):
            return await self.db.get_camera_bay_ids(camera_id)

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

        repo.get_camera_bay_ids = wrap_get_camera_bay_ids
        repo.lock_status_rows = wrap_lock
        repo.insert_event = wrap_insert
        repo.upsert_status = wrap_upsert
        repo.get_open_history_state = wrap_get_open
        repo.close_open_history = wrap_close_open
        repo.open_history = wrap_open

    def tearDown(self):
        repo.get_camera_bay_ids = self._orig_get_camera_bay_ids
        repo.lock_status_rows = self._orig_lock
        repo.insert_event = self._orig_insert
        repo.upsert_status = self._orig_upsert
        repo.get_open_history_state = self._orig_get_open
        repo.close_open_history = self._orig_close_open
        repo.open_history = self._orig_open

    def run_async(self, coro):
        return asyncio.run(coro)

    def test_first_delivery_applies_state_change(self):
        """First delivery of a valid telemetry message updates bay state and records event."""
        msg_id = uuid.uuid4()
        payload = {
            "schema_version": 1,
            "msg_id": str(msg_id),
            "camera_id": str(self.camera.id),
            "ts": self.now.strftime("%Y-%m-%dT%H:%M:%SZ"),
            "bays": [
                {"bay_id": str(self.bay_1), "state": "occupied", "confidence": 0.95},
                {"bay_id": str(self.bay_2), "state": "free", "confidence": 0.90},
            ],
        }

        async def run():
            try:
                return await service.handle_occupancy(self.db, self.camera, payload, now=self.now)
            finally:
                self.db.release_locks([self.bay_1, self.bay_2])

        res = self.run_async(run())

        self.assertTrue(res.accepted)
        self.assertFalse(res.duplicate)
        self.assertEqual(res.applied_bays, 2)
        self.assertEqual(self.db.status[self.bay_1][0], "occupied")
        self.assertEqual(self.db.status[self.bay_2][0], "free")
        self.assertTrue(dedup.cache.seen(msg_id))

    def test_repeated_delivery_cached_in_memory(self):
        """Repeated delivery with same msg_id is caught by in-memory cache without DB operations."""
        msg_id = uuid.uuid4()
        payload = {
            "schema_version": 1,
            "msg_id": str(msg_id),
            "camera_id": str(self.camera.id),
            "ts": self.now.strftime("%Y-%m-%dT%H:%M:%SZ"),
            "bays": [{"bay_id": str(self.bay_1), "state": "occupied", "confidence": 0.95}],
        }

        async def run_first():
            try:
                return await service.handle_occupancy(self.db, self.camera, payload, now=self.now)
            finally:
                self.db.release_locks([self.bay_1])

        res1 = self.run_async(run_first())
        self.assertFalse(res1.duplicate)
        self.assertEqual(res1.applied_bays, 1)

        # Second delivery (in-memory cache active)
        async def run_second():
            try:
                return await service.handle_occupancy(self.db, self.camera, payload, now=self.now)
            finally:
                self.db.release_locks([self.bay_1])

        res2 = self.run_async(run_second())
        self.assertTrue(res2.accepted)
        self.assertTrue(res2.duplicate)
        self.assertEqual(res2.applied_bays, 0)
        # Database event count must remain 1
        self.assertEqual(len(self.db.events), 1)

    def test_repeated_delivery_db_constraint_authoritative(self):
        """
        When in-memory cache is wiped (simulating server restart), database constraint
        uq_occupancy_event_msg_bay is authoritative and rejects duplicate delivery.
        """
        msg_id = uuid.uuid4()
        payload = {
            "schema_version": 1,
            "msg_id": str(msg_id),
            "camera_id": str(self.camera.id),
            "ts": self.now.strftime("%Y-%m-%dT%H:%M:%SZ"),
            "bays": [{"bay_id": str(self.bay_1), "state": "occupied", "confidence": 0.95}],
        }

        # 1. Process first delivery
        async def run_first():
            try:
                return await service.handle_occupancy(self.db, self.camera, payload, now=self.now)
            finally:
                self.db.release_locks([self.bay_1])

        res1 = self.run_async(run_first())
        self.assertFalse(res1.duplicate)

        # 2. Simulate server restart: cache wiped clean
        dedup.cache.clear()
        self.assertFalse(dedup.cache.seen(msg_id))

        # 3. Repeated delivery arrives from MQTT broker
        async def run_second():
            try:
                return await service.handle_occupancy(self.db, self.camera, payload, now=self.now)
            finally:
                self.db.release_locks([self.bay_1])

        res2 = self.run_async(run_second())

        # DB unique constraint caught the duplicate
        self.assertTrue(res2.accepted)
        self.assertTrue(res2.duplicate, "Must be identified as duplicate via DB constraint")
        self.assertEqual(res2.applied_bays, 0)
        self.assertEqual(len(self.db.events), 1, "Must not create duplicate event rows")
        # In-memory cache is repopulated
        self.assertTrue(dedup.cache.seen(msg_id))

    def test_concurrent_duplicate_delivery(self):
        """Simultaneous delivery of identical message across concurrent workers is safe."""
        msg_id = uuid.uuid4()
        payload = {
            "schema_version": 1,
            "msg_id": str(msg_id),
            "camera_id": str(self.camera.id),
            "ts": self.now.strftime("%Y-%m-%dT%H:%M:%SZ"),
            "bays": [{"bay_id": str(self.bay_1), "state": "occupied", "confidence": 0.95}],
        }

        async def execute_task():
            try:
                return await service.handle_occupancy(self.db, self.camera, payload, now=self.now)
            finally:
                self.db.release_locks([self.bay_1])

        async def run_parallel():
            # Create fresh locks in the current running loop
            self.db.bay_locks = {bid: asyncio.Lock() for bid in self.mapped_bays}
            return await asyncio.gather(execute_task(), execute_task())

        res1, res2 = self.run_async(run_parallel())

        # Exactly one applied, the other marked duplicate
        duplicates = [r for r in (res1, res2) if r.duplicate]
        applied = [r for r in (res1, res2) if not r.duplicate and r.applied_bays == 1]

        self.assertEqual(len(applied), 1, "Exactly one task must apply the state change")
        self.assertEqual(len(duplicates), 1, "The second concurrent task must be identified as duplicate")
        self.assertEqual(len(self.db.events), 1, "Database must contain exactly 1 event row")

    def test_out_of_order_stale_message(self):
        """Stale message with older observed_at does not overwrite newer current_bay_status."""
        # 1. Newer message at 12:00:00 applied
        msg_newer = uuid.uuid4()
        payload_newer = {
            "schema_version": 1,
            "msg_id": str(msg_newer),
            "camera_id": str(self.camera.id),
            "ts": self.now.strftime("%Y-%m-%dT%H:%M:%SZ"),
            "bays": [{"bay_id": str(self.bay_1), "state": "occupied", "confidence": 0.95}],
        }

        async def run_newer():
            try:
                return await service.handle_occupancy(self.db, self.camera, payload_newer, now=self.now)
            finally:
                self.db.release_locks([self.bay_1])

        self.run_async(run_newer())
        self.assertEqual(self.db.status[self.bay_1][0], "occupied")
        self.assertEqual(self.db.status[self.bay_1][1], self.now)

        # 2. Older message at 11:55:00 arrives out of order
        msg_older = uuid.uuid4()
        older_ts = self.now - timedelta(minutes=5)
        payload_older = {
            "schema_version": 1,
            "msg_id": str(msg_older),
            "camera_id": str(self.camera.id),
            "ts": older_ts.strftime("%Y-%m-%dT%H:%M:%SZ"),
            "bays": [{"bay_id": str(self.bay_1), "state": "free", "confidence": 0.95}],
        }

        async def run_older():
            try:
                return await service.handle_occupancy(self.db, self.camera, payload_older, now=self.now)
            finally:
                self.db.release_locks([self.bay_1])

        res_older = self.run_async(run_older())

        self.assertEqual(res_older.applied_bays, 0)
        self.assertEqual(res_older.stale_bays, 1)
        # Current status MUST stay "occupied" at 12:00:00, not reverted to "free"!
        self.assertEqual(self.db.status[self.bay_1][0], "occupied")
        self.assertEqual(self.db.status[self.bay_1][1], self.now)

    def test_invalid_message_not_cached(self):
        """Validation failure does not cache the msg_id, allowing retries with fixed payload."""
        bad_msg_id = uuid.uuid4()
        future_ts = (self.now + timedelta(seconds=60)).strftime("%Y-%m-%dT%H:%M:%SZ")
        bad_payload = {
            "schema_version": 1,
            "msg_id": str(bad_msg_id),
            "camera_id": str(self.camera.id),
            "ts": future_ts,
            "bays": [{"bay_id": str(self.bay_1), "state": "occupied", "confidence": 0.95}],
        }

        async def run_bad():
            return await service.handle_occupancy(self.db, self.camera, bad_payload, now=self.now)

        with self.assertRaises(IngestRejected):
            self.run_async(run_bad())

        # Failed message MUST NOT be remembered
        self.assertFalse(dedup.cache.seen(bad_msg_id))


if __name__ == "__main__":
    unittest.main()
