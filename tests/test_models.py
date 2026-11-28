
"""Tests for the AlarmSense XGBoost training pipeline."""

import json

import numpy as np
import pandas as pd
import pytest

from training import train_xgb


# ---------------------------------------------------------------------
# Fake XGBoost model
# ---------------------------------------------------------------------

class FakeXGBClassifier:
    """Lightweight replacement for XGBClassifier during unit tests."""

    def __init__(self, **kwargs):
        self.params = kwargs
        self.best_iteration = 10
        self.best_score = 0.125
        self.fit_X = None
        self.fit_y = None
        self.sample_weight = None
        self.eval_set = None

    def fit(
        self,
        X,
        y,
        sample_weight=None,
        eval_set=None,
        verbose=None,
    ):
        self.fit_X = np.asarray(X)
        self.fit_y = np.asarray(y)
        self.sample_weight = np.asarray(sample_weight)
        self.eval_set = eval_set
        return self

    def save_model(self, path):
        path = str(path)
        with open(path, "w", encoding="utf-8") as file:
            file.write('{"fake_model": true}')


# ---------------------------------------------------------------------
# Label mapping tests
# ---------------------------------------------------------------------

def test_build_label_mappings_returns_consecutive_indices():
    fault_to_idx, idx_to_fault = train_xgb.build_label_mappings(
        [0, 4, 6, 7]
    )

    assert fault_to_idx == {
        0: 0,
        4: 1,
        6: 2,
        7: 3,
    }

    assert idx_to_fault == {
        0: 0,
        1: 4,
        2: 6,
        3: 7,
    }


def test_build_label_mappings_sorts_fault_ids():
    fault_to_idx, idx_to_fault = train_xgb.build_label_mappings(
        [6, 0, 7, 4]
    )

    assert list(fault_to_idx.keys()) == [0, 4, 6, 7]
    assert list(fault_to_idx.values()) == [0, 1, 2, 3]

    assert idx_to_fault[0] == 0
    assert idx_to_fault[1] == 4
    assert idx_to_fault[2] == 6
    assert idx_to_fault[3] == 7


def test_build_label_mappings_handles_single_class():
    fault_to_idx, idx_to_fault = train_xgb.build_label_mappings([4])

    assert fault_to_idx == {4: 0}
    assert idx_to_fault == {0: 4}


def test_build_label_mappings_handles_empty_input():
    fault_to_idx, idx_to_fault = train_xgb.build_label_mappings([])

    assert fault_to_idx == {}
    assert idx_to_fault == {}


def test_build_label_mappings_converts_numpy_integer_values():
    fault_to_idx, idx_to_fault = train_xgb.build_label_mappings(
        [np.int64(6), np.int32(0), np.int64(4)]
    )

    assert fault_to_idx == {
        0: 0,
        4: 1,
        6: 2,
    }

    assert idx_to_fault == {
        0: 0,
        1: 4,
        2: 6,
    }


# ---------------------------------------------------------------------
# Training pipeline fixtures
# ---------------------------------------------------------------------

@pytest.fixture
def fake_training_data():
    """Create small synthetic train, validation and test datasets."""

    train_df = pd.DataFrame({
        "STATUS": [0, 0, 4, 4],
        "episode_id": [1, 1, 2, 2],
        "marker": [1, 2, 3, 4],
    })

    val_df = pd.DataFrame({
        "STATUS": [0, 4],
        "episode_id": [3, 4],
        "marker": [5, 6],
    })

    test_df = pd.DataFrame({
        "STATUS": [0, 4],
        "episode_id": [5, 6],
        "marker": [7, 8],
    })

    return train_df, val_df, test_df


