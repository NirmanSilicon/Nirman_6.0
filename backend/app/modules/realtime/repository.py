"""
ParkSMART - Realtime Stream Repository (File 92 / M2 Ownership)

Responsibility:
Read-only SQL queries determining business memberships and active zones
for Server-Sent Events authorization and channel filtering.
"""

from __future__ import annotations

import asyncio
import uuid
from typing import Any


async def business_ids_for_user(
    db: Any,
    user_id: uuid.UUID | str,
) -> list[uuid.UUID]:
    """
    Returns list of approved business IDs where user is an approved member.
    SQL: SELECT b.id FROM business b
         JOIN business_member bm ON b.id = bm.business_id
         WHERE bm.user_id = :user_id AND bm.status = 'approved' AND b.status = 'approved';
    """
    if db is None:
        return []

    uid = uuid.UUID(str(user_id))
    if hasattr(db, "business_ids_for_user"):
        res = db.business_ids_for_user(uid)
        if asyncio.iscoroutine(res):
            res = await res
        return [uuid.UUID(str(b)) for b in res]

    return []


async def zone_ids_active(db: Any) -> list[uuid.UUID]:
    """
    Returns IDs of all currently active parking zones.
    SQL: SELECT id FROM zone WHERE is_active = TRUE;
    """
    if db is None:
        return []

    if hasattr(db, "zone_ids_active"):
        res = db.zone_ids_active()
        if asyncio.iscoroutine(res):
            res = await res
        return [uuid.UUID(str(z)) for z in res]

    return []
