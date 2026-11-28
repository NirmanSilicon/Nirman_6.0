"""Integration tests for the AlarmSense FastAPI backend (/api/v1)."""

from collections.abc import Iterator
from fastapi.testclient import TestClient
import pytest

from app.config import DEFAULT_WINDOW_SIZE, SENSOR_COLS, TARGET_FAULTS
from app.main import app


@pytest.fixture(scope="module")
def client() -> Iterator[TestClient]:
    """Module-scoped FastAPI TestClient running full startup/shutdown lifespan."""
    with TestClient(app) as test_client:
        yield test_client


def _assert_valid_diagnosis_payload(data: dict) -> None:
    """Validate common AnalyzeResponse fields and latency budget."""
    expected_keys = {
        "raw_alarm_count",
        "confirmed_alarm_count",
        "priority_alarms",
        "first_triggered_tag",
        "first_triggered_label",
        "reduction_pct",
        "root_cause",
        "top_causes",
        "shap_evidence",
        "causal_links",
        "recommended_actions",
        "latency_ms",
    }
    assert expected_keys.issubset(data.keys())
    assert isinstance(data["raw_alarm_count"], int)
    assert isinstance(data["confirmed_alarm_count"], int)
    assert isinstance(data["priority_alarms"], list)
    assert len(data["priority_alarms"]) <= 5
    assert isinstance(data["reduction_pct"], float)

    root_cause = data["root_cause"]
    assert root_cause["fault_id"] in TARGET_FAULTS
    assert 0.0 <= root_cause["confidence"] <= 1.0
    assert root_cause["equipment_unit"]
    assert root_cause["severity_level"]
    assert root_cause["summary"]

    assert len(data["top_causes"]) == 3
    assert len(data["shap_evidence"]) == 3
    for ev in data["shap_evidence"]:
        assert ev["sensor"] in SENSOR_COLS
        assert ev["label"]
        assert ev["unit"]
        assert ev["impact_direction"] in ("positive", "negative")

    assert isinstance(data["causal_links"], list)
    assert len(data["causal_links"]) <= 5
    for link in data["causal_links"]:
        assert link["source"] in SENSOR_COLS
        assert link["source_label"]
        assert link["target"] in SENSOR_COLS
        assert link["target_label"]
        assert link["source"] != link["target"]
        assert link["best_lag_steps"] >= 1
        assert 0.0 <= link["strength"] <= 1.0
        assert link["method"] in ("granger+corr", "lag_corr")
        assert link["explanation"]
        assert link["source_label"] in link["explanation"]
        assert link["target_label"] in link["explanation"]

    assert 3 <= len(data["recommended_actions"]) <= 4
    assert data["latency_ms"] < 100.0, f"Inference latency {data['latency_ms']}ms exceeded 100ms"


def test_health_endpoint(client: TestClient) -> None:
    """Verify GET /api/v1/health reports model loaded and 12 supported states."""
    response = client.get("/api/v1/health")
    assert response.status_code == 200
    data = response.json()

    assert data["status"] == "ok"
    assert data["model_loaded"] is True
    assert data["supported_faults"] == len(TARGET_FAULTS) == 12
    assert set(data["fault_ids"]) == set(TARGET_FAULTS)


def test_faults_catalog_endpoint(client: TestClient) -> None:
    """Verify GET /api/v1/faults returns metadata and playbooks for all 12 classes."""
    response = client.get("/api/v1/faults")
    assert response.status_code == 200
    data = response.json()

    assert data["total"] == len(TARGET_FAULTS) == 12
    returned_ids = {item["fault_id"] for item in data["faults"]}
    assert returned_ids == set(TARGET_FAULTS)

    for item in data["faults"]:
        assert item["name"]
        assert item["equipment_unit"]
        assert item["severity_level"]
        assert item["summary"]
        assert 3 <= len(item["recommended_actions"]) <= 4


@pytest.mark.parametrize("fault_id", [6, 4])
def test_simulate_fault_endpoints(client: TestClient, fault_id: int) -> None:
    """Verify POST /api/v1/simulate/{fault_id} returns accurate diagnosis and <100ms latency."""
    response = client.post(f"/api/v1/simulate/{fault_id}")
    assert response.status_code == 200
    data = response.json()

    _assert_valid_diagnosis_payload(data)
    assert data["simulated_fault_id"] == fault_id
    assert data["root_cause"]["fault_id"] == fault_id
    assert data["raw_alarm_count"] > 0
    assert data["confirmed_alarm_count"] > 0
    assert data["reduction_pct"] > 0.0
    assert data["first_triggered_tag"] is not None
    assert data["first_triggered_label"]
    assert data["priority_alarms"][0]["label"]
    assert data["priority_alarms"][0]["unit"]
    assert data["shap_evidence"][0]["label"]
    assert data["shap_evidence"][0]["unit"]
    if data["causal_links"]:
        assert data["causal_links"][0]["source_label"]
        assert data["causal_links"][0]["target_label"]
    assert data["window_size"] == DEFAULT_WINDOW_SIZE
    assert len(data["sensor_trends"]) >= 1
    for series in data["sensor_trends"].values():
        assert len(series) == DEFAULT_WINDOW_SIZE


