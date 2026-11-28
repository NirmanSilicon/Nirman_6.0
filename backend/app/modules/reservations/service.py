"""ParkSMART - Parking Reservation Service and State Machine (File 70)."""

from __future__ import annotations

import base64
import secrets
import uuid
from datetime import datetime, timedelta
from zoneinfo import ZoneInfo

from sqlalchemy.exc import IntegrityError
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.clock import utcnow
from app.core.rbac import Role
from app.deps import CurrentUser
from app.errors import (
    BookingOverlap,
    Conflict,
    Forbidden,
    NotFound,
    ValidationFailed,
)
from app.models.reservation import ParkingReservation
from app.modules.audit import service as audit_service
from app.modules.parking import repository as park_repo
from app.modules.parking.service import effective_schedule, within_schedule
from app.modules.reservations import repository as repo
from app.schemas.common import ReservationStatus
from app.schemas.reservation import (
    ParkingReservationCreate,
    ReservationOut,
    ReservationReschedule,
    SlotOut,
    SlotQuery,
    StatusUpdate,
)

OVERLAP_CONSTRAINT = "ex_parking_reservation_no_overlap"
ACTIVE_STATUSES = frozenset({"pending", "confirmed", "checked_in", "in_progress"})
OPERATOR_ROLES = frozenset({Role.FIELD_OPERATOR, Role.MUNICIPAL_ADMIN, Role.SYSTEM_ADMIN})

# Allowed state transitions from 1.1.2 lifecycle state machine
ALLOWED_TRANSITIONS: dict[str, set[str]] = {
    "pending": {"confirmed", "cancelled", "expired"},
    "confirmed": {"checked_in", "cancelled", "no_show"},
    "checked_in": {"in_progress", "cancelled"},
    "in_progress": {"completed"},
    "completed": set(),
    "cancelled": set(),
    "no_show": set(),
    "expired": set(),
}


def new_reference() -> str:
    """Generates unique base32 reservation reference: PS-XXXXXXXXXX."""
    raw = base64.b32encode(secrets.token_bytes(10)).decode("utf-8")[:10].upper()
    return f"PS-{raw}"


def _to_reservation_out(res: ParkingReservation) -> ReservationOut:
    return ReservationOut(
        id=res.id,
        reference=res.reference,
        kind="parking",
        bay_id=res.bay_id,
        status=ReservationStatus(res.status),
        start=res.during.lower,
        end=res.during.upper,
        vehicle_category=res.vehicle_category,  # type: ignore
        business_id=None,
        delivery_info=None,
        created_at=res.created_at,
        updated_at=res.updated_at,
        checked_in_at=None,
        started_at=None,
        completed_at=None,
        cancelled_at=None,
    )


async def create_parking_reservation(
    db: AsyncSession, current: CurrentUser, body: ParkingReservationCreate
) -> ReservationOut:
    """Transactionally reserves a parking bay with database exclusion constraint overlap protection."""
    now = utcnow()
    if body.start < now - timedelta(seconds=30):
        raise ValidationFailed("Reservation start time cannot be in the past")
    if body.end <= body.start:
        raise ValidationFailed("Reservation end time must be after start time")

    facility = await park_repo.get_facility(db, body.facility_id)
    if facility is None or not facility.is_active:
        raise NotFound("Facility not found or inactive")
    if not facility.supports_reservation:
        raise ValidationFailed("Facility does not accept reservations")

    zone_row = await park_repo.get_zone_row(db, facility.zone_id)
    if zone_row is None or not zone_row.zone.is_active:
        raise NotFound("Zone not found or inactive")

    # Invariant: A zone without reservation_rules returns validation error
    if zone_row.zone.reservation_rules is None:
        raise ValidationFailed("zone reservation_rules not configured")

    city = zone_row.zone.city
    tz_str = city.tz if city else "Asia/Kolkata"

    # Eligible bays in facility sorted by code ascending
    bays = await park_repo.eligible_bays(
        db, facility.id, "regular", body.vehicle_category.value
    )
    if not bays:
        raise ValidationFailed("No bay permits this vehicle category")

    # Filter candidate bays by operating schedule
    candidate_bays = [
        b
        for b in bays
        if within_schedule(
            effective_schedule(b.operating_schedule, zone_row.zone.operating_schedule),
            body.start,
            body.end,
            tz_str,
        )
    ]
    if not candidate_bays:
        raise ValidationFailed("Outside operating hours")

    # Savepoint loop attempting insertion in ascending bay code order
    for candidate_bay in candidate_bays:
        for attempt in range(3):
            ref = new_reference()
            try:
                async with db.begin_nested():
                    res = await repo.insert_reservation(
                        db,
                        reference=ref,
                        bay_id=candidate_bay.id,
                        user_id=current.id,
                        vehicle_id=body.vehicle_id,
                        vehicle_category=body.vehicle_category.value,
                        start=body.start,
                        end=body.end,
                        status="confirmed",
                    )
                    await repo.insert_history(
                        db,
                        reservation_type="parking",
                        reservation_id=res.id,
                        from_status=None,
                        to_status="confirmed",
                        changed_by=current.id,
                        reason="Initial creation",
                    )
                    await audit_service.record(
                        db,
                        actor_user_id=current.id,
                        action="parking_reservation.create",
                        entity_type="parking_reservation",
                        entity_id=str(res.id),
                        before=None,
                        after={"reference": ref, "bay_id": str(candidate_bay.id)},
                    )
                # Success: commit full transaction
                await db.commit()
                await db.refresh(res)
                return _to_reservation_out(res)

            except IntegrityError as exc:
                err_msg = str(exc).lower()
                # If overlap constraint fired, rollback savepoint and try next bay
                if OVERLAP_CONSTRAINT in err_msg or "23p01" in err_msg:
                    break
                # If reference collided, retry with new reference
                if "uq_parking_reservation_reference" in err_msg and attempt < 2:
                    continue
                await db.rollback()
                raise Conflict("Database integrity error on reservation create") from exc

    # All candidate bays returned overlap
    raise BookingOverlap("No bay available for the requested time")


