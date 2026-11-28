"""NASA C-MAPSS FD001 ingestion, validation and preprocessing.

This module deliberately stops before model training. It produces reproducible,
engine-separated feature windows for the Phase 3 XGBoost/LSTM work.
"""
from __future__ import annotations

import hashlib
import json
import shutil
import tempfile
from dataclasses import dataclass
from datetime import datetime, timezone
from pathlib import Path
from typing import Any

import joblib
import numpy as np
import pandas as pd
from sklearn.model_selection import GroupShuffleSplit
from sklearn.preprocessing import StandardScaler

TRAIN_FILE = "train_FD001.txt"
TEST_FILE = "test_FD001.txt"
RUL_FILE = "RUL_FD001.txt"
EXPECTED_FILES = (TRAIN_FILE, TEST_FILE, RUL_FILE)

ID_COLUMNS = ["unit_nr", "time_cycles"]
SETTING_COLUMNS = ["setting_1", "setting_2", "setting_3"]
SENSOR_COLUMNS = [f"sensor_{i}" for i in range(1, 22)]
DATA_COLUMNS = ID_COLUMNS + SETTING_COLUMNS + SENSOR_COLUMNS

CANONICAL_PROFILE = {
    "training_rows": 20631,
    "training_engines": 100,
    "test_rows": 13096,
    "test_engines": 100,
    "test_rul_labels": 100,
}


class DatasetError(ValueError):
    """Raised when FD001 files are missing or structurally invalid."""


@dataclass
class LoadedFD001:
    train: pd.DataFrame
    test: pd.DataFrame
    test_rul: pd.Series
    report: dict[str, Any]


def _sha256(path: Path) -> str:
    digest = hashlib.sha256()
    with path.open("rb") as handle:
        for chunk in iter(lambda: handle.read(1024 * 1024), b""):
            digest.update(chunk)
    return digest.hexdigest()


def _read_whitespace_file(path: Path, expected_columns: int, label: str) -> pd.DataFrame:
    if not path.is_file():
        raise DatasetError(f"Missing required file: {path.name}")
    if path.stat().st_size == 0:
        raise DatasetError(f"{label} is empty.")
    try:
        frame = pd.read_csv(path, sep=r"\s+", header=None, engine="python")
    except Exception as exc:  # pandas parsing errors vary by version
        raise DatasetError(f"Could not parse {label}: {exc}") from exc
    if frame.shape[1] != expected_columns:
        raise DatasetError(
            f"{label} has {frame.shape[1]} columns; expected {expected_columns}. "
            "Check that the original headerless whitespace-delimited FD001 file was used."
        )
    return frame


def _read_fd001(data_dir: Path) -> tuple[pd.DataFrame, pd.DataFrame, pd.Series]:
    train = _read_whitespace_file(data_dir / TRAIN_FILE, 26, TRAIN_FILE)
    test = _read_whitespace_file(data_dir / TEST_FILE, 26, TEST_FILE)
    rul_frame = _read_whitespace_file(data_dir / RUL_FILE, 1, RUL_FILE)
    train.columns = DATA_COLUMNS
    test.columns = DATA_COLUMNS
    train = train.apply(pd.to_numeric, errors="coerce")
    test = test.apply(pd.to_numeric, errors="coerce")
    rul = pd.to_numeric(rul_frame.iloc[:, 0], errors="coerce")
    return train, test, rul


