"""
backend/tests/test_physics_anomaly.py

Unit tests for the Physics-Informed Anomaly Detection Layer:
1. Thermal & Battery predictor: nominal steady-state, heater runaway, slew-rate violations, sentinel dropouts.
2. Power Bus Voltage predictor: nominal regulation, BMS trip isolation, uncommanded UVLO collapse.
3. Sensor integrity predictor: rail limits, sentinels, and slew checks.
4. 4-Way anomaly classification matrix: statistically_abnormal, physically_inconsistent, both, neither.
5. Baseline vs. Hybrid comparison: verify baseline remains 100% available and hybrid enriches events.
6. Real incident replay scenarios: NASA CAPSTONE (2022) and Dellingr (2017) verification.
7. Causal layer physical consistency: verify residual evidence and physical_consistency exposure on nodes/edges.
"""

import os
import sys
import unittest
import pandas as pd
import numpy as np

# Ensure backend directory is in sys.path
backend_dir = os.path.abspath(os.path.join(os.path.dirname(__file__), ".."))
if backend_dir not in sys.path:
    sys.path.insert(0, backend_dir)

from app.core.physics_anomaly.predictors import (
    ThermalHeaterPredictor,
    PowerBusVoltagePredictor,
    SensorIntegrityPredictor,
    PhysicsPredictionResult,
)
from app.core.physics_anomaly.hybrid_detector import (
    HybridAnomalyDetector,
    HybridAnomalyResult,
)
from app.core.event_extraction import (
    extract_events,
    extract_events_baseline,
    Event,
)
from app.core.mission_model.temporal_event_graph import (
    TemporalEventGraph,
    TemporalEventNode,
    TemporalCausalEdge,
)
from app.core.mission_model.graph_generator import generate_mission_dependency_graph
from app.simulate.log_generator import generate_baseline, DEFAULTS
from app.simulate.fault_injector import inject_cascade, CANONICAL_CASCADE
from simulation.real_incident_loader import load_real_incident, generate_replay_telemetry


