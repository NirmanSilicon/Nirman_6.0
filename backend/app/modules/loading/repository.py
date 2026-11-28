"""ParkSMART - Commercial Loading Reservations SQL Repository (File 75)."""

from __future__ import annotations

import uuid
from datetime import datetime
from typing import Any

from sqlalchemy import Integer, cast, func, select
from sqlalchemy.dialects.postgresql import Range
from sqlalchemy.ext.asyncio import AsyncSession

from app.models.infra import ParkingBay, ParkingFacility, Zone
from app.models.reservation import LoadingReservation


async def insert_reservation(
    db: AsyncSession,
    *,
    reference: str,
    bay_id: uuid.UUID,
    business_id: uuid.UUID,
    created_by: uuid.UUID,
    vehicle_id: uuid.UUID | None,
    vehicle_category: str,
    start: datetime,
    end: datetime,
    status: str = "confirmed",
    delivery_info: dict[str, Any],
) -> LoadingReservation:
    """Inserts a loading reservation within the caller's transaction/savepoint."""
    during_range = Range(start, end, bounds="[)")
    res = LoadingReservation(
        reference=reference,
        bay_id=bay_id,
        business_id=business_id,
        created_by=created_by,
        vehicle_id=vehicle_id,
        vehicle_category=vehicle_category,
        during=during_range,
        status=status,
        delivery_info=delivery_info,
    )
    db.add(res)
    await db.flush()
    return res


async def get_for_update(
    db: AsyncSession, reservation_id: uuid.UUID
) -> LoadingReservation | None:
    """Locks a loading reservation row FOR UPDATE."""
    stmt = (
        select(LoadingReservation)
        .where(LoadingReservation.id == reservation_id)
        .with_for_update()
    )
    res = await db.execute(stmt)
    return res.scalar_one_or_none()


async def get(db: AsyncSession, reservation_id: uuid.UUID) -> LoadingReservation | None:
    """Retrieves loading reservation by UUID."""
    res = await db.execute(
        select(LoadingReservation).where(LoadingReservation.id == reservation_id)
    )
    return res.scalar_one_or_none()


async def list_for_business(
    db: AsyncSession,
    business_ids: list[uuid.UUID],
    status: str | None = None,
    from_ts: datetime | None = None,
    to_ts: datetime | None = None,
    limit: int = 50,
    offset: int = 0,
) -> tuple[list[LoadingReservation], int]:
    """Retrieves paginated loading reservations for businesses."""
    if not business_ids:
        return [], 0

    stmt = select(LoadingReservation).where(LoadingReservation.business_id.in_(business_ids))
    count_stmt = select(func.count(LoadingReservation.id)).where(LoadingReservation.business_id.in_(business_ids))

    if status and status != "all":
        stmt = stmt.where(LoadingReservation.status == status)
        count_stmt = count_stmt.where(LoadingReservation.status == status)
    if from_ts is not None:
        stmt = stmt.where(func.lower(LoadingReservation.during) >= from_ts)
        count_stmt = count_stmt.where(func.lower(LoadingReservation.during) >= from_ts)
    if to_ts is not None:
        stmt = stmt.where(func.upper(LoadingReservation.during) <= to_ts)
        count_stmt = count_stmt.where(func.upper(LoadingReservation.during) <= to_ts)

    stmt = stmt.order_by(func.lower(LoadingReservation.during).desc()).limit(limit).offset(offset)
    total = (await db.execute(count_stmt)).scalar_one()
    items = (await db.execute(stmt)).scalars().all()
    return list(items), total


async def list_all(
    db: AsyncSession,
    status: str | None = None,
    from_ts: datetime | None = None,
    to_ts: datetime | None = None,
    limit: int = 50,
    offset: int = 0,
) -> tuple[list[LoadingReservation], int]:
    """Administrator listing of all loading reservations."""
    stmt = select(LoadingReservation)
    count_stmt = select(func.count(LoadingReservation.id))

    if status and status != "all":
        stmt = stmt.where(LoadingReservation.status == status)
        count_stmt = count_stmt.where(LoadingReservation.status == status)
    if from_ts is not None:
        stmt = stmt.where(func.lower(LoadingReservation.during) >= from_ts)
        count_stmt = count_stmt.where(func.lower(LoadingReservation.during) >= from_ts)
    if to_ts is not None:
        stmt = stmt.where(func.upper(LoadingReservation.during) <= to_ts)
        count_stmt = count_stmt.where(func.upper(LoadingReservation.during) <= to_ts)

    stmt = stmt.order_by(func.lower(LoadingReservation.during).desc()).limit(limit).offset(offset)
    total = (await db.execute(count_stmt)).scalar_one()
    items = (await db.execute(stmt)).scalars().all()
    return list(items), total


