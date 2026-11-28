"""
ParkSMART - Device Health Monitor (File 84 / M2 Ownership)

Responsibility:
Background watchdog that detects silent and stale cameras, marks them offline,
and raises maintenance events and role alerts idempotently without duplicate storming.
"""

from __future__ import annotations

import asyncio
import logging
import uuid
from datetime import UTC, datetime, timedelta
from typing import Any

from app.modules.ingestion import repository as repo
from app.modules.ingestion import state_manager

logger = logging.getLogger("parksmart.ingestion.health_monitor")

CHECK_INTERVAL_S = 30


async def notify_role(
    db: Any,
    role: str,
    kind: str,
    title: str,
    body: str,
    payload: dict[str, Any] | None = None,
) -> int:
    """
    Sends notification to users with the specified role.
    Falls back gracefully if the notifications service is not yet mounted.
    """
    try:
        from app.modules.notifications import service as notif_service

        if hasattr(notif_service, "notify_role"):
            res = notif_service.notify_role(
                db, role=role, kind=kind, title=title, body=body, payload=payload
            )
            if asyncio.iscoroutine(res):
                return await res
            return res
    except ImportError:
        pass

    if hasattr(db, "notify_role"):
        res = db.notify_role(role=role, kind=kind, title=title, body=body, payload=payload)
        if asyncio.iscoroutine(res):
            return await res
        return res

    return 0


