"""Integration tests for FastAPI endpoints."""
import pytest
from fastapi.testclient import TestClient
from apps.api.aftershock_api.main import app

client = TestClient(app)


def test_health_and_ready():
    r_health = client.get("/health")
    assert r_health.status_code == 200
    assert r_health.json()["status"] == "ok"

    r_ready = client.get("/ready")
    assert r_ready.status_code == 200
    assert r_ready.json()["status"] == "ready"
    assert r_ready.json()["districts_count"] >= 2


def test_projects_and_graph():
    r = client.get("/api/v1/projects")
    assert r.status_code == 200
    projects = r.json()
    p_ids = [p["project_id"] for p in projects]
    assert "DISTRICT-V1" in p_ids
    assert "DISTRICT-MINI-V1" in p_ids

    # Check graph
    r_graph = client.get("/api/v1/projects/DISTRICT-V1/graph")
    assert r_graph.status_code == 200
    graph_data = r_graph.json()
    assert len(graph_data["nodes"]) >= 34
    assert len(graph_data["edges"]) >= 50


def test_run_lifecycle_and_stepping():
    r_create = client.post(
        "/api/v1/runs",
        json={"project_id": "DISTRICT-MINI-V1", "scenario_id": "SCENARIO-MINI-01", "seed": 1947},
    )
    assert r_create.status_code == 200
    run_id = r_create.json()["run_id"]

    # Step single tick
    r_step = client.post(f"/api/v1/runs/{run_id}/step")
    assert r_step.status_code == 200
    step_info = r_step.json()
    assert step_info["tick"] == 1
    assert "P-01" in step_info["assets"]

    # Check events
    r_events = client.get(f"/api/v1/runs/{run_id}/events")
    assert r_events.status_code == 200


def test_optimization_defence():
    r = client.post(
        "/api/v1/optimization/defence",
        json={
            "project_id": "DISTRICT-V1",
            "resources": {
                "budget_units": 10,
                "mobile_generators": 2,
                "temporary_pumps": 1,
                "repair_crews": 1,
            },
        },
    )
    assert r.status_code == 200
    data = r.json()
    assert data["solver"] == "CP-SAT"
    assert data["solver_status"] in ("OPTIMAL", "FEASIBLE")
    assert len(data["selected_actions"]) > 0


def test_paired_comparison():
    r = client.post(
        "/api/v1/comparisons",
        json={
            "project_id": "DISTRICT-V1",
            "scenario_id": "FLOOD-BASE-01",
            "seed": 1947,
            "interventions": [
                {
                    "intervention_id": "INT-PROT-P01",
                    "type": "protect_asset",
                    "target_asset_id": "P-01",
                    "start_tick": 0,
                    "duration_ticks": 60,
                    "resource_cost": 3,
                    "effect": {"protection_factor": 0.5},
                }
            ],
        },
    )
    assert r.status_code == 200
    data = r.json()
    assert "comparison" in data
    assert "baseline_metrics" in data
    assert "intervention_metrics" in data
    assert "absolute_nwsl_improvement" in data["comparison"]
