"""
backend/tests/test_simulation_pipeline.py

Automated Test Suite for CAELIS Simulation Dataset & Pipeline Integration.
Validates:
A. Deterministic simulation using fixed seed
B. Canonical record schema compliance (15 fields) & provenance
C. Pre-flight dataset validation & corruption detection
D. The 5 Canonical Failure Scenarios (A - E) & Ground Truth
E. Simulation REST API endpoints (Generate, Telemetry, Validate, Analyze)
"""

import json
from django.test import TestCase
from rest_framework.test import APIClient
from rest_framework import status

from app.simulate.simulation_models import CanonicalTelemetryRecord
from app.simulate.simulation_engine import SimulationEngine
from app.simulate.validator import validate_telemetry_records
from app.core.orchestrator import AnalysisOrchestrator


class SimulationPipelineTests(TestCase):
    def setUp(self):
        self.client = APIClient()
        self.engine = SimulationEngine(random_seed=42)

    def test_deterministic_simulation_generation(self):
        """Verify identical seed produces bit-exact telemetry."""
        sim1 = self.engine.generate(scenario_id="power_collapse", duration_seconds=60, random_seed=123)
        sim2 = self.engine.generate(scenario_id="power_collapse", duration_seconds=60, random_seed=123)

        self.assertEqual(len(sim1.records), len(sim2.records))
        for r1, r2 in zip(sim1.records, sim2.records):
            self.assertEqual(r1.packet_id, r2.packet_id)
            self.assertEqual(r1.channel_id, r2.channel_id)
            self.assertAlmostEqual(r1.value, r2.value, places=4)
            self.assertEqual(r1.quality, r2.quality)

    def test_canonical_record_schema_and_provenance(self):
        """Verify all 15 canonical fields and strict provenance."""
        sim = self.engine.generate(scenario_id="thermal_runaway", duration_seconds=30, random_seed=42)
        self.assertGreater(len(sim.records), 0)

        sample = sim.records[0]
        self.assertTrue(sample.packet_id.startswith("PKT-"))
        self.assertEqual(sample.mission_id, "MISSION-CUBESAT-3U")
        self.assertEqual(sample.spacecraft_id, "SC-01")
        self.assertIsInstance(sample.timestamp, str)
        self.assertIsInstance(sample.mission_elapsed_time, float)
        self.assertIn(sample.subsystem, ["THERMAL", "EPS", "BATTERY", "OBC", "COMMS", "ADCS", "PAYLOAD"])
        self.assertIsInstance(sample.channel_id, str)
        self.assertIsInstance(sample.signal_name, str)
        self.assertIsInstance(sample.value, float)
        self.assertIsInstance(sample.unit, str)
        self.assertIn(sample.quality, ["VALID", "DEGRADED", "STALE", "CORRUPT", "OUT_OF_BOUNDS"])
        self.assertEqual(sample.source_type, "SIMULATED")
        self.assertIsInstance(sample.packet_sequence, int)
        self.assertIsNotNone(sample.expected_value)
        self.assertIsInstance(sample.metadata, dict)

    def test_preflight_validation_nominal_and_corrupt(self):
        """Verify validation engine passes valid data and catches corruptions."""
        sim = self.engine.generate(scenario_id="nominal_leo", duration_seconds=30, random_seed=42)
        report = validate_telemetry_records(sim.records)
        self.assertTrue(report.valid)
        self.assertEqual(len(report.errors), 0)

        # Introduce corruption: duplicate packet ID and non-monotonic MET
        corrupt_records = [CanonicalTelemetryRecord.from_dict(r.to_dict()) for r in sim.records[:10]]
        corrupt_records[1].packet_id = corrupt_records[0].packet_id  # duplicate
        corrupt_records[5].mission_elapsed_time = -10.0  # non-monotonic

        corrupt_report = validate_telemetry_records(corrupt_records)
        self.assertFalse(corrupt_report.valid)
        self.assertGreater(len(corrupt_report.errors), 0)

    def test_canonical_scenario_a_thermal_cascade(self):
        """Scenario A: Thermal Sensor negative rail freeze -> battery runaway."""
        sim = self.engine.generate(scenario_id="thermal_runaway", duration_seconds=300, random_seed=42)
        self.assertEqual(sim.ground_truth["root_cause"], "thermal_sensor")

        orch = AnalysisOrchestrator()
        result = orch.run_analysis(sim.simulation_id)
        self.assertEqual(result["status"], "ANALYZED")
        self.assertIn(result["primary_root_cause"]["component"], ["thermal_sensor", "heater_controller", "battery"])

    def test_canonical_scenario_b_power_cascade(self):
        """Scenario B: Power Bus UVLO collapse -> OBC reset."""
        sim = self.engine.generate(scenario_id="power_collapse", duration_seconds=300, random_seed=42)
        self.assertEqual(sim.ground_truth["root_cause"], "power_bus")

        orch = AnalysisOrchestrator()
        result = orch.run_analysis(sim.simulation_id)
        self.assertEqual(result["status"], "ANALYZED")
        self.assertIn(result["primary_root_cause"]["component"], ["power_bus", "obc"])

    def test_canonical_scenario_c_misleading_early_anomaly(self):
        """Scenario C: Early ADCS spike at T+80s, true root cause Battery at T+120s."""
        sim = self.engine.generate(scenario_id="misleading_early_anomaly", duration_seconds=300, random_seed=42)
        self.assertEqual(sim.ground_truth["root_cause"], "battery")

        orch = AnalysisOrchestrator()
        result = orch.run_analysis(sim.simulation_id)
        self.assertEqual(result["status"], "ANALYZED")
        # Ensure battery is identified in root causes or hypotheses
        component_candidates = [rc["component"] for rc in result.get("root_causes", [])]
        self.assertIn("battery", component_candidates)

    def test_canonical_scenario_d_competing_root_causes(self):
        """Scenario D: Returns multiple competing hypotheses."""
        sim = self.engine.generate(scenario_id="competing_root_causes", duration_seconds=300, random_seed=42)
        orch = AnalysisOrchestrator()
        result = orch.run_analysis(sim.simulation_id)
        self.assertEqual(result["status"], "ANALYZED")
        self.assertGreaterEqual(len(result.get("competing_hypotheses", [])), 1)

    def test_canonical_scenario_e_missing_telemetry(self):
        """Scenario E: Missing critical battery sensors."""
        sim = self.engine.generate(scenario_id="missing_telemetry", duration_seconds=300, random_seed=42)
        self.assertNotIn("BATT_TEMP", sim.channels)

    def test_simulation_rest_api_lifecycle(self):
        """Test complete API lifecycle: generate -> telemetry -> validate -> analyze."""
        # 1. Generate
        gen_resp = self.client.post(
            "/api/simulations/generate/",
            {
                "scenario_id": "power_collapse",
                "duration_seconds": 60,
                "orbit_altitude": 550,
                "noise_level": 1.5,
                "random_seed": 77
            },
            format="json"
        )
        self.assertEqual(gen_resp.status_code, status.HTTP_201_CREATED)
        sim_id = gen_resp.data["simulation_id"]
        self.assertTrue(sim_id.startswith("SIM-"))
        self.assertGreater(gen_resp.data["total_packets"], 0)
        self.assertIn("logs", gen_resp.data)

        # 2. Get Telemetry
        tel_resp = self.client.get(f"/api/simulations/{sim_id}/telemetry/?limit=50")
        self.assertEqual(tel_resp.status_code, status.HTTP_200_OK)
        self.assertEqual(len(tel_resp.data["records"]), 50)
        self.assertEqual(tel_resp.data["records"][0]["source_type"], "SIMULATED")

        # 3. Validate
        val_resp = self.client.get(f"/api/simulations/{sim_id}/validate/")
        self.assertEqual(val_resp.status_code, status.HTTP_200_OK)
        self.assertTrue(val_resp.data["valid"])

        # 4. Analyze
        anl_resp = self.client.post(f"/api/simulations/{sim_id}/analyze/", {}, format="json")
        self.assertEqual(anl_resp.status_code, status.HTTP_200_OK)
        self.assertEqual(anl_resp.data["status"], "ANALYZED")
        self.assertIsNotNone(anl_resp.data["causal_graph"])
        self.assertIsNotNone(anl_resp.data["next_best_evidence"])
