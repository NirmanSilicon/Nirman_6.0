from __future__ import annotations

from pathlib import Path
import sys

import pandas as pd
from fastapi.testclient import TestClient

ROOT = Path(__file__).resolve().parents[2]
sys.path.insert(0, str(ROOT / "backend"))
from app import main  # noqa: E402


def test_phase3_model_status_and_historical_replay():
    client = TestClient(main.app)
    status = client.get("/api/v1/anomaly/fd001/status")
    assert status.status_code == 200
    assert status.json()["model_available"] is True
    assert status.json()["feature_count"] == 17

    engines = client.get("/api/v1/anomaly/fd001/engines")
    assert engines.status_code == 200
    assert len(engines.json()["engines"]) == 100

    selected = engines.json()["engines"][97]
    cycle = min(26, selected["max_cycle"])
    result = client.get(
        "/api/v1/anomaly/fd001/analyze",
        params={"engine_id": selected["engine_id"], "end_cycle": cycle},
    )
    assert result.status_code == 200, result.text
    payload = result.json()
    assert payload["engine_id"] == str(selected["engine_id"])
    assert payload["current_cycle"] == cycle
    assert payload["mode"] == "historical_replay"
    assert "scores" in payload and "triggered_checks" in payload


def test_ncmapss_status_and_telemetry_loader_excludes_rul(tmp_path, monkeypatch):
    nc_root = tmp_path / "phase4_ncmapss"
    processed_dir = nc_root / "data" / "processed"
    processed_dir.mkdir(parents=True)
    dev = processed_dir / "ncmapss_ds05_dev_flights.csv"
    test = processed_dir / "ncmapss_ds05_test_flights.csv"
    summary = processed_dir / "ncmapss_ds05_preprocessing_summary.json"
    pd.DataFrame([
        {"unit": 101, "cycle": 1, "alt_mean": 10000.0, "Wf_mean": 12.0, "rul_mean": 30.0, "health_state_code": 0, "samples_in_flight": 5},
        {"unit": 101, "cycle": 2, "alt_mean": 11000.0, "Wf_mean": 12.5, "rul_mean": 29.0, "health_state_code": 0, "samples_in_flight": 5},
    ]).to_csv(dev, index=False)
    pd.DataFrame([{ "unit": 201, "cycle": 1, "alt_mean": 10000.0, "Wf_mean": 12.0, "rul_mean": 4.0 }]).to_csv(test, index=False)
    summary.write_text('{"validation_status":"passed","splits":{"dev":{"rows":2},"test":{"rows":1}}}', encoding="utf-8")
    monkeypatch.setattr(main, "NCMAPSS_DEV_FLIGHTS", dev)
    monkeypatch.setattr(main, "NCMAPSS_TEST_FLIGHTS", test)
    monkeypatch.setattr(main, "NCMAPSS_ROOT", nc_root)
    monkeypatch.setattr(main, "NCMAPSS_FILE", nc_root / "data" / "raw" / "N-CMAPSS_DS05.h5")
    monkeypatch.setattr(main, "NCMAPSS_REPORT", nc_root / "outputs" / "ncmapss_ds05_inspection.json")

    client = TestClient(main.app)
    status = client.get("/api/v1/datasets/ncmapss/ds05/status")
    assert status.status_code == 200
    assert status.json()["preprocessed"] is True

    engines = client.get("/api/v1/telemetry/engines", params={"data_source": "ncmapss"})
    assert engines.status_code == 200
    assert engines.json()["engines"] == [{"engine_id": "101", "max_cycle": 2}]

    from app.services.telemetry.data_loader import load_engine_rows
    rows = load_engine_rows(dev, "101")
    assert len(rows) == 2
    assert "rul_mean" not in rows[0]["sensors"]
    assert "health_state_code" not in rows[0]["sensors"]
    assert rows[0]["operating_conditions"]["alt_mean"] == 10000.0


