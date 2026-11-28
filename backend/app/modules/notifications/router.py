"""ParkSMART - In-App Notifications API Router (File 119)."""

from __future__ import annotations

import uuid

from fastapi import APIRouter, Depends, Query
from sqlalchemy.ext.asyncio import AsyncSession

from app.deps import CurrentUser, get_current_user, get_db
from app.modules.notifications import service
from app.modules.notifications.service import NotificationOut
from app.schemas.common import Page

router = APIRouter()


@router.get("", response_model=Page[NotificationOut])
async def list_notifications(
    unread_only: bool = Query(default=False),
    limit: int = Query(default=50, ge=1, le=200),
    offset: int = Query(default=0, ge=0),
    current: CurrentUser = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
) -> Page[NotificationOut]:
    """Lists notifications for the authenticated user."""
    return await service.list_for_user(
        db, user_id=current.id, unread_only=unread_only, limit=limit, offset=offset
    )


@router.get("/unread-count")
async def get_unread_count(
    current: CurrentUser = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
) -> dict[str, int]:
    """Returns count of unread notifications for current user."""
    cnt = await service.unread_count(db, current.id)
    return {"count": cnt}


@router.post("/{id}/read", response_model=NotificationOut)
async def mark_notification_read(
    id: uuid.UUID,
    current: CurrentUser = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
) -> NotificationOut:
    """Marks a single notification as read."""
    return await service.mark_read(db, current.id, id)


@router.post("/read-all")
async def mark_all_notifications_read(
    current: CurrentUser = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
) -> dict[str, int]:
    """Marks all notifications as read for current user."""
    cnt = await service.mark_all_read(db, current.id)
    return {"updated": cnt}