def test_simulate_with_query_and_body_options(client: TestClient) -> None:
    """Verify simulate accepts optional query parameters and JSON body."""
    res_query = client.post("/api/v1/simulate/4?step_index=5&window_size=25")
    assert res_query.status_code == 200
    assert res_query.json()["step_index"] == 5
    assert res_query.json()["window_size"] == 25

    res_body = client.post("/api/v1/simulate/6", json={"step_index": 3, "window_size": 20})
    assert res_body.status_code == 200
    assert res_body.json()["step_index"] == 3
    assert res_body.json()["window_size"] == 20

    res_404 = client.post("/api/v1/simulate/999")
    assert res_404.status_code == 404


def test_simulate_normal_to_fault_transition_replay(client: TestClient) -> None:
    """Verify pre_fault_steps prepends Normal data and transitions into Fault 6 at onset."""
    # Pre-fault Normal phase: step_index=0, window_size=20 -> window [0:20] before onset=20
    res_pre = client.post(
        "/api/v1/simulate/6?pre_fault_steps=20&step_index=0&window_size=20"
    )
    assert res_pre.status_code == 200
    pre_data = res_pre.json()
    _assert_valid_diagnosis_payload(pre_data)
    assert pre_data["in_fault_regime"] is False
    assert pre_data["fault_onset_step"] == 20
    assert pre_data["onset_offset_in_window"] is None
    assert pre_data["root_cause"]["fault_id"] == 0
    assert len(pre_data["alarm_trend"]) == 20
    assert max(pre_data["alarm_trend"]) <= 1

    # Straddling onset phase: step_index=10, window_size=20 -> window [10:30], onset at index 10
    res_mid = client.post(
        "/api/v1/simulate/6?pre_fault_steps=20&step_index=10&window_size=20"
    )
    assert res_mid.status_code == 200
    mid_data = res_mid.json()
    _assert_valid_diagnosis_payload(mid_data)
    assert mid_data["in_fault_regime"] is True
    assert mid_data["fault_onset_step"] == 20
    assert mid_data["onset_offset_in_window"] == 10
    assert len(mid_data["alarm_trend"]) == 20
    # Pre-onset steps [0..9] are quiet; post-onset steps [10..19] spike
    assert sum(mid_data["alarm_trend"][:10]) <= 2
    assert max(mid_data["alarm_trend"][10:]) > 0

    # Fault regime phase: step_index=20, window_size=20 -> window [20:40] after onset=20
    res_fault = client.post(
        "/api/v1/simulate/6?pre_fault_steps=20&step_index=20&window_size=20"
    )
    assert res_fault.status_code == 200
    fault_data = res_fault.json()
    _assert_valid_diagnosis_payload(fault_data)
    assert fault_data["in_fault_regime"] is True
    assert fault_data["fault_onset_step"] == 20
    assert fault_data["onset_offset_in_window"] == 0
    assert fault_data["root_cause"]["fault_id"] == 6
    assert fault_data["episode_total_steps"] == pre_data["episode_total_steps"]
    assert len(fault_data["alarm_trend"]) == 20
    assert max(fault_data["alarm_trend"]) > 0


def test_simulate_smooth_steps_probability_averaging(client: TestClient) -> None:
    """Verify smooth_steps=3 returns 200 with valid probabilities and latency < 100ms."""
    res = client.post(
        "/api/v1/simulate/6?pre_fault_steps=20&step_index=22&window_size=20&smooth_steps=3"
    )
    assert res.status_code == 200
    data = res.json()
    _assert_valid_diagnosis_payload(data)
    assert data["root_cause"]["fault_id"] == 6
    assert 0.0 <= data["root_cause"]["confidence"] <= 1.0
    total_top_prob = sum(c["probability"] for c in data["top_causes"])
    assert 0.0 <= total_top_prob <= 1.0005
    assert data["latency_ms"] < 100.0


def test_simulate_episode_index_selection_and_bounds(client: TestClient) -> None:
    """Verify episode_index selects distinct test episodes and rejects out-of-range index."""
    res_ep0 = client.post("/api/v1/simulate/6?episode_index=0")
    assert res_ep0.status_code == 200
    ep0_data = res_ep0.json()
    assert ep0_data["available_episodes"] >= 2

    res_ep1 = client.post("/api/v1/simulate/6?episode_index=1")
    assert res_ep1.status_code == 200
    ep1_data = res_ep1.json()
    assert ep1_data["episode_id"] != ep0_data["episode_id"]

    res_oob = client.post("/api/v1/simulate/6?episode_index=999")
    assert res_oob.status_code == 422