async def update_status(
    db: AsyncSession,
    res: LoadingReservation,
    to_status: str,
    *,
    timestamps: dict[str, datetime],
    cancel_reason: str | None = None,
) -> None:
    """Updates status and transition timestamps."""
    res.status = to_status
    if cancel_reason is not None:
        res.cancel_reason = cancel_reason
    for attr, val in timestamps.items():
        if hasattr(res, attr):
            setattr(res, attr, val)
    await db.flush()


async def update_during(
    db: AsyncSession, res: LoadingReservation, start: datetime, end: datetime
) -> None:
    """Updates loading reservation range."""
    res.during = Range(start, end, bounds="[)")
    await db.flush()


async def busy_bays(
    db: AsyncSession, zone_id: uuid.UUID, start: datetime, end: datetime
) -> set[uuid.UUID]:
    """Finds all loading bay IDs in a zone busy during [start, end)."""
    active_statuses = ("pending", "confirmed", "checked_in", "in_progress")
    req_range = Range(start, end, bounds="[)")
    stmt = (
        select(LoadingReservation.bay_id)
        .join(ParkingBay, LoadingReservation.bay_id == ParkingBay.id)
        .join(ParkingFacility, ParkingBay.facility_id == ParkingFacility.id)
        .where(
            ParkingFacility.zone_id == zone_id,
            LoadingReservation.status.in_(active_statuses),
            LoadingReservation.during.op("&&")(req_range),
        )
    )
    rows = (await db.execute(stmt)).scalars().all()
    return set(rows)


async def busy_ranges(
    db: AsyncSession, bay_ids: list[uuid.UUID], day_start: datetime, day_end: datetime
) -> dict[uuid.UUID, list[tuple[datetime, datetime]]]:
    """Finds busy ranges for given loading bays across a specific day."""
    if not bay_ids:
        return {}

    active_statuses = ("pending", "confirmed", "checked_in", "in_progress")
    day_range = Range(day_start, day_end, bounds="[)")
    stmt = (
        select(LoadingReservation.bay_id, LoadingReservation.during)
        .where(
            LoadingReservation.bay_id.in_(bay_ids),
            LoadingReservation.status.in_(active_statuses),
            LoadingReservation.during.op("&&")(day_range),
        )
    )
    rows = (await db.execute(stmt)).all()
    result: dict[uuid.UUID, list[tuple[datetime, datetime]]] = {bid: [] for bid in bay_ids}
    for bid, rng in rows:
        result[bid].append((rng.lower, rng.upper))
    return result


async def due_pending_expiry(db: AsyncSession, now: datetime) -> list[uuid.UUID]:
    stmt = (
        select(LoadingReservation.id)
        .join(ParkingBay, LoadingReservation.bay_id == ParkingBay.id)
        .join(ParkingFacility, ParkingBay.facility_id == ParkingFacility.id)
        .join(Zone, ParkingFacility.zone_id == Zone.id)
        .where(
            LoadingReservation.status == "pending",
            Zone.reservation_rules.is_not(None),
            LoadingReservation.created_at
            + func.make_interval(
                0, 0, 0, 0, 0, cast(Zone.reservation_rules["pending_ttl_min"].as_string(), Integer)
            )
            < now,
        )
        .limit(500)
    )
    return list((await db.execute(stmt)).scalars().all())


async def due_no_show(db: AsyncSession, now: datetime) -> list[uuid.UUID]:
    stmt = (
        select(LoadingReservation.id)
        .join(ParkingBay, LoadingReservation.bay_id == ParkingBay.id)
        .join(ParkingFacility, ParkingBay.facility_id == ParkingFacility.id)
        .join(Zone, ParkingFacility.zone_id == Zone.id)
        .where(
            LoadingReservation.status == "confirmed",
            Zone.reservation_rules.is_not(None),
            func.lower(LoadingReservation.during)
            + func.make_interval(
                0, 0, 0, 0, 0, cast(Zone.reservation_rules["grace_min"].as_string(), Integer)
            )
            < now,
        )
        .limit(500)
    )
    return list((await db.execute(stmt)).scalars().all())


async def due_completion(db: AsyncSession, now: datetime) -> list[uuid.UUID]:
    stmt = (
        select(LoadingReservation.id)
        .join(ParkingBay, LoadingReservation.bay_id == ParkingBay.id)
        .join(ParkingFacility, ParkingBay.facility_id == ParkingFacility.id)
        .join(Zone, ParkingFacility.zone_id == Zone.id)
        .where(
            LoadingReservation.status == "in_progress",
            Zone.reservation_rules.is_not(None),
            func.upper(LoadingReservation.during)
            + func.make_interval(
                0, 0, 0, 0, 0, cast(Zone.reservation_rules["overstay_grace_min"].as_string(), Integer)
            )
            < now,
        )
        .limit(500)
    )
    return list((await db.execute(stmt)).scalars().all())