def test_ncmapss_api_inspects_and_preprocesses_hdf5_fixture(tmp_path, monkeypatch):
    import shutil
    import h5py
    import numpy as np

    nc_root = tmp_path / "phase4_ncmapss"
    scripts_dir = nc_root / "scripts"
    raw_dir = nc_root / "data" / "raw"
    processed_dir = nc_root / "data" / "processed"
    outputs_dir = nc_root / "outputs"
    scripts_dir.mkdir(parents=True)
    raw_dir.mkdir(parents=True)
    processed_dir.mkdir(parents=True)
    outputs_dir.mkdir(parents=True)

    source_scripts = ROOT / "phase4_ncmapss" / "scripts"
    shutil.copy2(source_scripts / "inspect_ncmapss.py", scripts_dir / "inspect_ncmapss.py")
    shutil.copy2(source_scripts / "preprocess_to_flights.py", scripts_dir / "preprocess_to_flights.py")

    h5_path = raw_dir / "N-CMAPSS_DS05.h5"
    rng = np.random.default_rng(23)
    with h5py.File(h5_path, "w") as h5:
        for split, units in (("dev", [101, 102, 103, 104, 105, 106]), ("test", [201, 202, 203])):
            a_rows, y_rows = [], []
            for unit in units:
                for cycle in (1, 2):
                    for second in range(7):
                        a_rows.append((unit, cycle, 1, 0))
                        y_rows.append(2 - cycle)
            n = len(a_rows)
            h5.create_dataset(f"A_{split}", data=np.asarray(a_rows, dtype=np.int32))
            h5.create_dataset(f"W_{split}", data=rng.normal(size=(n, 4)).astype("f4"))
            h5.create_dataset(f"X_s_{split}", data=rng.normal(size=(n, 14)).astype("f4"))
            h5.create_dataset(f"X_v_{split}", data=rng.normal(size=(n, 14)).astype("f4"))
            h5.create_dataset(f"T_{split}", data=rng.normal(size=(n, 10)).astype("f4"))
            h5.create_dataset(f"Y_{split}", data=np.asarray(y_rows, dtype="f4").reshape(-1, 1))
        metadata = {
            "A_var": ["unit", "cycle", "Fc", "hs"],
            "W_var": ["alt", "Mach", "TRA", "T2"],
            "X_s_var": ["Wf", "Nf", "Nc", "T24", "T30", "T48", "T50", "P15", "P2", "P21", "P24", "Ps30", "P40", "P50"],
            "X_v_var": ["T40", "P30", "P45", "W21", "W22", "W25", "W31", "W32", "W48", "W50", "SmFan", "SmLPC", "SmHPC", "phi"],
            "T_var": ["fan_eff_mod", "fan_flow_mod", "LPC_eff_mod", "LPC_flow_mod", "HPC_eff_mod", "HPC_flow_mod", "HPT_eff_mod", "HPT_flow_mod", "LPT_eff_mod", "LPT_flow_mod"],
        }
        for key, names in metadata.items():
            h5.create_dataset(key, data=np.asarray(names, dtype=h5py.string_dtype()))

    report_path = outputs_dir / "ncmapss_ds05_inspection.json"
    monkeypatch.setattr(main, "NCMAPSS_ROOT", nc_root)
    monkeypatch.setattr(main, "NCMAPSS_FILE", h5_path)
    monkeypatch.setattr(main, "NCMAPSS_REPORT", report_path)
    monkeypatch.setattr(main, "NCMAPSS_DEV_FLIGHTS", processed_dir / "ncmapss_ds05_dev_flights.csv")
    monkeypatch.setattr(main, "NCMAPSS_TEST_FLIGHTS", processed_dir / "ncmapss_ds05_test_flights.csv")

    client = TestClient(main.app)
    inspected = client.post("/api/v1/datasets/ncmapss/ds05/inspect")
    assert inspected.status_code == 200, inspected.text
    assert inspected.json()["validation_status"] == "passed"

    processed = client.post("/api/v1/datasets/ncmapss/ds05/preprocess")
    assert processed.status_code == 200, processed.text
    payload = processed.json()
    assert payload["preprocessed"] is True
    assert payload["preprocessing_summary"]["splits"]["dev"]["engine_units"] == [101, 102, 103, 104, 105, 106]
    assert payload["preprocessing_summary"]["splits"]["test"]["engine_units"] == [201, 202, 203]
