"""
backend/app/core/causal_features.py

Constructs comprehensive feature vectors for candidate cause-effect event pairs (e_cause, e_effect)
in the Temporal Event Graph (TEG).

Captures:
1. Temporal distance & propagation delay plausibility
2. Spacecraft dependency & path strength
3. Intermediate hop corroboration
4. Anomaly detection confidence
5. SHAP-derived attribution evidence
6. Physics residual consistency
7. Event severity levels & escalation
8. Operating mode / subsystem coupling context
"""

import math
from typing import Dict, Any, List, Optional, Tuple
import pandas as pd
import networkx as nx

# Numerical severity weights
SEVERITY_MAP = {
    "info": 0.2,
    "warning": 0.6,
    "critical": 1.0,
}

# Feature names in deterministic order (22 core features)
CAUSAL_FEATURE_NAMES = [
    "temporal_distance_seconds",
    "temporal_plausibility",
    "temporal_window_ratio",
    "dependency_path_strength",
    "path_hop_count",
    "is_direct_dependency",
    "dependency_strength_weight",
    "intermediate_corroboration",
    "has_unobserved_intermediates",
    "cause_anomaly_confidence",
    "effect_anomaly_confidence",
    "joint_confidence",
    "shap_importance_score",
    "shap_directional_concordance",
    "cause_residual_normalized",
    "effect_residual_normalized",
    "physics_consistency_score",
    "is_physically_inconsistent",
    "cause_severity_level",
    "effect_severity_level",
    "severity_escalation",
    "operating_mode_encoded",
]