def _validate_frame(frame: pd.DataFrame, label: str) -> list[str]:
    errors: list[str] = []
    if frame.empty:
        return [f"{label} contains no data rows."]

    missing = int(frame.isna().sum().sum())
    if missing:
        errors.append(f"{label} contains {missing} missing or non-numeric values.")
    values = frame.to_numpy(dtype=float)
    if not np.isfinite(values).all():
        errors.append(f"{label} contains infinite values.")

    if frame.isna().any().any() or not np.isfinite(values).all():
        return errors

    if (frame["unit_nr"] < 1).any():
        errors.append(f"{label} contains engine IDs below 1.")
    if (frame["time_cycles"] < 1).any():
        errors.append(f"{label} contains cycle numbers below 1.")

    for column in ("unit_nr", "time_cycles"):
        column_values = frame[column].to_numpy(dtype=float)
        if not np.allclose(column_values, np.round(column_values), atol=1e-9):
            errors.append(f"{label} contains non-integer values in {column}.")

    duplicate_count = int(frame.duplicated(["unit_nr", "time_cycles"]).sum())
    if duplicate_count:
        errors.append(f"{label} contains {duplicate_count} duplicate engine/cycle pairs.")

    ordered = frame.sort_values(["unit_nr", "time_cycles"])
    grouped = ordered.groupby("unit_nr")["time_cycles"]
    if (grouped.min() != 1).any():
        errors.append(f"{label} contains an engine trajectory that does not start at cycle 1.")
    cycle_steps = grouped.diff().dropna()
    if (cycle_steps <= 0).any():
        errors.append(f"{label} contains non-increasing cycle sequences.")
    if (cycle_steps > 1).any():
        errors.append(f"{label} contains skipped cycle numbers within an engine trajectory.")
    return errors


def validate_fd001(data_dir: str | Path) -> LoadedFD001:
    folder = Path(data_dir)
    missing_files = [name for name in EXPECTED_FILES if not (folder / name).is_file()]
    if missing_files:
        raise DatasetError(
            "FD001 dataset files not found: " + ", ".join(missing_files)
            + f". Place all three original files in: {folder.resolve()}"
        )

    train, test, rul = _read_fd001(folder)
    errors = _validate_frame(train, "Training data") + _validate_frame(test, "Test data")

    if rul.empty:
        errors.append("RUL_FD001.txt contains no labels.")
    if rul.isna().any() or not np.isfinite(rul.to_numpy(dtype=float)).all():
        errors.append("RUL_FD001.txt contains missing, non-numeric or infinite labels.")
    elif (rul < 0).any():
        errors.append("RUL_FD001.txt contains negative RUL labels.")
    elif not np.allclose(rul.to_numpy(dtype=float), np.round(rul.to_numpy(dtype=float)), atol=1e-9):
        errors.append("RUL_FD001.txt contains non-integer RUL labels.")

    train_units = sorted(train["unit_nr"].dropna().astype(int).unique().tolist())
    test_units = sorted(test["unit_nr"].dropna().astype(int).unique().tolist())
    if len(rul) != len(test_units):
        errors.append(
            f"RUL label count ({len(rul)}) does not match test engine count ({len(test_units)})."
        )

    if errors:
        raise DatasetError("FD001 validation failed: " + " ".join(errors))

    train = train.sort_values(["unit_nr", "time_cycles"]).reset_index(drop=True)
    test = test.sort_values(["unit_nr", "time_cycles"]).reset_index(drop=True)
    train_std = train[SENSOR_COLUMNS].std(ddof=0)
    constant_sensors = train_std[train_std <= 1e-8].index.tolist()

    file_manifest = {
        name: {
            "size_bytes": (folder / name).stat().st_size,
            "sha256": _sha256(folder / name),
        }
        for name in EXPECTED_FILES
    }
    dataset_fingerprint = hashlib.sha256(
        "|".join(file_manifest[name]["sha256"] for name in EXPECTED_FILES).encode("ascii")
    ).hexdigest()

    observed_profile = {
        "training_rows": int(len(train)),
        "training_engines": int(train["unit_nr"].nunique()),
        "test_rows": int(len(test)),
        "test_engines": int(test["unit_nr"].nunique()),
        "test_rul_labels": int(len(rul)),
    }
    profile_matches = observed_profile == CANONICAL_PROFILE

    provenance = {}
    for manifest_name in ("download_manifest.json", "upload_manifest.json"):
        manifest_path = folder / manifest_name
        if manifest_path.is_file():
            try:
                provenance = json.loads(manifest_path.read_text(encoding="utf-8"))
            except (OSError, json.JSONDecodeError):
                provenance = {"manifest_warning": f"Could not parse {manifest_name}."}
            break
    if provenance.get("source_name"):
        source_type = "downloaded_with_aerosentry_source_manifest"
    elif provenance.get("source") == "browser_upload":
        source_type = "browser_uploaded_local_files"
    else:
        source_type = "local_files_without_source_manifest"

    report: dict[str, Any] = {
        "dataset": "NASA C-MAPSS FD001",
        "source_type": source_type,
        "source_provenance": provenance,
        "validation_status": "passed",
        "validated_at_utc": datetime.now(timezone.utc).isoformat(),
        "files": file_manifest,
        "dataset_fingerprint_sha256": dataset_fingerprint,
        "canonical_fd001_profile": {
            "expected": CANONICAL_PROFILE,
            "observed": observed_profile,
            "matches_standard_profile": profile_matches,
        },
        "training": {
            "rows": int(len(train)),
            "engine_count": int(len(train_units)),
            "engine_ids": train_units,
            "first_cycle": int(train["time_cycles"].min()),
            "last_cycle": int(train["time_cycles"].max()),
        },
        "test": {
            "rows": int(len(test)),
            "engine_count": int(len(test_units)),
            "engine_ids": test_units,
            "first_cycle": int(test["time_cycles"].min()),
            "last_cycle": int(test["time_cycles"].max()),
        },
        "columns": {
            "operational_settings": len(SETTING_COLUMNS),
            "sensor_channels": len(SENSOR_COLUMNS),
            "total_raw_columns": len(DATA_COLUMNS),
        },
        "test_rul_labels": int(len(rul)),
        "constant_sensor_candidates": constant_sensors,
        "missing_values": 0,
        "duplicate_engine_cycle_pairs": 0,
        "warnings": [] if profile_matches else [
            "Observed inventory differs from the standard FD001 profile. "
            "Check that these are the original FD001 files before interpreting results."
        ],
        "notes": [
            "FD001 is simulated turbofan degradation data, not live aircraft telemetry.",
            "Constant sensor candidates are reported but are not removed during validation.",
            "A non-matching canonical inventory is reported for review, not silently accepted as official FD001.",
            "SHA-256 file hashes are recorded for traceability and reproducibility; hashes alone do not prove NASA provenance.",
            "Only a downloader manifest records the source archive and whether its published archive checksum was verified.",
            "Test RUL labels are ordered by ascending test engine ID, as in the original benchmark format.",
        ],
    }
    return LoadedFD001(train=train, test=test, test_rul=rul.reset_index(drop=True), report=report)


