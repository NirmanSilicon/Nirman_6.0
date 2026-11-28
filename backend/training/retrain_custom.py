
"""
AlarmSense - Custom Industrial Plant Retraining Pipeline

Allows external factories to upload labeled sensor CSV files and train
custom XGBoost fault-diagnosis models.

Pipeline:
1. Validate plant ID and input CSV.
2. Detect numeric sensor columns.
3. Validate and prepare sensor and STATUS data.
4. Identify contiguous operating episodes.
5. Split episodes into independent train/validation/test datasets.
6. Extract sliding-window statistical and trend features.
7. Train an XGBoost classifier.
8. Evaluate on the untouched test split.
9. Save model artifacts under artifacts/plants/<plant_id>/.

The built-in Tennessee Eastman Process (TEP) artifacts are never modified.
"""

import json
import os
import re
import shutil
import tempfile
import time

from pathlib import Path
from typing import Any

import joblib
import numpy as np
import pandas as pd

from sklearn.metrics import accuracy_score, f1_score
from sklearn.preprocessing import StandardScaler
from sklearn.utils.class_weight import compute_sample_weight

from xgboost import XGBClassifier

from app.config import DEFAULT_WINDOW_SIZE
from app.services.features import (
    extract_window_features_batch,
    get_feature_names,
)


# ---------------------------------------------------------------------
# CONFIGURATION
# ---------------------------------------------------------------------

PLANT_ID_PATTERN = re.compile(r"^[A-Za-z0-9_-]+$")

DEFAULT_PLANTS_ARTIFACTS_ROOT = Path("artifacts/plants")

RANDOM_STATE = 42

TRAIN_RATIO = 0.70
VALIDATION_RATIO = 0.15
TEST_RATIO = 0.15


# ---------------------------------------------------------------------
# PLANT ID VALIDATION
# ---------------------------------------------------------------------

def validate_plant_id(plant_id: str) -> str:
    """Validate plant ID and prevent use of the reserved TEP identifier."""

    if not isinstance(plant_id, str):
        raise ValueError("plant_id must be a string.")

    cleaned = plant_id.strip()

    if not cleaned or not PLANT_ID_PATTERN.fullmatch(cleaned):
        raise ValueError(
            f"Invalid plant_id '{plant_id}'. "
            "Use only letters, numbers, underscores, or hyphens."
        )

    if cleaned.lower() == "tep":
        raise ValueError(
            "plant_id 'tep' is reserved for the built-in "
            "Tennessee Eastman Process model."
        )

    return cleaned


# ---------------------------------------------------------------------
# CSV VALIDATION AND LOADING
# ---------------------------------------------------------------------

def _detect_csv_separator(csv_path: Path) -> str:
    """Detect comma or semicolon delimiter from the CSV header."""

    with open(
        csv_path,
        encoding="utf-8-sig",
        errors="replace",
    ) as file:

        for line in file:

            stripped = line.strip()

            if stripped:
                return (
                    ";"
                    if stripped.count(";") > stripped.count(",")
                    else ","
                )

    return ","


def _load_custom_csv(csv_path: Path) -> pd.DataFrame:
    """Load a custom plant CSV and validate its basic structure."""

    if not csv_path.is_file():
        raise FileNotFoundError(
            f"CSV file not found: {csv_path}"
        )

    if csv_path.stat().st_size == 0:
        raise ValueError("Uploaded CSV file is empty.")

    separator = _detect_csv_separator(csv_path)

    df = pd.read_csv(
        csv_path,
        sep=separator,
        low_memory=False,
        encoding="utf-8-sig",
    )

    if df.empty:
        raise ValueError(
            "Uploaded CSV has no rows."
        )

    if len(df.columns) != len(set(df.columns)):
        raise ValueError(
            "Duplicate column names detected in uploaded CSV."
        )

    df.columns = [
        str(column).strip()
        for column in df.columns
    ]

    return df


# ---------------------------------------------------------------------
# SENSOR COLUMN DETECTION
# ---------------------------------------------------------------------

