
"""Tests for vectorized sliding-window feature extraction."""

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


N_FEATURES = len(SENSOR_COLS) * len(STAT_NAMES)


def _make_episode_df(
    episode_id: int,
    status: int,
    num_rows: int,
    base_offset: float = 0.0,
) -> pd.DataFrame:
    """Create deterministic sensor data with a distinct linear signal per sensor."""

    t = np.arange(num_rows, dtype=np.float32)

    data = {
        col: (
            base_offset
            + idx * 10.0
            + (idx + 1) * 0.5 * t
        ).astype(np.float32)
        for idx, col in enumerate(SENSOR_COLS)
    }

    df = pd.DataFrame(data)
    df["STATUS"] = np.int16(status)
    df["episode_id"] = np.int32(episode_id)

    return df


# ---------------------------------------------------------------------
# Feature dimensions, data types and numerical stability
# ---------------------------------------------------------------------

def test_batch_feature_shape_dtype_and_finite_values():
    """Verify feature dimensions, dtype and numerical stability."""

    total_rows = 50
    window_size = DEFAULT_WINDOW_SIZE

    df = _make_episode_df(
        episode_id=1,
        status=0,
        num_rows=total_rows,
    )

    X, y, episode_ids = extract_window_features_batch(
        df,
        sensor_cols=SENSOR_COLS,
        window_size=window_size,
    )

    expected_windows = total_rows - window_size + 1

    assert X.shape == (expected_windows, N_FEATURES)
    assert X.dtype == np.float32
    assert np.isfinite(X).all()

    assert y.shape == (expected_windows,)
    assert (y == 0).all()

    assert episode_ids.shape == (expected_windows,)
    assert (episode_ids == 1).all()

    assert len(get_feature_names(SENSOR_COLS)) == N_FEATURES
    assert N_FEATURES == 312


def test_feature_names_are_unique():
    """Ensure every generated feature has a unique name."""

    names = get_feature_names(SENSOR_COLS)

    assert len(names) == N_FEATURES
    assert len(set(names)) == len(names)


# ---------------------------------------------------------------------
# Episode boundary isolation
# ---------------------------------------------------------------------

def test_batch_features_never_cross_episode_boundaries():
    """Verify windows are independently generated inside each episode."""

    window_size = DEFAULT_WINDOW_SIZE

    ep1 = _make_episode_df(
        episode_id=1,
        status=0,
        num_rows=30,
        base_offset=0.0,
    )

    ep2 = _make_episode_df(
        episode_id=2,
        status=4,
        num_rows=25,
        base_offset=10_000.0,
    )

    ep3 = _make_episode_df(
        episode_id=3,
        status=6,
        num_rows=10,
        base_offset=50_000.0,
    )

    df = pd.concat(
        [ep1, ep2, ep3],
        ignore_index=True,
    )

    X, y, episode_ids = extract_window_features_batch(
        df,
        sensor_cols=SENSOR_COLS,
        window_size=window_size,
    )

    expected_ep1 = 30 - window_size + 1
    expected_ep2 = 25 - window_size + 1

    assert X.shape == (
        expected_ep1 + expected_ep2,
        N_FEATURES,
    )

    assert (episode_ids == 1).sum() == expected_ep1
    assert (episode_ids == 2).sum() == expected_ep2
    assert (episode_ids == 3).sum() == 0

    assert (y[episode_ids == 1] == 0).all()
    assert (y[episode_ids == 2] == 4).all()

    # The first episode must not contain values from the second episode.
    ep1_max_features = X[episode_ids == 1, 4::6]

    assert (ep1_max_features < 2_000.0).all()

    # The second episode must not contain values from the first episode.
    ep2_min_features = X[episode_ids == 2, 3::6]

    assert (ep2_min_features >= 10_000.0).all()


def test_batch_output_preserves_episode_order():
    """Verify windows are returned in the original episode order."""

    ep1 = _make_episode_df(1, 0, 25, 0.0)
    ep2 = _make_episode_df(2, 4, 25, 10_000.0)

    df = pd.concat([ep1, ep2], ignore_index=True)

    _, _, episode_ids = extract_window_features_batch(
        df,
        sensor_cols=SENSOR_COLS,
        window_size=DEFAULT_WINDOW_SIZE,
    )

    first_ep2_position = np.where(episode_ids == 2)[0][0]

    assert (episode_ids[:first_ep2_position] == 1).all()
    assert (episode_ids[first_ep2_position:] == 2).all()


# ---------------------------------------------------------------------
# Single-window and batch consistency
# ---------------------------------------------------------------------

def test_single_window_matches_final_batch_window():
    """Verify single-window output equals the final batch window."""

    total_rows = 45
    window_size = DEFAULT_WINDOW_SIZE

    rng = np.random.default_rng(seed=99)

    data = {
        col: rng.normal(
            loc=50.0,
            scale=5.0,
            size=total_rows,
        ).astype(np.float32)
        for col in SENSOR_COLS
    }

    df = pd.DataFrame(data)
    df["STATUS"] = np.int16(1)
    df["episode_id"] = np.int32(7)

    X_batch, _, _ = extract_window_features_batch(
        df,
        sensor_cols=SENSOR_COLS,
        window_size=window_size,
    )

    X_single = extract_single_window(
        df[SENSOR_COLS],
        sensor_cols=SENSOR_COLS,
        window_size=window_size,
    )

    assert X_single.shape == (1, N_FEATURES)
    assert X_single.dtype == np.float32

    np.testing.assert_allclose(
        X_single[0],
        X_batch[-1],
        atol=1e-5,
        rtol=0.0,
    )


