from pathlib import Path

import pytest
from fastapi.testclient import TestClient

from uqual.api import create_app


@pytest.fixture
def client(monkeypatch, tmp_path):
    monkeypatch.setenv("UQUAL_SYNTHETIC_MODEL_PATH", str(tmp_path / "not-trained.joblib"))
    monkeypatch.setattr("uqual.api.load_bundle", lambda _: {"model_name": "test-model"})
    with TestClient(create_app(Path("unused"), "a" * 32)) as client:
        yield client


def test_authentication_required(client):
    request = {"amount": 100000, "annual_rate": 12, "months": 12,
               "monthly_income": 25000, "monthly_expenses": 15000}
    assert client.post("/simulate", json=request).status_code == 401
    assert client.post("/simulate", json=request, headers={"Authorization": "Bearer wrong"}).status_code == 401
    assert client.post("/simulate", json=request, headers={"Authorization": "Bearer " + "a" * 32}).status_code == 200


def test_api_rejects_mixed_ownership(client):
    request = {"assessment": {"assessment_id": "one", "customer_id": "c", "account_id": "a",
                               "as_of": "2024-07-01", "country": "IN", "currency": "INR"},
               "transactions": [{"transaction_id": "one", "customer_id": "someone-else", "account_id": "a",
                                 "date": "2024-06-01", "amount": 100, "direction": "credit", "balance": 100,
                                 "country": "IN", "currency": "INR"}]}
    response = client.post("/score", json=request, headers={"Authorization": "Bearer " + "a" * 32})
    assert response.status_code == 422


def test_api_refuses_weak_key(monkeypatch):
    monkeypatch.setenv("UQUAL_API_KEY", "short")
    with pytest.raises(RuntimeError, match="32 characters"):
        with TestClient(create_app()):
            pass
