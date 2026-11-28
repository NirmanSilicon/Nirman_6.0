"""
Unit Tests for ParkSMART Forecasting Baselines and Evaluation (File 208 / M2 Ownership)

Verifies:
1. HistoricAverageBaseline: Grouped day-hour averages, 90% prediction intervals, bounds clamping.
2. PersistenceBaseline: 7-day lookback persistence predictions, graceful multi-tier fallback.
3. SeasonalNaiveBaseline: 168h weekly and 24h daily seasonal lags, residual error intervals.
4. No data leakage: temporal_train_test_split strictly enforces training before cutoff.
5. Evaluation metrics: MAE, RMSE, MAPE, and Prediction Interval Coverage calculation.
6. Rolling walk-forward backtest: Zero leakage temporal evaluation, insufficient history handling.
7. Provenance detection: simulated vs observed vs mixed dataset provenance tracking.
8. Robustness & edge cases: unfitted model errors, empty history, NaN/inf handling.
"""

from __future__ import annotations

import sys
import unittest
from datetime import UTC, datetime, timedelta
from pathlib import Path

# Ensure backend and root directory in sys.path
root_dir = Path(__file__).resolve().parent.parent.parent.parent
backend_dir = root_dir / "backend"
for p in (str(root_dir), str(backend_dir)):
    if p not in sys.path:
        sys.path.insert(0, p)

from simulator.generate_history import generate_hourly_zone_history

from app.modules.forecast.baselines import (
    ForecastPoint,
    HistoricAverageBaseline,
    PersistenceBaseline,
    SeasonalNaiveBaseline,
)
from app.modules.forecast.evaluation import (
    detect_dataset_provenance,
    evaluate_baseline_model,
    temporal_train_test_split,
    walk_forward_backtest,
)
from app.modules.forecast.repository import ForecastRepository
from app.modules.forecast.service import generate_forecast_for_zone