def _detect_sensor_columns(
    df: pd.DataFrame,
    status_col: str,
    timestamp_col: str | None,
) -> tuple[list[str], pd.DataFrame]:
    """
    Detect numeric sensor columns.

    Columns containing non-numeric metadata are excluded.
    Numeric-looking strings are converted to numeric values.
    """

    excluded = {
        status_col,
        "episode_id",
        "timestamp",
        "Unnamed: 0",
        "id",
        "sample_id",
        "row_id",
        "index",
    }

    if timestamp_col:
        if timestamp_col not in df.columns:
            raise ValueError(
                f"Timestamp column '{timestamp_col}' "
                "was not found in the CSV."
            )

        excluded.add(timestamp_col)

    sensor_cols = []
    converted = {}

    for column in df.columns:

        if column in excluded:
            continue

        if str(column).startswith("Unnamed:"):
            continue

        numeric = pd.to_numeric(
            df[column],
            errors="coerce",
        )

        # Accept only columns whose non-empty values are numeric.
        original_non_null = df[column].notna()

        if not original_non_null.any():
            continue

        if numeric[original_non_null].isna().any():
            continue

        if not np.isfinite(
            numeric.dropna().to_numpy(dtype=np.float64)
        ).all():
            continue

        sensor_cols.append(column)

        converted[column] = numeric

    if len(sensor_cols) < 2:
        raise ValueError(
            "At least 2 numeric sensor columns are required. "
            f"Detected: {sensor_cols}"
        )

    sensor_df = pd.DataFrame(
        converted,
        index=df.index,
    )

    return sensor_cols, sensor_df


# ---------------------------------------------------------------------
# STATUS LABEL PROCESSING
# ---------------------------------------------------------------------

def _prepare_status_labels(
    raw_labels: pd.Series,
    normal_label: int | str,
) -> tuple[pd.Series, dict[int, str], int | None]:
    """
    Convert labels into integer class codes.

    Numeric labels retain their original integer values.

    String labels receive deterministic integer codes. Their original
    names are preserved in custom_fault_names.
    """

    if raw_labels.isna().any():
        raise ValueError(
            "STATUS column contains missing labels."
        )

    custom_fault_names: dict[int, str] = {}

    if pd.api.types.is_numeric_dtype(raw_labels):

        numeric_labels = pd.to_numeric(
            raw_labels,
            errors="raise",
        )

        values = numeric_labels.to_numpy(dtype=np.float64)

        if not np.isfinite(values).all():
            raise ValueError(
                "STATUS column contains non-finite values."
            )

        if not np.equal(values, np.floor(values)).all():
            raise ValueError(
                "Numeric STATUS labels must be integers."
            )

        if (
            values.min() < np.iinfo(np.int64).min
            or values.max() > np.iinfo(np.int64).max
        ):
            raise ValueError(
                "STATUS labels exceed the supported integer range."
            )

        labels = numeric_labels.astype(np.int64)

        for class_value in sorted(
            int(value) for value in labels.unique()
        ):
            custom_fault_names[class_value] = (
                "Normal"
                if class_value == normal_label
                else f"Fault {class_value}"
            )

        resolved_normal_label = (
            int(normal_label)
            if normal_label in set(labels.unique())
            else None
        )

        return (
            labels,
            custom_fault_names,
            resolved_normal_label,
        )

    # Handle string labels.
    string_labels = raw_labels.astype(str).str.strip()

    if (string_labels == "").any():
        raise ValueError(
            "STATUS column contains empty string labels."
        )

    unique_names = sorted(
        string_labels.unique()
    )

    string_to_int = {
        name: index
        for index, name in enumerate(unique_names)
    }

    labels = string_labels.map(
        string_to_int
    ).astype(np.int64)

    for name, class_index in string_to_int.items():
        custom_fault_names[class_index] = name

    resolved_normal_label = None

    if isinstance(normal_label, str):
        if normal_label in string_to_int:
            resolved_normal_label = string_to_int[normal_label]

    elif isinstance(normal_label, int):
        # Permit callers to specify the encoded class index.
        if normal_label in string_to_int.values():
            resolved_normal_label = normal_label

    return (
        labels,
        custom_fault_names,
        resolved_normal_label,
    )


