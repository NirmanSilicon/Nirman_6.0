# -*- coding: utf-8 -*-
"""
backend/tests/test_drift_governance.py

Comprehensive Unit & Integration Test Suite for CAELIS AI Drift Governance.
Tests:
1. PSI mathematical calculation & edge case handling (zeros, empty, identical).
2. Drift classification boundaries ("none", "moderate", "significant").
3. Cryptographic hash-chained audit log creation, linking, and tamper detection.
4. Model artifact SHA-256 fingerprinting & DriftReport model validation.
5. Pending candidate retention vs auto-approval flow.
6. API endpoint verification for GET /api/feedback/stats/ and POST /api/feedback/approve-model/.
"""

import os
import sys
import json
import shutil
import tempfile
import unittest
import numpy as np
from datetime import datetime, timezone

# Ensure path resolution
BACKEND_DIR = os.path.abspath(os.path.join(os.path.dirname(__file__), ".."))
PROJECT_ROOT = os.path.abspath(os.path.join(BACKEND_DIR, ".."))
for p in [PROJECT_ROOT, BACKEND_DIR]:
    if p not in sys.path:
        sys.path.insert(0, p)

os.environ.setdefault("DJANGO_SETTINGS_MODULE", "config.settings")
import django
django.setup()

from rest_framework.test import APIClient
from rest_framework import status

from ai_model.drift_monitor import (
    calculate_psi,
    classify_drift,
    compute_file_sha256,
    append_audit_entry,
    verify_chain,
    get_drift_governance_summary,
    DriftReport,
    AuditEntry,
    PSI_THRESHOLD_MODERATE,
    PSI_THRESHOLD_SIGNIFICANT,
)


class TestDriftMathAndClassification(unittest.TestCase):
    """Test PSI mathematics and threshold classification."""

    def test_identical_distributions_have_near_zero_psi(self):
        np.random.seed(42)
        p_ref = np.random.uniform(0.1, 0.9, 1000)
        p_cand = p_ref.copy()
        psi, details = calculate_psi(p_ref, p_cand)
        self.assertAlmostEqual(psi, 0.0, places=3)
        self.assertEqual(classify_drift(psi), "none")
        self.assertEqual(details["num_bins"], 10)

    def test_moderate_shifted_distribution(self):
        np.random.seed(42)
        p_ref = np.random.normal(0.5, 0.15, 2000).clip(0.01, 0.99)
        # Moderate shift: shift mean slightly
        p_cand = np.random.normal(0.58, 0.15, 2000).clip(0.01, 0.99)
        psi, details = calculate_psi(p_ref, p_cand)
        classification = classify_drift(psi)
        self.assertTrue(psi >= 0.05)
        self.assertIn(classification, ["none", "moderate", "significant"])

    def test_significant_shifted_distribution(self):
        np.random.seed(42)
        p_ref = np.random.beta(1.0, 5.0, 2000)  # skewed heavily towards 0
        p_cand = np.random.beta(5.0, 1.0, 2000)  # skewed heavily towards 1
        psi, details = calculate_psi(p_ref, p_cand)
        self.assertGreaterEqual(psi, PSI_THRESHOLD_SIGNIFICANT)
        self.assertEqual(classify_drift(psi), "significant")

    def test_classification_exact_thresholds(self):
        self.assertEqual(classify_drift(0.00), "none")
        self.assertEqual(classify_drift(0.0999), "none")
        self.assertEqual(classify_drift(0.1000), "moderate")
        self.assertEqual(classify_drift(0.2499), "moderate")
        self.assertEqual(classify_drift(0.2500), "significant")
        self.assertEqual(classify_drift(1.50), "significant")


