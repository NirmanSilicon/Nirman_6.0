"""Tests for causal propagation link discovery in app/services/causality.py."""

import time
import numpy as np
import pandas as pd

from app.config import DEFAULT_WINDOW_SIZE, PARQUET_PATH, TARGET_FAULTS
from app.services.alarm_engine import consolidate_alarm_flood
from app.services.causality import compute_causal_links
from app.services.tep_loader import (
    compute_normal_baseline,
    load_tep_parquet,
    split_episodes,
)


def test_compute_causal_links_synthetic_lagged_signal() -> None:
    """Verify B[t] = 0.9 * A[t-1] + noise detects source='A', target='B', lag=1."""
    rng = np.random.default_rng(seed=42)
    n_steps = 40
    a = rng.normal(loc=0.0, scale=1.0, size=n_steps)
    b = np.zeros(n_steps, dtype=np.float64)
    b[1:] = 0.9 * a[:-1] + 0.05 * rng.normal(size=n_steps - 1)

    window_df = pd.DataFrame({"A": a, "B": b})
    links = compute_causal_links(
        window_df=window_df,
        candidate_sensors=["A", "B"],
        max_links=5,
        max_lag=2,
        step_minutes=3,
    )

    assert len(links) >= 1
    top_link = links[0]
    assert top_link["source"] == "A"
    assert top_link["target"] == "B"
    assert top_link["best_lag_steps"] == 1
    assert top_link["lag_minutes"] == 3
    assert top_link["correlation"] > 0.85
    assert top_link["p_value"] is not None and top_link["p_value"] < 0.05
    assert top_link["method"] == "granger+corr"
    assert 0.8 <= top_link["strength"] <= 1.0
    assert "A leads B" in top_link["explanation"]


def test_compute_causal_links_constant_series_safe() -> None:
    """Verify constant/zero-variance series do not crash and return empty list."""
    window_df = pd.DataFrame(
        {
            "CONST_1": np.full(20, 42.0),
            "CONST_2": np.full(20, -5.0),
        }
    )

    links = compute_causal_links(
        window_df=window_df,
        candidate_sensors=["CONST_1", "CONST_2"],
        max_links=5,
    )
    assert links == []

    # Mixed constant + active single sensor -> only 1 non-constant sensor -> []
    mixed_df = pd.DataFrame(
        {
            "CONST_1": np.full(20, 10.0),
            "ACTIVE": np.linspace(0.0, 5.0, 20),
        }
    )
    assert compute_causal_links(mixed_df, ["CONST_1", "ACTIVE"]) == []


def test_compute_causal_links_real_fault6_performance_and_output() -> None:
    """Integration test on real Fault 6 window verifies non-empty links in < 25 ms."""
    df = load_tep_parquet(path=PARQUET_PATH, target_faults=TARGET_FAULTS)
    train_df, _, test_df = split_episodes(df, train_ratio=0.70, val_ratio=0.15, seed=42)
    baseline = compute_normal_baseline(train_df)

    fault6_rows = test_df[test_df["STATUS"] == 6]
    ep_id = fault6_rows["episode_id"].iloc[0]
    window_df = test_df[test_df["episode_id"] == ep_id].iloc[:DEFAULT_WINDOW_SIZE].reset_index(drop=True)

    alarm_report = consolidate_alarm_flood(window_df, baseline, top_k=5)
    candidates = (
        ([alarm_report["first_triggered_tag"]] if alarm_report["first_triggered_tag"] else [])
        + [a["tag"] for a in alarm_report["priority_alarms"]]
    )

    # Warmup statsmodels once so measurement reflects steady-state runtime
    _ = compute_causal_links(window_df, candidates, max_links=5)

    t0 = time.perf_counter()
    links = compute_causal_links(window_df, candidates, max_links=5)
    elapsed_ms = (time.perf_counter() - t0) * 1000.0

    assert len(links) > 0, "Expected non-empty causal_links on real Fault 6 cascade"
    assert elapsed_ms < 25.0, f"compute_causal_links took {elapsed_ms:.2f}ms (budget < 25ms)"
    for link in links:
        assert link["source"] != link["target"]
        assert 0.0 <= link["strength"] <= 1.0
        assert link["best_lag_steps"] in (1, 2)
