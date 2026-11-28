"""The predictive model: growth, projection and the stated limits."""
from __future__ import annotations

import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parent.parent))

from app.analytics.forecast import forecast  # noqa: E402

NOW = 1_800_000_000.0


def _row(i, t, cls="tear", severity="high", side=0.05, cx=0.5, conf=0.9):
    return {"id": i, "cls": cls, "label": cls, "severity": severity,
            "confidence": conf, "opened_at": t, "closed_at": t + 2,
            "duration": 2, "box": [cx - side / 2, 0.4, cx + side / 2, 0.4 + side]}


def test_clean_belt_forecasts_nothing():
    out = forecast([], window_start=NOW - 3600, window_end=NOW, now=NOW)
    assert out["condition_now"] == 100
    assert out["hours_to_critical"] is None and out["risk"] == "low"


def test_growing_tear_reaches_a_band_and_is_timed():
    # One tear seen every 30 s for an hour, its box widening from 0.05 to 0.12.
    rows = [_row(i, NOW - 3600 + i * 30, side=0.05 + 0.07 * i / 120)
            for i in range(120)]
    out = forecast(rows, window_start=NOW - 3600, window_end=NOW, now=NOW)
    tear = out["defects"][0]
    assert out["basis"]["distinct_defects"] == 1 or tear["sightings"] > 1
    assert tear["growth_per_hour"] > 0
    assert out["revolution_period_s"] == 30.0
    curve = [p["condition"] for p in out["curve"]]
    assert curve == sorted(curve, reverse=True), "condition must not recover on its own"


def test_shrinking_measurements_are_not_healing():
    rows = [_row(i, NOW - 3600 + i * 30, side=0.08 - 0.02 * i / 60) for i in range(60)]
    out = forecast(rows, window_start=NOW - 3600, window_end=NOW, now=NOW)
    assert all(d["growth_per_hour"] >= 0 for d in out["defects"])


def test_joint_rupture_is_a_stop_not_a_forecast():
    rows = [_row(1, NOW - 60, cls="joint_damage", severity="critical")]
    out = forecast(rows, window_start=NOW - 3600, window_end=NOW, now=NOW)
    assert out["risk"] == "critical"
    assert "Stop" in out["recommendation"]
    assert out["confidence"] == "low"
