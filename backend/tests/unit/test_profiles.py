"""
Unit tests for simulator/profiles.py (File 154)
Tests synthetic profile mathematics, determinism, bay state stepping, and telemetry contracts.
"""

from __future__ import annotations

import unittest
import uuid
from datetime import UTC, datetime

import numpy as np
from simulator.profiles import (
    APP_TZ,
    PROFILES,
    SIMULATED_NOTICE,
    generate_crowd_message,
    generate_health_message,
    generate_occupancy_message,
    occupancy_fraction,
    pedestrian_level,
    step_bay_states,
)


class TestSimulatorProfiles(unittest.TestCase):
    def setUp(self):
        self.rng = np.random.default_rng(seed=42)

    def test_simulated_notice_present_and_explicit(self):
        """Verify SIMULATED_NOTICE clearly disclaims real-world accuracy and local data."""
        self.assertIn("SIMULATED DATA", SIMULATED_NOTICE)
        self.assertIn("Bhubaneswar", SIMULATED_NOTICE)
        self.assertIn("not demonstrate real-world accuracy", SIMULATED_NOTICE)

    def test_profile_archetypes_defined(self):
        """Verify the 4 required archetypes exist with non-empty peaks and valid properties."""
        expected_archetypes = {"commercial_core", "market", "residential", "loading_zone"}
        self.assertEqual(set(PROFILES.keys()), expected_archetypes)

        for name, profile in PROFILES.items():
            self.assertEqual(profile.name, name)
            self.assertGreaterEqual(profile.base, 0.0)
            self.assertLessEqual(profile.base, 1.0)
            self.assertGreater(len(profile.peaks), 0)
            self.assertGreater(profile.weekend_factor, 0.0)
            self.assertGreater(profile.pedestrian_per_vehicle, 0.0)

    def test_occupancy_fraction_bounds(self):
        """Test occupancy_fraction stays strictly in [0.0, 1.0] across all profiles and hours."""
        for name, profile in PROFILES.items():
            # Test throughout a weekday (e.g. Wednesday)
            for hour in range(24):
                dt_weekday = datetime(2026, 11, 25, hour, 15, tzinfo=APP_TZ)
                frac_det = occupancy_fraction(profile, dt_weekday, rng=None)
                self.assertGreaterEqual(frac_det, 0.0, f"Profile {name} hour {hour} < 0.0")
                self.assertLessEqual(frac_det, 1.0, f"Profile {name} hour {hour} > 1.0")

                # Test with noise
                frac_noise = occupancy_fraction(profile, dt_weekday, rng=self.rng)
                self.assertGreaterEqual(frac_noise, 0.0)
                self.assertLessEqual(frac_noise, 1.0)

    def test_occupancy_fraction_determinism(self):
        """Test occupancy_fraction is strictly deterministic for a fixed RNG seed or rng=None."""
        profile = PROFILES["commercial_core"]
        dt = datetime(2026, 11, 25, 14, 30, tzinfo=UTC)

        val1 = occupancy_fraction(profile, dt, rng=None)
        val2 = occupancy_fraction(profile, dt, rng=None)
        self.assertEqual(val1, val2)

        rng1 = np.random.default_rng(12345)
        rng2 = np.random.default_rng(12345)
        noisy1 = occupancy_fraction(profile, dt, rng=rng1)
        noisy2 = occupancy_fraction(profile, dt, rng=rng2)
        self.assertEqual(noisy1, noisy2)

    def test_weekend_dynamics(self):
        """Verify weekend factor lowers commercial_core and raises market occupancy."""
        dt_wednesday = datetime(2026, 11, 25, 14, 0, tzinfo=APP_TZ)  # Wednesday
        dt_saturday = datetime(2026, 11, 28, 14, 0, tzinfo=APP_TZ)   # Saturday

        comm = PROFILES["commercial_core"]
        comm_weekday = occupancy_fraction(comm, dt_wednesday, rng=None)
        comm_weekend = occupancy_fraction(comm, dt_saturday, rng=None)
        self.assertLess(comm_weekend, comm_weekday, "Commercial core should be lower on weekends")

        mkt = PROFILES["market"]
        mkt_weekday = occupancy_fraction(mkt, dt_wednesday, rng=None)
        mkt_weekend = occupancy_fraction(mkt, dt_saturday, rng=None)
        self.assertGreater(mkt_weekend, mkt_weekday, "Market should be higher on weekends")

    def test_pedestrian_level(self):
        """Test pedestrian_level calculation and independence from vehicle counts."""
        profile = PROFILES["market"]
        self.assertEqual(pedestrian_level(profile, 0), 0)

        peds_no_noise = pedestrian_level(profile, 50, rng=None)
        self.assertEqual(peds_no_noise, round(50 * profile.pedestrian_per_vehicle))

        rng1 = np.random.default_rng(999)
        rng2 = np.random.default_rng(999)
        peds1 = pedestrian_level(profile, 50, rng=rng1)
        peds2 = pedestrian_level(profile, 50, rng=rng2)
        self.assertEqual(peds1, peds2)
        self.assertGreater(peds1, 0)

    def test_step_bay_states_sparse_transition(self):
        """Verify step_bay_states transitions exactly the minimal number of bays needed."""
        bay_ids = [str(uuid.uuid4()) for _ in range(10)]
        states = {bid: "free" for bid in bay_ids}

        # Step 1: Target 40% occupancy (4 of 10 bays)
        states = step_bay_states(states, target_fraction=0.40, bay_ids=bay_ids, rng=self.rng, turnover_prob=0.0)
        occupied_count = sum(1 for s in states.values() if s == "occupied")
        self.assertEqual(occupied_count, 4)

        # Step 2: Target 70% occupancy (7 of 10 bays) -> exactly 3 more bays become occupied
        prev_occupied = {bid for bid, s in states.items() if s == "occupied"}
        states = step_bay_states(states, target_fraction=0.70, bay_ids=bay_ids, rng=self.rng, turnover_prob=0.0)
        occupied_count = sum(1 for s in states.values() if s == "occupied")
        self.assertEqual(occupied_count, 7)
        new_occupied = {bid for bid, s in states.items() if s == "occupied"}
        self.assertTrue(prev_occupied.issubset(new_occupied), "Previously occupied bays should remain occupied")

        # Step 3: Target 20% occupancy (2 of 10 bays) -> 5 bays transition to free
        states = step_bay_states(states, target_fraction=0.20, bay_ids=bay_ids, rng=self.rng, turnover_prob=0.0)
        occupied_count = sum(1 for s in states.values() if s == "occupied")
        self.assertEqual(occupied_count, 2)

    def test_generate_occupancy_message_contract(self):
        """Verify generate_occupancy_message conforms to the ParkSMART telemetry schema."""
        camera_id = uuid.uuid4()
        bays = {
            uuid.uuid4(): "occupied",
            uuid.uuid4(): "free",
        }
        custom_ts = datetime(2026, 11, 24, 7, 45, 0, tzinfo=UTC)
        msg_id = uuid.uuid4()

        payload = generate_occupancy_message(
            camera_id=camera_id,
            bay_states=bays,
            ts=custom_ts,
            msg_id=msg_id,
            confidence=0.98,
        )

        # Schema checks
        self.assertEqual(payload["schema_version"], 1)
        self.assertEqual(payload["msg_id"], str(msg_id))
        self.assertEqual(payload["ts"], "2026-11-24T07:45:00Z")
        self.assertTrue(payload["ts"].endswith("Z"))
        self.assertEqual(payload["camera_id"], str(camera_id))
        self.assertEqual(len(payload["bays"]), 2)

        for b in payload["bays"]:
            self.assertIn("bay_id", b)
            self.assertIn(b["state"], {"occupied", "free", "unknown"})
            self.assertEqual(b["confidence"], 0.98)
            # Verify bay_id is valid UUID string
            uuid.UUID(b["bay_id"])

    def test_generate_occupancy_message_validation_errors(self):
        """Verify generate_occupancy_message raises ValueError on invalid inputs."""
        camera_id = uuid.uuid4()

        # Empty bays
        with self.assertRaises(ValueError):
            generate_occupancy_message(camera_id=camera_id, bay_states={})

        # Duplicate bays list
        dup_bay = str(uuid.uuid4())
        duplicate_list = [
            {"bay_id": dup_bay, "state": "occupied"},
            {"bay_id": dup_bay, "state": "free"},
        ]
        with self.assertRaises(ValueError):
            generate_occupancy_message(camera_id=camera_id, bay_states=duplicate_list)

    def test_generate_crowd_and_health_messages(self):
        """Verify crowd and health message payloads adhere to their schemas."""
        camera_id = uuid.uuid4()
        dt = datetime(2026, 11, 24, 8, 0, 0, tzinfo=UTC)

        # Crowd Message
        crowd = generate_crowd_message(
            camera_id=camera_id,
            interval_s=300,
            vehicle_count=20,
            pedestrian_count=45,
            density_per_m2=0.15,
            ts=dt,
        )
        self.assertEqual(crowd["schema_version"], 1)
        self.assertEqual(crowd["interval_s"], 300)
        self.assertEqual(crowd["vehicle_count"], 20)
        self.assertEqual(crowd["pedestrian_count"], 45)
        self.assertEqual(crowd["density_per_m2"], 0.15)
        self.assertEqual(crowd["quality"], "ok")
        self.assertTrue(crowd["ts"].endswith("Z"))
        # Category totals must not exceed total vehicles
        self.assertLessEqual(sum(crowd["vehicle_by_category"].values()), 20)

        # Health Message
        health = generate_health_message(
            camera_id=camera_id,
            state="online",
            fps=14.5,
            uptime_s=7200,
            ts=dt,
        )
        self.assertEqual(health["schema_version"], 1)
        self.assertEqual(health["camera_id"], str(camera_id))
        self.assertEqual(health["state"], "online")
        self.assertEqual(health["fps"], 14.5)
        self.assertEqual(health["uptime_s"], 7200)
        self.assertTrue(health["ts"].endswith("Z"))


if __name__ == "__main__":
    unittest.main()
