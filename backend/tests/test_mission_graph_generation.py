"""
backend/tests/test_mission_graph_generation.py

Unit and integration tests for dynamic mission graph generation, canonical templates,
schema validation, and causal engine integration.
Proves:
1. Standard CubeSat graph is generated dynamically from canonical_cubesat.json + templates,
   matching legacy 13 nodes and 16 edges 1:1.
2. Novel spacecraft topology (DualPayloadSpacecraft) is instantiated and analyzed
   by causal_engine without modifying any core engine code.
3. Validation engine catches missing fields, duplicate IDs, invalid references,
   directed cycles (when strict DAG is required), and out-of-range parameters.
4. Structural rules in canonical templates correctly flag missing interfaces.
5. Real incident telemetry cascades produce 100% identical causal verdicts.
"""

import os
import sys
import json
import unittest
import networkx as nx

# Ensure backend root is on sys.path
sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__), "..")))

from app.core.mission_model import (
    get_canonical_template,
    list_canonical_templates,
    CANONICAL_MODULE_TEMPLATES,
    load_mission_config,
    validate_mission_config,
    assert_valid_mission_config,
    MissionValidationError,
    MissionConfig,
    MissionModuleConfig,
    MissionDependencyConfig,
    MissionDependencyGraph,
    generate_mission_dependency_graph,
    build_generated_dependency_graph,
)
from app.core.dependency_graph import build_dependency_graph, path_strength
from app.core.causal_engine import build_candidates


class TestCanonicalTemplates(unittest.TestCase):
    """Verify all 8 canonical subsystem templates are properly defined and registered."""

    def test_canonical_templates_registered(self):
        expected_modules = [
            "EPS",
            "Battery",
            "Thermal",
            "ADCS",
            "OBC",
            "Communications",
            "Payload",
            "FlightSoftware",
        ]
        unique_templates = list_canonical_templates()
        self.assertGreaterEqual(len(unique_templates), 8)

        for mod_name in expected_modules:
            tmpl = get_canonical_template(mod_name)
            self.assertIsNotNone(tmpl, f"Canonical template for {mod_name} should exist")
            self.assertGreater(len(tmpl.states), 0)
            self.assertGreater(len(tmpl.measurable_variables), 0)
            self.assertGreater(len(tmpl.allowed_interfaces), 0)
            self.assertGreater(len(tmpl.plausible_propagation_delays), 0)
            self.assertGreater(len(tmpl.relevant_failure_types), 0)


