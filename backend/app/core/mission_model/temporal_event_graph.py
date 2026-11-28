"""
backend/app/core/mission_model/temporal_event_graph.py

Temporal Event Graph (TEG) Representation.
Models concrete events at specific timestamps as nodes and candidate/evaluated causal
relationships as edges.
Embeds:
- Hard temporal arrow of time: T_cause < T_effect
- Plausible propagation delay windows derived from canonical subsystem templates
- Event-to-event causal scoring (temporal distance, dependency path strength, intermediate corroboration)
- Multi-event same-component internal state transitions
- Unrelated anomaly isolation (independent cyber/sensor anomalies)
"""

import os
import uuid
from dataclasses import dataclass, field, asdict
from datetime import datetime
from typing import Dict, List, Optional, Tuple, Any, Union, Set
import pandas as pd
import networkx as nx
import numpy as np

from .event_model import EventRecord, CausalRole
from .canonical_templates import get_canonical_template, PropagationDelayRange
from .graph_generator import generate_mission_dependency_graph, MissionDependencyGraph, STRENGTH_WEIGHT
from .learned_causal_scorer import (
    HardConstraintValidator,
    get_learned_causal_scorer,
)
from app.core.causal_features import extract_causal_features


def parse_timestamp_to_epoch(ts: Union[str, float, int, pd.Timestamp, datetime]) -> float:
    """Parse various timestamp representations into a float epoch seconds."""
    if isinstance(ts, (int, float)):
        return float(ts)
    if isinstance(ts, pd.Timestamp):
        return ts.timestamp()
    if isinstance(ts, datetime):
        return ts.timestamp()
    if isinstance(ts, str):
        try:
            return pd.to_datetime(ts).timestamp()
        except Exception:
            try:
                return float(ts)
            except ValueError:
                return 0.0
    return 0.0


def find_plausible_propagation_window(
    source_comp: str,
    target_comp: str,
    dep_type: str = "functional",
) -> Dict[str, Any]:
    """
    Query canonical subsystem templates to identify the plausible propagation delay range
    for a causal edge connecting source_comp to target_comp.
    """
    if source_comp == target_comp:
        return {
            "min_seconds": 0.001,
            "max_seconds": 600.0,
            "typical_seconds": 1.0,
            "physics_basis": "Internal component state progression / threshold escalation.",
        }

    # Query templates for source and target
    src_tmpl = get_canonical_template(source_comp)
    tgt_tmpl = get_canonical_template(target_comp)

    # Check target template delays first, then source template delays
    delays_pool = {}
    if tgt_tmpl:
        delays_pool.update(tgt_tmpl.plausible_propagation_delays)
    if src_tmpl:
        delays_pool.update(src_tmpl.plausible_propagation_delays)

    # Match based on component names or dependency type
    s_clean = source_comp.lower()
    t_clean = target_comp.lower()

    for k, rng in delays_pool.items():
        k_lower = k.lower()
        if (s_clean in k_lower or any(part in k_lower for part in s_clean.split("_"))) and \
           (t_clean in k_lower or any(part in k_lower for part in t_clean.split("_"))):
            return {
                "min_seconds": rng.min_seconds,
                "max_seconds": rng.max_seconds,
                "typical_seconds": rng.typical_seconds,
                "physics_basis": rng.physics_basis,
            }

    # Known domain physics pairings
    known_pairs = {
        ("thermal_sensor", "heater_controller"): (0.1, 30.0, 5.0, "Thermostatic relay activation upon sensor report."),
        ("heater_controller", "battery"): (1.0, 300.0, 37.0, "Resistive heating thermal inertia into battery mass."),
        ("battery", "battery_protection"): (0.01, 120.0, 4.0, "BMS over-temperature sensing and latch trip."),
        ("battery_protection", "power_bus"): (0.005, 5.0, 0.2, "MOSFET solid-state switch rail disconnect."),
        ("power_bus", "obc"): (0.01, 2.0, 0.1, "Under-voltage lockout trip on flight processor rail."),
        ("power_bus", "comms"): (0.01, 5.0, 0.5, "Transceiver PLL lock-loss upon rail collapse."),
        ("obc", "payload"): (0.005, 2.0, 0.05, "OBC GPIO switch disconnect to payload rail."),
        ("solar_array", "power_bus"): (0.01, 2.0, 0.1, "Photovoltaic generation input disconnect."),
        ("star_tracker", "adcs"): (0.1, 120.0, 5.0, "Attitude filter covariance expansion upon lost star lock."),
        ("adcs", "reaction_wheel"): (0.05, 10.0, 0.5, "Motor PWM command update to momentum wheel."),
        ("comms", "flight_software"): (0.1, 5.0, 1.0, "Telecommand packet ingestion into FSW parser."),
        ("flight_software", "comms"): (0.1, 5.0, 1.0, "FSW diagnostic mute / PA disable command."),
        ("flight_software", "obc"): (0.01, 2.0, 0.1, "FSW watchdog tick monitor / health thread."),
        ("obc", "flight_software"): (0.01, 2.0, 0.1, "OBC kernel scheduler thread slip / tick interrupt."),
    }

    pair_key = (s_clean, t_clean)
    if pair_key in known_pairs:
        min_s, max_s, typ_s, basis = known_pairs[pair_key]
        return {
            "min_seconds": min_s,
            "max_seconds": max_s,
            "typical_seconds": typ_s,
            "physics_basis": basis,
        }

    # Default cyber-physical propagation window
    return {
        "min_seconds": 0.001,
        "max_seconds": 180.0,
        "typical_seconds": 2.0,
        "physics_basis": f"Physical {dep_type} coupling across spacecraft bus.",
    }


