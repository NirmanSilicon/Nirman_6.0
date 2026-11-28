"""ParkSMART - In-App Notifications SQL Repository (File 121)."""

from __future__ import annotations

import uuid
from datetime import datetime
from typing import Any

from sqlalchemy import delete, func, select, update
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.clock import utcnow
from app.models.ops import Notification


async def insert(
    db: AsyncSession,
    *,
    user_id: uuid.UUID | None,
    role_target: str | None,
    kind: str,
    title: str,
    body: str,
    payload: dict[str, Any] | None = None,
) -> Notification:
    """Inserts a notification record."""
    notif = Notification(
        user_id=user_id,
        role_target=role_target,
        kind=kind,
        title=title[:200],
        body=body[:2000],
        payload=payload or {},
    )
    db.add(notif)
    await db.flush()
    return notif


async def insert_many(db: AsyncSession, rows: list[dict[str, Any]]) -> int:
    """Bulk inserts notification records."""
    if not rows:
        return 0
    models = [Notification(**r) for r in rows]
    db.add_all(models)
    await db.flush()
    return len(models)


async def list_for_user(
    db: AsyncSession,
    user_id: uuid.UUID,
    unread_only: bool = False,
    limit: int = 50,
    offset: int = 0,
) -> tuple[list[Notification], int]:
    """Retrieves paginated notifications targeting a user."""
    stmt = select(Notification).where(Notification.user_id == user_id)
    count_stmt = select(func.count(Notification.id)).where(Notification.user_id == user_id)

    if unread_only:
        stmt = stmt.where(Notification.read_at.is_(None))
        count_stmt = count_stmt.where(Notification.read_at.is_(None))

    stmt = stmt.order_by(Notification.created_at.desc(), Notification.id).limit(limit).offset(offset)
    total = (await db.execute(count_stmt)).scalar_one()
    items = (await db.execute(stmt)).scalars().all()
    return list(items), total


async def unread_count(db: AsyncSession, user_id: uuid.UUID) -> int:
    """Counts unread notifications for a user."""
    stmt = select(func.count(Notification.id)).where(
        Notification.user_id == user_id, Notification.read_at.is_(None)
    )
    return (await db.execute(stmt)).scalar_one()


async def get_owned(
    db: AsyncSession, user_id: uuid.UUID, notification_id: uuid.UUID
) -> Notification | None:
    """Retrieves notification only if owned by user."""
    stmt = select(Notification).where(
        Notification.id == notification_id, Notification.user_id == user_id
    )
    res = await db.execute(stmt)
    return res.scalar_one_or_none()


async def mark_read(
    db: AsyncSession, notification: Notification, now: datetime | None = None
) -> None:
    """Marks single notification as read."""
    if notification.read_at is None:
        notification.read_at = now or utcnow()
        await db.flush()


async def mark_all_read(
    db: AsyncSession, user_id: uuid.UUID, now: datetime | None = None
) -> int:
    """Marks all unread notifications for a user as read."""
    read_ts = now or utcnow()
    stmt = (
        update(Notification)
        .where(Notification.user_id == user_id, Notification.read_at.is_(None))
        .values(read_at=read_ts)
    )
    res = await db.execute(stmt)
    await db.flush()
    return res.rowcount or 0


async def purge_read_before(db: AsyncSession, before: datetime) -> int:
    """Purges old read notifications past retention horizon."""
    stmt = delete(Notification).where(
        Notification.read_at.is_not(None), Notification.read_at < before
    )
    res = await db.execute(stmt)
    await db.flush()
    return res.rowcount or 0
