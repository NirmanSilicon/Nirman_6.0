"""ParkSMART - Devices & Cameras Router."""

from __future__ import annotations

from typing import Any

from fastapi import APIRouter, Depends
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.db.session import get_session
from app.deps import get_current_user
from app.models.infra import Camera

router = APIRouter()


@router.get("/cameras")
async def list_cameras(
    _user=Depends(get_current_user),
    db: AsyncSession = Depends(get_session),
) -> list[dict[str, Any]]:
    """Return registered cameras from the database."""
    rows = (await db.execute(select(Camera).order_by(Camera.name))).scalars().all()
    return [
        {
            "id": str(c.id),
            "zone_id": str(c.zone_id),
            "name": c.name,
            "status": c.status,
            "last_seen_at": c.last_seen_at.isoformat() if c.last_seen_at else None,
            "firmware_version": c.firmware_version,
        }
        for c in rows
    ]