def compute_temporal_score(gap_seconds: float, window: Dict[str, Any]) -> float:
    """
    Score temporal precedence based on whether gap_seconds falls within
    the plausible propagation delay window.
    """
    if gap_seconds <= 0:
        return 0.0

    min_s = window.get("min_seconds", 0.001)
    max_s = window.get("max_seconds", 180.0)

    if min_s <= gap_seconds <= max_s:
        return 1.0
    if gap_seconds < min_s:
        # Suspiciously instantaneous
        return max(0.2, 0.5 * (gap_seconds / max(min_s, 1e-4)))
    # gap_seconds > max_s
    decay_span = max(max_s * 2.0, 60.0)
    if gap_seconds <= max_s + decay_span:
        return max(0.3, 1.0 - (gap_seconds - max_s) / decay_span * 0.7)
    return 0.2


def to_confidence_tier(score: Optional[float], threshold: float = 0.35) -> str:
    """
    Map numerical confidence score to standardized 4-tier taxonomy:
    HIGH CONFIDENCE, MODERATE CONFIDENCE, LOW CONFIDENCE, INSUFFICIENT EVIDENCE.
    """
    if score is None or score <= 0.0:
        return "INSUFFICIENT EVIDENCE"
    if score >= 0.85:
        return "HIGH CONFIDENCE"
    elif score >= 0.60:
        return "MODERATE CONFIDENCE"
    elif score >= 0.35:
        return "LOW CONFIDENCE"
    else:
        return "INSUFFICIENT EVIDENCE"


def to_confidence_label(score: Optional[float]) -> str:
    """Map confidence tier to legacy lowercase label."""
    tier = to_confidence_tier(score)
    mapping = {
        "HIGH CONFIDENCE": "high",
        "MODERATE CONFIDENCE": "moderate",
        "LOW CONFIDENCE": "low",
        "INSUFFICIENT EVIDENCE": "insufficient_evidence",
    }
    return mapping.get(tier, "insufficient_evidence")


@dataclass
class TemporalEventNode:
    """
    A concrete event node occurring at a specific timestamp within an incident.
    """
    event_id: str
    component: str
    timestamp: str = ""
    timestamp_epoch: float = 0.0
    event_type: str = "threshold"
    state_transition: str = "NOMINAL -> FAULT"
    telemetry_evidence: Dict[str, Any] = field(default_factory=dict)
    role: CausalRole = "unknown"
    confidence: float = 0.0
    confidence_label: str = "insufficient_evidence"
    confidence_tier: str = "INSUFFICIENT EVIDENCE"
    is_out_of_distribution: bool = False
    upstream_edge_ids: List[str] = field(default_factory=list)
    subsystem: str = ""
    metadata: Dict[str, Any] = field(default_factory=dict)
    predicted_value: Optional[float] = None
    residual: Optional[float] = None
    normalized_residual: Optional[float] = None
    anomaly_classification: str = "statistically_abnormal"
    is_statistical_anomaly: bool = True
    is_physical_anomaly: bool = False
    physics_evidence: Dict[str, Any] = field(default_factory=dict)

    def to_dict(self) -> Dict[str, Any]:
        """Convert to dict matching DRF and MissionCausalNode interfaces."""
        return {
            "event_id": self.event_id,
            "component": self.component,
            "timestamp": self.timestamp,
            "timestamp_epoch": self.timestamp_epoch,
            "event_type": self.event_type,
            "state_transition": self.state_transition,
            "telemetry_evidence": self.telemetry_evidence,
            "role": self.role,
            "confidence": round(self.confidence, 4),
            "confidence_label": self.confidence_label,
            "confidence_tier": self.confidence_tier,
            "is_out_of_distribution": self.is_out_of_distribution,
            "upstream_edge_ids": self.upstream_edge_ids,
            "subsystem": self.subsystem or self.component,
            "metadata": self.metadata,
            "predicted_value": self.predicted_value,
            "residual": self.residual,
            "normalized_residual": self.normalized_residual,
            "anomaly_classification": self.anomaly_classification,
            "is_statistical_anomaly": self.is_statistical_anomaly,
            "is_physical_anomaly": self.is_physical_anomaly,
            "physics_evidence": self.physics_evidence,
        }


