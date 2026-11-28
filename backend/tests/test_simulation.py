"""
test_simulation.py

Unit tests for Stage 0 (Dependency Graph), Stage 1 (Simulation & Calibration),
Stage 2 (Event Extraction), and Stage 3 (Causal Inference Engine).
"""

import os
import sys
import unittest
import pandas as pd

# Add backend directory to sys.path
sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__), "..")))

from app.core.dependency_graph import (
    build_dependency_graph,
    path_strength,
    get_upstream_candidates,
    get_downstream_dependents,
)
from app.simulate.log_generator import generate_baseline, load_calibration, DEFAULTS
from app.simulate.fault_injector import inject_cascade, splice_independent_event, CANONICAL_CASCADE
from app.core.event_extraction import extract_events
from app.core.causal_engine import build_candidates
from simulation.real_incident_loader import load_real_incident, generate_replay_telemetry, list_real_incidents


class TestDependencyGraph(unittest.TestCase):
    def setUp(self):
        self.g = build_dependency_graph()

    def test_nodes_and_edges_count(self):
        """Verify all 13 subsystems (including flight_software) and 16 dependency edges are present."""
        self.assertEqual(len(self.g.nodes), 13)
        self.assertEqual(len(self.g.edges), 16)
        self.assertIn("flight_software", self.g.nodes)

    def test_causal_path_and_decay(self):
        """Verify direct and multi-hop path strength calculations."""
        direct = path_strength(self.g, "thermal_sensor", "heater_controller")
        self.assertEqual(direct, 1.0)

        multihop = path_strength(self.g, "thermal_sensor", "payload")
        self.assertAlmostEqual(multihop, 0.5625)

        backward = path_strength(self.g, "payload", "thermal_sensor")
        self.assertIsNone(backward)

    def test_flight_software_causal_paths(self):
        """Verify causal paths involving flight_software control loop."""
        fs_to_comms = path_strength(self.g, "flight_software", "comms")
        self.assertEqual(fs_to_comms, 1.0)

        obc_to_fs = path_strength(self.g, "obc", "flight_software")
        self.assertEqual(obc_to_fs, 1.0)

    def test_independent_isolation(self):
        """Verify comms_uplink_handler is not in graph and has no path."""
        self.assertNotIn("comms_uplink_handler", self.g.nodes)
        self.assertIsNone(path_strength(self.g, "thermal_sensor", "comms_uplink_handler"))


class TestSimulationPipeline(unittest.TestCase):
    def test_baseline_generation(self):
        """Verify baseline generation produces rows for all components with valid values."""
        df = generate_baseline(list(DEFAULTS.keys()), duration_seconds=60)
        self.assertFalse(df.empty)
        self.assertEqual(set(df["component"].unique()), set(DEFAULTS.keys()))
        self.assertListEqual(list(df.columns), ["timestamp", "component", "parameter", "value"])

    def test_cascade_injection_and_timing(self):
        """Verify canonical cascade injects all 9 events in deterministic chronological order."""
        baseline = generate_baseline(list(DEFAULTS.keys()), duration_seconds=600)
        incident = inject_cascade(baseline, cascade_start_offset_s=300, randomize_jitter=False)

        cascade_rows = incident[incident["injected_note"].notna()].reset_index(drop=True)
        self.assertEqual(len(cascade_rows), 9)

        expected_order = [
            "thermal_sensor",
            "heater_controller",
            "battery",
            "battery",
            "battery_protection",
            "power_bus",
            "obc",
            "comms",
            "payload",
        ]
        self.assertListEqual(list(cascade_rows["component"]), expected_order)

    def test_independent_splicing(self):
        """Verify independent CuCD anomaly splicing."""
        baseline = generate_baseline(list(DEFAULTS.keys()), duration_seconds=600)
        cucd_json_path = os.path.abspath(
            os.path.join(os.path.dirname(__file__), "..", "..", "simulation", "independent_event.json")
        )
        if os.path.exists(cucd_json_path):
            incident = splice_independent_event(baseline, cucd_json_path, offset_from_start_s=450)
            cucd_rows = incident[incident["component"] == "comms_uplink_handler"]
            self.assertEqual(len(cucd_rows), 50)


