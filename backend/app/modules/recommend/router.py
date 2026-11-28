"""ParkSMART - Parking Recommendations API Router (File 115)."""

from __future__ import annotations

from fastapi import APIRouter, Depends, Query
from sqlalchemy.ext.asyncio import AsyncSession

from app.deps import get_current_user, get_db
from app.modules.recommend import service
from app.schemas.common import LatLon, UtcDateTime, VehicleCategory
from app.schemas.forecast import RecommendationOut

router = APIRouter()


@router.get("", response_model=RecommendationOut)
async def get_parking_recommendations(
    lat: float = Query(..., ge=-90.0, le=90.0),
    lon: float = Query(..., ge=-180.0, le=180.0),
    radius_m: float = Query(default=3000.0, gt=0, le=20000.0),
    vehicle_category: VehicleCategory | None = Query(default=None),
    arrival_time: UtcDateTime | None = Query(default=None),
    use_travel_time: bool = Query(default=False),
    limit: int = Query(default=5, ge=1, le=10),
    db: AsyncSession = Depends(get_db),
    _user=Depends(get_current_user),
) -> RecommendationOut:
    """Provides ranked parking recommendations with estimated probabilities and alternative arrival times."""
    origin = LatLon(lat=lat, lon=lon)
    return await service.recommend(
        db,
        origin=origin,
        arrival_time=arrival_time,
        vehicle_category=vehicle_category,
        radius_m=radius_m,
        limit=limit,
        use_travel_time=use_travel_time,
    )
