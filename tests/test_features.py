"""Tests for vectorized sliding-window feature extraction in app/services/features.py.

Verifies:
1. extract_window_features_batch returns (T - W + 1, 312) float32 for a single episode
   with zero NaNs or Infs.
2. Windows never cross episode_id boundaries when multiple episodes are passed.
3. extract_single_window matches the final row of extract_window_features_batch within 1e-5.
4. Analytical accuracy of current, mean, std, min, max, and closed-form linear_trend.
5. Error handling and short-episode edge cases.
"""

import numpy as np
import pandas as pd
import pytest

from app.config import DEFAULT_WINDOW_SIZE, SENSOR_COLS
from app.services.features import (
    STAT_NAMES,
    extract_single_window,
    extract_window_features_batch,
    get_feature_names,
)


def _make_episode_df(
    episode_id: int,
    status: int,
    num_rows: int,
    base_offset: float = 0.0,
) -> pd.DataFrame:
    """Create a synthetic episode DataFrame with deterministic linear signals."""
    t = np.arange(num_rows, dtype=np.float32)
    data: dict[str, np.ndarray] = {}
    for idx, col in enumerate(SENSOR_COLS):
        # Distinct slope & offset per sensor and episode
        data[col] = (base_offset + idx * 10.0 + (idx + 1) * 0.5 * t).astype(np.float32)
    df = pd.DataFrame(data)
    df["STATUS"] = np.int16(status)
    df["episode_id"] = np.int32(episode_id)
    return df


def test_extract_window_features_batch_single_episode_shape_and_finite() -> None:
    """Verify shape (T - W + 1, 312), dtype float32, and absence of NaNs/Infs."""
    T = 50
    W = DEFAULT_WINDOW_SIZE  # 20
    ep_df = _make_episode_df(episode_id=1, status=0, num_rows=T)

    X, y, ep_ids = extract_window_features_batch(ep_df, sensor_cols=SENSOR_COLS, window_size=W)

    assert X.shape == (T - W + 1, 312)
    assert X.dtype == np.float32
    assert np.isfinite(X).all(), "Feature matrix must contain no NaNs or Infs"

    assert y.shape == (T - W + 1,)
    assert (y == 0).all()
    assert ep_ids.shape == (T - W + 1,)
    assert (ep_ids == 1).all()
    assert len(get_feature_names(SENSOR_COLS)) == len(SENSOR_COLS) * len(STAT_NAMES) == 312


def test_extract_window_features_batch_respects_episode_boundaries() -> None:
    """Verify windows never cross episode_id boundaries across multiple episodes."""
    W = DEFAULT_WINDOW_SIZE  # 20
    # Episode 1: 30 rows (STATUS=0, values near 0) -> 11 windows
    # Episode 2: 25 rows (STATUS=4, values near 10000) -> 6 windows
    # Episode 3: 10 rows (STATUS=6, shorter than W=20) -> 0 windows (skipped)
    ep1 = _make_episode_df(episode_id=1, status=0, num_rows=30, base_offset=0.0)
    ep2 = _make_episode_df(episode_id=2, status=4, num_rows=25, base_offset=10_000.0)
    ep3 = _make_episode_df(episode_id=3, status=6, num_rows=10, base_offset=50_000.0)

    multi_df = pd.concat([ep1, ep2, ep3], ignore_index=True)
    X, y, ep_ids = extract_window_features_batch(multi_df, sensor_cols=SENSOR_COLS, window_size=W)

    expected_n = (30 - W + 1) + (25 - W + 1)  # 11 + 6 = 17
    assert X.shape == (expected_n, 312)
    assert y.shape == (expected_n,)
    assert ep_ids.shape == (expected_n,)

    # Verify episode_id counts and label isolation
    assert (ep_ids == 1).sum() == 11
    assert (ep_ids == 2).sum() == 6
    assert (ep_ids == 3).sum() == 0

    assert (y[ep_ids == 1] == 0).all()
    assert (y[ep_ids == 2] == 4).all()

    # Check that no window from ep1 contains the 10000.0 jump from ep2
    # Max possible value in ep1 is 0 + 51*10 + 52*0.5*29 = 1264.0
    ep1_max_features = X[ep_ids == 1, 4::6]  # 'max' feature for every sensor
    assert (ep1_max_features < 2000.0).all(), "Window leaked values across episode boundary"

    # Min possible value in ep2 is >= 10000.0
    ep2_min_features = X[ep_ids == 2, 3::6]  # 'min' feature for every sensor
    assert (ep2_min_features >= 10_000.0).all(), "Window leaked ep1 values into ep2"


