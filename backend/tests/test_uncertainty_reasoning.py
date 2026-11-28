"""
backend/tests/test_uncertainty_reasoning.py

Comprehensive test suite verifying the uncertainty reasoning layer, competing hypotheses,
missing evidence, and out-of-distribution (OOD) pattern handling across:
1. 4-tier standardized confidence scale (HIGH CONFIDENCE, MODERATE CONFIDENCE, LOW CONFIDENCE, INSUFFICIENT EVIDENCE).
2. Ambiguous root causes when candidate explanations are close (margin < 0.12).
3. Decisive single root cause attribution when margin >= 0.12.
4. Out-of-distribution (OOD) pattern rejection via ensemble disagreement and conformal envelope departure.
5. Missing intermediate evidence detection on multi-hop causal paths.
6. Structural counterfactual simulation confidence tier assignment.
7. Serialization of uncertainty fields in Genealogy, Node, Edge, and Counterfactual schemas.
"""

import os
import sys
import unittest
import numpy as np

backend_dir = os.path.abspath(os.path.join(os.path.dirname(__file__), ".."))
repo_root = os.path.abspath(os.path.join(backend_dir, ".."))
if backend_dir not in sys.path:
    sys.path.insert(0, backend_dir)
if repo_root not in sys.path:
    sys.path.insert(0, repo_root)

from app.core.mission_model.temporal_event_graph import (
    TemporalEventGraph,
    to_confidence_tier,
)
from app.core.mission_model.structural_simulator import (
    StructuralCounterfactualSimulator,
)
from app.core.mission_model.graph_generator import generate_mission_dependency_graph
from app.core.causal_engine import generate_mission_causal_graph
from app.api.schemas import (
    CausalNode,
    CausalEdge,
    GenealogyResponse,
    CounterfactualResponse,
)
from app.api.serializers import (
    GenealogyResponseSerializer,
    CounterfactualResponseSerializer,
)