# ---------------------------------------------------------------------
# EPISODE IDENTIFICATION
# ---------------------------------------------------------------------

def _identify_episodes(
    df: pd.DataFrame,
) -> pd.DataFrame:
    """
    Assign a new episode ID whenever STATUS changes.

    Episodes are contiguous sequences of the same operating status.
    """

    result = df.copy()

    result["episode_id"] = (
        result["STATUS"]
        .ne(result["STATUS"].shift())
        .cumsum()
        .astype(np.int32)
    )

    return result


# ---------------------------------------------------------------------
# SAFE EPISODE SPLITTING
# ---------------------------------------------------------------------

def _split_long_episode(
    episode: pd.DataFrame,
    window_size: int,
    next_episode_id: int,
) -> tuple[pd.DataFrame, pd.DataFrame, pd.DataFrame, int]:
    """
    Divide one long episode into three non-overlapping chronological parts.

    Every part must contain at least window_size rows.
    """

    n_rows = len(episode)

    if n_rows < 3 * window_size:
        raise ValueError(
            f"Episode contains {n_rows} rows, but at least "
            f"{3 * window_size} rows are required to create "
            "independent train, validation, and test windows."
        )

    # Reserve at least one full window for validation and test.
    validation_size = max(
        window_size,
        int(round(n_rows * VALIDATION_RATIO)),
    )

    test_size = max(
        window_size,
        int(round(n_rows * TEST_RATIO)),
    )

    train_size = n_rows - validation_size - test_size

    # Adjust sizes if rounding left an insufficient training segment.
    if train_size < window_size:

        validation_size = window_size
        test_size = window_size
        train_size = n_rows - 2 * window_size

    if train_size < window_size:
        raise ValueError(
            "Unable to create three independent splits "
            "with the requested window size."
        )

    train_df = episode.iloc[:train_size].copy()

    validation_df = episode.iloc[
        train_size:train_size + validation_size
    ].copy()

    test_df = episode.iloc[
        train_size + validation_size:
    ].copy()

    # Give each chronological segment its own episode ID.
    train_df["episode_id"] = np.int32(next_episode_id)
    validation_df["episode_id"] = np.int32(next_episode_id + 1)
    test_df["episode_id"] = np.int32(next_episode_id + 2)

    return (
        train_df,
        validation_df,
        test_df,
        next_episode_id + 3,
    )


