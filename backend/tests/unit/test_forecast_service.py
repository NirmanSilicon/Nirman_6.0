"""
Unit and Integration Tests for ParkSMART Demand Forecasting Service, Workers & Edge Health (Day 3 / M2 Ownership)

Verifies:
1. Insufficient history: < 3 days returns status="unavailable", points=[].
2. Low reliability: 3 to 13.9 days returns status="low_reliability", reason populated.
3. Sufficient history: >= 14 days (MIN_HISTORY_DAYS) returns status="ok", reason=None.
4. Simulated data provenance: trained_on="simulated", provenance="forecast".
5. API endpoints: GET /forecast/zones/{id} and GET /forecast/models.
6. Aggregation worker: aggregating raw events into hourly time buckets.
7. Forecast worker: periodic forecast job generating predictions and updating cache.
8. Edge health & calibration: health transitions (online -> degraded -> offline), ROI geometry validation.
"""

from __future__ import annotations

import asyncio
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

from edge.calibration import CameraCalibrator, polygon_area, validate_roi_polygon
from edge.health import EdgeHealthMonitor
from simulator.generate_history import generate_hourly_zone_history

from app.modules.forecast.repository import ForecastRepository
from app.modules.forecast.router import (
    handle_get_forecast_models,
    handle_get_zone_forecast,
)
from app.modules.forecast.service import generate_forecast_for_zone
from app.workers.aggregation_job import aggregate_raw_observations
from app.workers.forecast_job import run_forecast_job_for_zones


