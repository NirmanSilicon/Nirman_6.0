import io
from pathlib import Path

import pandas as pd
import pytest
from fastapi.testclient import TestClient

from uqual.mobile import analyze_csv
from uqual.synthetic import simulate_borrower
from uqual.api import create_app


def test_mobile_canonical_csv_preserves_owned_account(monkeypatch):
    tx, _, _, _ = simulate_borrower(136, 20261112)
    def score(bundle, frame, assessment, synthetic_demo):
        assert synthetic_demo
        assert assessment["as_of"] == str((tx.date.max() + pd.Timedelta(days=1)).date())
        assert len(frame) == len(tx)
        return {"status": "synthetic_demo_only"}
    monkeypatch.setattr("uqual.mobile.score_statement", score)
    result = analyze_csv({}, tx.to_csv(index=False).encode(), "%Y-%m-%d")
    assert result["statement_source"] == "user_upload"


def test_mobile_rejects_multi_account_and_foreign_inputs():
    tx, _, _, _ = simulate_borrower(136, 20261112)
    tx.loc[0, "account_id"] = "another"
    with pytest.raises(ValueError, match="one account"):
        analyze_csv({}, tx.to_csv(index=False).encode(), "%Y-%m-%d")
    tx["account_id"] = "one"
    tx["currency"] = "USD"
    with pytest.raises(ValueError, match="INR"):
        analyze_csv({}, tx.to_csv(index=False).encode(), "%Y-%m-%d")


def test_mobile_date_formats_fail_closed():
    with pytest.raises(ValueError, match="date format"):
        analyze_csv({}, b"Date,Description,Debit,Credit,Balance\n", "guess")
    with pytest.raises(ValueError, match="UTF-8"):
        analyze_csv({}, b"\xff\xfe", "%Y-%m-%d")


def test_mobile_statement_end_cannot_omit_transactions():
    tx, _, _, _ = simulate_borrower(136, 20261112)
    with pytest.raises(ValueError, match="on or after"):
        analyze_csv({}, tx.to_csv(index=False).encode(), "%Y-%m-%d", "2020-01-01")


def test_mobile_preserves_statement_days_without_transactions(monkeypatch):
    tx, assessment, _, _ = simulate_borrower(136, 20261112)
    end = pd.Timestamp(assessment["as_of"]) - pd.Timedelta(days=1)
    assert end > tx.date.max()
    def score(bundle, frame, actual, synthetic_demo):
        assert actual["as_of"] == str(pd.Timestamp(assessment["as_of"]).date())
        return {"status": "synthetic_demo_only"}
    monkeypatch.setattr("uqual.mobile.score_statement", score)
    result = analyze_csv({}, tx.to_csv(index=False).encode(), "%Y-%m-%d", end)
    assert result["statement_period"]["end"] == str(end.date())


def test_mobile_upload_requires_consent(monkeypatch, tmp_path):
    monkeypatch.setenv("UQUAL_SYNTHETIC_MODEL_PATH", str(tmp_path / "absent"))
    monkeypatch.setattr("uqual.api.load_bundle", lambda _: {"model_name": "test"})
    with TestClient(create_app(Path("unused"), "a" * 32)) as client:
        response = client.post("/statements/analyze", headers={"Authorization": "Bearer " + "a" * 32},
                               files={"file": ("statement.csv", io.BytesIO(b"test"), "text/csv")})
        assert response.status_code == 422
        assert "Consent" in response.json()["detail"]
        assert client.post("/statements/sample-analysis").status_code == 401
