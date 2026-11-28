"""ParkSMART - Intelligent Parking Recommendation Service (File 116)."""

from __future__ import annotations

from dataclasses import dataclass
from datetime import datetime, timedelta

from sqlalchemy.ext.asyncio import AsyncSession

from app.config import get_settings
from app.core.clock import utcnow
from app.modules.availability import service as avail_service
from app.modules.parking import service as park_service
from app.modules.parking.repository import ZoneRow
from app.modules.recommend import repository as repo
from app.schemas.common import LatLon, PredictionStatus, VehicleCategory
from app.schemas.forecast import (
    AvailabilityOut,
    AvailabilityRequest,
    RecommendationItem,
    RecommendationOut,
    TimeWindow,
)

WINDOW_STEPS = 12
MAX_WINDOWS = 3


@dataclass
class CandidateEval:
    zone_row: ZoneRow
    avail: AvailabilityOut
    distance_m: float
    travel_time_s: int | None


def rank_candidates(items: list[CandidateEval]) -> list[CandidateEval]:
    """Ranks candidates: available probability descending, then travel time / distance."""
    return sorted(
        items,
        key=lambda c: (
            c.avail.probability is None,
            -(c.avail.probability or 0.0),
            c.travel_time_s or c.distance_m,
            c.zone_row.zone.name,
        ),
    )


async def best_windows(
    db: AsyncSession, zone_id, start: datetime, steps: int = WINDOW_STEPS
) -> list[TimeWindow]:
    """Evaluates availability across consecutive future windows to suggest better arrival times."""
    settings = get_settings()
    step_delta = timedelta(minutes=settings.agg_interval_min)
    windows: list[TimeWindow] = []

    for k in range(steps):
        win_start = start + k * step_delta
        win_end = win_start + step_delta
        req = AvailabilityRequest(zone_id=zone_id, arrival_time=win_start)
        est = await avail_service.estimate(db, req, now=start)

        if est.probability is not None:
            windows.append(
                TimeWindow(
                    start=win_start,
                    end=win_end,
                    probability=est.probability,
                    crowd_level=est.crowd_level,
                )
            )

    # Sort descending by probability and take top MAX_WINDOWS
    windows.sort(key=lambda w: -(w.probability or 0.0))
    return windows[:MAX_WINDOWS]


async def recommend(
    db: AsyncSession,
    origin: LatLon,
    arrival_time: datetime | None,
    vehicle_category: VehicleCategory | None,
    radius_m: float = 3000.0,
    limit: int = 5,
    use_travel_time: bool = False,
) -> RecommendationOut:
    """Finds and ranks candidate parking zones with arrival-time availability and alternative windows."""
    now = utcnow()
    eff_arrival = arrival_time or now
    candidate_rows = await repo.candidates(
        db, origin, radius_m, vehicle_category, limit=limit * 2
    )

    eval_items: list[CandidateEval] = []
    for zr, dist in candidate_rows:
        req = AvailabilityRequest(
            zone_id=zr.zone.id,
            arrival_time=eff_arrival,
            origin=origin,
            use_travel_time=use_travel_time,
        )
        avail = await avail_service.estimate(db, req, now=now)
        travel_sec = (
            int((avail.estimated_arrival_time - avail.requested_arrival_time).total_seconds())
            if use_travel_time
            else None
        )
        eval_items.append(
            CandidateEval(
                zone_row=zr,
                avail=avail,
                distance_m=dist,
                travel_time_s=travel_sec,
            )
        )

    ranked = rank_candidates(eval_items)
    selected = ranked[:limit]

    out_items: list[RecommendationItem] = []
    for rank_idx, c in enumerate(selected, start=1):
        reasons: list[str] = []
        if c.avail.probability is not None:
            reasons.append(f"{c.avail.probability * 100:.0f}% chance of parking")
        else:
            reasons.append(f"Availability estimate unavailable: {c.avail.reason}")

        reasons.append(f"{c.distance_m:.0f}m away")
        if c.travel_time_s:
            reasons.append(f"~{c.travel_time_s // 60} min travel time")
        reasons.append(f"Crowd level {c.avail.crowd_level.value}")

        out_items.append(
            RecommendationItem(
                zone=park_service._to_zone_out(c.zone_row),
                rank=rank_idx,
                probability=c.avail.probability,
                distance_m=round(c.distance_m, 1),
                travel_time_s=c.travel_time_s,
                score=c.avail.probability or 0.0,
                reasons=reasons,
            )
        )

    windows: list[TimeWindow] = []
    if selected and selected[0].avail.probability is not None:
        windows = await best_windows(db, selected[0].zone_row.zone.id, eff_arrival)

    has_probs = any(i.probability is not None for i in out_items)
    status = PredictionStatus.OK if has_probs else PredictionStatus.UNAVAILABLE

    return RecommendationOut(
        origin=origin,
        arrival_time=eff_arrival,
        items=out_items,
        best_windows=windows,
        status=status,
    )
