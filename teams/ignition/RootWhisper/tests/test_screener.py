"""Unit tests for Random Forest baseline model and screening logic using standard unittest."""

import sys
import unittest
from pathlib import Path
from datetime import datetime, timezone

BASE_DIR = Path(__file__).resolve().parent.parent
if str(BASE_DIR) not in sys.path:
    sys.path.insert(0, str(BASE_DIR))

from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker

from backend.app.database import Base
from backend.app.models.device import Device
from backend.app.models.telemetry import Telemetry
from backend.app.models.screening import ScreeningResult
from backend.app.services.screener import evaluate_water_stress
from ml_engine.baseline_trainer import (
    train_plant_baseline,
    CORE_FEATURES,
    TARGET_COLUMN
)


class TestScreener(unittest.TestCase):
    def setUp(self):
        self.engine = create_engine("sqlite:///:memory:")
        Base.metadata.create_all(bind=self.engine)
        Session = sessionmaker(bind=self.engine)
        self.db = Session()

    def tearDown(self):
        self.db.close()

    def test_soil_moisture_strictly_excluded_from_model_features(self):
        """Verify strictly that soil moisture is NOT an input feature to the Random Forest model."""
        self.assertNotIn("soil_moisture_raw", CORE_FEATURES)
        self.assertNotIn("soil_moisture_pct", CORE_FEATURES)
        self.assertIn("ambient_temp_c", CORE_FEATURES)
        self.assertIn("ambient_humidity_pct", CORE_FEATURES)
        self.assertIn("light_lux", CORE_FEATURES)
        self.assertEqual(TARGET_COLUMN, "leaf_temp_c")

    def test_invalid_telemetry_produces_inconclusive(self):
        device = Device(
            device_id="TULSI_01",
            plant_name="Tulsi",
            species="Ocimum",
            provisional_temp_residual_threshold_c=1.5,
            provisional_soil_dry_threshold_pct=35.0,
            persistence_window_size=5
        )
        self.db.add(device)
        self.db.commit()

        telemetry = Telemetry(
            device_id="TULSI_01",
            timestamp=datetime.now(timezone.utc),
            soil_moisture_raw=0,
            soil_moisture_pct=0.0,
            leaf_temp_c=-99.0,
            ambient_temp_c=25.0,
            ambient_humidity_pct=60.0,
            light_lux=1000.0,
            quality_status="INVALID",
            is_simulated=True
        )
        self.db.add(telemetry)
        self.db.commit()

        res = evaluate_water_stress(
            db=self.db,
            device=device,
            telemetry=telemetry,
            quality_status="INVALID",
            quality_issues=["MLX90614 disconnected"]
        )

        self.assertEqual(res.screening_output, "INCONCLUSIVE")
        self.assertIn("Data Quality Fault", res.scientific_reason)
        self.assertIsNone(res.expected_leaf_temp_c)
        self.assertIsNone(res.residual_c)

    def test_low_light_produces_inconclusive(self):
        """Low-light / nighttime conditions must produce INCONCLUSIVE because stomata are closed."""
        device = Device(
            device_id="TULSI_01",
            plant_name="Tulsi",
            species="Ocimum",
            provisional_temp_residual_threshold_c=1.5,
            provisional_soil_dry_threshold_pct=35.0,
            persistence_window_size=5
        )
        self.db.add(device)
        self.db.commit()

        telemetry = Telemetry(
            device_id="TULSI_01",
            timestamp=datetime.now(timezone.utc),
            soil_moisture_raw=2200,
            soil_moisture_pct=50.0,
            leaf_temp_c=25.0,
            ambient_temp_c=25.0,
            ambient_humidity_pct=60.0,
            light_lux=20.0,  # Below 50 lux
            quality_status="VALID",
            is_simulated=True
        )
        self.db.add(telemetry)
        self.db.commit()

        res = evaluate_water_stress(
            db=self.db,
            device=device,
            telemetry=telemetry,
            quality_status="VALID",
            quality_issues=[]
        )

        self.assertEqual(res.screening_output, "INCONCLUSIVE")
        self.assertIn("Low-light", res.scientific_reason)
        self.assertIsNone(res.expected_leaf_temp_c)

    def test_soil_dry_alone_is_not_stress(self):
        """
        SCIENTIFIC INTEGRITY: Reduced watering alone must NOT be interpreted as confirmed
        physiological stress if transpirational cooling is still functioning normally.
        """
        device = Device(
            device_id="TULSI_01",
            plant_name="Tulsi",
            species="Ocimum",
            provisional_temp_residual_threshold_c=1.5,
            provisional_soil_dry_threshold_pct=35.0,
            persistence_window_size=5
        )
        self.db.add(device)
        self.db.commit()

        # Train baseline
        baseline_records = [
            {"ambient_temp_c": 28.0 + (i * 0.1), "ambient_humidity_pct": 55.0 - (i * 0.2), "light_lux": 5000.0, "leaf_temp_c": 27.0 + (i * 0.1)}
            for i in range(20)
        ]
        train_plant_baseline("TULSI_01", baseline_records)

        # Telemetry with low soil moisture (20% < 35%), but NORMAL leaf temp (27.0°C ~ expected 27.0°C)
        telemetry = Telemetry(
            device_id="TULSI_01",
            timestamp=datetime.now(timezone.utc),
            soil_moisture_raw=2900,
            soil_moisture_pct=20.0,  # Low!
            leaf_temp_c=27.0,         # Normal!
            ambient_temp_c=28.0,
            ambient_humidity_pct=55.0,
            light_lux=5000.0,
            quality_status="VALID",
            is_simulated=True
        )
        self.db.add(telemetry)
        self.db.commit()

        res = evaluate_water_stress(self.db, device, telemetry, "VALID", [])
        self.assertEqual(res.screening_output, "NORMAL")
        self.assertIn("reduced soil watering alone does not constitute physiological stress", res.scientific_reason.lower())

    def test_isolated_spike_does_not_trigger_stress(self):
        """Isolated single thermal elevation is classified as NORMAL (transient anomaly)."""
        device = Device(
            device_id="HIBISCUS_01",
            plant_name="Hibiscus",
            species="Hibiscus",
            provisional_temp_residual_threshold_c=1.0,
            provisional_soil_dry_threshold_pct=40.0,
            persistence_window_size=5
        )
        self.db.add(device)
        self.db.commit()

        baseline_records = [
            {"ambient_temp_c": 28.0 + (i * 0.1), "ambient_humidity_pct": 55.0 - (i * 0.2), "light_lux": 5000.0, "leaf_temp_c": 26.0 + (i * 0.1)}
            for i in range(20)
        ]
        train_plant_baseline("HIBISCUS_01", baseline_records)

        # Ingest 4 normal cycles
        for _ in range(4):
            t = Telemetry(
                device_id="HIBISCUS_01",
                timestamp=datetime.now(timezone.utc),
                soil_moisture_raw=2200,
                soil_moisture_pct=50.0,
                leaf_temp_c=26.0,
                ambient_temp_c=28.0,
                ambient_humidity_pct=55.0,
                light_lux=5000.0,
                quality_status="VALID",
                is_simulated=True
            )
            self.db.add(t)
            self.db.commit()
            evaluate_water_stress(self.db, device, t, "VALID", [])

        # Ingest 1 isolated spike
        spike = Telemetry(
            device_id="HIBISCUS_01",
            timestamp=datetime.now(timezone.utc),
            soil_moisture_raw=2800,
            soil_moisture_pct=25.0,
            leaf_temp_c=31.0,  # +5°C spike!
            ambient_temp_c=28.0,
            ambient_humidity_pct=55.0,
            light_lux=5000.0,
            quality_status="VALID",
            is_simulated=True
        )
        self.db.add(spike)
        self.db.commit()

        res = evaluate_water_stress(self.db, device, spike, "VALID", [])
        self.assertEqual(res.screening_output, "NORMAL")
        self.assertIn("transient", res.scientific_reason.lower())

    def test_persistent_stress_triggers_alert(self):
        """When canopy temperature is elevated >= 3 consecutive cycles AND soil is dry -> POSSIBLE WATER-STRESS INDICATION."""
        device = Device(
            device_id="HIBISCUS_01",
            plant_name="Hibiscus",
            species="Hibiscus",
            provisional_temp_residual_threshold_c=1.0,
            provisional_soil_dry_threshold_pct=40.0,
            persistence_window_size=5
        )
        self.db.add(device)
        self.db.commit()

        baseline_records = [
            {"ambient_temp_c": 28.0 + (i * 0.1), "ambient_humidity_pct": 55.0 - (i * 0.2), "light_lux": 5000.0, "leaf_temp_c": 26.0 + (i * 0.1)}
            for i in range(20)
        ]
        train_plant_baseline("HIBISCUS_01", baseline_records)

        # Ingest 3 consecutive elevated cycles with dry soil (22%)
        res = None
        for i in range(3):
            t = Telemetry(
                device_id="HIBISCUS_01",
                timestamp=datetime.now(timezone.utc),
                soil_moisture_raw=2900,
                soil_moisture_pct=22.0,  # Dry!
                leaf_temp_c=31.5,         # Elevated (+5.5°C residual)!
                ambient_temp_c=28.0,
                ambient_humidity_pct=55.0,
                light_lux=5000.0,
                quality_status="VALID",
                is_simulated=True
            )
            self.db.add(t)
            self.db.commit()
            res = evaluate_water_stress(self.db, device, t, "VALID", [])

        self.assertIsNotNone(res)
        self.assertEqual(res.screening_output, "POSSIBLE WATER-STRESS INDICATION")
        self.assertGreaterEqual(res.consecutive_elevated_count, 3)
        self.assertGreater(res.residual_c, 1.0)
        self.assertIn("Persistent canopy transpirational cooling deficit", res.scientific_reason)


if __name__ == "__main__":
    unittest.main(verbosity=2)