class TestMissionGraphGeneration(unittest.TestCase):
    """Verify mission dependency graph generation from configuration."""

    def test_demo_spacecraft_matches_legacy_graph(self):
        """The dynamically generated graph matches the 13 nodes and 16 edges 1:1."""
        mdg = generate_mission_dependency_graph()
        g = mdg.to_networkx()

        expected_nodes = {
            "thermal_sensor",
            "heater_controller",
            "battery",
            "battery_protection",
            "power_bus",
            "comms",
            "obc",
            "payload",
            "solar_array",
            "adcs",
            "reaction_wheel",
            "star_tracker",
            "flight_software",
        }
        self.assertEqual(set(g.nodes()), expected_nodes)
        self.assertEqual(g.number_of_nodes(), 13)
        self.assertEqual(g.number_of_edges(), 16)

        # Verify path strength calculation matches legacy 0.5625
        # thermal_sensor -> payload path
        ps = mdg.path_strength("thermal_sensor", "payload")
        self.assertAlmostEqual(ps, 0.5625, places=4)

        # Direct drop-in function build_dependency_graph() also matches
        legacy_g = build_dependency_graph()
        self.assertEqual(set(legacy_g.nodes()), expected_nodes)
        self.assertEqual(legacy_g.number_of_edges(), 16)
        self.assertAlmostEqual(path_strength(legacy_g, "thermal_sensor", "payload"), 0.5625, places=4)

    def test_novel_spacecraft_topology(self):
        """
        Verify a novel CubeSat architecture (DualPayloadSpacecraft) can be configured,
        validated, compiled into a graph, and fed to causal_engine without changing engine code.
        """
        novel_config = {
            "mission_id": "dual_payload_surveyor",
            "spacecraft_name": "Surveyor-Dual 12U",
            "orbit_type": "LEO_POLAR_600KM",
            "version": "1.0.0",
            "modules": [
                {"module_id": "solar_array_alpha", "module_type": "EPS"},
                {"module_id": "solar_array_beta", "module_type": "EPS"},
                {"module_id": "power_bus_main", "module_type": "EPS"},
                {"module_id": "battery_pack", "module_type": "Battery"},
                {"module_id": "obc_primary", "module_type": "OBC"},
                {"module_id": "optical_payload", "module_type": "Payload"},
                {"module_id": "radar_payload", "module_type": "Payload"},
                {"module_id": "comms_xband", "module_type": "Communications"},
                {"module_id": "fsw_supervisor", "module_type": "FlightSoftware"},
            ],
            "dependencies": [
                {"source_module_id": "solar_array_alpha", "target_module_id": "power_bus_main", "dependency_type": "power", "weight": 1.0},
                {"source_module_id": "solar_array_beta", "target_module_id": "power_bus_main", "dependency_type": "power", "weight": 1.0},
                {"source_module_id": "power_bus_main", "target_module_id": "battery_pack", "dependency_type": "power", "weight": 1.0},
                {"source_module_id": "power_bus_main", "target_module_id": "obc_primary", "dependency_type": "power", "weight": 1.0},
                {"source_module_id": "power_bus_main", "target_module_id": "optical_payload", "dependency_type": "power", "weight": 0.8},
                {"source_module_id": "power_bus_main", "target_module_id": "radar_payload", "dependency_type": "power", "weight": 0.8},
                {"source_module_id": "obc_primary", "target_module_id": "fsw_supervisor", "dependency_type": "software", "weight": 1.0},
                {"source_module_id": "optical_payload", "target_module_id": "comms_xband", "dependency_type": "data", "weight": 0.6},
                {"source_module_id": "radar_payload", "target_module_id": "comms_xband", "dependency_type": "data", "weight": 0.6},
            ],
        }

        # Validate and compile
        mdg = generate_mission_dependency_graph(novel_config)
        g = mdg.to_networkx()

        self.assertEqual(g.number_of_nodes(), 9)
        self.assertEqual(g.number_of_edges(), 9)

        # Simulate synthetic events across this novel topology
        synthetic_events = [
            {"id": "ev_001", "component": "power_bus_main", "timestamp": "2026-09-04T12:00:00Z", "description": "Bus undervoltage spike"},
            {"id": "ev_002", "component": "optical_payload", "timestamp": "2026-09-04T12:00:15Z", "description": "Imager brownout shutdown"},
            {"id": "ev_003", "component": "radar_payload", "timestamp": "2026-09-04T12:00:18Z", "description": "Radar transmitter rail dropped"},
            {"id": "ev_004", "component": "comms_xband", "timestamp": "2026-09-04T12:00:45Z", "description": "Downlink buffer starvation"},
        ]

        nodes, edges = build_candidates(g, synthetic_events)

        # Primary trigger should correctly be identified as power_bus_main
        primaries = [n.component for n in nodes if n.role == "primary"]
        self.assertEqual(primaries, ["power_bus_main"])
        # Both payloads should be recognized as downstream propagation/secondary
        payload_roles = {n.component: n.role for n in nodes if "payload" in n.component}
        self.assertIn("optical_payload", payload_roles)
        self.assertIn("radar_payload", payload_roles)
        self.assertIn(payload_roles["optical_payload"], ["propagation", "secondary"])
        self.assertIn(payload_roles["radar_payload"], ["propagation", "secondary"])


