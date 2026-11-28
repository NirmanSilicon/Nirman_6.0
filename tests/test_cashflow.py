import numpy as np
import pandas as pd
import pytest

from uqual.features import build_features, validate_transactions
from uqual.model import metrics, split_indices
from uqual.scoring import score_statement, simulate
from uqual.statements import import_csv


@pytest.fixture
def transactions():
    dates = pd.date_range("2024-01-01", "2024-06-30", freq="3D")
    return pd.DataFrame({"transaction_id": [str(i) for i in range(len(dates))], "account_id": "a",
                         "customer_id": "c", "date": dates, "amount": 100.0,
                         "direction": ["credit" if i % 2 == 0 else "debit" for i in range(len(dates))],
                         "balance": 1000.0, "category": "unknown", "currency": "INR", "country": "IN"})


@pytest.fixture
def assessment():
    return {"assessment_id": "one", "customer_id": "c", "account_id": "a", "as_of": "2024-07-01",
            "country": "IN", "currency": "INR"}


def test_future_and_same_day_money_cannot_change_assessment(transactions, assessment):
    before = build_features(transactions, pd.DataFrame([assessment]))
    extra = transactions.iloc[:2].copy()
    extra["transaction_id"] = ["future1", "future2"]
    extra["date"] = ["2024-07-01", "2025-01-01"]
    extra["amount"] = 1e12
    after = build_features(pd.concat([transactions, extra]), pd.DataFrame([assessment]))
    pd.testing.assert_frame_equal(before, after)


def test_unknown_transfer_and_borrowing_are_not_income(transactions, assessment):
    transactions["direction"] = "credit"
    transactions.loc[0, "direction"] = "debit"
    for i, category in enumerate(["own_transfer", "refund", "loan_disbursement"], start=1):
        transactions.loc[i, "category"] = category
    row = build_features(transactions, pd.DataFrame([assessment])).iloc[0]
    assert row.known_income_share == 0
    assert row.excluded_credit_share > 0


def test_idempotent_duplicates_and_conflicting_rows(transactions):
    assert len(validate_transactions(pd.concat([transactions, transactions]))) == len(transactions)
    duplicate = transactions.iloc[:1].copy()
    duplicate["amount"] = 999
    with pytest.raises(ValueError, match="Conflicting"):
        validate_transactions(pd.concat([transactions, duplicate]))


def test_all_rows_and_identity_checked(transactions, assessment):
    with pytest.raises(ValueError, match="currency"):
        build_features(transactions, pd.DataFrame([{**assessment, "currency": "USD"}]))
    row = build_features(transactions, pd.DataFrame([{**assessment, "customer_id": "other"}])).iloc[0]
    assert not row.eligible


def test_insufficient_history_abstains(transactions, assessment):
    row = build_features(transactions.tail(3), pd.DataFrame([assessment])).iloc[0]
    assert not row.eligible
    assert "90 days" in row.exclusion_reasons


def test_indian_statements_abstain_for_czech_model_by_default(transactions, assessment):
    bundle = {"model_name": "test", "country": "CZ", "currency": "CZK"}
    result = score_statement(bundle, transactions, assessment)
    assert result["status"] == "out_of_domain"
    assert result["risk_probability"] is None
    assert result["approved_for_lending"] is False


def test_custom_outcome_columns_cannot_leak(transactions, assessment):
    frame = build_features(transactions, pd.DataFrame([{**assessment, "future_paid": 100000,
                                                       "outcome_date": "2026-01-01", "target": 1}]))
    assert "future_paid" not in frame and "outcome_date" not in frame
    assert frame.target.iloc[0] == 1


def test_currency_scale_invariance(transactions, assessment):
    scaled = transactions.copy()
    scaled[["amount", "balance"]] *= 100
    left = build_features(transactions, pd.DataFrame([assessment]))
    right = build_features(scaled, pd.DataFrame([assessment]))
    pd.testing.assert_frame_equal(left, right, check_exact=False, atol=1e-10)


def test_partition_customers_and_final_dates_are_disjoint():
    df = pd.DataFrame({"customer_id": [str(i) for i in range(400)],
                       "as_of": pd.date_range("2020-01-01", periods=400), "target": np.arange(400) % 5 == 0})
    splits = split_indices(df, True, temporal_holdout=True)
    combined = np.concatenate(list(splits.values()))
    assert len(np.unique(combined)) == 400
    assert max(df.as_of.iloc[np.concatenate([splits[k] for k in ["train", "validation", "calibration"]])]) < min(df.as_of.iloc[splits["test"]])
    df.loc[1, "customer_id"] = "0"
    with pytest.raises(ValueError, match="one labelled"):
        split_indices(df, True)


def test_zero_recall_is_reported_honestly():
    result = metrics([0, 1, 0, 1], [.1, .2, .1, .2], .5)
    assert result["recall"] == 0
    assert result["roc_auc"] == 1
    assert result["confusion_matrix"]["fn"] == 2


def test_stress_scenarios_and_zero_interest():
    result = simulate(12000, 0, 12, 5000, 3000)
    assert result["monthly_emi"] == 1000
    assert result["scenarios"][0]["monthly_surplus_after_emi"] == 1000
    assert result["scenarios"][-1]["monthly_surplus_after_emi"] == -800
    with pytest.raises(ValueError):
        simulate(12000, float("nan"), 12, 5000, 3000)


def test_csv_ambiguous_money_fails_closed(tmp_path):
    path = tmp_path / "statement.csv"
    path.write_text("Date,Description,Debit,Credit,Balance\n2024-01-01,UPI,100,200,1000\n")
    with pytest.raises(ValueError, match="exactly one"):
        import_csv(path, "a", "c", "IN", "INR")
    path.write_text("Date,Description,Debit,Credit,Balance\n2024-01-01,UPI,,100,1100\n")
    frame = import_csv(path, "a", "c", "IN", "INR")
    assert frame.iloc[0].category == "unknown"
    assert frame.iloc[0].direction == "credit"
