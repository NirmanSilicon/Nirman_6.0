"""
backend/app/core/mission_model/legacy_adapter.py

Legacy adapter bridge for the AXYRA mission architecture boundary.
Wraps the new subsystem templates, causal model specifications, and event
models so that all existing legacy code (views.py, tests, simulations) continues
to operate with 100% mathematical, functional, and API contract parity.
"""

from typing import List, Dict, Tuple, Optional, Any
import networkx as nx
import pandas as pd

from .subsystem_template import (
    SubsystemTemplate,
    STANDARD_CUBESAT_13_NODE_TEMPLATE,
    STRENGTH_WEIGHT,
)
from .causal_model import (
    CausalModelSpec,
    STANDARD_CAUSAL_MODEL_SPEC,
    load_causal_spec_from_file,
)
from .event_model import EventRecord
from .mission_graph import (
    MissionCausalGraph,
    MissionCausalNode,
    MissionCausalEdge,
)


def get_standard_dependency_graph() -> nx.DiGraph:
    """Returns the compiled NetworkX graph from the standard 13-node template."""
    return STANDARD_CUBESAT_13_NODE_TEMPLATE.to_networkx()


def calculate_path_strength(g: nx.DiGraph, source: str, target: str) -> Optional[float]:
    """
    Compute geometric path strength along shortest DAG path.
    Preserves exact legacy path_strength behavior.
    """
    if source not in g or target not in g:
        return None
    if not nx.has_path(g, source, target):
        return None
    path = nx.shortest_path(g, source, target)
    strength = 1.0
    for i in range(len(path) - 1):
        edge = g.edges[path[i], path[i + 1]]
        strength *= STRENGTH_WEIGHT.get(edge.get("dependency_strength", "weak"), 0.25)
    return strength


def compile_mission_graph_from_events(
    incident_id: str,
    events: List[Dict[str, Any]],
    template: Optional[SubsystemTemplate] = None,
    causal_spec: Optional[CausalModelSpec] = None,
) -> MissionCausalGraph:
    """
    Instantiates a MissionCausalGraph using the architectural boundary.
    Executes identical candidate generation, temporal filtering, and scoring logic.
    """
    from app.core.causal_engine import build_candidates

    active_template = template or STANDARD_CUBESAT_13_NODE_TEMPLATE
    g = active_template.to_networkx()

    nodes, edges = build_candidates(g, events)

    mission_nodes = [
        MissionCausalNode(
            event_id=n.event_id,
            component=n.component,
            role=n.role,
            confidence=n.confidence,
            confidence_label=n.confidence_label,
            upstream_edge_ids=list(n.upstream_edge_ids),
            timestamp=getattr(n, "timestamp", ""),
            timestamp_epoch=getattr(n, "timestamp_epoch", 0.0),
            event_type=getattr(n, "event_type", "threshold"),
            state_transition=getattr(n, "state_transition", "NOMINAL -> FAULT"),
            telemetry_evidence=getattr(n, "telemetry_evidence", {}),
            subsystem=getattr(n, "subsystem", ""),
            metadata=getattr(n, "metadata", {}),
        )
        for n in nodes
    ]

    mission_edges = [
        MissionCausalEdge(
            id=e.id,
            source_event_id=e.source_event_id,
            target_event_id=e.target_event_id,
            dependency_type=e.dependency_type,
            dependency_strength=e.dependency_strength,
            temporal_gap_seconds=e.temporal_gap_seconds,
            evidence=e.evidence,
            s_temporal=e.s_temporal,
            s_dependency=e.s_dependency,
            s_intermediate=e.s_intermediate,
            confidence=e.confidence,
            temporal_distance_seconds=getattr(e, "temporal_distance_seconds", e.temporal_gap_seconds),
            allowed_propagation_window=getattr(e, "allowed_propagation_window", None),
            source_component=getattr(e, "source_component", ""),
            target_component=getattr(e, "target_component", ""),
            metadata=getattr(e, "metadata", {}),
        )
        for e in edges
    ]

    primary_nodes = [n for n in mission_nodes if n.role == "primary"]
    primary_cause_id = primary_nodes[0].event_id if primary_nodes else (mission_nodes[0].event_id if mission_nodes else None)
    min_exp_ids = [n.event_id for n in primary_nodes] if primary_nodes else ([primary_cause_id] if primary_cause_id else [])

    return MissionCausalGraph(
        incident_id=incident_id,
        nodes=mission_nodes,
        edges=mission_edges,
        primary_cause_event_id=primary_cause_id,
        minimum_explanation_event_ids=min_exp_ids,
        raw_events=events,
        metadata={
            "template_id": active_template.template_id,
            "model_id": causal_spec.model_id if causal_spec else "standard",
        }
    )
