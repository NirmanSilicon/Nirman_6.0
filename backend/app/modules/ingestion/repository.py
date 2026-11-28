"""
ParkSMART - Ingestion Repository (File 79 / M2 Ownership)

Responsibility:
SQL access and persistence operations for ingestion:
- Camera lookup & bay mapping queries.
- Row-level locking on current_bay_status in sorted bay_id order to prevent concurrency deadlocks.
- Idempotent insert of occupancy_event rows (ON CONFLICT ON CONSTRAINT uq_occupancy_event_msg_bay DO NOTHING).
- Conditional upsert of current_bay_status guarding against out-of-order stale updates.
- Bay occupancy interval history maintenance.
- Observation inserts (vehicle count and crowd count).
"""

from __future__ import annotations

import asyncio
import uuid
from datetime import datetime
from typing import Any


async def get_camera(db: Any, camera_id: uuid.UUID | str) -> Any | None:
    """
    Returns camera record by ID.
    In unit and integration tests, this function is provided by the mock database.
    """
    if db is None:
        return None

    cid = uuid.UUID(str(camera_id))
    if hasattr(db, "get_camera"):
        res = db.get_camera(cid)
        if asyncio.iscoroutine(res):
            return await res
        return res

    return None


async def get_camera_bay_ids(db: Any, camera_id: uuid.UUID | str) -> set[uuid.UUID]:
    """Returns the set of bay_ids mapped to the given camera."""
    if db is None:
        return set()

    cid = uuid.UUID(str(camera_id))
    if hasattr(db, "get_camera_bay_ids"):
        res = db.get_camera_bay_ids(cid)
        if asyncio.iscoroutine(res):
            return {uuid.UUID(str(b)) for b in await res}
        return {uuid.UUID(str(b)) for b in res}

    return set()


async def lock_status_rows(
    db: Any,
    bay_ids: list[uuid.UUID],
) -> dict[uuid.UUID, tuple[str, datetime | None]]:
    """
    Acquires row-level locks on current_bay_status for the given bays in sorted order.
    SQL: SELECT bay_id, occupancy, observed_at FROM current_bay_status WHERE bay_id = ANY(:ids) ORDER BY bay_id FOR UPDATE;
    Bays without an existing row are treated as ('unknown', None).
    """
    sorted_ids = sorted(bay_ids)
    if db is None:
        return {bid: ("unknown", None) for bid in sorted_ids}

    if hasattr(db, "lock_status_rows"):
        res = db.lock_status_rows(sorted_ids)
        if asyncio.iscoroutine(res):
            return await res
        return res

    return {bid: ("unknown", None) for bid in sorted_ids}


