"""Tennessee Eastman Process (TEP) dataset loader, episode splitter, and baseline calculator.

Follows clean functional design principles without global mutable state.
"""

from collections.abc import Sequence
import os
from pathlib import Path
import numpy as np
import pandas as pd

from app.config import PARQUET_PATH, SENSOR_COLS, TARGET_FAULTS


def _resolve_data_path(path: str | Path) -> Path:
    """Resolve a file path, checking both cwd and repo root if relative."""
    p = Path(path)
    if p.is_file():
        return p.resolve()
    # If relative and not found in cwd, look relative to project root
    project_root = Path(__file__).resolve().parents[2]
    candidate = project_root / p
    if candidate.is_file():
        return candidate.resolve()
    raise FileNotFoundError(f"Parquet dataset not found at '{path}' (checked cwd and {candidate})")


def load_tep_parquet(
    path: str | Path = PARQUET_PATH,
    target_faults: Sequence[int] | None = TARGET_FAULTS,
) -> pd.DataFrame:
    """Load TEP dataset from Parquet, filter to target faults, and assign episode IDs.

    Args:
        path: Path to the processed Parquet dataset file.
        target_faults: Optional sequence of STATUS codes to retain.
            If None, all statuses are retained. Defaults to TARGET_FAULTS.

    Returns:
        pd.DataFrame: Processed DataFrame containing an added 'episode_id' column.

    Raises:
        FileNotFoundError: If the parquet file cannot be found.
        ValueError: If 'STATUS' column is missing from the dataset.
    """
    resolved_path = _resolve_data_path(path)
    df = pd.read_parquet(resolved_path)

    if "STATUS" not in df.columns:
        raise ValueError(f"Required column 'STATUS' not found in dataset at {resolved_path}")

    if target_faults is not None:
        target_set = set(target_faults)
        df = df[df["STATUS"].isin(target_set)].copy().reset_index(drop=True)

    # Contiguous episodes are identified by changes in STATUS
    df["episode_id"] = (df["STATUS"] != df["STATUS"].shift()).cumsum().astype(np.int32)
    return df


def split_episodes(
    df: pd.DataFrame,
    train_ratio: float = 0.70,
    val_ratio: float = 0.15,
    seed: int = 42,
) -> tuple[pd.DataFrame, pd.DataFrame, pd.DataFrame]:
    """Split whole contiguous episodes stratified by STATUS into train, val, and test splits.

    Guarantees zero episode_id overlap across splits and ensures that all
    represented STATUS classes appear in every partition (when each has >= 3 episodes).
    Individual rows within an episode are never split across subsets.

    Args:
        df: DataFrame containing 'episode_id' and 'STATUS' columns.
        train_ratio: Proportion of episodes to allocate to training (default 0.70).
        val_ratio: Proportion of episodes to allocate to validation (default 0.15).
        seed: Random seed for deterministic stratified shuffling.

    Returns:
        tuple[pd.DataFrame, pd.DataFrame, pd.DataFrame]:
            A tuple of (train_df, val_df, test_df) with reset indices.

    Raises:
        ValueError: If ratio arguments are invalid or required columns are missing.
    """
    if train_ratio <= 0.0 or val_ratio <= 0.0 or (train_ratio + val_ratio) >= 1.0:
        raise ValueError(
            f"Invalid ratios: train_ratio ({train_ratio}) and val_ratio ({val_ratio}) "
            "must be positive and sum to strictly less than 1.0."
        )

    for col in ("episode_id", "STATUS"):
        if col not in df.columns:
            raise ValueError(f"Required column '{col}' missing from DataFrame.")

    test_ratio = 1.0 - train_ratio - val_ratio
    rng = np.random.default_rng(seed)

    # Extract unique episode metadata (1 status per episode by definition)
    episode_meta = (
        df.groupby("episode_id", as_index=False)["STATUS"]
        .first()
        .sort_values(by="episode_id")
        .reset_index(drop=True)
    )

    train_episodes: list[int] = []
    val_episodes: list[int] = []
    test_episodes: list[int] = []

    # Deterministic iteration over sorted unique status values
    for status in sorted(episode_meta["STATUS"].unique()):
        status_ep_ids = episode_meta.loc[
            episode_meta["STATUS"] == status, "episode_id"
        ].to_numpy()
        shuffled_ids = rng.permutation(status_ep_ids)
        n = len(shuffled_ids)

        if n >= 3:
            n_val = max(1, int(round(n * val_ratio)))
            n_test = max(1, int(round(n * test_ratio)))
            n_train = n - n_val - n_test
            # Guard against edge-case rounding where n_train < 1
            if n_train < 1:
                n_train = 1
                if n_val > n_test:
                    n_val = max(1, n_val - 1)
                else:
                    n_test = max(1, n_test - 1)
        elif n == 2:
            n_train, n_val, n_test = 1, 1, 0
        else:
            n_train, n_val, n_test = 1, 0, 0

        train_episodes.extend(shuffled_ids[:n_train].tolist())
        val_episodes.extend(shuffled_ids[n_train : n_train + n_val].tolist())
        test_episodes.extend(shuffled_ids[n_train + n_val :].tolist())

    train_set = set(train_episodes)
    val_set = set(val_episodes)
    test_set = set(test_episodes)

    train_df = df[df["episode_id"].isin(train_set)].copy().reset_index(drop=True)
    val_df = df[df["episode_id"].isin(val_set)].copy().reset_index(drop=True)
    test_df = df[df["episode_id"].isin(test_set)].copy().reset_index(drop=True)

    return train_df, val_df, test_df


def compute_normal_baseline(
    train_df: pd.DataFrame,
    sensor_cols: Sequence[str] | None = None,
) -> pd.DataFrame:
    """Compute per-sensor mean and std strictly from STATUS == 0 rows in train_df.

    Args:
        train_df: Training DataFrame containing sensor columns and 'STATUS'.
        sensor_cols: Optional sequence of sensor column names. Defaults to SENSOR_COLS.

    Returns:
        pd.DataFrame: DataFrame indexed by sensor column with 'mean' and 'std' columns.

    Raises:
        ValueError: If 'STATUS' column is missing or no STATUS == 0 rows exist.
        KeyError: If any requested sensor columns are missing from train_df.
    """
    cols = list(sensor_cols) if sensor_cols is not None else list(SENSOR_COLS)

    if "STATUS" not in train_df.columns:
        raise ValueError("Required column 'STATUS' not found in train_df.")

    missing_cols = [c for c in cols if c not in train_df.columns]
    if missing_cols:
        raise KeyError(f"Requested sensor columns missing from train_df: {missing_cols}")

    normal_rows = train_df[train_df["STATUS"] == 0]
    if normal_rows.empty:
        raise ValueError("No normal operation rows (STATUS == 0) found in train_df.")

    means = normal_rows[cols].mean(axis=0)
    stds = normal_rows[cols].std(axis=0)

    baseline_df = pd.DataFrame(
        {
            "mean": means,
            "std": stds,
        },
        index=cols,
    )
    return baseline_df