class TestForecastServiceAndWorkers(unittest.TestCase):
    """Test suite for forecasting services, worker jobs, edge health, and calibration."""

    def setUp(self) -> None:
        self.zone_id = "a1a1a1a1-1111-4111-8111-111111111111"
        self.repo = ForecastRepository()

    # ------------------------------------------------------------------------
    # 1. History Sufficiency & MIN_HISTORY_DAYS Rules
    # ------------------------------------------------------------------------

    def test_forecast_insufficient_history_returns_unavailable(self) -> None:
        """When history < 3 days (or empty), status must be 'unavailable' with points=[]."""
        # Empty history
        res = generate_forecast_for_zone(self.zone_id, repo=self.repo)
        self.assertEqual(res["status"], "unavailable")
        self.assertEqual(res["reason"], "insufficient_history")
        self.assertEqual(len(res["points"]), 0)
        self.assertEqual(res["provenance"], "forecast")

        # 2 days of history (< 3 days MIN_USABLE_DAYS)
        hist_2d = generate_hourly_zone_history(self.zone_id, weeks=1, seed=1)[:48]  # 48 hours = 2 days
        self.repo.set_zone_history(self.zone_id, hist_2d)

        res_2d = generate_forecast_for_zone(self.zone_id, repo=self.repo)
        self.assertEqual(res_2d["status"], "unavailable")
        self.assertEqual(res_2d["reason"], "insufficient_history")
        self.assertEqual(len(res_2d["points"]), 0)

    def test_forecast_low_reliability_between_3_and_14_days(self) -> None:
        """When history is between 3 and 13.9 days, status must be 'low_reliability' with warning reason."""
        # 7 days of history (>= 3 days, but < 14 days MIN_HISTORY_DAYS)
        hist_7d = generate_hourly_zone_history(self.zone_id, weeks=1, seed=2)  # 168 hours = 7 days
        self.repo.set_zone_history(self.zone_id, hist_7d)

        res = generate_forecast_for_zone(self.zone_id, repo=self.repo)
        self.assertEqual(res["status"], "low_reliability")
        self.assertIn("below_min_14", str(res["reason"]))
        self.assertEqual(len(res["points"]), 24)
        self.assertEqual(res["trained_on"], "simulated")
        self.assertEqual(res["provenance"], "forecast")

    def test_forecast_sufficient_history_returns_ok(self) -> None:
        """When history >= 14 days (MIN_HISTORY_DAYS), status must be 'ok' with reason=None."""
        # 3 weeks of history (21 days >= 14 days)
        hist_21d = generate_hourly_zone_history(self.zone_id, weeks=3, seed=3)
        self.repo.set_zone_history(self.zone_id, hist_21d)

        res = generate_forecast_for_zone(self.zone_id, repo=self.repo)
        self.assertEqual(res["status"], "ok")
        self.assertIsNone(res["reason"])
        self.assertEqual(len(res["points"]), 24)
        self.assertEqual(res["trained_on"], "simulated")
        self.assertEqual(res["provenance"], "forecast")
        self.assertEqual(res["interval_level"], 90)

        # Validate points structure
        for p in res["points"]:
            self.assertIn("target_ts", p)
            self.assertIn("mean", p)
            self.assertIn("lower", p)
            self.assertIn("upper", p)
            self.assertLessEqual(p["lower"], p["mean"])
            self.assertGreaterEqual(p["upper"], p["mean"])

    # ------------------------------------------------------------------------
    # 2. Simulated-Data Provenance & Model Registry
    # ------------------------------------------------------------------------

    def test_simulated_data_provenance_labels(self) -> None:
        """Verifies simulated data provenance is carried through history, trained_on, and forecast output."""
        hist = generate_hourly_zone_history(self.zone_id, weeks=4, seed=4)
        for h in hist:
            self.assertEqual(h["provenance"], "simulated")

        self.repo.set_zone_history(self.zone_id, hist)
        forecast = generate_forecast_for_zone(self.zone_id, repo=self.repo)
        self.assertEqual(forecast["trained_on"], "simulated")
        self.assertEqual(forecast["provenance"], "forecast")

    def test_get_forecast_models_endpoint(self) -> None:
        """GET /forecast/models returns registered baseline models with min_history_days."""
        registry = handle_get_forecast_models()
        self.assertIn("models", registry)
        models = registry["models"]
        self.assertGreaterEqual(len(models), 2)

        model_ids = [m["model_id"] for m in models]
        self.assertIn("historic_average_v1", model_ids)
        self.assertIn("persistence_v1", model_ids)

        for m in models:
            self.assertIn("min_history_days", m)
            self.assertIn("description", m)
            self.assertEqual(m["provenance"], "forecast")

    # ------------------------------------------------------------------------
    # 3. Aggregation & Forecast Worker Jobs
    # ------------------------------------------------------------------------

    def test_aggregation_job_hourly_buckets(self) -> None:
        """Aggregation job aggregates raw observation events into hourly buckets."""
        now = datetime.now(UTC).replace(minute=15, second=0, microsecond=0)
        raw_events = [
            {
                "zone_id": self.zone_id,
                "ts": (now + timedelta(minutes=i * 5)).strftime("%Y-%m-%dT%H:%M:%SZ"),
                "occupancy_pct": 50.0 + i * 2,
                "vehicle_count": 20 + i,
                "pedestrian_count": 10 + i,
                "provenance": "observed",
            }
            for i in range(6)
        ]

        buckets = aggregate_raw_observations(raw_events, interval_min=60, default_zone_id=self.zone_id)
        self.assertEqual(len(buckets), 1)
        b = buckets[0]
        self.assertEqual(b.zone_id, self.zone_id)
        self.assertEqual(b.interval_min, 60)
        self.assertEqual(b.sample_count, 6)
        self.assertEqual(b.provenance, "observed")
        self.assertAlmostEqual(b.occupancy_pct, 55.0)

    def test_forecast_worker_job_execution(self) -> None:
        """Forecast job executes across target zones, caches forecasts and notifies hub."""
        hist = generate_hourly_zone_history(self.zone_id, weeks=2, seed=5)
        self.repo.set_zone_history(self.zone_id, hist)

        results = asyncio.run(
            run_forecast_job_for_zones([self.zone_id], repo=self.repo, notify_hub=False)
        )
        self.assertIn(self.zone_id, results)
        self.assertEqual(results[self.zone_id]["status"], "ok")
        self.assertEqual(len(results[self.zone_id]["points"]), 24)

    def test_get_zone_forecast_endpoint_parameter_validation(self) -> None:
        """handle_get_zone_forecast validates UUIDs, target metrics, horizons, and model IDs."""
        hist = generate_hourly_zone_history(self.zone_id, weeks=2, seed=6)
        self.repo.set_zone_history(self.zone_id, hist)

        # 1. Invalid zone UUID
        with self.assertRaises(ValueError):
            handle_get_zone_forecast("not-a-valid-uuid", repo=self.repo)

        # 2. Unsupported target
        with self.assertRaises(ValueError):
            handle_get_zone_forecast(self.zone_id, target="invalid_metric", repo=self.repo)

        # 3. Horizon out of range
        with self.assertRaises(ValueError):
            handle_get_zone_forecast(self.zone_id, horizon_hours=0, repo=self.repo)
        with self.assertRaises(ValueError):
            handle_get_zone_forecast(self.zone_id, horizon_h=169, repo=self.repo)

        # 4. Conflicting horizon parameters
        with self.assertRaises(ValueError):
            handle_get_zone_forecast(self.zone_id, horizon_h=12, horizon_hours=24, repo=self.repo)

        # 5. Unknown model ID
        with self.assertRaises(ValueError):
            handle_get_zone_forecast(self.zone_id, model_id="unknown_model", repo=self.repo)

        # 6. Alias resolution: horizon_h=12
        res_h12 = handle_get_zone_forecast(self.zone_id, horizon_h=12, repo=self.repo)
        self.assertEqual(len(res_h12["points"]), 12)

        # 7. Alias resolution: horizon_hours=36
        res_h36 = handle_get_zone_forecast(self.zone_id, horizon_hours=36, repo=self.repo)
        self.assertEqual(len(res_h36["points"]), 36)

        # 8. Model selection: seasonal_naive_v1
        res_sn = handle_get_zone_forecast(self.zone_id, model_id="seasonal_naive_v1", repo=self.repo)
        self.assertEqual(res_sn["model_version"], "seasonal_naive_168h_v1")

    def test_get_zone_forecast_endpoint_from_timestamp_alignment(self) -> None:
        """handle_get_zone_forecast validates and floors the from timestamp correctly."""
        hist = generate_hourly_zone_history(self.zone_id, weeks=2, seed=7)
        self.repo.set_zone_history(self.zone_id, hist)

        # Timezone-aware timestamp: 14:45 local Kolkata (+05:30) -> 09:15 UTC -> floor 09:00 UTC -> +1h = 10:00 UTC
        from_ts = "2026-11-20T14:45:00+05:30"
        res = handle_get_zone_forecast(self.zone_id, from_ts=from_ts, horizon_hours=3, repo=self.repo)
        self.assertEqual(len(res["points"]), 3)
        self.assertEqual(res["points"][0]["target_ts"], "2026-11-20T10:00:00Z")
        self.assertEqual(res["points"][1]["target_ts"], "2026-11-20T11:00:00Z")
        self.assertEqual(res["points"][2]["target_ts"], "2026-11-20T12:00:00Z")

        # Invalid from_ts raises ValueError
        with self.assertRaises(ValueError):
            handle_get_zone_forecast(self.zone_id, from_ts="not-a-timestamp", repo=self.repo)

    def test_forecast_worker_auto_discovery_and_skips_invalid_uuid(self) -> None:
        """Forecast worker auto-discovers known zones and safely skips malformed UUIDs."""
        zid2 = "b2b2b2b2-2222-4222-8222-222222222222"
        self.repo.set_zone_history(self.zone_id, generate_hourly_zone_history(self.zone_id, weeks=2, seed=8))
        self.repo.set_zone_history(zid2, generate_hourly_zone_history(zid2, weeks=2, seed=9))

        # 1. Auto-discovery when zone_ids is None
        res_auto = asyncio.run(
            run_forecast_job_for_zones(zone_ids=None, repo=self.repo, notify_hub=False)
        )
        self.assertIn(self.zone_id, res_auto)
        self.assertIn(zid2, res_auto)

        # 2. Skips invalid UUID without failing other zones
        mixed_zones = ["invalid-uuid-format", self.zone_id]
        res_mixed = asyncio.run(
            run_forecast_job_for_zones(zone_ids=mixed_zones, repo=self.repo, notify_hub=False)
        )
        self.assertIn(self.zone_id, res_mixed)
        self.assertNotIn("invalid-uuid-format", res_mixed)

    def test_forecast_worker_validation_errors(self) -> None:
        """Forecast worker rejects invalid target metrics and out-of-range horizons."""
        with self.assertRaises(ValueError):
            asyncio.run(run_forecast_job_for_zones([self.zone_id], target="bad_target", repo=self.repo))

        with self.assertRaises(ValueError):
            asyncio.run(run_forecast_job_for_zones([self.zone_id], horizon_hours=0, repo=self.repo))

    def test_forecast_worker_hub_notification_event(self) -> None:
        """Forecast worker publishes forecast_updated SSE event to realtime hub."""
        from app.modules.realtime.hub import get_hub

        hist = generate_hourly_zone_history(self.zone_id, weeks=2, seed=10)
        self.repo.set_zone_history(self.zone_id, hist)

        hub = get_hub()
        channel = f"zone:{self.zone_id}"
        sub = hub.subscribe({channel})

        try:
            results = asyncio.run(
                run_forecast_job_for_zones([self.zone_id], repo=self.repo, notify_hub=True)
            )
            self.assertIn(self.zone_id, results)

            # Check that an event was delivered to the hub queue
            ev = sub.queue.get_nowait()
            self.assertEqual(ev.channel, channel)
            self.assertEqual(ev.event, "forecast_updated")
            self.assertEqual(ev.data["zone_id"], self.zone_id)
            self.assertEqual(ev.data["status"], "ok")
            self.assertEqual(ev.data["points_count"], 24)
        finally:
            hub.unsubscribe(sub)

    # ------------------------------------------------------------------------
    # 4. Edge Health & Calibration Tests
    # ------------------------------------------------------------------------

    def test_edge_health_monitor_state_transitions(self) -> None:
        """EdgeHealthMonitor tracks normal FPS, low FPS degraded state, and stream disconnect offline state."""
        cam_id = "c1a1a1a1-1111-4111-8111-111111111111"
        health = EdgeHealthMonitor(camera_id=cam_id, target_fps=10.0)

        # Nominal operation
        st_online = health.evaluate_status()
        self.assertEqual(st_online.state, "online")

        # Simulate low FPS degraded state
        health._current_fps = 2.0  # < 5.0 (50% of target)
        st_degraded = health.evaluate_status()
        self.assertEqual(st_degraded.state, "degraded")

        # Simulate camera disconnect offline state
        health.set_camera_offline(reason="rtsp_connection_reset")
        st_offline = health.evaluate_status()
        self.assertEqual(st_offline.state, "offline")

        # Build schema-compliant HealthMessage
        msg = health.build_health_message()
        self.assertEqual(msg["schema_version"], 1)
        self.assertEqual(msg["state"], "offline")
        self.assertIsNone(msg["fps"])  # FPS is null when offline
        self.assertEqual(msg["provenance"], "observed")

    def test_edge_camera_calibration_and_geometry_validation(self) -> None:
        """CameraCalibrator verifies non-degenerate polygon geometry and catches out-of-bounds vertices."""
        # 1. Valid triangle
        valid_tri = [(0.1, 0.1), (0.4, 0.1), (0.2, 0.5)]
        self.assertGreater(polygon_area(valid_tri), 0.0)
        ok, err = validate_roi_polygon(valid_tri, is_normalized=True)
        self.assertTrue(ok)
        self.assertIsNone(err)

        # 2. Out-of-bounds vertex (> 1.0)
        invalid_poly = [(0.1, 0.1), (1.5, 0.1), (0.2, 0.5)]
        ok_oob, err_oob = validate_roi_polygon(invalid_poly, is_normalized=True)
        self.assertFalse(ok_oob)
        self.assertIn("out of normalized bounds", err_oob)

        # 3. Degenerate collinear points (zero area)
        collinear = [(0.1, 0.1), (0.2, 0.2), (0.3, 0.3)]
        ok_col, err_col = validate_roi_polygon(collinear, is_normalized=True)
        self.assertFalse(ok_col)
        self.assertIn("near-zero area", err_col)

        # 4. Calibrator validation of contract ROI mapping
        calibrator = CameraCalibrator()
        roi_contract = {
            "camera_id": "c1a1a1a1-1111-4111-8111-111111111111",
            "zone_id": "a1a1a1a1-1111-4111-8111-111111111111",
            "coordinate_type": "normalized",
            "bays": [
                {
                    "bay_id": "b1a1a1a1-1111-4111-8111-111111111111",
                    "polygon": [(0.05, 0.40), (0.20, 0.40), (0.18, 0.85), (0.02, 0.85)],
                },
                {
                    "bay_id": "b2a2a2a2-2222-4222-8222-222222222222",
                    "polygon": [(0.22, 0.40), (0.37, 0.40), (0.35, 0.85), (0.20, 0.85)],
                },
            ],
        }
        report = calibrator.validate_roi_mapping(roi_contract)
        self.assertTrue(report.valid)
        self.assertEqual(report.total_bays, 2)
        self.assertEqual(len(report.errors), 0)
        self.assertEqual(report.estimated_total_area_m2, 25.0)  # 2 bays * 12.5 m2


if __name__ == "__main__":
    unittest.main()
