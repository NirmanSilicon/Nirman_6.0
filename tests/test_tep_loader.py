"""Tests for TEP loader, stratified episode splitting, and normal baseline calculations.

Verifies:
1. Zero episode_id overlap across train_df, val_df, and test_df.
2. All 12 TARGET_FAULTS appear in each split.
3. compute_normal_baseline uses strictly STATUS == 0 rows and returns finite
   mean and positive std across all 52 SENSOR_COLS.
"""

import numpy as np
import pandas as pd
import pytest

from app.config import (
    PARQUET_PATH,
    SENSOR_COLS,
    SENSOR_LABELS,
    SENSOR_UNITS,
    TARGET_FAULTS,
    get_sensor_label,
)
from app.services.tep_loader import (
    compute_normal_baseline,
    load_tep_parquet,
    split_episodes,
)


@pytest.fixture(scope="module")
def full_tep_df() -> pd.DataFrame:
    """Module-scoped fixture to load TEP dataset once for the test suite."""
    df = load_tep_parquet(path=PARQUET_PATH, target_faults=TARGET_FAULTS)
    return df


@pytest.fixture(scope="module")
def dataset_splits(full_tep_df: pd.DataFrame) -> tuple[pd.DataFrame, pd.DataFrame, pd.DataFrame]:
    """Module-scoped fixture to produce stratified splits once."""
    return split_episodes(full_tep_df, train_ratio=0.70, val_ratio=0.15, seed=42)


def test_load_tep_parquet_structure(full_tep_df: pd.DataFrame) -> None:
    """Verify that load_tep_parquet retains target faults and adds valid episode_id."""
    assert not full_tep_df.empty, "Dataset must not be empty"
    assert "episode_id" in full_tep_df.columns, "DataFrame must contain 'episode_id'"
    assert "STATUS" in full_tep_df.columns, "DataFrame must contain 'STATUS'"
    assert "timestamp" in full_tep_df.columns, "DataFrame must contain 'timestamp'"

    for sensor in SENSOR_COLS:
        assert sensor in full_tep_df.columns, f"Sensor column {sensor} missing"

    # Statuses must strictly be within TARGET_FAULTS
    unique_statuses = set(full_tep_df["STATUS"].unique())
    assert unique_statuses.issubset(set(TARGET_FAULTS)), "Unexpected STATUS values present"
    assert set(TARGET_FAULTS).issubset(unique_statuses), "Some TARGET_FAULTS missing from dataset"

    # Episode IDs should be strictly positive and monotonically non-decreasing
    assert (full_tep_df["episode_id"] > 0).all(), "episode_id values must be positive"


def test_split_episodes_zero_overlap(
    full_tep_df: pd.DataFrame,
    dataset_splits: tuple[pd.DataFrame, pd.DataFrame, pd.DataFrame],
) -> None:
    """Verify zero episode_id overlap across train, val, and test splits."""
    train_df, val_df, test_df = dataset_splits

    train_eps = set(train_df["episode_id"].unique())
    val_eps = set(val_df["episode_id"].unique())
    test_eps = set(test_df["episode_id"].unique())

    # 1. Zero pairwise overlap of episode_ids
    assert len(train_eps & val_eps) == 0, f"Overlap between train and val: {train_eps & val_eps}"
    assert len(train_eps & test_eps) == 0, f"Overlap between train and test: {train_eps & test_eps}"
    assert len(val_eps & test_eps) == 0, f"Overlap between val and test: {val_eps & test_eps}"

    # 2. Total episodes match the original DataFrame
    all_original_eps = set(full_tep_df["episode_id"].unique())
    combined_split_eps = train_eps | val_eps | test_eps
    assert combined_split_eps == all_original_eps, "Union of split episodes must match original episodes"

    # 3. Total rows match the original DataFrame
    total_split_rows = len(train_df) + len(val_df) + len(test_df)
    assert total_split_rows == len(full_tep_df), (
        f"Row count mismatch: split sum {total_split_rows} != original {len(full_tep_df)}"
    )

    # 4. Each episode is entirely contained in its partition
    for split_name, split in [("train", train_df), ("val", val_df), ("test", test_df)]:
        split_ep_counts = split.groupby("episode_id").size()
        orig_ep_counts = full_tep_df[full_tep_df["episode_id"].isin(split_ep_counts.index)].groupby("episode_id").size()
        pd.testing.assert_series_equal(
            split_ep_counts,
            orig_ep_counts,
            check_names=False,
            obj=f"Episode row counts in {split_name}",
        )


def test_split_episodes_all_target_faults_represented(
    dataset_splits: tuple[pd.DataFrame, pd.DataFrame, pd.DataFrame],
) -> None:
    """Verify that all 12 TARGET_FAULTS appear in each split."""
    train_df, val_df, test_df = dataset_splits

    for name, split in [("train", train_df), ("val", val_df), ("test", test_df)]:
        split_statuses = set(split["STATUS"].unique())
        for fault in TARGET_FAULTS:
            assert fault in split_statuses, (
                f"Fault {fault} missing from {name}_df! Present statuses: {sorted(split_statuses)}"
            )


