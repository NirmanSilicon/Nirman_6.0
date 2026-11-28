
"""Vectorized sliding-window feature extraction for Tennessee Eastman Process data.

Computes per-sensor rolling statistical and trend features using NumPy stride
tricks without Python row loops, strictly respecting episode boundaries when
episode metadata is available.
"""

from collections.abc import Sequence

import numpy as np
import pandas as pd
from numpy.lib.stride_tricks import sliding_window_view

from app.config import DEFAULT_WINDOW_SIZE, SENSOR_COLS

STAT_NAMES: tuple[str, ...] = (
    "current",
    "mean",
    "std",
    "min",
    "max",
    "linear_trend",
)


def get_feature_names(sensor_cols: Sequence[str] = SENSOR_COLS) -> list[str]:
    """Return ordered feature names matching the 6 stats per sensor column."""
    return [f"{col}_{stat}" for col in sensor_cols for stat in STAT_NAMES]


def _compute_slope_weights(window_size: int) -> np.ndarray:
    """Precompute closed-form OLS slope weights for t = 0..window_size-1."""
    if window_size <= 1:
        return np.zeros((window_size,), dtype=np.float64)

    t = np.arange(window_size, dtype=np.float64)
    t_centered = t - t.mean()
    denom = float(np.dot(t_centered, t_centered))

    return t_centered / denom


def _compute_window_stats(
    windows: np.ndarray,
    slope_weights: np.ndarray,
) -> np.ndarray:
    """Compute 6 summary features per sensor across an array of windows.

    Args:
        windows: Array of shape (num_windows, num_sensors, window_size).
        slope_weights: Precomputed OLS weights of shape (window_size,).

    Returns:
        Feature matrix of shape (num_windows, num_sensors * 6), dtype float32.
    """
    win_f64 = np.asarray(windows, dtype=np.float64)

    n_win, n_sensors, window_size = win_f64.shape

    current = win_f64[:, :, -1]
    mean = win_f64.mean(axis=2)

    # Use sample standard deviation. For a single-value window, define std as 0.
    if window_size > 1:
        std = win_f64.std(axis=2, ddof=1)
    else:
        std = np.zeros((n_win, n_sensors), dtype=np.float64)

    min_val = win_f64.min(axis=2)
    max_val = win_f64.max(axis=2)
    linear_trend = win_f64 @ slope_weights

    stacked = np.stack(
        [
            current,
            mean,
            std,
            min_val,
            max_val,
            linear_trend,
        ],
        axis=-1,
    )

    return stacked.reshape(
        n_win,
        n_sensors * len(STAT_NAMES),
    ).astype(np.float32)


def _validate_inputs(
    df: pd.DataFrame,
    sensor_cols: Sequence[str],
    window_size: int,
    required_meta_cols: Sequence[str] = (),
) -> list[str]:
    """Validate window_size and presence of required columns."""
    if window_size < 1:
        raise ValueError(f"window_size must be >= 1, got {window_size}")

    cols = list(sensor_cols)

    if not cols:
        raise ValueError("sensor_cols must not be empty")

    missing_meta = [
        col for col in required_meta_cols
        if col not in df.columns
    ]

    if missing_meta:
        raise ValueError(
            f"Required metadata columns missing from DataFrame: {missing_meta}"
        )

    missing_sensors = [
        col for col in cols
        if col not in df.columns
    ]

    if missing_sensors:
        raise KeyError(
            f"Requested sensor columns missing from DataFrame: {missing_sensors}"
        )

    return cols


def extract_window_features_batch(
    df: pd.DataFrame,
    sensor_cols: Sequence[str] = SENSOR_COLS,
    window_size: int = DEFAULT_WINDOW_SIZE,
) -> tuple[np.ndarray, np.ndarray, np.ndarray]:
    """Extract vectorized sliding-window features.

    If episode_id and STATUS are available, windows respect episode boundaries
    and return the corresponding labels and episode IDs.

    If neither metadata column is available, the DataFrame is treated as one
    continuous sensor sequence. In that case, X contains the extracted features
    and y and episode_ids are empty because no labels or episode IDs were given.

    Supplying only one of the two metadata columns is invalid.

    Episodes shorter than window_size produce zero windows.
    """
    cols = _validate_inputs(
        df=df,
        sensor_cols=sensor_cols,
        window_size=window_size,
    )

    n_features = len(cols) * len(STAT_NAMES)

    has_episode_id = "episode_id" in df.columns
    has_status = "STATUS" in df.columns

    if has_episode_id != has_status:
        raise ValueError(
            "Both 'episode_id' and 'STATUS' must be provided together."
        )

    has_metadata = has_episode_id and has_status

    if df.empty:
        return (
            np.empty((0, n_features), dtype=np.float32),
            np.empty((0,), dtype=np.int64),
            np.empty((0,), dtype=np.int32),
        )

    slope_weights = _compute_slope_weights(window_size)

    feature_chunks: list[np.ndarray] = []
    label_chunks: list[np.ndarray] = []
    episode_chunks: list[np.ndarray] = []

    if has_metadata:
        groups = df.groupby("episode_id", sort=False)
    else:
        # Without metadata, process the entire DataFrame as one sequence.
        groups = [(None, df)]

    for ep_id, ep_df in groups:
        if len(ep_df) < window_size:
            continue

        ep_values = ep_df[cols].to_numpy(
            dtype=np.float64,
            copy=False,
        )

        # Shape: (T - W + 1, C, W)
        windows = sliding_window_view(
            ep_values,
            window_shape=window_size,
            axis=0,
        )

        x_ep = _compute_window_stats(
            windows,
            slope_weights,
        )

        feature_chunks.append(x_ep)

        if has_metadata:
            y_ep = ep_df["STATUS"].to_numpy(
                dtype=np.int64,
                copy=False,
            )[window_size - 1:]

            ep_arr = np.full(
                len(x_ep),
                int(ep_id),
                dtype=np.int32,
            )

            label_chunks.append(y_ep)
            episode_chunks.append(ep_arr)

    if not feature_chunks:
        return (
            np.empty((0, n_features), dtype=np.float32),
            np.empty((0,), dtype=np.int64),
            np.empty((0,), dtype=np.int32),
        )

    X = np.concatenate(feature_chunks, axis=0)

    if has_metadata:
        y = np.concatenate(label_chunks, axis=0)
        episode_ids = np.concatenate(episode_chunks, axis=0)
    else:
        y = np.empty((0,), dtype=np.int64)
        episode_ids = np.empty((0,), dtype=np.int32)

    return X, y, episode_ids


def extract_single_window(
    window_df: pd.DataFrame,
    sensor_cols: Sequence[str] = SENSOR_COLS,
    window_size: int = DEFAULT_WINDOW_SIZE,
) -> np.ndarray:
    """Extract a single feature vector from the last W rows.

    Designed for low-latency live inference without requiring episode_id
    or STATUS metadata.
    """
    cols = _validate_inputs(
        df=window_df,
        sensor_cols=sensor_cols,
        window_size=window_size,
    )

    if len(window_df) < window_size:
        raise ValueError(
            f"window_df has {len(window_df)} rows, "
            f"which is fewer than window_size={window_size}"
        )

    tail_values = window_df[cols].iloc[-window_size:].to_numpy(
        dtype=np.float64,
        copy=False,
    )

    # Reshape (W, C) -> (1, C, W).
    window = tail_values.T[np.newaxis, :, :]

    slope_weights = _compute_slope_weights(window_size)

    return _compute_window_stats(
        window,
        slope_weights,
    )