def test_analyze_endpoint_wrapped_and_raw_list(client: TestClient) -> None:
    """Verify POST /api/v1/analyze supports both {'window': [...]} and raw list payloads."""
    ep_df = app.state.test_episodes_by_fault[6][0]
    rows = ep_df.iloc[:DEFAULT_WINDOW_SIZE][SENSOR_COLS].astype(float).to_dict(orient="records")

    # 1. Wrapped AnalyzeRequest payload
    res_wrapped = client.post("/api/v1/analyze", json={"window": rows})
    assert res_wrapped.status_code == 200
    data_wrapped = res_wrapped.json()
    _assert_valid_diagnosis_payload(data_wrapped)
    assert data_wrapped["root_cause"]["fault_id"] == 6

    # 2. Raw list[dict[str, float]] payload
    res_raw = client.post("/api/v1/analyze", json=rows)
    assert res_raw.status_code == 200
    data_raw = res_raw.json()
    _assert_valid_diagnosis_payload(data_raw)
    assert data_raw["root_cause"]["fault_id"] == 6


def test_analyze_validation_errors(client: TestClient) -> None:
    """Verify POST /api/v1/analyze rejects short windows and missing sensor columns."""
    ep_df = app.state.test_episodes_by_fault[0][0]
    short_rows = ep_df.iloc[:10][SENSOR_COLS].astype(float).to_dict(orient="records")
    res_short = client.post("/api/v1/analyze", json={"window": short_rows})
    assert res_short.status_code == 422

    # Missing a sensor column
    incomplete_rows = ep_df.iloc[:20][SENSOR_COLS[:-1]].astype(float).to_dict(orient="records")
    res_incomplete = client.post("/api/v1/analyze", json={"window": incomplete_rows})
    assert res_incomplete.status_code == 422


def test_feedback_endpoints_and_validation(
    client: TestClient,
    tmp_path,
    monkeypatch: pytest.MonkeyPatch,
) -> None:
    """Verify POST /api/v1/feedback and GET /api/v1/feedback/summary using tmp_path."""
    tmp_log = tmp_path / "feedback.jsonl"
    monkeypatch.setattr(app.state, "feedback_log_path", tmp_log)

    # Empty summary before any entries exist
    res_empty = client.get("/api/v1/feedback/summary")
    assert res_empty.status_code == 200
    assert res_empty.json() == {
        "total_feedback_count": 0,
        "confirmed_count": 0,
        "rejected_count": 0,
        "recent_entries": [],
    }

    # 1. Confirm diagnosis
    res_confirm = client.post(
        "/api/v1/feedback",
        json={
            "fault_id": 6,
            "episode_id": 184,
            "step_index": 20,
            "action": "confirm",
            "notes": "Verified Stream 1 flow drop and valve saturation.",
        },
    )
    assert res_confirm.status_code == 201
    confirm_data = res_confirm.json()
    assert confirm_data["status"] == "recorded"
    assert confirm_data["timestamp"]
    assert confirm_data["total_feedback_count"] == 1
    assert confirm_data["confirmed_count"] == 1
    assert confirm_data["rejected_count"] == 0

    # 2. Reject diagnosis with corrected_fault_id
    res_reject = client.post(
        "/api/v1/feedback",
        json={
            "fault_id": 8,
            "episode_id": 184,
            "step_index": 10,
            "action": "reject",
            "corrected_fault_id": 6,
            "notes": "Early onset window was actually Fault 6.",
        },
    )
    assert res_reject.status_code == 201
    reject_data = res_reject.json()
    assert reject_data["status"] == "recorded"
    assert reject_data["total_feedback_count"] == 2
    assert reject_data["confirmed_count"] == 1
    assert reject_data["rejected_count"] == 1

    # 3. Invalid fault_id and corrected_fault_id rejected with 422
    res_bad_fault = client.post(
        "/api/v1/feedback",
        json={"fault_id": 999, "action": "confirm"},
    )
    assert res_bad_fault.status_code == 422

    res_bad_corr = client.post(
        "/api/v1/feedback",
        json={"fault_id": 6, "action": "reject", "corrected_fault_id": 999},
    )
    assert res_bad_corr.status_code == 422

    # 4. Summary reflects accurate counts and recent entries
    res_summary = client.get("/api/v1/feedback/summary")
    assert res_summary.status_code == 200
    summary_data = res_summary.json()
    assert summary_data["total_feedback_count"] == 2
    assert summary_data["confirmed_count"] == 1
    assert summary_data["rejected_count"] == 1
    assert len(summary_data["recent_entries"]) == 2
    assert summary_data["recent_entries"][0]["fault_name"] == "A Feed Loss"
    assert summary_data["recent_entries"][1]["corrected_fault_id"] == 6


def test_cors_headers_on_health(client: TestClient) -> None:
    """Verify CORS headers are returned when Origin is provided."""
    res = client.get("/api/v1/health", headers={"Origin": "http://localhost:8501"})
    assert res.status_code == 200
    assert "access-control-allow-origin" in res.headers
