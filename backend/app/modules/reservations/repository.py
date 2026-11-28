"""ParkSMART - Parking Reservations SQL Repository (File 71)."""

from __future__ import annotations

import uuid
from datetime import datetime

from sqlalchemy import Integer, cast, func, select
from sqlalchemy.dialects.postgresql import Range
from sqlalchemy.ext.asyncio import AsyncSession

from app.models.infra import ParkingBay, ParkingFacility, Zone
from app.models.reservation import ParkingReservation, ReservationStatusHistory


async def insert_reservation(
    db: AsyncSession,
    *,
    reference: str,
    bay_id: uuid.UUID,
    user_id: uuid.UUID,
    vehicle_id: uuid.UUID | None,
    vehicle_category: str,
    start: datetime,
    end: datetime,
    status: str = "confirmed",
) -> ParkingReservation:
    """Inserts a reservation within the caller's transaction/savepoint."""
    # Build half-open interval [start, end)
    during_range = Range(start, end, bounds="[)")
    res = ParkingReservation(
        reference=reference,
        bay_id=bay_id,
        user_id=user_id,
        vehicle_id=vehicle_id,
        vehicle_category=vehicle_category,
        during=during_range,
        status=status,
    )
    db.add(res)
    await db.flush()
    return res


async def get_for_update(
    db: AsyncSession, reservation_id: uuid.UUID
) -> ParkingReservation | None:
    """Locks a reservation row FOR UPDATE to guard state machine transitions."""
    stmt = (
        select(ParkingReservation)
        .where(ParkingReservation.id == reservation_id)
        .with_for_update()
    )
    res = await db.execute(stmt)
    return res.scalar_one_or_none()


async def get(db: AsyncSession, reservation_id: uuid.UUID) -> ParkingReservation | None:
    """Retrieves reservation by UUID."""
    res = await db.execute(
        select(ParkingReservation).where(ParkingReservation.id == reservation_id)
    )
    return res.scalar_one_or_none()


async def list_for_user(
    db: AsyncSession,
    user_id: uuid.UUID,
    status: str | None = None,
    from_ts: datetime | None = None,
    to_ts: datetime | None = None,
    limit: int = 50,
    offset: int = 0,
) -> tuple[list[ParkingReservation], int]:
    """Retrieves paginated reservations created by a specific user."""
    stmt = select(ParkingReservation).where(ParkingReservation.user_id == user_id)
    count_stmt = select(func.count(ParkingReservation.id)).where(ParkingReservation.user_id == user_id)

    if status and status != "all":
        stmt = stmt.where(ParkingReservation.status == status)
        count_stmt = count_stmt.where(ParkingReservation.status == status)
    if from_ts is not None:
        stmt = stmt.where(func.lower(ParkingReservation.during) >= from_ts)
        count_stmt = count_stmt.where(func.lower(ParkingReservation.during) >= from_ts)
    if to_ts is not None:
        stmt = stmt.where(func.upper(ParkingReservation.during) <= to_ts)
        count_stmt = count_stmt.where(func.upper(ParkingReservation.during) <= to_ts)

    stmt = stmt.order_by(func.lower(ParkingReservation.during).desc()).limit(limit).offset(offset)
    total = (await db.execute(count_stmt)).scalar_one()
    items = (await db.execute(stmt)).scalars().all()
    return list(items), total


async def list_all(
    db: AsyncSession,
    status: str | None = None,
    from_ts: datetime | None = None,
    to_ts: datetime | None = None,
    zone_id: uuid.UUID | None = None,
    limit: int = 50,
    offset: int = 0,
) -> tuple[list[ParkingReservation], int]:
    """Administrator query listing all parking reservations."""
    stmt = select(ParkingReservation)
    count_stmt = select(func.count(ParkingReservation.id))

    if zone_id is not None:
        join_clause = (
            select(ParkingBay.id)
            .join(ParkingFacility, ParkingBay.facility_id == ParkingFacility.id)
            .where(ParkingFacility.zone_id == zone_id)
        )
        stmt = stmt.where(ParkingReservation.bay_id.in_(join_clause))
        count_stmt = count_stmt.where(ParkingReservation.bay_id.in_(join_clause))

    if status and status != "all":
        stmt = stmt.where(ParkingReservation.status == status)
        count_stmt = count_stmt.where(ParkingReservation.status == status)
    if from_ts is not None:
        stmt = stmt.where(func.lower(ParkingReservation.during) >= from_ts)
        count_stmt = count_stmt.where(func.lower(ParkingReservation.during) >= from_ts)
    if to_ts is not None:
        stmt = stmt.where(func.upper(ParkingReservation.during) <= to_ts)
        count_stmt = count_stmt.where(func.upper(ParkingReservation.during) <= to_ts)

    stmt = stmt.order_by(func.lower(ParkingReservation.during).desc()).limit(limit).offset(offset)
    total = (await db.execute(count_stmt)).scalar_one()
    items = (await db.execute(stmt)).scalars().all()
    return list(items), total


