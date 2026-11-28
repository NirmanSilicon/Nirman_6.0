"""ParkSMART - Parking Reservations API Router (File 69)."""

from __future__ import annotations

import uuid
from datetime import date

from fastapi import APIRouter, Depends, Query, Response, status
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.rbac import Role
from app.deps import CurrentUser, get_current_user, get_db, require_roles
from app.modules.reservations import repository as repo
from app.modules.reservations import service
from app.schemas.common import Page, UtcDateTime, VehicleCategory
from app.schemas.reservation import (
    ParkingReservationCreate,
    ReservationOut,
    ReservationReschedule,
    SlotOut,
    SlotQuery,
    StatusHistoryOut,
    StatusUpdate,
)

router = APIRouter()


@router.get("/slots", response_model=list[SlotOut])
async def find_available_slots(
    zone_id: uuid.UUID = Query(...),
    for_date: date = Query(..., alias="date"),
    vehicle_category: VehicleCategory = Query(...),
    duration_min: int = Query(default=60, gt=0),
    current: CurrentUser = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
) -> list[SlotOut]:
    """Queries candidate available parking slots on a specific date."""
    q = SlotQuery(
        zone_id=zone_id,
        date=for_date,
        vehicle_category=vehicle_category,
        duration_min=duration_min,
    )
    return await service.find_slots(db, current, q)


@router.post("", response_model=ReservationOut, status_code=status.HTTP_201_CREATED)
async def create_parking_reservation(
    body: ParkingReservationCreate,
    response: Response,
    current: CurrentUser = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
    _user=Depends(
        require_roles(
            Role.DRIVER,
            Role.BUSINESS_OPERATOR,
            Role.FIELD_OPERATOR,
            Role.MUNICIPAL_ADMIN,
            Role.SYSTEM_ADMIN,
        )
    ),
) -> ReservationOut:
    """Creates advance parking reservation with database-enforced non-overlap."""
    res = await service.create_parking_reservation(db, current, body)
    response.headers["Location"] = f"/api/v1/parking-reservations/{res.id}"
    return res


@router.get("", response_model=Page[ReservationOut])
async def list_parking_reservations(
    status_filter: str | None = Query(default=None, alias="status"),
    from_ts: UtcDateTime | None = Query(default=None, alias="from"),
    to_ts: UtcDateTime | None = Query(default=None, alias="to"),
    zone_id: uuid.UUID | None = Query(default=None),
    limit: int = Query(default=50, ge=1, le=200),
    offset: int = Query(default=0, ge=0),
    current: CurrentUser = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
) -> Page[ReservationOut]:
    """Lists parking reservations (own for drivers, or all for system operators)."""
    is_operator = not current.roles.isdisjoint(
        {Role.FIELD_OPERATOR, Role.MUNICIPAL_ADMIN, Role.SYSTEM_ADMIN}
    )

    if is_operator:
        items, total = await repo.list_all(
            db,
            status=status_filter,
            from_ts=from_ts,
            to_ts=to_ts,
            zone_id=zone_id,
            limit=limit,
            offset=offset,
        )
    else:
        items, total = await repo.list_for_user(
            db,
            user_id=current.id,
            status=status_filter,
            from_ts=from_ts,
            to_ts=to_ts,
            limit=limit,
            offset=offset,
        )

    return Page[ReservationOut](
        items=[service._to_reservation_out(r) for r in items],
        total=total,
        limit=limit,
        offset=offset,
    )


@router.get("/{id}", response_model=ReservationOut)
async def get_parking_reservation(
    id: uuid.UUID,
    current: CurrentUser = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
) -> ReservationOut:
    """Retrieves single parking reservation details."""
    res = await repo.get(db, id)
    if res is None:
        from app.errors import NotFound
        raise NotFound("Reservation not found")

    is_owner = res.user_id == current.id
    is_operator = not current.roles.isdisjoint(
        {Role.FIELD_OPERATOR, Role.MUNICIPAL_ADMIN, Role.SYSTEM_ADMIN}
    )
    if not (is_owner or is_operator):
        from app.errors import Forbidden
        raise Forbidden("Not authorized to view this reservation")

    return service._to_reservation_out(res)


@router.put("/{id}/schedule", response_model=ReservationOut)
@router.put("/{id}/reschedule", response_model=ReservationOut)
async def reschedule_parking_reservation(
    id: uuid.UUID,
    body: ReservationReschedule,
    current: CurrentUser = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
) -> ReservationOut:
    """Reschedules the time window of an active reservation."""
    return await service.reschedule(db, current, id, body)


@router.post("/{id}/status", response_model=ReservationOut)
@router.patch("/{id}/status", response_model=ReservationOut)
async def change_reservation_status(
    id: uuid.UUID,
    body: StatusUpdate,
    current: CurrentUser = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
) -> ReservationOut:
    """Updates reservation status along validated state machine transitions."""
    return await service.change_status(db, current, id, body)


@router.get("/{id}/history", response_model=list[StatusHistoryOut])
async def get_reservation_history(
    id: uuid.UUID,
    current: CurrentUser = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
) -> list[StatusHistoryOut]:
    """Retrieves complete transition audit trail for a reservation."""
    res = await repo.get(db, id)
    if res is None:
        from app.errors import NotFound
        raise NotFound("Reservation not found")

    is_owner = res.user_id == current.id
    is_operator = not current.roles.isdisjoint(
        {Role.FIELD_OPERATOR, Role.MUNICIPAL_ADMIN, Role.SYSTEM_ADMIN}
    )
    if not (is_owner or is_operator):
        from app.errors import Forbidden
        raise Forbidden("Not authorized to view history for this reservation")

    history_rows = await repo.list_history(db, "parking", id)
    return [
        StatusHistoryOut(
            from_status=h.from_status,
            to_status=h.to_status,
            changed_by=h.changed_by,
            reason=h.reason,
            changed_at=h.changed_at,
        )
        for h in history_rows
    ]
