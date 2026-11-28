
"""Tests for causal propagation link discovery in app/services/causality.py."""

import time

import numpy as np
import pandas as pd
import pytest

from app.config import DEFAULT_WINDOW_SIZE, PARQUET_PATH, TARGET_FAULTS
from app.services.alarm_engine import consolidate_alarm_flood
from app.services.causality import compute_causal_links
from app.services.tep_loader import (
    compute_normal_baseline,
    load_tep_parquet,
    split_episodes,
)


def test_compute_causal_links_synthetic_lagged_signal() -> None:
    """Verify that A[t-1] predicts B[t] with a lag of one step."""
    rng = np.random.default_rng(seed=42)

    n_steps = 100
    a = rng.normal(size=n_steps)
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

    assert isinstance(links, list)
    assert len(links) >= 1

    top_link = links[0]

    assert top_link["source"] == "A"
    assert top_link["target"] == "B"
    assert top_link["best_lag_steps"] == 1
    assert top_link["lag_minutes"] == 3
    assert top_link["correlation"] > 0.85
    assert top_link["p_value"] is not None
    assert 0 <= top_link["p_value"] < 0.05
    assert top_link["method"] == "granger+corr"
    assert 0.8 <= top_link["strength"] <= 1.0
    assert "A leads B" in top_link["explanation"]


def test_compute_causal_links_constant_series_safe() -> None:
    """Constant or zero-variance signals should not produce causal links."""

    window_df = pd.DataFrame(
        {
            "CONST_1": np.full(30, 42.0),
            "CONST_2": np.full(30, -5.0),
        }
    )

    links = compute_causal_links(
        window_df=window_df,
        candidate_sensors=["CONST_1", "CONST_2"],
        max_links=5,
    )

    assert links == []

    # One constant and one active sensor are insufficient to establish
    # a relationship between two varying signals.
    mixed_df = pd.DataFrame(
        {
            "CONST_1": np.full(30, 10.0),
            "ACTIVE": np.linspace(0.0, 5.0, 30),
        }
    )

    assert compute_causal_links(
        window_df=mixed_df,
        candidate_sensors=["CONST_1", "ACTIVE"],
    ) == []


def test_compute_causal_links_duplicate_candidates() -> None:
    """Duplicate candidate sensor names should not create duplicate links."""

    rng = np.random.default_rng(seed=123)

    a = rng.normal(size=60)
    b = np.zeros(60)
    b[1:] = a[:-1] + 0.02 * rng.normal(size=59)

    window_df = pd.DataFrame({"A": a, "B": b})

    links = compute_causal_links(
        window_df=window_df,
        candidate_sensors=["A", "B", "A", "B"],
        max_links=5,
        max_lag=2,
    )

    pairs = [(link["source"], link["target"]) for link in links]

    assert len(pairs) == len(set(pairs))


def test_compute_causal_links_respects_max_links() -> None:
    """The number of returned links must not exceed max_links."""

    rng = np.random.default_rng(seed=456)

    a = rng.normal(size=100)
    b = np.zeros(100)
    c = np.zeros(100)

    b[1:] = a[:-1] + 0.05 * rng.normal(size=99)
    c[1:] = b[:-1] + 0.05 * rng.normal(size=99)

    window_df = pd.DataFrame({"A": a, "B": b, "C": c})

    links = compute_causal_links(
        window_df=window_df,
        candidate_sensors=["A", "B", "C"],
        max_links=1,
        max_lag=2,
    )

    assert len(links) <= 1


@pytest.fixture(scope="module")
def fault6_causal_context():
    """Load the real TEP dataset and prepare a Fault 6 analysis window."""

    df = load_tep_parquet(
        path=PARQUET_PATH,
        target_faults=TARGET_FAULTS,
    )

    train_df, _, test_df = split_episodes(
        df,
        train_ratio=0.70,
        val_ratio=0.15,
        seed=42,
    )

    baseline = compute_normal_baseline(train_df)

    fault6_rows = test_df[test_df["STATUS"] == 6]

    if fault6_rows.empty:
        pytest.skip("No Fault 6 samples found in the test split.")

    ep_id = fault6_rows["episode_id"].iloc[0]

    episode_df = test_df[test_df["episode_id"] == ep_id]

    if len(episode_df) < DEFAULT_WINDOW_SIZE:
        pytest.skip("Fault 6 episode is shorter than the default window size.")

    window_df = (
        episode_df.iloc[:DEFAULT_WINDOW_SIZE]
        .reset_index(drop=True)
    )

    alarm_report = consolidate_alarm_flood(
        window_df,
        baseline,
        top_k=5,
    )

    candidates = []

    first_triggered = alarm_report.get("first_triggered_tag")

    if first_triggered:
        candidates.append(first_triggered)

    candidates.extend(
        alarm["tag"]
        for alarm in alarm_report.get("priority_alarms", [])
    )

    # Preserve order while removing duplicate sensor names.
    candidates = list(dict.fromkeys(candidates))

    return window_df, candidates


def test_compute_causal_links_real_fault6_output(
    fault6_causal_context,
) -> None:
    """Verify causal links are generated for a real Fault 6 window."""

    window_df, candidates = fault6_causal_context

    if len(candidates) < 2:
        pytest.skip("Fewer than two candidate sensors were identified.")

    links = compute_causal_links(
        window_df,
        candidates,
        max_links=5,
    )

    assert isinstance(links, list)
    assert len(links) > 0, (
        "Expected non-empty causal links for the real Fault 6 cascade."
    )

    for link in links:
        assert link["source"] != link["target"]
        assert link["source"] in candidates
        assert link["target"] in candidates
        assert 0.0 <= link["strength"] <= 1.0
        assert link["best_lag_steps"] in (1, 2)
        assert link["lag_minutes"] > 0
        assert link["method"] == "granger+corr"


def test_compute_causal_links_real_fault6_performance(
    fault6_causal_context,
) -> None:
    """Check steady-state causal-link execution time."""

    window_df, candidates = fault6_causal_context

    if len(candidates) < 2:
        pytest.skip("Fewer than two candidate sensors were identified.")

    # Warm up before measuring to reduce one-time initialization overhead.
    compute_causal_links(
        window_df,
        candidates,
        max_links=5,
    )

    start_time = time.perf_counter()

    compute_causal_links(
        window_df,
        candidates,
        max_links=5,
    )

    elapsed_ms = (time.perf_counter() - start_time) * 1000

    assert elapsed_ms < 100.0, (
        f"compute_causal_links took {elapsed_ms:.2f} ms "
        "(expected under 100 ms)."
    )
