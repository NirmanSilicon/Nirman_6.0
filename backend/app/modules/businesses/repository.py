"""ParkSMART - Business and Fleet Persistence Repository (File 63)."""

from __future__ import annotations

import uuid

from sqlalchemy import func, select
from sqlalchemy.ext.asyncio import AsyncSession

from app.models.business import Business, BusinessMember, Vehicle
from app.models.reservation import LoadingReservation
from app.models.user import User


async def create_business(
    db: AsyncSession,
    *,
    name: str,
    registration_no: str | None = None,
    created_by: uuid.UUID | None = None,
    status: str = "pending",
) -> Business:
    """Creates a business record."""
    biz = Business(
        name=name,
        registration_no=registration_no,
        created_by=created_by,
        status=status,
    )
    db.add(biz)
    await db.flush()
    return biz


async def add_member(
    db: AsyncSession,
    *,
    business_id: uuid.UUID,
    user_id: uuid.UUID,
    member_role: str,
) -> BusinessMember:
    """Adds a user as a member to a business."""
    member = BusinessMember(
        business_id=business_id,
        user_id=user_id,
        member_role=member_role,
    )
    db.add(member)
    await db.flush()
    return member


async def get_business(db: AsyncSession, business_id: uuid.UUID) -> Business | None:
    """Retrieves business by ID."""
    res = await db.execute(select(Business).where(Business.id == business_id))
    return res.scalar_one_or_none()


async def get_membership(
    db: AsyncSession, business_id: uuid.UUID, user_id: uuid.UUID
) -> BusinessMember | None:
    """Retrieves specific user membership record in a business."""
    stmt = select(BusinessMember).where(
        BusinessMember.business_id == business_id,
        BusinessMember.user_id == user_id,
    )
    res = await db.execute(stmt)
    return res.scalar_one_or_none()


async def list_memberships_for_user(
    db: AsyncSession, user_id: uuid.UUID
) -> list[tuple[Business, BusinessMember]]:
    """Retrieves all businesses that a user belongs to."""
    stmt = (
        select(Business, BusinessMember)
        .join(BusinessMember, Business.id == BusinessMember.business_id)
        .where(BusinessMember.user_id == user_id)
        .order_by(Business.created_at.desc())
    )
    res = await db.execute(stmt)
    return [(row[0], row[1]) for row in res.all()]


async def lock_members(db: AsyncSession, business_id: uuid.UUID) -> list[BusinessMember]:
    """Locks all membership rows for a business in a stable order FOR UPDATE."""
    stmt = (
        select(BusinessMember)
        .where(BusinessMember.business_id == business_id)
        .order_by(BusinessMember.user_id)
        .with_for_update()
    )
    res = await db.execute(stmt)
    return list(res.scalars().all())


async def list_members(
    db: AsyncSession, business_id: uuid.UUID
) -> list[tuple[BusinessMember, User]]:
    """Lists all members and their user profiles in a business."""
    stmt = (
        select(BusinessMember, User)
        .join(User, BusinessMember.user_id == User.id)
        .where(BusinessMember.business_id == business_id)
        .order_by(BusinessMember.member_role, User.full_name)
    )
    res = await db.execute(stmt)
    return [(row[0], row[1]) for row in res.all()]


async def update_member_role(
    db: AsyncSession, member: BusinessMember, role: str
) -> None:
    """Updates member role (owner or staff)."""
    member.member_role = role
    await db.flush()


async def delete_member(db: AsyncSession, member: BusinessMember) -> None:
    """Removes a membership."""
    await db.delete(member)
    await db.flush()


async def set_status(db: AsyncSession, business: Business, status: str) -> None:
    """Updates business approval status."""
    business.status = status
    await db.flush()


async def list_vehicles(db: AsyncSession, business_id: uuid.UUID) -> list[Vehicle]:
    """Retrieves vehicles registered under a business."""
    stmt = select(Vehicle).where(Vehicle.business_id == business_id).order_by(Vehicle.plate)
    res = await db.execute(stmt)
    return list(res.scalars().all())


async def get_vehicle(
    db: AsyncSession, business_id: uuid.UUID, vehicle_id: uuid.UUID
) -> Vehicle | None:
    """Retrieves a single vehicle belonging to a business."""
    stmt = select(Vehicle).where(
        Vehicle.business_id == business_id, Vehicle.id == vehicle_id
    )
    res = await db.execute(stmt)
    return res.scalar_one_or_none()


async def insert_vehicle(
    db: AsyncSession, business_id: uuid.UUID, plate: str, category: str
) -> Vehicle:
    """Inserts a new vehicle for a business."""
    v = Vehicle(
        business_id=business_id,
        plate=plate,
        category=category,
    )
    db.add(v)
    await db.flush()
    return v


async def delete_vehicle(db: AsyncSession, vehicle: Vehicle) -> None:
    """Deletes a vehicle."""
    await db.delete(vehicle)
    await db.flush()


async def vehicle_has_active_reservations(
    db: AsyncSession, vehicle_id: uuid.UUID
) -> bool:
    """Checks whether a vehicle is currently associated with active reservations."""
    active_statuses = ("pending", "confirmed", "checked_in", "in_progress")
    stmt = select(
        select(LoadingReservation.id)
        .where(
            LoadingReservation.vehicle_id == vehicle_id,
            LoadingReservation.status.in_(active_statuses),
        )
        .exists()
    )
    return bool((await db.execute(stmt)).scalar_one())


async def search_businesses(
    db: AsyncSession, status: str | None = None, limit: int = 50, offset: int = 0
) -> tuple[list[Business], int]:
    """Searches businesses with filtering by approval status."""
    query = select(Business)
    count_query = select(func.count(Business.id))
    if status:
        query = query.where(Business.status == status)
        count_query = count_query.where(Business.status == status)
    query = query.order_by(Business.created_at.desc()).limit(limit).offset(offset)
    total = (await db.execute(count_query)).scalar_one()
    items = (await db.execute(query)).scalars().all()
    return list(items), total
