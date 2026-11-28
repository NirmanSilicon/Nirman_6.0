
"""API tests for the AlarmSense FastAPI backend.

These tests use an isolated FastAPI application and a mock predictor.
They do not require the real TEP dataset or trained model artifacts.
"""

from pathlib import Path

import numpy as np
import pandas as pd
import pytest
from fastapi import FastAPI
from fastapi.testclient import TestClient

from app.config import (
    DEFAULT_WINDOW_SIZE,
    FAULT_METADATA,
    SENSOR_COLS,
    TARGET_FAULTS,
)
from app.routes import router


# ---------------------------------------------------------------------
# Test fixtures and helpers
# ---------------------------------------------------------------------

class FakePredictor:
    """Lightweight predictor substitute for API route tests."""

    def __init__(self):
        self.plant_id = "tep"
        self.plant_name = "Tennessee Eastman Process"
        self.classes = list(TARGET_FAULTS)
        self.sensor_cols = list(SENSOR_COLS)
        self.window_size = DEFAULT_WINDOW_SIZE
        self.fault_names = {
            fault_id: FAULT_METADATA[fault_id]["name"]
            for fault_id in TARGET_FAULTS
        }

        self.baseline = pd.DataFrame(
            {
                "mean": np.zeros(len(SENSOR_COLS)),
                "std": np.ones(len(SENSOR_COLS)),
            },
            index=SENSOR_COLS,
        )


@pytest.fixture
def api_app(tmp_path):
    """Create an isolated app without executing the production lifespan."""

    application = FastAPI()
    application.include_router(router, prefix="/api/v1")

    application.state.predictor = FakePredictor()
    application.state.test_episodes_by_fault = {}
    application.state.natural_normal_prefix_by_ep_id = {}
    application.state.feedback_log_path = tmp_path / "feedback.jsonl"
    application.state.tep_artifacts_dir = tmp_path / "tep"
    application.state.plants_artifacts_root = tmp_path / "plants"

    return application


@pytest.fixture
def client(api_app):
    """Create a test client without loading real model artifacts."""

    with TestClient(api_app) as test_client:
        yield test_client


def make_sensor_window(rows=DEFAULT_WINDOW_SIZE):
    """Create valid synthetic sensor observations."""

    return [
        {sensor: float(100 + row) for sensor in SENSOR_COLS}
        for row in range(rows)
    ]


def make_analysis_result():
    """Return a valid mock result matching AnalyzeResponse."""

    return {
        "raw_alarm_count": 0,
        "confirmed_alarm_count": 0,
        "priority_alarms": [],
        "first_triggered_tag": None,
        "first_triggered_label": None,
        "reduction_pct": 0.0,
        "root_cause": {
            "fault_id": 0,
            "name": "Normal",
            "equipment_unit": "Process-wide",
            "severity_level": "NORMAL",
            "confidence": 0.95,
            "summary": "Normal operating condition.",
        },
        "top_causes": [
            {
                "fault_id": 0,
                "name": "Normal",
                "unit": "Process-wide",
                "probability": 0.95,
            }
        ],
        "shap_evidence": [],
        "causal_links": [],
        "recommended_actions": [
            "Continue routine monitoring."
        ],
        "latency_ms": 12.5,
    }


# ---------------------------------------------------------------------
# Health endpoint
# ---------------------------------------------------------------------

def test_health_returns_ok_when_predictor_is_loaded(client):
    response = client.get("/api/v1/health")

    assert response.status_code == 200

    data = response.json()

    assert data["status"] == "ok"
    assert data["model_loaded"] is True
    assert data["simulation_ready"] is False
    assert data["active_plant_id"] == "tep"
    assert data["supported_faults"] == len(TARGET_FAULTS)
    assert data["fault_ids"] == TARGET_FAULTS


def test_health_reports_simulation_ready_when_episodes_loaded(api_app):
    episode = pd.DataFrame(
        {
            sensor: np.ones(DEFAULT_WINDOW_SIZE)
            for sensor in SENSOR_COLS
        }
    )
    episode["STATUS"] = 1
    episode["episode_id"] = 10

    api_app.state.test_episodes_by_fault = {1: [episode]}

    with TestClient(api_app) as test_client:
        response = test_client.get("/api/v1/health")

    assert response.status_code == 200
    assert response.json()["simulation_ready"] is True


