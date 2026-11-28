"""Tests for simulations API routes (guide Section 4 & 6)."""
import pytest
from fastapi.testclient import TestClient
from apps.api.aftershock_api.main import app

client = TestClient(app)


def test_status_endpoint():
    response = client.get("/api/status")
    assert response.status_code == 200
    data = response.json()
    assert data["status"] == "ok"
    assert "simulations" in data


def test_city_assets_geojson():
    response = client.get("/api/assets/city")
    assert response.status_code == 200
    data = response.json()
    assert "buildings" in data
    assert "roads" in data
    assert len(data["buildings"]) == 10
    assert len(data["roads"]) == 6
    assert data["buildings"][0]["geom"]["type"] == "Polygon"
    assert data["roads"][0]["geom"]["type"] == "LineString"


def test_trigger_flood_simulation():
    payload = {
        "area": "river",
        "water_height": 4.5,
        "grid_size": 20,
        "max_steps": 5,
    }
    response = client.post("/api/simulations/flood", json=payload)
    assert response.status_code == 200
    data = response.json()
    assert data["status"] == "started"
    assert "FLOOD-" in data["sim_id"]


def test_trigger_traffic_simulation():
    payload = {
        "vehicle_count": 30,
        "steps": 10,
        "peak_hour": True,
    }
    response = client.post("/api/simulations/traffic", json=payload)
    assert response.status_code == 200
    data = response.json()
    assert data["status"] == "started"
    assert "TRAFFIC-" in data["sim_id"]