class TestEventExtractionAndCausalEngine(unittest.TestCase):
    def test_end_to_end_causal_reasoning(self):
        """Verify canonical cascade correctly reduces to thermal_sensor as primary trigger."""
        baseline = generate_baseline(list(DEFAULTS.keys()), duration_seconds=600)
        cucd_json_path = os.path.abspath(
            os.path.join(os.path.dirname(__file__), "..", "..", "simulation", "independent_event.json")
        )
        incident = inject_cascade(baseline, cascade_start_offset_s=300, randomize_jitter=False)
        if os.path.exists(cucd_json_path):
            incident = splice_independent_event(incident, cucd_json_path, offset_from_start_s=450)

        events = extract_events(incident[["timestamp", "component", "parameter", "value"]], z_warn=4.0, z_crit=5.0)
        events_dicts = [
            {"id": e.id, "timestamp": e.timestamp, "component": e.component, "event_type": e.event_type, "value": e.value, "description": e.description}
            for e in events
        ]

        g = build_dependency_graph()
        nodes, edges = build_candidates(g, events_dicts)

        primaries = [n for n in nodes if n.role == "primary"]
        self.assertEqual(len(primaries), 1, f"Expected exactly 1 primary trigger, found: {[p.component for p in primaries]}")
        self.assertEqual(primaries[0].component, "thermal_sensor")

        # Verify independent events
        independents = [n for n in nodes if n.role == "independent"]
        self.assertTrue(any(n.component == "comms_uplink_handler" for n in independents))

    def test_capstone_real_incident_replay_end_to_end(self):
        """Verify NASA CAPSTONE (2022) real incident telemetry generation and causal tracing."""
        real_incidents = list_real_incidents()
        incident_ids = [inc.scenario_id for inc in real_incidents]
        self.assertIn("capstone_2022", incident_ids)

        capstone_def = load_real_incident("capstone_2022")
        self.assertIn("CAPSTONE", capstone_def.display_name)
        self.assertEqual(capstone_def.source_citation, "NASA CAPSTONE mission status reporting, 2022")
        self.assertEqual(len(capstone_def.events), 5)

        # Check timing confidence classifications
        documented_events = [e for e in capstone_def.events if e.timing_confidence == "documented"]
        estimated_events = [e for e in capstone_def.events if e.timing_confidence == "estimated"]
        self.assertEqual(len(documented_events), 4)
        self.assertEqual(len(estimated_events), 1)

        # Generate replay telemetry with calibrated baseline noise
        replay_df = generate_replay_telemetry(capstone_def, duration_seconds=600)
        self.assertFalse(replay_df.empty)
        self.assertIn("injected_note", replay_df.columns)
        self.assertIn("timing_confidence", replay_df.columns)

        # Extract events and run causal inference
        events = extract_events(replay_df[["timestamp", "component", "parameter", "value"]], z_warn=4.0, z_crit=5.0)
        events_dicts = [
            {
                "id": e.id,
                "timestamp": e.timestamp,
                "component": e.component,
                "event_type": e.event_type,
                "value": e.value,
                "description": e.description,
                "timing_confidence": getattr(e, "timing_confidence", "documented"),
            }
            for e in events
        ]

        g = build_dependency_graph()
        nodes, edges = build_candidates(g, events_dicts)

        # Verify comms is identified as the root trigger of the command sequence
        primaries = [n for n in nodes if n.role == "primary"]
        self.assertGreaterEqual(len(primaries), 1)
        self.assertEqual(primaries[0].component, "comms")

    def test_dellingr_real_incident_replay_end_to_end(self):
        """Verify NASA Dellingr (2017) real incident telemetry generation."""
        real_incidents = list_real_incidents()
        incident_ids = [inc.scenario_id for inc in real_incidents]
        self.assertIn("dellingr_2017", incident_ids)

        dellingr_def = load_real_incident("dellingr_2017")
        self.assertIn("Dellingr", dellingr_def.display_name)
        self.assertEqual(len(dellingr_def.events), 5)

        replay_df = generate_replay_telemetry(dellingr_def, duration_seconds=600)
        self.assertFalse(replay_df.empty)
        self.assertEqual(len(replay_df[replay_df["injected_note"].notna()]), 5)


if __name__ == "__main__":
    unittest.main()
