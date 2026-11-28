from __future__ import annotations

from pathlib import Path

import numpy as np
import pandas as pd
import pytest

from app.services.cmapss import (
    DATA_COLUMNS,
    DatasetError,
    preprocess_fd001,
    validate_fd001,
)


def _write_fixture(folder: Path, train_engines: int = 10, test_engines: int = 5) -> None:
    folder.mkdir(parents=True, exist_ok=True)
    rng = np.random.default_rng(19)

    def make_rows(engine_count: int, cycles: int, start_unit: int = 1):
        rows = []
        for unit in range(start_unit, start_unit + engine_count):
            for cycle in range(1, cycles + 1):
                settings = [0.01 * unit, 0.02 * (cycle % 3), 100.0]
                sensors = []
                for sensor in range(1, 22):
                    base = sensor * 3.0 + unit * 0.1
                    trend = cycle * (0.003 * sensor)
                    noise = rng.normal(0, 0.015)
                    sensors.append(base + trend + noise)
                rows.append([unit, cycle, *settings, *sensors])
        return pd.DataFrame(rows, columns=DATA_COLUMNS)

    train = make_rows(train_engines, 45, 1)
    test = make_rows(test_engines, 35, 1)
    train.to_csv(folder / "train_FD001.txt", sep=" ", header=False, index=False, float_format="%.6f")
    test.to_csv(folder / "test_FD001.txt", sep=" ", header=False, index=False, float_format="%.6f")
    pd.Series([12 + i for i in range(test_engines)]).to_csv(
        folder / "RUL_FD001.txt", header=False, index=False
    )


@pytest.fixture
def fd001_fixture(tmp_path: Path) -> Path:
    folder = tmp_path / "raw" / "FD001"
    _write_fixture(folder)
    return folder


def test_validate_reports_structure_and_hashes(fd001_fixture: Path):
    loaded = validate_fd001(fd001_fixture)
    assert loaded.report["validation_status"] == "passed"
    assert loaded.report["columns"]["total_raw_columns"] == 26
    assert loaded.report["training"]["engine_count"] == 10
    assert loaded.report["test"]["engine_count"] == 5
    assert loaded.report["test_rul_labels"] == 5
    assert loaded.report["files"]["train_FD001.txt"]["sha256"]
    assert loaded.report["canonical_fd001_profile"]["matches_standard_profile"] is False


def test_preprocess_creates_windows_and_group_split(fd001_fixture: Path, tmp_path: Path):
    output = tmp_path / "processed" / "FD001"
    summary = preprocess_fd001(
        fd001_fixture,
        output,
        window_size=20,
        rul_cap=30,
        validation_fraction=0.2,
        random_state=42,
    )

    split = summary["split"]
    assert set(split["training_engine_ids"]).isdisjoint(split["validation_engine_ids"])
    assert summary["windows"]["test_shape"][0] == 5
    assert summary["windows"]["test_shape"][1] == 20
    assert summary["windows"]["train_shape"][2] == len(summary["features"]["selected"])
    assert (output / "scaler.joblib").is_file()
    assert (output / "preprocessing_summary.json").is_file()
    assert (output / "validation_report.json").is_file()

    test_windows = np.load(output / "test_windows.npz")
    assert test_windows["X"].shape[0] == 5
    assert np.allclose(test_windows["y"], np.array([12, 13, 14, 15, 16], dtype=np.float32))


def test_rejects_wrong_column_count(tmp_path: Path):
    folder = tmp_path / "bad"
    folder.mkdir()
    (folder / "train_FD001.txt").write_text("1 1 2 3\n", encoding="utf-8")
    (folder / "test_FD001.txt").write_text("1 1 2 3\n", encoding="utf-8")
    (folder / "RUL_FD001.txt").write_text("5\n", encoding="utf-8")
    with pytest.raises(DatasetError, match="expected 26"):
        validate_fd001(folder)


def test_rejects_cycle_gap(fd001_fixture: Path):
    frame = pd.read_csv(fd001_fixture / "train_FD001.txt", sep=r"\s+", header=None)
    # Remove unit 1, cycle 2 so that the validator sees a gap in its trajectory.
    frame = frame[~((frame[0] == 1) & (frame[1] == 2))]
    frame.to_csv(fd001_fixture / "train_FD001.txt", sep=" ", header=False, index=False)
    with pytest.raises(DatasetError, match="skipped cycle"):
        validate_fd001(fd001_fixture)
