from __future__ import annotations

import io
from pathlib import Path

import numpy as np
import pandas as pd
from fastapi.testclient import TestClient

from app import main
from app.services.cmapss import DATA_COLUMNS


def _fixture_files():
    rng = np.random.default_rng(21)
    train_rows = []
    test_rows = []
    for unit in range(1, 9):
        for cycle in range(1, 36):
            row = [unit, cycle, 0.01 * unit, 0.02 * (cycle % 3), 100.0]
            row += [sensor * 2.0 + unit * 0.1 + cycle * sensor * 0.002 + rng.normal(0, 0.01) for sensor in range(1, 22)]
            train_rows.append(row)
    for unit in range(1, 4):
        for cycle in range(1, 32):
            row = [unit, cycle, 0.01 * unit, 0.02 * (cycle % 3), 100.0]
            row += [sensor * 2.0 + unit * 0.1 + cycle * sensor * 0.002 + rng.normal(0, 0.01) for sensor in range(1, 22)]
            test_rows.append(row)
    train = pd.DataFrame(train_rows, columns=DATA_COLUMNS).to_csv(sep=" ", header=False, index=False).encode()
    test = pd.DataFrame(test_rows, columns=DATA_COLUMNS).to_csv(sep=" ", header=False, index=False).encode()
    rul = b"10\n11\n12\n"
    return train, test, rul


def test_health_status_upload_validate_and_preprocess(tmp_path: Path, monkeypatch):
    data_dir = tmp_path / "raw" / "FD001"
    output_dir = tmp_path / "processed" / "FD001"
    monkeypatch.setattr(main, "DATA_DIR", data_dir)
    monkeypatch.setattr(main, "OUTPUT_DIR", output_dir)
    client = TestClient(main.app)

    assert client.get("/api/v1/health").status_code == 200
    assert client.get("/api/v1/datasets/fd001/status").json()["dataset_available"] is False

    train, test, rul = _fixture_files()
    response = client.post(
        "/api/v1/datasets/fd001/upload",
        files=[
            ("files", ("train_FD001.txt", io.BytesIO(train), "text/plain")),
            ("files", ("test_FD001.txt", io.BytesIO(test), "text/plain")),
            ("files", ("RUL_FD001.txt", io.BytesIO(rul), "text/plain")),
        ],
    )
    assert response.status_code == 200, response.text
    assert response.json()["validation"]["validation_status"] == "passed"

    status = client.get("/api/v1/datasets/fd001/status").json()
    assert status["dataset_available"] is True
    assert status["validated"] is True

    validation = client.post("/api/v1/datasets/fd001/validate")
    assert validation.status_code == 200

    preprocess = client.post(
        "/api/v1/datasets/fd001/preprocess",
        json={"window_size": 20, "rul_cap": 125, "validation_fraction": 0.25, "random_state": 42},
    )
    assert preprocess.status_code == 200, preprocess.text
    assert preprocess.json()["preprocessing_status"] == "complete"
    assert client.get("/api/v1/datasets/fd001/metadata").status_code == 200

    # Replacing one raw file must invalidate previously saved validation/preprocessing state.
    with (data_dir / "train_FD001.txt").open("ab") as handle:
        handle.write(b"\n")
    stale_status = client.get("/api/v1/datasets/fd001/status").json()
    assert stale_status["dataset_available"] is True
    assert stale_status["validated"] is False
    assert stale_status["preprocessed"] is False
