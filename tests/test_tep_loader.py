
"""Tests for TEP loader, stratified episode splitting and normal baselines."""

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
    """Load the TEP dataset once for this test module."""

    return load_tep_parquet(
        path=PARQUET_PATH,
        target_faults=TARGET_FAULTS,
    )


@pytest.fixture(scope="module")
def dataset_splits(full_tep_df):
    """Generate reproducible stratified episode splits."""

    return split_episodes(
        full_tep_df,
        train_ratio=0.70,
        val_ratio=0.15,
        seed=42,
    )


# ---------------------------------------------------------------------
# Dataset loading
# ---------------------------------------------------------------------

def test_load_tep_parquet_structure(full_tep_df):
    """Verify the loaded dataset has the expected columns and values."""

    assert isinstance(full_tep_df, pd.DataFrame)
    assert not full_tep_df.empty

    required_columns = {
        "episode_id",
        "STATUS",
        "timestamp",
        *SENSOR_COLS,
    }

    assert required_columns.issubset(full_tep_df.columns)

    assert full_tep_df["episode_id"].notna().all()
    assert (full_tep_df["episode_id"] > 0).all()

    assert full_tep_df["episode_id"].is_monotonic_increasing

    assert full_tep_df["STATUS"].notna().all()

    unique_statuses = set(full_tep_df["STATUS"].unique())

    assert unique_statuses.issubset(set(TARGET_FAULTS))
    assert set(TARGET_FAULTS).issubset(unique_statuses)

    assert pd.api.types.is_datetime64_any_dtype(
        full_tep_df["timestamp"]
    )

    assert full_tep_df["timestamp"].notna().all()

    for sensor in SENSOR_COLS:
        assert pd.api.types.is_numeric_dtype(
            full_tep_df[sensor]
        ), f"{sensor} must be numeric"


def test_load_tep_parquet_contains_all_target_faults(full_tep_df):
    """Verify every configured target fault exists in the dataset."""

    actual_faults = set(full_tep_df["STATUS"].unique())

    assert actual_faults == set(TARGET_FAULTS)


# ---------------------------------------------------------------------
# Episode splitting
# ---------------------------------------------------------------------

def test_split_episodes_returns_three_non_empty_splits(dataset_splits):
    """Verify the splitting function returns three DataFrames."""

    train_df, val_df, test_df = dataset_splits

    for split in [train_df, val_df, test_df]:
        assert isinstance(split, pd.DataFrame)
        assert not split.empty


def test_split_episodes_zero_overlap(full_tep_df, dataset_splits):
    """Verify no episode is shared across different partitions."""

    train_df, val_df, test_df = dataset_splits

    train_eps = set(train_df["episode_id"].unique())
    val_eps = set(val_df["episode_id"].unique())
    test_eps = set(test_df["episode_id"].unique())

    assert train_eps.isdisjoint(val_eps)
    assert train_eps.isdisjoint(test_eps)
    assert val_eps.isdisjoint(test_eps)

    original_eps = set(full_tep_df["episode_id"].unique())

    assert train_eps | val_eps | test_eps == original_eps


def test_split_episodes_preserves_all_rows(full_tep_df, dataset_splits):
    """Verify splitting does not drop or duplicate rows."""

    train_df, val_df, test_df = dataset_splits

    total_split_rows = (
        len(train_df)
        + len(val_df)
        + len(test_df)
    )

    assert total_split_rows == len(full_tep_df)


def test_split_episodes_preserves_complete_episodes(
    full_tep_df,
    dataset_splits,
):
    """Verify every episode remains entirely within one partition."""

    train_df, val_df, test_df = dataset_splits

    for split_name, split_df in [
        ("train", train_df),
        ("validation", val_df),
        ("test", test_df),
    ]:
        split_counts = split_df.groupby("episode_id").size()

        original_counts = (
            full_tep_df[
                full_tep_df["episode_id"].isin(split_counts.index)
            ]
            .groupby("episode_id")
            .size()
        )

        pd.testing.assert_series_equal(
            split_counts.sort_index(),
            original_counts.sort_index(),
            check_names=False,
            obj=f"Episode row counts in {split_name}",
        )


def test_split_episodes_contains_all_target_faults(dataset_splits):
    """Verify every target fault appears in every split."""

    train_df, val_df, test_df = dataset_splits

    for split_name, split_df in [
        ("train", train_df),
        ("validation", val_df),
        ("test", test_df),
    ]:
        actual_faults = set(split_df["STATUS"].unique())

        assert actual_faults == set(TARGET_FAULTS), (
            f"Missing faults in {split_name}: "
            f"{set(TARGET_FAULTS) - actual_faults}"
        )


def test_split_episodes_is_reproducible(full_tep_df):
    """Verify identical seeds produce identical partitions."""

    first = split_episodes(
        full_tep_df,
        train_ratio=0.70,
        val_ratio=0.15,
        seed=42,
    )

    second = split_episodes(
        full_tep_df,
        train_ratio=0.70,
        val_ratio=0.15,
        seed=42,
    )

    for first_df, second_df in zip(first, second):
        pd.testing.assert_frame_equal(first_df, second_df)


# ---------------------------------------------------------------------
# Normal baseline calculations
# ---------------------------------------------------------------------

