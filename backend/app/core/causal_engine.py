"""
app/core/causal_engine.py

Causal Reasoning Core & Temporal Event Graph (TEG) Boundary Facade.

Input:  Extracted events (from event_extraction.py) + mission dependency graph
        (from graph_generator.py / dependency_graph.py)
Output: Causal genealogy graph — candidate causal transitions evaluated using the
        Constrained Learned Causal Scorer (with non-bypassable hard structural/temporal
        constraints) or legacy 3-weight scoring baseline, with full uncertainty &
        competing hypothesis evaluation.

Pipeline stages:
  1. Temporal Event Graph node & edge generation
  2. Non-negotiable hard structural constraints (Arrow of Time, Subsystem Reachability, Window)
  3. Constrained Learned Causal Edge Scoring (or legacy baseline)
  4. Uncertainty & Ambiguity Reasoning (4-tier confidence, competing hypotheses, missing evidence)
  5. Minimum causal explanation reduction
"""

import os
import sys
import json
import uuid
import argparse
from dataclasses import dataclass, asdict, field
from typing import Optional, Any, List, Dict, Tuple
import pandas as pd
import networkx as nx

# Add current directory and backend directory to path for robust imports
current_dir = os.path.dirname(os.path.abspath(__file__))
backend_dir = os.path.abspath(os.path.join(current_dir, "..", ".."))
for p in [current_dir, backend_dir]:
    if p not in sys.path:
        sys.path.insert(0, p)

try:
    from app.core.dependency_graph import build_dependency_graph, path_strength, STRENGTH_WEIGHT
except ImportError:
    from dependency_graph import build_dependency_graph, path_strength, STRENGTH_WEIGHT

try:
    from app.core.mission_model import (
        MissionCausalGraph,
        compile_mission_graph_from_events,
        CausalModelSpec,
        STANDARD_CAUSAL_MODEL_SPEC,
        TemporalEventGraph,
        TemporalEventNode,
        TemporalCausalEdge,
    )
except ImportError:
    try:
        from mission_model import (
            MissionCausalGraph,
            compile_mission_graph_from_events,
            CausalModelSpec,
            STANDARD_CAUSAL_MODEL_SPEC,
            TemporalEventGraph,
            TemporalEventNode,
            TemporalCausalEdge,
        )
    except ImportError:
        MissionCausalGraph = None
        compile_mission_graph_from_events = None
        CausalModelSpec = None
        STANDARD_CAUSAL_MODEL_SPEC = None
        TemporalEventGraph = None
        TemporalEventNode = None
        TemporalCausalEdge = None


def load_causal_weights() -> tuple[float, float, float]:
    """
    Loads empirical weights calibrated by the AI model (ai_model/weights.json).
    Falls back gracefully to original hand-picked defaults (0.40, 0.35, 0.25)
    if the calibration file is missing or unreadable (WORKFLOW.md section 8).

    Search order (highest priority first):
      1. CAUSAL_WEIGHTS_FILE environment variable
      2. ./weights.json  (CWD — useful for local dev)
      3. backend/../weights.json  (project root copy synced by retrain_all.py)
      4. backend/../ai_model/weights.json  (source of truth)
      5. backend/../simulation/weights.json
    """
    # Resolve project root from this file's location
    project_root = os.path.abspath(os.path.join(current_dir, "..", "..", ".."))
    search_paths = [
        os.environ.get("CAUSAL_WEIGHTS_FILE"),
        "weights.json",
        os.path.join(backend_dir, "..", "weights.json"),
        os.path.join(project_root, "weights.json"),
        os.path.join(backend_dir, "..", "ai_model", "weights.json"),
        os.path.join(project_root, "ai_model", "weights.json"),
        os.path.join(backend_dir, "..", "simulation", "weights.json"),
    ]
    for sp in search_paths:
        if sp and os.path.exists(sp):
            try:
                with open(sp, "r", encoding="utf-8") as f:
                    data = json.load(f)
                w_t = float(data.get("w_temporal", 0.40))
                w_d = float(data.get("w_dependency", 0.35))
                w_i = float(data.get("w_intermediate", 0.25))
                # Sanity check: weights must sum to ~1.0 (±5%) or the file is corrupt
                total = w_t + w_d + w_i
                if not (0.85 <= total <= 1.15):
                    print(f"  [causal_engine] WARN: weights sum={total:.3f} != 1.0 in {sp}; skipping")
                    continue
                return (w_t, w_d, w_i)
            except Exception:
                pass
    return (0.40, 0.35, 0.25)