def test_health_returns_degraded_without_predictor(api_app):
    api_app.state.predictor = None

    with TestClient(api_app) as test_client:
        response = test_client.get("/api/v1/health")

    assert response.status_code == 200

    data = response.json()

    assert data["status"] == "degraded"
    assert data["model_loaded"] is False
    assert data["simulation_ready"] is False
    assert data["active_plant_id"] == "tep"


def test_lifespan_starts_gracefully_without_parquet(tmp_path, monkeypatch):
    from app import main

    monkeypatch.setattr(main, "PredictorService", FakePredictor)
    monkeypatch.setattr(
        main,
        "PARQUET_PATH",
        str(tmp_path / "missing_tep_3years.parquet"),
    )

    application = main.create_app()

    with TestClient(application) as test_client:
        health_response = test_client.get("/api/v1/health")
        sim_response = test_client.post("/api/v1/simulate/1")

    assert health_response.status_code == 200
    health_data = health_response.json()
    assert health_data["status"] == "ok"
    assert health_data["model_loaded"] is True
    assert health_data["simulation_ready"] is False

    assert sim_response.status_code == 503
    assert "simulation" in sim_response.json()["detail"].lower()


# ---------------------------------------------------------------------
# Fault catalog endpoint
# ---------------------------------------------------------------------

def test_fault_catalog_returns_all_supported_faults(client):
    response = client.get("/api/v1/faults")

    assert response.status_code == 200

    data = response.json()

    assert data["total"] == len(TARGET_FAULTS)
    assert len(data["faults"]) == len(TARGET_FAULTS)

    returned_ids = [fault["fault_id"] for fault in data["faults"]]

    assert returned_ids == TARGET_FAULTS


def test_fault_catalog_contains_playbook_information(client):
    response = client.get("/api/v1/faults")

    assert response.status_code == 200

    for fault in response.json()["faults"]:
        assert fault["name"]
        assert fault["unit"]
        assert fault["description"]
        assert fault["equipment_unit"]
        assert fault["severity_level"]
        assert fault["summary"]
        assert isinstance(fault["recommended_actions"], list)
        assert len(fault["recommended_actions"]) > 0


# ---------------------------------------------------------------------
# Analyze endpoint
# ---------------------------------------------------------------------

def test_analyze_accepts_valid_sensor_window(
    client, monkeypatch
):
    from app import routes

    monkeypatch.setattr(
        routes,
        "_run_full_analysis",
        lambda window_df, predictor: make_analysis_result(),
    )

    response = client.post(
        "/api/v1/analyze",
        json={"window": make_sensor_window()},
    )

    assert response.status_code == 200

    data = response.json()

    assert data["root_cause"]["fault_id"] == 0
    assert data["root_cause"]["name"] == "Normal"
    assert data["raw_alarm_count"] == 0
    assert data["confirmed_alarm_count"] == 0
    assert isinstance(data["priority_alarms"], list)
    assert isinstance(data["top_causes"], list)
    assert isinstance(data["shap_evidence"], list)
    assert isinstance(data["causal_links"], list)
    assert isinstance(data["recommended_actions"], list)


def test_analyze_accepts_direct_list_payload(
    client, monkeypatch
):
    from app import routes

    monkeypatch.setattr(
        routes,
        "_run_full_analysis",
        lambda window_df, predictor: make_analysis_result(),
    )

    response = client.post(
        "/api/v1/analyze",
        json=make_sensor_window(),
    )

    assert response.status_code == 200


def test_analyze_rejects_window_smaller_than_required(
    client,
):
    short_window = make_sensor_window(
        rows=DEFAULT_WINDOW_SIZE - 1
    )

    response = client.post(
        "/api/v1/analyze",
        json={"window": short_window},
    )

    assert response.status_code == 422
    assert "at least" in response.json()["detail"]


def test_analyze_rejects_missing_sensor_column(client):
    window = make_sensor_window()

    for row in window:
        row.pop("XMEAS(1)")

    response = client.post(
        "/api/v1/analyze",
        json={"window": window},
    )

    assert response.status_code == 422
    assert "missing" in response.json()["detail"].lower()