async def find_slots(db: AsyncSession, current: CurrentUser, q: SlotQuery) -> list[SlotOut]:
    """Finds advisory candidate available slots for a given zone and local date."""
    zone_row = await park_repo.get_zone_row(db, q.zone_id)
    if zone_row is None:
        raise NotFound("Zone not found")
    if zone_row.zone.reservation_rules is None:
        raise ValidationFailed("zone reservation_rules not configured")

    city = zone_row.zone.city
    tz = ZoneInfo(city.tz if city else "Asia/Kolkata")
    now = utcnow()

    # Get regular eligible bays in this zone
    facilities = await park_repo.list_facilities(db, q.zone_id)
    all_bays = []
    for f in facilities:
        fbays = await park_repo.eligible_bays(db, f.id, "regular", q.vehicle_category.value)
        all_bays.extend(fbays)

    if not all_bays:
        return []

    # Calculate day boundary in UTC
    day_local_start = datetime.combine(q.date, datetime.min.time(), tzinfo=tz)
    day_local_end = datetime.combine(q.date, datetime.max.time(), tzinfo=tz)
    day_start_utc = day_local_start.astimezone(ZoneInfo("UTC"))
    day_end_utc = day_local_end.astimezone(ZoneInfo("UTC"))

    bay_ids = [b.id for b in all_bays]
    busy = await repo.busy_ranges(db, bay_ids, day_start_utc, day_end_utc)

    slots: list[SlotOut] = []
    step = timedelta(minutes=q.duration_min)

    for bay in all_bays:
        cur_t = day_start_utc
        bay_busy = busy.get(bay.id, [])
        sched = effective_schedule(bay.operating_schedule, zone_row.zone.operating_schedule)

        while cur_t + step <= day_end_utc:
            slot_end = cur_t + step
            # Must be in future and within operating schedule
            if cur_t >= now and within_schedule(sched, cur_t, slot_end, tz.key):
                # Check collision with busy intervals [busy_start, busy_end)
                collides = any(
                    not (slot_end <= b_start or cur_t >= b_end)
                    for b_start, b_end in bay_busy
                )
                if not collides:
                    slots.append(SlotOut(bay_id=bay.id, start=cur_t, end=slot_end))
            cur_t += step

    return slots


async def change_status(
    db: AsyncSession,
    current: CurrentUser,
    reservation_id: uuid.UUID,
    body: StatusUpdate,
) -> ReservationOut:
    """Transitions a reservation through its validated lifecycle state machine."""
    now = utcnow()
    res = await repo.get_for_update(db, reservation_id)
    if res is None:
        raise NotFound("Reservation not found")

    is_owner = res.user_id == current.id
    is_operator = not current.roles.isdisjoint(OPERATOR_ROLES)
    if not (is_owner or is_operator):
        raise Forbidden("Insufficient permissions to modify this reservation")

    to_st = body.to_status.value
    cur_st = res.status

    # System-driven statuses cannot be invoked by clients
    if to_st in ("no_show", "expired"):
        raise Forbidden("Status is system-only and cannot be manually set")

    allowed_next = ALLOWED_TRANSITIONS.get(cur_st, set())
    if to_st not in allowed_next:
        raise Conflict(
            f"Invalid status transition from {cur_st} to {to_st}",
            {"from": cur_st, "to": to_st},
        )

    # Load zone reservation rules for grace / cancellation periods
    bay = await park_repo.get_bay(db, res.bay_id)
    fac = await park_repo.get_facility(db, bay.facility_id) if bay else None
    zone_row = await park_repo.get_zone_row(db, fac.zone_id) if fac else None
    rules = zone_row.zone.reservation_rules if zone_row else None

    if rules is None:
        raise Conflict("zone reservation_rules not configured")

    grace_min = rules.get("grace_min", 15)
    cancel_cutoff_min = rules.get("cancel_cutoff_min", 30)

    # Transition validation logic
    if (
        cur_st == "confirmed"
        and to_st == "checked_in"
        and (now > res.during.lower + timedelta(minutes=grace_min) or now >= res.during.upper)
    ):
        # Check-in allowed within grace period and before end
        raise Conflict("Check-in window closed")

    if (
        cur_st == "confirmed"
        and to_st == "cancelled"
        and not is_operator
        and now > res.during.lower - timedelta(minutes=cancel_cutoff_min)
    ):
        # Cancel cutoff check unless actor is operator
        raise Conflict("Cancellation cutoff passed")

    await repo.update_status(db, res, to_st, cancel_reason=body.reason)
    await repo.insert_history(
        db,
        reservation_type="parking",
        reservation_id=res.id,
        from_status=cur_st,
        to_status=to_st,
        changed_by=current.id,
        reason=body.reason,
    )
    await audit_service.record(
        db,
        actor_user_id=current.id,
        action="parking_reservation.status",
        entity_type="parking_reservation",
        entity_id=str(res.id),
        before={"status": cur_st},
        after={"status": to_st, "reason": body.reason},
    )
    await db.commit()
    await db.refresh(res)
    return _to_reservation_out(res)