def _attach_rul_labels(loaded: LoadedFD001, rul_cap: int) -> tuple[pd.DataFrame, pd.DataFrame]:
    train = loaded.train.copy()
    train_last = train.groupby("unit_nr")["time_cycles"].transform("max")
    train["RUL_actual"] = train_last - train["time_cycles"]
    train["RUL"] = train["RUL_actual"].clip(upper=rul_cap)

    test = loaded.test.copy()
    test_units = sorted(test["unit_nr"].unique().astype(int).tolist())
    if len(test_units) != len(loaded.test_rul):
        raise DatasetError("Cannot map the test RUL labels to the observed test engine IDs.")
    test_last = test.groupby("unit_nr")["time_cycles"].transform("max")
    labels_by_unit = dict(zip(test_units, loaded.test_rul.astype(float).tolist()))
    final_rul = test["unit_nr"].map(labels_by_unit)
    test["RUL"] = (test_last - test["time_cycles"] + final_rul).astype(float)
    return train, test


def _make_windows(
    frame: pd.DataFrame,
    feature_columns: list[str],
    window_size: int,
    pad_short_sequences: bool = False,
    final_only: bool = False,
) -> tuple[np.ndarray, np.ndarray, np.ndarray, np.ndarray]:
    windows: list[np.ndarray] = []
    targets: list[float] = []
    engine_ids: list[int] = []
    end_cycles: list[int] = []

    for unit_id, group in frame.groupby("unit_nr", sort=True):
        group = group.sort_values("time_cycles")
        values = group[feature_columns].to_numpy(dtype=np.float32)
        labels = group["RUL"].to_numpy(dtype=np.float32)
        cycles = group["time_cycles"].to_numpy(dtype=np.int32)

        if final_only:
            final_values = values[-window_size:]
            if len(final_values) < window_size:
                if not pad_short_sequences:
                    continue
                pad_count = window_size - len(final_values)
                final_values = np.concatenate(
                    [np.repeat(values[:1], pad_count, axis=0), final_values], axis=0
                )
            windows.append(final_values)
            targets.append(float(labels[-1]))
            engine_ids.append(int(unit_id))
            end_cycles.append(int(cycles[-1]))
            continue

        for end in range(window_size - 1, len(values)):
            windows.append(values[end - window_size + 1:end + 1])
            targets.append(float(labels[end]))
            engine_ids.append(int(unit_id))
            end_cycles.append(int(cycles[end]))

    if not windows:
        raise DatasetError(
            f"No complete {window_size}-cycle windows could be created. "
            "Reduce the window size or verify the data."
        )
    return (
        np.stack(windows).astype(np.float32),
        np.asarray(targets, dtype=np.float32),
        np.asarray(engine_ids, dtype=np.int32),
        np.asarray(end_cycles, dtype=np.int32),
    )


