"""Tests for custom plant CSV retraining and multi-plant FastAPI endpoints."""

from pathlib import Path
from fastapi.testclient import TestClient
import numpy as np
import pandas as pd
import pytest

from app.main import app
from training.retrain_custom import train_custom_plant_csv


def _create_synthetic_plant_df(seed: int = 42, cycles: int = 4, rows_per_ep: int = 40) -> pd.DataFrame:
    """Create a multi-episode 4-sensor, 3-class (0, 1, 2) synthetic plant dataset."""
    rng = np.random.default_rng(seed=seed)
    parts: list[pd.DataFrame] = []

    for _ in range(cycles):
        parts.append(
            pd.DataFrame(
                {
                    "TEMP_A": 50.0 + rng.normal(0.0, 0.5, rows_per_ep),
                    "PRESS_B": 10.0 + rng.normal(0.0, 0.2, rows_per_ep),
                    "FLOW_C": 100.0 + rng.normal(0.0, 1.0, rows_per_ep),
                    "LEVEL_D": 40.0 + rng.normal(0.0, 0.5, rows_per_ep),
                    "STATUS": 0,
                }
            )
        )
        parts.append(
            pd.DataFrame(
                {
                    "TEMP_A": 90.0 + np.linspace(0.0, 8.0, rows_per_ep) + rng.normal(0.0, 0.5, rows_per_ep),
                    "PRESS_B": 25.0 + rng.normal(0.0, 0.4, rows_per_ep),
                    "FLOW_C": 100.0 + rng.normal(0.0, 1.0, rows_per_ep),
                    "LEVEL_D": 40.0 + rng.normal(0.0, 0.5, rows_per_ep),
                    "STATUS": 1,
                }
            )
        )
        parts.append(
            pd.DataFrame(
                {
                    "TEMP_A": 50.0 + rng.normal(0.0, 0.5, rows_per_ep),
                    "PRESS_B": 10.0 + rng.normal(0.0, 0.2, rows_per_ep),
                    "FLOW_C": 20.0 + rng.normal(0.0, 0.8, rows_per_ep),
                    "LEVEL_D": 85.0 + np.linspace(0.0, 5.0, rows_per_ep) + rng.normal(0.0, 0.5, rows_per_ep),
                    "STATUS": 2,
                }
            )
        )

    return pd.concat(parts, ignore_index=True)


def test_train_custom_plant_csv_accuracy_and_artifacts(tmp_path: Path) -> None:
    """Verify train_custom_plant_csv trains cleanly on a 4-sensor CSV and reaches >= 0.85 acc."""
    df = _create_synthetic_plant_df()
    csv_path = tmp_path / "custom_plant.csv"
    df.to_csv(csv_path, index=False)

    plants_root = tmp_path / "plants"
    summary = train_custom_plant_csv(
        csv_path=csv_path,
        plant_id="chem_unit_1",
        plant_name="Demo Chemical Unit 1",
        window_size=20,
        artifacts_root=plants_root,
    )

    assert summary["plant_id"] == "chem_unit_1"
    assert summary["plant_name"] == "Demo Chemical Unit 1"
    assert summary["n_sensors"] == 4
    assert summary["sensor_cols"] == ["TEMP_A", "PRESS_B", "FLOW_C", "LEVEL_D"]
    assert summary["classes"] == [0, 1, 2]
    assert summary["train_windows"] > 0
    assert summary["sample_accuracy"] >= 0.85
    assert summary["sample_macro_f1"] >= 0.85

    out_dir = Path(summary["artifacts_dir"])
    assert (out_dir / "xgb_model.json").is_file()
    assert (out_dir / "scaler.joblib").is_file()
    assert (out_dir / "baseline.json").is_file()
    assert (out_dir / "label_map.json").is_file()


def test_train_custom_plant_csv_small_single_episode_and_semicolon(tmp_path: Path) -> None:
    """Verify chronological fallback on 1-episode-per-class semicolon CSV with timestamp."""
    df = _create_synthetic_plant_df(seed=7, cycles=1, rows_per_ep=60)
    df.insert(0, "timestamp", pd.date_range("2026-01-01", periods=len(df), freq="3min").astype(str))
    csv_path = tmp_path / "semicolon_small.csv"
    df.to_csv(csv_path, sep=";", index=False)

    summary = train_custom_plant_csv(
        csv_path=csv_path,
        plant_id="small-semi",
        timestamp_col="timestamp",
        window_size=20,
        artifacts_root=tmp_path / "plants",
    )
    assert summary["plant_id"] == "small-semi"
    assert summary["n_sensors"] == 4
    assert summary["train_windows"] > 0


