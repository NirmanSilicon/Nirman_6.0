"""
Unit tests for backend/app/modules/ingestion/health_monitor.py and state_manager health rules.
Verifies:
- Stale to unavailable data_state transitions across time thresholds
- Detection of silent cameras and transition to offline
- Creation of camera_down maintenance events and field operator alerts
- Prevention of duplicate alerts on repeated runs
- Camera recovery from offline and auto-resolution of maintenance events
- Invariant: silent or offline telemetry never infers a bay is free
"""

from __future__ import annotations

import asyncio
import sys
import unittest
import uuid
from dataclasses import dataclass, field
from datetime import UTC, datetime, timedelta
from pathlib import Path
from typing import Any

# Ensure backend directory is in sys.path
backend_dir = Path(__file__).resolve().parent.parent.parent
if str(backend_dir) not in sys.path:
    sys.path.insert(0, str(backend_dir))

from app.modules.ingestion import repository as repo
from app.modules.ingestion.health_monitor import HealthMonitor
from app.modules.ingestion.state_manager import derive_data_state, touch_camera


@dataclass
class MockCamera:
    id: uuid.UUID = field(default_factory=uuid.uuid4)
    zone_id: uuid.UUID = field(default_factory=uuid.uuid4)
    name: str = "CAM-TEST-01"
    status: str = "online"
    is_active: bool = True
    last_seen_at: datetime | None = None
    config: dict[str, Any] = field(default_factory=lambda: {"conf_threshold": 0.50})


@dataclass
class MockSettings:
    stale_after_s: int = 120
    unavailable_after_s: int = 600


@dataclass
class MockMaintenanceEvent:
    id: uuid.UUID = field(default_factory=uuid.uuid4)
    camera_id: uuid.UUID | None = None
    zone_id: uuid.UUID | None = None
    kind: str = "camera_down"
    description: str = ""
    opened_at: datetime = field(default_factory=lambda: datetime.now(UTC))
    resolved_at: datetime | None = None
    opened_by: uuid.UUID | None = None
    resolved_by: uuid.UUID | None = None


class MockHub:
    def __init__(self):
        self.published: list[tuple[str, str, dict]] = []

    def publish(self, channel: str, event: str, data: dict):
        self.published.append((channel, event, data))


class MockHealthDatabase:
    """In-memory database simulating camera and maintenance persistence."""

    def __init__(self, cameras: list[MockCamera]):
        self.cameras: dict[uuid.UUID, MockCamera] = {c.id: c for c in cameras}
        self.maintenance_events: list[MockMaintenanceEvent] = []
        self.device_health_events: list[dict[str, Any]] = []
        self.notifications: list[dict[str, Any]] = []
        self.newest_occupancy: dict[uuid.UUID, datetime] = {}

    async def list_stale_or_silent_cameras(self, threshold_dt: datetime) -> list[MockCamera]:
        res = []
        for cam in self.cameras.values():
            if (
                cam.is_active
                and cam.status in ("online", "degraded")
                and (cam.last_seen_at is None or cam.last_seen_at < threshold_dt)
            ):
                res.append(cam)
        return res

    async def list_active_cameras(self) -> list[MockCamera]:
        return [c for c in self.cameras.values() if c.is_active]

    async def get_camera_for_update(self, camera_id: uuid.UUID) -> MockCamera | None:
        return self.cameras.get(camera_id)

    async def get_camera(self, camera_id: uuid.UUID) -> MockCamera | None:
        return self.cameras.get(camera_id)

    async def set_camera_state(self, camera_id: uuid.UUID, status: str, last_seen_at: datetime) -> None:
        cam = self.cameras.get(camera_id)
        if cam:
            cam.status = status
            cam.last_seen_at = last_seen_at

    async def insert_device_health_event(
        self, camera_id: uuid.UUID, state: str, detail: dict[str, Any] | None, observed_at: datetime
    ) -> None:
        self.device_health_events.append({
            "camera_id": camera_id,
            "state": state,
            "detail": detail,
            "observed_at": observed_at,
        })

    async def get_open_maintenance(
        self, camera_id: uuid.UUID, kind: str | None = None
    ) -> MockMaintenanceEvent | None:
        for ev in self.maintenance_events:
            if ev.camera_id == camera_id and ev.resolved_at is None and (kind is None or ev.kind == kind):
                return ev
        return None

    async def open_maintenance(
        self,
        *,
        camera_id: uuid.UUID,
        zone_id: uuid.UUID | None,
        kind: str,
        description: str,
        opened_at: datetime,
        opened_by: uuid.UUID | None = None,
    ) -> MockMaintenanceEvent:
        ev = MockMaintenanceEvent(
            camera_id=camera_id,
            zone_id=zone_id,
            kind=kind,
            description=description,
            opened_at=opened_at,
            opened_by=opened_by,
        )
        self.maintenance_events.append(ev)
        return ev

    async def resolve_maintenance(
        self,
        *,
        camera_id: uuid.UUID,
        kind: str | None = None,
        resolved_at: datetime,
        resolved_by: uuid.UUID | None = None,
    ) -> int:
        count = 0
        for ev in self.maintenance_events:
            if ev.camera_id == camera_id and ev.resolved_at is None and (kind is None or ev.kind == kind):
                ev.resolved_at = resolved_at
                ev.resolved_by = resolved_by
                count += 1
        return count

    async def get_newest_occupancy_event_ts(self, camera_id: uuid.UUID) -> datetime | None:
        return self.newest_occupancy.get(camera_id)

    async def notify_role(
        self, role: str, kind: str, title: str, body: str, payload: dict[str, Any] | None = None
    ) -> int:
        self.notifications.append({
            "role": role,
            "kind": kind,
            "title": title,
            "body": body,
            "payload": payload,
        })
        return 1