def _safe_split_episodes(
    df: pd.DataFrame,
    window_size: int,
    seed: int = RANDOM_STATE,
) -> tuple[pd.DataFrame, pd.DataFrame, pd.DataFrame]:
    """
    Split data into independent train, validation, and test datasets.

    If a class has at least three sufficiently long episodes, entire
    episodes are assigned to separate splits.

    If fewer than three episodes are available, the longest episode
    is divided chronologically into three non-overlapping segments.

    This function never copies the same rows into multiple splits.
    """

    if window_size < 2:
        raise ValueError(
            "window_size must be at least 2."
        )

    rng = np.random.default_rng(seed)

    train_parts = []
    validation_parts = []
    test_parts = []

    next_episode_id = (
        int(df["episode_id"].max()) + 1
    )

    for status in sorted(df["STATUS"].unique()):

        status_df = df[
            df["STATUS"] == status
        ]

        episode_groups = [
            episode.reset_index(drop=True)
            for _, episode in status_df.groupby(
                "episode_id",
                sort=True,
            )
            if len(episode) >= window_size
        ]

        if not episode_groups:
            raise ValueError(
                f"Class {status} has no contiguous episode containing "
                f"at least {window_size} rows."
            )

        # Case 1: At least three independent episodes.
        if len(episode_groups) >= 3:

            permutation = rng.permutation(
                len(episode_groups)
            )

            n = len(episode_groups)

            n_validation = max(
                1,
                int(round(n * VALIDATION_RATIO)),
            )

            n_test = max(
                1,
                int(round(n * TEST_RATIO)),
            )

            n_train = n - n_validation - n_test

            if n_train < 1:
                raise ValueError(
                    f"Not enough episodes for class {status} "
                    "to create independent splits."
                )

            for index in permutation[:n_train]:
                train_parts.append(
                    episode_groups[int(index)]
                )

            validation_start = n_train
            validation_end = n_train + n_validation

            for index in permutation[
                validation_start:validation_end
            ]:
                validation_parts.append(
                    episode_groups[int(index)]
                )

            for index in permutation[validation_end:]:
                test_parts.append(
                    episode_groups[int(index)]
                )

            continue

        # Case 2: Fewer than three episodes.
        # Split the longest episode into independent segments.
        longest_index = max(
            range(len(episode_groups)),
            key=lambda index: len(episode_groups[index]),
        )

        longest_episode = episode_groups.pop(
            longest_index
        )

        (
            train_segment,
            validation_segment,
            test_segment,
            next_episode_id,
        ) = _split_long_episode(
            longest_episode,
            window_size,
            next_episode_id,
        )

        train_parts.append(train_segment)
        validation_parts.append(validation_segment)
        test_parts.append(test_segment)

        # Remaining shorter episodes are added to training only.
        train_parts.extend(episode_groups)

    if not train_parts:
        raise ValueError(
            "Training split contains no episodes."
        )

    if not validation_parts:
        raise ValueError(
            "Validation split contains no episodes."
        )

    if not test_parts:
        raise ValueError(
            "Test split contains no episodes."
        )

    train_df = pd.concat(
        train_parts,
        ignore_index=True,
    )

    validation_df = pd.concat(
        validation_parts,
        ignore_index=True,
    )

    test_df = pd.concat(
        test_parts,
        ignore_index=True,
    )

    # Ensure every class exists in every split.
    expected_classes = set(
        int(value) for value in df["STATUS"].unique()
    )

    for name, split_df in (
        ("training", train_df),
        ("validation", validation_df),
        ("test", test_df),
    ):

        actual_classes = set(
            int(value) for value in split_df["STATUS"].unique()
        )

        missing = expected_classes - actual_classes

        if missing:
            raise ValueError(
                f"{name.capitalize()} split is missing classes: "
                f"{sorted(missing)}"
            )

        # Verify each class has enough data for at least one window.
        for status in expected_classes:

            class_rows = split_df[
                split_df["STATUS"] == status
            ]

            available_rows = sum(
                len(episode)
                for _, episode in class_rows.groupby("episode_id")
            )

            if available_rows < window_size:
                raise ValueError(
                    f"{name.capitalize()} split has insufficient "
                    f"rows for class {status}."
                )

    return train_df, validation_df, test_df


# ---------------------------------------------------------------------
# FEATURE VALIDATION
# ---------------------------------------------------------------------

def _validate_features(
    X: np.ndarray,
    y: np.ndarray,
    split_name: str,
):
    """Validate extracted feature matrices."""

    X = np.asarray(X)
    y = np.asarray(y)

    if X.ndim != 2:
        raise ValueError(
            f"{split_name}: expected a 2D feature matrix."
        )

    if len(X) == 0:
        raise ValueError(
            f"{split_name}: no sliding-window features generated."
        )

    if len(X) != len(y):
        raise ValueError(
            f"{split_name}: feature and label counts do not match."
        )

    if not np.isfinite(X).all():
        raise ValueError(
            f"{split_name}: features contain NaN or infinite values."
        )

    if not np.isfinite(y).all():
        raise ValueError(
            f"{split_name}: labels contain invalid values."
        )