def test_compute_normal_baseline_structure(dataset_splits):
    """Verify the baseline contains the expected sensor statistics."""

    train_df, _, _ = dataset_splits

    baseline = compute_normal_baseline(
        train_df,
        sensor_cols=SENSOR_COLS,
    )

    assert isinstance(baseline, pd.DataFrame)
    assert list(baseline.columns) == ["mean", "std"]
    assert list(baseline.index) == SENSOR_COLS
    assert len(baseline) == len(SENSOR_COLS) == 52


def test_compute_normal_baseline_values_are_valid(dataset_splits):
    """Verify baseline means and standard deviations are valid."""

    train_df, _, _ = dataset_splits

    baseline = compute_normal_baseline(
        train_df,
        sensor_cols=SENSOR_COLS,
    )

    assert np.isfinite(baseline["mean"].to_numpy()).all()
    assert np.isfinite(baseline["std"].to_numpy()).all()

    assert (baseline["std"] > 0).all()


def test_compute_normal_baseline_matches_manual_calculation(dataset_splits):
    """Verify baseline statistics against STATUS == 0 calculations."""

    train_df, _, _ = dataset_splits

    normal_rows = train_df.loc[train_df["STATUS"] == 0, SENSOR_COLS]

    baseline = compute_normal_baseline(
        train_df,
        sensor_cols=SENSOR_COLS,
    )

    expected_mean = normal_rows.mean()
    expected_std = normal_rows.std()

    np.testing.assert_allclose(
        baseline["mean"].to_numpy(),
        expected_mean.to_numpy(),
        rtol=1e-6,
        atol=1e-6,
    )

    np.testing.assert_allclose(
        baseline["std"].to_numpy(),
        expected_std.to_numpy(),
        rtol=1e-6,
        atol=1e-6,
    )


def test_compute_normal_baseline_uses_strict_status_zero(dataset_splits):
    """Verify fault rows do not influence normal baseline statistics."""

    train_df, _, _ = dataset_splits

    baseline_original = compute_normal_baseline(
        train_df,
        sensor_cols=SENSOR_COLS,
    )

    corrupted_df = train_df.copy()

    fault_mask = corrupted_df["STATUS"] != 0

    assert fault_mask.any()

    corrupted_df.loc[fault_mask, SENSOR_COLS] = 1e9

    baseline_corrupted = compute_normal_baseline(
        corrupted_df,
        sensor_cols=SENSOR_COLS,
    )

    pd.testing.assert_frame_equal(
        baseline_original,
        baseline_corrupted,
        check_exact=True,
    )


# ---------------------------------------------------------------------
# Error handling
# ---------------------------------------------------------------------

def test_split_episodes_rejects_invalid_ratios(full_tep_df):
    """Verify invalid split ratios raise ValueError."""

    with pytest.raises(ValueError, match="Invalid ratios"):
        split_episodes(
            full_tep_df,
            train_ratio=0.85,
            val_ratio=0.20,
        )

    with pytest.raises(ValueError, match="Invalid ratios"):
        split_episodes(
            full_tep_df,
            train_ratio=-0.1,
            val_ratio=0.15,
        )


def test_split_episodes_rejects_missing_status(full_tep_df):
    """Verify missing STATUS column raises ValueError."""

    incomplete_df = full_tep_df.drop(columns=["STATUS"])

    with pytest.raises(
        ValueError,
        match="Required column 'STATUS' missing",
    ):
        split_episodes(incomplete_df)


def test_compute_normal_baseline_rejects_missing_status(dataset_splits):
    """Verify baseline calculation requires STATUS."""

    train_df, _, _ = dataset_splits

    with pytest.raises(
        ValueError,
        match="Required column 'STATUS' not found",
    ):
        compute_normal_baseline(
            train_df.drop(columns=["STATUS"])
        )


def test_compute_normal_baseline_rejects_no_normal_rows(dataset_splits):
    """Verify baseline calculation rejects datasets without normal rows."""

    train_df, _, _ = dataset_splits

    no_normal_df = train_df.loc[train_df["STATUS"] != 0]

    with pytest.raises(
        ValueError,
        match="No normal operation rows",
    ):
        compute_normal_baseline(no_normal_df)


def test_compute_normal_baseline_rejects_missing_sensor(dataset_splits):
    """Verify requesting a nonexistent sensor raises KeyError."""

    train_df, _, _ = dataset_splits

    with pytest.raises(
        KeyError,
        match="Requested sensor columns missing",
    ):
        compute_normal_baseline(
            train_df,
            sensor_cols=["NON_EXISTENT_SENSOR"],
        )


# ---------------------------------------------------------------------
# Sensor metadata
# ---------------------------------------------------------------------

def test_sensor_labels_and_units_cover_all_sensors():
    """Verify every configured sensor has a label and unit."""

    assert len(SENSOR_COLS) == 52

    assert set(SENSOR_LABELS) == set(SENSOR_COLS)
    assert set(SENSOR_UNITS) == set(SENSOR_COLS)

    for tag in SENSOR_COLS:
        assert isinstance(SENSOR_LABELS[tag], str)
        assert SENSOR_LABELS[tag].strip()

        assert isinstance(SENSOR_UNITS[tag], str)
        assert SENSOR_UNITS[tag].strip()

        assert get_sensor_label(tag) == SENSOR_LABELS[tag]


def test_unknown_sensor_label_falls_back_to_tag():
    """Verify unknown sensor tags are returned unchanged."""

    assert get_sensor_label("UNKNOWN_TAG") == "UNKNOWN_TAG"
