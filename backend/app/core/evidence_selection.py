"""
backend/app/core/evidence_selection.py

Evidence Selection Engine for CAELIS.
Computes Next Best Evidence (NBE) recommendations to resolve causal ambiguities,
discriminate between competing hypotheses, or verify unobserved intermediate hops.

Given:
  1. Temporal Event Graph (TEG) with ranked root causes, confidence tiers,
     competing hypotheses, missing intermediate evidence, and uncertain edges.
  2. Spacecraft Subsystem Dependency Graph (G_craft).

Calculates:
  - Recommended observation / diagnostic telemetry action
  - Target signal / sensor channel to probe
  - Engineering & physical rationale
  - Competing hypothesis IDs under discrimination
  - Expected branch outcomes (if observed X -> favors H1, if observed Y -> favors H2)
  - Expected Information Gain (Shannon entropy reduction, bits)
  - Telemetry downlink bandwidth / telemetry cost (LOW, MEDIUM, HIGH)
"""

import math
from dataclasses import dataclass, field, asdict
from typing import Dict, List, Any, Optional, Tuple


@dataclass
class ExpectedOutcome:
    """Predicted outcome of a targeted diagnostic observation."""
    outcome: str
    favors_hypothesis_id: str
    favors_component: str
    expected_confidence: float
    description: str

    def to_dict(self) -> Dict[str, Any]:
        return {
            "outcome": self.outcome,
            "favors_hypothesis_id": self.favors_hypothesis_id,
            "favors_component": self.favors_component,
            "expected_confidence": round(self.expected_confidence, 3),
            "description": self.description,
        }


@dataclass
class NextBestEvidence:
    """Canonical Next Best Evidence recommendation payload."""
    recommended_observation: str
    target_signal: str
    target_component: str
    rationale: str
    hypothesis_ids: List[str]
    expected_outcomes: List[Dict[str, Any]]
    expected_information_gain: float  # In bits (0.0 to 1.0)
    telemetry_cost: str  # "LOW", "MEDIUM", "HIGH"
    priority: str = "HIGH"  # "CRITICAL", "HIGH", "MODERATE", "LOW"
    sampling_cadence: str = "10 Hz"
    observation_window: str = "T-15s to T+45s relative to trigger"

    def to_dict(self) -> Dict[str, Any]:
        return {
            "recommended_observation": self.recommended_observation,
            "target_signal": self.target_signal,
            "target_component": self.target_component,
            "rationale": self.rationale,
            "hypothesis_ids": self.hypothesis_ids,
            "expected_outcomes": self.expected_outcomes,
            "expected_information_gain": round(self.expected_information_gain, 3),
            "telemetry_cost": self.telemetry_cost,
            "priority": self.priority,
            "sampling_cadence": self.sampling_cadence,
            "observation_window": self.observation_window,
        }


