
"""Tests for AlarmSense custom industrial plant retraining."""

import json

import numpy as np
import pandas as pd
import pytest

from training import retrain_custom


# ---------------------------------------------------------------------
# Fake XGBoost model
# ---------------------------------------------------------------------

class FakeXGBClassifier:
    """Lightweight model substitute for isolated training tests."""

    def __init__(self, **kwargs):
        self.params = kwargs
        self.fit_X = None
        self.fit_y = None
        self.sample_weight = None

    def fit(self, X, y, sample_weight=None, verbose=None):
        self.fit_X = np.asarray(X)
        self.fit_y = np.asarray(y)
        self.sample_weight = np.asarray(sample_weight)
        return self

    def predict(self, X):
        # Predict the first encoded class for deterministic testing.
        return np.zeros(len(X), dtype=np.int64)

    def save_model(self, path):
        with open(path, "w", encoding="utf-8") as file:
            file.write('{"fake_model": true}')


# ---------------------------------------------------------------------
# Plant ID validation
# ---------------------------------------------------------------------

@pytest.mark.parametrize(
    "plant_id",
    [
        "factory1",
        "plant_a",
        "plant-a",
        "Factory_2026",
        "SITE-01",
    ],
)
def test_validate_plant_id_accepts_valid_ids(plant_id):
    assert retrain_custom.validate_plant_id(plant_id) == plant_id


def test_validate_plant_id_removes_surrounding_whitespace():
    assert retrain_custom.validate_plant_id("  plant_a  ") == "plant_a"


@pytest.mark.parametrize(
    "plant_id",
    [
        "",
        "   ",
        "plant@1",
        "plant 1",
        "plant/1",
        "plant.1",
        "plant#1",
    ],
)
def test_validate_plant_id_rejects_invalid_ids(plant_id):
    with pytest.raises(ValueError, match="Invalid plant_id"):
        retrain_custom.validate_plant_id(plant_id)


@pytest.mark.parametrize("plant_id", ["tep", "TEP", "Tep"])
def test_validate_plant_id_rejects_reserved_tep_id(plant_id):
    with pytest.raises(ValueError, match="reserved"):
        retrain_custom.validate_plant_id(plant_id)


# ---------------------------------------------------------------------
# CSV separator detection
# ---------------------------------------------------------------------

def test_detect_csv_separator_comma(tmp_path):
    csv_path = tmp_path / "plant.csv"
    csv_path.write_text(
        "STATUS,SENSOR_A,SENSOR_B\n0,10,20\n1,30,40\n",
        encoding="utf-8",
    )

    assert retrain_custom._detect_csv_separator(csv_path) == ","


def test_detect_csv_separator_semicolon(tmp_path):
    csv_path = tmp_path / "plant.csv"
    csv_path.write_text(
        "STATUS;SENSOR_A;SENSOR_B\n0;10;20\n1;30;40\n",
        encoding="utf-8",
    )

    assert retrain_custom._detect_csv_separator(csv_path) == ";"


def test_detect_csv_separator_defaults_to_comma_for_empty_file(tmp_path):
    csv_path = tmp_path / "empty.csv"
    csv_path.write_text("", encoding="utf-8")

    assert retrain_custom._detect_csv_separator(csv_path) == ","


# ---------------------------------------------------------------------
# Episode splitting
# ---------------------------------------------------------------------

def make_episode_data(
    window_size=5,
    episodes_per_class=3,
):
    """Create multiple independent episodes for two classes."""

    frames = []
    episode_id = 1

    for status in [0, 1]:
        for episode_number in range(episodes_per_class):
            rows = window_size * 3

            frame = pd.DataFrame({
                "SENSOR_A": np.arange(rows, dtype=np.float32)
                + status * 100
                + episode_number * 10,
                "SENSOR_B": np.arange(rows, dtype=np.float32)
                * 2
                + status * 100,
                "STATUS": status,
                "episode_id": episode_id,
            })

            frames.append(frame)
            episode_id += 1

    return pd.concat(frames, ignore_index=True)


def test_safe_split_returns_three_dataframes():
    df = make_episode_data()

    train_df, val_df, test_df = retrain_custom._safe_split_episodes(
        df,
        window_size=5,
        seed=42,
    )

    assert isinstance(train_df, pd.DataFrame)
    assert isinstance(val_df, pd.DataFrame)
    assert isinstance(test_df, pd.DataFrame)

    assert not train_df.empty
    assert not val_df.empty
    assert not test_df.empty