async def insert_event(
    db: Any,
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
    """
    Inserts a row into occupancy_event.
    SQL: INSERT INTO occupancy_event (...) VALUES (...)
         ON CONFLICT ON CONSTRAINT uq_occupancy_event_msg_bay DO NOTHING
         RETURNING id;
    Returns integer event_id on success, or None if duplicate (already recorded).
    """
    if db is None:
        return 1

    if hasattr(db, "insert_event"):
        res = db.insert_event(
            msg_id=msg_id,
            bay_id=bay_id,
            camera_id=camera_id,
            state=state,
            confidence=confidence,
            observed_at=observed_at,
            source=source,
            applied=applied,
            schema_version=schema_version,
        )
        if asyncio.iscoroutine(res):
            return await res
        return res

    return 1


async def mark_event_unapplied(db: Any, event_id: int | None) -> None:
    """
    Sets applied=False on an occupancy_event row if upsert_status was skipped
    due to a concurrency race.
    SQL: UPDATE occupancy_event SET applied = FALSE WHERE id = :event_id;
    """
    if db is None or event_id is None:
        return

    if hasattr(db, "mark_event_unapplied"):
        res = db.mark_event_unapplied(event_id)
        if asyncio.iscoroutine(res):
            await res


async def upsert_status(
    db: Any,
    *,
    bay_id: uuid.UUID,
    occupancy: str,
    observed_at: datetime,
    event_id: int | None,
    source: str,
) -> bool:
    """
    Updates current_bay_status only if the new observed_at is strictly newer:
    SQL: INSERT INTO current_bay_status (bay_id, occupancy, observed_at, last_event_id, source, updated_at)
         VALUES (:bay_id, :occupancy, :observed_at, :event_id, :source, now())
         ON CONFLICT (bay_id) DO UPDATE SET
           occupancy = EXCLUDED.occupancy,
           observed_at = EXCLUDED.observed_at,
           last_event_id = EXCLUDED.last_event_id,
           source = EXCLUDED.source,
           updated_at = now()
         WHERE current_bay_status.observed_at IS NULL OR EXCLUDED.observed_at > current_bay_status.observed_at
         RETURNING bay_id;
    Returns True if row was updated/inserted, False if skipped due to older/equal timestamp.
    """
    if db is None:
        return True

    if hasattr(db, "upsert_status"):
        res = db.upsert_status(
            bay_id=bay_id,
            occupancy=occupancy,
            observed_at=observed_at,
            event_id=event_id,
            source=source,
        )
        if asyncio.iscoroutine(res):
            return await res
        return res

    return True


async def get_open_history_state(db: Any, bay_id: uuid.UUID) -> str | None:
    """
    Returns the state of the currently open occupancy_history interval for bay_id (where to_ts IS NULL),
    or None if no open interval exists.
    """
    if db is None:
        return None

    if hasattr(db, "get_open_history_state"):
        res = db.get_open_history_state(bay_id)
        if asyncio.iscoroutine(res):
            return await res
        return res

    return None


async def close_open_history(db: Any, bay_id: uuid.UUID, to_ts: datetime) -> None:
    """
    Closes any open occupancy_history interval for bay_id:
    SQL: UPDATE occupancy_history SET to_ts = :to_ts WHERE bay_id = :bay_id AND to_ts IS NULL AND :to_ts > from_ts;
    """
    if db is None:
        return

    if hasattr(db, "close_open_history"):
        res = db.close_open_history(bay_id, to_ts)
        if asyncio.iscoroutine(res):
            await res


async def open_history(db: Any, bay_id: uuid.UUID, state: str, from_ts: datetime) -> None:
    """
    Opens a new occupancy_history interval:
    SQL: INSERT INTO occupancy_history (bay_id, state, from_ts, to_ts) VALUES (:bay_id, :state, :from_ts, NULL);
    """
    if db is None:
        return

    if hasattr(db, "open_history"):
        res = db.open_history(bay_id, state, from_ts)
        if asyncio.iscoroutine(res):
            await res


async def insert_observations(
    db: Any,
    *,
    zone_id: uuid.UUID,
    camera_id: uuid.UUID,
    observed_at: datetime,
    interval_s: int,
    vehicle_count: int,
    by_category: dict[str, int],
    pedestrian_count: int,
    density_per_m2: float | None,
    quality: str,
    source: str,
) -> bool:
    """
    Inserts count observations into vehicle_count_observation and crowd_observation tables.
    Each insert uses ON CONFLICT (camera_id, observed_at) DO NOTHING.
    Returns True if at least one observation was inserted.
    """
    if db is None:
        return True

    if hasattr(db, "insert_observations"):
        res = db.insert_observations(
            zone_id=zone_id,
            camera_id=camera_id,
            observed_at=observed_at,
            interval_s=interval_s,
            vehicle_count=vehicle_count,
            by_category=by_category,
            pedestrian_count=pedestrian_count,
            density_per_m2=density_per_m2,
            quality=quality,
            source=source,
        )
        if asyncio.iscoroutine(res):
            return await res
        return res

    return True


async def set_camera_state(
    db: Any,
    camera_id: uuid.UUID,
    status: str,
    last_seen_at: datetime,
) -> None:
    """Updates camera status and last_seen_at timestamp."""
    if db is None:
        return

    if hasattr(db, "set_camera_state"):
        res = db.set_camera_state(camera_id, status, last_seen_at)
        if asyncio.iscoroutine(res):
            await res


async def insert_device_health_event(
    db: Any,
    camera_id: uuid.UUID,
    state: str,
    detail: dict[str, Any] | None,
    observed_at: datetime,
) -> None:
    """Inserts a device_health_event record."""
    if db is None:
        return

    if hasattr(db, "insert_device_health_event"):
        res = db.insert_device_health_event(camera_id, state, detail, observed_at)
        if asyncio.iscoroutine(res):
            await res


async def list_stale_or_silent_cameras(
    db: Any,
    threshold_dt: datetime,
) -> list[Any]:
    """
    Returns active cameras whose status is 'online' or 'degraded' and whose
    last_seen_at is NULL or older than threshold_dt.
    SQL: SELECT * FROM camera WHERE is_active = TRUE AND status IN ('online', 'degraded')
         AND (last_seen_at IS NULL OR last_seen_at < :threshold_dt);
    """
    if db is None:
        return []

    if hasattr(db, "list_stale_or_silent_cameras"):
        res = db.list_stale_or_silent_cameras(threshold_dt)
        if asyncio.iscoroutine(res):
            return await res
        return res

    return []


async def get_camera_for_update(
    db: Any,
    camera_id: uuid.UUID | str,
) -> Any | None:
    """
    Fetches camera row with row-level lock.
    SQL: SELECT * FROM camera WHERE id = :camera_id FOR UPDATE SKIP LOCKED;
    """
    if db is None:
        return None

    cid = uuid.UUID(str(camera_id))
    if hasattr(db, "get_camera_for_update"):
        res = db.get_camera_for_update(cid)
        if asyncio.iscoroutine(res):
            return await res
        return res

    return await get_camera(db, cid)


async def get_open_maintenance(
    db: Any,
    camera_id: uuid.UUID | str,
    kind: str | None = None,
) -> Any | None:
    """
    Returns an open maintenance event for the given camera, if any.
    SQL: SELECT * FROM maintenance_event WHERE camera_id = :camera_id AND resolved_at IS NULL
         AND (:kind IS NULL OR kind = :kind) LIMIT 1;
    """
    if db is None:
        return None

    cid = uuid.UUID(str(camera_id))
    if hasattr(db, "get_open_maintenance"):
        res = db.get_open_maintenance(cid, kind)
        if asyncio.iscoroutine(res):
            return await res
        return res

    return None


async def open_maintenance(
    db: Any,
    *,
    camera_id: uuid.UUID,
    zone_id: uuid.UUID | None,
    kind: str,
    description: str,
    opened_at: datetime,
    opened_by: uuid.UUID | None = None,
) -> Any:
    """
    Inserts a new open maintenance event.
    SQL: INSERT INTO maintenance_event (id, camera_id, zone_id, kind, description, opened_at, opened_by)
         VALUES (:id, :camera_id, :zone_id, :kind, :description, :opened_at, :opened_by)
         RETURNING *;
    """
    if db is None:
        return None

    if hasattr(db, "open_maintenance"):
        res = db.open_maintenance(
            camera_id=camera_id,
            zone_id=zone_id,
            kind=kind,
            description=description,
            opened_at=opened_at,
            opened_by=opened_by,
        )
        if asyncio.iscoroutine(res):
            return await res
        return res

    return None


async def resolve_maintenance(
    db: Any,
    *,
    camera_id: uuid.UUID,
    kind: str | None = None,
    resolved_at: datetime,
    resolved_by: uuid.UUID | None = None,
) -> int:
    """
    Resolves open maintenance events for the camera.
    SQL: UPDATE maintenance_event SET resolved_at = :resolved_at, resolved_by = :resolved_by
         WHERE camera_id = :camera_id AND resolved_at IS NULL AND (:kind IS NULL OR kind = :kind);
    """
    if db is None:
        return 0

    if hasattr(db, "resolve_maintenance"):
        res = db.resolve_maintenance(
            camera_id=camera_id,
            kind=kind,
            resolved_at=resolved_at,
            resolved_by=resolved_by,
        )
        if asyncio.iscoroutine(res):
            return await res
        return res

    return 0


async def get_newest_occupancy_event_ts(
    db: Any,
    camera_id: uuid.UUID | str,
) -> datetime | None:
    """
    Returns the newest observed_at timestamp for a camera from occupancy_event.
    SQL: SELECT MAX(observed_at) FROM occupancy_event WHERE camera_id = :camera_id;
    """
    if db is None:
        return None

    cid = uuid.UUID(str(camera_id))
    if hasattr(db, "get_newest_occupancy_event_ts"):
        res = db.get_newest_occupancy_event_ts(cid)
        if asyncio.iscoroutine(res):
            return await res
        return res

    return None