def _map_labels(
    labels: np.ndarray,
    fault_to_idx: dict[int, int],
) -> np.ndarray:
    """Convert raw labels into contiguous model class indices."""

    try:
        return np.asarray(
            [
                fault_to_idx[int(label)]
                for label in labels
            ],
            dtype=np.int64,
        )

    except KeyError as exc:
        raise ValueError(
            f"Unknown fault label encountered: {exc}"
        ) from exc


# ---------------------------------------------------------------------
# ARTIFACT SAVING
# ---------------------------------------------------------------------

def _save_artifacts_atomically(
    plant_dir: Path,
    model: XGBClassifier,
    scaler: StandardScaler,
    baseline_df: pd.DataFrame,
    label_map_payload: dict[str, Any],
):
    """
    Save artifacts in a temporary directory and replace the destination
    only after all files have been written successfully.

    This prevents partially written custom-plant artifact directories.
    """

    plant_dir.parent.mkdir(
        parents=True,
        exist_ok=True,
    )

    temp_dir = Path(
        tempfile.mkdtemp(
            prefix=f".{plant_dir.name}_tmp_",
            dir=plant_dir.parent,
        )
    )

    backup_dir = plant_dir.with_name(
        f".{plant_dir.name}_backup"
    )

    try:
        model.save_model(
            temp_dir / "xgb_model.json"
        )

        joblib.dump(
            scaler,
            temp_dir / "scaler.joblib",
        )

        baseline_df.to_json(
            temp_dir / "baseline.json",
            orient="index",
            indent=2,
        )

        with open(
            temp_dir / "label_map.json",
            "w",
            encoding="utf-8",
        ) as file:

            json.dump(
                label_map_payload,
                file,
                indent=2,
            )

        # Keep the previous custom model as a backup until replacement
        # succeeds.
        if backup_dir.exists():
            shutil.rmtree(backup_dir)

        if plant_dir.exists():
            os.replace(
                plant_dir,
                backup_dir,
            )

        try:
            os.replace(
                temp_dir,
                plant_dir,
            )

        except Exception:
            if backup_dir.exists() and not plant_dir.exists():
                os.replace(
                    backup_dir,
                    plant_dir,
                )

            raise

        if backup_dir.exists():
            shutil.rmtree(backup_dir)

    finally:
        if temp_dir.exists():
            shutil.rmtree(temp_dir)


# ---------------------------------------------------------------------
# MAIN CUSTOM PLANT TRAINING
# ---------------------------------------------------------------------