def test_safe_split_preserves_all_classes_in_each_split():
    df = make_episode_data()

    train_df, val_df, test_df = retrain_custom._safe_split_episodes(
        df,
        window_size=5,
        seed=42,
    )

    for split in [train_df, val_df, test_df]:
        assert set(split["STATUS"].unique()) == {0, 1}


def test_safe_split_keeps_episode_ids_disjoint():
    """Independent full episodes must not occur in multiple splits."""

    df = make_episode_data()

    train_df, val_df, test_df = retrain_custom._safe_split_episodes(
        df,
        window_size=5,
        seed=42,
    )

    train_ids = set(train_df["episode_id"])
    val_ids = set(val_df["episode_id"])
    test_ids = set(test_df["episode_id"])

    assert train_ids.isdisjoint(val_ids)
    assert train_ids.isdisjoint(test_ids)
    assert val_ids.isdisjoint(test_ids)


def test_safe_split_is_reproducible():
    df = make_episode_data()

    first = retrain_custom._safe_split_episodes(
        df,
        window_size=5,
        seed=42,
    )

    second = retrain_custom._safe_split_episodes(
        df,
        window_size=5,
        seed=42,
    )

    for first_df, second_df in zip(first, second):
        pd.testing.assert_frame_equal(first_df, second_df)


def test_safe_split_rejects_class_without_sufficient_episode():
    df = pd.DataFrame({
        "SENSOR_A": [1.0, 2.0, 3.0],
        "SENSOR_B": [4.0, 5.0, 6.0],
        "STATUS": [0, 0, 0],
        "episode_id": [1, 1, 1],
    })

    with pytest.raises(ValueError, match="no contiguous episode"):
        retrain_custom._safe_split_episodes(
            df,
            window_size=5,
        )


# ---------------------------------------------------------------------
# Custom training input validation
# ---------------------------------------------------------------------

def test_custom_training_rejects_missing_csv(tmp_path):
    with pytest.raises(FileNotFoundError, match="CSV file not found"):
        retrain_custom.train_custom_plant_csv(
            csv_path=tmp_path / "missing.csv",
            plant_id="factory_a",
        )


def test_custom_training_rejects_window_size_below_two(tmp_path):
    csv_path = tmp_path / "plant.csv"
    csv_path.write_text(
        "STATUS,SENSOR_A,SENSOR_B\n0,10,20\n1,30,40\n",
        encoding="utf-8",
    )

    with pytest.raises(ValueError, match="window_size must be >= 2"):
        retrain_custom.train_custom_plant_csv(
            csv_path=csv_path,
            plant_id="factory_a",
            window_size=1,
        )


def test_custom_training_rejects_empty_csv(tmp_path):
    csv_path = tmp_path / "empty.csv"
    csv_path.write_text(
        "STATUS,SENSOR_A,SENSOR_B\n",
        encoding="utf-8",
    )

    with pytest.raises(ValueError, match="no rows"):
        retrain_custom.train_custom_plant_csv(
            csv_path=csv_path,
            plant_id="factory_a",
        )


def test_custom_training_rejects_missing_status_column(tmp_path):
    csv_path = tmp_path / "plant.csv"
    csv_path.write_text(
        "SENSOR_A,SENSOR_B\n10,20\n30,40\n",
        encoding="utf-8",
    )

    with pytest.raises(ValueError, match="Required label column"):
        retrain_custom.train_custom_plant_csv(
            csv_path=csv_path,
            plant_id="factory_a",
        )


def test_custom_training_rejects_fewer_than_two_numeric_sensors(tmp_path):
    csv_path = tmp_path / "plant.csv"
    csv_path.write_text(
        "STATUS,SENSOR_A\n0,10\n1,20\n",
        encoding="utf-8",
    )

    with pytest.raises(ValueError, match="At least 2 numeric sensor"):
        retrain_custom.train_custom_plant_csv(
            csv_path=csv_path,
            plant_id="factory_a",
        )


