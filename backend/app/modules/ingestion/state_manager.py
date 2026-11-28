"""
ParkSMART - Ingestion State Manager (File 83 / M2 Ownership)

Responsibility:
The single writer of live bay state:
- Applies validated occupancy readings with out-of-order and idempotency protection.
- Maintains bay history intervals (open/close).
- Derives data_state (live, stale, unavailable, unknown).
- Manages camera state transitions and last_seen_at updates.
"""

from __future__ import annotations

import uuid
from dataclasses import dataclass, field
from datetime import UTC, datetime
from typing import Any

from app.modules.ingestion import repository as repo
from app.modules.ingestion.validator import ValidatedOccupancy


@dataclass
class ApplyResult:
    """Outcome of applying a validated occupancy message across its bays."""

    applied: list[uuid.UUID] = field(default_factory=list)
    stale: list[uuid.UUID] = field(default_factory=list)
    duplicates: list[uuid.UUID] = field(default_factory=list)
    events: list[dict[str, Any]] = field(default_factory=list)


def derive_data_state(
    observed_at: datetime | None,
    camera_status: str | None,
    now: datetime,
    settings: Any = None,
) -> str:
    """
    The canonical data_state derivation used system-wide:
      - observed_at is None -> "unknown"
      - camera_status in ("offline", "maintenance") -> "unavailable"
      - age <= stale_after_s (120s) -> "live"
      - age <= unavailable_after_s (600s) -> "stale"
      - else -> "unavailable"

    Invariant: A missing, stale, or unavailable telemetry update NEVER returns free.
    """
    if observed_at is None:
        return "unknown"

    status = (camera_status or "online").lower()
    if status in ("offline", "maintenance"):
        return "unavailable"

    # Ensure UTC awareness
    curr = now if now.tzinfo is not None else now.replace(tzinfo=UTC)
    obs = observed_at if observed_at.tzinfo is not None else observed_at.replace(tzinfo=UTC)

    age_s = max(0.0, (curr - obs).total_seconds())
    stale_limit = float(getattr(settings, "stale_after_s", 120.0) if settings else 120.0)
    unavail_limit = float(getattr(settings, "unavailable_after_s", 600.0) if settings else 600.0)

    if age_s <= stale_limit:
        return "live"
    if age_s <= unavail_limit:
        return "stale"
    return "unavailable"


async def apply_bay_reading(
    db: Any,
    *,
    bay_id: uuid.UUID,
    msg_id: uuid.UUID,
    camera_id: uuid.UUID | None,
    state: str,
    confidence: float,
    observed_at: datetime,
    source: str,
    now: datetime,
    stored_status: tuple[str, datetime | None] | None = None,
) -> tuple[str, int | None]:
    """
    Applies an individual bay reading inside a transaction with full idempotency protection:
      1. Check whether inbound reading is strictly newer than stored status.
      2. Insert occupancy_event with applied=is_newer (ON CONFLICT uq_occupancy_event_msg_bay DO NOTHING).
      3. If duplicate (event_id is None): return ("duplicate", None).
      4. If stale (not is_newer): return ("stale", event_id).
      5. If applied (is_newer):
         - Upsert current_bay_status.
         - Close/open occupancy_history intervals accordingly.
         - Return ("applied", event_id).
    """
    # 1. Check recency against locked stored status
    if stored_status is not None:
        stored_ts = stored_status[1]
        is_newer = stored_ts is None or observed_at > stored_ts
    else:
        is_newer = True

    # 2. Insert event with unique constraint guard
    event_id = await repo.insert_event(
        db,
        msg_id=msg_id,
        bay_id=bay_id,
        camera_id=camera_id,
        state=state,
        confidence=confidence,
        observed_at=observed_at,
        source=source,
        applied=is_newer,
        schema_version=1,
    )

    # 3. Duplicate check (idempotency authority)
    if event_id is None:
        # Database constraint uq_occupancy_event_msg_bay suppressed duplicate insert
        return "duplicate", None

    # 4. Out-of-order check
    if not is_newer:
        # Event stored for audit, but current status and history are unchanged
        return "stale", event_id

    # 5. Advance current_bay_status
    updated = await repo.upsert_status(
        db,
        bay_id=bay_id,
        occupancy=state,
        observed_at=observed_at,
        event_id=event_id,
        source=source,
    )

    if not updated:
        # Concurrency race lost on conditional WHERE clause
        await repo.mark_event_unapplied(db, event_id)
        return "stale", event_id

    # 6. Maintain occupancy_history
    open_state = await repo.get_open_history_state(db, bay_id)
    if state in ("occupied", "free"):
        if open_state != state:
            # Transition: close previous interval and open new one
            if open_state is not None:
                await repo.close_open_history(db, bay_id, observed_at)
            await repo.open_history(db, bay_id, state, observed_at)
    elif state == "unknown" and open_state is not None:
        # Unknown state creates a gap in history
        await repo.close_open_history(db, bay_id, observed_at)

    return "applied", event_id


