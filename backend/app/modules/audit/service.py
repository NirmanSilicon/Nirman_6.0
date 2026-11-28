"""ParkSMART - Audit Log Service (File 106)."""

from __future__ import annotations

import decimal
import uuid
from datetime import datetime
from typing import Any

from sqlalchemy.ext.asyncio import AsyncSession

from app.logging_config import request_id_var
from app.models.ops import AuditLog
from app.modules.audit import repository as repo
from app.schemas.admin import AuditOut
from app.schemas.common import Page

SENSITIVE_KEYS = frozenset({
    "password_hash",
    "token_hash",
    "device_secret_hash",
    "password",
    "device_secret",
    "refresh_token",
    "access_token",
})


def scrub(value: Any) -> Any:
    """Recursively scrubs sensitive keys and converts complex types to JSON-safe representations."""
    if isinstance(value, dict):
        return {
            k: scrub(v)
            for k, v in value.items()
            if str(k).lower() not in SENSITIVE_KEYS
        }
    if isinstance(value, (list, tuple, set)):
        return [scrub(x) for x in value]
    if isinstance(value, uuid.UUID):
        return str(value)
    if isinstance(value, datetime):
        return value.isoformat()
    if isinstance(value, decimal.Decimal):
        return float(value)
    return value


async def record(
    db: AsyncSession,
    *,
    actor_user_id: uuid.UUID | None,
    action: str,
    entity_type: str,
    entity_id: str | None,
    before: dict[str, Any] | None = None,
    after: dict[str, Any] | None = None,
) -> None:
    """Records an audit trail log with sanitized before/after state snapshots."""
    scrubbed_before = scrub(before) if before is not None else None
    scrubbed_after = scrub(after) if after is not None else None
    req_id = request_id_var.get()
    actual_req_id = req_id if req_id != "-" else None

    await repo.insert(
        db,
        actor_user_id=actor_user_id,
        action=action,
        entity_type=entity_type,
        entity_id=entity_id,
        before=scrubbed_before,
        after=scrubbed_after,
        request_id=actual_req_id,
    )


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
) -> Page[AuditOut]:
    """Queries audit trail records and wraps in paginated response."""
    items, total = await repo.search(
        db,
        actor_user_id=actor_user_id,
        entity_type=entity_type,
        entity_id=entity_id,
        action=action,
        from_ts=from_ts,
        to_ts=to_ts,
        limit=limit,
        offset=offset,
    )
    return Page[AuditOut](
        items=[AuditOut.model_validate(x) for x in items],
        total=total,
        limit=limit,
        offset=offset,
    )


async def get(db: AsyncSession, audit_id: int) -> AuditLog | None:
    """Retrieves an audit entry by ID."""
    return await repo.get(db, audit_id)