@dataclass
class TemporalCausalEdge:
    """
    A directed causal edge connecting a cause event to an effect event,
    carrying temporal distance, allowed propagation window, and scoring factors.
    """
    id: str
    source_event_id: str
    target_event_id: str
    source_component: str
    target_component: str
    dependency_type: str
    dependency_strength: str
    temporal_distance_seconds: float
    allowed_propagation_window: Dict[str, Any]
    evidence: str
    s_temporal: float = 0.0
    s_dependency: float = 0.0
    s_intermediate: float = 0.0
    confidence: float = 0.0
    confidence_tier: str = "INSUFFICIENT EVIDENCE"
    is_uncertain: bool = False
    missing_evidence_notes: List[str] = field(default_factory=list)
    physical_consistency: float = 1.0
    predicted_probability: float = 0.0
    causal_features: Dict[str, float] = field(default_factory=dict)
    scorer_type: str = "learned"
    hard_constraints_passed: bool = True
    metadata: Dict[str, Any] = field(default_factory=dict)

    @property
    def temporal_gap_seconds(self) -> float:
        return self.temporal_distance_seconds

    def to_dict(self) -> Dict[str, Any]:
        """Convert to dict matching DRF and MissionCausalEdge interfaces."""
        return {
            "id": self.id,
            "source_event_id": self.source_event_id,
            "target_event_id": self.target_event_id,
            "source_component": self.source_component,
            "target_component": self.target_component,
            "dependency_type": self.dependency_type,
            "dependency_strength": self.dependency_strength,
            "temporal_distance_seconds": self.temporal_distance_seconds,
            "temporal_gap_seconds": self.temporal_distance_seconds,  # legacy compatibility alias
            "allowed_propagation_window": self.allowed_propagation_window,
            "evidence": self.evidence,
            "s_temporal": round(self.s_temporal, 4),
            "s_dependency": round(self.s_dependency, 4),
            "s_intermediate": round(self.s_intermediate, 4),
            "confidence": round(self.confidence, 4),
            "confidence_tier": self.confidence_tier,
            "is_uncertain": self.is_uncertain,
            "missing_evidence_notes": self.missing_evidence_notes,
            "predicted_probability": round(self.predicted_probability, 4),
            "causal_features": self.causal_features,
            "scorer_type": self.scorer_type,
            "hard_constraints_passed": self.hard_constraints_passed,
            "physical_consistency": round(self.physical_consistency, 4),
            "metadata": self.metadata,
        }


