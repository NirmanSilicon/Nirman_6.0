"""
backend/tests/test_temporal_event_graph.py

Unit tests for the Temporal Event Graph (TEG) active incident representation:
1. Event ordering: verify chronological sequence in TEG nodes.
2. Impossible causal direction: verify hard rule T_cause < T_effect rejects backward and concurrent causality.
3. Propagation-window rejection: verify enforce_propagation_window rejects gaps outside canonical template bounds.
4. Multiple events from the same component: verify internal progression linking (S_dependency = 1.0).
5. Missing intermediate events: verify S_intermediate = 0.0 when expected path components have no events.
6. Simultaneous unrelated anomalies: verify isolated anomalies are classified as role="independent".
7. Canonical cascade parity: verify exact root-cause identification on simulation/events.json.
"""

import os
import sys
import json
import unittest

# Ensure backend directory is in sys.path
backend_dir = os.path.abspath(os.path.join(os.path.dirname(__file__), ".."))
if backend_dir not in sys.path:
    sys.path.insert(0, backend_dir)

from app.core.mission_model.temporal_event_graph import (
    TemporalEventGraph,
    TemporalEventNode,
    TemporalCausalEdge,
    find_plausible_propagation_window,
    compute_temporal_score,
)
from app.core.mission_model.graph_generator import generate_mission_dependency_graph
from app.core.causal_engine import build_candidates, build_dependency_graph


