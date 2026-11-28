"""
backend/app/core/mission_model/mission_graph.py

Generated mission causal graph schema for the AXYRA architectural boundary.
Represents the compiled causal genealogy, classified nodes, evaluated edges,
root causes, and counterfactual reachability analysis for a mission incident.
"""

from dataclasses import dataclass, field, asdict
from typing import List, Dict, Any, Optional, Set
import networkx as nx

from .event_model import EventRecord, CausalRole


@dataclass
class MissionCausalNode:
    """Classified event node in the compiled mission causal genealogy."""
    event_id: str
    component: str
    role: CausalRole = "unknown"
    confidence: float = 0.0
    confidence_label: str = "insufficient_evidence"
    upstream_edge_ids: List[str] = field(default_factory=list)
    timestamp: str = ""
    timestamp_epoch: float = 0.0
    event_type: str = "threshold"
    state_transition: str = "NOMINAL -> FAULT"
    telemetry_evidence: Dict[str, Any] = field(default_factory=dict)
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
        return asdict(self)


@dataclass
class MissionCausalEdge:
    """Evaluated causal link connecting two anomalous events."""
    id: str
    source_event_id: str
    target_event_id: str
    dependency_type: str
    dependency_strength: str
    temporal_gap_seconds: float
    evidence: str
    s_temporal: float = 0.0
    s_dependency: float = 0.0
    s_intermediate: float = 0.0
    confidence: float = 0.0
    temporal_distance_seconds: float = 0.0
    allowed_propagation_window: Optional[Dict[str, Any]] = None
    source_component: str = ""
    target_component: str = ""
    physical_consistency: float = 1.0
    metadata: Dict[str, Any] = field(default_factory=dict)

    def __post_init__(self):
        if not self.temporal_distance_seconds and self.temporal_gap_seconds:
            self.temporal_distance_seconds = self.temporal_gap_seconds
        elif not self.temporal_gap_seconds and self.temporal_distance_seconds:
            self.temporal_gap_seconds = self.temporal_distance_seconds

    def to_dict(self) -> Dict[str, Any]:
        return asdict(self)



@dataclass
class MissionCausalGraph:
    """
    Complete instantiated causal genealogy graph for a spacecraft mission incident.
    """
    incident_id: str
    nodes: List[MissionCausalNode] = field(default_factory=list)
    edges: List[MissionCausalEdge] = field(default_factory=list)
    primary_cause_event_id: Optional[str] = None
    minimum_explanation_event_ids: List[str] = field(default_factory=list)
    raw_events: List[Dict[str, Any]] = field(default_factory=list)
    metadata: Dict[str, Any] = field(default_factory=dict)

    def to_causal_dag(self) -> nx.DiGraph:
        """Construct a NetworkX DAG of event propagation."""
        dag = nx.DiGraph()
        for edge in self.edges:
            dag.add_edge(edge.source_event_id, edge.target_event_id, edge_id=edge.id, confidence=edge.confidence)
        return dag

    def simulate_counterfactual_reachability(self, target_event_id: str, minutes_earlier: float = 10.0) -> Dict[str, Any]:
        """
        Baseline prevented vs remaining downstream failures using causal DAG reachability.
        """
        dag = self.to_causal_dag()
        prevented_ids: Set[str] = set()
        if target_event_id in dag:
            prevented_ids = set(nx.descendants(dag, target_event_id))
        prevented_ids.add(target_event_id)

        all_event_ids = {e.get("id") for e in self.raw_events if isinstance(e, dict) and "id" in e}
        if not all_event_ids:
            all_event_ids = {n.event_id for n in self.nodes}

        remaining_ids = list(all_event_ids - prevented_ids)
        prevented_list = list(prevented_ids)

        summary = (
            f"Baseline reachability: intervening {minutes_earlier:.0f} minutes earlier on event '{target_event_id}' "
            f"would prune {len(prevented_list)} of {len(all_event_ids)} downstream failure events."
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
        events_data = self.raw_events if self.raw_events else [n.to_dict() for n in self.nodes]
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
        Execute counterfactual simulation. Defaults to structural forward simulation.
        """
        if method == "reachability":
            return self.simulate_counterfactual_reachability(target_event_id, minutes_earlier)
        return self.simulate_counterfactual_structural(target_event_id, minutes_earlier, **kwargs)


    def to_legacy_response(self) -> Dict[str, Any]:
        """Convert to dictionary matching DRF GenealogyResponseSerializer."""
        return {
            "incident_id": self.incident_id,
            "nodes": [n.to_dict() for n in self.nodes],
            "edges": [e.to_dict() for e in self.edges],
            "primary_cause_event_id": self.primary_cause_event_id,
            "minimum_explanation_event_ids": self.minimum_explanation_event_ids,
            "raw_events": self.raw_events,
        }


# Lazy/Direct re-exports for unified mission graph package
from .temporal_event_graph import (
    TemporalEventGraph,
    TemporalEventNode,
    TemporalCausalEdge,
)