def test_analyze_returns_503_without_predictor(api_app):
    api_app.state.predictor = None

    with TestClient(api_app) as test_client:
        response = test_client.post(
            "/api/v1/analyze",
            json={"window": make_sensor_window()},
        )

    assert response.status_code == 503
    assert "not initialized" in response.json()["detail"]


def test_analyze_rejects_unexpected_request_fields(client):
    payload = {
        "window": make_sensor_window(),
        "unexpected_field": "not allowed",
    }

    response = client.post(
        "/api/v1/analyze",
        json=payload,
    )

    assert response.status_code == 422


def test_analyze_rejects_non_finite_values(client):
    import json

    window = make_sensor_window()
    window[0][SENSOR_COLS[0]] = 1e39

    inf_response = client.post(
        "/api/v1/analyze",
        json={"window": window},
    )

    assert inf_response.status_code == 422
    assert "non-finite" in inf_response.json()["detail"].lower()

    nan_window = make_sensor_window()
    nan_window[0][SENSOR_COLS[0]] = float("nan")
    raw_nan_payload = json.dumps({"window": nan_window}, allow_nan=True)

    nan_response = client.post(
        "/api/v1/analyze",
        content=raw_nan_payload,
        headers={"Content-Type": "application/json"},
    )

    assert nan_response.status_code == 422


# ---------------------------------------------------------------------
# Simulation endpoint
# ---------------------------------------------------------------------

def test_simulate_rejects_unsupported_fault_id(client):
    response = client.post("/api/v1/simulate/999")

    assert response.status_code == 404
    assert "Unsupported fault_id" in response.json()["detail"]


def test_simulate_returns_503_without_predictor(api_app):
    api_app.state.predictor = None

    with TestClient(api_app) as test_client:
        response = test_client.post("/api/v1/simulate/1")

    assert response.status_code == 503


def test_simulate_returns_503_when_simulation_not_ready(client):
    response = client.post("/api/v1/simulate/1")

    assert response.status_code == 503
    assert "simulation" in response.json()["detail"].lower()


def test_simulate_rejects_missing_test_episodes(client, api_app):
    episode = pd.DataFrame(
        {
            sensor: np.ones(DEFAULT_WINDOW_SIZE)
            for sensor in SENSOR_COLS
        }
    )
    episode["STATUS"] = 0
    episode["episode_id"] = 9

    api_app.state.test_episodes_by_fault = {0: [episode]}

    response = client.post("/api/v1/simulate/1")

    assert response.status_code == 422
    assert "No test episodes available" in response.json()["detail"]


def test_simulate_rejects_out_of_range_episode_index(
    client, api_app
):
    episode = pd.DataFrame(
        {
            sensor: np.ones(DEFAULT_WINDOW_SIZE)
            for sensor in SENSOR_COLS
        }
    )
    episode["STATUS"] = 1
    episode["episode_id"] = 10

    api_app.state.test_episodes_by_fault = {
        1: [episode]
    }

    response = client.post(
        "/api/v1/simulate/1?episode_index=5"
    )

    assert response.status_code == 422
    assert "out of range" in response.json()["detail"]


def test_simulate_returns_diagnosis_for_valid_episode(
    client, api_app, monkeypatch
):
    from app import routes

    episode = pd.DataFrame(
        {
            sensor: np.full(DEFAULT_WINDOW_SIZE, 100.0)
            for sensor in SENSOR_COLS
        }
    )
    episode["STATUS"] = 1
    episode["episode_id"] = 10

    api_app.state.test_episodes_by_fault = {
        1: [episode]
    }

    monkeypatch.setattr(
        routes,
        "_run_full_analysis",
        lambda window_df, predictor: make_analysis_result(),
    )

    response = client.post("/api/v1/simulate/1")

    assert response.status_code == 200

    data = response.json()

    assert data["simulated_fault_id"] == 1
    assert data["episode_id"] == 10
    assert data["window_size"] == DEFAULT_WINDOW_SIZE
    assert data["episode_total_steps"] == DEFAULT_WINDOW_SIZE
    assert data["available_episodes"] == 1
    assert len(data["alarm_trend"]) == DEFAULT_WINDOW_SIZE
    assert isinstance(data["sensor_trends"], dict)


def test_simulate_rejects_invalid_window_size(client):
    response = client.post(
        "/api/v1/simulate/1?window_size=10"
    )

    assert response.status_code == 422


# ---------------------------------------------------------------------
# Plant management endpoints
# ---------------------------------------------------------------------

