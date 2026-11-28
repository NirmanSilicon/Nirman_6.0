"""Integration tests for FastAPI REST API endpoints."""

import pytest
from datetime import datetime, timedelta


@pytest.mark.asyncio
async def test_health_endpoint(async_client):
    response = await async_client.get("/api/v1/health")
    assert response.status_code == 200
    data = response.json()
    assert data["status"] == "healthy"
    assert data["version"] == "0.1.0"


@pytest.mark.asyncio
async def test_telemetry_ingest_endpoint(async_client):
    payload = {
        "asset_id": "grid_sensor_01",
        "metric": "carbon_intensity",
        "value": 420.5,
        "unit": "gCO2/kWh",
    }
    response = await async_client.post("/api/v1/telemetry", json=payload)
    assert response.status_code == 200
    data = response.json()
    assert data["status"] == "ingested"
    assert data["value"] == 420.5


@pytest.mark.asyncio
async def test_workorder_creation_endpoint(async_client):
    payload = {
        "order_id": "WO-API-99",
        "machine_id": "CNC_MILL_5AXIS_01",
        "part_type": "Titanium_Rotor",
        "duration_minutes": 75,
        "deadline_utc": (datetime.utcnow() + timedelta(hours=3)).isoformat(),
        "nominal_power_kw": 45.0,
    }
    response = await async_client.post("/api/v1/workorders", json=payload)
    assert response.status_code == 200
    assert response.json()["order_id"] == "WO-API-99"


@pytest.mark.asyncio
async def test_orchestrator_tick_and_status_endpoints(async_client):
    # Trigger tick
    tick_res = await async_client.post("/api/v1/orchestrator/tick", json={})
    assert tick_res.status_code == 200
    tick_data = tick_res.json()
    assert "tick_id" in tick_data
    assert "rewards" in tick_data

    # Query status
    status_res = await async_client.get("/api/v1/orchestrator/status")
    assert status_res.status_code == 200
    status_data = status_res.json()
    assert "telemetry" in status_data
    assert "kpis" in status_data


@pytest.mark.asyncio
async def test_mode_switch_and_overrides_endpoints(async_client):
    # Switch mode to live_pilot
    mode_res = await async_client.post("/api/v1/orchestrator/mode", json={"mode": "live_pilot"})
    assert mode_res.status_code == 200
    assert mode_res.json()["mode"] == "live_pilot"

    # Set override
    override_res = await async_client.post(
        "/api/v1/orchestrator/override",
        json={
            "asset_id": "bess",
            "setpoints": {"bess_charge_discharge_kw": 50.0},
            "notes": "Testing API override",
        },
    )
    assert override_res.status_code == 200

    # Clear override
    del_res = await async_client.delete("/api/v1/orchestrator/override/bess")
    assert del_res.status_code == 200

    # Query metrics summary
    metrics_res = await async_client.get("/api/v1/metrics/summary")
    assert metrics_res.status_code == 200
    assert "kpis" in metrics_res.json()