async def update_status(
    db: AsyncSession,
    res: ParkingReservation,
    to_status: str,
    cancel_reason: str | None = None,
) -> None:
    """Updates reservation status and cancellation reason."""
    res.status = to_status
    if cancel_reason is not None:
        res.cancel_reason = cancel_reason
    await db.flush()


async def update_during(
    db: AsyncSession, res: ParkingReservation, start: datetime, end: datetime
) -> None:
    """Updates half-open during range."""
    res.during = Range(start, end, bounds="[)")
    await db.flush()


async def insert_history(
    db: AsyncSession,
    *,
    reservation_type: str,
    reservation_id: uuid.UUID,
    from_status: str | None,
    to_status: str,
    changed_by: uuid.UUID | None,
    reason: str | None,
) -> None:
    """Records a status transition event in reservation_status_history."""
    h = ReservationStatusHistory(
        reservation_type=reservation_type,
        reservation_id=reservation_id,
        from_status=from_status,
        to_status=to_status,
        changed_by=changed_by,
        reason=reason,
    )
    db.add(h)
    await db.flush()


async def list_history(
    db: AsyncSession, reservation_type: str, reservation_id: uuid.UUID
) -> list[ReservationStatusHistory]:
    """Lists status transition history for a reservation."""
    stmt = (
        select(ReservationStatusHistory)
        .where(
            ReservationStatusHistory.reservation_type == reservation_type,
            ReservationStatusHistory.reservation_id == reservation_id,
        )
        .order_by(ReservationStatusHistory.changed_at.asc())
    )
    res = await db.execute(stmt)
    return list(res.scalars().all())


async def busy_ranges(
    db: AsyncSession, bay_ids: list[uuid.UUID], day_start: datetime, day_end: datetime
) -> dict[uuid.UUID, list[tuple[datetime, datetime]]]:
    """Finds all busy intervals on the given bays overlapping the specified day interval."""
    if not bay_ids:
        return {}

    active_statuses = ("pending", "confirmed", "checked_in", "in_progress")
    day_range = Range(day_start, day_end, bounds="[)")
    stmt = (
        select(ParkingReservation.bay_id, ParkingReservation.during)
        .where(
            ParkingReservation.bay_id.in_(bay_ids),
            ParkingReservation.status.in_(active_statuses),
            ParkingReservation.during.op("&&")(day_range),
        )
    )
    rows = (await db.execute(stmt)).all()
    result: dict[uuid.UUID, list[tuple[datetime, datetime]]] = {bid: [] for bid in bay_ids}
    for bid, rng in rows:
        result[bid].append((rng.lower, rng.upper))
    return result


async def due_pending_expiry(db: AsyncSession, now: datetime) -> list[uuid.UUID]:
    """Queries pending reservations exceeding their zone pending_ttl_min."""
    stmt = (
        select(ParkingReservation.id)
        .join(ParkingBay, ParkingReservation.bay_id == ParkingBay.id)
        .join(ParkingFacility, ParkingBay.facility_id == ParkingFacility.id)
        .join(Zone, ParkingFacility.zone_id == Zone.id)
        .where(
            ParkingReservation.status == "pending",
            Zone.reservation_rules.is_not(None),
            ParkingReservation.created_at
            + func.make_interval(
                0, 0, 0, 0, 0, cast(Zone.reservation_rules["pending_ttl_min"].as_string(), Integer)
            )
            < now,
        )
        .limit(500)
    )
    return list((await db.execute(stmt)).scalars().all())


async def due_no_show(db: AsyncSession, now: datetime) -> list[uuid.UUID]:
    """Queries confirmed reservations past start + grace_min without check-in."""
    stmt = (
        select(ParkingReservation.id)
        .join(ParkingBay, ParkingReservation.bay_id == ParkingBay.id)
        .join(ParkingFacility, ParkingBay.facility_id == ParkingFacility.id)
        .join(Zone, ParkingFacility.zone_id == Zone.id)
        .where(
            ParkingReservation.status == "confirmed",
            Zone.reservation_rules.is_not(None),
            func.lower(ParkingReservation.during)
            + func.make_interval(
                0, 0, 0, 0, 0, cast(Zone.reservation_rules["grace_min"].as_string(), Integer)
            )
            < now,
        )
        .limit(500)
    )
    return list((await db.execute(stmt)).scalars().all())


async def due_completion(db: AsyncSession, now: datetime) -> list[uuid.UUID]:
    """Queries in-progress reservations past end + overstay_grace_min."""
    stmt = (
        select(ParkingReservation.id)
        .join(ParkingBay, ParkingReservation.bay_id == ParkingBay.id)
        .join(ParkingFacility, ParkingBay.facility_id == ParkingFacility.id)
        .join(Zone, ParkingFacility.zone_id == Zone.id)
        .where(
            ParkingReservation.status == "in_progress",
            Zone.reservation_rules.is_not(None),
            func.upper(ParkingReservation.during)
            + func.make_interval(
                0, 0, 0, 0, 0, cast(Zone.reservation_rules["overstay_grace_min"].as_string(), Integer)
            )
            < now,
        )
        .limit(500)
    )
    return list((await db.execute(stmt)).scalars().all())