def _write_preprocessed(
    loaded: LoadedFD001,
    output_dir: Path,
    window_size: int,
    rul_cap: int,
    validation_fraction: float,
    random_state: int,
    variance_threshold: float,
) -> dict[str, Any]:
    train_labeled, test_labeled = _attach_rul_labels(loaded, rul_cap)
    if train_labeled["unit_nr"].nunique() < 3:
        raise DatasetError("At least three training engines are required for a group-based validation split.")

    splitter = GroupShuffleSplit(n_splits=1, test_size=validation_fraction, random_state=random_state)
    train_idx, val_idx = next(
        splitter.split(train_labeled, groups=train_labeled["unit_nr"].to_numpy())
    )
    fit_units = sorted(train_labeled.iloc[train_idx]["unit_nr"].unique().astype(int).tolist())
    val_units = sorted(train_labeled.iloc[val_idx]["unit_nr"].unique().astype(int).tolist())
    if set(fit_units) & set(val_units):
        raise DatasetError("Train/validation engine leakage detected.")

    fit_frame = train_labeled[train_labeled["unit_nr"].isin(fit_units)].copy()
    validation_frame = train_labeled[train_labeled["unit_nr"].isin(val_units)].copy()
    candidate_features = SETTING_COLUMNS + SENSOR_COLUMNS
    std = fit_frame[candidate_features].std(ddof=0)
    feature_columns = [column for column in candidate_features if float(std[column]) > variance_threshold]
    removed_features = [column for column in candidate_features if column not in feature_columns]
    if not feature_columns:
        raise DatasetError("No non-constant features remain after variance filtering.")

    scaler = StandardScaler()
    scaler.fit(fit_frame[feature_columns].to_numpy(dtype=float))

    def transform_frame(frame: pd.DataFrame) -> pd.DataFrame:
        result = frame[["unit_nr", "time_cycles", "RUL"]].copy()
        scaled = scaler.transform(frame[feature_columns].to_numpy(dtype=float))
        for index, column in enumerate(feature_columns):
            result[column] = scaled[:, index].astype(np.float32)
        return result

    train_processed = transform_frame(fit_frame)
    validation_processed = transform_frame(validation_frame)
    test_processed = transform_frame(test_labeled)

    X_train, y_train, train_engine_ids, train_end_cycles = _make_windows(
        train_processed, feature_columns, window_size
    )
    X_val, y_val, val_engine_ids, val_end_cycles = _make_windows(
        validation_processed, feature_columns, window_size
    )
    X_test, y_test, test_engine_ids, test_end_cycles = _make_windows(
        test_processed, feature_columns, window_size, pad_short_sequences=True, final_only=True
    )

    output_dir.mkdir(parents=True, exist_ok=True)
    train_labeled.to_csv(output_dir / "train_labeled.csv", index=False)
    test_labeled.to_csv(output_dir / "test_labeled.csv", index=False)
    train_processed.to_csv(output_dir / "train_processed.csv", index=False)
    validation_processed.to_csv(output_dir / "validation_processed.csv", index=False)
    test_processed.to_csv(output_dir / "test_processed.csv", index=False)

    window_payloads = {
        "train_windows.npz": (X_train, y_train, train_engine_ids, train_end_cycles),
        "validation_windows.npz": (X_val, y_val, val_engine_ids, val_end_cycles),
        "test_windows.npz": (X_test, y_test, test_engine_ids, test_end_cycles),
    }
    for filename, (X, y, engine_ids, end_cycles) in window_payloads.items():
        np.savez_compressed(
            output_dir / filename,
            X=X,
            y=y,
            engine_ids=engine_ids,
            end_cycles=end_cycles,
            feature_names=np.asarray(feature_columns),
        )
    joblib.dump(scaler, output_dir / "scaler.joblib")

    summary: dict[str, Any] = {
        "dataset": "NASA C-MAPSS FD001",
        "preprocessing_status": "complete",
        "created_at_utc": datetime.now(timezone.utc).isoformat(),
        "source_validation": loaded.report,
        "configuration": {
            "window_size": window_size,
            "training_rul_cap": rul_cap,
            "validation_fraction_by_engine": validation_fraction,
            "random_state": random_state,
            "variance_threshold": variance_threshold,
            "scaler": "StandardScaler fitted only on training-split engine rows",
        },
        "split": {
            "training_engine_ids": fit_units,
            "validation_engine_ids": val_units,
            "test_engine_ids": sorted(test_labeled["unit_nr"].unique().astype(int).tolist()),
            "train_validation_overlap": sorted(set(fit_units) & set(val_units)),
        },
        "features": {
            "selected": feature_columns,
            "removed_as_constant_or_near_constant": removed_features,
        },
        "windows": {
            "train_shape": list(X_train.shape),
            "validation_shape": list(X_val.shape),
            "test_shape": list(X_test.shape),
            "target": "RUL at the final cycle of each window",
        },
        "outputs": [
            "train_labeled.csv", "test_labeled.csv", "train_processed.csv",
            "validation_processed.csv", "test_processed.csv", "train_windows.npz",
            "validation_windows.npz", "test_windows.npz", "scaler.joblib",
        ],
        "important_notes": [
            "Training RUL labels are capped; test RUL labels are not capped.",
            "Test RUL for each row is final observed RUL plus cycles between that row and the final observed cycle.",
            "Scaler is fitted on training-split engines only; validation and official test rows are transform-only.",
            "Windows are created independently per engine; no window crosses engine boundaries.",
            "Test windows contain one final window per test engine; short trajectories are left-padded with their first feature row.",
            "No ML model is trained during Phase 2.",
        ],
    }
    (output_dir / "validation_report.json").write_text(json.dumps(loaded.report, indent=2), encoding="utf-8")
    (output_dir / "preprocessing_summary.json").write_text(json.dumps(summary, indent=2), encoding="utf-8")
    return summary