# Load calibrated scoring weights (or fall back to defaults)
W_TEMPORAL, W_DEPENDENCY, W_INTERMEDIATE = load_causal_weights()

CONFIDENCE_THRESHOLD = 0.40   # below this -> "insufficient evidence"
MAX_HOPS = 3                  # how far upstream to search for candidates


if TemporalEventNode is not None:
    CausalNode = TemporalEventNode
else:
    @dataclass
    class CausalNode:
        event_id: str
        component: str
        role: str = "unknown"          # primary | propagation | secondary | independent | unknown
        confidence: float = 0.0
        confidence_label: str = "insufficient_evidence"
        confidence_tier: str = "INSUFFICIENT EVIDENCE"
        is_out_of_distribution: bool = False
        upstream_edge_ids: list[str] = field(default_factory=list)
        timestamp: str = ""
        timestamp_epoch: float = 0.0
        event_type: str = "threshold"
        state_transition: str = "NOMINAL -> FAULT"
        telemetry_evidence: dict = field(default_factory=dict)
        subsystem: str = ""
        metadata: dict = field(default_factory=dict)


if TemporalCausalEdge is not None:
    CausalEdge = TemporalCausalEdge
else:
    @dataclass
    class CausalEdge:
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
        confidence_tier: str = "INSUFFICIENT EVIDENCE"
        is_uncertain: bool = False
        missing_evidence_notes: list[str] = field(default_factory=list)
        temporal_distance_seconds: float = 0.0
        allowed_propagation_window: dict = field(default_factory=dict)
        source_component: str = ""
        target_component: str = ""
        metadata: dict = field(default_factory=dict)



def export_zk_inputs(edge: CausalEdge) -> dict:
    """
    Extract exact telemetry scoring inputs for Zero-Knowledge proof generation.
    Exposes S_temporal, S_dependency, S_intermediate used to score a given causal edge
    without altering any underlying scoring calculations or confidence thresholds.
    """
    return {
        "edge_id": edge.id,
        "source_event_id": edge.source_event_id,
        "target_event_id": edge.target_event_id,
        "s_temporal": round(edge.s_temporal, 6),
        "s_dependency": round(edge.s_dependency, 6),
        "s_intermediate": round(edge.s_intermediate, 6),
        "confidence": round(edge.confidence, 6),
        "predicted_probability": round(getattr(edge, "predicted_probability", edge.confidence), 6),
    }


def temporal_precedence_score(gap_seconds: float) -> float:
    """
    Plausibility of a propagation delay. Tuned for a CubeSat cascade where
    seconds-to-a-few-minutes is normal; near-instant or very slow gaps are
    weaker (but not impossible) evidence.
    """
    if gap_seconds <= 0:
        return 0.0  # should already be filtered out before this is called
    if gap_seconds <= 1:
        return 0.5          # suspiciously instantaneous
    if gap_seconds <= 180:
        return 1.0          # plausible propagation window
    if gap_seconds <= 600:
        return max(0.3, 1.0 - (gap_seconds - 180) / 420 * 0.7)   # linear decay 1.0 -> 0.3
    return 0.2               # too slow to be confident, but not zero


def intermediate_event_match_score(g: nx.DiGraph, events_by_component: dict,
                                    source_comp: str, target_comp: str,
                                    source_ts: pd.Timestamp, target_ts: pd.Timestamp) -> float:
    """
    If the path from source to target passes through intermediate
    components, check how many of them also logged an event in the
    (source_ts, target_ts) window. No intermediates required -> 1.0.
    """
    if not nx.has_path(g, source_comp, target_comp):
        return 0.0
    path = nx.shortest_path(g, source_comp, target_comp)
    intermediates = path[1:-1]
    if not intermediates:
        return 1.0

    matched = 0
    for comp in intermediates:
        comp_events = events_by_component.get(comp, [])
        if any(source_ts < pd.to_datetime(e["timestamp"]) < target_ts for e in comp_events):
            matched += 1
    return matched / len(intermediates)