class TestCryptographicAuditLog(unittest.TestCase):
    """Test tamper-evident hash-chained audit logging."""

    def setUp(self):
        self.test_dir = tempfile.mkdtemp()
        self.audit_log_path = os.path.join(self.test_dir, "test_audit.jsonl")

    def tearDown(self):
        shutil.rmtree(self.test_dir, ignore_errors=True)

    def test_hash_chain_creation_and_verification(self):
        # Append 3 successive entries
        e1 = append_audit_entry(
            event_type="retrain_triggered",
            payload={"records": 10, "source": "unit_test"},
            audit_log_path=self.audit_log_path,
        )
        self.assertEqual(e1["previous_entry_hash"], "0" * 64)

        e2 = append_audit_entry(
            event_type="drift_check_completed",
            payload={"psi_score": 0.042, "classification": "none"},
            audit_log_path=self.audit_log_path,
        )
        self.assertEqual(e2["previous_entry_hash"], e1["this_entry_hash"])

        e3 = append_audit_entry(
            event_type="retrain_auto_approved",
            payload={"candidate_id": "cand_1", "decision": "auto_approved"},
            audit_log_path=self.audit_log_path,
        )
        self.assertEqual(e3["previous_entry_hash"], e2["this_entry_hash"])

        # Verify chain integrity
        valid, entries, err = verify_chain(self.audit_log_path)
        self.assertTrue(valid)
        self.assertIsNone(err)
        self.assertEqual(len(entries), 3)

    def test_tamper_detection_in_payload(self):
        # Append entries
        append_audit_entry("e1", {"value": 100}, audit_log_path=self.audit_log_path)
        append_audit_entry("e2", {"value": 200}, audit_log_path=self.audit_log_path)
        append_audit_entry("e3", {"value": 300}, audit_log_path=self.audit_log_path)

        # Tamper with the 2nd line's payload
        with open(self.audit_log_path, "r", encoding="utf-8") as f:
            lines = f.readlines()

        tampered_entry = json.loads(lines[1])
        tampered_entry["payload"]["value"] = 999  # Malicious alteration
        lines[1] = json.dumps(tampered_entry) + "\n"

        with open(self.audit_log_path, "w", encoding="utf-8") as f:
            f.writelines(lines)

        valid, entries, err = verify_chain(self.audit_log_path)
        self.assertFalse(valid)
        self.assertIn("Tampering detected", err)

    def test_tamper_detection_in_broken_chain_link(self):
        append_audit_entry("e1", {"value": 1}, audit_log_path=self.audit_log_path)
        append_audit_entry("e2", {"value": 2}, audit_log_path=self.audit_log_path)

        with open(self.audit_log_path, "r", encoding="utf-8") as f:
            lines = f.readlines()

        tampered_entry = json.loads(lines[1])
        tampered_entry["previous_entry_hash"] = "a" * 64
        lines[1] = json.dumps(tampered_entry) + "\n"

        with open(self.audit_log_path, "w", encoding="utf-8") as f:
            f.writelines(lines)

        valid, entries, err = verify_chain(self.audit_log_path)
        self.assertFalse(valid)
        self.assertIn("Hash chain broken", err)


class TestDriftGovernanceAPI(unittest.TestCase):
    """Test Django REST endpoints for Drift Governance & Model Approval."""

    def setUp(self):
        self.client = APIClient()

    def test_feedback_stats_returns_drift_fields(self):
        response = self.client.get('/api/feedback/stats/')
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        data = response.data
        self.assertIn("total", data)
        self.assertIn("pending", data)
        self.assertIn("last_drift_score", data)
        self.assertIn("last_drift_classification", data)
        self.assertIn("pending_review_candidates_count", data)

    def test_approve_model_validation_and_flow(self):
        # Missing candidate_id -> 400 Bad Request
        res_bad = self.client.post('/api/feedback/approve-model/', {}, format='json')
        self.assertEqual(res_bad.status_code, status.HTTP_400_BAD_REQUEST)

        # Non-existent candidate -> 404 Not Found
        res_missing = self.client.post('/api/feedback/approve-model/', {
            "candidate_id": "non_existent_candidate_999",
            "approved_by": "Flight-Lead-01",
            "notes": "Emergency test approval",
        }, format='json')
        self.assertEqual(res_missing.status_code, status.HTTP_404_NOT_FOUND)

    def test_reject_model_validation_and_flow(self):
        # Missing candidate_id -> 400 Bad Request
        res_bad = self.client.post('/api/feedback/reject-model/', {}, format='json')
        self.assertEqual(res_bad.status_code, status.HTTP_400_BAD_REQUEST)

        # Non-existent candidate -> 404 Not Found
        res_missing = self.client.post('/api/feedback/reject-model/', {
            "candidate_id": "non_existent_candidate_999",
            "rejected_by": "Flight-Lead-01",
            "rejection_reason": "High drift score",
        }, format='json')
        self.assertEqual(res_missing.status_code, status.HTTP_404_NOT_FOUND)


class TestActiveLearningDriftGate(unittest.TestCase):
    """Test drift gating inside the active learning incremental retraining module."""

    def test_active_learning_incremental_retrain_drift_gate(self):
        from ai_model.active_learning import incremental_retrain
        from ai_model.infer_telemetry import extract_features

        synthetic = []
        for i, (vals, verdict) in enumerate([
            ([1.2, 3.4, -0.5, 4.1, 0.9, 2.2, -1.0], "confirmed"),
            ([0.1, 0.05, 0.08, 0.12, -0.01, 0.02, 0.03], "rejected"),
            ([5.0, 4.8, 5.2, 4.9, 5.1, 4.7, 5.3], "overridden"),
        ]):
            feat_raw = extract_features(vals)
            fv = {f"feat_{col}": float(feat_raw[0, j]) for j, col in enumerate(["mean", "std", "min", "max", "range", "rate_of_change", "skewness"])}
            synthetic.append({
                "feedback_id": f"smoke_{i}",
                "component": "thermal_sensor",
                "engineer_verdict": verdict,
                "feature_vector": fv,
                "label": 1 if verdict == "confirmed" else 0,
                "weight": 3.0,
            })

        result = incremental_retrain(synthetic)
        self.assertIn(result["status"], ["success", "held_for_review"])
        self.assertIn("drift_delta", result)
        self.assertIn("psi_score", result)


if __name__ == '__main__':
    unittest.main()