class TemporalEventGraph:
    """
    The active incident representation: a Directed Acyclic Graph of concrete events
    connected by causal dependencies.
    """

    def __init__(self, incident_id: str = "incident_active"):
        self.incident_id = incident_id
        self.nodes: Dict[str, TemporalEventNode] = {}
        self.edges: List[TemporalCausalEdge] = []
        self.graph: nx.DiGraph = nx.DiGraph()
        self.primary_cause_event_ids: List[str] = []
        self.minimum_explanation_event_ids: List[str] = []
        self.is_ambiguous_root: bool = False
        self.confidence_tier: str = "HIGH CONFIDENCE"
        self.competing_hypotheses: List[Dict[str, Any]] = []
        self.missing_evidence: List[Dict[str, Any]] = []
        self.uncertain_edges: List[Dict[str, Any]] = []
        self.independent_events: List[Dict[str, Any]] = []
        self.pattern_status: str = "KNOWN PATTERN"
        self.raw_events: List[Dict[str, Any]] = []
        self.metadata: Dict[str, Any] = {}

    @property
    def primary_cause_event_id(self) -> Optional[str]:
        return self.primary_cause_event_ids[0] if self.primary_cause_event_ids else None

    @primary_cause_event_id.setter
    def primary_cause_event_id(self, val: Optional[str]) -> None:
        if val:
            self.primary_cause_event_ids = [val]
        else:
            self.primary_cause_event_ids = []

    def add_node(self, node: TemporalEventNode) -> None:
        self.nodes[node.event_id] = node
        self.graph.add_node(
            node.event_id,
            component=node.component,
            timestamp=node.timestamp,
            role=node.role,
            confidence=node.confidence,
        )

    def add_edge(self, edge: TemporalCausalEdge) -> None:
        self.edges.append(edge)
        self.graph.add_edge(
            edge.source_event_id,
            edge.target_event_id,
            id=edge.id,
            confidence=edge.confidence,
            temporal_distance_seconds=edge.temporal_distance_seconds,
            dependency_type=edge.dependency_type,
        )

    def to_causal_dag(self) -> nx.DiGraph:
        """Return the NetworkX DiGraph representation of the event cascade."""
        return self.graph

    def simulate_counterfactual_reachability(
        self, target_event_id: str, minutes_earlier: float = 10.0
    ) -> Dict[str, Any]:
        """
        Compute baseline prevented vs. remaining events using causal DAG reachability (nx.descendants).
        """
        dag = self.to_causal_dag()
        prevented_ids: Set[str] = set()
        if target_event_id in dag:
            prevented_ids = set(nx.descendants(dag, target_event_id))
        prevented_ids.add(target_event_id)

        all_ids = set(self.nodes.keys())
        remaining_ids = list(all_ids - prevented_ids)
        prevented_list = list(prevented_ids)

        summary = (
            f"Baseline reachability: intervening {minutes_earlier:.0f} minutes earlier on event '{target_event_id}' "
            f"would prune {len(prevented_list)} of {len(all_ids)} downstream failure events."
        )

        return {
            "incident_id": self.incident_id,
            "target_event_id": target_event_id,
            "simulation_method": "reachability_baseline",
            "prevented_event_ids": prevented_list,
            "remaining_event_ids": remaining_ids,
            "prevented_count": len(prevented_list),
            "remaining_count": len(remaining_ids),
            "summary": summary,
        }

    def simulate_counterfactual_structural(
        self,
        target_event_id: str,
        minutes_earlier: float = 10.0,
        intervention_offset_s: Optional[float] = None,
        intervention_type: Optional[str] = None,
        intervention_component: Optional[str] = None,
        intervention_parameter: Optional[str] = None,
        clamped_value: Optional[Any] = None,
    ) -> Dict[str, Any]:
        """
        Structural forward simulation using causal module definitions and trajectory comparison.
        """
        from .structural_simulator import StructuralCounterfactualSimulator
        sim = StructuralCounterfactualSimulator()
        events_data = self.raw_events if self.raw_events else [n.to_dict() for n in self.nodes.values()]
        res = sim.simulate(
            incident_id=self.incident_id,
            events=events_data,
            target_event_id=target_event_id,
            minutes_earlier=minutes_earlier,
            intervention_offset_s=intervention_offset_s,
            intervention_type=intervention_type,
            intervention_component=intervention_component,
            intervention_parameter=intervention_parameter,
            clamped_value=clamped_value,
            causal_dag=self.to_causal_dag(),
        )
        return res.to_dict()

    def simulate_counterfactual(
        self,
        target_event_id: str,
        minutes_earlier: float = 10.0,
        method: str = "structural",
        **kwargs
    ) -> Dict[str, Any]:
        """
        Execute counterfactual simulation. Defaults to structural forward simulation,
        with reachability baseline available via method='reachability'.
        """
        if method == "reachability":
            return self.simulate_counterfactual_reachability(target_event_id, minutes_earlier)
        return self.simulate_counterfactual_structural(target_event_id, minutes_earlier, **kwargs)


    def to_dict(self) -> Dict[str, Any]:
        """Export serialized representation matching DRF GenealogyResponseSerializer."""
        return {
            "incident_id": self.incident_id,
            "nodes": [n.to_dict() for n in self.nodes.values()],
            "edges": [e.to_dict() for e in self.edges],
            "primary_cause_event_id": self.primary_cause_event_ids[0] if self.primary_cause_event_ids else None,
            "minimum_explanation_event_ids": self.minimum_explanation_event_ids,
            "is_ambiguous_root": self.is_ambiguous_root,
            "confidence_tier": self.confidence_tier,
            "competing_hypotheses": self.competing_hypotheses,
            "missing_evidence": self.missing_evidence,
            "uncertain_edges": self.uncertain_edges,
            "independent_events": self.independent_events,
            "pattern_status": self.pattern_status,
            "raw_events": self.raw_events,
            "metadata": self.metadata,
        }

    @classmethod
    def build_from_events(
        cls,
        events: List[Union[EventRecord, Dict[str, Any]]],
        dependency_graph: Optional[Union[MissionDependencyGraph, nx.DiGraph]] = None,
        incident_id: str = "incident_active",
        enforce_propagation_window: bool = False,
        allow_same_component: bool = True,
        scoring_weights: Tuple[float, float, float] = (0.0475, 0.6320, 0.3205),
        confidence_threshold: float = 0.40,
        max_hops: int = 3,
        spacecraft_graph: Optional[Union[MissionDependencyGraph, nx.DiGraph]] = None,
        scorer_type: str = "learned",
        operating_mode: str = "nominal",
    ) -> "TemporalEventGraph":
        """
        Construct a TemporalEventGraph from extracted events and spacecraft dependency graph.
        Enforces hard temporal arrow T_cause < T_effect and checks plausible propagation windows.
        """
        if dependency_graph is None and spacecraft_graph is not None:
            dependency_graph = spacecraft_graph

        teg = cls(incident_id=incident_id)

        # 1. Normalize and sort events chronologically
        normalized_events: List[Dict[str, Any]] = []
        for idx, ev in enumerate(events):
            if isinstance(ev, dict):
                ev_dict = dict(ev)
            elif hasattr(ev, "to_legacy_dict"):
                ev_dict = ev.to_legacy_dict()
            else:
                ev_dict = asdict(ev) if hasattr(ev, "__dataclass_fields__") else dict(ev)

            if "id" not in ev_dict or not ev_dict["id"]:
                ev_dict["id"] = f"ev_{idx:03d}_{ev_dict.get('component', 'unknown')}"

            ev_dict["_epoch"] = parse_timestamp_to_epoch(ev_dict.get("timestamp", 0.0))
            normalized_events.append(ev_dict)

        # Sort strictly by timestamp epoch
        normalized_events.sort(key=lambda x: x["_epoch"])
        teg.raw_events = normalized_events

        # 2. Get underlying spacecraft dependency graph
        if dependency_graph is None:
            mdg = generate_mission_dependency_graph(validate=False)
            g_craft = mdg.to_networkx()
        elif isinstance(dependency_graph, MissionDependencyGraph):
            g_craft = dependency_graph.to_networkx()
        elif isinstance(dependency_graph, nx.DiGraph):
            g_craft = dependency_graph
        else:
            g_craft = nx.DiGraph()

        # 3. Create TemporalEventNodes
        events_by_comp: Dict[str, List[Dict[str, Any]]] = {}
        for ev in normalized_events:
            eid = ev["id"]
            comp = ev.get("component", "unknown")
            events_by_comp.setdefault(comp, []).append(ev)

            # Determine state transition
            val = ev.get("value")
            ev_type = ev.get("event_type", "threshold")
            desc = ev.get("description", "")
            if val == -999.0:
                state_trans = "NOMINAL -> SENSOR_DROPOUT_FREEZE"
            elif val == -900.0:
                state_trans = "CARRIER_LOCKED -> CARRIER_LOST"
            elif val == 1.0 and "duty_cycle" in desc:
                state_trans = "STANDBY -> FULL_POWER_100%"
            elif val == 0.0 and ("power_bus" in comp or "rail" in desc):
                state_trans = "ENERGIZED -> BROWNOUT_COLLAPSE"
            elif "trip" in desc.lower() or "isolated" in desc.lower():
                state_trans = "CLOSED -> LATCH_TRIPPED"
            elif "warning" in desc.lower():
                state_trans = "NOMINAL -> DEGRADED_WARNING"
            elif "critical" in desc.lower():
                state_trans = "DEGRADED -> CRITICAL_ANOMALY"
            else:
                state_trans = f"NOMINAL -> {ev_type.upper()}"

            is_ood = bool(ev.get("is_out_of_distribution", False) or ev.get("pattern_status") == "UNKNOWN / OUT-OF-DISTRIBUTION")
            ev_tier = ev.get("confidence_tier", "INSUFFICIENT EVIDENCE")

            node = TemporalEventNode(
                event_id=eid,
                component=comp,
                timestamp=str(ev.get("timestamp", "")),
                timestamp_epoch=ev["_epoch"],
                event_type=ev_type,
                state_transition=state_trans,
                confidence_tier=ev_tier,
                is_out_of_distribution=is_ood,
                predicted_value=ev.get("predicted_value"),
                residual=ev.get("residual"),
                normalized_residual=ev.get("normalized_residual"),
                anomaly_classification=ev.get("anomaly_classification", "statistically_abnormal"),
                is_statistical_anomaly=ev.get("is_statistical_anomaly", True),
                is_physical_anomaly=ev.get("is_physical_anomaly", False),
                physics_evidence=ev.get("physics_evidence", {}),
                telemetry_evidence={
                    "value": val,
                    "description": desc,
                    "parameter": ev.get("parameter"),
                    "severity": ev.get("severity", "warning"),
                    "confidence_tier": ev_tier,
                    "is_out_of_distribution": is_ood,
                    "predicted_value": ev.get("predicted_value"),
                    "residual": ev.get("residual"),
                    "normalized_residual": ev.get("normalized_residual"),
                    "anomaly_classification": ev.get("anomaly_classification", "statistically_abnormal"),
                    "is_statistical_anomaly": ev.get("is_statistical_anomaly", True),
                    "is_physical_anomaly": ev.get("is_physical_anomaly", False),
                    "physics_evidence": ev.get("physics_evidence", {}),
                },
            )
            teg.add_node(node)

        # 4. Generate candidate causal edges
        best_upstream: Dict[str, Tuple[float, TemporalCausalEdge]] = {}
        missing_evidence_list: List[Dict[str, Any]] = []
        w_t, w_d, w_i = scoring_weights
        learned_scorer = get_learned_causal_scorer()

        for effect in normalized_events:
            effect_id = effect["id"]
            effect_comp = effect.get("component", "")
            effect_epoch = effect["_epoch"]

            if effect_comp not in g_craft.nodes:
                # Independent anomaly outside the physical spacecraft DAG
                continue

            # Candidate components: upstream ancestors in g_craft + optional same component
            ancestors = nx.ancestors(g_craft, effect_comp)
            valid_ancestor_comps = [
                a for a in ancestors
                if nx.has_path(g_craft, a, effect_comp) and len(nx.shortest_path(g_craft, a, effect_comp)) - 1 <= max_hops
            ]
            # Sort deterministically: closest direct ancestors (fewer hops) first, then alphabetical
            valid_ancestor_comps.sort(key=lambda a: (len(nx.shortest_path(g_craft, a, effect_comp)), a))

            candidate_comps = list(valid_ancestor_comps)
            if allow_same_component:
                candidate_comps.append(effect_comp)

            for cand_comp in candidate_comps:
                for cand_event in events_by_comp.get(cand_comp, []):
                    cand_id = cand_event["id"]
                    cand_epoch = cand_event["_epoch"]

                    # Do not evaluate self-cause on exact same event
                    if cand_id == effect_id:
                        continue

                    # HARD TEMPORAL RULE: Cause must strictly precede Effect
                    if cand_epoch >= effect_epoch:
                        continue

                    gap_seconds = effect_epoch - cand_epoch

                    # Query canonical template for plausible propagation delay window
                    window = find_plausible_propagation_window(cand_comp, effect_comp)

                    # Strict propagation window filter if requested
                    if enforce_propagation_window:
                        if gap_seconds < window["min_seconds"] or gap_seconds > window["max_seconds"]:
                            continue

                    # HARD CONSTRAINT GATEWAY: Non-bypassable structural, physical, and temporal validation
                    hc_res = HardConstraintValidator.validate(
                        cause_event=cand_event,
                        effect_event=effect,
                        spacecraft_graph=g_craft,
                        propagation_window=window,
                        enforce_propagation_window=enforce_propagation_window,
                    )
                    if not hc_res.passed:
                        # Rejected by hard physical/mission law outside the ML model
                        continue

                    # Dependency type & strength
                    if cand_comp == effect_comp:
                        dep_type = "internal_progression"
                        dep_strength = "critical"
                        s_dependency = 1.0
                    else:
                        path = nx.shortest_path(g_craft, cand_comp, effect_comp)
                        direct_edge = g_craft.edges[path[0], path[1]] if len(path) >= 2 else None
                        dep_type = direct_edge.get("dependency_type", "functional") if direct_edge else "indirect"
                        dep_strength = direct_edge.get("dependency_strength", "moderate") if direct_edge else "indirect"

                        path_str = 1.0
                        for i in range(len(path) - 1):
                            e_data = g_craft.edges[path[i], path[i + 1]]
                            s_label = e_data.get("dependency_strength", "moderate")
                            path_str *= STRENGTH_WEIGHT.get(s_label, 0.5)
                        s_dependency = path_str

                    # Score via Learned Scorer or Legacy Baseline
                    if scorer_type == "learned":
                        scored_res = learned_scorer.score_candidate(
                            cause_event=cand_event,
                            effect_event=effect,
                            spacecraft_graph=g_craft,
                            events_by_comp=events_by_comp,
                            propagation_window=window,
                            operating_mode=operating_mode,
                            threshold=confidence_threshold,
                        )
                        confidence = scored_res.probability
                        predicted_prob = scored_res.probability
                        causal_feats = scored_res.features
                        s_temporal = scored_res.features.get("temporal_plausibility", 0.0)
                        s_intermediate = scored_res.features.get("intermediate_corroboration", 0.0)
                        phys_consistency = scored_res.features.get("physics_consistency_score", 1.0)
                    else:
                        # Legacy baseline scorer
                        s_temporal = compute_temporal_score(gap_seconds, window)
                        if cand_comp == effect_comp or not nx.has_path(g_craft, cand_comp, effect_comp):
                            s_intermediate = 1.0
                        else:
                            path = nx.shortest_path(g_craft, cand_comp, effect_comp)
                            intermediates = path[1:-1]
                            if not intermediates:
                                s_intermediate = 1.0
                            else:
                                matched = sum(
                                    1 for ic in intermediates
                                    if any(cand_epoch < e["_epoch"] < effect_epoch for e in events_by_comp.get(ic, []))
                                )
                                s_intermediate = matched / len(intermediates)

                        confidence = w_t * s_temporal + w_d * s_dependency + w_i * s_intermediate
                        predicted_prob = confidence
                        causal_feats = extract_causal_features(
                            cand_event, effect, g_craft, events_by_comp, window, operating_mode
                        )
                        phys_consistency = causal_feats.get("physics_consistency_score", 1.0)

                    phys_text = " Transition is physically consistent with subsystem transfer dynamics." if phys_consistency >= 0.8 else f" Physical consistency is {phys_consistency:.2f}."
                    model_text = f"learned causal probability P={confidence:.3f}" if scorer_type == "learned" else f"legacy formula score S={confidence:.3f}"

                    edge_tier = to_confidence_tier(confidence, confidence_threshold)
                    edge_missing_notes = []
                    if cand_comp != effect_comp and nx.has_path(g_craft, cand_comp, effect_comp):
                        path = nx.shortest_path(g_craft, cand_comp, effect_comp)
                        intermediates = path[1:-1]
                        missing_for_edge = [
                            ic for ic in intermediates
                            if not any(cand_epoch < e["_epoch"] < effect_epoch for e in events_by_comp.get(ic, []))
                        ]
                        if missing_for_edge:
                            note = f"Intermediate telemetry absent on: {', '.join(missing_for_edge)}"
                            edge_missing_notes.append(note)
                            missing_evidence_list.append({
                                "path": f"{cand_comp} -> {effect_comp}",
                                "missing_components": missing_for_edge,
                                "source_event_id": cand_id,
                                "target_event_id": effect_id,
                                "cause_event_id": cand_id,
                                "effect_event_id": effect_id,
                                "cause_time": cand_event.get("timestamp"),
                                "effect_time": effect.get("timestamp"),
                                "description": f"Intermediate telemetry absent on {', '.join(missing_for_edge)} during the {gap_seconds:.1f}s propagation window."
                            })

                    is_uncertain_edge = (edge_tier in ["LOW CONFIDENCE", "INSUFFICIENT EVIDENCE"]) or (phys_consistency < 0.70) or (len(edge_missing_notes) > 0 and confidence < 0.65)

                    evidence = (
                        f"{effect_comp} event '{effect_id}' at {effect.get('timestamp')} is causally explained by "
                        f"{cand_comp} event '{cand_id}' at {cand_event.get('timestamp')} via a {dep_strength} "
                        f"{dep_type} dependency ({model_text}, {edge_tier}), with a {gap_seconds:.1f}s propagation gap "
                        f"(plausible window [{window['min_seconds']}s, {window['max_seconds']}s], "
                        f"temporal plausibility {s_temporal:.2f}); "
                        f"{int(s_intermediate * 100)}% of intermediate components on the path also verified.{phys_text}"
                    )

                    edge = TemporalCausalEdge(
                        id=str(uuid.uuid4()),
                        source_event_id=cand_id,
                        target_event_id=effect_id,
                        source_component=cand_comp,
                        target_component=effect_comp,
                        dependency_type=dep_type,
                        dependency_strength=dep_strength,
                        temporal_distance_seconds=gap_seconds,
                        allowed_propagation_window=window,
                        evidence=evidence,
                        s_temporal=s_temporal,
                        s_dependency=s_dependency,
                        s_intermediate=s_intermediate,
                        confidence=confidence,
                        confidence_tier=edge_tier,
                        is_uncertain=is_uncertain_edge,
                        missing_evidence_notes=edge_missing_notes,
                        predicted_probability=predicted_prob,
                        causal_features=causal_feats,
                        scorer_type=scorer_type,
                        hard_constraints_passed=True,
                        physical_consistency=phys_consistency,
                    )
                    teg.add_edge(edge)

                    curr_best = best_upstream.get(effect_id)
                    should_replace = False
                    if curr_best is None:
                        should_replace = True
                    else:
                        cand_hops = len(nx.shortest_path(g_craft, cand_comp, effect_comp)) - 1 if (cand_comp != effect_comp and nx.has_path(g_craft, cand_comp, effect_comp)) else (0 if cand_comp == effect_comp else 9)
                        curr_comp = curr_best[1].source_component
                        curr_hops = len(nx.shortest_path(g_craft, curr_comp, effect_comp)) - 1 if (curr_comp != effect_comp and nx.has_path(g_craft, curr_comp, effect_comp)) else (0 if curr_comp == effect_comp else 9)

                        # Prefer immediate physical cause (fewer hops) over indirect ancestor bypass
                        if cand_hops < curr_hops:
                            should_replace = confidence >= (curr_best[0] - 0.05)
                        elif cand_hops == curr_hops:
                            should_replace = confidence > curr_best[0]
                        else:
                            should_replace = confidence > (curr_best[0] + 0.10)

                    if should_replace:
                        best_upstream[effect_id] = (confidence, edge)

        # 5. Apply best upstream confidence and classification
        for event_id, (conf, edge) in best_upstream.items():
            if event_id in teg.nodes:
                teg.nodes[event_id].confidence = conf
                teg.nodes[event_id].upstream_edge_ids = [edge.id]
                node_tier = to_confidence_tier(conf, confidence_threshold)
                node_label = to_confidence_label(conf)
                teg.nodes[event_id].confidence_tier = node_tier
                teg.nodes[event_id].confidence_label = node_label

        # 6. Role Classification
        # Also index all valid outgoing causal edges by source event
        outgoing_edges_by_source: Dict[str, List[TemporalCausalEdge]] = {}
        for edge in teg.edges:
            if edge.confidence >= confidence_threshold:
                outgoing_edges_by_source.setdefault(edge.source_event_id, []).append(edge)

        has_valid_upstream = {
            eid: (n.confidence >= confidence_threshold) for eid, n in teg.nodes.items()
        }
        caused_by: Dict[str, Set[str]] = {}
        for eid, (conf, edge) in best_upstream.items():
            if conf >= confidence_threshold:
                caused_by.setdefault(edge.source_event_id, set()).add(eid)

        primaries = []
        for eid, node in teg.nodes.items():
            upstream_ok = has_valid_upstream.get(eid, False)
            has_downstream = eid in caused_by and len(caused_by[eid]) > 0
            has_candidate_outgoing = eid in outgoing_edges_by_source and len(outgoing_edges_by_source[eid]) > 0
            any_candidate_existed = eid in best_upstream

            if not upstream_ok and (has_downstream or has_candidate_outgoing):
                node.role = "primary"
                primaries.append(eid)
            elif upstream_ok and has_downstream:
                node.role = "propagation"
            elif upstream_ok and not has_downstream:
                node.role = "secondary"
            elif not any_candidate_existed and not has_downstream and not has_candidate_outgoing:
                node.role = "independent"
                node.confidence_tier = "INSUFFICIENT EVIDENCE"
                node.confidence_label = "insufficient_evidence"
            else:
                node.role = "unknown"

        # Calculate primary node confidences from their outgoing downstream transitions
        for eid in primaries:
            out_edges = outgoing_edges_by_source.get(eid, [])
            if not out_edges:
                downstream_eids = caused_by.get(eid, set())
                out_edges = [e for e in teg.edges if e.source_event_id == eid and e.target_event_id in downstream_eids]
            outgoing_confs = [e.confidence for e in out_edges]
            root_conf = float(np.mean(outgoing_confs)) if outgoing_confs else 0.85
            teg.nodes[eid].confidence = root_conf
            node_tier = to_confidence_tier(root_conf, confidence_threshold)
            node_label = to_confidence_label(root_conf)
            teg.nodes[eid].confidence_tier = node_tier
            teg.nodes[eid].confidence_label = node_label

        # 7. Competing Hypotheses & Root Cause Ambiguity Analysis
        competing_hypotheses = []
        is_ambiguous = False
        incident_tier = "HIGH CONFIDENCE"

        candidate_roots = list(primaries)
        earliest_epoch = min((n.timestamp_epoch for n in teg.nodes.values() if n.timestamp_epoch > 0), default=0.0)
        for eid, node in teg.nodes.items():
            if eid not in candidate_roots and not has_valid_upstream.get(eid, False):
                # An uncaused origin event occurring near the beginning is a candidate root
                if abs(node.timestamp_epoch - earliest_epoch) <= 15.0:
                    candidate_roots.append(eid)
                    out_edges = outgoing_edges_by_source.get(eid, [])
                    if out_edges and node.confidence == 0.0:
                        node.confidence = float(np.mean([e.confidence for e in out_edges]))
                        node.confidence_tier = to_confidence_tier(node.confidence, confidence_threshold)

        if len(candidate_roots) > 1:
            scored_roots = []
            for pid in candidate_roots:
                p_node = teg.nodes[pid]
                out_edges = outgoing_edges_by_source.get(pid, [])
                downstream_cnt = max(len(caused_by.get(pid, set())), len({e.target_event_id for e in out_edges}))
                score = p_node.confidence * 0.65 + min(1.0, downstream_cnt / 4.0) * 0.35
                scored_roots.append((score, p_node, downstream_cnt))

            scored_roots.sort(key=lambda x: x[0], reverse=True)
            top_score = scored_roots[0][0]
            runner_up_score = scored_roots[1][0]
            margin = top_score - runner_up_score

            # If margin < 0.15, competing explanations remain too close -> DO NOT force a single root!
            if margin < 0.15:
                is_ambiguous = True
                incident_tier = "MODERATE CONFIDENCE" if top_score >= 0.65 else "LOW CONFIDENCE"
                for idx, (sc, p_node, d_cnt) in enumerate(scored_roots):
                    competing_hypotheses.append({
                        "hypothesis_id": f"HYP-{idx+1}",
                        "event_id": p_node.event_id,
                        "component": p_node.component,
                        "confidence": round(p_node.confidence, 4),
                        "confidence_tier": p_node.confidence_tier,
                        "score_margin": round(top_score - sc, 4),
                        "margin_from_top": round(top_score - sc, 4),
                        "downstream_events_count": d_cnt,
                        "rationale": f"Candidate root '{p_node.component}' ({p_node.event_id}) initiates {d_cnt} downstream failure transition(s) with confidence {p_node.confidence:.2f}."
                    })
                teg.primary_cause_event_ids = [sp[1].event_id for sp in scored_roots]
            else:
                is_ambiguous = False
                incident_tier = scored_roots[0][1].confidence_tier
                teg.primary_cause_event_ids = [scored_roots[0][1].event_id]

        elif len(candidate_roots) == 1:
            p_node = teg.nodes[candidate_roots[0]]
            is_ambiguous = False
            incident_tier = p_node.confidence_tier
            teg.primary_cause_event_ids = [p_node.event_id]
        else:
            is_ambiguous = True
            incident_tier = "INSUFFICIENT EVIDENCE"
            teg.primary_cause_event_ids = []

        # 8. Independent Events Collection
        independent_list = [
            {
                "event_id": node.event_id,
                "component": node.component,
                "timestamp": node.timestamp,
                "description": node.telemetry_evidence.get("description", ""),
                "anomaly_classification": node.anomaly_classification,
                "isolation_reason": "No valid physical dependency path or propagation window connecting to the primary failure cascade."
            }
            for node in teg.nodes.values() if node.role == "independent"
        ]

        # 9. Uncertain Edges Collection
        uncertain_edges_list = [
            {
                "edge_id": e.id,
                "source_event_id": e.source_event_id,
                "target_event_id": e.target_event_id,
                "source_component": e.source_component,
                "target_component": e.target_component,
                "confidence": round(e.confidence, 4),
                "confidence_tier": e.confidence_tier,
                "temporal_distance_seconds": e.temporal_distance_seconds,
                "physical_consistency": round(e.physical_consistency, 4),
                "reasons": (
                    (["Low edge confidence (<0.50)"] if e.confidence < 0.50 else []) +
                    (["Low physical consistency (<0.70)"] if e.physical_consistency < 0.70 else []) +
                    e.missing_evidence_notes
                )
            }
            for e in teg.edges if e.is_uncertain
        ]

        # 10. Out-of-Distribution Pattern Status
        has_ood_events = any(getattr(n, "is_out_of_distribution", False) for n in teg.nodes.values())
        if (len(primaries) == 0 and len(teg.edges) == 0 and len(teg.nodes) > 0) or (has_ood_events and len(teg.edges) <= 1):
            teg.pattern_status = "UNKNOWN / OUT-OF-DISTRIBUTION"
            if incident_tier == "HIGH CONFIDENCE":
                incident_tier = "LOW CONFIDENCE"
        else:
            teg.pattern_status = "KNOWN PATTERN"

        teg.is_ambiguous_root = is_ambiguous
        teg.confidence_tier = incident_tier
        teg.competing_hypotheses = competing_hypotheses
        teg.missing_evidence = missing_evidence_list
        teg.uncertain_edges = uncertain_edges_list
        teg.independent_events = independent_list

        # Minimum Causal Explanation Set (Greedy Dominating Set)
        if primaries:
            teg.minimum_explanation_event_ids = list(primaries)
        else:
            sorted_nodes = sorted(teg.nodes.values(), key=lambda x: x.confidence, reverse=True)
            teg.minimum_explanation_event_ids = [sorted_nodes[0].event_id] if sorted_nodes else []

        return teg