def train_custom_plant_csv(
    csv_path: str | Path,
    plant_id: str,
    plant_name: str | None = None,
    status_col: str = "STATUS",
    timestamp_col: str | None = None,
    normal_label: int | str = 0,
    window_size: int = DEFAULT_WINDOW_SIZE,
    artifacts_root: Path = DEFAULT_PLANTS_ARTIFACTS_ROOT,
) -> dict[str, Any]:
    """
    Train and persist an XGBoost fault-diagnosis model for a custom plant.

    Args:
        csv_path:
            Path to the labeled CSV dataset.

        plant_id:
            Unique plant identifier. Cannot be 'tep'.

        plant_name:
            Human-readable plant display name.

        status_col:
            Column containing operating-state labels.

        timestamp_col:
            Optional timestamp column excluded from sensor features.

        normal_label:
            Label representing normal operating conditions.

        window_size:
            Sliding-window length.

        artifacts_root:
            Directory under which custom plant artifacts are saved.

    Returns:
        Dictionary containing training metrics and artifact information.
    """

    start_time = time.perf_counter()

    # -------------------------------------------------------------
    # 1. Validate configuration.
    # -------------------------------------------------------------

    clean_id = validate_plant_id(
        plant_id
    )

    if window_size < 2:
        raise ValueError(
            f"window_size must be >= 2, got {window_size}."
        )

    effective_name = (
        (plant_name or "").strip()
        or clean_id.replace("_", " ").replace("-", " ").title()
    )

    csv_path = Path(csv_path)
    artifacts_root = Path(artifacts_root)

    # Resolve the destination and protect the built-in TEP directory.
    plant_dir = artifacts_root / clean_id

    if plant_dir.resolve() == (
        artifacts_root / "tep"
    ).resolve():
        raise ValueError(
            "Custom training cannot overwrite TEP artifacts."
        )

    # -------------------------------------------------------------
    # 2. Load CSV.
    # -------------------------------------------------------------

    print("\nLoading custom plant dataset...")

    raw_df = _load_custom_csv(
        csv_path
    )

    if status_col not in raw_df.columns:
        raise ValueError(
            f"Required label column '{status_col}' "
            "not found in uploaded CSV."
        )

    print(
        f"Loaded {len(raw_df):,} rows "
        f"and {len(raw_df.columns)} columns."
    )

    # -------------------------------------------------------------
    # 3. Detect sensor columns.
    # -------------------------------------------------------------

    print("\nDetecting numeric sensor columns...")

    sensor_cols, sensor_df = _detect_sensor_columns(
        raw_df,
        status_col=status_col,
        timestamp_col=timestamp_col,
    )

    print(
        f"Detected {len(sensor_cols)} sensor columns:"
    )

    for sensor in sensor_cols:
        print(f"  - {sensor}")

    # -------------------------------------------------------------
    # 4. Validate sensor values.
    # -------------------------------------------------------------

    if sensor_df.isna().any().any():
        missing_counts = (
            sensor_df.isna()
            .sum()
        )

        missing_counts = missing_counts[
            missing_counts > 0
        ]

        raise ValueError(
            "Sensor columns contain missing values:\n"
            + missing_counts.to_string()
            + "\nPlease clean the CSV before training."
        )

    sensor_values = sensor_df.to_numpy(
        dtype=np.float64
    )

    if not np.isfinite(sensor_values).all():
        raise ValueError(
            "Sensor data contains NaN or infinite values."
        )

    # Convert sensors to float32.
    sensor_df = sensor_df.astype(
        np.float32
    )

    if not np.isfinite(
        sensor_df.to_numpy()
    ).all():
        raise ValueError(
            "Sensor values became non-finite during float32 conversion."
        )

    # -------------------------------------------------------------
    # 5. Process operating-state labels.
    # -------------------------------------------------------------

    print("\nProcessing STATUS labels...")

    (
        status_labels,
        custom_fault_names,
        resolved_normal_label,
    ) = _prepare_status_labels(
        raw_df[status_col],
        normal_label,
    )

    work_df = sensor_df.copy()

    work_df["STATUS"] = status_labels.to_numpy()

    unique_classes = sorted(
        int(value)
        for value in work_df["STATUS"].unique()
    )

    if len(unique_classes) < 2:
        raise ValueError(
            "At least 2 unique classes are required. "
            f"Found: {unique_classes}"
        )

    print(
        f"Detected {len(unique_classes)} classes:"
    )

    for class_value in unique_classes:
        print(
            f"  {class_value}: "
            f"{custom_fault_names[class_value]}"
        )

    # -------------------------------------------------------------
    # 6. Identify contiguous episodes.
    # -------------------------------------------------------------

    print("\nIdentifying contiguous episodes...")

    work_df = _identify_episodes(
        work_df
    )

    total_episodes = int(
        work_df["episode_id"].nunique()
    )

    print(
        f"Identified {total_episodes:,} contiguous episodes."
    )

    # -------------------------------------------------------------
    # 7. Split episodes without leakage.
    # -------------------------------------------------------------

    print(
        "\nSplitting episodes into train, validation, and test..."
    )

    (
        train_df,
        val_df,
        test_df,
    ) = _safe_split_episodes(
        work_df,
        window_size=window_size,
        seed=RANDOM_STATE,
    )

    print(
        f"Training rows:   {len(train_df):,}\n"
        f"Validation rows: {len(val_df):,}\n"
        f"Test rows:       {len(test_df):,}"
    )

    # -------------------------------------------------------------
    # 8. Compute baseline from training data only.
    # -------------------------------------------------------------

    print("\nComputing training baseline...")

    if resolved_normal_label is not None:

        normal_rows = train_df[
            train_df["STATUS"] == resolved_normal_label
        ]

    else:
        normal_rows = pd.DataFrame()

    if not normal_rows.empty:
        baseline_source = normal_rows
        baseline_source_name = "normal operating rows"
    else:
        baseline_source = train_df
        baseline_source_name = "all training rows"

    means = baseline_source[sensor_cols].mean(
        axis=0
    )

    stds = baseline_source[sensor_cols].std(
        axis=0
    )

    stds = stds.replace(
        0.0,
        1e-6,
    ).fillna(1e-6)

    stds = stds.where(
        stds > 1e-9,
        1e-6,
    )

    baseline_df = pd.DataFrame(
        {
            "mean": means,
            "std": stds,
        },
        index=sensor_cols,
    )

    print(
        f"Baseline calculated using {baseline_source_name}."
    )

    # -------------------------------------------------------------
    # 9. Extract sliding-window features.
    # -------------------------------------------------------------

    print(
        f"\nExtracting sliding-window features (W={window_size})..."
    )

    extraction_start = time.perf_counter()

    X_train, y_train_raw, _ = (
        extract_window_features_batch(
            train_df,
            sensor_cols=sensor_cols,
            window_size=window_size,
        )
    )

    X_val, y_val_raw, _ = (
        extract_window_features_batch(
            val_df,
            sensor_cols=sensor_cols,
            window_size=window_size,
        )
    )

    X_test, y_test_raw, _ = (
        extract_window_features_batch(
            test_df,
            sensor_cols=sensor_cols,
            window_size=window_size,
        )
    )

    print(
        f"Feature extraction completed in "
        f"{time.perf_counter() - extraction_start:.2f}s."
    )

    _validate_features(
        X_train,
        y_train_raw,
        "Training",
    )

    _validate_features(
        X_val,
        y_val_raw,
        "Validation",
    )

    _validate_features(
        X_test,
        y_test_raw,
        "Test",
    )

    # -------------------------------------------------------------
    # 10. Validate class coverage in generated windows.
    # -------------------------------------------------------------

    fault_to_idx = {
        class_value: index
        for index, class_value in enumerate(unique_classes)
    }

    idx_to_fault = {
        index: class_value
        for class_value, index in fault_to_idx.items()
    }

    expected_classes = set(unique_classes)

    for split_name, labels in (
        ("Training", y_train_raw),
        ("Validation", y_val_raw),
        ("Test", y_test_raw),
    ):

        actual_classes = set(
            int(value) for value in np.unique(labels)
        )

        missing_classes = expected_classes - actual_classes

        if missing_classes:
            raise ValueError(
                f"{split_name} feature windows are missing classes: "
                f"{sorted(missing_classes)}"
            )

    y_train = _map_labels(
        y_train_raw,
        fault_to_idx,
    )

    y_val = _map_labels(
        y_val_raw,
        fault_to_idx,
    )

    y_test = _map_labels(
        y_test_raw,
        fault_to_idx,
    )

    print(
        f"Training windows:   {len(X_train):,}\n"
        f"Validation windows: {len(X_val):,}\n"
        f"Test windows:       {len(X_test):,}"
    )

    # -------------------------------------------------------------
    # 11. Scale features.
    # -------------------------------------------------------------

    print("\nScaling features...")

    scaler = StandardScaler()

    X_train_scaled = scaler.fit_transform(
        X_train
    ).astype(np.float32)

    X_val_scaled = scaler.transform(
        X_val
    ).astype(np.float32)

    X_test_scaled = scaler.transform(
        X_test
    ).astype(np.float32)

    # -------------------------------------------------------------
    # 12. Train XGBoost.
    # -------------------------------------------------------------

    print("\nTraining custom XGBoost classifier...")

    sample_weights = compute_sample_weight(
        class_weight="balanced",
        y=y_train,
    )

    model = XGBClassifier(
        tree_method="hist",
        n_estimators=200,
        max_depth=6,
        learning_rate=0.05,
        random_state=RANDOM_STATE,
        n_jobs=-1,
    )

    training_start = time.perf_counter()

    model.fit(
        X_train_scaled,
        y_train,
        sample_weight=sample_weights,
        verbose=False,
    )

    training_time = (
        time.perf_counter() - training_start
    )

    print(
        f"Model training completed in "
        f"{training_time:.2f} seconds."
    )

    # -------------------------------------------------------------
    # 13. Evaluate on untouched test data.
    # -------------------------------------------------------------

    print("\nEvaluating on untouched test data...")

    y_pred = model.predict(
        X_test_scaled
    )

    sample_accuracy = float(
        accuracy_score(
            y_test,
            y_pred,
        )
    )

    sample_macro_f1 = float(
        f1_score(
            y_test,
            y_pred,
            average="macro",
            zero_division=0,
        )
    )

    print(
        f"Test Accuracy: {sample_accuracy:.4f}\n"
        f"Test Macro-F1: {sample_macro_f1:.4f}"
    )

    # -------------------------------------------------------------
    # 14. Prepare model metadata.
    # -------------------------------------------------------------

    label_map_payload = {
        "plant_id": clean_id,
        "plant_name": effective_name,
        "fault_to_idx": {
            str(key): value
            for key, value in fault_to_idx.items()
        },
        "idx_to_fault": {
            str(key): value
            for key, value in idx_to_fault.items()
        },
        "classes": unique_classes,
        "sensor_cols": list(sensor_cols),
        "fault_names": {
            str(key): value
            for key, value in custom_fault_names.items()
        },
        "window_size": int(window_size),
        "feature_names": get_feature_names(sensor_cols),
    }

    # -------------------------------------------------------------
    # 15. Save custom plant artifacts.
    # -------------------------------------------------------------

    print(
        f"\nSaving artifacts for plant '{clean_id}'..."
    )

    _save_artifacts_atomically(
        plant_dir=plant_dir,
        model=model,
        scaler=scaler,
        baseline_df=baseline_df,
        label_map_payload=label_map_payload,
    )

    print(
        f"Artifacts saved successfully to: {plant_dir}"
    )

    # -------------------------------------------------------------
    # 16. Return training summary.
    # -------------------------------------------------------------

    elapsed = round(
        time.perf_counter() - start_time,
        2,
    )

    result = {
        "plant_id": clean_id,
        "plant_name": effective_name,
        "n_sensors": len(sensor_cols),
        "sensor_cols": list(sensor_cols),
        "classes": unique_classes,
        "train_windows": int(len(X_train)),
        "validation_windows": int(len(X_val)),
        "test_windows": int(len(X_test)),
        "sample_accuracy": round(sample_accuracy, 4),
        "sample_macro_f1": round(sample_macro_f1, 4),
        "train_time_sec": elapsed,
        "artifacts_dir": str(plant_dir),
    }

    print("\n" + "=" * 65)
    print("CUSTOM PLANT TRAINING COMPLETED")
    print("=" * 65)

    print(f"Plant ID:       {clean_id}")
    print(f"Plant Name:     {effective_name}")
    print(f"Sensors:        {len(sensor_cols)}")
    print(f"Classes:        {len(unique_classes)}")
    print(f"Training rows:  {len(X_train):,} windows")
    print(f"Test rows:      {len(X_test):,} windows")
    print(f"Test Accuracy:  {sample_accuracy:.4f}")
    print(f"Test Macro-F1:  {sample_macro_f1:.4f}")
    print(f"Total Time:     {elapsed:.2f}s")
    print(f"Artifacts:      {plant_dir}")

    print("=" * 65)

    return result


# ---------------------------------------------------------------------
# CLI NOTE
# ---------------------------------------------------------------------

if __name__ == "__main__":
    print(
        "This module is intended to be called through the "
        "AlarmSense API or another Python entrypoint."
    )
