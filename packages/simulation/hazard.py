"""Synthetic hazard evaluator."""
from __future__ import annotations

import math
from packages.domain.models import FloodSource, Position, Scenario


def evaluate_temporal_factor(source: FloodSource, tick: int) -> float:
    """Piecewise linear rise from start_tick to peak_tick, fall to end_tick."""
    if tick < source.start_tick or tick > source.end_tick:
        return 0.0
    if tick <= source.peak_tick:
        span = max(1, source.peak_tick - source.start_tick)
        return (tick - source.start_tick) / span
    else:
        span = max(1, source.end_tick - source.peak_tick)
        return max(0.0, 1.0 - (tick - source.peak_tick) / span)


def evaluate_hazard_at_position(position: Position, sources: list[FloodSource], tick: int) -> float:
    """Compute aggregate synthetic flood hazard intensity at a given location."""
    total_hazard = 0.0
    for source in sources:
        dx = position.x - source.center_x
        dy = position.y - source.center_y
        dist = math.hypot(dx, dy)
        if dist <= source.radius:
            spatial_factor = max(0.0, 1.0 - (dist / source.radius))
            temp_factor = evaluate_temporal_factor(source, tick)
            total_hazard += source.peak_intensity * spatial_factor * temp_factor

    return min(1.0, total_hazard)
