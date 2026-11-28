"""ParkSMART - Recommendation Candidates SQL Repository (File 117)."""

from __future__ import annotations

from sqlalchemy.ext.asyncio import AsyncSession

from app.modules.parking import repository as park_repo
from app.schemas.common import LatLon, VehicleCategory


async def candidates(
    db: AsyncSession,
    origin: LatLon,
    radius_m: float,
    vehicle_category: VehicleCategory | None,
    limit: int,
) -> list[tuple[park_repo.ZoneRow, float]]:
    """Retrieves nearest active candidate zones permitting category."""
    cat_str = vehicle_category.value if vehicle_category else None
    return await park_repo.nearby_zone_rows(
        db,
        lat=origin.lat,
        lon=origin.lon,
        radius_m=radius_m,
        vehicle_category=cat_str,
        limit_candidates=limit,
    )
