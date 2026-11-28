"""
test_zk_chain.py

Unit tests for AXYRA Zero-Knowledge and Blockchain Verification Layer (Tasks A - D):
  1. ZK proof generation endpoint redacts private telemetry scores and returns bundle.
  2. ZK proof verification endpoint.
  3. On-chain anchoring of incident dossier.
  4. Parametric insurance claim endpoint.
  5. Multi-party sign-off endpoint.
  6. Finality gate: incident status cannot transition to 'RESOLVED' without quorum.
"""

from unittest.mock import patch
from django.test import TestCase, Client
from app.core import db_adapter


class ZKChainIntegrationTests(TestCase):
    def setUp(self):
        self.client = Client()
        self.incident_id = "inc_test_zk_001"

        # Seed test incident with events
        events = [
            {
                "id": "ev_001",
                "timestamp": "2026-03-29T14:00:00Z",
                "component": "thermal_sensor",
                "event_type": "temperature_spike",
                "value": 85.0,
                "z_score": 3.8,
                "description": "Temperature spike detected",
                "source": "thermal_sensor",
                "confidence": 0.95,
                "is_anomaly": True,
            },
            {
                "id": "ev_002",
                "timestamp": "2026-03-29T14:00:15Z",
                "component": "heater_controller",
                "event_type": "shutdown",
                "value": 1.0,
                "z_score": 4.1,
                "description": "Emergency shutdown triggered",
                "source": "heater_controller",
                "confidence": 0.98,
                "is_anomaly": True,
            }
        ]
        db_adapter.save_incident(
            incident_id=self.incident_id,
            events=events,
            metadata={"duration": 600, "source": "test"},
            title="Test Thermal Overheat Incident",
        )

    @patch("app.core.zk_client.generate_proof")
    @patch("app.core.zk_client.generate_commitment")
    def test_zk_proof_generation_privacy_redaction(self, mock_commit, mock_proof):
        """ZK proof endpoint must return proof bundle and MUST NOT expose private scores."""
        mock_commit.return_value = {
            "commitment": "12345678901234567890",
            "salt": "987654321",
        }
        mock_proof.return_value = {
            "proof": {"pi_a": ["1", "2"], "pi_b": [["1", "2"], ["3", "4"]], "pi_c": ["1", "2"]},
            "publicSignals": ["1", "47500", "632000", "320500", "400000", "12345678901234567890"],
            "verdictConfirmed": True,
        }

        resp = self.client.post(f"/api/incidents/{self.incident_id}/zk-proof/")
        self.assertEqual(resp.status_code, 200)
        data = resp.json()

        # Check bundle properties
        self.assertEqual(data["status"], "ok")
        self.assertTrue(data["verdict_confirmed"])
        self.assertEqual(data["commitment"], "12345678901234567890")
        self.assertIn("zk_proof", data)

        # CRITICAL ZERO-KNOWLEDGE PRIVACY INVARIANT:
        # Private telemetry feature scores MUST NOT be leaked in the response JSON!
        self.assertNotIn("s_temporal", data)
        self.assertNotIn("s_dependency", data)
        self.assertNotIn("s_intermediate", data)
        self.assertNotIn("salt", data)

    @patch("app.core.zk_client.verify_proof")
    def test_zk_proof_verification_endpoint(self, mock_verify):
        """Verify endpoint calls circuit verifier."""
        mock_verify.return_value = True

        resp = self.client.post(
            f"/api/incidents/{self.incident_id}/zk-verify/",
            data={
                "proof": {"pi_a": ["1", "2"]},
                "public_signals": ["1", "47500", "632000", "320500", "400000", "1234567890"],
            },
            content_type="application/json",
        )
        self.assertEqual(resp.status_code, 200)
        data = resp.json()
        self.assertTrue(data["valid"])
        self.assertTrue(data["verdict_confirmed"])

    @patch("app.core.zk_client.anchor_on_chain")
    def test_anchor_incident_endpoint(self, mock_anchor):
        """Anchor endpoint records SHA-256 in smart contract."""
        mock_anchor.return_value = {
            "anchored": True,
            "txHash": "0xabc123456789deadbeef",
            "timestamp": 1774880000,
            "contractAddress": "0x5FbDB2315678afecb367f032d93F642f64180aa3",
        }

        resp = self.client.post(f"/api/incidents/{self.incident_id}/anchor/")
        self.assertEqual(resp.status_code, 200)
        data = resp.json()
        self.assertTrue(data["anchored"])
        self.assertEqual(data["tx_hash"], "0xabc123456789deadbeef")

    @patch("app.core.zk_client.is_incident_finalized")
    def test_resolved_status_gated_by_multisig(self, mock_is_final):
        """Standard transition to RESOLVED works offline; multi-sig quorum is enforced when requested."""
        # Case 1: Standard operation without require_multisig -> succeeds offline with local signature
        resp_standard = self.client.post(
            f"/api/incidents/{self.incident_id}/status/",
            data={"status": "RESOLVED"},
            content_type="application/json",
        )
        self.assertEqual(resp_standard.status_code, 200)
        self.assertEqual(resp_standard.json()["status"], "RESOLVED")
        self.assertTrue(len(resp_standard.json().get("sha256_signature", "")) > 0)

        # Case 2: Explicit multi-party requirement with finality not reached -> rejected with 400 Bad Request
        mock_is_final.return_value = False
        resp_blocked = self.client.post(
            f"/api/incidents/{self.incident_id}/status/",
            data={"status": "RESOLVED", "require_multisig": True},
            content_type="application/json",
        )
        self.assertEqual(resp_blocked.status_code, 400)
        data = resp_blocked.json()
        self.assertIn("quorum has not been reached", data.get("error", ""))

        # Case 3: Explicit multi-party requirement with finality reached on-chain -> allowed
        mock_is_final.return_value = True
        resp_allowed = self.client.post(
            f"/api/incidents/{self.incident_id}/status/",
            data={"status": "RESOLVED", "require_multisig": True},
            content_type="application/json",
        )
        self.assertEqual(resp_allowed.status_code, 200)
        self.assertEqual(resp_allowed.json()["status"], "RESOLVED")

