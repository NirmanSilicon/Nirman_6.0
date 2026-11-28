"""
backend/tests/test_mission_model.py

Unit tests for the AXYRA Mission Architecture Compatibility Boundary.
Validates:
1. SubsystemTemplate and STANDARD_CUBESAT_13_NODE_TEMPLATE parity with legacy build_dependency_graph().
2. MissionConfig serialization and defaults.
3. CausalModelSpec scoring calculations and weights loader.
4. EventRecord legacy compatibility adapters.
5. MissionCausalGraph compilation and exact output parity with build_candidates().
6. Counterfactual reachability simulation on the compiled mission graph.
"""

import os
import sys
import unittest
import networkx as nx
from dataclasses import asdict

# Add backend directory to sys.path
sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__), "..")))

from app.core.dependency_graph import build_dependency_graph, path_strength
from app.core.causal_engine import build_candidates
from app.simulate.log_generator import generate_baseline, DEFAULTS
from app.simulate.fault_injector import inject_cascade
from app.core.event_extraction import extract_events

from app.core.mission_model import (
    MissionConfig,
    SubsystemTemplate,
    STANDARD_CUBESAT_13_NODE_TEMPLATE,
    STRENGTH_WEIGHT,
    CausalModelSpec,
    CausalScoringWeights,
    STANDARD_CAUSAL_MODEL_SPEC,
    load_causal_spec_from_file,
    EventRecord,
    MissionCausalGraph,
    compile_mission_graph_from_events,
)


