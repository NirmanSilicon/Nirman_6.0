"""Vectorized sliding-window feature extraction for Tennessee Eastman Process data.

Computes per-sensor rolling statistical and trend features using NumPy stride
tricks without Python row loops, strictly respecting episode boundaries.
"""

from collections.abc import Sequence
import numpy as np
from numpy.lib.stride_tricks import sliding_window_view
import pandas as pd

from app.config import DEFAULT_WINDOW_SIZE, SENSOR_COLS

STAT_NAMES: tuple[str, ...] = ("current", "mean", "std", "min", "max", "linear_trend")


def get_feature_names(sensor_cols: Sequence[str] = SENSOR_COLS) -> list[str]:
    """Return ordered feature names matching the 6 stats per sensor column."""
    return [f"{col}_{stat}" for col in sensor_cols for stat in STAT_NAMES]


def _compute_slope_weights(window_size: int) -> np.ndarray:
    """Precompute closed-form OLS slope weights for t = 0..window_size-1.

    For centered t_c = t - mean(t), slope = sum(t_c * x_t) / sum(t_c^2).
    """
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
        slope_weights: Precomputed 1D OLS weights of shape (window_size,).

    Returns:
        np.ndarray: Feature matrix of shape (num_windows, num_sensors * 6), dtype float32.
    """
    win_f64 = np.asarray(windows, dtype=np.float64)
    n_win, n_sensors, _ = win_f64.shape

    current = win_f64[:, :, -1]
    mean = win_f64.mean(axis=2)
    std = win_f64.std(axis=2)
    min_val = win_f64.min(axis=2)
    max_val = win_f64.max(axis=2)
    linear_trend = win_f64 @ slope_weights

    # Stack along last axis -> (n_win, n_sensors, 6) then flatten to (n_win, n_sensors * 6)
    stacked = np.stack(
        [current, mean, std, min_val, max_val, linear_trend],
        axis=-1,
    )
    return stacked.reshape(n_win, n_sensors * len(STAT_NAMES)).astype(np.float32)


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

    missing_meta = [c for c in required_meta_cols if c not in df.columns]
    if missing_meta:
        raise ValueError(f"Required metadata columns missing from DataFrame: {missing_meta}")

    missing_sensors = [c for c in cols if c not in df.columns]
    if missing_sensors:
        raise KeyError(f"Requested sensor columns missing from DataFrame: {missing_sensors}")

    return cols


def extract_window_features_batch(
    df: pd.DataFrame,
    sensor_cols: Sequence[str] = SENSOR_COLS,
    window_size: int = DEFAULT_WINDOW_SIZE,
) -> tuple[np.ndarray, np.ndarray, np.ndarray]:
    """Extract vectorized sliding-window features within each episode_id separately.

    Windows never cross episode_id boundaries. Episodes shorter than window_size
    produce 0 windows and are skipped.

    Args:
        df: DataFrame containing sensor_cols, 'STATUS', and 'episode_id'.
        sensor_cols: Sequence of sensor column names (default 52 SENSOR_COLS).
        window_size: Rolling window length W (default DEFAULT_WINDOW_SIZE=20).

    Returns:
        tuple[np.ndarray, np.ndarray, np.ndarray]:
            - X: float32 feature array of shape (N, len(sensor_cols) * 6), e.g. (N, 312).
            - y: int64 STATUS labels array of shape (N,).
            - episode_ids: int32 episode IDs array of shape (N,).

    Raises:
        ValueError: If window_size < 1 or required metadata columns are missing.
        KeyError: If any requested sensor column is missing.
    """
    cols = _validate_inputs(
        df=df,
        sensor_cols=sensor_cols,
        window_size=window_size,
        required_meta_cols=("episode_id", "STATUS"),
    )
    n_features = len(cols) * len(STAT_NAMES)

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

    for ep_id, ep_df in df.groupby("episode_id", sort=False):
        if len(ep_df) < window_size:
            continue

        ep_values = ep_df[cols].to_numpy(dtype=np.float64, copy=False)
        # sliding_window_view along axis=0 yields shape (T - W + 1, C, W)
        windows = sliding_window_view(ep_values, window_shape=window_size, axis=0)
        x_ep = _compute_window_stats(windows, slope_weights)

        y_ep = ep_df["STATUS"].to_numpy(dtype=np.int64, copy=False)[window_size - 1 :]
        ep_arr = np.full(len(x_ep), int(ep_id), dtype=np.int32)

        feature_chunks.append(x_ep)
        label_chunks.append(y_ep)
        episode_chunks.append(ep_arr)

    if not feature_chunks:
        return (
            np.empty((0, n_features), dtype=np.float32),
            np.empty((0,), dtype=np.int64),
            np.empty((0,), dtype=np.int32),
        )

    X = np.concatenate(feature_chunks, axis=0)
    y = np.concatenate(label_chunks, axis=0)
    episode_ids = np.concatenate(episode_chunks, axis=0)
    return X, y, episode_ids


def extract_single_window(
    window_df: pd.DataFrame,
    sensor_cols: Sequence[str] = SENSOR_COLS,
    window_size: int = DEFAULT_WINDOW_SIZE,
) -> np.ndarray:
    """Extract a single (1, 312) feature vector from the last W rows of window_df.

    Designed for low-latency live inference without requiring 'episode_id' or 'STATUS'.

    Args:
        window_df: DataFrame with at least window_size rows containing sensor_cols.
        sensor_cols: Sequence of sensor column names (default 52 SENSOR_COLS).
        window_size: Rolling window length W (default DEFAULT_WINDOW_SIZE=20).

    Returns:
        np.ndarray: float32 feature array of shape (1, len(sensor_cols) * 6).

    Raises:
        ValueError: If window_df has fewer than window_size rows or window_size < 1.
        KeyError: If any requested sensor column is missing.
    """
    cols = _validate_inputs(
        df=window_df,
        sensor_cols=sensor_cols,
        window_size=window_size,
    )

    if len(window_df) < window_size:
        raise ValueError(
            f"window_df has {len(window_df)} rows, which is fewer than window_size={window_size}"
        )

    tail_values = window_df[cols].iloc[-window_size:].to_numpy(dtype=np.float64, copy=False)
    # Reshape (W, C) -> (1, C, W) to share exact vectorized computation path
    window = tail_values.T[np.newaxis, :, :]
    slope_weights = _compute_slope_weights(window_size)
    return _compute_window_stats(window, slope_weights)