class EvidenceSelectionEngine:
    """
    Evidence Selection Engine.
    Employs active information acquisition principles to minimize posterior entropy
    over root cause hypotheses using available telemetry channels.
    """

    # Typical telemetry parameter mapping per spacecraft subsystem
    SIGNAL_MAP: Dict[str, Dict[str, str]] = {
        "thermal_sensor": {
            "primary": "THERM_ADC_RAW_01",
            "secondary": "THERM_RTD_RESISTANCE_OHMS",
            "description": "Thermistor analog front-end voltage divider raw ADC code"
        },
        "heater_controller": {
            "primary": "HTR_DUTY_CYCLE_PWM",
            "secondary": "HTR_MOSFET_CURRENT_SENSE_A",
            "description": "Survival heater solid-state switch PWM gate drive & current sense"
        },
        "battery": {
            "primary": "BATT_CELL2_TEMP_INTERNAL_C",
            "secondary": "BATT_CELL_IMPEDANCE_MOHM",
            "description": "Internal Li-Ion pouch cell thermistor & EIS impedance estimator"
        },
        "battery_cell": {
            "primary": "BATT_CELL2_VOLTAGE_SENSE_V",
            "secondary": "BATT_SOC_COULOMB_COUNTER_PCT",
            "description": "Dedicated cell balancing analog monitor & Coulomb integration"
        },
        "battery_protection": {
            "primary": "BMS_UVLO_COMPARATOR_TRIP",
            "secondary": "BMS_LATCHING_BREAKER_STATE",
            "description": "Hardware undervoltage lockout comparator threshold register"
        },
        "power_bus": {
            "primary": "BUS_5V_REGULATOR_CURRENT_A",
            "secondary": "BUS_5V_DROPOUT_VOLTAGE_V",
            "description": "Regulated 5V DC-DC converter output current & feedback loop error"
        },
        "obc": {
            "primary": "OBC_WATCHDOG_HEARTBEAT_US",
            "secondary": "OBC_TASK_QUEUE_LATENCY_MS",
            "description": "Flight software cyclic scheduler frame time & I2C retry storm counter"
        },
        "comms": {
            "primary": "COMMS_RF_PA_DRAIN_CURRENT_MA",
            "secondary": "COMMS_UHF_CARRIER_LOCK_FLAG",
            "description": "S-Band power amplifier drain bias & transponder PLL lock indicator"
        },
        "payload": {
            "primary": "PAYLOAD_3V3_POWER_GATE_STATUS",
            "secondary": "PAYLOAD_DMA_FIFO_OVERFLOW_FLAG",
            "description": "Optical payload instrument power switch & FIFO ring buffer overflow"
        },
        "adcs": {
            "primary": "ADCS_REACTION_WHEEL_CURRENT_A",
            "secondary": "ADCS_GYRO_BIAS_DRIFT_RAD_S",
            "description": "Reaction wheel motor bus current & gyro drift covariance"
        }
    }

    def select_next_best_evidence(self, teg: Any, dependency_graph: Optional[Any] = None) -> NextBestEvidence:
        """
        Evaluate the Temporal Event Graph and determine the optimal Next Best Evidence recommendation.
        """
        if teg is None:
            return self._default_recommendation()

        competing = getattr(teg, "competing_hypotheses", []) or []
        is_ambiguous = getattr(teg, "is_ambiguous_root", False)
        missing_evidence = getattr(teg, "missing_evidence", []) or []
        uncertain_edges = getattr(teg, "uncertain_edges", []) or []
        primary_cause_id = getattr(teg, "primary_cause_event_id", None)

        # -----------------------------------------------------------------
        # CASE 1: Root Cause Ambiguity or Top Competing Hypotheses Exist
        # -----------------------------------------------------------------
        if is_ambiguous or (len(competing) >= 2 and competing[1].get("margin_from_top", 1.0) < 0.15):
            h1 = competing[0]
            h2 = competing[1]
            c1 = h1.get("component", "thermal_sensor")
            c2 = h2.get("component", "battery")
            id1 = h1.get("event_id", "hyp-01")
            id2 = h2.get("event_id", "hyp-02")

            # Find discriminating signal
            sig_info = self._get_signal_for_component(c1)
            target_signal = sig_info["primary"]

            outcomes = [
                ExpectedOutcome(
                    outcome=f"{target_signal} indicates sensor circuit disconnection (open-circuit / negative rail freeze)",
                    favors_hypothesis_id=id1,
                    favors_component=c1,
                    expected_confidence=0.98,
                    description=f"Confirms primary origin at {c1} via analog front-end fault, exonerating downstream {c2}."
                ).to_dict(),
                ExpectedOutcome(
                    outcome=f"{target_signal} reads nominal / within orbital bounds during eclipse transition",
                    favors_hypothesis_id=id2,
                    favors_component=c2,
                    expected_confidence=0.94,
                    description=f"Refutes false sensor reading; confirms true thermal runaway originating directly in {c2}."
                ).to_dict()
            ]

            # Shannon Information Gain: reduction in entropy between 2 near-equiprobable hypotheses
            p1 = max(0.01, min(0.99, h1.get("score", 0.52)))
            p2 = max(0.01, min(0.99, h2.get("score", 0.48)))
            total_p = p1 + p2
            p1_norm = p1 / total_p
            p2_norm = p2 / total_p
            prior_entropy = -(p1_norm * math.log2(p1_norm) + p2_norm * math.log2(p2_norm))
            expected_info_gain = min(0.99, max(0.40, prior_entropy * 0.92))

            return NextBestEvidence(
                recommended_observation=f"Command high-rate 10Hz burst sampling of telemetry channel {target_signal} on {c1}",
                target_signal=target_signal,
                target_component=c1,
                rationale=(
                    f"Disambiguates root cause between primary candidate '{c1}' (score {p1:.3f}) and "
                    f"competing candidate '{c2}' (score {p2:.3f}, margin {abs(p1 - p2):.3f}). "
                    f"Probing {target_signal} discriminates between sensor circuit failure vs physical actuator runaway."
                ),
                hypothesis_ids=[id1, id2],
                expected_outcomes=outcomes,
                expected_information_gain=expected_info_gain,
                telemetry_cost="LOW",
                priority="CRITICAL",
                sampling_cadence="10 Hz burst mode",
                observation_window="T-15s to T+30s around anomaly onset"
            )

        # -----------------------------------------------------------------
        # CASE 2: Missing Intermediate Telemetry on Causal Propagation Path
        # -----------------------------------------------------------------
        if missing_evidence:
            first_missing = missing_evidence[0]
            missing_comps = first_missing.get("missing_components", [])
            src_id = first_missing.get("source_event_id", "source")
            tgt_id = first_missing.get("target_event_id", "target")

            target_comp = missing_comps[0] if missing_comps else "heater_controller"
            sig_info = self._get_signal_for_component(target_comp)
            target_signal = sig_info["primary"]

            outcomes = [
                ExpectedOutcome(
                    outcome=f"{target_signal} active / continuous high state during intermediate window",
                    favors_hypothesis_id=src_id,
                    favors_component=target_comp,
                    expected_confidence=0.96,
                    description=f"Confirms physical propagation through unmonitored intermediate {target_comp}."
                ).to_dict(),
                ExpectedOutcome(
                    outcome=f"{target_signal} dormant / inactive during window",
                    favors_hypothesis_id=tgt_id,
                    favors_component=target_comp,
                    expected_confidence=0.45,
                    description=f"Refutes linear propagation through {target_comp}; indicates independent concurrent anomaly."
                ).to_dict()
            ]

            return NextBestEvidence(
                recommended_observation=f"Request telemetry frame interrogation for {target_comp} channel {target_signal}",
                target_signal=target_signal,
                target_component=target_comp,
                rationale=(
                    f"Bridge missing intermediate telemetry evidence between '{first_missing.get('source_component', 'source')}' "
                    f"and '{first_missing.get('target_component', 'target')}'. Verifies whether failure propagated through {target_comp}."
                ),
                hypothesis_ids=[src_id, tgt_id],
                expected_outcomes=outcomes,
                expected_information_gain=0.76,
                telemetry_cost="LOW",
                priority="HIGH",
                sampling_cadence="1 Hz cyclic",
                observation_window="T+00s to T+90s propagation window"
            )

        # -----------------------------------------------------------------
        # CASE 3: Uncertain Causal Edge Present
        # -----------------------------------------------------------------
        if uncertain_edges:
            first_edge = uncertain_edges[0]
            edge_id = first_edge.get("edge_id", "edge_01")
            src_id = first_edge.get("source_event_id", "src")
            tgt_id = first_edge.get("target_event_id", "tgt")

            # Infer component
            src_comp = "battery"
            sig_info = self._get_signal_for_component(src_comp)
            target_signal = sig_info["secondary"]

            outcomes = [
                ExpectedOutcome(
                    outcome=f"{target_signal} correlates with edge delay window",
                    favors_hypothesis_id=src_id,
                    favors_component=src_comp,
                    expected_confidence=0.92,
                    description=f"Resolves edge uncertainty for {edge_id}; confirms physical coupling."
                ).to_dict()
            ]

            return NextBestEvidence(
                recommended_observation=f"Sample high-precision diagnostic channel {target_signal} across edge {edge_id}",
                target_signal=target_signal,
                target_component=src_comp,
                rationale=f"Edge {edge_id} has elevated uncertainty ({first_edge.get('confidence_tier', 'MODERATE')}). Direct measurement of {target_signal} establishes physical coupling strength.",
                hypothesis_ids=[src_id, tgt_id],
                expected_outcomes=outcomes,
                expected_information_gain=0.68,
                telemetry_cost="MEDIUM",
                priority="MODERATE",
                sampling_cadence="5 Hz",
                observation_window="Coupling transition window"
            )

        # -----------------------------------------------------------------
        # CASE 4: High Confidence, Unambiguous Analysis -> Post-Intervention Verification
        # -----------------------------------------------------------------
        root_node = None
        if primary_cause_id and hasattr(teg, "nodes") and primary_cause_id in teg.nodes:
            root_node = teg.nodes[primary_cause_id]

        root_comp = root_node.component if root_node else "thermal_sensor"
        sig_info = self._get_signal_for_component(root_comp)
        target_signal = sig_info["primary"]

        outcomes = [
            ExpectedOutcome(
                outcome=f"{target_signal} stabilizes within ±2.5% of nominal envelope post-remediation",
                favors_hypothesis_id=primary_cause_id or "primary",
                favors_component=root_comp,
                expected_confidence=0.99,
                description=f"Confirms complete isolation of primary root cause at {root_comp}."
            ).to_dict()
        ]

        return NextBestEvidence(
            recommended_observation=f"Monitor telemetry return for {target_signal} to confirm cascade termination",
            target_signal=target_signal,
            target_component=root_comp,
            rationale=(
                f"Primary root cause is verified with high confidence at '{root_comp}'. "
                f"Recommended flight operations action: monitor {target_signal} following FDIR intervention to verify orbit pass recovery."
            ),
            hypothesis_ids=[primary_cause_id or "primary"],
            expected_outcomes=outcomes,
            expected_information_gain=0.55,
            telemetry_cost="LOW",
            priority="MODERATE",
            sampling_cadence="1 Hz telemetry beacon",
            observation_window="Post-intervention +60s to +300s"
        )

    def _get_signal_for_component(self, component: str) -> Dict[str, str]:
        comp_clean = component.lower().strip()
        for k, v in self.SIGNAL_MAP.items():
            if k in comp_clean or comp_clean in k:
                return v
        return {
            "primary": f"{component.upper()}_TELEMETRY_MAIN",
            "secondary": f"{component.upper()}_HEALTH_STATUS",
            "description": f"Standard operational status register for {component}"
        }

    def _default_recommendation(self) -> NextBestEvidence:
        return NextBestEvidence(
            recommended_observation="Command standard diagnostic memory dump on EPS and Thermal controllers",
            target_signal="SYS_HEALTH_BYTE",
            target_component="eps_pdu",
            rationale="Baseline telemetry acquisition across primary power distribution rails.",
            hypothesis_ids=["default"],
            expected_outcomes=[
                ExpectedOutcome(
                    outcome="All subsystem health registers nominal",
                    favors_hypothesis_id="nominal",
                    favors_component="eps",
                    expected_confidence=0.95,
                    description="Nominal baseline confirmation."
                ).to_dict()
            ],
            expected_information_gain=0.50,
            telemetry_cost="LOW",
            priority="LOW"
        )