class TestUncertaintyReasoning(unittest.TestCase):
    def setUp(self):
        self.mdg = generate_mission_dependency_graph(validate=False)
        self.g_craft = self.mdg.to_networkx()

    def test_01_confidence_tiers_standardized(self):
        """Verify the 4-tier standardized scale correctly maps scores across all thresholds."""
        self.assertEqual(to_confidence_tier(0.95), "HIGH CONFIDENCE")
        self.assertEqual(to_confidence_tier(0.85), "HIGH CONFIDENCE")
        self.assertEqual(to_confidence_tier(0.84), "MODERATE CONFIDENCE")
        self.assertEqual(to_confidence_tier(0.60), "MODERATE CONFIDENCE")
        self.assertEqual(to_confidence_tier(0.59), "LOW CONFIDENCE")
        self.assertEqual(to_confidence_tier(0.35), "LOW CONFIDENCE")
        self.assertEqual(to_confidence_tier(0.34), "INSUFFICIENT EVIDENCE")
        self.assertEqual(to_confidence_tier(0.0), "INSUFFICIENT EVIDENCE")
        self.assertEqual(to_confidence_tier(-0.5), "INSUFFICIENT EVIDENCE")
        self.assertEqual(to_confidence_tier(None), "INSUFFICIENT EVIDENCE")

    def test_02_ambiguous_root_causes_with_competing_hypotheses(self):
        """
        Verify that when two root candidates have close scores (margin < 0.12),
        the system flags is_ambiguous_root = True and lists competing_hypotheses
        instead of forcing a single deterministic root cause.
        """
        # Dual competing candidate root causes: eps_regulator vs battery_protection
        # Both occur concurrently at incident start and both are direct parents of power_bus
        ambiguous_events = [
            {
                "id": "ev_solar",
                "timestamp": "2026-03-30T08:05:00",
                "component": "solar_array",
                "value": 0.1,
                "description": "Solar array MPPT dropout / voltage oscillation",
            },
            {
                "id": "ev_prot",
                "timestamp": "2026-03-30T08:05:01",
                "component": "battery_protection",
                "value": 0.0,
                "description": "Battery protection solid-state switch trip",
            },
            {
                "id": "ev_bus",
                "timestamp": "2026-03-30T08:05:04",
                "component": "power_bus",
                "value": 0.04,
                "description": "Main power bus voltage collapse",
            },
        ]

        teg = TemporalEventGraph.build_from_events(
            events=ambiguous_events,
            dependency_graph=self.g_craft,
            confidence_threshold=0.35,
        )

        # Ambiguous root should be detected
        self.assertTrue(teg.is_ambiguous_root, "System should flag ambiguous root cause when top hypotheses are close")
        self.assertGreaterEqual(len(teg.competing_hypotheses), 2, "Must list at least 2 competing candidate root causes")
        
        # Check margin
        top_h = teg.competing_hypotheses[0]
        second_h = teg.competing_hypotheses[1]
        self.assertLess(second_h["margin_from_top"], 0.12, "Competing hypotheses margin must be < 0.12")
        
        # Confidence tier should reflect ambiguity
        self.assertIn(teg.confidence_tier, ["MODERATE CONFIDENCE", "LOW CONFIDENCE"])

    def test_03_decisive_single_root_cause(self):
        """
        Verify that when one root candidate clearly dominates (margin >= 0.12),
        the system sets is_ambiguous_root = False and assigns HIGH CONFIDENCE.
        """
        clear_cascade_events = [
            {
                "id": "ev_origin",
                "timestamp": "2026-03-30T08:05:00",
                "component": "thermal_sensor",
                "value": -240.2,
                "description": "Primary thermal sensor open circuit",
            },
            {
                "id": "ev_downstream_1",
                "timestamp": "2026-03-30T08:05:08",
                "component": "heater_controller",
                "value": 28.4,
                "description": "Emergency survival heating engaged 100%",
            },
            {
                "id": "ev_downstream_2",
                "timestamp": "2026-03-30T08:06:20",
                "component": "battery",
                "value": 2.78,
                "description": "Battery pack rapid depletion",
            },
        ]

        teg = TemporalEventGraph.build_from_events(
            events=clear_cascade_events,
            dependency_graph=self.g_craft,
        )

        self.assertFalse(teg.is_ambiguous_root, "Single dominant root should not be flagged as ambiguous")
        self.assertEqual(teg.primary_cause_event_id, "ev_origin")
        self.assertEqual(teg.confidence_tier, "HIGH CONFIDENCE")
        self.assertEqual(teg.pattern_status, "KNOWN PATTERN")

    def test_04_out_of_distribution_pattern_rejection(self):
        """
        Verify that out-of-distribution patterns (high ensemble disagreement or envelope departure)
        are flagged as UNKNOWN / OUT-OF-DISTRIBUTION.
        """
        from ai_model.infer_telemetry import score_telemetry_window

        # Normal telemetry sample
        normal_feats = {
            "feat_mean": 21.4,
            "feat_std": 0.35,
            "feat_min": 20.9,
            "feat_max": 22.1,
            "feat_range": 1.2,
            "feat_rate_of_change": 0.02,
            "feat_skewness": 0.05,
        }
        res_normal = score_telemetry_window(normal_feats)
        self.assertFalse(res_normal.get("is_out_of_distribution", False))
        self.assertEqual(res_normal.get("pattern_status"), "KNOWN PATTERN")

        # Wildly out-of-distribution telemetry sample (extreme rate of change & range far outside standard bounds)
        extreme_ood_feats = {
            "feat_mean": -850.0,
            "feat_std": 140.0,
            "feat_min": -1500.0,
            "feat_max": 1200.0,
            "feat_range": 2700.0,
            "feat_rate_of_change": 450.0,
            "feat_skewness": 15.0,
        }
        res_ood = score_telemetry_window(extreme_ood_feats)
        self.assertTrue(res_ood.get("is_out_of_distribution"), "Extreme sensor excursion must be flagged as OOD")
        self.assertEqual(res_ood.get("pattern_status"), "UNKNOWN / OUT-OF-DISTRIBUTION")
        self.assertIn(res_ood.get("confidence_tier"), ["LOW CONFIDENCE", "INSUFFICIENT EVIDENCE"])
        self.assertTrue(len(res_ood.get("ood_rationale", "")) > 0)

    def test_05_missing_evidence_intermediate_path(self):
        """
        Verify that if an expected intermediate component on a causal path has no recorded events,
        the system captures it in missing_evidence.
        """
        # Thermal sensor directly to battery without heater controller intermediate event
        gapped_events = [
            {
                "id": "ev_thm_gap",
                "timestamp": "2026-03-30T08:05:00",
                "component": "thermal_sensor",
                "value": -240.2,
            },
            {
                "id": "ev_bat_gap",
                "timestamp": "2026-03-30T08:06:30",
                "component": "battery",
                "value": 2.78,
            },
        ]

        teg = TemporalEventGraph.build_from_events(
            events=gapped_events,
            dependency_graph=self.g_craft,
        )

        # There should be missing evidence flagged because heater_controller sits between thermal_sensor and battery
        self.assertGreater(len(teg.missing_evidence), 0, "Should record missing intermediate component evidence")
        me = teg.missing_evidence[0]
        self.assertEqual(me["source_event_id"], "ev_thm_gap")
        self.assertEqual(me["target_event_id"], "ev_bat_gap")
        self.assertIn("heater_controller", me["missing_components"])

    def test_06_structural_simulator_confidence_tier(self):
        """
        Verify that the structural counterfactual simulator returns a confidence_tier
        matching the standardized 4-tier scale.
        """
        sim = StructuralCounterfactualSimulator()
        events = [
            {"id": "ev_1", "time_offset_s": 300.0, "component": "thermal_sensor", "value": -999.0},
            {"id": "ev_2", "time_offset_s": 305.0, "component": "heater_controller", "value": 1.0},
            {"id": "ev_3", "time_offset_s": 420.0, "component": "battery", "value": 65.0},
        ]

        res = sim.simulate(
            incident_id="test_inc_001",
            events=events,
            target_event_id="ev_1",
            minutes_earlier=0.1667, # 10s lead time
        )

        self.assertIn(res.confidence_tier, ["HIGH CONFIDENCE", "MODERATE CONFIDENCE", "LOW CONFIDENCE", "INSUFFICIENT EVIDENCE"])
        res_dict = res.to_dict()
        self.assertIn("confidence_tier", res_dict)
        self.assertEqual(res_dict["confidence_tier"], res.confidence_tier)

    def test_07_api_serializers_and_responses(self):
        """
        Verify that DRF serializers correctly validate and output all uncertainty fields.
        """
        genealogy_data = {
            "incident_id": "inc_test_serializer",
            "nodes": [
                {
                    "event_id": "ev_1",
                    "component": "thermal_sensor",
                    "role": "primary",
                    "confidence": 0.92,
                    "confidence_label": "high",
                    "confidence_tier": "HIGH CONFIDENCE",
                    "is_out_of_distribution": False,
                    "upstream_edge_ids": [],
                }
            ],
            "edges": [
                {
                    "id": "e_1_2",
                    "source_event_id": "ev_1",
                    "target_event_id": "ev_2",
                    "dependency_type": "thermal",
                    "dependency_strength": "critical",
                    "temporal_gap_seconds": 5.0,
                    "evidence": "Thermal coupling test",
                    "confidence": 0.91,
                    "confidence_tier": "HIGH CONFIDENCE",
                    "is_uncertain": False,
                    "missing_evidence_notes": None,
                }
            ],
            "primary_cause_event_id": "ev_1",
            "is_ambiguous_root": False,
            "confidence_tier": "HIGH CONFIDENCE",
            "pattern_status": "KNOWN PATTERN",
            "competing_hypotheses": [],
            "missing_evidence": [],
            "uncertain_edges": [],
            "independent_events": [],
            "minimum_explanation_event_ids": ["ev_1"],
            "raw_events": [],
        }

        serializer = GenealogyResponseSerializer(data=genealogy_data)
        self.assertTrue(serializer.is_valid(), f"Serializer errors: {serializer.errors}")
        val = serializer.validated_data
        self.assertEqual(val["confidence_tier"], "HIGH CONFIDENCE")
        self.assertFalse(val["is_ambiguous_root"])
        self.assertEqual(val["pattern_status"], "KNOWN PATTERN")


if __name__ == "__main__":
    unittest.main()
