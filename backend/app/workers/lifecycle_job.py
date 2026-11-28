"""ParkSMART - Reservation Lifecycle Automated State Transition Worker Job (File 138)."""

from __future__ import annotations

from datetime import datetime

from sqlalchemy.ext.asyncio import AsyncSession

from app.modules.loading import repository as load_repo
from app.modules.loading import service as load_service
from app.modules.reservations import repository as park_repo
from app.modules.reservations import service as park_service


async def run(db: AsyncSession, now: datetime) -> dict[str, int]:
    """Applies time-driven transitions: pending expiry, confirmed no-show, and in-progress auto-completion."""
    counts = {
        "parking_expired": 0,
        "parking_no_show": 0,
        "parking_completed": 0,
        "loading_expired": 0,
        "loading_no_show": 0,
        "loading_completed": 0,
    }

    # 1. Parking pending expiry
    p_exp_ids = await park_repo.due_pending_expiry(db, now)
    for rid in p_exp_ids:
        if await park_service.system_transition(db, rid, "expired", "Pending TTL expired"):
            counts["parking_expired"] += 1

    # 2. Parking no-show
    p_ns_ids = await park_repo.due_no_show(db, now)
    for rid in p_ns_ids:
        if await park_service.system_transition(db, rid, "no_show", "No check-in during grace period"):
            counts["parking_no_show"] += 1

    # 3. Parking auto-completion
    p_comp_ids = await park_repo.due_completion(db, now)
    for rid in p_comp_ids:
        if await park_service.system_transition(db, rid, "completed", "Booking period ended with overstay grace"):
            counts["parking_completed"] += 1

    # 4. Loading pending expiry
    l_exp_ids = await load_repo.due_pending_expiry(db, now)
    for rid in l_exp_ids:
        if await load_service.system_transition(db, rid, "expired", "Pending TTL expired"):
            counts["loading_expired"] += 1

    # 5. Loading no-show
    l_ns_ids = await load_repo.due_no_show(db, now)
    for rid in l_ns_ids:
        if await load_service.system_transition(db, rid, "no_show", "No check-in during grace period"):
            counts["loading_no_show"] += 1

    # 6. Loading auto-completion
    l_comp_ids = await load_repo.due_completion(db, now)
    for rid in l_comp_ids:
        if await load_service.system_transition(db, rid, "completed", "Loading slot window completed"):
            counts["loading_completed"] += 1

    return counts
