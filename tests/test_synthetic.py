import numpy as np
import pandas as pd
import pytest

from uqual.features import build_features, extract_one, feature_columns
from uqual.scoring import score_statement
from uqual.synthetic import simulate_borrower


def test_seeded_generator_is_reproducible_and_balances_reconcile():
    tx, assessment, future, latent = simulate_borrower(1, 101)
    again, again_assessment, _, _ = simulate_borrower(1, 101)
    pd.testing.assert_frame_equal(tx, again)
    assert assessment == again_assessment
    signed = tx.amount.where(tx.direction.eq("credit"), -tx.amount)
    expected = latent["opening_balance"] + signed.cumsum()
    np.testing.assert_allclose(expected, tx.balance, atol=.000001)
    assert (tx.date < assessment["as_of"]).all()
    assert len(future) == 6


def test_labels_follow_future_streak_not_a_feature_formula():
    for i in range(8):
        tx, assessment, future, latent = simulate_borrower(i, 101)
        streak = 0
        expected = 0
        for record in future:
            streak = streak + 1 if record["simulated_missed"] else 0
            expected = max(expected, int(streak >= 3))
        assert assessment["target"] == expected
        generated, reasons = extract_one(tx, assessment["as_of"])
        actual = build_features(tx, pd.DataFrame([assessment])).iloc[0]
        assert actual.eligible == (not reasons)
        for key, value in generated.items():
            assert np.isclose(actual[key], value, equal_nan=True)
        assert not any(key in feature_columns(pd.DataFrame([actual])) for key in
                       ["target", "persona", "first_time_borrower", "simulated_due", "simulated_missed"])


def test_future_stress_changes_labels_without_changing_observed_history():
    tx, assessment, _, _ = simulate_borrower(3, 101, 1.0)
    stressed, stress_assessment, _, _ = simulate_borrower(3, 101, 2.0)
    pd.testing.assert_frame_equal(tx, stressed)
    assert assessment["as_of"] == stress_assessment["as_of"]


def test_synthetic_model_cannot_silently_be_used_as_real_scoring():
    with pytest.raises(ValueError, match="explicit"):
        score_statement({"dataset": "synthetic_india"}, pd.DataFrame(), {})
    with pytest.raises(ValueError, match="requires a synthetic"):
        score_statement({"dataset": "berka"}, pd.DataFrame(), {}, synthetic_demo=True)
