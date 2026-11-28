"""
Unit tests for simulator/live_publisher.py (File 156)
Tests configuration, TLS defaults, topic construction, packet encoding, and dry-run execution.
"""

from __future__ import annotations

import json
import os
import tempfile
import unittest
import uuid
from datetime import UTC, datetime

from simulator.live_publisher import (
    AsyncMqtt311Client,
    CameraTarget,
    LivePublisher,
    PublisherConfig,
    build_default_targets,
    load_secrets_file,
    parse_args,
)


class TestLivePublisher(unittest.TestCase):
    def test_default_config_tls_on_8883(self):
        """Verify default deployed configuration enforces TLS on port 8883."""
        config = parse_args([])
        self.assertTrue(config.tls, "Default configuration must enable TLS")
        self.assertEqual(config.broker_port, 8883, "Default TLS port must be 8883")

    def test_explicit_no_tls_config_1883(self):
        """Verify local development non-TLS configuration is allowed only when explicitly requested."""
        config = parse_args(["--no-tls"])
        self.assertFalse(config.tls)
        self.assertEqual(config.broker_port, 1883)

    def test_custom_broker_and_credentials(self):
        """Verify custom CLI flags configure broker and credentials cleanly."""
        config = parse_args([
            "--broker-host", "mqtt.example.com",
            "--broker-port", "8884",
            "--username", "cam-operator",
            "--password", "SuperSecretPass123",
            "--interval-s", "5",
        ])
        self.assertEqual(config.broker_host, "mqtt.example.com")
        self.assertEqual(config.broker_port, 8884)
        self.assertEqual(config.username, "cam-operator")
        self.assertEqual(config.password, "SuperSecretPass123")
        self.assertEqual(config.interval_s, 5)

    def test_invalid_interval_rejected(self):
        """Intervals that do not evenly divide the 15-minute (900s) aggregation window must be rejected."""
        with self.assertRaises(ValueError):
            parse_args(["--interval-s", "7"])
        with self.assertRaises(ValueError):
            parse_args(["--interval-s", "0"])
        with self.assertRaises(ValueError):
            parse_args(["--interval-s", "-5"])

    def test_build_default_targets(self):
        """Verify build_default_targets produces valid UUIDs and requested bay counts."""
        targets = build_default_targets(
            zone_id="11111111-2222-3333-4444-555555555555",
            camera_id="aaaaaaaa-bbbb-cccc-dddd-eeeeeeeeeeee",
            bay_ids=None,
            num_bays=5,
        )
        self.assertEqual(len(targets), 1)
        t = targets[0]
        self.assertEqual(t.zone_id, "11111111-2222-3333-4444-555555555555")
        self.assertEqual(t.camera_id, "aaaaaaaa-bbbb-cccc-dddd-eeeeeeeeeeee")
        self.assertEqual(len(t.bay_ids), 5)
        for bid in t.bay_ids:
            uuid.UUID(bid)

    def test_load_secrets_file(self):
        """Verify loading target cameras from JSON secrets file format."""
        cam_id = str(uuid.uuid4())
        zone_id = str(uuid.uuid4())
        bay_id_1 = str(uuid.uuid4())
        bay_id_2 = str(uuid.uuid4())

        secrets_data = {
            cam_id: {
                "zone_id": zone_id,
                "secret": "argon2_secret_mock",
                "bay_ids": [bay_id_1, bay_id_2],
                "profile": "market",
            }
        }

        with tempfile.NamedTemporaryFile("w", suffix=".json", delete=False) as f:
            json.dump(secrets_data, f)
            temp_path = f.name

        try:
            targets = load_secrets_file(temp_path)
            self.assertIsNotNone(targets)
            self.assertEqual(len(targets), 1)
            t = targets[0]
            self.assertEqual(t.camera_id, cam_id)
            self.assertEqual(t.zone_id, zone_id)
            self.assertEqual(t.bay_ids, [bay_id_1, bay_id_2])
            self.assertEqual(t.profile_name, "market")
        finally:
            if os.path.exists(temp_path):
                os.remove(temp_path)

    def test_publish_target_step_telemetry_schemas(self):
        """Verify publish_target_step generates valid occupancy, crowd, and health messages."""
        zone_id = str(uuid.uuid4())
        camera_id = str(uuid.uuid4())
        bays = [str(uuid.uuid4()) for _ in range(8)]
        target = CameraTarget(camera_id=camera_id, zone_id=zone_id, bay_ids=bays)

        config = PublisherConfig(dry_run=True, targets=[target])
        publisher = LivePublisher(config)
        now = datetime(2026, 11, 24, 8, 30, 0, tzinfo=UTC)

        import asyncio
        loop = asyncio.new_event_loop()
        try:
            results = loop.run_until_complete(publisher.publish_target_step(target, client=None, now=now))
        finally:
            loop.close()

        # 1. Occupancy Verification
        self.assertIn("occupancy", results)
        occ_topic, occ_msg = results["occupancy"]
        self.assertEqual(occ_topic, f"parksmart/{zone_id}/{camera_id}/occupancy")
        self.assertEqual(occ_msg["schema_version"], 1)
        self.assertEqual(occ_msg["camera_id"], camera_id)
        self.assertEqual(occ_msg["ts"], "2026-11-24T08:30:00Z")
        self.assertEqual(len(occ_msg["bays"]), 8)
        uuid.UUID(occ_msg["msg_id"])

        # 2. Crowd Verification
        self.assertIn("crowd", results)
        crowd_topic, crowd_msg = results["crowd"]
        self.assertEqual(crowd_topic, f"parksmart/{zone_id}/{camera_id}/crowd")
        self.assertEqual(crowd_msg["schema_version"], 1)
        self.assertEqual(crowd_msg["camera_id"], camera_id)
        self.assertGreaterEqual(crowd_msg["vehicle_count"], 0)
        self.assertGreaterEqual(crowd_msg["pedestrian_count"], 0)

        # 3. Health Verification
        self.assertIn("health", results)
        health_topic, health_msg = results["health"]
        self.assertEqual(health_topic, f"parksmart/{zone_id}/{camera_id}/health")
        self.assertEqual(health_msg["schema_version"], 1)
        self.assertEqual(health_msg["camera_id"], camera_id)
        self.assertEqual(health_msg["state"], "online")

    def test_fault_injection_drop_camera(self):
        """Verify fault injection --drop-camera suppresses publication for the specified camera."""
        dropped_cam = str(uuid.uuid4())
        target = CameraTarget(camera_id=dropped_cam, zone_id=str(uuid.uuid4()), bay_ids=[str(uuid.uuid4())])

        config = PublisherConfig(dry_run=True, drop_camera=dropped_cam, targets=[target])
        publisher = LivePublisher(config)

        import asyncio
        loop = asyncio.new_event_loop()
        try:
            results = loop.run_until_complete(
                publisher.publish_target_step(target, client=None, now=datetime.now(UTC))
            )
            self.assertEqual(results, {})
        finally:
            loop.close()

    def test_mqtt_packet_builders(self):
        """Verify MQTT 3.1.1 CONNECT and PUBLISH packet encoding."""
        client = AsyncMqtt311Client(
            host="localhost",
            port=8883,
            client_id="test-sim-client",
            username="testuser",
            password="testpassword",
            tls=True,
            lwt_topic="parksmart/z1/c1/health",
            lwt_payload=b'{"state":"offline"}',
        )

        connect_pkt = client._build_connect_packet()
        self.assertEqual(connect_pkt[0], 0x10, "CONNECT packet header must start with 0x10")
        self.assertIn(b"MQTT", connect_pkt)
        self.assertIn(b"test-sim-client", connect_pkt)
        self.assertIn(b"testuser", connect_pkt)

        # PUBLISH QoS 1
        publish_pkt = client._build_publish_packet(
            topic="parksmart/z1/c1/occupancy",
            payload=b'{"schema_version": 1}',
            packet_id=42,
            qos=1,
        )
        self.assertEqual(publish_pkt[0], 0x32, "PUBLISH QoS 1 header byte must be 0x32")
        self.assertIn(b"parksmart/z1/c1/occupancy", publish_pkt)
        self.assertIn(b'{"schema_version": 1}', publish_pkt)

    def test_dry_run_execution_cycle(self):
        """Verify dry-run execution completes finite count of cycles cleanly."""
        targets = build_default_targets(zone_id=None, camera_id=None, bay_ids=None, num_bays=5)
        config = PublisherConfig(dry_run=True, count=2, interval_s=1, targets=targets)
        publisher = LivePublisher(config)

        import asyncio
        loop = asyncio.new_event_loop()
        try:
            loop.run_until_complete(publisher.run())
        finally:
            loop.close()

        # Each cycle produces 1 occupancy, 1 crowd, 1 health -> for 2 cycles: 2 each
        self.assertEqual(publisher.published_counts["occupancy"], 2)
        self.assertEqual(publisher.published_counts["crowd"], 2)
        self.assertEqual(publisher.published_counts["health"], 2)


if __name__ == "__main__":
    unittest.main()