class TestPhysicsAnomalyLayer(unittest.TestCase):
    def setUp(self):
        self.mdg = generate_mission_dependency_graph(validate=False)
        self.g_craft = self.mdg.to_networkx()

    def test_01_thermal_heater_predictor_dynamics(self):
        """Verify thermal energy balance predictor under nominal, runaway, and slew rate conditions."""
        predictor = ThermalHeaterPredictor(
            alpha=0.065,
            beta=0.0015,
            ambient_temp=20.0,
            nominal_temp=25.0,
            max_slew_rate=1.5,
            sigma_expected=1.0,
        )

        # 1. Nominal steady state evaluation
        res_nom = predictor.evaluate(observed_temp=25.1, prev_temp=25.0, duty_cycle=0.325, dt_seconds=1.0)
        self.assertFalse(res_nom.is_physically_inconsistent)
        self.assertAlmostEqual(res_nom.predicted_value, 25.0, delta=0.5)
        self.assertAlmostEqual(res_nom.residual, 0.1, delta=0.5)

        # 2. Heater driven rise (duty cycle = 1.0)
        # Starting at 25.0, over 10 seconds with 100% duty cycle, temp should rise
        pred_temp = predictor.predict_next(prev_temp=25.0, duty_cycle=1.0, dt_seconds=10.0)
        self.assertGreater(pred_temp, 25.0)

        # 3. Physically impossible thermal jump (slew rate exceeded: 25°C to 45°C in 1.0s)
        res_slew = predictor.evaluate(observed_temp=45.0, prev_temp=25.0, duty_cycle=0.325, dt_seconds=1.0)
        self.assertTrue(res_slew.is_physically_inconsistent)
        self.assertEqual(res_slew.rule_name, "thermal_slew_rate_exceeded")

        # 4. Sensor dropout sentinel (-999.0)
        res_sentinel = predictor.evaluate(observed_temp=-999.0, prev_temp=25.0)
        self.assertTrue(res_sentinel.is_physically_inconsistent)
        self.assertEqual(res_sentinel.rule_name, "thermal_range_or_dropout")

    def test_02_power_bus_voltage_predictor(self):
        """Verify power bus circuit model with BMS protection switch coupling."""
        predictor = PowerBusVoltagePredictor(
            v_nominal=7.4,
            v_trip=1.8,
            uvlo_threshold=3.2,
            sigma_expected=0.25,
        )

        # 1. Nominal bus voltage with switch closed (trip_state = 0.0)
        res_nom = predictor.evaluate(observed_voltage=7.38, trip_state=0.0)
        self.assertFalse(res_nom.is_physically_inconsistent)
        self.assertEqual(res_nom.predicted_value, 7.4)
        self.assertAlmostEqual(res_nom.residual, -0.02, delta=0.1)

        # 2. Consistent BMS trip isolation: trip_state = 1.0 and voltage drops to 1.8V
        res_trip = predictor.evaluate(observed_voltage=1.82, trip_state=1.0)
        self.assertFalse(res_trip.is_physically_inconsistent)
        self.assertEqual(res_trip.predicted_value, 1.8)
        self.assertAlmostEqual(res_trip.residual, 0.02, delta=0.1)

        # 3. Inconsistent uncommanded collapse: trip_state = 0.0 but voltage drops to 2.1V (< UVLO)
        res_uvlo = predictor.evaluate(observed_voltage=2.1, trip_state=0.0)
        self.assertTrue(res_uvlo.is_physically_inconsistent)
        self.assertEqual(res_uvlo.rule_name, "uncommanded_uvlo_collapse")

        # 4. Switch failure to isolate: trip_state = 1.0 but bus voltage remains at 7.4V
        res_stuck = predictor.evaluate(observed_voltage=7.4, trip_state=1.0)
        self.assertTrue(res_stuck.is_physically_inconsistent)
        self.assertEqual(res_stuck.rule_name, "bms_switch_failure_to_isolate")

    def test_03_sensor_integrity_predictor(self):
        """Verify generic sensor continuity, sentinel, and boundary validation."""
        predictor = SensorIntegrityPredictor(
            nominal_mean=0.0,
            nominal_std=0.5,
            min_allowed=-50.0,
            max_allowed=100.0,
            max_slew_rate=5.0,
        )

        res_sentinel = predictor.evaluate(observed_value=-999.0)
        self.assertTrue(res_sentinel.is_physically_inconsistent)
        self.assertEqual(res_sentinel.rule_name, "sensor_dropout_sentinel")

        res_bound = predictor.evaluate(observed_value=150.0)
        self.assertTrue(res_bound.is_physically_inconsistent)
        self.assertEqual(res_bound.rule_name, "sensor_hard_range_violation")

        res_slew = predictor.evaluate(observed_value=20.0, prev_value=0.0, dt_seconds=1.0)
        self.assertTrue(res_slew.is_physically_inconsistent)
        self.assertEqual(res_slew.rule_name, "sensor_slew_rate_exceeded")

    def test_04_four_way_classification_matrix(self):
        """Verify correct assignment of 4-way anomaly classification matrix."""
        detector = HybridAnomalyDetector()

        # 1. 'neither': nominal telemetry
        res_neither = detector.evaluate_sample(
            timestamp="2026-08-20T08:00:00Z",
            component="battery",
            parameter="temperature_c",
            value=25.0,
            z_score=0.2,
        )
        self.assertEqual(res_neither.anomaly_classification, "neither")
        self.assertFalse(res_neither.is_statistical_anomaly)
        self.assertFalse(res_neither.is_physical_anomaly)

        # 2. 'both': sentinel dropout (z > critical and physical sentinel)
        res_both = detector.evaluate_sample(
            timestamp="2026-08-20T08:00:05Z",
            component="thermal_sensor",
            parameter="temperature_c",
            value=-999.0,
            z_score=-25.0,
        )
        self.assertEqual(res_both.anomaly_classification, "both")
        self.assertTrue(res_both.is_statistical_anomaly)
        self.assertTrue(res_both.is_physical_anomaly)

        # 3. 'physically_inconsistent': statistical detector sees nominal z, but physics detects slew jump
        # Prime detector with prior temperature 25.0
        detector.evaluate_sample(
            timestamp="2026-08-20T08:00:10Z",
            component="battery",
            parameter="temperature_c",
            value=25.0,
            z_score=0.1,
        )
        # Instantaneous jump of 10°C in 1s (violates thermal inertia slew limit 1.5°C/s), but z artificially suppressed
        res_phys = detector.evaluate_sample(
            timestamp="2026-08-20T08:00:11Z",
            component="battery",
            parameter="temperature_c",
            value=35.0,
            z_score=1.5,  # below statistical z_warn=4.0
        )
        self.assertEqual(res_phys.anomaly_classification, "physically_inconsistent")
        self.assertFalse(res_phys.is_statistical_anomaly)
        self.assertTrue(res_phys.is_physical_anomaly)

        # 4. 'statistically_abnormal': statistical z >= 4.0, but physics model predicts and explains the value
        # Set heater controller duty cycle to 1.0 (100% duty)
        detector.evaluate_sample(
            timestamp="2026-08-20T08:00:12Z",
            component="heater_controller",
            parameter="duty_cycle",
            value=1.0,
        )
        # Over time battery temp is rising gradually, which is statistically high (z=4.2) but physically consistent with heater running
        res_stat = detector.evaluate_sample(
            timestamp="2026-08-20T08:00:13Z",
            component="battery",
            parameter="temperature_c",
            value=35.05,
            z_score=4.2,  # statistically flagged
        )
        # Since temp increased by 0.05°C (consistent with duty cycle 1.0 and slew rate < 1.5), physical consistency holds
        self.assertEqual(res_stat.anomaly_classification, "statistically_abnormal")
        self.assertTrue(res_stat.is_statistical_anomaly)
        self.assertFalse(res_stat.is_physical_anomaly)

    def test_05_baseline_vs_hybrid_comparison(self):
        """Verify baseline pure statistical extraction remains available and produces expected outputs."""
        components = list(DEFAULTS.keys())
        baseline_df = generate_baseline(components, duration_seconds=600, seed=42)
        incident_df = inject_cascade(baseline_df, cascade_start_offset_s=300, scenario_key="thermal_sensor", randomize_jitter=False)

        # 1. Baseline statistical extraction
        events_baseline = extract_events_baseline(incident_df)
        self.assertGreater(len(events_baseline), 0)
        # Root cause in baseline
        self.assertEqual(events_baseline[0].component, "thermal_sensor")

        # 2. Hybrid statistical + physics extraction
        events_hybrid = extract_events(incident_df, use_physics=True)
        self.assertGreaterEqual(len(events_hybrid), len(events_baseline))

        # Check that hybrid events contain non-null residual and classification annotations
        battery_events = [e for e in events_hybrid if e.component == "battery"]
        self.assertGreater(len(battery_events), 0)
        for b_ev in battery_events:
            self.assertIsNotNone(b_ev.predicted_value)
            self.assertIsNotNone(b_ev.residual)
            self.assertIn(b_ev.anomaly_classification, ["both", "statistically_abnormal", "physically_inconsistent"])
            self.assertIn("rule_name", b_ev.physics_evidence)

    def test_06_real_incident_replay_scenarios(self):
        """Verify hybrid anomaly detection on NASA CAPSTONE and Dellingr real replay telemetry."""
        for scenario_id in ["capstone_2022", "dellingr_2017"]:
            incident_def = load_real_incident(scenario_id)
            replay_df = generate_replay_telemetry(incident_def, duration_seconds=600)
            events = extract_events(replay_df[["timestamp", "component", "parameter", "value"]], use_physics=True)
            self.assertGreater(len(events), 0)

            # Ensure every event has valid classification and physics evidence
            for e in events:
                self.assertIn(e.anomaly_classification, ["both", "statistically_abnormal", "physically_inconsistent", "neither"])
                self.assertIsInstance(e.physics_evidence, dict)

    def test_07_causal_layer_physical_consistency_exposure(self):
        """Verify that TemporalEventNode and TemporalCausalEdge expose residual and physical consistency evidence."""
        components = list(DEFAULTS.keys())
        baseline_df = generate_baseline(components, duration_seconds=600, seed=42)
        incident_df = inject_cascade(baseline_df, cascade_start_offset_s=300, scenario_key="thermal_sensor", randomize_jitter=False)
        events = extract_events(incident_df, use_physics=True)

        events_dicts = [
            {
                "id": e.id,
                "timestamp": e.timestamp,
                "component": e.component,
                "event_type": e.event_type,
                "value": e.value,
                "description": e.description,
                "predicted_value": e.predicted_value,
                "residual": e.residual,
                "normalized_residual": e.normalized_residual,
                "anomaly_classification": e.anomaly_classification,
                "is_statistical_anomaly": e.is_statistical_anomaly,
                "is_physical_anomaly": e.is_physical_anomaly,
                "physics_evidence": e.physics_evidence,
            }
            for e in events
        ]

        teg = TemporalEventGraph.build_from_events(
            events=events_dicts,
            spacecraft_graph=self.g_craft,
        )

        # Check nodes
        nodes = list(teg.nodes.values())
        self.assertGreater(len(nodes), 0)
        thermal_node = next((n for n in nodes if n.component == "thermal_sensor"), None)
        self.assertIsNotNone(thermal_node)
        self.assertIn("residual", thermal_node.telemetry_evidence)
        self.assertIn("anomaly_classification", thermal_node.telemetry_evidence)

        # Check candidate causal edges
        edges = teg.edges
        self.assertGreater(len(edges), 0)
        # Find heater_controller -> battery or battery_protection -> power_bus edge
        coupled_edge = next((e for e in edges if e.source_component == "heater_controller" and e.target_component == "battery"), None)
        if coupled_edge:
            self.assertEqual(coupled_edge.physical_consistency, 1.0)
            self.assertIn("physically consistent", coupled_edge.evidence)


if __name__ == "__main__":
    unittest.main()