async def apply_occupancy(
    db: Any,
    camera: Any,
    validated: ValidatedOccupancy,
    *,
    source: str = "edge",
    now: datetime | None = None,
) -> ApplyResult:
    """
    Applies validated occupancy readings across all bays in the message:
      1. Locks current_bay_status rows in sorted bay_id order to avoid deadlocks.
      2. Processes each bay reading atomically within the transaction.
      3. Classifies results into applied, stale, or duplicates.
    """
    current_now = now or datetime.now(UTC)
    bay_ids = [bid for bid, _, _ in validated.readings]
    sorted_bay_ids = sorted(bay_ids)

    # 1. Lock rows in sorted order to guarantee deadlock-free concurrency
    locked = await repo.lock_status_rows(db, sorted_bay_ids)

    result = ApplyResult()
    camera_id = getattr(camera, "id", None)

    # 2. Process readings
    cam_config = getattr(camera, "config", {}) or {}
    conf_threshold = float(cam_config.get("conf_threshold", 0.5))
    zone_id = getattr(camera, "zone_id", None)

    for bid, raw_state, conf in validated.readings:
        # Invariant 3: Convert readings below confidence threshold to "unknown" (never store as free)
        state = "unknown" if conf < conf_threshold else raw_state

        status, _ = await apply_bay_reading(
            db,
            bay_id=bid,
            msg_id=validated.msg_id,
            camera_id=camera_id,
            state=state,
            confidence=conf,
            observed_at=validated.observed_at,
            source=source,
            now=current_now,
            stored_status=locked.get(bid),
        )

        if status == "applied":
            result.applied.append(bid)
            result.events.append({
                "event": "bay_changed",
                "data": {
                    "bay_id": str(bid),
                    "camera_id": str(camera_id) if camera_id else None,
                    "zone_id": str(zone_id) if zone_id else None,
                    "state": state,
                    "confidence": conf,
                    "observed_at": validated.observed_at.isoformat(),
                },
            })
        elif status == "stale":
            result.stale.append(bid)
        elif status == "duplicate":
            result.duplicates.append(bid)

    return result


async def touch_camera(
    db: Any,
    camera: Any,
    seen_at: datetime,
    now: datetime,
) -> None:
    """
    Updates camera last_seen_at and transitions provisioned -> online.
    Guarantees monotonicity: an older out-of-order reading cannot roll back last_seen_at.
    """
    if camera is None:
        return

    cam_id = getattr(camera, "id", None)
    if not cam_id:
        return

    capped_seen_at = min(seen_at, now)

    # Monotonicity guard: never roll back last_seen_at to an earlier timestamp
    existing_last_seen = getattr(camera, "last_seen_at", None)
    if existing_last_seen is not None and existing_last_seen >= capped_seen_at:
        return

    current_status = getattr(camera, "status", "online")

    new_status = current_status
    if current_status in ("provisioned", "offline"):
        new_status = "online"
        reason = "telemetry_resumed" if current_status == "offline" else "first_telemetry"
        await repo.insert_device_health_event(
            db,
            cam_id,
            new_status,
            {"reason": reason},
            capped_seen_at,
        )
        if current_status == "offline":
            await repo.resolve_maintenance(db, camera_id=cam_id, kind=None, resolved_at=capped_seen_at)

    await repo.set_camera_state(db, cam_id, new_status, capped_seen_at)
    if hasattr(camera, "last_seen_at"):
        camera.last_seen_at = capped_seen_at
    if hasattr(camera, "status"):
        camera.status = new_status


async def apply_health(
    db: Any,
    camera: Any,
    new_state: str,
    observed_at: datetime,
    detail: dict[str, Any] | None = None,
) -> bool:
    """
    Executes device health state transitions:
      - Ignores messages if camera.status == 'maintenance'.
      - Records health event and updates camera status only on actual change.
      - Returns True if status changed.
    """
    if camera is None:
        return False

    cam_id = getattr(camera, "id", None)
    current_status = getattr(camera, "status", "online")

    if current_status == "maintenance":
        return False

    status_changed = current_status != new_state
    if status_changed:
        await repo.insert_device_health_event(
            db,
            cam_id,
            new_state,
            detail or {},
            observed_at,
        )
        await repo.set_camera_state(db, cam_id, new_state, observed_at)
        if hasattr(camera, "status"):
            camera.status = new_state
        if new_state in ("online", "degraded") and current_status == "offline":
            await repo.resolve_maintenance(db, camera_id=cam_id, kind=None, resolved_at=observed_at)

    return status_changed
