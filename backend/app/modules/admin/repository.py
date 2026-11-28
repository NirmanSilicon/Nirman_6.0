"""ParkSMART - Admin Configuration and Approval Repository (File 125)."""

from __future__ import annotations

import uuid
from datetime import datetime
from typing import Any

from sqlalchemy import func, or_, select
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.clock import utcnow
from app.models.business import Business, BusinessMember
from app.models.ops import FeeConfiguration
from app.models.user import User, UserRole


async def businesses_with_owner(
    db: AsyncSession, status: str | None = None, limit: int = 50, offset: int = 0
) -> tuple[list[tuple[Business, str | None]], int]:
    """Lists businesses with their owner email for administrative approval."""
    stmt = (
        select(Business, User.email)
        .outerjoin(
            BusinessMember,
            (Business.id == BusinessMember.business_id) & (BusinessMember.member_role == "owner"),
        )
        .outerjoin(User, BusinessMember.user_id == User.id)
    )
    count_stmt = select(func.count(Business.id))

    if status:
        stmt = stmt.where(Business.status == status)
        count_stmt = count_stmt.where(Business.status == status)

    stmt = stmt.order_by(Business.created_at.desc()).limit(limit).offset(offset)
    total = (await db.execute(count_stmt)).scalar_one()
    rows = (await db.execute(stmt)).all()
    return [(r[0], r[1]) for r in rows], total


async def lock_user_roles(db: AsyncSession, role_id: int) -> list[uuid.UUID]:
    """Locks user_role rows for race-free last-admin checks."""
    stmt = (
        select(UserRole.user_id)
        .where(UserRole.role_id == role_id)
        .order_by(UserRole.user_id)
        .with_for_update()
    )
    res = await db.execute(stmt)
    return list(res.scalars().all())


async def active_fee_rows_for_update(
    db: AsyncSession, facility_id: uuid.UUID, bay_type: str
) -> list[FeeConfiguration]:
    """Locks active fee configuration rows for a facility."""
    now = utcnow()
    stmt = (
        select(FeeConfiguration)
        .where(
            FeeConfiguration.facility_id == facility_id,
            FeeConfiguration.bay_type == bay_type,
            or_(
                FeeConfiguration.effective_to.is_(None),
                FeeConfiguration.effective_to > now,
            ),
        )
        .with_for_update()
    )
    res = await db.execute(stmt)
    return list(res.scalars().all())


async def insert_fee(
    db: AsyncSession,
    *,
    facility_id: uuid.UUID,
    bay_type: str,
    rate_per_hour: Any,
    currency: str,
    effective_from: datetime,
    effective_to: datetime | None,
    created_by: uuid.UUID | None,
) -> FeeConfiguration:
    """Inserts a fee configuration record."""
    fee = FeeConfiguration(
        facility_id=facility_id,
        bay_type=bay_type,
        rate_per_hour=rate_per_hour,
        currency=currency,
        effective_from=effective_from,
        effective_to=effective_to,
        created_by=created_by,
    )
    db.add(fee)
    await db.flush()
    return fee