class HealthMonitor:
    """
    Background watchdog monitoring device heartbeats and telemetry recency:
      - Tracks camera health using configured STALE_AFTER_S and UNAVAILABLE_AFTER_S.
      - Marks silent cameras offline when last_seen_at exceeds UNAVAILABLE_AFTER_S.
      - Generates 'camera_down' maintenance events and alerts field operators.
      - Detects online cameras with stale occupancy telemetry and raises 'stale_data' events.
      - Idempotent: checks for existing open maintenance events to prevent duplicate alert storms.
      - Publishes 'device_health' events to hub channel 'ops:devices' after transaction commit.
    """

    def __init__(
        self,
        settings: Any = None,
        session_factory: Any = None,
        hub: Any = None,
        interval_s: int = CHECK_INTERVAL_S,
    ):
        self.settings = settings
        self.session_factory = session_factory
        self.hub = hub
        self.interval_s = max(1, interval_s)
        self.stop_event = asyncio.Event()

    def stop(self) -> None:
        """Signals the background monitoring loop to terminate."""
        self.stop_event.set()

    async def run_once(self, now: datetime | None = None) -> list[uuid.UUID]:
        """
        Executes a single watchdog inspection cycle across all cameras:
          1. Finds silent cameras (online/degraded with last_seen_at < now - unavailable_after_s).
          2. Transitions them to 'offline' and creates 'camera_down' maintenance events.
          3. Checks online cameras with stale occupancy telemetry and creates 'stale_data' events.
          4. Returns the list of camera IDs transitioned to offline.
        """
        curr_now = now or datetime.now(UTC)
        if curr_now.tzinfo is None:
            curr_now = curr_now.replace(tzinfo=UTC)

        unavail_s = float(
            getattr(self.settings, "unavailable_after_s", 600.0) if self.settings else 600.0
        )
        stale_s = float(
            getattr(self.settings, "stale_after_s", 120.0) if self.settings else 120.0
        )
        threshold_dt = curr_now - timedelta(seconds=unavail_s)

        offline_cameras: list[uuid.UUID] = []

        if self.session_factory is not None:
            session_ctx = self.session_factory()
            if hasattr(session_ctx, "__aenter__"):
                async with session_ctx as session:
                    offline_cameras = await self._check_cameras(
                        session, threshold_dt, curr_now, unavail_s, stale_s
                    )
            else:
                offline_cameras = await self._check_cameras(
                    session_ctx, threshold_dt, curr_now, unavail_s, stale_s
                )
        else:
            offline_cameras = await self._check_cameras(
                None, threshold_dt, curr_now, unavail_s, stale_s
            )

        return offline_cameras

    async def _check_cameras(
        self,
        session: Any,
        threshold_dt: datetime,
        now: datetime,
        unavail_s: float,
        stale_s: float,
    ) -> list[uuid.UUID]:
        """Core camera health check logic within an active database session."""
        offline_cams: list[uuid.UUID] = []

        # 1. Query silent cameras (online/degraded with last_seen_at < threshold_dt or None)
        silent_cameras = await repo.list_stale_or_silent_cameras(session, threshold_dt)

        for cam in silent_cameras:
            cam_id = uuid.UUID(str(getattr(cam, "id", None)))
            zone_id = getattr(cam, "zone_id", None)
            zone_uid = uuid.UUID(str(zone_id)) if zone_id else None

            # Lock camera row for update
            locked_cam = await repo.get_camera_for_update(session, cam_id)
            if locked_cam is None:
                continue

            last_seen = getattr(locked_cam, "last_seen_at", None)
            status = getattr(locked_cam, "status", "online")
            is_active = getattr(locked_cam, "is_active", True)

            # Recheck condition under row lock
            if (
                is_active
                and status in ("online", "degraded")
                and (last_seen is None or last_seen < threshold_dt)
            ):
                # Transition to offline
                await state_manager.apply_health(
                    session,
                    locked_cam,
                    "offline",
                    now,
                    detail={"reason": "heartbeat_timeout", "threshold_s": unavail_s},
                )

                # Check for existing open maintenance event to avoid duplicate alert storms
                existing_open = await repo.get_open_maintenance(
                    session, cam_id, kind="camera_down"
                )
                if existing_open is None:
                    await repo.open_maintenance(
                        session,
                        camera_id=cam_id,
                        zone_id=zone_uid,
                        kind="camera_down",
                        description=f"No heartbeat received for {int(unavail_s)}s (threshold: {unavail_s}s)",
                        opened_at=now,
                    )
                    await notify_role(
                        session,
                        role="field_operator",
                        kind="camera_down",
                        title=f"Camera Offline: {cam_id}",
                        body=f"Camera {cam_id} has stopped sending heartbeats and was marked offline.",
                        payload={
                            "camera_id": str(cam_id),
                            "zone_id": str(zone_uid) if zone_uid else None,
                        },
                    )

                # Commit session if available
                if hasattr(session, "commit"):
                    if asyncio.iscoroutinefunction(session.commit):
                        await session.commit()
                    else:
                        session.commit()

                # Publish health change to hub ops:devices channel AFTER commit
                if self.hub is not None and hasattr(self.hub, "publish"):
                    try:
                        res_pub = self.hub.publish(
                            "ops:devices",
                            "device_health",
                            {
                                "camera_id": str(cam_id),
                                "status": "offline",
                                "reason": "heartbeat_timeout",
                                "observed_at": now.isoformat(),
                            },
                        )
                        if asyncio.iscoroutine(res_pub):
                            await res_pub
                    except (RuntimeError, ValueError, TypeError, OSError, AttributeError) as pub_err:
                        logger.error("Failed to publish device_health to hub: %s", pub_err)

                offline_cams.append(cam_id)

        # 2. Check for online cameras with stale occupancy telemetry
        # Cameras that are online, but haven't produced occupancy events within unavailable_after_s
        if hasattr(session, "list_active_cameras"):
            active_res = session.list_active_cameras()
            active_cams = await active_res if asyncio.iscoroutine(active_res) else active_res
            for cam in active_cams:
                cam_id = uuid.UUID(str(getattr(cam, "id", None)))
                status = getattr(cam, "status", "online")
                if status == "online":
                    newest_occ = await repo.get_newest_occupancy_event_ts(session, cam_id)
                    if newest_occ is not None and newest_occ < threshold_dt:
                        existing_stale = await repo.get_open_maintenance(
                            session, cam_id, kind="stale_data"
                        )
                        if existing_stale is None:
                            await repo.open_maintenance(
                                session,
                                camera_id=cam_id,
                                zone_id=(
                                    uuid.UUID(str(getattr(cam, "zone_id", None)))
                                    if getattr(cam, "zone_id", None)
                                    else None
                                ),
                                kind="stale_data",
                                description=f"Camera is online but occupancy telemetry is older than {int(unavail_s)}s",
                                opened_at=now,
                            )
                            await notify_role(
                                session,
                                role="field_operator",
                                kind="stale_data",
                                title=f"Stale Telemetry: {cam_id}",
                                body=f"Camera {cam_id} is online but occupancy telemetry is older than {int(unavail_s)}s.",
                                payload={"camera_id": str(cam_id)},
                            )
                            if hasattr(session, "commit"):
                                if asyncio.iscoroutinefunction(session.commit):
                                    await session.commit()
                                else:
                                    session.commit()

        return offline_cams

    async def run_forever(self) -> None:
        """Resilient background loop executing health checks every interval_s."""
        logger.info("Starting HealthMonitor watchdog loop (interval=%ds)...", self.interval_s)
        while not self.stop_event.is_set():
            try:
                await self.run_once()
            except asyncio.CancelledError:
                break
            except Exception:
                logger.exception("Error in HealthMonitor watchdog cycle")

            try:
                await asyncio.wait_for(self.stop_event.wait(), timeout=self.interval_s)
            except TimeoutError:
                pass