def test_extract_single_window_matches_batch_final_row() -> None:
    """Verify extract_single_window matches the final row of extract_window_features_batch."""
    T = 45
    W = DEFAULT_WINDOW_SIZE
    rng = np.random.default_rng(seed=99)
    data = {col: rng.normal(loc=50.0, scale=5.0, size=T).astype(np.float32) for col in SENSOR_COLS}
    df = pd.DataFrame(data)
    df["STATUS"] = np.int16(1)
    df["episode_id"] = np.int32(7)

    X_batch, _, _ = extract_window_features_batch(df, sensor_cols=SENSOR_COLS, window_size=W)
    # Pass only sensor columns to extract_single_window (no metadata required)
    X_single = extract_single_window(df[SENSOR_COLS], sensor_cols=SENSOR_COLS, window_size=W)

    assert X_single.shape == (1, 312)
    assert X_single.dtype == np.float32
    np.testing.assert_allclose(X_single[0], X_batch[-1], atol=1e-5, rtol=0.0)


def test_analytical_window_statistics_exactness() -> None:
    """Verify exact values of current, mean, std, min, max, and linear_trend."""
    W = 5
    # Single sensor with linear ramp: [2, 4, 6, 8, 10] -> slope = 2.0, mean = 6.0, std = sqrt(8)
    ramp = np.array([2.0, 4.0, 6.0, 8.0, 10.0], dtype=np.float32)
    df = pd.DataFrame({"S1": ramp, "STATUS": 0, "episode_id": 1})

    X, _, _ = extract_window_features_batch(df, sensor_cols=["S1"], window_size=W)
    assert X.shape == (1, 6)

    current, mean, std, min_val, max_val, trend = X[0]
    assert current == pytest.approx(10.0, abs=1e-5)
    assert mean == pytest.approx(6.0, abs=1e-5)
    assert std == pytest.approx(np.sqrt(8.0), abs=1e-5)
    assert min_val == pytest.approx(2.0, abs=1e-5)
    assert max_val == pytest.approx(10.0, abs=1e-5)
    assert trend == pytest.approx(2.0, abs=1e-5)


def test_edge_cases_and_error_handling() -> None:
    """Verify empty frames, short episodes, and invalid arguments behave properly."""
    # Empty DataFrame
    empty_df = pd.DataFrame(columns=list(SENSOR_COLS) + ["STATUS", "episode_id"])
    X, y, ep_ids = extract_window_features_batch(empty_df)
    assert X.shape == (0, 312)
    assert X.dtype == np.float32
    assert len(y) == 0
    assert len(ep_ids) == 0

    # Short single_window raises ValueError
    short_df = _make_episode_df(episode_id=1, status=0, num_rows=10)
    with pytest.raises(ValueError, match="fewer than window_size"):
        extract_single_window(short_df, window_size=20)

    # Invalid window_size raises ValueError
    with pytest.raises(ValueError, match="window_size must be >= 1"):
        extract_window_features_batch(short_df, window_size=0)

    # Missing sensor column raises KeyError
    with pytest.raises(KeyError, match="sensor columns missing"):
        extract_single_window(short_df.drop(columns=[SENSOR_COLS[0]]), window_size=5)
