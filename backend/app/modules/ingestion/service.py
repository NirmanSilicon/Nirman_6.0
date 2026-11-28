"""
ParkSMART - Ingestion Service (File 78 / M2 Ownership)

Responsibility:
Orchestrates validated device messages into state changes:
- Fast in-memory deduplication check (dedup.cache.seen).
- Database-backed idempotent state application (state_manager.apply_occupancy).
- Updates camera last_seen_at and transitions provisioned -> online.
- Collects real-time events for SSE hub distribution after transaction commit.
- Labels provenance as 'simulator' if camera name starts with 'SIM-', else 'edge'.
"""

from __future__ import annotations

import uuid
from dataclasses import dataclass, field
from datetime import UTC, datetime
from typing import Any

from app.modules.ingestion import dedup, state_manager, validator
from app.modules.ingestion import repository as repo
from app.modules.ingestion.validator import ValidatedOccupancy


@dataclass
class IngestResult:
    """Consolidated ingestion outcome."""

    accepted: bool
    duplicate: bool
    applied_bays: int
    stale_bays: int
    events: list[dict[str, Any]] = field(default_factory=list)


def source_for_camera(camera: Any) -> str:
    """Returns 'simulator' when camera.name starts with 'SIM-', else 'edge'."""
    name = getattr(camera, "name", "") or ""
    return "simulator" if name.startswith("SIM-") else "edge"


async def handle_occupancy(
    db: Any,
    camera: Any,
    msg: Any,
    *,
    hub: Any = None,
    now: datetime | None = None,
    topic_zone: uuid.UUID | str | None = None,
    settings: Any = None,
) -> IngestResult:
    """
    Coordinates occupancy ingestion with multi-layer idempotency protection:
      1. Validates envelope, active camera, zone/camera match, and future skew.
      2. Layer 1: Fast in-memory cache check (dedup.cache.seen).
      3. Layer 2: Database-enforced unique constraint on uq_occupancy_event_msg_bay.
      4. Layer 3: Out-of-order check (WHERE observed_at > stored.observed_at).
      5. Remembers msg_id in in-memory cache only after successful execution.
    """
    curr_now = now or datetime.now(UTC)

    # 1. Validation (raises IngestRejected on invalid payload)
    validated: ValidatedOccupancy = await validator.validate_occupancy(
        db, camera, topic_zone, msg, settings=settings, now=curr_now
    )

    # 2. Fast in-memory deduplication check
    if dedup.cache.seen(validated.msg_id):
        return IngestResult(
            accepted=True,
            duplicate=True,
            applied_bays=0,
            stale_bays=0,
            events=[],
        )

    # 3. Database state application
    source = source_for_camera(camera)
    apply_res = await state_manager.apply_occupancy(
        db, camera, validated, source=source, now=curr_now
    )

    is_duplicate = len(apply_res.duplicates) == len(validated.readings) and len(apply_res.applied) == 0

    # 4. In-memory cache insertion (only after successful processing)
    dedup.cache.remember(validated.msg_id)

    # 5. Update camera last seen if not duplicate and not entirely stale
    if not is_duplicate and len(apply_res.applied) > 0:
        await state_manager.touch_camera(db, camera, validated.observed_at, curr_now)

    # 6. Realtime events collection
    events: list[dict[str, Any]] = []
    zone_id = getattr(camera, "zone_id", None)
    if apply_res.applied:
        for bid in apply_res.applied:
            events.append({
                "event": "bay_changed",
                "data": {
                    "bay_id": str(bid),
                    "zone_id": str(zone_id) if zone_id else None,
                    "observed_at": validated.observed_at.isoformat(),
                },
            })
        if zone_id:
            events.append({
                "event": "zone_summary",
                "data": {"zone_id": str(zone_id)},
            })

    return IngestResult(
        accepted=True,
        duplicate=is_duplicate,
        applied_bays=len(apply_res.applied),
        stale_bays=len(apply_res.stale),
        events=events,
    )


async def handle_crowd(
    db: Any,
    camera: Any,
    msg: Any,
    *,
    hub: Any = None,
    now: datetime | None = None,
    topic_zone: uuid.UUID | str | None = None,
    settings: Any = None,
) -> IngestResult:
    """Coordinates crowd and count observation ingestion with unique constraint idempotency."""
    curr_now = now or datetime.now(UTC)
    validated = await validator.validate_crowd(
        db, camera, topic_zone, msg, settings=settings, now=curr_now
    )
    msg_id = uuid.UUID(str(validated["msg_id"]))

    if dedup.cache.seen(msg_id):
        return IngestResult(accepted=True, duplicate=True, applied_bays=0, stale_bays=0, events=[])

    cam_id = getattr(camera, "id", None) or uuid.UUID(str(validated["camera_id"]))
    zone_id = getattr(camera, "zone_id", None) or uuid.UUID(str(topic_zone or cam_id))
    obs_at = validator.parse_utc_timestamp(validated["ts"])
    source = source_for_camera(camera)

    inserted = await repo.insert_observations(
        db,
        zone_id=zone_id,
        camera_id=cam_id,
        observed_at=obs_at,
        interval_s=validated["interval_s"],
        vehicle_count=validated["vehicle_count"],
        by_category=validated.get("vehicle_by_category", {}),
        pedestrian_count=validated["pedestrian_count"],
        density_per_m2=validated.get("density_per_m2"),
        quality=validated.get("quality", "ok"),
        source=source,
    )

    dedup.cache.remember(msg_id)
    await state_manager.touch_camera(db, camera, obs_at, curr_now)

    events: list[dict[str, Any]] = []
    if inserted and zone_id:
        events.append({"event": "crowd_changed", "data": {"zone_id": str(zone_id)}})

    return IngestResult(
        accepted=True,
        duplicate=not inserted,
        applied_bays=0,
        stale_bays=0,
        events=events,
    )


async def handle_health(
    db: Any,
    camera: Any,
    msg: Any,
    *,
    hub: Any = None,
    now: datetime | None = None,
    topic_zone: uuid.UUID | str | None = None,
    settings: Any = None,
    from_lwt: bool = False,
) -> IngestResult:
    """Coordinates device health telemetry and LWT handling."""
    curr_now = now or datetime.now(UTC)
    validated = validator.validate_health(
        camera, topic_zone, msg, settings=settings, now=curr_now
    )
    msg_id = uuid.UUID(str(validated["msg_id"]))

    if dedup.cache.seen(msg_id):
        return IngestResult(accepted=True, duplicate=True, applied_bays=0, stale_bays=0, events=[])

    obs_at = validator.parse_utc_timestamp(validated["ts"])
    changed = await state_manager.apply_health(
        db,
        camera,
        new_state=validated["state"],
        observed_at=obs_at,
        detail={"errors": validated.get("errors", []), "from_lwt": from_lwt},
    )

    dedup.cache.remember(msg_id)
    await state_manager.touch_camera(db, camera, obs_at, curr_now)

    events: list[dict[str, Any]] = []
    cam_id = getattr(camera, "id", None)
    if changed and cam_id:
        events.append({
            "event": "device_health",
            "data": {"camera_id": str(cam_id), "state": validated["state"]},
        })

    return IngestResult(
        accepted=True,
        duplicate=False,
        applied_bays=0,
        stale_bays=0,
        events=events,
    )
