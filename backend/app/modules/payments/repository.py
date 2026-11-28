"""ParkSMART - Fee Configuration SQL Repository (File 133)."""

from __future__ import annotations

import uuid
from datetime import datetime

from sqlalchemy import or_, select
from sqlalchemy.ext.asyncio import AsyncSession

from app.models.ops import FeeConfiguration


async def fees_effective_at(
    db: AsyncSession, facility_id: uuid.UUID, at: datetime
) -> list[FeeConfiguration]:
    """Retrieves fees effective for a facility at instant 'at'."""
    stmt = (
        select(FeeConfiguration)
        .where(
            FeeConfiguration.facility_id == facility_id,
            FeeConfiguration.effective_from <= at,
            or_(
                FeeConfiguration.effective_to.is_(None),
                FeeConfiguration.effective_to > at,
            ),
        )
        .order_by(FeeConfiguration.bay_type)
    )
    res = await db.execute(stmt)
    return list(res.scalars().all())