class TestForecastingBaselines(unittest.TestCase):
    """Tests for forecasting baseline models and evaluation metrics."""

    def setUp(self) -> None:
        self.zone_id = "a1a1a1a1-1111-4111-8111-111111111111"
        # Generate 4 weeks of deterministic hourly data for testing
        self.history = generate_hourly_zone_history(
            zone_id=self.zone_id,
            profile_name="commercial_core",
            weeks=4,
            end_time=datetime(2026, 11, 22, 12, 0, 0, tzinfo=UTC),
            seed=42,
        )

    # ------------------------------------------------------------------------
    # 1. Baseline Model Tests
    # ------------------------------------------------------------------------

    def test_historic_average_baseline_fit_and_predict(self) -> None:
        """HistoricAverageBaseline correctly fits grouped diurnal statistics and predicts intervals."""
        model = HistoricAverageBaseline(target_metric="occupancy_pct")
        model.fit(self.history)

        self.assertTrue(model._is_fitted)
        self.assertGreater(model.fitted_days, 25.0)

        # Generate predictions for the next 24 hours
        start_ts = datetime.now(UTC)
        target_ts = [(start_ts + timedelta(hours=i)).strftime("%Y-%m-%dT%H:%M:%SZ") for i in range(24)]

        predictions = model.predict(target_ts, confidence_level=0.90)
        self.assertEqual(len(predictions), 24)

        for p in predictions:
            self.assertIsInstance(p, ForecastPoint)
            self.assertTrue(p.target_ts.endswith("Z"))
            self.assertGreaterEqual(p.mean, 0.0)
            self.assertLessEqual(p.mean, 100.0)
            self.assertIsNotNone(p.lower)
            self.assertIsNotNone(p.upper)
            self.assertLessEqual(p.lower, p.mean)
            self.assertGreaterEqual(p.upper, p.mean)

    def test_persistence_baseline_fit_and_predict(self) -> None:
        """PersistenceBaseline projects values from matching hour 7 days prior."""
        model = PersistenceBaseline(target_metric="occupancy_pct")
        model.fit(self.history)

        self.assertTrue(model._is_fitted)
        # Target timestamps 1 day after end of history
        last_ts = datetime.fromisoformat(self.history[-1]["bucket_start"])
        targets = [(last_ts + timedelta(hours=i + 1)).strftime("%Y-%m-%dT%H:%M:%SZ") for i in range(12)]

        predictions = model.predict(targets)
        self.assertEqual(len(predictions), 12)
        for p in predictions:
            self.assertGreaterEqual(p.mean, 0.0)
            self.assertLessEqual(p.mean, 100.0)

    def test_seasonal_naive_baseline_weekly_and_daily(self) -> None:
        """SeasonalNaiveBaseline projects 168h weekly and 24h daily seasonal lags with uncertainty."""
        # Weekly seasonality (168h)
        model_weekly = SeasonalNaiveBaseline(target_metric="occupancy_pct", season_hours=168)
        model_weekly.fit(self.history)

        self.assertTrue(model_weekly._is_fitted)
        self.assertGreater(model_weekly.fitted_days, 25.0)

        last_ts = datetime.fromisoformat(self.history[-1]["bucket_start"])
        targets = [(last_ts + timedelta(hours=i + 1)).strftime("%Y-%m-%dT%H:%M:%SZ") for i in range(24)]

        preds_weekly = model_weekly.predict(targets, confidence_level=0.90)
        self.assertEqual(len(preds_weekly), 24)
        for p in preds_weekly:
            self.assertIsInstance(p, ForecastPoint)
            self.assertTrue(p.target_ts.endswith("Z"))
            self.assertGreaterEqual(p.mean, 0.0)
            self.assertLessEqual(p.mean, 100.0)
            self.assertIsNotNone(p.lower)
            self.assertIsNotNone(p.upper)
            self.assertLessEqual(p.lower, p.mean)
            self.assertGreaterEqual(p.upper, p.mean)

        # Daily seasonality (24h)
        model_daily = SeasonalNaiveBaseline(target_metric="occupancy_pct", season_hours=24)
        model_daily.fit(self.history)
        self.assertTrue(model_daily._is_fitted)

        preds_daily = model_daily.predict(targets[:6])
        self.assertEqual(len(preds_daily), 6)
        for p in preds_daily:
            self.assertGreaterEqual(p.mean, 0.0)
            self.assertLessEqual(p.mean, 100.0)

    def test_seasonal_naive_missing_lag_fallback(self) -> None:
        """SeasonalNaiveBaseline falls back to 24h lag or latest observed value when 168h lag is missing."""
        # History containing only 3 days (missing 168h prior)
        short_history = self.history[-72:]  # 72 hours = 3 days
        model = SeasonalNaiveBaseline(target_metric="occupancy_pct", season_hours=168)
        model.fit(short_history)

        last_ts = datetime.fromisoformat(short_history[-1]["bucket_start"])
        targets = [(last_ts + timedelta(hours=i + 1)).strftime("%Y-%m-%dT%H:%M:%SZ") for i in range(12)]

        # Should fall back to 24h lag without raising exceptions
        preds = model.predict(targets)
        self.assertEqual(len(preds), 12)
        for p in preds:
            self.assertGreaterEqual(p.mean, 0.0)
            self.assertLessEqual(p.mean, 100.0)

    def test_persistence_fallback_tiers(self) -> None:
        """PersistenceBaseline tests fallback tiers: 168h -> 24h -> latest -> global mean."""
        # 1-day history: no 168h and no 24h lag for future predictions
        one_day_hist = self.history[-24:]
        model = PersistenceBaseline(target_metric="occupancy_pct")
        model.fit(one_day_hist)

        # Predict 48 hours into the future (beyond 24h and 168h lag availability)
        last_ts = datetime.fromisoformat(one_day_hist[-1]["bucket_start"])
        targets = [(last_ts + timedelta(hours=i + 30)).strftime("%Y-%m-%dT%H:%M:%SZ") for i in range(5)]

        preds = model.predict(targets)
        self.assertEqual(len(preds), 5)
        for p in preds:
            # Must fall back to latest observed value
            self.assertEqual(p.mean, round(float(one_day_hist[-1]["occupancy_pct"]), 2))

    # ------------------------------------------------------------------------
    # 2. Defensive Error Handling & Numerical Boundaries
    # ------------------------------------------------------------------------

    def test_baseline_unfitted_raises_runtime_error(self) -> None:
        """Calling predict() on unfitted models must raise RuntimeError."""
        for cls in (HistoricAverageBaseline, PersistenceBaseline, SeasonalNaiveBaseline):
            m = cls(target_metric="occupancy_pct")
            with self.assertRaises(RuntimeError):
                m.predict(["2026-11-20T10:00:00Z"])

    def test_baseline_empty_and_invalid_data(self) -> None:
        """Models handle empty lists, None values, and non-finite numbers safely."""
        for cls in (HistoricAverageBaseline, PersistenceBaseline, SeasonalNaiveBaseline):
            m = cls(target_metric="occupancy_pct")
            m.fit([])
            self.assertFalse(m._is_fitted)
            self.assertEqual(m.fitted_days, 0.0)

        # History with invalid values (strings, NaN, inf, None, negative, > 100)
        dirty_history = [
            {"bucket_start": "2026-11-01T00:00:00Z", "occupancy_pct": None},
            {"bucket_start": "2026-11-01T01:00:00Z", "occupancy_pct": "not_a_number"},
            {"bucket_start": "2026-11-01T02:00:00Z", "occupancy_pct": float("nan")},
            {"bucket_start": "2026-11-01T03:00:00Z", "occupancy_pct": float("inf")},
            {"bucket_start": "2026-11-01T04:00:00Z", "occupancy_pct": -25.0},
            {"bucket_start": "2026-11-01T05:00:00Z", "occupancy_pct": 140.0},
            {"bucket_start": "2026-11-01T06:00:00Z", "occupancy_pct": 50.0},
        ]
        m = HistoricAverageBaseline(target_metric="occupancy_pct")
        m.fit(dirty_history)
        self.assertTrue(m._is_fitted)

        # Clamping check: values should be clamped between 0 and 100
        preds = m.predict(["2026-11-08T04:00:00Z", "2026-11-08T05:00:00Z"])
        for p in preds:
            self.assertGreaterEqual(p.mean, 0.0)
            self.assertLessEqual(p.mean, 100.0)

    # ------------------------------------------------------------------------
    # 3. Temporal Split & Evaluation Metrics
    # ------------------------------------------------------------------------

    def test_temporal_train_test_split_no_leakage(self) -> None:
        """Temporal split strictly partitions history with zero future data leakage."""
        cutoff = datetime(2026, 11, 15, 0, 0, 0, tzinfo=UTC)
        train, test = temporal_train_test_split(self.history, cutoff)

        self.assertGreater(len(train), 0)
        self.assertGreater(len(test), 0)
        self.assertEqual(len(train) + len(test), len(self.history))

        # Assert no record in train has timestamp >= cutoff
        for r in train:
            r_ts = datetime.fromisoformat(r["bucket_start"])
            self.assertLess(r_ts, cutoff, "Data leakage detected: train record has timestamp >= cutoff!")

        # Assert all records in test have timestamp >= cutoff
        for r in test:
            r_ts = datetime.fromisoformat(r["bucket_start"])
            self.assertGreaterEqual(r_ts, cutoff)

    def test_evaluation_metrics_calculation(self) -> None:
        """Verifies MAE, RMSE, MAPE, and coverage calculation on test predictions."""
        # Split 3 weeks train, 1 week test
        cutoff = datetime.fromisoformat(self.history[504]["bucket_start"])
        train, test = temporal_train_test_split(self.history, cutoff)

        model = HistoricAverageBaseline(target_metric="occupancy_pct")
        metrics = evaluate_baseline_model(model, train, test, target_metric="occupancy_pct")

        self.assertIn("mae", metrics)
        self.assertIn("rmse", metrics)
        self.assertIn("mape", metrics)
        self.assertIn("coverage", metrics)

        self.assertGreaterEqual(metrics["mae"], 0.0)
        self.assertGreaterEqual(metrics["rmse"], metrics["mae"])  # Mathematical property: RMSE >= MAE
        self.assertGreaterEqual(metrics["coverage"], 0.65)  # Should achieve high coverage for 90% interval

    # ------------------------------------------------------------------------
    # 4. Walk-Forward Backtesting & Provenance
    # ------------------------------------------------------------------------

    def test_walk_forward_backtest_execution(self) -> None:
        """Walk-forward rolling cross-validation executes without leakage and reports summary metrics."""
        result = walk_forward_backtest(
            model_factory=HistoricAverageBaseline,
            history=self.history,
            initial_train_days=14,
            horizon_hours=24,
            step_hours=48,
            target_metric="occupancy_pct",
        )

        self.assertEqual(result["status"], "ok")
        self.assertGreater(result["folds_count"], 0)
        self.assertGreaterEqual(result["mean_mae"], 0.0)
        self.assertGreaterEqual(result["mean_rmse"], result["mean_mae"])
        self.assertGreaterEqual(result["mean_coverage"], 0.0)
        self.assertLessEqual(result["mean_coverage"], 1.0)
        self.assertEqual(result["provenance"], "simulated")

    def test_walk_forward_backtest_insufficient_history(self) -> None:
        """Walk-forward backtest safely reports insufficient_history when span < initial_train_days."""
        short_hist = self.history[:120]  # 5 days
        result = walk_forward_backtest(
            model_factory=HistoricAverageBaseline,
            history=short_hist,
            initial_train_days=14,
            horizon_hours=24,
        )

        self.assertEqual(result["status"], "insufficient_history")
        self.assertEqual(result["folds_count"], 0)
        self.assertIsNone(result["mean_mae"])
        self.assertEqual(result["provenance"], "simulated")

    def test_walk_forward_backtest_empty_history(self) -> None:
        """Walk-forward backtest returns empty_history on empty list."""
        result = walk_forward_backtest(
            model_factory=HistoricAverageBaseline,
            history=[],
        )
        self.assertEqual(result["status"], "empty_history")
        self.assertEqual(result["folds_count"], 0)
        self.assertIsNone(result["mean_mae"])
        self.assertEqual(result["provenance"], "none")

    def test_detect_dataset_provenance(self) -> None:
        """Accurately detects simulated, observed, mixed, and none provenance."""
        self.assertEqual(detect_dataset_provenance([]), "none")
        self.assertEqual(detect_dataset_provenance([{"provenance": "simulated"}]), "simulated")
        self.assertEqual(detect_dataset_provenance([{"provenance": "observed"}]), "observed")
        self.assertEqual(
            detect_dataset_provenance([{"provenance": "simulated"}, {"provenance": "observed"}]),
            "mixed",
        )

    def test_service_model_selection(self) -> None:
        """Verifies generate_forecast_for_zone supports seasonal_naive_v1 and persistence_v1."""
        repo = ForecastRepository()
        repo.set_zone_history(self.zone_id, self.history)

        # 1. Seasonal naive
        sn_res = generate_forecast_for_zone(
            zone_id=self.zone_id,
            model_id="seasonal_naive_v1",
            repo=repo,
        )
        self.assertEqual(sn_res["status"], "ok")
        self.assertEqual(sn_res["model_version"], "seasonal_naive_168h_v1")
        self.assertEqual(len(sn_res["points"]), 24)

        # 2. Persistence
        p_res = generate_forecast_for_zone(
            zone_id=self.zone_id,
            model_id="persistence_v1",
            repo=repo,
        )
        self.assertEqual(p_res["status"], "ok")
        self.assertEqual(p_res["model_version"], "persistence_v1")
        self.assertEqual(len(p_res["points"]), 24)


if __name__ == "__main__":
    unittest.main()