class TestTemporalEventGraph(unittest.TestCase):
    def setUp(self):
        self.mdg = generate_mission_dependency_graph(validate=False)
        self.g_craft = self.mdg.to_networkx()

    def test_01_event_ordering(self):
        """Verify events fed out of chronological order are correctly sorted by epoch."""
        unordered_events = [
            {"id": "ev_3", "timestamp": "2026-03-30T08:06:00", "component": "battery", "value": 65.0},
            {"id": "ev_1", "timestamp": "2026-03-30T08:05:00", "component": "thermal_sensor", "value": -999.0},
            {"id": "ev_2", "timestamp": "2026-03-30T08:05:05", "component": "heater_controller", "value": 1.0},
        ]
        teg = TemporalEventGraph.build_from_events(
            events=unordered_events,
            dependency_graph=self.g_craft,
        )
        ordered_ids = [e["id"] for e in teg.raw_events]
        self.assertEqual(ordered_ids, ["ev_1", "ev_2", "ev_3"])
        self.assertLess(teg.nodes["ev_1"].timestamp_epoch, teg.nodes["ev_2"].timestamp_epoch)
        self.assertLess(teg.nodes["ev_2"].timestamp_epoch, teg.nodes["ev_3"].timestamp_epoch)

    def test_02_impossible_causal_direction(self):
        """Verify T_cause < T_effect hard rule: effects cannot cause earlier or concurrent events."""
        events = [
            {"id": "ev_early", "timestamp": "2026-03-30T08:05:00", "component": "thermal_sensor", "value": -999.0},
            {"id": "ev_late", "timestamp": "2026-03-30T08:05:05", "component": "heater_controller", "value": 1.0},
            {"id": "ev_concurrent", "timestamp": "2026-03-30T08:05:00", "component": "heater_controller", "value": 1.0},
        ]
        teg = TemporalEventGraph.build_from_events(events=events, dependency_graph=self.g_craft)

        # No edge should have ev_late as cause of ev_early (backward)
        backward_edges = [
            e for e in teg.edges
            if e.source_event_id == "ev_late" and e.target_event_id == "ev_early"
        ]
        self.assertEqual(len(backward_edges), 0)

        # No edge should connect concurrent events with identical timestamp (T_cause == T_effect)
        concurrent_edges = [
            e for e in teg.edges
            if e.source_event_id == "ev_early" and e.target_event_id == "ev_concurrent"
        ]
        self.assertEqual(len(concurrent_edges), 0)

    def test_03_propagation_window_rejection(self):
        """Verify enforce_propagation_window=True rejects delays outside canonical window."""
        # heater_controller -> battery window typical max is 300s
        window = find_plausible_propagation_window("heater_controller", "battery")
        self.assertIn("min_seconds", window)
        self.assertIn("max_seconds", window)

        events_too_slow = [
            {"id": "ev_heat", "timestamp": "2026-03-30T08:00:00", "component": "heater_controller", "value": 1.0},
            # 2 hours later (7200s gap) - way outside thermal inertia window
            {"id": "ev_bat", "timestamp": "2026-03-30T10:00:00", "component": "battery", "value": 75.0},
        ]

        # With enforce_propagation_window=True, the candidate edge must be rejected
        teg_strict = TemporalEventGraph.build_from_events(
            events=events_too_slow,
            dependency_graph=self.g_craft,
            enforce_propagation_window=True,
        )
        edge_strict = [
            e for e in teg_strict.edges
            if e.source_event_id == "ev_heat" and e.target_event_id == "ev_bat"
        ]
        self.assertEqual(len(edge_strict), 0)

        # With enforce_propagation_window=False (standard scoring), it is kept with degraded s_temporal
        teg_lenient = TemporalEventGraph.build_from_events(
            events=events_too_slow,
            dependency_graph=self.g_craft,
            enforce_propagation_window=False,
        )
        edge_lenient = [
            e for e in teg_lenient.edges
            if e.source_event_id == "ev_heat" and e.target_event_id == "ev_bat"
        ]
        self.assertEqual(len(edge_lenient), 1)
        self.assertLessEqual(edge_lenient[0].s_temporal, 0.25)

    def test_04_multiple_events_same_component(self):
        """Verify multiple events on the same component form internal progression causal links."""
        events = [
            {"id": "ev_bat_warn", "timestamp": "2026-03-30T08:05:43", "component": "battery", "value": 55.0, "description": "Battery cell temperature warning"},
            {"id": "ev_bat_crit", "timestamp": "2026-03-30T08:06:28", "component": "battery", "value": 85.0, "description": "Battery thermal runaway critical"},
        ]
        teg = TemporalEventGraph.build_from_events(
            events=events,
            dependency_graph=self.g_craft,
            allow_same_component=True,
        )
        # Should find causal link from ev_bat_warn to ev_bat_crit
        internal_edges = [
            e for e in teg.edges
            if e.source_event_id == "ev_bat_warn" and e.target_event_id == "ev_bat_crit"
        ]
        self.assertEqual(len(internal_edges), 1)
        self.assertEqual(internal_edges[0].dependency_type, "internal_progression")
        self.assertEqual(internal_edges[0].s_dependency, 1.0)
        self.assertGreater(internal_edges[0].confidence, 0.8)

    def test_05_missing_intermediate_events(self):
        """Verify S_intermediate evaluates to 0.0 when multi-hop path intermediates lack events."""
        # Path: thermal_sensor -> heater_controller -> battery
        # If heater_controller event is MISSING, S_intermediate for thermal_sensor -> battery should be 0.0
        events_without_intermediate = [
            {"id": "ev_sensor", "timestamp": "2026-03-30T08:05:00", "component": "thermal_sensor", "value": -999.0},
            {"id": "ev_bat", "timestamp": "2026-03-30T08:06:00", "component": "battery", "value": 70.0},
        ]
        teg = TemporalEventGraph.build_from_events(
            events=events_without_intermediate,
            dependency_graph=self.g_craft,
        )
        edges = [
            e for e in teg.edges
            if e.source_event_id == "ev_sensor" and e.target_event_id == "ev_bat"
        ]
        self.assertEqual(len(edges), 1)
        self.assertEqual(edges[0].s_intermediate, 0.0)

        # Now include the intermediate heater_controller event
        events_with_intermediate = [
            {"id": "ev_sensor", "timestamp": "2026-03-30T08:05:00", "component": "thermal_sensor", "value": -999.0},
            {"id": "ev_heater", "timestamp": "2026-03-30T08:05:05", "component": "heater_controller", "value": 1.0},
            {"id": "ev_bat", "timestamp": "2026-03-30T08:06:00", "component": "battery", "value": 70.0},
        ]
        teg_verified = TemporalEventGraph.build_from_events(
            events=events_with_intermediate,
            dependency_graph=self.g_craft,
        )
        edges_verified = [
            e for e in teg_verified.edges
            if e.source_event_id == "ev_sensor" and e.target_event_id == "ev_bat"
        ]
        self.assertEqual(len(edges_verified), 1)
        self.assertEqual(edges_verified[0].s_intermediate, 1.0)
        self.assertGreater(edges_verified[0].confidence, edges[0].confidence)

    def test_06_simultaneous_unrelated_anomalies(self):
        """Verify unrelated anomalies outside or disconnected in graph are classified as role='independent'."""
        events = [
            {"id": "ev_root", "timestamp": "2026-03-30T08:05:00", "component": "thermal_sensor", "value": -999.0},
            {"id": "ev_cascade", "timestamp": "2026-03-30T08:05:05", "component": "heater_controller", "value": 1.0},
            # Independent glitch on an isolated/unconnected component
            {"id": "ev_unrelated", "timestamp": "2026-03-30T08:05:02", "component": "unrelated_cyber_node", "value": 42.0},
        ]
        teg = TemporalEventGraph.build_from_events(
            events=events,
            dependency_graph=self.g_craft,
        )
        self.assertIn("ev_unrelated", teg.nodes)
        self.assertEqual(teg.nodes["ev_unrelated"].role, "independent")
        self.assertEqual(teg.nodes["ev_root"].role, "primary")

    def test_07_canonical_cascade_parity(self):
        """Verify execution against canonical simulation/events.json produces thermal_sensor primary cause."""
        events_file = os.path.join(backend_dir, "..", "simulation", "events.json")
        if not os.path.exists(events_file):
            self.skipTest(f"Missing events file: {events_file}")

        with open(events_file, "r", encoding="utf-8") as f:
            events = json.load(f)

        g = build_dependency_graph()
        nodes, edges = build_candidates(g, events)

        primaries = [n for n in nodes if n.role == "primary"]
        self.assertEqual(len(primaries), 1)
        self.assertEqual(primaries[0].component, "thermal_sensor")

        # Also verify via TemporalEventGraph directly
        teg = TemporalEventGraph.build_from_events(events=events, dependency_graph=g)
        self.assertIn(primaries[0].event_id, teg.primary_cause_event_ids)
        self.assertEqual(teg.nodes[teg.primary_cause_event_ids[0]].component, "thermal_sensor")


if __name__ == "__main__":
    unittest.main()