@pytest.fixture
def patch_training_pipeline(
    monkeypatch,
    fake_training_data,
):
    """Replace external data loading and XGBoost training dependencies."""

    train_df, val_df, test_df = fake_training_data

    monkeypatch.setattr(
        train_xgb,
        "load_tep_parquet",
        lambda **kwargs: pd.concat(
            [train_df, val_df, test_df],
            ignore_index=True,
        ),
    )

    monkeypatch.setattr(
        train_xgb,
        "split_episodes",
        lambda *args, **kwargs: (
            train_df.copy(),
            val_df.copy(),
            test_df.copy(),
        ),
    )

    baseline = pd.DataFrame(
        {
            "mean": [100.0, 200.0],
            "std": [10.0, 20.0],
        },
        index=["SENSOR_A", "SENSOR_B"],
    )

    monkeypatch.setattr(
        train_xgb,
        "compute_normal_baseline",
        lambda *args, **kwargs: baseline.copy(),
    )

    def fake_extract_features(
        df,
        sensor_cols,
        window_size,
    ):
        """Return deterministic features based on the source frame."""

        marker = int(df["marker"].iloc[0])

        X = np.array(
            [
                [marker, marker + 1.0, marker + 2.0],
                [marker + 3.0, marker + 4.0, marker + 5.0],
            ],
            dtype=np.float32,
        )

        y = np.array(
            [0, 4],
            dtype=np.int64,
        )

        episode_ids = np.array(
            [int(df["episode_id"].iloc[0])] * 2,
            dtype=np.int32,
        )

        return X, y, episode_ids

    monkeypatch.setattr(
        train_xgb,
        "extract_window_features_batch",
        fake_extract_features,
    )

    monkeypatch.setattr(
        train_xgb,
        "XGBClassifier",
        FakeXGBClassifier,
    )

    monkeypatch.setattr(
        train_xgb,
        "TARGET_FAULTS",
        [0, 4],
    )

    monkeypatch.setattr(
        train_xgb,
        "SENSOR_COLS",
        ["SENSOR_A", "SENSOR_B"],
    )

    monkeypatch.setattr(
        train_xgb,
        "FAULT_METADATA",
        {
            0: {"name": "Normal"},
            4: {"name": "Fault 4"},
        },
    )

    monkeypatch.setattr(
        train_xgb,
        "get_feature_names",
        lambda sensor_cols: [
            f"{sensor}_{stat}"
            for sensor in sensor_cols
            for stat in [
                "current",
                "mean",
                "std",
            ]
        ],
    )


# ---------------------------------------------------------------------
# End-to-end training pipeline tests
# ---------------------------------------------------------------------

def test_train_pipeline_returns_training_metrics(
    tmp_path,
    patch_training_pipeline,
):
    result = train_xgb.train_pipeline(
        parquet_path="fake_dataset.parquet",
        artifacts_dir=tmp_path / "artifacts",
        window_size=5,
    )

    assert result["train_time_sec"] >= 0
    assert result["total_time_sec"] >= 0

    assert result["best_iteration"] == 10
    assert result["best_val_mlogloss"] == pytest.approx(0.125)

    assert result["X_train_shape"] == (2, 3)
    assert result["X_val_shape"] == (2, 3)


def test_train_pipeline_creates_all_artifacts(
    tmp_path,
    patch_training_pipeline,
):
    artifacts_dir = tmp_path / "artifacts"

    train_xgb.train_pipeline(
        parquet_path="fake_dataset.parquet",
        artifacts_dir=artifacts_dir,
        window_size=5,
    )

    expected_files = [
        "xgb_model.json",
        "scaler.joblib",
        "baseline.json",
        "label_map.json",
    ]

    for filename in expected_files:
        assert (artifacts_dir / filename).is_file()


def test_saved_label_map_contains_bidirectional_mappings(
    tmp_path,
    patch_training_pipeline,
):
    artifacts_dir = tmp_path / "artifacts"

    train_xgb.train_pipeline(
        parquet_path="fake_dataset.parquet",
        artifacts_dir=artifacts_dir,
        window_size=5,
    )

    with open(
        artifacts_dir / "label_map.json",
        encoding="utf-8",
    ) as file:
        label_map = json.load(file)

    assert label_map["fault_to_idx"] == {
        "0": 0,
        "4": 1,
    }

    assert label_map["idx_to_fault"] == {
        "0": 0,
        "1": 4,
    }

    assert label_map["classes"] == [0, 4]
    assert label_map["window_size"] == 5

    assert label_map["fault_names"] == {
        "0": "Normal",
        "4": "Fault 4",
    }

    assert label_map["feature_names"] == [
        "SENSOR_A_current",
        "SENSOR_A_mean",
        "SENSOR_A_std",
        "SENSOR_B_current",
        "SENSOR_B_mean",
        "SENSOR_B_std",
    ]


