import numpy as np
import pandas as pd
import pytest

from uqual.features import feature_columns
from uqual.features_v2 import RISK_DIRECTIONS, build_features, extract_one
from uqual.model import candidates
from uqual.synthetic import simulate_borrower


def example():
    return simulate_borrower(1, 101)[:2]


def test_v2_rejects_broken_ledgers():
    tx, a = example()
    tx.loc[3, "balance"] += 100
    with pytest.raises(ValueError, match="reconcile"):
        build_features(tx, pd.DataFrame([a]))


def test_v2_scale_future_and_label_isolation():
    tx, a = example()
    before = build_features(tx, pd.DataFrame([a]))
    scaled = tx.copy()
    scaled[["amount", "balance"]] *= 10
    after = build_features(scaled, pd.DataFrame([a]))
    np.testing.assert_allclose(before[list(RISK_DIRECTIONS)], after[list(RISK_DIRECTIONS)], atol=1e-10)
    future = tx.iloc[:1].copy()
    future["transaction_id"] = "future"
    future["date"] = a["as_of"]
    future["balance"] = 1e9
    appended = build_features(pd.concat([tx, future]), pd.DataFrame([{**a, "future_missed": 1}]))
    pd.testing.assert_frame_equal(before, appended)
    assert set(feature_columns(before)) == set(RISK_DIRECTIONS)


def test_v2_known_matched_transfers_cannot_create_income_or_change_features():
    tx, a = example()
    base, _ = extract_one(tx, a["as_of"])
    # Insert a matched pair after the final original transaction on that day.
    pair = pd.concat([tx.iloc[-1:].copy()] * 2, ignore_index=True)
    pair["transaction_id"] = ["self-credit", "self-debit"]
    pair["direction"] = ["credit", "debit"]
    pair["amount"] = 1000000.0
    pair["balance"] = [tx.balance.iloc[-1] + 1000000, tx.balance.iloc[-1]]
    pair["category"] = "own_transfer"
    changed = build_features(pd.concat([tx, pair]), pd.DataFrame([a]))
    np.testing.assert_allclose(list(base.values()), changed[list(base)].iloc[0], atol=1e-10)


def test_v2_increasing_reserves_has_only_nonadverse_feature_changes():
    tx, a = example()
    before, _ = extract_one(tx, a["as_of"])
    tx["balance"] += 10000
    after, _ = extract_one(tx, a["as_of"])
    for key, sign in RISK_DIRECTIONS.items():
        assert sign * (after[key] - before[key]) <= 1e-10


def test_monotone_search_cannot_silently_use_unconstrained_family():
    with pytest.raises(ValueError, match="supported"):
        list(candidates(42, 1, 1, 5, families=["random_forest"], monotone_constraints=[1]))