def test_list_plants_returns_empty_list_when_artifacts_missing(
    client,
):
    response = client.get("/api/v1/plants")

    assert response.status_code == 200

    data = response.json()

    assert data["active_plant_id"] == "tep"
    assert data["plants"] == []


def test_list_plants_requires_predictor(api_app):
    api_app.state.predictor = None

    with TestClient(api_app) as test_client:
        response = test_client.get("/api/v1/plants")

    assert response.status_code == 503


def test_activate_plant_returns_404_when_artifacts_missing(
    client,
):
    response = client.post(
        "/api/v1/plants/unknown-plant/activate"
    )

    assert response.status_code == 404
    assert "not found" in response.json()["detail"].lower()


def test_activate_plant_rejects_invalid_plant_id(client):
    response = client.post(
        "/api/v1/plants/invalid@plant/activate"
    )

    assert response.status_code == 422


def test_activate_reserved_tep_id_uses_builtin_artifacts(
    client,
):
    response = client.post("/api/v1/plants/tep/activate")

    # The isolated test app has no trained TEP artifact files.
    assert response.status_code == 404


def test_retrain_rejects_empty_csv_upload(client):
    response = client.post(
        "/api/v1/plants/retrain",
        data={"plant_id": "test-plant"},
        files={
            "file": (
                "empty.csv",
                b"",
                "text/csv",
            )
        },
    )

    assert response.status_code == 422
    assert "empty" in response.json()["detail"].lower()


def test_retrain_rejects_invalid_plant_id(client):
    response = client.post(
        "/api/v1/plants/retrain",
        data={"plant_id": "invalid@plant"},
        files={
            "file": (
                "plant.csv",
                b"STATUS,A,B\n0,1,2\n1,3,4\n",
                "text/csv",
            )
        },
    )

    assert response.status_code == 422
    assert "Invalid plant_id" in response.json()["detail"]


def test_retrain_returns_relative_artifacts_dir(
    client, monkeypatch, tmp_path
):
    from app import routes

    host_artifacts_dir = str(tmp_path / "plants" / "custom_unit")

    def fake_train_custom_plant_csv(**kwargs):
        return {
            "plant_id": "custom_unit",
            "plant_name": "Custom Unit",
            "n_sensors": 2,
            "sensor_cols": ["SENSOR_A", "SENSOR_B"],
            "classes": [0, 1],
            "train_windows": 4,
            "validation_windows": 2,
            "test_windows": 2,
            "sample_accuracy": 1.0,
            "sample_macro_f1": 1.0,
            "train_time_sec": 0.1,
            "artifacts_dir": host_artifacts_dir,
        }

    monkeypatch.setattr(
        routes,
        "train_custom_plant_csv",
        fake_train_custom_plant_csv,
    )
    monkeypatch.setattr(
        routes,
        "PredictorService",
        lambda artifacts_dir: FakePredictor(),
    )

    response = client.post(
        "/api/v1/plants/retrain",
        data={"plant_id": "custom_unit", "activate": "true"},
        files={
            "file": (
                "plant.csv",
                b"STATUS,SENSOR_A,SENSOR_B\n0,1,2\n1,3,4\n",
                "text/csv",
            )
        },
    )

    assert response.status_code == 201
    data = response.json()
    assert data["status"] == "trained"
    assert data["activated"] is True
    assert data["artifacts_dir"] == "plants/custom_unit"


# ---------------------------------------------------------------------
# Operator feedback endpoints
# ---------------------------------------------------------------------

def test_feedback_summary_is_empty_initially(client):
    response = client.get("/api/v1/feedback/summary")

    assert response.status_code == 200

    data = response.json()

    assert data["total_feedback_count"] == 0
    assert data["confirmed_count"] == 0
    assert data["rejected_count"] == 0
    assert data["recent_entries"] == []


def test_record_confirm_feedback(client):
    response = client.post(
        "/api/v1/feedback",
        json={
            "fault_id": 1,
            "episode_id": 10,
            "step_index": 20,
            "action": "confirm",
            "notes": "Diagnosis confirmed by operator.",
        },
    )

    assert response.status_code == 201

    data = response.json()

    assert data["status"] == "recorded"
    assert data["total_feedback_count"] == 1
    assert data["confirmed_count"] == 1
    assert data["rejected_count"] == 0
    assert data["timestamp"]