def test_custom_training_rejects_single_class(tmp_path):
    csv_path = tmp_path / "plant.csv"

    df = pd.DataFrame({
        "STATUS": [0] * 30,
        "SENSOR_A": np.arange(30),
        "SENSOR_B": np.arange(30) * 2,
    })

    df.to_csv(csv_path, index=False)

    with pytest.raises(ValueError, match="At least 2 unique classes"):
        retrain_custom.train_custom_plant_csv(
            csv_path=csv_path,
            plant_id="factory_a",
            window_size=5,
        )


# ---------------------------------------------------------------------
# Successful custom plant training
# ---------------------------------------------------------------------

@pytest.fixture
def custom_plant_csv(tmp_path):
    """Create a CSV with three independent episodes per class."""

    df = make_episode_data(
        window_size=5,
        episodes_per_class=3,
    )

    csv_path = tmp_path / "factory_data.csv"
    df.to_csv(csv_path, index=False)

    return csv_path


@pytest.fixture
def patch_custom_training(monkeypatch):
    """Replace XGBoost with a deterministic fake model."""

    monkeypatch.setattr(
        retrain_custom,
        "XGBClassifier",
        FakeXGBClassifier,
    )


def test_custom_training_returns_expected_summary(
    custom_plant_csv,
    tmp_path,
    patch_custom_training,
):
    result = retrain_custom.train_custom_plant_csv(
        csv_path=custom_plant_csv,
        plant_id="factory_a",
        plant_name="Factory A",
        window_size=5,
        artifacts_root=tmp_path / "artifacts",
    )

    assert result["plant_id"] == "factory_a"
    assert result["plant_name"] == "Factory A"

    assert result["n_sensors"] == 2
    assert result["sensor_cols"] == ["SENSOR_A", "SENSOR_B"]
    assert result["classes"] == [0, 1]

    assert result["train_windows"] > 0
    assert 0.0 <= result["sample_accuracy"] <= 1.0
    assert 0.0 <= result["sample_macro_f1"] <= 1.0
    assert result["train_time_sec"] >= 0


def test_custom_training_creates_all_artifacts(
    custom_plant_csv,
    tmp_path,
    patch_custom_training,
):
    artifacts_root = tmp_path / "artifacts"

    result = retrain_custom.train_custom_plant_csv(
        csv_path=custom_plant_csv,
        plant_id="factory_a",
        window_size=5,
        artifacts_root=artifacts_root,
    )

    plant_dir = artifacts_root / "factory_a"

    assert result["artifacts_dir"] == str(plant_dir)

    expected_files = [
        "xgb_model.json",
        "scaler.joblib",
        "baseline.json",
        "label_map.json",
    ]

    for filename in expected_files:
        assert (plant_dir / filename).is_file()


def test_custom_training_saves_correct_label_mapping(
    custom_plant_csv,
    tmp_path,
    patch_custom_training,
):
    artifacts_root = tmp_path / "artifacts"

    retrain_custom.train_custom_plant_csv(
        csv_path=custom_plant_csv,
        plant_id="factory_a",
        window_size=5,
        artifacts_root=artifacts_root,
    )

    label_map_path = (
        artifacts_root / "factory_a" / "label_map.json"
    )

    with open(label_map_path, encoding="utf-8") as file:
        label_map = json.load(file)

    assert label_map["plant_id"] == "factory_a"
    assert label_map["classes"] == [0, 1]

    assert label_map["fault_to_idx"] == {
        "0": 0,
        "1": 1,
    }

    assert label_map["idx_to_fault"] == {
        "0": 0,
        "1": 1,
    }

    assert label_map["sensor_cols"] == [
        "SENSOR_A",
        "SENSOR_B",
    ]

    assert label_map["window_size"] == 5


def test_custom_training_saves_baseline_statistics(
    custom_plant_csv,
    tmp_path,
    patch_custom_training,
):
    artifacts_root = tmp_path / "artifacts"

    retrain_custom.train_custom_plant_csv(
        csv_path=custom_plant_csv,
        plant_id="factory_a",
        window_size=5,
        artifacts_root=artifacts_root,
    )

    baseline = pd.read_json(
        artifacts_root / "factory_a" / "baseline.json",
        orient="index",
    )

    assert set(baseline.columns) == {"mean", "std"}
    assert list(baseline.index) == ["SENSOR_A", "SENSOR_B"]

    assert np.isfinite(baseline.to_numpy()).all()
    assert (baseline["std"] > 0).all()