def test_saved_baseline_contains_mean_and_std(
    tmp_path,
    patch_training_pipeline,
):
    artifacts_dir = tmp_path / "artifacts"

    train_xgb.train_pipeline(
        parquet_path="fake_dataset.parquet",
        artifacts_dir=artifacts_dir,
        window_size=5,
    )

    baseline = pd.read_json(
        artifacts_dir / "baseline.json",
        orient="index",
    )

    assert "mean" in baseline.columns
    assert "std" in baseline.columns

    assert baseline.loc["SENSOR_A", "mean"] == pytest.approx(100.0)
    assert baseline.loc["SENSOR_A", "std"] == pytest.approx(10.0)


def test_train_pipeline_does_not_require_real_dataset(
    tmp_path,
    patch_training_pipeline,
):
    """Verify that mocked training can run without a real Parquet file."""

    result = train_xgb.train_pipeline(
        parquet_path="dataset_that_does_not_exist.parquet",
        artifacts_dir=tmp_path / "artifacts",
        window_size=5,
    )

    assert result["X_train_shape"] == (2, 3)
    assert (tmp_path / "artifacts" / "xgb_model.json").exists()


def test_train_pipeline_creates_missing_artifacts_directory(
    tmp_path,
    patch_training_pipeline,
):
    artifacts_dir = tmp_path / "new" / "nested" / "artifacts"

    assert not artifacts_dir.exists()

    train_xgb.train_pipeline(
        parquet_path="fake_dataset.parquet",
        artifacts_dir=artifacts_dir,
        window_size=5,
    )

    assert artifacts_dir.is_dir()
    assert (artifacts_dir / "xgb_model.json").exists()


# ---------------------------------------------------------------------
# Training configuration checks
# ---------------------------------------------------------------------

def test_training_uses_balanced_sample_weights(
    tmp_path,
    patch_training_pipeline,
    monkeypatch,
):
    captured = {}

    class CapturingFakeXGB(FakeXGBClassifier):
        def fit(
            self,
            X,
            y,
            sample_weight=None,
            eval_set=None,
            verbose=None,
        ):
            captured["sample_weight"] = np.asarray(sample_weight)
            captured["y"] = np.asarray(y)

            return super().fit(
                X,
                y,
                sample_weight=sample_weight,
                eval_set=eval_set,
                verbose=verbose,
            )

    monkeypatch.setattr(
        train_xgb,
        "XGBClassifier",
        CapturingFakeXGB,
    )

    train_xgb.train_pipeline(
        parquet_path="fake_dataset.parquet",
        artifacts_dir=tmp_path / "artifacts",
        window_size=5,
    )

    assert "sample_weight" in captured
    assert len(captured["sample_weight"]) == len(captured["y"])
    assert np.isfinite(captured["sample_weight"]).all()
    assert (captured["sample_weight"] > 0).all()


def test_training_uses_validation_data_for_early_stopping(
    tmp_path,
    patch_training_pipeline,
    monkeypatch,
):
    captured = {}

    class CapturingFakeXGB(FakeXGBClassifier):
        def fit(
            self,
            X,
            y,
            sample_weight=None,
            eval_set=None,
            verbose=None,
        ):
            captured["eval_set"] = eval_set
            return super().fit(
                X,
                y,
                sample_weight=sample_weight,
                eval_set=eval_set,
                verbose=verbose,
            )

    monkeypatch.setattr(
        train_xgb,
        "XGBClassifier",
        CapturingFakeXGB,
    )

    train_xgb.train_pipeline(
        parquet_path="fake_dataset.parquet",
        artifacts_dir=tmp_path / "artifacts",
        window_size=5,
    )

    assert captured["eval_set"] is not None
    assert len(captured["eval_set"]) == 1

    X_val_scaled, y_val = captured["eval_set"][0]

    assert X_val_scaled.shape == (2, 3)
    assert y_val.tolist() == [0, 1]
