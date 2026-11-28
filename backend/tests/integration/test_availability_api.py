"""
ParkSMART Integration Tests: Availability Estimation, Monte Carlo & Comparison API (File 206)

Verifies M1 Availability Intelligence & Downstream Forecast Integration:
1. Estimate API Contract & Invariants:
   - Status, Probability, Expected Available, Crowd Level classification
   - Truthful DataState derivation:
       * <= 120s: LIVE
       * <= 600s: STALE
       * > 600s / None: UNAVAILABLE
   - Zero/Null Policy: When probability or availability is unknown, return null, never misleading 0
   - Provenance Truthfulness: strictly 'forecast' or 'observed'
2. Dual Prediction Engine Methods:
   - Nowcast (nowcast_binomial_mc): Arrival <= 15m with LIVE telemetry uses binomial Monte Carlo
   - Forecast (forecast_timeseries_mc): Horizon arrival queries PointForecast and samples Gaussian Monte Carlo
   - Insufficient History: Returns status='unavailable', probability=None, reliability='unavailable'
3. Travel Time Estimation & Fallback:
   - Travel time adjusts estimated arrival time
   - When coordinates unavailable, falls back gracefully to requested arrival time with explanatory note
4. Multi-Zone Compare API:
   - Evaluates multiple zones and arrival slots
   - Sorts candidates by probability descending
"""

from __future__ import annotations

import asyncio
import sys
import unittest
import uuid
from datetime import UTC, datetime, timedelta
from pathlib import Path
from unittest.mock import AsyncMock, MagicMock, patch

root_dir = Path(__file__).resolve().parent.parent.parent.parent
backend_dir = root_dir / "backend"
for p in (str(root_dir), str(backend_dir)):
    if p not in sys.path:
        sys.path.insert(0, p)

from app.core.clock import set_now, utcnow
from app.modules.availability import service as avail_service
from app.schemas.common import (
    CrowdLevel,
    DataState,
    LatLon,
    PredictionStatus,
    Provenance,
    Reliability,
)
from app.schemas.forecast import (
    AvailabilityOut,
    AvailabilityRequest,
    CompareOut,
    CompareRequest,
)


class MockZoneRecord:
    def __init__(
        self,
        id: uuid.UUID | None = None,
        name: str = "Unit Test Zone",
        capacity: int = 20,
        is_active: bool = True,
    ):
        self.id = id or uuid.uuid4()
        self.name = name
        self.is_active = is_active
        self.operating_schedule = None
        self.crowd_thresholds = {
            "occupancy_pct": {"moderate": 50.0, "high": 75.0, "very_high": 90.0},
            "pedestrians": {"moderate": 25, "high": 60, "very_high": 100},
        }


class MockZoneRow:
    def __init__(self, zone: MockZoneRecord, capacity: int = 20, lat: float = 20.2961, lon: float = 85.8245):
        self.zone = zone
        self.capacity = capacity
        self.lat = lat
        self.lon = lon


class MockLiveSummary:
    def __init__(
        self,
        data_state: DataState = DataState.LIVE,
        observed_at: datetime | None = None,
        occupied: int = 5,
        available: int = 15,
        pedestrians: int | None = 10,
    ):
        self.data_state = data_state
        self.observed_at = observed_at or utcnow()
        self.occupied = occupied
        self.available = available
        self.pedestrians = pedestrians


class MockPointForecast:
    def __init__(self, center_pct: float = 60.0, sigma_pct: float = 12.0, model_version_id: str = "v1"):
        self.center_pct = center_pct
        self.sigma_pct = sigma_pct
        self.model_version_id = model_version_id