def test_custom_training_does_not_overwrite_other_plant(
    custom_plant_csv,
    tmp_path,
    patch_custom_training,
):
    artifacts_root = tmp_path / "artifacts"

    existing_dir = artifacts_root / "another_factory"
    existing_dir.mkdir(parents=True)

    marker = existing_dir / "keep.txt"
    marker.write_text("existing plant", encoding="utf-8")

    retrain_custom.train_custom_plant_csv(
        csv_path=custom_plant_csv,
        plant_id="factory_a",
        window_size=5,
        artifacts_root=artifacts_root,
    )

    assert marker.read_text(encoding="utf-8") == "existing plant"
    assert (artifacts_root / "factory_a" / "xgb_model.json").exists()


# ---------------------------------------------------------------------
# Custom label and metadata handling
# ---------------------------------------------------------------------

def test_custom_training_supports_semicolon_csv(
    custom_plant_csv,
    tmp_path,
    patch_custom_training,
):
    df = pd.read_csv(custom_plant_csv)
    semicolon_path = tmp_path / "factory_semicolon.csv"
    df.to_csv(semicolon_path, sep=";", index=False)

    result = retrain_custom.train_custom_plant_csv(
        csv_path=semicolon_path,
        plant_id="semicolon_factory",
        window_size=5,
        artifacts_root=tmp_path / "artifacts",
    )

    assert result["plant_id"] == "semicolon_factory"


def test_custom_training_supports_text_fault_labels(
    tmp_path,
    patch_custom_training,
):
    df = make_episode_data(
        window_size=5,
        episodes_per_class=3,
    )

    df["STATUS"] = df["STATUS"].map({
        0: "Normal",
        1: "High Temperature",
    })

    csv_path = tmp_path / "text_labels.csv"
    df.to_csv(csv_path, index=False)

    result = retrain_custom.train_custom_plant_csv(
        csv_path=csv_path,
        plant_id="text_label_factory",
        window_size=5,
        artifacts_root=tmp_path / "artifacts",
    )

    assert result["classes"] == [0, 1]

    with open(
        tmp_path / "artifacts" / "text_label_factory" / "label_map.json",
        encoding="utf-8",
    ) as file:
        label_map = json.load(file)

    assert label_map["fault_names"] == {
        "0": "High Temperature",
        "1": "Normal",
    }


def test_custom_training_excludes_timestamp_from_sensors(
    tmp_path,
    patch_custom_training,
):
    df = make_episode_data(
        window_size=5,
        episodes_per_class=3,
    )

    df["timestamp"] = pd.date_range(
        "2026-01-01",
        periods=len(df),
        freq="min",
    ).astype(str)

    csv_path = tmp_path / "with_timestamp.csv"
    df.to_csv(csv_path, index=False)

    result = retrain_custom.train_custom_plant_csv(
        csv_path=csv_path,
        plant_id="timestamp_factory",
        timestamp_col="timestamp",
        window_size=5,
        artifacts_root=tmp_path / "artifacts",
    )

    assert "timestamp" not in result["sensor_cols"]
    assert result["n_sensors"] == 2


def test_custom_training_excludes_common_timestamp_columns_without_explicit_param(
    tmp_path,
    patch_custom_training,
):
    df = make_episode_data(
        window_size=5,
        episodes_per_class=3,
    )

    n_rows = len(df)
    df["time"] = np.arange(n_rows, dtype=np.float64)
    df["TS"] = np.arange(n_rows, dtype=np.int64)
    df["DateTime"] = np.arange(n_rows, dtype=np.int64)
    df["date"] = np.arange(n_rows, dtype=np.int64)
    df["Epoch"] = 1_700_000_000 + np.arange(n_rows, dtype=np.int64)

    csv_path = tmp_path / "with_common_time_cols.csv"
    df.to_csv(csv_path, index=False)

    result = retrain_custom.train_custom_plant_csv(
        csv_path=csv_path,
        plant_id="auto_timestamp_factory",
        window_size=5,
        artifacts_root=tmp_path / "artifacts",
    )

    for col in ("time", "TS", "DateTime", "date", "Epoch"):
        assert col not in result["sensor_cols"]

    assert result["sensor_cols"] == ["SENSOR_A", "SENSOR_B"]
    assert result["n_sensors"] == 2