def test_single_window_uses_last_window_when_extra_rows_exist():
    """Verify single-window extraction uses the trailing window."""

    window_size = 5

    df = pd.DataFrame({
        "S1": np.arange(10, dtype=np.float32),
    })

    X = extract_single_window(
        df,
        sensor_cols=["S1"],
        window_size=window_size,
    )

    assert X.shape == (1, 6)
    assert X[0, 0] == pytest.approx(9.0)


# ---------------------------------------------------------------------
# Analytical statistical correctness
# ---------------------------------------------------------------------

def test_analytical_statistics_for_linear_signal():
    """Verify current, mean, sample std, min, max and linear trend."""

    window_size = 5

    ramp = np.array(
        [2.0, 4.0, 6.0, 8.0, 10.0],
        dtype=np.float32,
    )

    df = pd.DataFrame({
        "S1": ramp,
        "STATUS": 0,
        "episode_id": 1,
    })

    X, _, _ = extract_window_features_batch(
        df,
        sensor_cols=["S1"],
        window_size=window_size,
    )

    assert X.shape == (1, 6)

    current, mean, std, min_val, max_val, trend = X[0]

    assert current == pytest.approx(10.0, abs=1e-5)
    assert mean == pytest.approx(6.0, abs=1e-5)

    # Sample standard deviation of [2, 4, 6, 8, 10].
    assert std == pytest.approx(np.sqrt(10.0), abs=1e-5)

    assert min_val == pytest.approx(2.0, abs=1e-5)
    assert max_val == pytest.approx(10.0, abs=1e-5)
    assert trend == pytest.approx(2.0, abs=1e-5)


def test_constant_signal_has_zero_trend():
    """Verify a constant signal has zero linear trend."""

    df = pd.DataFrame({
        "S1": np.full(5, 7.0, dtype=np.float32),
    })

    X, _, _ = extract_window_features_batch(
        df,
        sensor_cols=["S1"],
        window_size=5,
    )

    assert X.shape == (1, 6)
    assert X[0, 0] == pytest.approx(7.0)
    assert X[0, 1] == pytest.approx(7.0)
    assert X[0, 2] == pytest.approx(0.0, abs=1e-5)
    assert X[0, 3] == pytest.approx(7.0)
    assert X[0, 4] == pytest.approx(7.0)
    assert X[0, 5] == pytest.approx(0.0, abs=1e-5)


# ---------------------------------------------------------------------
# Empty and short episode handling
# ---------------------------------------------------------------------

def test_empty_dataframe_returns_empty_feature_arrays():
    """Verify empty input produces correctly shaped empty arrays."""

    empty_df = pd.DataFrame(
        columns=list(SENSOR_COLS) + ["STATUS", "episode_id"]
    )

    X, y, episode_ids = extract_window_features_batch(empty_df)

    assert X.shape == (0, N_FEATURES)
    assert X.dtype == np.float32

    assert y.shape == (0,)
    assert episode_ids.shape == (0,)


def test_episode_shorter_than_window_is_skipped():
    """Verify an episode shorter than the window produces no windows."""

    df = _make_episode_df(
        episode_id=1,
        status=0,
        num_rows=10,
    )

    X, y, episode_ids = extract_window_features_batch(
        df,
        sensor_cols=SENSOR_COLS,
        window_size=DEFAULT_WINDOW_SIZE,
    )

    assert X.shape == (0, N_FEATURES)
    assert len(y) == 0
    assert len(episode_ids) == 0


def test_exact_window_length_produces_one_window():
    """Verify T == W produces exactly one window."""

    df = _make_episode_df(
        episode_id=1,
        status=0,
        num_rows=DEFAULT_WINDOW_SIZE,
    )

    X, y, episode_ids = extract_window_features_batch(
        df,
        sensor_cols=SENSOR_COLS,
        window_size=DEFAULT_WINDOW_SIZE,
    )

    assert X.shape == (1, N_FEATURES)
    assert y.shape == (1,)
    assert episode_ids.shape == (1,)


# ---------------------------------------------------------------------
# Input validation and error handling
# ---------------------------------------------------------------------

def test_single_window_rejects_short_input():
    """Verify single-window extraction rejects insufficient observations."""

    df = _make_episode_df(
        episode_id=1,
        status=0,
        num_rows=10,
    )

    with pytest.raises(
        ValueError,
        match="fewer than window_size",
    ):
        extract_single_window(
            df,
            window_size=DEFAULT_WINDOW_SIZE,
        )


@pytest.mark.parametrize("invalid_window_size", [0, -1])
def test_batch_rejects_invalid_window_size(invalid_window_size):
    """Verify zero and negative window sizes are rejected."""

    df = _make_episode_df(
        episode_id=1,
        status=0,
        num_rows=25,
    )

    with pytest.raises(
        ValueError,
        match="window_size must be >= 1",
    ):
        extract_window_features_batch(
            df,
            window_size=invalid_window_size,
        )


def test_single_window_rejects_missing_sensor_column():
    """Verify missing required sensor columns raise KeyError."""

    df = _make_episode_df(
        episode_id=1,
        status=0,
        num_rows=25,
    )

    missing_sensor = SENSOR_COLS[0]
    incomplete_df = df.drop(columns=[missing_sensor])

    with pytest.raises(
        KeyError,
        match="sensor columns missing",
    ):
        extract_single_window(
            incomplete_df,
            window_size=5,
        )