def test_record_reject_feedback(client):
    response = client.post(
        "/api/v1/feedback",
        json={
            "fault_id": 1,
            "action": "reject",
            "corrected_fault_id": 2,
            "notes": "Operator identified a different fault.",
        },
    )

    assert response.status_code == 201

    data = response.json()

    assert data["status"] == "recorded"
    assert data["total_feedback_count"] == 1
    assert data["confirmed_count"] == 0
    assert data["rejected_count"] == 1


def test_feedback_summary_updates_after_submissions(client):
    client.post(
        "/api/v1/feedback",
        json={"fault_id": 1, "action": "confirm"},
    )

    client.post(
        "/api/v1/feedback",
        json={"fault_id": 2, "action": "reject"},
    )

    response = client.get("/api/v1/feedback/summary")

    assert response.status_code == 200

    data = response.json()

    assert data["total_feedback_count"] == 2
    assert data["confirmed_count"] == 1
    assert data["rejected_count"] == 1
    assert len(data["recent_entries"]) == 2


def test_feedback_rejects_unsupported_fault_id(client):
    response = client.post(
        "/api/v1/feedback",
        json={
            "fault_id": 999,
            "action": "confirm",
        },
    )

    assert response.status_code == 422


def test_feedback_rejects_unsupported_corrected_fault_id(
    client,
):
    response = client.post(
        "/api/v1/feedback",
        json={
            "fault_id": 1,
            "action": "reject",
            "corrected_fault_id": 999,
        },
    )

    assert response.status_code == 422


def test_feedback_rejects_invalid_action(client):
    response = client.post(
        "/api/v1/feedback",
        json={
            "fault_id": 1,
            "action": "maybe",
        },
    )

    assert response.status_code == 422


def test_feedback_rejects_negative_step_index(client):
    response = client.post(
        "/api/v1/feedback",
        json={
            "fault_id": 1,
            "action": "confirm",
            "step_index": -1,
        },
    )

    assert response.status_code == 422


def test_feedback_rejects_notes_longer_than_500_characters(
    client,
):
    response = client.post(
        "/api/v1/feedback",
        json={
            "fault_id": 1,
            "action": "confirm",
            "notes": "x" * 501,
        },
    )

    assert response.status_code == 422


def test_feedback_rejects_unexpected_fields(client):
    response = client.post(
        "/api/v1/feedback",
        json={
            "fault_id": 1,
            "action": "confirm",
            "extra_field": "not allowed",
        },
    )

    assert response.status_code == 422


def test_feedback_log_is_written_to_configured_path(
    client, api_app
):
    client.post(
        "/api/v1/feedback",
        json={
            "fault_id": 1,
            "action": "confirm",
        },
    )

    log_path = Path(api_app.state.feedback_log_path)

    assert log_path.is_file()

    entries = [
        line
        for line in log_path.read_text(encoding="utf-8").splitlines()
        if line.strip()
    ]

    assert len(entries) == 1


def test_feedback_accepts_custom_plant_classes_and_logs_name(
    client, api_app
):
    import json

    custom_predictor = FakePredictor()
    custom_predictor.plant_id = "custom_unit"
    custom_predictor.plant_name = "Custom Unit"
    custom_predictor.classes = [0, 3, 5]
    custom_predictor.fault_names = {
        0: "Normal",
        3: "Bearing Wear",
        5: "Seal Leak",
    }
    api_app.state.predictor = custom_predictor

    ok_response = client.post(
        "/api/v1/feedback",
        json={
            "fault_id": 3,
            "action": "reject",
            "corrected_fault_id": 5,
            "notes": "Custom plant bearing fault",
        },
    )

    assert ok_response.status_code == 201
    assert ok_response.json()["total_feedback_count"] == 1

    log_path = Path(api_app.state.feedback_log_path)
    logged = json.loads(
        log_path.read_text(encoding="utf-8").splitlines()[0]
    )
    assert logged["fault_id"] == 3
    assert logged["fault_name"] == "Bearing Wear"
    assert logged["corrected_fault_id"] == 5

    invalid_response = client.post(
        "/api/v1/feedback",
        json={
            "fault_id": 6,
            "action": "confirm",
        },
    )

    assert invalid_response.status_code == 422