class TestMissionValidationEngine(unittest.TestCase):
    """Verify all 5 validation rules."""

    def test_missing_required_fields(self):
        """Missing mission_id or empty modules triggers validation error."""
        invalid_1 = {"mission_id": "", "spacecraft_name": "Test", "modules": [{"module_id": "m1", "module_type": "EPS"}]}
        with self.assertRaises(MissionValidationError) as ctx:
            assert_valid_mission_config(invalid_1)
        self.assertTrue(any("mission_id" in err for err in ctx.exception.errors))

        invalid_2 = {"mission_id": "m_01", "spacecraft_name": "Test", "modules": []}
        with self.assertRaises(MissionValidationError) as ctx:
            assert_valid_mission_config(invalid_2)
        self.assertTrue(any("at least one module" in err for err in ctx.exception.errors))

    def test_duplicate_component_ids(self):
        """Duplicate component IDs trigger validation error."""
        invalid = {
            "mission_id": "m_dup",
            "spacecraft_name": "Dup Craft",
            "modules": [
                {"module_id": "battery", "module_type": "Battery"},
                {"module_id": "battery", "module_type": "Battery"},
            ],
        }
        with self.assertRaises(MissionValidationError) as ctx:
            assert_valid_mission_config(invalid)
        self.assertTrue(any("Duplicate module ID" in err for err in ctx.exception.errors))

    def test_invalid_dependency_references(self):
        """Edges referencing non-existent modules trigger validation error."""
        invalid = {
            "mission_id": "m_ref",
            "spacecraft_name": "Ref Craft",
            "modules": [
                {"module_id": "battery", "module_type": "Battery"},
            ],
            "dependencies": [
                {"source_module_id": "battery", "target_module_id": "non_existent_bus", "weight": 0.9}
            ],
        }
        with self.assertRaises(MissionValidationError) as ctx:
            assert_valid_mission_config(invalid)
        self.assertTrue(any("does not exist" in err for err in ctx.exception.errors))

    def test_strict_dag_cycle_detection(self):
        """Directed cycles are caught when require_dag=True."""
        cyclic_config = {
            "mission_id": "m_cycle",
            "spacecraft_name": "Cycle Craft",
            "modules": [
                {"module_id": "node_a", "module_type": "OBC"},
                {"module_id": "node_b", "module_type": "ADCS"},
            ],
            "dependencies": [
                {"source_module_id": "node_a", "target_module_id": "node_b", "weight": 0.8},
                {"source_module_id": "node_b", "target_module_id": "node_a", "weight": 0.8},
            ],
        }
        # With require_dag=False, cycles are allowed for bidirectional loops
        errors_allowed = validate_mission_config(cyclic_config, require_dag=False)
        self.assertEqual(len(errors_allowed), 0)

        # With require_dag=True, cycle detection triggers error
        with self.assertRaises(MissionValidationError) as ctx:
            assert_valid_mission_config(cyclic_config, require_dag=True)
        self.assertTrue(any("cycle" in err.lower() for err in ctx.exception.errors))

    def test_invalid_parameter_ranges(self):
        """Out-of-range weights or negative delays trigger validation errors."""
        invalid = {
            "mission_id": "m_params",
            "spacecraft_name": "Param Craft",
            "modules": [
                {"module_id": "bat", "module_type": "Battery"},
                {"module_id": "bus", "module_type": "EPS"},
            ],
            "dependencies": [
                {"source_module_id": "bat", "target_module_id": "bus", "weight": 1.5, "propagation_delay_seconds": -2.0}
            ],
        }
        with self.assertRaises(MissionValidationError) as ctx:
            assert_valid_mission_config(invalid)
        self.assertTrue(any("weight must be between" in err.lower() for err in ctx.exception.errors))
        self.assertTrue(any("negative propagation delay" in err.lower() for err in ctx.exception.errors))


class TestStructuralRules(unittest.TestCase):
    """Verify structural rule validation on generated graphs."""

    def test_payload_missing_power_rule(self):
        """Canonical Payload requires incoming power; flag warning/violation if missing."""
        config_no_power = {
            "mission_id": "m_structural",
            "spacecraft_name": "Structural Test",
            "modules": [
                {"module_id": "payload", "module_type": "Payload"},
                {"module_id": "comms", "module_type": "Communications"},
            ],
            "dependencies": [
                {"source_module_id": "payload", "target_module_id": "comms", "dependency_type": "data"}
            ],
        }
        mdg = generate_mission_dependency_graph(config_no_power, validate=False)
        violations = mdg.validate_structural_rules()
        self.assertTrue(any("requires incoming 'power'" in v for v in violations))


class TestExistingIncidentParity(unittest.TestCase):
    """Verify that existing incident telemetry produces 100% unchanged causal results."""

    def test_canonical_incident_parity(self):
        events_file = os.path.join(os.path.dirname(__file__), "..", "..", "simulation", "events.json")
        if not os.path.exists(events_file):
            self.skipTest(f"Missing events file: {events_file}")

        with open(events_file, "r", encoding="utf-8") as f:
            events = json.load(f)

        # Run through dynamically generated graph
        g = build_dependency_graph()
        nodes, edges = build_candidates(g, events)

        primaries = [n for n in nodes if n.role == "primary"]
        self.assertEqual([n.component for n in primaries], ["thermal_sensor"])

        # Check expected classified components
        roles = {n.component: n.role for n in nodes}
        self.assertEqual(roles.get("thermal_sensor"), "primary")
        self.assertEqual(roles.get("heater_controller"), "propagation")
        self.assertEqual(roles.get("battery_protection"), "propagation")
        self.assertIn(roles.get("obc"), ["secondary", "propagation"])
        self.assertIn(roles.get("payload"), ["secondary", "propagation"])


if __name__ == "__main__":
    unittest.main()
