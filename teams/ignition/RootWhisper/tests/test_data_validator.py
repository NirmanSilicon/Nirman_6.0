"""Unit tests for sensor data validation and probe calibration using standard unittest."""

import sys
import unittest
from pathlib import Path

BASE_DIR = Path(__file__).resolve().parent.parent
if str(BASE_DIR) not in sys.path:
    sys.path.insert(0, str(BASE_DIR))

from backend.app.services.data_validator import calibrate_soil_moisture, validate_telemetry_payload
from backend.app.schemas.telemetry import (
    TelemetryIngestRequest,
    SensorReadingsPayload,
    SensorDiagnosticsPayload
)
from backend.app.models.device import Device


class TestDataValidator(unittest.TestCase):
    def test_soil_probe_calibration(self):
        dry_adc = 3200
        wet_adc = 1400

        self.assertEqual(calibrate_soil_moisture(3200, dry_adc, wet_adc), 0.0)
        self.assertEqual(calibrate_soil_moisture(1400, dry_adc, wet_adc), 100.0)
        self.assertEqual(calibrate_soil_moisture(2300, dry_adc, wet_adc), 50.0)
        self.assertEqual(calibrate_soil_moisture(3500, dry_adc, wet_adc), 0.0)
        self.assertEqual(calibrate_soil_moisture(1000, dry_adc, wet_adc), 100.0)

    def test_hardware_disconnection_triggers_invalid(self):
        device = Device(
            device_id="TULSI_01",
            plant_name="Tulsi",
            species="Ocimum",
            soil_dry_adc=3200,
            soil_wet_adc=1400
        )
        
        payload = TelemetryIngestRequest(
            device_id="TULSI_01",
            readings=SensorReadingsPayload(
                soil_moisture_raw=2300,
                leaf_temp_c=25.0,
                ambient_temp_c=26.0,
                ambient_humidity_pct=60.0,
                light_lux=1000.0
            ),
            diagnostics=SensorDiagnosticsPayload(
                mlx_connected=False,  # Fault!
                aht_connected=True,
                bh1750_connected=True,
                soil_sensor_valid=True
            )
        )

        status, issues, soil_pct = validate_telemetry_payload(payload, device)
        self.assertEqual(status, "INVALID")
        self.assertTrue(any("MLX90614" in issue for issue in issues))

    def test_physical_bounds_sanity_check(self):
        device = Device(
            device_id="HIBISCUS_01",
            plant_name="Hibiscus",
            species="Hibiscus",
            soil_dry_adc=3150,
            soil_wet_adc=1380
        )

        payload = TelemetryIngestRequest(
            device_id="HIBISCUS_01",
            readings=SensorReadingsPayload(
                soil_moisture_raw=2300,
                leaf_temp_c=150.0,  # Physically impossible
                ambient_temp_c=28.0,
                ambient_humidity_pct=50.0,
                light_lux=5000.0
            ),
            diagnostics=SensorDiagnosticsPayload()
        )

        status, issues, _ = validate_telemetry_payload(payload, device)
        self.assertEqual(status, "INVALID")
        self.assertTrue(any("outside physical range" in issue for issue in issues))

    def test_low_light_night_condition(self):
        device = Device(
            device_id="MONEYPLANT_01",
            plant_name="Money Plant",
            species="Epipremnum",
            soil_dry_adc=3250,
            soil_wet_adc=1420
        )

        payload = TelemetryIngestRequest(
            device_id="MONEYPLANT_01",
            readings=SensorReadingsPayload(
                soil_moisture_raw=2300,
                leaf_temp_c=22.0,
                ambient_temp_c=22.5,
                ambient_humidity_pct=70.0,
                light_lux=5.0  # Nighttime / dark room
            ),
            diagnostics=SensorDiagnosticsPayload()
        )

        status, issues, _ = validate_telemetry_payload(payload, device)
        self.assertEqual(status, "DEGRADED")
        self.assertTrue(any("low-light" in issue for issue in issues))


if __name__ == "__main__":
    unittest.main(verbosity=2)