class TestHealthMonitorAndDataState(unittest.TestCase):
    def setUp(self):
        self.now = datetime(2026, 11, 24, 12, 0, 0, tzinfo=UTC)
        self.settings = MockSettings()
        self.hub = MockHub()

        self.cam_online = MockCamera(
            name="CAM-ACTIVE-01",
            status="online",
            last_seen_at=self.now - timedelta(seconds=30),
        )
        self.cam_stale = MockCamera(
            name="CAM-STALE-01",
            status="online",
            last_seen_at=self.now - timedelta(seconds=200),
        )
        self.cam_silent = MockCamera(
            name="CAM-SILENT-01",
            status="online",
            last_seen_at=self.now - timedelta(seconds=700),
        )
        self.cam_offline = MockCamera(
            name="CAM-OFFLINE-01",
            status="offline",
            last_seen_at=self.now - timedelta(hours=2),
        )
        self.cam_maintenance = MockCamera(
            name="CAM-MAINT-01",
            status="maintenance",
            last_seen_at=self.now - timedelta(hours=1),
        )

        self.db = MockHealthDatabase([
            self.cam_online,
            self.cam_stale,
            self.cam_silent,
            self.cam_offline,
            self.cam_maintenance,
        ])

        # Monkeypatch repository functions to route to MockHealthDatabase
        self._orig_list_silent = repo.list_stale_or_silent_cameras
        self._orig_get_update = repo.get_camera_for_update
        self._orig_get_cam = repo.get_camera
        self._orig_set_cam = repo.set_camera_state
        self._orig_health_ev = repo.insert_device_health_event
        self._orig_get_maint = repo.get_open_maintenance
        self._orig_open_maint = repo.open_maintenance
        self._orig_res_maint = repo.resolve_maintenance
        self._orig_newest_occ = repo.get_newest_occupancy_event_ts

        async def wrap_list_silent(db, dt):
            return await self.db.list_stale_or_silent_cameras(dt)

        async def wrap_get_update(db, cid):
            return await self.db.get_camera_for_update(cid)

        async def wrap_get_cam(db, cid):
            return await self.db.get_camera(cid)

        async def wrap_set_cam(db, cid, status, ts):
            return await self.db.set_camera_state(cid, status, ts)

        async def wrap_health_ev(db, cid, state, detail, ts):
            return await self.db.insert_device_health_event(cid, state, detail, ts)

        async def wrap_get_maint(db, cid, kind=None):
            return await self.db.get_open_maintenance(cid, kind)

        async def wrap_open_maint(db, **kwargs):
            return await self.db.open_maintenance(**kwargs)

        async def wrap_res_maint(db, **kwargs):
            return await self.db.resolve_maintenance(**kwargs)

        async def wrap_newest_occ(db, cid):
            return await self.db.get_newest_occupancy_event_ts(cid)

        repo.list_stale_or_silent_cameras = wrap_list_silent
        repo.get_camera_for_update = wrap_get_update
        repo.get_camera = wrap_get_cam
        repo.set_camera_state = wrap_set_cam
        repo.insert_device_health_event = wrap_health_ev
        repo.get_open_maintenance = wrap_get_maint
        repo.open_maintenance = wrap_open_maint
        repo.resolve_maintenance = wrap_res_maint
        repo.get_newest_occupancy_event_ts = wrap_newest_occ

        self.monitor = HealthMonitor(
            settings=self.settings,
            session_factory=lambda: self.db,
            hub=self.hub,
            interval_s=30,
        )

    def tearDown(self):
        repo.list_stale_or_silent_cameras = self._orig_list_silent
        repo.get_camera_for_update = self._orig_get_update
        repo.get_camera = self._orig_get_cam
        repo.set_camera_state = self._orig_set_cam
        repo.insert_device_health_event = self._orig_health_ev
        repo.get_open_maintenance = self._orig_get_maint
        repo.open_maintenance = self._orig_open_maint
        repo.resolve_maintenance = self._orig_res_maint
        repo.get_newest_occupancy_event_ts = self._orig_newest_occ

    def run_async(self, coro):
        return asyncio.run(coro)

    def test_01_derive_data_state_transitions(self):
        """Validates all canonical data_state derivations and thresholds."""
        # None observed_at -> unknown
        self.assertEqual(derive_data_state(None, "online", self.now, self.settings), "unknown")

        # Offline or maintenance status -> unavailable regardless of age
        fresh_ts = self.now - timedelta(seconds=10)
        self.assertEqual(derive_data_state(fresh_ts, "offline", self.now, self.settings), "unavailable")
        self.assertEqual(derive_data_state(fresh_ts, "maintenance", self.now, self.settings), "unavailable")

        # Age <= stale_after_s (120s) -> live
        live_ts = self.now - timedelta(seconds=100)
        self.assertEqual(derive_data_state(live_ts, "online", self.now, self.settings), "live")

        # 120s < Age <= unavailable_after_s (600s) -> stale
        stale_ts = self.now - timedelta(seconds=350)
        self.assertEqual(derive_data_state(stale_ts, "online", self.now, self.settings), "stale")

        # Age > unavailable_after_s (600s) -> unavailable
        unavail_ts = self.now - timedelta(seconds=700)
        self.assertEqual(derive_data_state(unavail_ts, "online", self.now, self.settings), "unavailable")

    def test_02_silent_camera_detected_and_marked_offline(self):
        """Silent camera (last_seen > 600s) transitions to offline, opens maintenance event, and alerts."""
        offline_cams = self.run_async(self.monitor.run_once(now=self.now))

        # Exactly the silent camera (700s old) was marked offline
        self.assertIn(self.cam_silent.id, offline_cams)
        self.assertEqual(self.cam_silent.status, "offline")

        # Camera online (30s) and camera stale (200s) remain online
        self.assertEqual(self.cam_online.status, "online")
        self.assertEqual(self.cam_stale.status, "online")

        # Maintenance event created
        open_maint = self.run_async(self.db.get_open_maintenance(self.cam_silent.id, kind="camera_down"))
        self.assertIsNotNone(open_maint)
        self.assertEqual(open_maint.kind, "camera_down")
        self.assertIn("No heartbeat", open_maint.description)

        # Field operator notified
        self.assertEqual(len(self.db.notifications), 1)
        self.assertEqual(self.db.notifications[0]["role"], "field_operator")
        self.assertEqual(self.db.notifications[0]["kind"], "camera_down")

        # Device health published to hub ops:devices channel
        self.assertEqual(len(self.hub.published), 1)
        self.assertEqual(self.hub.published[0][0], "ops:devices")
        self.assertEqual(self.hub.published[0][1], "device_health")
        self.assertEqual(self.hub.published[0][2]["status"], "offline")

    def test_03_duplicate_alerts_avoided_on_repeated_runs(self):
        """Subsequent watchdog cycles must not duplicate maintenance events or alerts."""
        # Cycle 1: Transitions and creates alert
        self.run_async(self.monitor.run_once(now=self.now))
        self.assertEqual(len(self.db.maintenance_events), 1)
        self.assertEqual(len(self.db.notifications), 1)

        # Cycle 2: Same silent camera checked 30 seconds later
        later = self.now + timedelta(seconds=30)
        offline_cams_2 = self.run_async(self.monitor.run_once(now=later))

        # No new offline transition (already offline)
        self.assertEqual(len(offline_cams_2), 0)
        # Exactly 1 maintenance event and 1 notification remain (no duplicate storm)
        self.assertEqual(len(self.db.maintenance_events), 1)
        self.assertEqual(len(self.db.notifications), 1)

    def test_04_camera_recovery_from_offline_auto_resolves_events(self):
        """Fresh telemetry on an offline camera restores status to online and auto-resolves maintenance."""
        # 1. Take camera offline
        self.run_async(self.monitor.run_once(now=self.now))
        self.assertEqual(self.cam_silent.status, "offline")
        open_ev = self.run_async(self.db.get_open_maintenance(self.cam_silent.id, kind="camera_down"))
        self.assertIsNotNone(open_ev)
        self.assertIsNone(open_ev.resolved_at)

        # 2. Camera recovers: sends telemetry 5 minutes later
        recovery_time = self.now + timedelta(minutes=5)
        self.run_async(
            touch_camera(self.db, self.cam_silent, seen_at=recovery_time, now=recovery_time)
        )

        # Status restored to online
        self.assertEqual(self.cam_silent.status, "online")
        self.assertEqual(self.cam_silent.last_seen_at, recovery_time)

        # Maintenance event auto-resolved
        open_after_recovery = self.run_async(
            self.db.get_open_maintenance(self.cam_silent.id, kind="camera_down")
        )
        self.assertIsNone(open_after_recovery)
        self.assertEqual(open_ev.resolved_at, recovery_time)

        # Health event recorded with reason 'telemetry_resumed'
        resumed_events = [
            e for e in self.db.device_health_events if e["detail"].get("reason") == "telemetry_resumed"
        ]
        self.assertEqual(len(resumed_events), 1)

    def test_05_stale_data_detected_when_camera_online_without_occupancy(self):
        """Detects cameras sending device health/pings but lacking vision occupancy events."""
        # cam_online has heartbeat, but newest occupancy event is 800s old
        self.db.newest_occupancy[self.cam_online.id] = self.now - timedelta(seconds=800)

        self.run_async(self.monitor.run_once(now=self.now))

        # Stale data maintenance event opened
        stale_ev = self.run_async(self.db.get_open_maintenance(self.cam_online.id, kind="stale_data"))
        self.assertIsNotNone(stale_ev)
        self.assertEqual(stale_ev.kind, "stale_data")
        self.assertIn("occupancy telemetry is older", stale_ev.description)

    def test_06_never_infers_free_when_camera_telemetry_stops(self):
        """Invariant: When camera telemetry stops, data_state degrades to unavailable, never free."""
        # A bay recorded as occupied 15 minutes ago
        old_obs = self.now - timedelta(minutes=15)
        state = derive_data_state(old_obs, self.cam_silent.status, self.now, self.settings)

        self.assertEqual(state, "unavailable")
        self.assertNotEqual(state, "live")
        # Invariant check: Ingestion layers and availability calculators must check data_state != 'unavailable'
        # before reading physical occupancy


if __name__ == "__main__":
    unittest.main()