class TestAvailabilityApiIntegration(unittest.TestCase):
    """Integration verification for arrival-time availability prediction."""

    def setUp(self):
        self.sim_time = datetime(2026, 4, 15, 12, 0, 0, tzinfo=UTC)
        set_now(self.sim_time)
        self.zone_id = uuid.uuid4()
        self.zone = MockZoneRecord(self.zone_id, capacity=20)
        self.zone_row = MockZoneRow(self.zone, capacity=20)

        self.db_session = MagicMock()
        self.db_session.commit = AsyncMock()

    def tearDown(self):
        set_now(None)

    # -------------------------------------------------------------------------
    # 1. LIVE NOWCAST TESTS
    # -------------------------------------------------------------------------
    def test_estimate_near_term_nowcast_success(self):
        """Arrival within near-term window (10 min) with live data uses binomial nowcast."""
        arrival = self.sim_time + timedelta(minutes=10)
        req = AvailabilityRequest(zone_id=self.zone_id, arrival_time=arrival)

        live = MockLiveSummary(
            data_state=DataState.LIVE,
            observed_at=self.sim_time - timedelta(seconds=30),  # 30s ago -> LIVE
            occupied=8,
            available=12,
        )

        with patch("app.modules.parking.repository.get_zone_row", return_value=self.zone_row), \
             patch("app.modules.parking.service.zone_live_summary", return_value=live):

            out: AvailabilityOut = asyncio.run(avail_service.estimate(self.db_session, req, now=self.sim_time))

            self.assertEqual(out.status, PredictionStatus.OK)
            self.assertEqual(out.method, "nowcast_binomial_mc")
            self.assertEqual(out.data_state, DataState.LIVE)
            self.assertEqual(out.provenance, Provenance.FORECAST)
            self.assertIsNotNone(out.probability)
            self.assertGreaterEqual(out.probability, 0.0)
            self.assertLessEqual(out.probability, 1.0)
            self.assertIsNotNone(out.expected_available)
            self.assertGreater(out.expected_available, 0)
            self.assertEqual(out.data_freshness_s, 30)

    # -------------------------------------------------------------------------
    # 2. TIME-SERIES FORECAST HORIZON TESTS
    # -------------------------------------------------------------------------
    def test_estimate_future_horizon_forecast(self):
        """Arrival 4 hours in the future triggers time-series point forecast."""
        arrival = self.sim_time + timedelta(hours=4)
        req = AvailabilityRequest(zone_id=self.zone_id, arrival_time=arrival)

        live = MockLiveSummary(
            data_state=DataState.LIVE,
            observed_at=self.sim_time - timedelta(seconds=45),
            occupied=10,
            available=10,
        )
        pt_forecast = MockPointForecast(center_pct=45.0, sigma_pct=10.0)

        with patch("app.modules.parking.repository.get_zone_row", return_value=self.zone_row), \
             patch("app.modules.parking.service.zone_live_summary", return_value=live), \
             patch("app.modules.forecast.service.point_forecast", return_value=pt_forecast):

            out: AvailabilityOut = asyncio.run(avail_service.estimate(self.db_session, req, now=self.sim_time))

            self.assertEqual(out.status, PredictionStatus.OK)
            self.assertEqual(out.method, "forecast_timeseries_mc")
            self.assertEqual(out.provenance, Provenance.FORECAST)
            self.assertIsNotNone(out.probability)
            self.assertGreater(out.probability, 0.5)  # 45% occupancy on 20 capacity -> high prob
            self.assertIsNotNone(out.uncertainty)
            self.assertIn("ci_lower_pct", out.uncertainty)
            self.assertIn("ci_upper_pct", out.uncertainty)

    # -------------------------------------------------------------------------
    # 3. DATA FRESHNESS & DATA STATE DERIVATION
    # -------------------------------------------------------------------------
    def test_data_state_derivation_freshness_thresholds(self):
        """
        Derives DataState correctly based on observed_at:
        <= 120s: LIVE
        <= 600s: STALE
        > 600s: UNAVAILABLE
        """
        from app.modules.parking.service import derive_data_state

        now_t = self.sim_time
        # 60s ago -> LIVE
        self.assertEqual(derive_data_state(now_t - timedelta(seconds=60), now_t), DataState.LIVE)
        # 120s ago -> LIVE (boundary)
        self.assertEqual(derive_data_state(now_t - timedelta(seconds=120), now_t), DataState.LIVE)
        # 121s ago -> STALE
        self.assertEqual(derive_data_state(now_t - timedelta(seconds=121), now_t), DataState.STALE)
        # 500s ago -> STALE
        self.assertEqual(derive_data_state(now_t - timedelta(seconds=500), now_t), DataState.STALE)
        # 601s ago -> UNAVAILABLE
        self.assertEqual(derive_data_state(now_t - timedelta(seconds=601), now_t), DataState.UNAVAILABLE)
        # None -> UNAVAILABLE
        self.assertEqual(derive_data_state(None, now_t), DataState.UNAVAILABLE)

    # -------------------------------------------------------------------------
    # 4. INSUFFICIENT HISTORY & ZERO/NULL POLICY
    # -------------------------------------------------------------------------
    def test_insufficient_history_returns_unavailable_nulls(self):
        """
        When point_forecast returns None (insufficient data), system returns
        status='unavailable' with nulls for probability and availability (Zero/Null policy).
        """
        arrival = self.sim_time + timedelta(hours=5)
        req = AvailabilityRequest(zone_id=self.zone_id, arrival_time=arrival)

        live = MockLiveSummary(data_state=DataState.STALE, observed_at=self.sim_time - timedelta(seconds=200))

        with patch("app.modules.parking.repository.get_zone_row", return_value=self.zone_row), \
             patch("app.modules.parking.service.zone_live_summary", return_value=live), \
             patch("app.modules.forecast.service.point_forecast", return_value=None):

            out: AvailabilityOut = asyncio.run(avail_service.estimate(self.db_session, req, now=self.sim_time))

            self.assertEqual(out.status, PredictionStatus.UNAVAILABLE)
            self.assertIsNone(out.probability, "Probability must be None, never misleading 0")
            self.assertIsNone(out.expected_available, "Expected available must be None, never 0")
            self.assertEqual(out.reliability, Reliability.UNAVAILABLE)
            self.assertEqual(out.crowd_level, CrowdLevel.UNKNOWN)

    # -------------------------------------------------------------------------
    # 5. TRAVEL TIME ESTIMATION & FALLBACK
    # -------------------------------------------------------------------------
    def test_travel_time_adjusts_arrival_time(self):
        """With use_travel_time=True, estimated_arrival_time incorporates travel duration."""
        requested = self.sim_time + timedelta(minutes=5)
        origin = LatLon(lat=20.2500, lon=85.8000)
        req = AvailabilityRequest(
            zone_id=self.zone_id,
            arrival_time=requested,
            origin=origin,
            use_travel_time=True,
        )

        live = MockLiveSummary(data_state=DataState.LIVE)

        # Mock travel time returning 900 seconds (15 min)
        async def mock_travel_time(orig, dest):
            return 900

        with patch("app.modules.parking.repository.get_zone_row", return_value=self.zone_row), \
             patch("app.modules.parking.service.zone_live_summary", return_value=live), \
             patch("app.modules.availability.travel_time.estimate_travel_time_s", side_effect=mock_travel_time):

            out = asyncio.run(avail_service.estimate(self.db_session, req, now=self.sim_time))

            # Estimated arrival should be requested + 15 min
            expected_arrival = requested + timedelta(seconds=900)
            self.assertEqual(out.requested_arrival_time, requested)
            self.assertEqual(out.estimated_arrival_time, expected_arrival)

    def test_travel_time_service_unavailable_fallback(self):
        """When travel time fails, graceful fallback to requested time with note in response."""
        requested = self.sim_time + timedelta(minutes=10)
        origin = LatLon(lat=20.2500, lon=85.8000)
        req = AvailabilityRequest(
            zone_id=self.zone_id,
            arrival_time=requested,
            origin=origin,
            use_travel_time=True,
        )

        live = MockLiveSummary(data_state=DataState.LIVE)

        # Mock travel time returning None (fallback)
        async def mock_travel_time_fail(orig, dest):
            return None

        with patch("app.modules.parking.repository.get_zone_row", return_value=self.zone_row), \
             patch("app.modules.parking.service.zone_live_summary", return_value=live), \
             patch("app.modules.availability.travel_time.estimate_travel_time_s", side_effect=mock_travel_time_fail):

            out = asyncio.run(avail_service.estimate(self.db_session, req, now=self.sim_time))

            # Falls back to requested time
            self.assertEqual(out.estimated_arrival_time, requested)

    # -------------------------------------------------------------------------
    # 6. MULTI-ZONE COMPARISON API
    # -------------------------------------------------------------------------
    def test_compare_api_ranks_candidates_by_probability(self):
        """Compare API evaluates multiple zones and sorts by availability probability descending."""
        zone_id_1 = uuid.uuid4()
        zone_id_2 = uuid.uuid4()

        req = CompareRequest(
            zone_ids=[zone_id_1, zone_id_2],
            arrival_time=self.sim_time + timedelta(minutes=10),
        )

        out_1 = AvailabilityOut(
            zone_id=zone_id_1,
            status=PredictionStatus.OK,
            probability=0.45,
            expected_available=3,
            expected_occupancy_pct=85.0,
            crowd_level=CrowdLevel.HIGH,
            requested_arrival_time=self.sim_time + timedelta(minutes=10),
            estimated_arrival_time=self.sim_time + timedelta(minutes=10),
            generated_at=self.sim_time,
            data_freshness_s=30,
            data_state=DataState.LIVE,
            reliability=Reliability.MEDIUM,
            method="nowcast_binomial_mc",
            provenance=Provenance.FORECAST,
        )

        out_2 = AvailabilityOut(
            zone_id=zone_id_2,
            status=PredictionStatus.OK,
            probability=0.92,
            expected_available=14,
            expected_occupancy_pct=30.0,
            crowd_level=CrowdLevel.LOW,
            requested_arrival_time=self.sim_time + timedelta(minutes=10),
            estimated_arrival_time=self.sim_time + timedelta(minutes=10),
            generated_at=self.sim_time,
            data_freshness_s=25,
            data_state=DataState.LIVE,
            reliability=Reliability.MEDIUM,
            method="nowcast_binomial_mc",
            provenance=Provenance.FORECAST,
        )

        async def mock_estimate(db, candidate_req, now=None):
            if candidate_req.zone_id == zone_id_1:
                return out_1
            return out_2

        with patch("app.modules.availability.service.estimate", side_effect=mock_estimate):
            res: CompareOut = asyncio.run(avail_service.compare(self.db_session, req))

            self.assertEqual(len(res.ranked), 2)
            # Candidate 2 (prob=0.92) must be ranked first
            self.assertEqual(res.ranked[0].zone_id, zone_id_2)
            self.assertEqual(res.ranked[0].probability, 0.92)
            # Candidate 1 (prob=0.45) ranked second
            self.assertEqual(res.ranked[1].zone_id, zone_id_1)
            self.assertEqual(res.ranked[1].probability, 0.45)


if __name__ == "__main__":
    unittest.main()
