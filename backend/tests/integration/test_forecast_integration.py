"""
Integration Tests for ForecastOut and Downstream Availability/Recommendation Compatibility (M2 Ownership)

Verifies:
1. ForecastOut payload contract conformity against TypeScript and System Architecture schemas.
2. Integration contract for downstream availability: point_forecast returns PointForecast(mean, std, ...)
   with valid sigma_pct for Monte Carlo simulation.
3. Insufficient history behavior: point_forecast returns None, and zone_forecast returns status="unavailable".
4. Provenance and training truthfulness: trained_on matches data source, provenance is strictly "forecast".
5. Timestamp & timezone integrity: target_ts and generated_at are UTC ISO strings ending in 'Z'.
6. Monte Carlo input compatibility: verifying center_pct and sigma_pct can be sampled without errors or invalid bounds.
"""

from __future__ import annotations

import asyncio
import math
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

import numpy as np
from simulator.generate_history import generate_hourly_zone_history

from app.modules.forecast import (
    MIN_HISTORY_DAYS,
    ForecastRepository,
    PointForecast,
    handle_get_zone_forecast,
    point_forecast,
)
from app.workers.forecast_job import run_forecast_job_for_zones


class TestForecastDownstreamIntegration(unittest.TestCase):
    """Integration verification between Forecast module and downstream consumers."""

    def setUp(self) -> None:
        self.zone_id = "a1a1a1a1-1111-4111-8111-111111111111"
        self.repo = ForecastRepository()

    def test_forecast_out_schema_conformance(self) -> None:
        """ForecastOut response contains all required fields matching web/driver types and docx contracts."""
        hist_21d = generate_hourly_zone_history(self.zone_id, weeks=3, seed=10)
        self.repo.set_zone_history(self.zone_id, hist_21d)

        res = handle_get_zone_forecast(self.zone_id, target="occupancy_pct", horizon_hours=24, repo=self.repo)

        # 1. Top-level contract validation
        self.assertIn("zone_id", res)
        self.assertEqual(res["zone_id"], self.zone_id)
        self.assertEqual(res["target"], "occupancy_pct")
        self.assertEqual(res["status"], "ok")
        self.assertIsNone(res["reason"])
        self.assertIsNotNone(res["model_version"])
        self.assertEqual(res["trained_on"], "simulated")
        self.assertEqual(res["provenance"], "forecast")
        self.assertIn("generated_at", res)
        self.assertTrue(res["generated_at"].endswith("Z"))
        self.assertIn("interval_level", res)

        # 2. Points contract validation
        points = res["points"]
        self.assertEqual(len(points), 24)
        for pt in points:
            self.assertIn("target_ts", pt)
            self.assertTrue(pt["target_ts"].endswith("Z"))
            self.assertIn("mean", pt)
            self.assertIn("lower", pt)
            self.assertIn("upper", pt)
            self.assertIsInstance(pt["mean"], (int, float))
            self.assertGreaterEqual(pt["mean"], 0.0)
            self.assertLessEqual(pt["mean"], 100.0)
            if pt["lower"] is not None and pt["upper"] is not None:
                self.assertLessEqual(pt["lower"], pt["mean"])
                self.assertGreaterEqual(pt["upper"], pt["mean"])

    def test_point_forecast_contract_for_availability_service(self) -> None:
        """
        point_forecast must return PointForecast with valid mean, std, lower, upper
        suitable for direct consumption by availability.monte_carlo.simulate.
        """
        hist_14d = generate_hourly_zone_history(self.zone_id, weeks=2, seed=11)
        self.repo.set_zone_history(self.zone_id, hist_14d)

        target_time = datetime.now(UTC) + timedelta(hours=3)
        pf = asyncio.run(
            point_forecast(
                zone_id=self.zone_id,
                target="occupancy_pct",
                at=target_time,
                repo=self.repo,
            )
        )

        self.assertIsNotNone(pf)
        self.assertIsInstance(pf, PointForecast)
        self.assertGreaterEqual(pf.mean, 0.0)
        self.assertLessEqual(pf.mean, 100.0)
        self.assertIsNotNone(pf.std)
        self.assertGreater(pf.std, 0.0, "Monte Carlo sigma_pct must be strictly positive")
        self.assertEqual(pf.trained_on, "simulated")
        self.assertGreaterEqual(pf.n_history_days, MIN_HISTORY_DAYS)

        # Verify Monte Carlo simulation integration without errors:
        # q ~ Normal(center_pct/100, sigma_pct/100) truncated to [0, 1]
        capacity = 50
        center_pct = pf.mean
        sigma_pct = pf.std
        rng = np.random.default_rng(42)

        # Draw 1000 simulated occupancy samples
        q_draws = np.clip(rng.normal(center_pct / 100.0, sigma_pct / 100.0, size=1000), 0.0, 1.0)
        occupied_draws = rng.binomial(capacity, q_draws)
        available_draws = capacity - occupied_draws
        prob = float(np.mean(available_draws >= 1))

        self.assertGreaterEqual(prob, 0.0)
        self.assertLessEqual(prob, 1.0)

    def test_point_forecast_insufficient_history_returns_none(self) -> None:
        """When history is < 3 days, point_forecast must return None so availability returns unavailable."""
        # 1 day of history
        hist_1d = generate_hourly_zone_history(self.zone_id, weeks=1, seed=12)[:24]
        self.repo.set_zone_history(self.zone_id, hist_1d)

        pf = asyncio.run(
            point_forecast(
                zone_id=self.zone_id,
                target="occupancy_pct",
                at=datetime.now(UTC),
                repo=self.repo,
            )
        )
        self.assertIsNone(pf, "point_forecast must return None when history is insufficient (< MIN_USABLE_DAYS)")

    def test_point_forecast_low_reliability_span(self) -> None:
        """When history is between 3 and 14 days, PointForecast has n_history_days < 14 for low reliability classification."""
        hist_5d = generate_hourly_zone_history(self.zone_id, weeks=1, seed=13)[:120]  # 5 days
        self.repo.set_zone_history(self.zone_id, hist_5d)

        pf = asyncio.run(
            point_forecast(
                zone_id=self.zone_id,
                target="occupancy_pct",
                at=datetime.now(UTC),
                repo=self.repo,
            )
        )
        self.assertIsNotNone(pf)
        self.assertLess(pf.n_history_days, MIN_HISTORY_DAYS)

    def test_horizon_aliases_and_conflict_validation(self) -> None:
        """Verifies horizon_h and horizon_hours alias resolution and conflict detection."""
        hist_14d = generate_hourly_zone_history(self.zone_id, weeks=2, seed=14)
        self.repo.set_zone_history(self.zone_id, hist_14d)

        # 1. horizon_h alias alone
        res1 = handle_get_zone_forecast(self.zone_id, horizon_h=12, repo=self.repo)
        self.assertEqual(len(res1["points"]), 12)

        # 2. horizon_hours alias alone
        res2 = handle_get_zone_forecast(self.zone_id, horizon_hours=6, repo=self.repo)
        self.assertEqual(len(res2["points"]), 6)

        # 3. Both supplied with matching values
        res3 = handle_get_zone_forecast(self.zone_id, horizon_h=18, horizon_hours=18, repo=self.repo)
        self.assertEqual(len(res3["points"]), 18)

        # 4. Conflicting values must raise ValueError
        with self.assertRaises(ValueError) as ctx:
            handle_get_zone_forecast(self.zone_id, horizon_h=12, horizon_hours=24, repo=self.repo)
        self.assertIn("Conflicting horizon parameters", str(ctx.exception))

        # 5. Out of bounds horizon (< 1 or > 168)
        with self.assertRaises(ValueError):
            handle_get_zone_forecast(self.zone_id, horizon_h=0, repo=self.repo)
        with self.assertRaises(ValueError):
            handle_get_zone_forecast(self.zone_id, horizon_h=169, repo=self.repo)

    def test_from_timestamp_validation_and_timezone_flooring(self) -> None:
        """Verifies parsing and UTC discrete hour alignment of the from parameter."""
        hist_14d = generate_hourly_zone_history(self.zone_id, weeks=2, seed=15)
        self.repo.set_zone_history(self.zone_id, hist_14d)

        # 1. Invalid timestamp raises ValueError
        with self.assertRaises(ValueError):
            handle_get_zone_forecast(self.zone_id, from_ts="invalid-timestamp", repo=self.repo)

        # 2. Timezone offset (+05:30) with sub-hour minutes/seconds: 14:45:30+05:30 = 09:15:30 UTC
        # Floored to 09:00:00Z -> first predicted target timestamp must be 10:00:00Z
        from_str = "2026-11-25T14:45:30+05:30"
        res = handle_get_zone_forecast(self.zone_id, horizon_h=3, from_ts=from_str, repo=self.repo)
        self.assertEqual(res["generated_at"], "2026-11-25T09:15:30Z")
        self.assertEqual(len(res["points"]), 3)
        self.assertEqual(res["points"][0]["target_ts"], "2026-11-25T10:00:00Z")
        self.assertEqual(res["points"][1]["target_ts"], "2026-11-25T11:00:00Z")
        self.assertEqual(res["points"][2]["target_ts"], "2026-11-25T12:00:00Z")

    def test_residual_std_robustness_and_non_finite_handling(self) -> None:
        """Verifies residual standard error is robust under zero variance and extreme inputs."""
        # History with completely constant occupancy (zero variance)
        now = datetime.now(UTC)
        constant_hist = [
            {
                "zone_id": self.zone_id,
                "bucket_start": (now - timedelta(hours=i)).strftime("%Y-%m-%dT%H:%M:%SZ"),
                "occupancy_pct": 50.0,
                "provenance": "simulated",
            }
            for i in range(336)  # 14 days
        ]
        self.repo.set_zone_history(self.zone_id, constant_hist)

        pf = asyncio.run(
            point_forecast(
                zone_id=self.zone_id,
                target="occupancy_pct",
                at=now,
                repo=self.repo,
            )
        )
        self.assertIsNotNone(pf)
        self.assertEqual(pf.mean, 50.0)
        self.assertIsNotNone(pf.std)
        self.assertGreaterEqual(pf.std, 0.1, "Standard error must be strictly >= 0.1 to prevent zero-div in Monte Carlo")
        self.assertTrue(math.isfinite(pf.std))

    def test_forecast_worker_cache_and_endpoint_integration(self) -> None:
        """Forecast worker caches generated forecasts, verifiable via repository and endpoint."""
        hist_14d = generate_hourly_zone_history(self.zone_id, weeks=2, seed=16)
        self.repo.set_zone_history(self.zone_id, hist_14d)

        # 1. Run worker job
        results = asyncio.run(
            run_forecast_job_for_zones([self.zone_id], repo=self.repo, notify_hub=False)
        )
        self.assertIn(self.zone_id, results)
        job_res = results[self.zone_id]
        self.assertEqual(job_res["status"], "ok")

        # 2. Check repository cached forecast
        cached = self.repo.get_cached_forecast(self.zone_id, "occupancy_pct")
        self.assertIsNotNone(cached)
        self.assertEqual(cached["zone_id"], self.zone_id)
        self.assertEqual(cached["status"], "ok")
        self.assertEqual(len(cached["points"]), 24)

        # 3. Verify endpoint retrieval matches
        endpoint_res = handle_get_zone_forecast(self.zone_id, target="occupancy_pct", repo=self.repo)
        self.assertEqual(endpoint_res["zone_id"], self.zone_id)
        self.assertEqual(endpoint_res["status"], "ok")
        self.assertEqual(len(endpoint_res["points"]), 24)


if __name__ == "__main__":
    unittest.main()
