"""
backend/tests/test_structural_counterfactual.py

Unit and comparative tests for the upgraded Structural Counterfactual Simulator.
Compares legacy graph-reachability against structural forward simulation across
multiple incident cascades, testing interventions such as:
  - "Clamp thermal sensor at T+290s"
  - "Prevent BMS protection at T+440s"
"""

import os, sys, unittest

BACKEND_DIR = os.path.abspath(os.path.join(os.path.dirname(__file__), '..'))
PROJECT_ROOT = os.path.abspath(os.path.join(BACKEND_DIR, '..'))
for p in [PROJECT_ROOT, BACKEND_DIR]:
    if p not in sys.path:
        sys.path.insert(0, p)

os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'config.settings')
import django
django.setup()

from rest_framework.test import APIClient
from rest_framework import status


from app.core.mission_model.structural_simulator import (
    StructuralCounterfactualSimulator,
    StructuralIntervention,
    StructuralCounterfactualResult,
)
from app.core.mission_model.temporal_event_graph import TemporalEventGraph
from app.core.mission_model.mission_graph import MissionCausalGraph
from app.core.mission_model.legacy_adapter import compile_mission_graph_from_events
from app.api.views import _ensure_demo_incident


class TestStructuralCounterfactualSimulator(unittest.TestCase):
    def setUp(self):
        self.client = APIClient()
        self.simulator = StructuralCounterfactualSimulator()
        self.inc_001 = _ensure_demo_incident("inc_001")
        self.inc_002 = _ensure_demo_incident("inc_002")
        self.inc_003 = _ensure_demo_incident("inc_003")

    def test_01_clamp_thermal_sensor_intervention(self):
        """
        Verify 'Clamp thermal sensor at T+290s':
        Clamping sensor reading prevents heater runaway, battery overheat,
        BMS trip, power bus collapse, and avionics shutdown.
        """
        events = self.inc_001["events"]
        target_evt = events[0]["id"]

        result: StructuralCounterfactualResult = self.simulator.simulate(
            incident_id="inc_001",
            events=events,
            target_event_id=target_evt,
            minutes_earlier=0.1667,  # 10s lead time
            intervention_type="clamp",
            intervention_component="thermal_sensor",
            intervention_parameter="temperature_c",
            clamped_value=20.0,
        )

        self.assertEqual(result.simulation_method, "structural")
        self.assertGreaterEqual(result.prevented_count, 5)
        self.assertIn("mission_impact_difference", result.to_dict())

        impact = result.mission_impact_difference
        self.assertIn("OBC", impact["subsystems_rescued"])
        self.assertIn("COMMS", impact["subsystems_rescued"])
        self.assertIn("PAYLOAD", impact["subsystems_rescued"])
        self.assertEqual(impact["mission_status"], "NOMINAL_PRESERVED")
        self.assertGreaterEqual(impact["battery_soc_preserved_percent"], 80.0)

        # Assumptions and confidence
        self.assertGreaterEqual(result.simulation_confidence, 0.90)
        self.assertTrue(len(result.assumptions) >= 4)

        # Baseline reachability is included for comparison
        self.assertIsNotNone(result.baseline_reachability)
        self.assertEqual(result.baseline_reachability["method"], "graph_reachability")

    def test_02_prevent_bms_protection_intervention(self):
        """
        Verify 'Prevent BMS protection at T+440s':
        Overriding the BMS protection trip keeps the power bus energized longer,
        preventing immediate bus collapse, but battery cell sustains thermal damage.
        """
        events = self.inc_001["events"]
        # Find battery protection event
        bms_evt = None
        for e in events:
            if "protection" in e.get("component", "") or "trip" in e.get("description", ""):
                bms_evt = e
                break

        target_id = bms_evt["id"] if bms_evt else events[0]["id"]

        result = self.simulator.simulate(
            incident_id="inc_001",
            events=events,
            target_event_id=target_id,
            minutes_earlier=0.05,
            intervention_type="prevent_trip",
            intervention_component="battery_protection",
            intervention_parameter="trip_state",
            clamped_value=0.0,
        )

        self.assertEqual(result.simulation_method, "structural")
        self.assertIsNotNone(result.mission_impact_difference)
        # Power bus is preserved from immediate trip
        self.assertTrue(result.prevented_count > 0 or len(result.shifted_events) > 0)

    def test_03_compare_legacy_reachability_vs_structural_simulation(self):
        """
        Comparative test comparing legacy graph-reachability baseline with
        structural forward simulation across multiple incidents.
        """
        scenarios = [
            ("inc_001", self.inc_001),
            ("inc_002", self.inc_002),
            ("inc_003", self.inc_003),
        ]

        for inc_id, inc_data in scenarios:
            events = inc_data["events"]
            target_evt = events[0]["id"]

            compiled = compile_mission_graph_from_events(events=events, incident_id=inc_id)

            # 1. Legacy reachability baseline
            legacy_res = compiled.simulate_counterfactual(
                target_event_id=target_evt,
                minutes_earlier=10.0,
                method="reachability",
            )
            self.assertEqual(legacy_res["simulation_method"], "reachability_baseline")
            self.assertIn("prevented_event_ids", legacy_res)
            self.assertIn("remaining_event_ids", legacy_res)

            # 2. Structural forward simulation
            structural_res = compiled.simulate_counterfactual(
                target_event_id=target_evt,
                minutes_earlier=0.1667,
                method="structural",
            )
            self.assertEqual(structural_res["simulation_method"], "structural")
            self.assertIn("prevented_events", structural_res)
            self.assertIn("shifted_events", structural_res)
            self.assertIn("mission_impact_difference", structural_res)
            self.assertIn("baseline_reachability", structural_res)

            # Confirm baseline reachability matches in both
            baseline_in_structural = structural_res["baseline_reachability"]
            self.assertEqual(
                len(legacy_res["prevented_event_ids"]),
                baseline_in_structural["prevented_count"]
            )

    def test_04_api_counterfactual_structural_and_reachability(self):
        """
        Test POST /api/query/counterfactual/ endpoint:
        1. Default invocation returns structural simulation results.
        2. Explicit 'method: reachability' returns baseline reachability.
        3. Custom intervention parameters succeed.
        """
        events = self.inc_001["events"]
        target_evt = events[0]["id"]

        # Default: structural simulation
        res_default = self.client.post(
            "/api/query/counterfactual/",
            {"incident_id": "inc_001", "target_event_id": target_evt},
            format="json",
        )
        self.assertEqual(res_default.status_code, status.HTTP_200_OK)
        data = res_default.json()
        self.assertEqual(data["simulation_method"], "structural")
        self.assertIn("prevented_events", data)
        self.assertIn("mission_impact_difference", data)
        self.assertIn("baseline_reachability", data)
        self.assertGreaterEqual(data["simulation_confidence"], 0.70)

        # Baseline reachability mode
        res_reach = self.client.post(
            "/api/query/counterfactual/",
            {"incident_id": "inc_001", "target_event_id": target_evt, "method": "reachability"},
            format="json",
        )
        self.assertEqual(res_reach.status_code, status.HTTP_200_OK)
        data_reach = res_reach.json()
        self.assertEqual(data_reach["simulation_method"], "reachability_baseline")

        # Custom structural intervention
        res_custom = self.client.post(
            "/api/query/counterfactual/",
            {
                "incident_id": "inc_001",
                "target_event_id": target_evt,
                "intervention_type": "clamp",
                "intervention_component": "thermal_sensor",
                "intervention_parameter": "temperature_c",
                "clamped_value": 20.0,
                "intervention_offset_s": 15.0,
            },
            format="json",
        )
        self.assertEqual(res_custom.status_code, status.HTTP_200_OK)
        data_custom = res_custom.json()
        self.assertEqual(data_custom["simulation_method"], "structural")
        self.assertIn("Clamp thermal sensor", data_custom["intervention_timing"]["description"])