def test_train_custom_plant_csv_validation_errors(tmp_path: Path) -> None:
    """Verify validation errors on reserved plant_id, too few sensors, or single class."""
    df = _create_synthetic_plant_df()
    csv_path = tmp_path / "valid.csv"
    df.to_csv(csv_path, index=False)

    with pytest.raises(ValueError, match="reserved"):
        train_custom_plant_csv(csv_path=csv_path, plant_id="tep", artifacts_root=tmp_path / "p")

    single_sensor_csv = tmp_path / "one_sensor.csv"
    df[["TEMP_A", "STATUS"]].to_csv(single_sensor_csv, index=False)
    with pytest.raises(ValueError, match="At least 2 numeric sensor columns"):
        train_custom_plant_csv(
            csv_path=single_sensor_csv, plant_id="bad_1", artifacts_root=tmp_path / "p"
        )

    single_class_csv = tmp_path / "one_class.csv"
    df[df["STATUS"] == 0].to_csv(single_class_csv, index=False)
    with pytest.raises(ValueError, match="At least 2 unique classes"):
        train_custom_plant_csv(
            csv_path=single_class_csv, plant_id="bad_2", artifacts_root=tmp_path / "p"
        )


def test_multi_plant_retrain_analyze_and_switch_back_to_tep(
    tmp_path: Path,
    monkeypatch: pytest.MonkeyPatch,
) -> None:
    """Verify /plants/retrain -> /analyze on 4 sensors -> /plants/tep/activate workflow."""
    df = _create_synthetic_plant_df(seed=123)
    csv_bytes = df.to_csv(index=False).encode("utf-8")

    with TestClient(app) as client:
        monkeypatch.setattr(app.state, "plants_artifacts_root", tmp_path / "plants")

        try:
            # 1. Upload & retrain custom plant (auto-activated)
            retrain_res = client.post(
                "/api/v1/plants/retrain",
                files={"file": ("alpha_factory.csv", csv_bytes, "text/csv")},
                data={
                    "plant_id": "alpha_factory",
                    "plant_name": "Alpha Refinery Unit",
                    "status_col": "STATUS",
                    "window_size": "20",
                    "activate": "true",
                },
            )
            assert retrain_res.status_code == 201
            retrain_data = retrain_res.json()
            assert retrain_data["status"] == "trained"
            assert retrain_data["activated"] is True
            assert retrain_data["plant_id"] == "alpha_factory"
            assert retrain_data["n_sensors"] == 4
            assert retrain_data["sample_accuracy"] >= 0.85

            # 2. Verify GET /api/v1/plants shows both tep and alpha_factory (active)
            plants_res = client.get("/api/v1/plants")
            assert plants_res.status_code == 200
            plants_data = plants_res.json()
            assert plants_data["active_plant_id"] == "alpha_factory"
            plant_ids = {p["plant_id"] for p in plants_data["plants"]}
            assert {"tep", "alpha_factory"}.issubset(plant_ids)

            # 3. Verify GET /api/v1/health reflects custom plant
            health_custom = client.get("/api/v1/health").json()
            assert health_custom["active_plant_id"] == "alpha_factory"
            assert health_custom["supported_faults"] == 3

            # 4. Run POST /api/v1/analyze on 4-sensor Fault 1 window
            f1_rows = (
                df[df["STATUS"] == 1]
                .iloc[:20][["TEMP_A", "PRESS_B", "FLOW_C", "LEVEL_D"]]
                .astype(float)
                .to_dict(orient="records")
            )
            analyze_f1 = client.post("/api/v1/analyze", json={"window": f1_rows})
            assert analyze_f1.status_code == 200
            f1_data = analyze_f1.json()
            assert f1_data["root_cause"]["fault_id"] == 1
            assert f1_data["raw_alarm_count"] > 0
            assert len(f1_data["shap_evidence"]) == 3
            assert f1_data["latency_ms"] < 100.0

            # 5. Run POST /api/v1/analyze on 4-sensor Fault 2 window
            f2_rows = (
                df[df["STATUS"] == 2]
                .iloc[:20][["TEMP_A", "PRESS_B", "FLOW_C", "LEVEL_D"]]
                .astype(float)
                .to_dict(orient="records")
            )
            analyze_f2 = client.post("/api/v1/analyze", json=f2_rows)
            assert analyze_f2.status_code == 200
            assert analyze_f2.json()["root_cause"]["fault_id"] == 2

            # 6. TEP simulate endpoint safely returns 409 while custom plant is active
            sim_conflict = client.post("/api/v1/simulate/6")
            assert sim_conflict.status_code == 409

            # 7. Switch cleanly back to default TEP model
            activate_tep = client.post("/api/v1/plants/tep/activate")
            assert activate_tep.status_code == 200
            tep_data = activate_tep.json()
            assert tep_data["status"] == "activated"
            assert tep_data["plant_id"] == "tep"
            assert tep_data["n_sensors"] == 52

            # 8. Confirm TEP simulation works normally again
            sim_ok = client.post("/api/v1/simulate/6")
            assert sim_ok.status_code == 200
            assert sim_ok.json()["root_cause"]["fault_id"] == 6
        finally:
            client.post("/api/v1/plants/tep/activate")
