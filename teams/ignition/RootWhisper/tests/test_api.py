"""Integration tests for FastAPI endpoints using standard unittest and requests."""

import sys
import unittest
from pathlib import Path

BASE_DIR = Path(__file__).resolve().parent.parent
if str(BASE_DIR) not in sys.path:
    sys.path.insert(0, str(BASE_DIR))

import requests

BASE_URL = "http://127.0.0.1:8000"


class TestAPIEndpoints(unittest.TestCase):
    @classmethod
    def tearDownClass(cls):
        import sqlite3
        db_path = BASE_DIR / "data" / "rootwhisper.db"
        if db_path.exists():
            conn = sqlite3.connect(db_path)
            c = conn.cursor()
            c.execute("DELETE FROM telemetry_readings WHERE is_simulated = 1")
            c.execute("DELETE FROM screening_results WHERE telemetry_id NOT IN (SELECT id FROM telemetry_readings)")
            c.execute("UPDATE devices SET is_online = 0, last_seen = NULL")
            conn.commit()
            conn.close()

    def test_root_endpoint(self):
        resp = requests.get(f"{BASE_URL}/")
        self.assertEqual(resp.status_code, 200)
        data = resp.json()
        self.assertEqual(data["status"], "OPERATIONAL")
        self.assertIn("TULSI_01", data["active_nodes"])
        self.assertIn("HIBISCUS_01", data["active_nodes"])
        self.assertIn("MONEYPLANT_01", data["active_nodes"])

    def test_health_endpoint(self):
        resp = requests.get(f"{BASE_URL}/health")
        self.assertEqual(resp.status_code, 200)
        self.assertEqual(resp.json(), {"status": "healthy"})

    def test_list_devices(self):
        resp = requests.get(f"{BASE_URL}/api/v1/devices")
        self.assertEqual(resp.status_code, 200)
        devices = resp.json()
        self.assertGreaterEqual(len(devices), 3)
        device_ids = [d["device_id"] for d in devices]
        self.assertIn("TULSI_01", device_ids)
        self.assertIn("HIBISCUS_01", device_ids)
        self.assertIn("MONEYPLANT_01", device_ids)

    def test_model_status_endpoints(self):
        for dev_id in ["TULSI_01", "HIBISCUS_01", "MONEYPLANT_01"]:
            resp = requests.get(f"{BASE_URL}/api/v1/models/{dev_id}/status")
            self.assertEqual(resp.status_code, 200)
            data = resp.json()
            self.assertEqual(data["device_id"], dev_id)
            self.assertTrue(data["is_calibrated"])
            self.assertIn("scientific_limitation_notice", data)
            self.assertIn("Individual Specimen Baseline (N=1)", data["scientific_limitation_notice"])

    def test_telemetry_ingestion_valid(self):
        payload = {
            "device_id": "TULSI_01",
            "firmware_version": "1.0.0",
            "readings": {
                "soil_moisture_raw": 2300,
                "soil_moisture_pct": 50.0,
                "leaf_temp_c": 25.5,
                "ambient_temp_c": 26.8,
                "ambient_humidity_pct": 62.0,
                "light_lux": 8500.0
            },
            "diagnostics": {
                "wifi_rssi": -65,
                "mlx_connected": True,
                "aht_connected": True,
                "bh1750_connected": True,
                "soil_sensor_valid": True,
                "uptime_seconds": 1800
            },
            "is_simulated": True
        }

        resp = requests.post(f"{BASE_URL}/api/v1/telemetry", json=payload)
        self.assertEqual(resp.status_code, 200)
        data = resp.json()
        self.assertEqual(data["device_id"], "TULSI_01")
        self.assertTrue(data["is_simulated"])
        self.assertEqual(data["actual_leaf_temp_c"], 25.5)
        self.assertIn("screening_output", data)
        self.assertIn(data["screening_output"], ["NORMAL", "POSSIBLE WATER-STRESS INDICATION", "INCONCLUSIVE"])

    def test_telemetry_unknown_device_rejected(self):
        payload = {
            "device_id": "UNKNOWN_NODE_99",
            "readings": {
                "soil_moisture_raw": 2300,
                "leaf_temp_c": 25.0,
                "ambient_temp_c": 26.0,
                "ambient_humidity_pct": 60.0,
                "light_lux": 1000.0
            }
        }
        resp = requests.post(f"{BASE_URL}/api/v1/telemetry", json=payload)
        self.assertEqual(resp.status_code, 400)
        self.assertIn("Unknown device_id", resp.json()["detail"])


if __name__ == "__main__":
    unittest.main(verbosity=2)
