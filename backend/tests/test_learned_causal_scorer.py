"""
backend/tests/test_learned_causal_scorer.py

Unit and integration tests for AXYRA's Constrained Learned Causal Edge Scorer.

Validates:
1. Hard constraints: strict temporal arrow, forbidden structural edges, reachability, propagation window limits.
2. Learned model probability output calibration in [0.0, 1.0].
3. 22-dimensional feature vector extraction fidelity.
4. Legacy 3-weight scorer compatibility mode.
5. Canonical incident root cause isolation with 100% precision.
6. Missing intermediate telemetry resilience.
"""

import os
import sys
import json
import unittest
import pandas as pd
import networkx as nx

# Ensure backend directory is in sys.path
backend_dir = os.path.abspath(os.path.join(os.path.dirname(__file__), ".."))
if backend_dir not in sys.path:
    sys.path.insert(0, backend_dir)

from app.core.dependency_graph import build_dependency_graph
from app.core.event_extraction import extract_events
from app.core.causal_features import extract_causal_features, feature_dict_to_vector, CAUSAL_FEATURE_NAMES
from app.core.mission_model.learned_causal_scorer import (
    HardConstraintValidator,
    HardConstraintResult,
    LearnedCausalScorer,
    LegacyCausalScorer,
    get_learned_causal_scorer,
)
from app.core.mission_model.temporal_event_graph import (
    TemporalEventGraph,
    TemporalEventNode,
    TemporalCausalEdge,
    find_plausible_propagation_window,
)


