from __future__ import annotations

from fastapi.testclient import TestClient
from app import main


def test_phase8_rul_routes_are_registered():
    client = TestClient(main.app)
    response = client.get("/api/v1/rul/ds05/status")
    assert response.status_code == 200
    payload = response.json()
    assert payload["feature_count_expected"] == 72
    assert payload["training_engines"] == [1, 2, 3, 4, 5, 6]
    assert payload["independent_test_engines"] == [7, 8, 9, 10]


def test_phase8_rul_engines_only_exposes_development(monkeypatch):
    from app.services import rul_prediction

    monkeypatch.setattr(
        rul_prediction,
        "list_development_engines",
        lambda: {"data_source": "development_only", "engines": [{"engine_id": 1}]},
    )
    client = TestClient(main.app)
    response = client.get("/api/v1/rul/ds05/engines")
    assert response.status_code == 200
    assert response.json()["data_source"] == "development_only"
