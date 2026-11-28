"""ParkSMART - Audit Log Repository (File 107)."""

from __future__ import annotations

import uuid
from datetime import datetime
from typing import Any

from sqlalchemy import func, select
from sqlalchemy.ext.asyncio import AsyncSession

from app.models.ops import AuditLog


async def insert(
    db: AsyncSession,
    *,
    actor_user_id: uuid.UUID | None,
    action: str,
    entity_type: str,
    entity_id: str | None,
    before: dict[str, Any] | None,
    after: dict[str, Any] | None,
    request_id: str | None,
) -> int:
    """Inserts a new append-only immutable audit log record."""
    log = AuditLog(
        actor_user_id=actor_user_id,
        action=action,
        entity_type=entity_type,
        entity_id=str(entity_id) if entity_id is not None else None,
        before=before,
        after=after,
        request_id=request_id,
    )
    db.add(log)
    await db.flush()
    return log.id


async def search(
    db: AsyncSession,
    *,
    actor_user_id: uuid.UUID | None = None,
    entity_type: str | None = None,
    entity_id: str | None = None,
    action: str | None = None,
    from_ts: datetime | None = None,
    to_ts: datetime | None = None,
    limit: int = 50,
    offset: int = 0,
) -> tuple[list[AuditLog], int]:
    """Queries audit log records with filtering and count."""
    q = select(AuditLog)
    count_q = select(func.count(AuditLog.id))

    if actor_user_id is not None:
        q = q.where(AuditLog.actor_user_id == actor_user_id)
        count_q = count_q.where(AuditLog.actor_user_id == actor_user_id)
    if entity_type:
        q = q.where(AuditLog.entity_type == entity_type)
        count_q = count_q.where(AuditLog.entity_type == entity_type)
    if entity_id:
        q = q.where(AuditLog.entity_id == entity_id)
        count_q = count_q.where(AuditLog.entity_id == entity_id)
    if action:
        q = q.where(AuditLog.action == action)
        count_q = count_q.where(AuditLog.action == action)
    if from_ts is not None:
        q = q.where(AuditLog.created_at >= from_ts)
        count_q = count_q.where(AuditLog.created_at >= from_ts)
    if to_ts is not None:
        q = q.where(AuditLog.created_at <= to_ts)
        count_q = count_q.where(AuditLog.created_at <= to_ts)

    q = q.order_by(AuditLog.id.desc()).limit(limit).offset(offset)

    total = (await db.execute(count_q)).scalar_one()
    items = (await db.execute(q)).scalars().all()
    return list(items), total


async def get(db: AsyncSession, audit_id: int) -> AuditLog | None:
    """Retrieves an audit log record by ID."""
    res = await db.execute(select(AuditLog).where(AuditLog.id == audit_id))
    return res.scalar_one_or_none()