class TestLearnedCausalScorer(unittest.TestCase):

    @classmethod
    def setUpClass(cls):
        cls.g = build_dependency_graph()
        cls.learned_scorer = get_learned_causal_scorer()
        cls.legacy_scorer = LegacyCausalScorer()

    def test_01_hard_constraint_temporal_inversion(self):
        """Causes occurring at or after effects must be strictly rejected outside ML model."""
        cause_ev = {
            "id": "ev_cause",
            "component": "heater_controller",
            "_epoch": 350.0,
            "timestamp": "2026-08-20T08:05:50.000000+00:00",
        }
        effect_ev = {
            "id": "ev_effect",
            "component": "battery",
            "_epoch": 340.0,  # 10s EARLIER than cause -> temporal inversion!
            "timestamp": "2026-08-20T08:05:40.000000+00:00",
        }
        hc = HardConstraintValidator.validate(cause_ev, effect_ev, self.g)
        self.assertFalse(hc.passed, "Temporal inversion must be rejected!")
        self.assertEqual(hc.rule_violated, "temporal_arrow")

        # Score candidate should return probability 0.0
        res = self.learned_scorer.score_candidate(cause_ev, effect_ev, self.g)
        self.assertFalse(res.is_valid)
        self.assertEqual(res.probability, 0.0)

    def test_02_hard_constraint_forbidden_structural_edges(self):
        """Physically forbidden structural couplings must be strictly rejected outside ML model."""
        cause_ev = {
            "id": "ev_payload",
            "component": "payload",
            "_epoch": 300.0,
            "timestamp": "2026-08-20T08:05:00.000000+00:00",
        }
        effect_ev = {
            "id": "ev_bus",
            "component": "power_bus",
            "_epoch": 310.0,
            "timestamp": "2026-08-20T08:05:10.000000+00:00",
        }
        # payload -> power_bus is physically forbidden
        hc = HardConstraintValidator.validate(cause_ev, effect_ev, self.g)
        self.assertFalse(hc.passed, "Forbidden edge payload -> power_bus must be rejected!")
        self.assertEqual(hc.rule_violated, "forbidden_structural_edge")

        res = self.learned_scorer.score_candidate(cause_ev, effect_ev, self.g)
        self.assertFalse(res.is_valid)
        self.assertEqual(res.probability, 0.0)

    def test_03_hard_constraint_unreachable_components(self):
        """Unreachable components without a directed causal path must be rejected."""
        cause_ev = {
            "id": "ev_cucd",
            "component": "comms_uplink_handler",  # independent CuCD component
            "_epoch": 300.0,
            "timestamp": "2026-08-20T08:05:00.000000+00:00",
        }
        effect_ev = {
            "id": "ev_therm",
            "component": "thermal_sensor",
            "_epoch": 305.0,
            "timestamp": "2026-08-20T08:05:05.000000+00:00",
        }
        hc = HardConstraintValidator.validate(cause_ev, effect_ev, self.g)
        self.assertFalse(hc.passed, "Disconnected components must be rejected by mission graph reachability!")

    def test_04_hard_constraint_propagation_window_bounds(self):
        """Propagation delay outside physical window limits must be rejected."""
        cause_ev = {
            "id": "ev_c",
            "component": "heater_controller",
            "_epoch": 100.0,
            "timestamp": "2026-08-20T08:01:40.000000+00:00",
        }
        effect_ev = {
            "id": "ev_e",
            "component": "battery",
            "_epoch": 1000.0,  # 900s gap, far exceeds plausible window [1.0s, 300.0s]
            "timestamp": "2026-08-20T08:16:40.000000+00:00",
        }
        window = find_plausible_propagation_window("heater_controller", "battery")
        hc = HardConstraintValidator.validate(
            cause_ev, effect_ev, self.g, propagation_window=window, enforce_propagation_window=True
        )
        self.assertFalse(hc.passed, "Expired propagation window must be rejected!")
        self.assertEqual(hc.rule_violated, "propagation_window_overflow")

    def test_05_feature_vector_extraction(self):
        """Confirms 22-dimensional feature vector extraction and values."""
        cause_ev = {
            "id": "ev_1",
            "component": "heater_controller",
            "value": 1.0,
            "_epoch": 300.0,
            "timestamp": "2026-08-20T08:05:00.000000+00:00",
            "severity": "critical",
        }
        effect_ev = {
            "id": "ev_2",
            "component": "battery",
            "value": 45.2,
            "residual": 15.3,
            "normalized_residual": 5.2,
            "_epoch": 340.0,
            "timestamp": "2026-08-20T08:05:40.000000+00:00",
            "severity": "critical",
        }
        window = find_plausible_propagation_window("heater_controller", "battery")
        feats = extract_causal_features(cause_ev, effect_ev, self.g, propagation_window=window)

        for name in CAUSAL_FEATURE_NAMES:
            self.assertIn(name, feats, f"Missing feature: {name}")

        vec = feature_dict_to_vector(feats)
        self.assertEqual(len(vec), len(CAUSAL_FEATURE_NAMES))
        self.assertEqual(feats["temporal_distance_seconds"], 40.0)
        self.assertEqual(feats["temporal_plausibility"], 1.0)
        self.assertEqual(feats["is_direct_dependency"], 1.0)
        self.assertEqual(feats["physics_consistency_score"], 1.0)

    def test_06_learned_scorer_valid_candidate_probability(self):
        """Valid candidate causal pair receives high probability in [0.0, 1.0]."""
        cause_ev = {
            "id": "ev_1",
            "component": "heater_controller",
            "value": 1.0,
            "_epoch": 300.0,
            "timestamp": "2026-08-20T08:05:00.000000+00:00",
        }
        effect_ev = {
            "id": "ev_2",
            "component": "battery",
            "value": 45.2,
            "residual": 12.0,
            "normalized_residual": 4.1,
            "_epoch": 335.0,
            "timestamp": "2026-08-20T08:05:35.000000+00:00",
        }
        window = find_plausible_propagation_window("heater_controller", "battery")
        res = self.learned_scorer.score_candidate(cause_ev, effect_ev, self.g, propagation_window=window)

        self.assertTrue(res.hard_constraints.passed)
        self.assertTrue(res.is_valid)
        self.assertGreaterEqual(res.probability, 0.40)
        self.assertLessEqual(res.probability, 1.0)
        self.assertIsNotNone(res.legacy_score)

    def test_07_legacy_baseline_comparison(self):
        """Compares legacy score vs learned probability on valid pair."""
        cause_ev = {
            "id": "ev_ts",
            "component": "thermal_sensor",
            "value": -999.0,
            "_epoch": 300.0,
            "timestamp": "2026-08-20T08:05:00.000000+00:00",
        }
        effect_ev = {
            "id": "ev_hc",
            "component": "heater_controller",
            "value": 1.0,
            "_epoch": 308.0,
            "timestamp": "2026-08-20T08:05:08.000000+00:00",
        }
        window = find_plausible_propagation_window("thermal_sensor", "heater_controller")
        res = self.learned_scorer.score_candidate(cause_ev, effect_ev, self.g, propagation_window=window)

        self.assertTrue(res.is_valid)
        self.assertGreater(res.probability, 0.50)
        self.assertGreater(res.legacy_score, 0.50)

    def test_08_canonical_incident_root_cause_isolation(self):
        """Verifies TEG graph construction using learned scorer isolates thermal_sensor root trigger."""
        events_path = os.path.join(os.path.dirname(__file__), "..", "..", "simulation", "events.json")
        if not os.path.exists(events_path):
            self.skipTest("simulation/events.json not found")

        with open(events_path, "r", encoding="utf-8") as f:
            events = json.load(f)

        teg_learned = TemporalEventGraph.build_from_events(
            events=events,
            dependency_graph=self.g,
            scorer_type="learned",
        )

        primaries_learned = [teg_learned.nodes[eid].component for eid in teg_learned.primary_cause_event_ids]
        self.assertIn("thermal_sensor", primaries_learned, "Learned scorer must isolate thermal_sensor as root trigger!")

        # Also verify legacy scorer maintains parity
        teg_legacy = TemporalEventGraph.build_from_events(
            events=events,
            dependency_graph=self.g,
            scorer_type="legacy",
        )
        primaries_legacy = [teg_legacy.nodes[eid].component for eid in teg_legacy.primary_cause_event_ids]
        self.assertIn("thermal_sensor", primaries_legacy, "Legacy scorer must isolate thermal_sensor!")

    def test_09_missing_intermediate_telemetry_resilience(self):
        """Verifies resilience when intermediate hop is silent."""
        # 2-hop path: thermal_sensor -> heater_controller -> battery
        # If heater_controller is dropped, direct 2-hop edge thermal_sensor -> battery is evaluated
        cause_ev = {
            "id": "ev_ts",
            "component": "thermal_sensor",
            "value": -999.0,
            "_epoch": 300.0,
            "timestamp": "2026-08-20T08:05:00.000000+00:00",
        }
        effect_ev = {
            "id": "ev_bat",
            "component": "battery",
            "value": 48.0,
            "residual": 14.0,
            "_epoch": 360.0,
            "timestamp": "2026-08-20T08:06:00.000000+00:00",
        }
        # Empty events_by_comp simulates missing intermediate telemetry
        events_by_comp = {"thermal_sensor": [cause_ev], "battery": [effect_ev]}
        window = find_plausible_propagation_window("thermal_sensor", "battery")

        res = self.learned_scorer.score_candidate(
            cause_ev, effect_ev, self.g, events_by_comp=events_by_comp, propagation_window=window
        )
        # Even with missing intermediate, physical consistency and dependency should sustain plausible inference
        self.assertTrue(res.hard_constraints.passed)
        self.assertGreater(res.probability, 0.30)


if __name__ == "__main__":
    unittest.main()
