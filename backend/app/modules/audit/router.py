"""ParkSMART - Audit Log Router (File 105)."""

from __future__ import annotations

import uuid
from datetime import timedelta

from fastapi import APIRouter, Depends, Query
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.clock import utcnow
from app.core.rbac import Role
from app.deps import get_db, require_roles
from app.errors import NotFound, ValidationFailed
from app.modules.audit import service
from app.schemas.admin import AuditOut
from app.schemas.common import Page, UtcDateTime

router = APIRouter()


@router.get("", response_model=Page[AuditOut])
async def search_audit_logs(
    actor_user_id: uuid.UUID | None = Query(default=None),
    entity_type: str | None = Query(default=None),
    entity_id: str | None = Query(default=None),
    action: str | None = Query(default=None),
    from_ts: UtcDateTime | None = Query(default=None, alias="from"),
    to_ts: UtcDateTime | None = Query(default=None, alias="to"),
    limit: int = Query(default=50, ge=1, le=200),
    offset: int = Query(default=0, ge=0),
    db: AsyncSession = Depends(get_db),
    _user=Depends(require_roles(Role.SYSTEM_ADMIN, Role.MUNICIPAL_ADMIN)),
) -> Page[AuditOut]:
    """Retrieves paginated audit log records with date range and entity filtering."""
    now = utcnow()
    eff_from = from_ts if from_ts is not None else now - timedelta(days=7)
    eff_to = to_ts if to_ts is not None else now

    if (eff_to - eff_from).days > 92:
        raise ValidationFailed("Date range exceeds maximum allowed limit of 92 days")
    if eff_from > eff_to:
        raise ValidationFailed("from timestamp must be earlier than to timestamp")

    return await service.search(
        db,
        actor_user_id=actor_user_id,
        entity_type=entity_type,
        entity_id=entity_id,
        action=action,
        from_ts=eff_from,
        to_ts=eff_to,
        limit=limit,
        offset=offset,
    )


@router.get("/{id}", response_model=AuditOut)
async def get_audit_log(
    id: int,
    db: AsyncSession = Depends(get_db),
    _user=Depends(require_roles(Role.SYSTEM_ADMIN, Role.MUNICIPAL_ADMIN)),
) -> AuditOut:
    """Retrieves a single audit log entry by ID."""
    entry = await service.get(db, id)
    if entry is None:
        raise NotFound("Audit log entry not found")
    return AuditOut.model_validate(entry)
