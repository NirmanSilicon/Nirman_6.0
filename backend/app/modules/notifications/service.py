"""ParkSMART - Notifications Dispatch Service (File 120)."""

from __future__ import annotations

import uuid
from typing import Any

from pydantic import BaseModel, ConfigDict
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.rbac import Role
from app.errors import NotFound
from app.models.ops import Notification
from app.modules.notifications import repository as repo
from app.modules.users import repository as user_repo
from app.schemas.common import Page, UtcDateTime


class NotificationOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: uuid.UUID
    kind: str
    title: str
    body: str
    payload: dict[str, Any]
    read_at: UtcDateTime | None = None
    created_at: UtcDateTime


async def notify_user(
    db: AsyncSession,
    user_id: uuid.UUID,
    kind: str,
    title: str,
    body: str,
    payload: dict[str, Any] | None = None,
) -> Notification:
    """Dispatches in-app notification to an individual user."""
    notif = await repo.insert(
        db,
        user_id=user_id,
        role_target=None,
        kind=kind,
        title=title,
        body=body,
        payload=payload,
    )
    await db.commit()
    return notif


async def notify_role(
    db: AsyncSession,
    role: Role,
    kind: str,
    title: str,
    body: str,
    payload: dict[str, Any] | None = None,
) -> int:
    """Fans out notification to all active approved users having a specific role."""
    user_ids = await user_repo.get_user_ids_with_role(db, role)
    if not user_ids:
        return 0

    rows = [
        {
            "id": uuid.uuid4(),
            "user_id": uid,
            "role_target": role.value,
            "kind": kind,
            "title": title[:200],
            "body": body[:2000],
            "payload": payload or {},
        }
        for uid in user_ids
    ]
    count = await repo.insert_many(db, rows)
    await db.commit()
    return count


async def list_for_user(
    db: AsyncSession,
    user_id: uuid.UUID,
    unread_only: bool = False,
    limit: int = 50,
    offset: int = 0,
) -> Page[NotificationOut]:
    """Retrieves paginated notifications for current user."""
    items, total = await repo.list_for_user(
        db, user_id=user_id, unread_only=unread_only, limit=limit, offset=offset
    )
    return Page[NotificationOut](
        items=[NotificationOut.model_validate(n) for n in items],
        total=total,
        limit=limit,
        offset=offset,
    )


async def unread_count(db: AsyncSession, user_id: uuid.UUID) -> int:
    """Counts unread notifications."""
    return await repo.unread_count(db, user_id)


async def mark_read(
    db: AsyncSession, user_id: uuid.UUID, notification_id: uuid.UUID
) -> NotificationOut:
    """Marks single notification read."""
    notif = await repo.get_owned(db, user_id, notification_id)
    if notif is None:
        raise NotFound("Notification not found")
    await repo.mark_read(db, notif)
    await db.commit()
    await db.refresh(notif)
    return NotificationOut.model_validate(notif)


async def mark_all_read(db: AsyncSession, user_id: uuid.UUID) -> int:
    """Marks all notifications read for user."""
    updated = await repo.mark_all_read(db, user_id)
    await db.commit()
    return updated