async def reschedule(
    db: AsyncSession,
    current: CurrentUser,
    reservation_id: uuid.UUID,
    body: ReservationReschedule,
) -> ReservationOut:
    """Updates the time range of an existing pending or confirmed reservation."""
    now = utcnow()
    if body.start < now:
        raise ValidationFailed("New start time cannot be in the past")
    if body.end <= body.start:
        raise ValidationFailed("New end time must be after start time")

    res = await repo.get_for_update(db, reservation_id)
    if res is None:
        raise NotFound("Reservation not found")

    is_owner = res.user_id == current.id
    is_operator = not current.roles.isdisjoint(OPERATOR_ROLES)
    if not (is_owner or is_operator):
        raise Forbidden("Insufficient permissions to reschedule this reservation")

    if res.status not in ("pending", "confirmed"):
        raise Conflict("Only pending or confirmed reservations can be rescheduled")

    # Cancellation cutoff verification
    bay = await park_repo.get_bay(db, res.bay_id)
    fac = await park_repo.get_facility(db, bay.facility_id) if bay else None
    zone_row = await park_repo.get_zone_row(db, fac.zone_id) if fac else None
    rules = zone_row.zone.reservation_rules if zone_row else None
    if rules is None:
        raise Conflict("zone reservation_rules not configured")

    cancel_cutoff_min = rules.get("cancel_cutoff_min", 30)
    if not is_operator and now > res.during.lower - timedelta(minutes=cancel_cutoff_min):
        raise Conflict("Cancellation cutoff passed; cannot reschedule")

    # Operating schedule check
    city = zone_row.zone.city if zone_row else None
    tz_str = city.tz if city else "Asia/Kolkata"
    sched = effective_schedule(bay.operating_schedule, zone_row.zone.operating_schedule)
    if not within_schedule(sched, body.start, body.end, tz_str):
        raise ValidationFailed("New time is outside operating hours")

    old_during = f"[{res.during.lower.isoformat()}, {res.during.upper.isoformat()})"
    try:
        async with db.begin_nested():
            await repo.update_during(db, res, body.start, body.end)
            await repo.insert_history(
                db,
                reservation_type="parking",
                reservation_id=res.id,
                from_status=res.status,
                to_status=res.status,
                changed_by=current.id,
                reason="rescheduled",
            )
            await audit_service.record(
                db,
                actor_user_id=current.id,
                action="parking_reservation.reschedule",
                entity_type="parking_reservation",
                entity_id=str(res.id),
                before={"during": old_during},
                after={"during": f"[{body.start.isoformat()}, {body.end.isoformat()})"},
            )
        await db.commit()
        await db.refresh(res)
        return _to_reservation_out(res)
    except IntegrityError as exc:
        err_msg = str(exc).lower()
        if OVERLAP_CONSTRAINT in err_msg or "23p01" in err_msg:
            raise BookingOverlap("The requested new time window is not available") from exc
        raise Conflict("Reschedule failed due to constraint violation") from exc


async def system_transition(
    db: AsyncSession, reservation_id: uuid.UUID, to_status: str, reason: str
) -> bool:
    """Applies automated time-driven transitions by the background lifecycle worker."""
    res = await repo.get_for_update(db, reservation_id)
    if res is None:
        return False

    cur_st = res.status
    allowed_next = ALLOWED_TRANSITIONS.get(cur_st, set())
    if to_status not in allowed_next:
        return False

    await repo.update_status(db, res, to_status, cancel_reason=reason)
    await repo.insert_history(
        db,
        reservation_type="parking",
        reservation_id=res.id,
        from_status=cur_st,
        to_status=to_status,
        changed_by=None,
        reason=reason,
    )
    await db.commit()
    return True
