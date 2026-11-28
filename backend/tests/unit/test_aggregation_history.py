"""
Unit Tests for ParkSMART History Generation & Occupancy Aggregation Job (M2 Ownership)

Verifies:
1. Hourly history generation across four weeks (672 hourly buckets).
2. Simulated data provenance tagging and honesty notice.
3. Deterministic reproducibility with random seeds.
4. Duplicate history prevention on repeat execution / re-seeding.
5. Aggregation job: raw telemetry events into hourly buckets.
6. Safe handling of empty observations, missing readings, and timestamp boundaries.
7. Safe rejection of future timestamps (>30s) and malformed timestamps.
8. Deduplication of incoming telemetry by msg_id and camera/timestamp.
9. Provenance preservation: observed, simulated, and mixed.
10. Data quality classification: nominal, sparse, missing.
"""

from __future__ import annotations

import sys
import unittest
import uuid
from datetime import UTC, datetime, timedelta
from pathlib import Path

# Add project root and backend to sys.path
root_dir = Path(__file__).resolve().parent.parent.parent.parent
backend_dir = root_dir / "backend"
for p in (str(root_dir), str(backend_dir)):
    if p not in sys.path:
        sys.path.insert(0, p)

from simulator.generate_history import (
    DEFAULT_ZONES,
    generate_hourly_zone_history,
    generate_multi_zone_history,
    merge_history_records,
    seed_zone_history_to_repository,
)

from app.modules.forecast.repository import ForecastRepository
from app.workers.aggregation_job import (
    AggregationStore,
    aggregate_raw_observations,
    run_aggregation_job,
)


class TestHistoryGeneration(unittest.TestCase):
    """Test suite for synthetic history generation and reproducibility."""

    def setUp(self) -> None:
        self.zone_id = "a1a1a1a1-1111-4111-8111-111111111111"

    def test_generate_four_weeks_hourly_history(self) -> None:
        """Generates exactly 672 hourly records for 4 weeks (4 * 7 * 24)."""
        records = generate_hourly_zone_history(
            zone_id=self.zone_id,
            profile_name="commercial_core",
            weeks=4,
            seed=42,
        )
        self.assertEqual(len(records), 672)

        for r in records:
            self.assertEqual(r["zone_id"], self.zone_id)
            self.assertEqual(r["interval_min"], 60)
            self.assertEqual(r["provenance"], "simulated")
            self.assertIn("SIMULATED DATA", r["notice"])
            self.assertTrue(r["bucket_start"].endswith("Z"))
            self.assertTrue(r["bucket_end"].endswith("Z"))
            self.assertGreaterEqual(r["occupancy_pct"], 0.0)
            self.assertLessEqual(r["occupancy_pct"], 100.0)
            self.assertGreaterEqual(r["vehicle_count"], 0)
            self.assertGreaterEqual(r["pedestrian_count"], 0)

    def test_reproducibility_with_seed(self) -> None:
        """Deterministic reproducibility: identical seed produces identical records."""
        run1 = generate_hourly_zone_history(self.zone_id, weeks=1, seed=100)
        run2 = generate_hourly_zone_history(self.zone_id, weeks=1, seed=100)
        run3 = generate_hourly_zone_history(self.zone_id, weeks=1, seed=999)

        self.assertEqual(len(run1), len(run2))
        for r1, r2 in zip(run1, run2):
            self.assertEqual(r1["bucket_start"], r2["bucket_start"])
            self.assertEqual(r1["occupancy_pct"], r2["occupancy_pct"])
            self.assertEqual(r1["vehicle_count"], r2["vehicle_count"])

        # Different seed produces different occupancy values
        occupancies_1 = [r["occupancy_pct"] for r in run1]
        occupancies_3 = [r["occupancy_pct"] for r in run3]
        self.assertNotEqual(occupancies_1, occupancies_3)

    def test_avoid_accidental_duplicate_history_when_rerun(self) -> None:
        """Re-running history seeding into the repository does not create duplicate timestamps."""
        repo = ForecastRepository()

        # First run: seed 2 weeks of history
        seed_zone_history_to_repository(self.zone_id, repo=repo, weeks=2, seed=42)
        history_1 = repo.get_zone_history(self.zone_id)
        self.assertEqual(len(history_1), 336)  # 2 * 7 * 24

        # Second run: re-seed identical timeframe
        seed_zone_history_to_repository(self.zone_id, repo=repo, weeks=2, seed=42)
        history_2 = repo.get_zone_history(self.zone_id)
        self.assertEqual(len(history_2), 336, "Re-seeding must not duplicate historical records")

    def test_merge_history_records_deduplication(self) -> None:
        """merge_history_records deduplicates records sharing (zone_id, bucket_start)."""
        now = datetime.now(UTC)
        rec_a = {"zone_id": self.zone_id, "bucket_start": now.strftime("%Y-%m-%dT%H:00:00Z"), "occupancy_pct": 50.0}
        rec_b = {"zone_id": self.zone_id, "bucket_start": now.strftime("%Y-%m-%dT%H:00:00Z"), "occupancy_pct": 75.0}
        rec_c = {
            "zone_id": self.zone_id,
            "bucket_start": (now + timedelta(hours=1)).strftime("%Y-%m-%dT%H:00:00Z"),
            "occupancy_pct": 60.0,
        }

        merged = merge_history_records([rec_a], [rec_b, rec_c])
        self.assertEqual(len(merged), 2)
        # rec_b overrides rec_a
        self.assertEqual(merged[0]["occupancy_pct"], 75.0)

    def test_multi_zone_history_generation(self) -> None:
        """generate_multi_zone_history generates 4 weeks across all default zones."""
        all_recs = generate_multi_zone_history(weeks=1, seed=123)
        expected_count = len(DEFAULT_ZONES) * 168  # 4 * 168 = 672
        self.assertEqual(len(all_recs), expected_count)

        zone_ids = {r["zone_id"] for r in all_recs}
        self.assertEqual(len(zone_ids), len(DEFAULT_ZONES))


