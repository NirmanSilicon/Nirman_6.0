"""Predictive condition: where this belt is heading, and how soon.

Built on the same distinct-defect model as the Reliability Yield
(``reliability.py``), and deliberately simple enough to explain on one screen:

1. **Growth.** Every distinct defect has been seen on several revolutions. The
   area of each sighting, against time, gives a growth rate. Damage does not
   heal, so a negative slope is read as measurement noise and floored at zero.
2. **New damage.** Distinct defects found per hour over the window, carried
   forward at the average penalty of the defects already on the belt.
3. **Projection.** Each defect is grown to the horizon (escalating in severity
   when it crosses the "large defect" line, as the live pipeline would), the
   expected new damage is added, and the result goes through the *same*
   condition formula the dashboard shows today. The time until that projected
   condition crosses the At-Risk and Critical bands is the headline.

It is a linear extrapolation, and says so: every payload carries its basis and
a confidence grade, and a thin history is graded "low" rather than dressed up.
A joint rupture short-circuits all of it -- a separating splice is a stop, not
a forecast.
"""
from __future__ import annotations

import math
import statistics
from dataclasses import dataclass, replace
from typing import Any, Sequence

from .reliability import (
    LARGE_AREA_FRAC,
    PENALTY_SCALE,
    DistinctDefect,
    band,
    condition_score,
    distinct_defects,
)

# Band edges, matching reliability.band().
AT_RISK_BELOW = 40
CRITICAL_BELOW = 20
# The furthest ahead any figure is projected. Beyond a month a linear fit of a
# few hours of history says nothing worth printing.
MAX_HORIZON_H = 720.0
CURVE_HOURS = (0, 1, 2, 4, 8, 12, 24, 48, 72, 120, 168)
# Two sightings closer than this cannot be separate revolutions; further apart
# than this and the belt was probably stopped in between.
MIN_PERIOD_S, MAX_PERIOD_S = 0.5, 3600.0
# Growth is only measured across sightings spanning at least this long.
MIN_GROWTH_SPAN_H = 1.0 / 60.0
# A single measurement cannot carry more growth than this per hour (10x/h):
# anything faster is a mis-merged cluster, not damage.
MAX_GROWTH_PER_H = 10.0
_BUMP = {"info": "low", "low": "medium", "medium": "high", "high": "critical",
         "critical": "critical"}


@dataclass
class _Sighting:
    t: float
    area: float


def _area(row: dict[str, Any]) -> float | None:
    box = row.get("box")
    if not isinstance(box, (list, tuple)) or len(box) != 4:
        return None
    try:
        x1, y1, x2, y2 = (float(v) for v in box)
    except (TypeError, ValueError):
        return None
    return abs(x2 - x1) * abs(y2 - y1)


def _slope(points: Sequence[tuple[float, float]]) -> float:
    """Least-squares slope of y over x."""
    n = len(points)
    mx = sum(p[0] for p in points) / n
    my = sum(p[1] for p in points) / n
    sxx = sum((p[0] - mx) ** 2 for p in points)
    if sxx <= 0:
        return 0.0
    return sum((p[0] - mx) * (p[1] - my) for p in points) / sxx


def _growth_per_hour(sightings: list[_Sighting]) -> float:
    """Relative area growth per hour (0.1 = +10 %/h), floored at zero."""
    if len(sightings) < 3:
        return 0.0
    span_h = (sightings[-1].t - sightings[0].t) / 3600.0
    if span_h < MIN_GROWTH_SPAN_H:
        return 0.0
    t0 = sightings[0].t
    pts = [((s.t - t0) / 3600.0, s.area) for s in sightings]
    mean = sum(p[1] for p in pts) / len(pts)
    if mean <= 0:
        return 0.0
    return max(0.0, min(MAX_GROWTH_PER_H, _slope(pts) / mean))


def _grown(d: DistinctDefect, growth: float, hours: float) -> DistinctDefect:
    area = min(1.0, d.area * (1.0 + growth * hours))
    severity = d.severity
    if d.area < LARGE_AREA_FRAC <= area:
        severity = _BUMP.get(severity, severity)
    return replace(d, area=area, severity=severity)


def _hours_to_large(d: DistinctDefect, growth: float) -> float | None:
    if d.area >= LARGE_AREA_FRAC:
        return 0.0
    if growth <= 0 or d.area <= 0:
        return None
    h = (LARGE_AREA_FRAC / d.area - 1.0) / growth
    return round(h, 2) if h <= MAX_HORIZON_H else None


def revolution_period(defects: Sequence[DistinctDefect],
                      opened: dict[int, float]) -> float | None:
    """Seconds per belt revolution, from how often each defect comes round."""
    gaps: list[float] = []
    for d in defects:
        times = sorted(opened[i] for i in d.incident_ids if i in opened)
        for a, b in zip(times, times[1:]):
            if MIN_PERIOD_S <= b - a <= MAX_PERIOD_S:
                gaps.append(b - a)
    if len(gaps) < 2:
        return None
    # The median ignores the long gaps left by a missed revolution.
    return round(statistics.median(gaps), 3)