def preprocess_fd001(
    data_dir: str | Path,
    output_dir: str | Path,
    window_size: int = 30,
    rul_cap: int = 125,
    validation_fraction: float = 0.2,
    random_state: int = 42,
    variance_threshold: float = 1e-8,
) -> dict[str, Any]:
    if window_size < 2:
        raise DatasetError("window_size must be at least 2.")
    if rul_cap < 1:
        raise DatasetError("rul_cap must be at least 1.")
    if not 0.05 <= validation_fraction <= 0.5:
        raise DatasetError("validation_fraction must be between 0.05 and 0.5.")
    if variance_threshold < 0:
        raise DatasetError("variance_threshold cannot be negative.")

    loaded = validate_fd001(data_dir)
    target = Path(output_dir)
    target.parent.mkdir(parents=True, exist_ok=True)
    stage = Path(tempfile.mkdtemp(prefix=f".{target.name}-staging-", dir=target.parent))
    backup = target.with_name(target.name + ".previous")
    try:
        summary = _write_preprocessed(
            loaded, stage, window_size, rul_cap, validation_fraction,
            random_state, variance_threshold,
        )
        if backup.exists():
            shutil.rmtree(backup)
        if target.exists():
            target.rename(backup)
        try:
            stage.rename(target)
        except Exception:
            if backup.exists() and not target.exists():
                backup.rename(target)
            raise
        if backup.exists():
            shutil.rmtree(backup)
        return summary
    finally:
        if stage.exists():
            shutil.rmtree(stage, ignore_errors=True)