def test_compute_normal_baseline_values(
    dataset_splits: tuple[pd.DataFrame, pd.DataFrame, pd.DataFrame],
) -> None:
    """Verify compute_normal_baseline produces finite means and positive stds for all 52 sensors."""
    train_df, _, _ = dataset_splits

    baseline = compute_normal_baseline(train_df, sensor_cols=SENSOR_COLS)

    # Check structure
    assert isinstance(baseline, pd.DataFrame), "Baseline should return a DataFrame"
    assert list(baseline.columns) == ["mean", "std"], "Columns must be ['mean', 'std']"
    assert list(baseline.index) == SENSOR_COLS, "Index must match SENSOR_COLS exactly"
    assert len(baseline) == 52, f"Expected 52 sensors, got {len(baseline)}"

    # Check values
    assert np.all(np.isfinite(baseline["mean"])), "All sensor baseline means must be finite"
    assert np.all(baseline["std"] > 0), "All sensor baseline standard deviations must be strictly positive"


def test_compute_normal_baseline_strict_status_zero(
    dataset_splits: tuple[pd.DataFrame, pd.DataFrame, pd.DataFrame],
) -> None:
    """Verify compute_normal_baseline uses strictly STATUS == 0 rows."""
    train_df, _, _ = dataset_splits

    # Compute genuine baseline
    baseline_orig = compute_normal_baseline(train_df, sensor_cols=SENSOR_COLS)

    # Corrupt STATUS != 0 rows with massive outliers
    corrupted_df = train_df.copy()
    fault_mask = corrupted_df["STATUS"] != 0
    assert fault_mask.any(), "Train set must have fault rows to verify isolation"
    corrupted_df.loc[fault_mask, SENSOR_COLS] = 1e9

    # Recompute baseline from corrupted DataFrame
    baseline_corrupted = compute_normal_baseline(corrupted_df, sensor_cols=SENSOR_COLS)

    # Means and stds must be identical because fault rows must be ignored
    pd.testing.assert_frame_equal(
        baseline_orig,
        baseline_corrupted,
        check_exact=True,
        obj="Baseline with corrupted fault rows",
    )


def test_split_episodes_error_handling(full_tep_df: pd.DataFrame) -> None:
    """Verify split_episodes raises ValueError on invalid split ratios or missing columns."""
    with pytest.raises(ValueError, match="Invalid ratios"):
        split_episodes(full_tep_df, train_ratio=0.85, val_ratio=0.20)

    with pytest.raises(ValueError, match="Invalid ratios"):
        split_episodes(full_tep_df, train_ratio=-0.1, val_ratio=0.15)

    df_missing_status = full_tep_df.drop(columns=["STATUS"])
    with pytest.raises(ValueError, match="Required column 'STATUS' missing"):
        split_episodes(df_missing_status)


def test_compute_normal_baseline_error_handling(
    dataset_splits: tuple[pd.DataFrame, pd.DataFrame, pd.DataFrame],
) -> None:
    """Verify compute_normal_baseline raises on missing columns or absent normal data."""
    train_df, _, _ = dataset_splits

    # Missing STATUS column
    with pytest.raises(ValueError, match="Required column 'STATUS' not found"):
        compute_normal_baseline(train_df.drop(columns=["STATUS"]))

    # No normal data (STATUS == 0)
    no_normal_df = train_df[train_df["STATUS"] != 0]
    with pytest.raises(ValueError, match="No normal operation rows"):
        compute_normal_baseline(no_normal_df)

    # Missing sensor column
    with pytest.raises(KeyError, match="Requested sensor columns missing"):
        compute_normal_baseline(train_df, sensor_cols=["NON_EXISTENT_SENSOR"])


def test_sensor_labels_and_units_cover_all_52_sensors() -> None:
    """Verify SENSOR_LABELS and SENSOR_UNITS cover all 52 SENSOR_COLS with non-empty values."""
    assert len(SENSOR_COLS) == 52
    assert set(SENSOR_LABELS.keys()) == set(SENSOR_COLS)
    assert set(SENSOR_UNITS.keys()) == set(SENSOR_COLS)

    for tag in SENSOR_COLS:
        assert isinstance(SENSOR_LABELS[tag], str) and SENSOR_LABELS[tag].strip()
        assert isinstance(SENSOR_UNITS[tag], str) and SENSOR_UNITS[tag].strip()
        assert get_sensor_label(tag) == SENSOR_LABELS[tag]

    assert get_sensor_label("UNKNOWN_TAG") == "UNKNOWN_TAG"