def forecast(rows: Sequence[dict[str, Any]], *, window_start: float,
             window_end: float, now: float) -> dict[str, Any]:
    defects = distinct_defects(rows)
    by_id = {int(r["id"]): r for r in rows if r.get("id") is not None}
    opened = {i: float(r.get("opened_at") or 0.0) for i, r in by_id.items()}

    # Per-defect growth from its own sightings.
    growth: list[float] = []
    for d in defects:
        s = sorted(
            (_Sighting(opened[i], a) for i in d.incident_ids
             if i in by_id and (a := _area(by_id[i])) is not None and a > 0),
            key=lambda x: x.t)
        growth.append(_growth_per_hour(s))

    observed_h = max((window_end - window_start) / 3600.0, 1.0 / 60.0)
    # Only damage first seen inside the window counts as "new damage".
    new_in_window = [d for d in defects if d.first_seen >= window_start]
    new_rate = len(new_in_window) / observed_h
    penalties = [d.penalty() for d in defects if d.penalty() > 0]
    mean_penalty = sum(penalties) / len(penalties) if penalties else 0.0

    def projected(hours: float) -> int:
        grown = [_grown(d, g, hours) for d, g in zip(defects, growth)]
        _, p = condition_score(grown)
        p += new_rate * hours * mean_penalty
        return round(100 * math.exp(-p / PENALTY_SCALE))

    def hours_until_below(limit: int) -> float | None:
        if projected(0) < limit:
            return 0.0
        if projected(MAX_HORIZON_H) >= limit:
            return None
        lo, hi = 0.0, MAX_HORIZON_H
        for _ in range(40):  # bisection: projection is monotone in time
            mid = (lo + hi) / 2
            if projected(mid) < limit:
                hi = mid
            else:
                lo = mid
        return round(hi, 2)

    now_score, _ = condition_score(defects)
    to_risk = hours_until_below(AT_RISK_BELOW)
    to_critical = hours_until_below(CRITICAL_BELOW)
    rupture = any(d.cls == "joint_damage" for d in defects)

    sightings = sum(d.sightings for d in defects)
    span_h = (max((d.last_seen for d in defects), default=now)
              - min((d.first_seen for d in defects), default=now)) / 3600.0
    if sightings >= 10 and span_h >= 2:
        confidence = "high"
    elif sightings >= 4 and span_h >= 1 / 3:
        confidence = "medium"
    else:
        confidence = "low"

    if rupture:
        risk, action = "critical", (
            "Joint rupture on the belt. Stop the conveyor and repair the "
            "splice before restarting.")
    elif to_critical is not None and to_critical <= 24:
        risk, action = "critical", (
            f"Projected to reach Critical in about {_fmt_h(to_critical)}. "
            "Schedule repair on this shift.")
    elif to_risk is not None and to_risk <= 72:
        risk, action = "high", (
            f"Projected At Risk in about {_fmt_h(to_risk)}. Plan maintenance "
            "at the next stop.")
    elif defects:
        risk, action = "medium" if now_score < 85 else "low", (
            "Damage is present but stable at the current rate. Keep monitoring.")
    else:
        risk, action = "low", "No damage recorded in this window."

    period = revolution_period(defects, opened)
    items = []
    for d, g in sorted(zip(defects, growth), key=lambda x: -x[0].penalty()):
        items.append({
            "id": d.incident_ids[0] if d.incident_ids else None,
            "cls": d.cls,
            "label": d.label,
            "severity": d.severity,
            "confidence": round(d.confidence, 3),
            "lateral": None if math.isnan(d.lateral) else round(d.lateral, 4),
            "area": round(d.area, 6),
            "sightings": d.sightings,
            "first_seen": d.first_seen,
            "last_seen": d.last_seen,
            "growth_per_hour": round(g, 4),
            "projected_area_24h": round(min(1.0, d.area * (1 + g * 24)), 6),
            "hours_to_large": _hours_to_large(d, g),
            "penalty": round(d.penalty(), 3),
        })

    return {
        "now": now,
        "condition_now": now_score,
        "band_now": band(now_score),
        "curve": [{"hours": h, "condition": projected(h)} for h in CURVE_HOURS],
        "condition_24h": projected(24),
        "condition_72h": projected(72),
        "hours_to_at_risk": to_risk,
        "hours_to_critical": to_critical,
        "risk": risk,
        "recommendation": action,
        "confidence": confidence,
        "basis": {
            "distinct_defects": len(defects),
            "sightings": sightings,
            "history_hours": round(span_h, 3),
            "new_defects_per_hour": round(new_rate, 3),
            "window_hours": round(observed_h, 3),
        },
        "revolution_period_s": period,
        "defects": items,
    }


def _fmt_h(hours: float) -> str:
    if hours < 1:
        return f"{max(1, round(hours * 60))} min"
    if hours < 48:
        return f"{hours:.0f} h" if hours >= 10 else f"{hours:.1f} h"
    return f"{hours / 24:.1f} days"