class TestMissionArchitectureBoundary(unittest.TestCase):
    def setUp(self):
        self.legacy_g = build_dependency_graph()
        self.template_g = STANDARD_CUBESAT_13_NODE_TEMPLATE.to_networkx()

    def test_template_node_and_edge_parity(self):
        """Verify the standard template compiles to identical node and edge sets."""
        self.assertEqual(len(self.template_g.nodes), 13)
        self.assertEqual(len(self.template_g.edges), 16)
        self.assertEqual(set(self.legacy_g.nodes), set(self.template_g.nodes))
        self.assertEqual(set(self.legacy_g.edges), set(self.template_g.edges))

    def test_template_edge_attributes_parity(self):
        """Verify every edge has identical dependency_type and dependency_strength."""
        for u, v in self.legacy_g.edges:
            legacy_attr = self.legacy_g.edges[u, v]
            template_attr = self.template_g.edges[u, v]
            self.assertEqual(legacy_attr["dependency_type"], template_attr["dependency_type"])
            self.assertEqual(legacy_attr["dependency_strength"], template_attr["dependency_strength"])

    def test_path_strength_parity(self):
        """Verify multi-hop path strength is identical between legacy and template graph."""
        legacy_strength = path_strength(self.legacy_g, "thermal_sensor", "payload")
        template_strength = path_strength(self.template_g, "thermal_sensor", "payload")
        self.assertEqual(legacy_strength, template_strength)
        self.assertAlmostEqual(template_strength, 0.5625)

    def test_mission_config_roundtrip(self):
        """Verify MissionConfig serializes to dict and back cleanly."""
        cfg = MissionConfig(mission_id="test_mission_01", craft_class="CubeSat 6U", duration_seconds=900)
        d = cfg.to_dict()
        self.assertEqual(d["mission_id"], "test_mission_01")
        self.assertEqual(d["duration_seconds"], 900)
        reconstructed = MissionConfig.from_dict(d)
        self.assertEqual(reconstructed.mission_id, "test_mission_01")
        self.assertEqual(reconstructed.duration_seconds, 900)

    def test_causal_model_spec_scoring(self):
        """Verify CausalModelSpec calculates composite confidence accurately."""
        spec = CausalModelSpec(
            scoring_weights=CausalScoringWeights(w_temporal=0.0475, w_dependency=0.6320, w_intermediate=0.3205)
        )
        conf = spec.compute_confidence(s_temporal=1.0, s_dependency=1.0, s_intermediate=1.0)
        self.assertAlmostEqual(conf, 1.0, places=4)

        conf_partial = spec.compute_confidence(s_temporal=0.5, s_dependency=0.75, s_intermediate=0.5)
        expected = 0.0475 * 0.5 + 0.6320 * 0.75 + 0.3205 * 0.5
        self.assertAlmostEqual(conf_partial, expected, places=5)

    def test_event_record_adapter(self):
        """Verify EventRecord wraps both legacy events and dictionaries."""
        raw_dict = {
            "id": "evt_test_1",
            "timestamp": "2026-09-02T12:00:00Z",
            "component": "thermal_sensor",
            "event_type": "threshold",
            "value": -999.0,
            "description": "thermal sensor freeze",
            "severity": "critical",
            "timing_confidence": "documented",
        }
        record = EventRecord.from_legacy_event(raw_dict)
        self.assertEqual(record.id, "evt_test_1")
        self.assertEqual(record.component, "thermal_sensor")
        self.assertEqual(record.value, -999.0)

        legacy_back = record.to_legacy_dict()
        self.assertEqual(legacy_back["id"], "evt_test_1")
        self.assertEqual(legacy_back["severity"], "critical")

    def test_canonical_cascade_genealogy_parity(self):
        """
        Verify that compiling through the architectural boundary generates the
        EXACT same nodes, roles, edge weights, and root cause as the legacy engine.
        """
        # Generate canonical cascade
        components = list(DEFAULTS.keys())
        baseline_df = generate_baseline(components, duration_seconds=600, seed=42)
        cascade_df = inject_cascade(baseline_df, cascade_start_offset_s=300, scenario_key="thermal_sensor", randomize_jitter=False)
        events_raw = extract_events(cascade_df)
        events_dicts = [asdict(e) for e in events_raw]

        # 1. Legacy execution
        legacy_nodes, legacy_edges = build_candidates(self.legacy_g, events_dicts)

        # 2. Boundary execution
        mission_graph = compile_mission_graph_from_events(
            incident_id="test_inc_parity",
            events=events_dicts,
            template=STANDARD_CUBESAT_13_NODE_TEMPLATE,
            causal_spec=STANDARD_CAUSAL_MODEL_SPEC,
        )

        # Assertions
        self.assertEqual(len(mission_graph.nodes), len(legacy_nodes))
        self.assertEqual(len(mission_graph.edges), len(legacy_edges))

        # Check primary cause parity
        legacy_primaries = [n for n in legacy_nodes if n.role == "primary"]
        boundary_primaries = [n for n in mission_graph.nodes if n.role == "primary"]
        self.assertEqual(len(boundary_primaries), len(legacy_primaries))
        self.assertEqual(boundary_primaries[0].component, "thermal_sensor")
        self.assertEqual(mission_graph.primary_cause_event_id, boundary_primaries[0].event_id)

        # Check exact confidence and role parity for every node
        legacy_by_id = {n.event_id: n for n in legacy_nodes}
        for node in mission_graph.nodes:
            leg_node = legacy_by_id[node.event_id]
            self.assertEqual(node.role, leg_node.role)
            self.assertAlmostEqual(node.confidence, leg_node.confidence, places=5)
            self.assertEqual(node.confidence_label, leg_node.confidence_label)

    def test_mission_graph_counterfactual_simulation(self):
        """Verify the counterfactual simulation on the compiled mission graph."""
        components = list(DEFAULTS.keys())
        baseline_df = generate_baseline(components, duration_seconds=600, seed=42)
        cascade_df = inject_cascade(baseline_df, cascade_start_offset_s=300, scenario_key="thermal_sensor", randomize_jitter=False)
        events_raw = extract_events(cascade_df)
        events_dicts = [asdict(e) for e in events_raw]

        mission_graph = compile_mission_graph_from_events("test_inc_cf", events_dicts)
        primary_id = mission_graph.primary_cause_event_id
        self.assertIsNotNone(primary_id)

        cf_res = mission_graph.simulate_counterfactual(target_event_id=primary_id, minutes_earlier=10.0)
        self.assertGreater(cf_res["prevented_count"], 1)
        self.assertIn(primary_id, cf_res["prevented_event_ids"])
        self.assertIn("would prevent", cf_res["summary"])


if __name__ == "__main__":
    unittest.main()