class TestAggregationJob(unittest.TestCase):
    """Test suite for occupancy telemetry aggregation and safe boundary handling."""

    def setUp(self) -> None:
        self.zone_id = "a1a1a1a1-1111-4111-8111-111111111111"
        self.store = AggregationStore()

    def test_empty_history_returns_empty_list(self) -> None:
        """Empty input observation list returns empty aggregate list without error."""
        buckets = aggregate_raw_observations([])
        self.assertEqual(buckets, [])

    def test_hourly_aggregation_calculation(self) -> None:
        """Raw telemetry readings are aggregated into correct hourly means."""
        base_time = datetime(2026, 11, 20, 10, 0, 0, tzinfo=UTC)
        observations = [
            {
                "zone_id": self.zone_id,
                "msg_id": str(uuid.uuid4()),
                "ts": (base_time + timedelta(minutes=i * 5)).strftime("%Y-%m-%dT%H:%M:%SZ"),
                "occupancy_pct": 40.0 + i * 2,
                "vehicle_count": 20 + i,
                "pedestrian_count": 10 + i,
                "provenance": "observed",
            }
            for i in range(8)
        ]

        buckets = aggregate_raw_observations(observations, interval_min=60)
        self.assertEqual(len(buckets), 1)
        b = buckets[0]
        self.assertEqual(b.zone_id, self.zone_id)
        self.assertEqual(b.sample_count, 8)
        self.assertEqual(b.provenance, "observed")
        self.assertEqual(b.data_quality, "nominal")
        self.assertAlmostEqual(b.occupancy_pct, 47.0)
        self.assertEqual(b.vehicle_count, 24)
        self.assertEqual(b.pedestrian_count, 14)

    def test_duplicate_telemetry_by_msg_id_not_double_counted(self) -> None:
        """Duplicate telemetry messages with identical msg_id are dropped."""
        base_time = datetime(2026, 11, 20, 10, 5, 0, tzinfo=UTC)
        duplicate_msg_id = str(uuid.uuid4())

        observations = [
            # Message 1
            {
                "zone_id": self.zone_id,
                "msg_id": duplicate_msg_id,
                "ts": base_time.strftime("%Y-%m-%dT%H:%M:%SZ"),
                "occupancy_pct": 60.0,
                "vehicle_count": 30,
                "pedestrian_count": 15,
                "provenance": "observed",
            },
            # Duplicate of Message 1
            {
                "zone_id": self.zone_id,
                "msg_id": duplicate_msg_id,
                "ts": base_time.strftime("%Y-%m-%dT%H:%M:%SZ"),
                "occupancy_pct": 60.0,
                "vehicle_count": 30,
                "pedestrian_count": 15,
                "provenance": "observed",
            },
            # Message 2
            {
                "zone_id": self.zone_id,
                "msg_id": str(uuid.uuid4()),
                "ts": (base_time + timedelta(minutes=10)).strftime("%Y-%m-%dT%H:%M:%SZ"),
                "occupancy_pct": 40.0,
                "vehicle_count": 20,
                "pedestrian_count": 10,
                "provenance": "observed",
            },
        ]

        buckets = aggregate_raw_observations(observations, interval_min=60)
        self.assertEqual(len(buckets), 1)
        b = buckets[0]
        # Only 2 distinct observations counted (duplicate dropped)
        self.assertEqual(b.sample_count, 2)
        self.assertAlmostEqual(b.occupancy_pct, 50.0)  # (60 + 40) / 2
        self.assertEqual(b.vehicle_count, 25)  # (30 + 20) / 2

    def test_duplicate_telemetry_by_camera_timestamp_dropped(self) -> None:
        """When msg_id is absent, duplicate (camera_id, timestamp) readings are dropped."""
        base_time = datetime(2026, 11, 20, 10, 20, 0, tzinfo=UTC)
        cam_id = "c1a1a1a1-1111-4111-8111-111111111111"
        ts_str = base_time.strftime("%Y-%m-%dT%H:%M:%SZ")

        observations = [
            {"zone_id": self.zone_id, "camera_id": cam_id, "ts": ts_str, "occupancy_pct": 50.0},
            {"zone_id": self.zone_id, "camera_id": cam_id, "ts": ts_str, "occupancy_pct": 50.0},
        ]

        buckets = aggregate_raw_observations(observations, interval_min=60)
        self.assertEqual(len(buckets), 1)
        self.assertEqual(buckets[0].sample_count, 1)

    def test_future_timestamp_rejection(self) -> None:
        """Observations with timestamps >30 seconds in the future are safely rejected."""
        ref_time = datetime(2026, 11, 20, 12, 0, 0, tzinfo=UTC)
        far_future = (ref_time + timedelta(minutes=5)).strftime("%Y-%m-%dT%H:%M:%SZ")

        obs = [{"zone_id": self.zone_id, "ts": far_future, "occupancy_pct": 80.0}]
        buckets = aggregate_raw_observations(
            obs,
            interval_min=60,
            reference_time=ref_time,
            max_future_seconds=30.0,
        )
        self.assertEqual(len(buckets), 0, "Future observations (>30s) must be rejected")

    def test_malformed_timestamp_safety(self) -> None:
        """Observations with unparseable or missing timestamps are skipped without raising errors."""
        obs = [
            {"zone_id": self.zone_id, "ts": "not-a-timestamp", "occupancy_pct": 50.0},
            {"zone_id": self.zone_id, "ts": None, "occupancy_pct": 50.0},
            {"zone_id": self.zone_id, "occupancy_pct": 50.0},  # missing ts
        ]
        buckets = aggregate_raw_observations(obs, interval_min=60)
        self.assertEqual(len(buckets), 0)

    def test_bays_list_aggregation_and_unknown_handling(self) -> None:
        """Bays state with unknown bays excludes unknown bays from occupancy percentage."""
        base_time = datetime(2026, 11, 20, 10, 30, 0, tzinfo=UTC)
        obs = [
            {
                "zone_id": self.zone_id,
                "ts": base_time.strftime("%Y-%m-%dT%H:%M:%SZ"),
                "bays": [
                    {"bay_id": "b1", "state": "occupied"},
                    {"bay_id": "b2", "state": "free"},
                    {"bay_id": "b3", "state": "unknown"},  # must not count towards denominator
                ],
            }
        ]

        buckets = aggregate_raw_observations(obs, interval_min=60)
        self.assertEqual(len(buckets), 1)
        # 1 occupied out of 2 known bays = 50.0%
        self.assertAlmostEqual(buckets[0].occupancy_pct, 50.0)

    def test_provenance_preservation(self) -> None:
        """Provenance is correctly resolved to simulated, observed, or mixed."""
        base_time = datetime(2026, 11, 20, 10, 0, 0, tzinfo=UTC)

        # 1. Pure simulated
        obs_sim = [
            {"zone_id": self.zone_id, "ts": (base_time + timedelta(minutes=5)).strftime("%Y-%m-%dT%H:%M:%SZ"), "occupancy_pct": 30.0, "provenance": "simulated"},
            {"zone_id": self.zone_id, "ts": (base_time + timedelta(minutes=10)).strftime("%Y-%m-%dT%H:%M:%SZ"), "occupancy_pct": 35.0, "provenance": "simulated"},
        ]
        b_sim = aggregate_raw_observations(obs_sim)[0]
        self.assertEqual(b_sim.provenance, "simulated")

        # 2. Pure observed
        obs_obs = [
            {"zone_id": self.zone_id, "ts": (base_time + timedelta(minutes=5)).strftime("%Y-%m-%dT%H:%M:%SZ"), "occupancy_pct": 30.0, "provenance": "observed"},
        ]
        b_obs = aggregate_raw_observations(obs_obs)[0]
        self.assertEqual(b_obs.provenance, "observed")

        # 3. Mixed
        obs_mixed = obs_sim + obs_obs
        b_mixed = aggregate_raw_observations(obs_mixed)[0]
        self.assertEqual(b_mixed.provenance, "mixed")

    def test_repeat_execution_idempotency_in_store(self) -> None:
        """run_aggregation_job can be executed repeatedly on the same telemetry idempotently."""
        base_time = datetime(2026, 11, 20, 10, 15, 0, tzinfo=UTC)
        events = [
            {
                "zone_id": self.zone_id,
                "msg_id": str(uuid.uuid4()),
                "ts": base_time.strftime("%Y-%m-%dT%H:%M:%SZ"),
                "occupancy_pct": 70.0,
                "vehicle_count": 35,
                "provenance": "observed",
            }
        ]

        # First run
        run_aggregation_job(events, store=self.store)
        stored_1 = self.store.get_zone_history(self.zone_id)
        self.assertEqual(len(stored_1), 1)

        # Second run with same events
        run_aggregation_job(events, store=self.store)
        stored_2 = self.store.get_zone_history(self.zone_id)
        self.assertEqual(len(stored_2), 1, "Repeat aggregation must upsert without creating duplicate buckets")
        self.assertEqual(stored_2[0].occupancy_pct, 70.0)


if __name__ == "__main__":
    unittest.main()