def build_candidates(
    g: nx.DiGraph,
    events: list[dict],
    enforce_propagation_window: bool = False,
    allow_same_component: bool = True,
    scorer_type: str = "learned",
    operating_mode: str = "nominal",
) -> tuple[list[CausalNode], list[CausalEdge]]:
    """
    Constructs candidate causal edges and evaluates causal roles using the Temporal Event Graph (TEG),
    enforcing hard non-bypassable structural/temporal constraints and evaluating edge probabilities.
    """
    weights = (W_TEMPORAL, W_DEPENDENCY, W_INTERMEDIATE)
    teg = TemporalEventGraph.build_from_events(
        events=events,
        dependency_graph=g,
        enforce_propagation_window=enforce_propagation_window,
        allow_same_component=allow_same_component,
        scoring_weights=weights,
        confidence_threshold=CONFIDENCE_THRESHOLD,
        max_hops=MAX_HOPS,
        scorer_type=scorer_type,
        operating_mode=operating_mode,
    )
    ordered_nodes = [teg.nodes[e["id"]] for e in events if e.get("id") in teg.nodes]
    if len(ordered_nodes) < len(teg.nodes):
        for nid, n in teg.nodes.items():
            if n not in ordered_nodes:
                ordered_nodes.append(n)
    return ordered_nodes, teg.edges


def generate_mission_causal_graph(
    incident_id: str,
    events: list[dict],
    dependency_graph: Optional[Any] = None,
    enforce_propagation_window: bool = False,
    allow_same_component: bool = True,
    scorer_type: str = "learned",
    operating_mode: str = "nominal",
) -> Optional[Any]:
    """
    Boundary facade: compiles events and the active spacecraft dependency graph
    into a TemporalEventGraph representation using learned edge scoring or legacy baseline.
    """
    weights = (W_TEMPORAL, W_DEPENDENCY, W_INTERMEDIATE)
    return TemporalEventGraph.build_from_events(
        events=events,
        dependency_graph=dependency_graph,
        incident_id=incident_id,
        enforce_propagation_window=enforce_propagation_window,
        allow_same_component=allow_same_component,
        scoring_weights=weights,
        confidence_threshold=CONFIDENCE_THRESHOLD,
        max_hops=MAX_HOPS,
        scorer_type=scorer_type,
        operating_mode=operating_mode,
    )


def main():
    parser = argparse.ArgumentParser(description="Run causal reasoning engine on extracted events.")
    parser.add_argument("--events", default="simulation/events.json")
    parser.add_argument("--output", default="simulation/causal_graph.json")
    parser.add_argument("--scorer-type", default="learned", choices=["learned", "legacy"], help="Causal scoring layer: learned model or legacy 3-weight formula")
    args = parser.parse_args()

    with open(args.events, "r", encoding="utf-8") as f:
        events = json.load(f)

    g = build_dependency_graph()
    nodes, edges = build_candidates(g, events, scorer_type=args.scorer_type)

    result = {
        "nodes": [n.to_dict() if hasattr(n, "to_dict") else asdict(n) for n in nodes],
        "edges": [e.to_dict() if hasattr(e, "to_dict") else asdict(e) for e in edges],
    }
    with open(args.output, "w", encoding="utf-8") as f:
        json.dump(result, f, indent=2)

    print(f"Scored {len(nodes)} events using [{args.scorer_type.upper()}] scorer, generated {len(edges)} candidate causal edges.\n")
    for n in sorted(nodes, key=lambda x: x.component):
        print(f"  {n.component:<22} role={n.role:<12} "
              f"confidence={n.confidence:.2f} ({n.confidence_label})")

    primaries = [n for n in nodes if n.role == "primary"]
    print(f"\nPrimary trigger(s) found: {[n.component for n in primaries]}")
    print("Expected: ['thermal_sensor'] — if this doesn't match, check MAX_HOPS,")
    print("CONFIDENCE_THRESHOLD, and the heater_controller caveat from Stage 2.")
    print(f"\nWritten to {args.output}")
    print("\nNext: build Stage 4 (minimum_causal_explanation.py) to reduce this")
    print("into the smallest defensible root-cause set — see WORKFLOW.md section 7.")


if __name__ == "__main__":
    main()
