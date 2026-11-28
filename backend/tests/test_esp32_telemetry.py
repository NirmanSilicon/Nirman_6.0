from django.test import SimpleTestCase

from app.core.esp32_telemetry import ESP32TelemetryAdapter
from app.simulate.validator import validate_telemetry_records


class ESP32TelemetryAdapterTests(SimpleTestCase):
    def test_real_frame_preserves_raw_provenance_and_builds_power_cascade(self):
        frame = {
            "timestamp_ms": 2000, "scenario": "POWER",
            "sensor_health": {"bmp280": True, "mpu6050": True, "ina219": True, "ds18b20": True},
            "raw": {"bmp_temp_c": 21.0, "probe_temp_c": 22.0, "voltage_v": 3.3, "current_ma": 100.0,
                    "power_mw": 330.0, "gyro_x": 0.01, "gyro_y": 0.02, "gyro_z": 0.03,
                    "acc_x": 0.0, "acc_y": 0.0, "acc_z": 9.8},
            "simulated": {"bmp_temp_c": 21.0, "probe_temp_c": 22.0, "voltage_v": 2.1, "current_ma": 220.0,
                          "power_mw": 462.0, "gyro_x": 0.01, "gyro_y": 0.02, "gyro_z": 0.03,
                          "acc_x": 0.0, "acc_y": 0.0, "acc_z": 9.8},
        }
        adapter = ESP32TelemetryAdapter()
        dataset = adapter.build_dataset([frame], {"port": "COM8", "connected": True})
        raw_bus = next(r for r in dataset.records if r.channel_id == "EPS_RAIL_3V3_RAW")
        self.assertEqual(raw_bus.source_type, "REAL")
        self.assertEqual(raw_bus.quality, "VALID")
        self.assertTrue(any(r.channel_id == "EPS_BUS_V" for r in dataset.records))
        self.assertTrue(any(r.channel_id == "OBC_CPU_LOAD" for r in dataset.records))
        self.assertTrue(validate_telemetry_records(dataset.records).valid)

    def test_unavailable_sensor_is_never_claimed_as_real(self):
        frame = {"timestamp_ms": 1000, "scenario": "NOMINAL", "sensor_health": {}, "raw": {}, "simulated": {}}
        records = ESP32TelemetryAdapter().frame_to_records(frame)
        self.assertTrue(records)
        self.assertTrue(all(r.source_type == "SIMULATED" for r in records))
        self.assertTrue(all(r.quality == "DEGRADED" for r in records))
        self.assertTrue(all(r.metadata["not_observed_hardware_data"] for r in records))

    def test_firmware_edge_report_is_preserved_as_telemetry_metadata(self):
        frame = {
            "timestamp_ms": 1000, "scenario": "NOMINAL",
            "sensor_health": {"bmp280": True},
            "raw": {"bmp_temp_c": 22.0}, "simulated": {},
            "edge_ai": {"raw": {"overall_status": "WATCH"}, "simulated": {"overall_status": "NOMINAL"}},
        }
        records = ESP32TelemetryAdapter().frame_to_records(frame)
        observed_temp = next(record for record in records if record.channel_id == "THM_TEMP_RAW_OBSERVED")
        self.assertEqual(observed_temp.metadata["edge_ai"]["raw"]["overall_status"], "WATCH")