def extract_causal_features(
    cause_event: Dict[str, Any],
    effect_event: Dict[str, Any],
    spacecraft_graph: nx.DiGraph,
    events_by_comp: Optional[Dict[str, List[Dict[str, Any]]]] = None,
    propagation_window: Optional[Dict[str, Any]] = None,
    operating_mode: str = "nominal",
) -> Dict[str, float]:
    """
    Constructs a 22-dimensional numerical feature dictionary for candidate pair (cause_event, effect_event).
    """
    # 1. Temporal timing
    cause_epoch = float(cause_event.get("_epoch", 0.0) or cause_event.get("timestamp_epoch", 0.0))
    effect_epoch = float(effect_event.get("_epoch", 0.0) or effect_event.get("timestamp_epoch", 0.0))
    
    if cause_epoch == 0.0 and cause_event.get("timestamp"):
        try:
            cause_epoch = pd.to_datetime(cause_event["timestamp"]).timestamp()
        except Exception:
            cause_epoch = 0.0
            
    if effect_epoch == 0.0 and effect_event.get("timestamp"):
        try:
            effect_epoch = pd.to_datetime(effect_event["timestamp"]).timestamp()
        except Exception:
            effect_epoch = 0.0

    gap_seconds = max(0.0, effect_epoch - cause_epoch)
    
    # Plausible window
    min_s = 0.001
    max_s = 180.0
    typ_s = 5.0
    if propagation_window:
        min_s = float(propagation_window.get("min_seconds", 0.001))
        max_s = float(propagation_window.get("max_seconds", 180.0))
        typ_s = float(propagation_window.get("typical_seconds", 5.0))

    # Temporal plausibility
    if gap_seconds <= 0:
        temporal_plausibility = 0.0
    elif min_s <= gap_seconds <= max_s:
        temporal_plausibility = 1.0
    elif gap_seconds < min_s:
        temporal_plausibility = max(0.1, 0.5 * (gap_seconds / max(min_s, 1e-4)))
    else:
        decay_span = max(max_s * 2.0, 60.0)
        temporal_plausibility = max(0.1, 1.0 - (gap_seconds - max_s) / decay_span * 0.8)

    window_ratio = min(10.0, gap_seconds / max(typ_s, 0.1))

    # 2. Dependency & Path Strength
    cause_comp = cause_event.get("component", "unknown")
    effect_comp = effect_event.get("component", "unknown")

    if cause_comp == effect_comp:
        path_strength = 1.0
        hop_count = 0.0
        is_direct = 1.0
        dep_weight = 1.0
    elif spacecraft_graph is not None and spacecraft_graph.has_node(cause_comp) and spacecraft_graph.has_node(effect_comp) and nx.has_path(spacecraft_graph, cause_comp, effect_comp):
        path = nx.shortest_path(spacecraft_graph, cause_comp, effect_comp)
        hop_count = float(len(path) - 1)
        is_direct = 1.0 if hop_count == 1.0 else 0.0
        
        strength_weights = {
            "critical": 1.0,
            "strong": 0.8,
            "moderate": 0.5,
            "weak": 0.2,
            "functional": 0.7,
            "power": 0.9,
            "thermal": 0.85,
            "telemetry": 0.6,
        }
        
        path_str = 1.0
        direct_weight = 0.5
        for i in range(len(path) - 1):
            e_data = spacecraft_graph.edges[path[i], path[i+1]]
            s_label = e_data.get("dependency_strength") or e_data.get("dependency_type", "moderate")
            w = strength_weights.get(str(s_label).lower(), 0.5)
            path_str *= w
            if i == 0:
                direct_weight = w
        path_strength = path_str
        dep_weight = direct_weight
    else:
        path_strength = 0.0
        hop_count = 9.0
        is_direct = 0.0
        dep_weight = 0.0

    # 3. Intermediate Corroboration
    if cause_comp == effect_comp or hop_count <= 1.0:
        intermediate_corroboration = 1.0
        has_unobserved = 0.0
    elif spacecraft_graph is not None and spacecraft_graph.has_node(cause_comp) and spacecraft_graph.has_node(effect_comp) and nx.has_path(spacecraft_graph, cause_comp, effect_comp):
        path = nx.shortest_path(spacecraft_graph, cause_comp, effect_comp)
        intermediates = path[1:-1]
        if not intermediates:
            intermediate_corroboration = 1.0
            has_unobserved = 0.0
        else:
            matched = 0
            if events_by_comp:
                for comp in intermediates:
                    comp_events = events_by_comp.get(comp, [])
                    if any(cause_epoch < (e.get("_epoch") or 0.0) < effect_epoch for e in comp_events):
                        matched += 1
            intermediate_corroboration = float(matched) / float(len(intermediates))
            has_unobserved = 1.0 if matched == 0 else 0.0
    else:
        intermediate_corroboration = 0.0
        has_unobserved = 1.0

    # 4. Anomaly Confidence
    cause_conf = float(cause_event.get("confidence", 0.85) or 0.85)
    effect_conf = float(effect_event.get("confidence", 0.85) or 0.85)
    joint_conf = round(cause_conf * effect_conf, 4)

    # 5. SHAP Evidence
    cause_ev_data = cause_event.get("telemetry_evidence") or cause_event
    shap_importance = float(cause_ev_data.get("shap_importance", 0.6) or 0.6)
    
    shap_concordance = 1.0
    cause_val = cause_event.get("value")
    effect_val = effect_event.get("value")
    if cause_val is not None and effect_val is not None:
        if ("thermal" in cause_comp or "temp" in cause_comp) and cause_val <= -900.0:
            shap_concordance = 1.0
        elif ("heater" in cause_comp or "triac" in cause_comp) and cause_val >= 0.8:
            shap_concordance = 1.0
        elif ("power" in cause_comp or "bus" in cause_comp) and cause_val <= 3.2:
            shap_concordance = 1.0

    # 6. Physics Residual Consistency
    cause_res_raw = cause_event.get("normalized_residual")
    effect_res_raw = effect_event.get("normalized_residual")
    cause_res = float(cause_res_raw) if cause_res_raw is not None else 0.0
    effect_res = float(effect_res_raw) if effect_res_raw is not None else 0.0

    # Physics consistency check
    phys_consistency = 1.0
    if "heater" in cause_comp and ("battery" in effect_comp or "cell" in effect_comp):
        cand_val = cause_event.get("value")
        eff_res = effect_event.get("residual")
        if cand_val is not None and eff_res is not None:
            if cand_val >= 0.5 and eff_res >= 0.0:
                phys_consistency = 1.0
            elif cand_val <= 0.2 and eff_res > 10.0:
                phys_consistency = 0.2
    elif ("battery" in cause_comp or "protect" in cause_comp or "bms" in cause_comp) and ("power" in effect_comp or "bus" in effect_comp):
        cand_val = cause_event.get("value")
        eff_val = effect_event.get("value")
        if cand_val is not None and eff_val is not None:
            if cand_val >= 0.5 and eff_val <= 3.2:
                phys_consistency = 1.0
            elif cand_val < 0.5 and eff_val <= 3.2:
                phys_consistency = 0.3
    elif ("thermal" in cause_comp or "temp" in cause_comp) and "heater" in effect_comp:
        cand_val = cause_event.get("value")
        if cand_val is not None and cand_val <= -900.0:
            phys_consistency = 1.0

    is_phys_inconsistent = 1.0 if (
        phys_consistency < 0.5 or 
        (cause_event.get("is_physical_anomaly", False) != effect_event.get("is_physical_anomaly", False) and phys_consistency < 0.7)
    ) else 0.0

    # 7. Event Severity & Escalation
    cause_sev_str = str(cause_event.get("severity", "warning")).lower()
    effect_sev_str = str(effect_event.get("severity", "warning")).lower()
    cause_sev = SEVERITY_MAP.get(cause_sev_str, 0.6)
    effect_sev = SEVERITY_MAP.get(effect_sev_str, 0.6)
    sev_escalation = max(0.0, effect_sev - cause_sev)

    # 8. Operating Mode & Context
    mode_map = {
        "nominal": 0.0,
        "detumbling": 0.3,
        "safe_hold": 0.5,
        "eclipse": 0.7,
        "payload_ops": 0.2,
        "anomaly_recovery": 1.0,
    }
    mode_encoded = mode_map.get(str(operating_mode).lower(), 0.0)

    return {
        "temporal_distance_seconds": round(gap_seconds, 4),
        "temporal_plausibility": round(temporal_plausibility, 4),
        "temporal_window_ratio": round(window_ratio, 4),
        "dependency_path_strength": round(path_strength, 4),
        "path_hop_count": round(hop_count, 1),
        "is_direct_dependency": round(is_direct, 1),
        "dependency_strength_weight": round(dep_weight, 4),
        "intermediate_corroboration": round(intermediate_corroboration, 4),
        "has_unobserved_intermediates": round(has_unobserved, 1),
        "cause_anomaly_confidence": round(cause_conf, 4),
        "effect_anomaly_confidence": round(effect_conf, 4),
        "joint_confidence": round(joint_conf, 4),
        "shap_importance_score": round(shap_importance, 4),
        "shap_directional_concordance": round(shap_concordance, 4),
        "cause_residual_normalized": round(cause_res, 4),
        "effect_residual_normalized": round(effect_res, 4),
        "physics_consistency_score": round(phys_consistency, 4),
        "is_physically_inconsistent": round(is_phys_inconsistent, 1),
        "cause_severity_level": round(cause_sev, 4),
        "effect_severity_level": round(effect_sev, 4),
        "severity_escalation": round(sev_escalation, 4),
        "operating_mode_encoded": round(mode_encoded, 4),
    }


def feature_dict_to_vector(features: Dict[str, float]) -> List[float]:
    """Convert feature dictionary to ordered list according to CAUSAL_FEATURE_NAMES."""
    return [float(features.get(name, 0.0)) for name in CAUSAL_FEATURE_NAMES]
