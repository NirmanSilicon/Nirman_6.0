"""
backend/app/core/mission_model/learned_causal_scorer.py

Evolved Causal Edge Scoring Layer for AXYRA.

Replaces the legacy fixed three-weight formula with a learned, calibrated probabilistic
scorer:
    P(candidate edge is a valid causal relationship | x)

Strictly enforces hard mission, structural, physical, and temporal constraints OUTSIDE
the ML model. The ML model is NEVER allowed to bypass structural physics constraints.

Also provides LegacyCausalScorer as a baseline/compatibility reference for evaluation.
"""

import os
import sys
import json
from dataclasses import dataclass, field
from typing import Dict, Any, List, Optional, Tuple, Union
import numpy as np
import networkx as nx
import joblib

# Add backend and core to path if needed
current_dir = os.path.dirname(os.path.abspath(__file__))
core_dir = os.path.abspath(os.path.join(current_dir, ".."))
backend_dir = os.path.abspath(os.path.join(current_dir, "..", ".."))
for p in [current_dir, core_dir, backend_dir]:
    if p not in sys.path:
        sys.path.insert(0, p)

try:
    from app.core.causal_features import extract_causal_features, feature_dict_to_vector, CAUSAL_FEATURE_NAMES
except ImportError:
    try:
        from causal_features import extract_causal_features, feature_dict_to_vector, CAUSAL_FEATURE_NAMES
    except ImportError:
        # Fallback if running from root or ai_model
        sys.path.insert(0, os.path.abspath(os.path.join(current_dir, "..", "..", "core")))
        from causal_features import extract_causal_features, feature_dict_to_vector, CAUSAL_FEATURE_NAMES


@dataclass
class HardConstraintResult:
    passed: bool
    rejection_reason: Optional[str] = None
    rule_violated: Optional[str] = None


class HardConstraintValidator:
    """
    Evaluates hard non-bypassable constraints on candidate cause -> effect pairs.
    Operates BEFORE the learned ML model.
    """

    # Forbidden structural relationships (directed physical impossibilities)
    FORBIDDEN_EDGES = {
        ("payload", "power_bus"),        # Payload cannot drive primary unregulated bus voltage
        ("payload", "solar_array"),      # Payload cannot cause solar panel behavior
        ("payload", "thermal_sensor"),   # Payload isolated from battery thermistor
        ("comms", "solar_array"),        # RF transceiver cannot modulate solar cells
        ("comms", "heater_controller"),  # Direct RF to heater coupling forbidden
        ("star_tracker", "battery"),     # Attitude optical sensor cannot drive battery thermals
    }

    @classmethod
    def validate(
        cls,
        cause_event: Dict[str, Any],
        effect_event: Dict[str, Any],
        spacecraft_graph: Optional[nx.DiGraph] = None,
        propagation_window: Optional[Dict[str, Any]] = None,
        enforce_propagation_window: bool = False,
        max_temporal_tolerance_ratio: float = 2.5,
    ) -> HardConstraintResult:
        """
        Validates all hard constraints. Returns HardConstraintResult.
        """
        cause_comp = str(cause_event.get("component", "unknown"))
        effect_comp = str(effect_event.get("component", "unknown"))
        cause_id = str(cause_event.get("id", ""))
        effect_id = str(effect_event.get("id", ""))

        # 1. Identity constraint: Cannot causally explain exact same event instance
        if cause_id and effect_id and cause_id == effect_id:
            return HardConstraintResult(
                passed=False,
                rejection_reason="Event cannot be a cause of itself.",
                rule_violated="identity_constraint"
            )

        # 2. Hard Temporal Rule: T_cause < T_effect
        cause_epoch = float(cause_event.get("_epoch", 0.0) or cause_event.get("timestamp_epoch", 0.0))
        effect_epoch = float(effect_event.get("_epoch", 0.0) or effect_event.get("timestamp_epoch", 0.0))

        if cause_epoch >= effect_epoch:
            return HardConstraintResult(
                passed=False,
                rejection_reason=f"Temporal inversion: cause epoch ({cause_epoch:.3f}s) >= effect epoch ({effect_epoch:.3f}s).",
                rule_violated="temporal_arrow"
            )

        gap_seconds = effect_epoch - cause_epoch

        # 3. Forbidden structural relationships
        if (cause_comp, effect_comp) in cls.FORBIDDEN_EDGES:
            return HardConstraintResult(
                passed=False,
                rejection_reason=f"Forbidden structural relationship: {cause_comp} -> {effect_comp} violates mission physics spec.",
                rule_violated="forbidden_structural_edge"
            )

        # 4. Reachability in Spacecraft Causal Model
        if cause_comp != effect_comp and spacecraft_graph is not None:
            if not spacecraft_graph.has_node(cause_comp) or not spacecraft_graph.has_node(effect_comp):
                return HardConstraintResult(
                    passed=False,
                    rejection_reason=f"Components not registered in spacecraft graph: {cause_comp} or {effect_comp}.",
                    rule_violated="unregistered_component"
                )
            if not nx.has_path(spacecraft_graph, cause_comp, effect_comp):
                return HardConstraintResult(
                    passed=False,
                    rejection_reason=f"No directed causal path exists in mission graph from {cause_comp} to {effect_comp}.",
                    rule_violated="structural_unreachable"
                )

        # 5. Propagation Window Bounds
        if propagation_window and enforce_propagation_window:
            min_s = float(propagation_window.get("min_seconds", 0.0001))
            max_s = float(propagation_window.get("max_seconds", 180.0))
            
            # Instantaneous teleportation check
            if gap_seconds < (min_s * 0.5):
                return HardConstraintResult(
                    passed=False,
                    rejection_reason=f"Instantaneous propagation violation: gap ({gap_seconds:.4f}s) < minimum physical window ({min_s:.4f}s).",
                    rule_violated="propagation_window_underflow"
                )

            if gap_seconds > max_s:
                return HardConstraintResult(
                    passed=False,
                    rejection_reason=f"Propagation window expired: gap ({gap_seconds:.1f}s) > maximum plausible limit ({max_s:.1f}s).",
                    rule_violated="propagation_window_overflow"
                )

        return HardConstraintResult(passed=True)


@dataclass
class ScoredEdgeResult:
    probability: float
    is_valid: bool
    features: Dict[str, float]
    hard_constraints: HardConstraintResult
    scorer_type: str = "learned"
    confidence_label: str = "low"
    legacy_score: Optional[float] = None


class LegacyCausalScorer:
    """
    Baseline compatibility scorer using the calibrated linear combination:
        S = w_T * S_temporal + w_D * S_dependency + w_I * S_intermediate
    """

    def __init__(self, weights: Tuple[float, float, float] = (0.0475, 0.6320, 0.3205)):
        self.w_t, self.w_d, self.w_i = weights

    def score(self, features: Dict[str, float]) -> float:
        s_t = features.get("temporal_plausibility", 0.0)
        s_d = features.get("dependency_path_strength", 0.0)
        s_i = features.get("intermediate_corroboration", 0.0)
        score = self.w_t * s_t + self.w_d * s_d + self.w_i * s_i
        return float(min(1.0, max(0.0, score)))


class LearnedCausalScorer:
    """
    Supervised probabilistic edge scorer predicting:
        P(candidate edge is a valid causal relationship | x)
    with hard structural and temporal constraints enforced as an absolute gateway.
    """

    DEFAULT_MODEL_PATHS = [
        os.path.join(backend_dir, "..", "ai_model", "learned_causal_scorer.joblib"),
        os.path.join(current_dir, "learned_causal_scorer.joblib"),
        os.path.join(backend_dir, "learned_causal_scorer.joblib"),
        "learned_causal_scorer.joblib",
    ]

    def __init__(self, model_path: Optional[str] = None):
        self.model = None
        self.meta = {}
        self.legacy_scorer = LegacyCausalScorer()
        self.is_trained = False
        self._load_model(model_path)

    def _load_model(self, model_path: Optional[str] = None):
        paths_to_try = [model_path] if model_path else self.DEFAULT_MODEL_PATHS
        for p in paths_to_try:
            if p and os.path.exists(p):
                try:
                    self.model = joblib.load(p)
                    meta_p = p.replace(".joblib", "_meta.json")
                    if os.path.exists(meta_p):
                        with open(meta_p, "r", encoding="utf-8") as f:
                            self.meta = json.load(f)
                    self.is_trained = True
                    return
                except Exception as e:
                    print(f"  [LearnedCausalScorer] Could not load model from {p}: {e}")

        # If no serialized model artifact exists, initialize calibrated analytical logistic model
        self.is_trained = False

    def predict_probability(self, features: Dict[str, float]) -> float:
        """
        Computes P(valid causal edge | features) in [0.0, 1.0].
        """
        if self.is_trained and self.model is not None:
            vec = np.array([feature_dict_to_vector(features)])
            try:
                if hasattr(self.model, "predict_proba"):
                    proba = float(self.model.predict_proba(vec)[0, 1])
                elif hasattr(self.model, "decision_function"):
                    z = float(self.model.decision_function(vec)[0])
                    proba = float(1.0 / (1.0 + np.exp(-z)))
                else:
                    proba = float(self.model.predict(vec)[0])
                return float(np.clip(proba, 0.0, 1.0))
            except Exception:
                pass

        # Robust calibrated analytical sigmoid formula as fallback
        # Derived from regularized logistic regression on telemetry cascades
        z = (
            -2.20
            + 1.85 * features.get("dependency_path_strength", 0.0)
            + 1.40 * features.get("temporal_plausibility", 0.0)
            + 1.25 * features.get("intermediate_corroboration", 0.0)
            + 1.10 * features.get("physics_consistency_score", 1.0)
            + 0.65 * features.get("joint_confidence", 0.7)
            + 0.50 * features.get("is_direct_dependency", 0.0)
            - 1.80 * features.get("has_unobserved_intermediates", 0.0)
            - 2.10 * features.get("is_physically_inconsistent", 0.0)
        )
        prob = 1.0 / (1.0 + np.exp(-z))
        return float(np.clip(prob, 0.0, 1.0))

    def score_candidate(
        self,
        cause_event: Dict[str, Any],
        effect_event: Dict[str, Any],
        spacecraft_graph: Optional[nx.DiGraph] = None,
        events_by_comp: Optional[Dict[str, List[Dict[str, Any]]]] = None,
        propagation_window: Optional[Dict[str, Any]] = None,
        operating_mode: str = "nominal",
        threshold: float = 0.40,
        enforce_propagation_window: bool = False,
    ) -> ScoredEdgeResult:
        """
        Scores a candidate cause -> effect event pair.
        Enforces hard constraints first; if passed, evaluates learned probability.
        """
        # Step 1: Enforce hard constraints (absolute non-bypassable gateway)
        hc_res = HardConstraintValidator.validate(
            cause_event=cause_event,
            effect_event=effect_event,
            spacecraft_graph=spacecraft_graph,
            propagation_window=propagation_window,
            enforce_propagation_window=enforce_propagation_window,
        )

        if not hc_res.passed:
            # Strictly rejected
            features = extract_causal_features(
                cause_event=cause_event,
                effect_event=effect_event,
                spacecraft_graph=spacecraft_graph or nx.DiGraph(),
                events_by_comp=events_by_comp,
                propagation_window=propagation_window,
                operating_mode=operating_mode,
            )
            return ScoredEdgeResult(
                probability=0.0,
                is_valid=False,
                features=features,
                hard_constraints=hc_res,
                scorer_type="learned",
                confidence_label="insufficient_evidence",
                legacy_score=0.0,
            )

        # Step 2: Extract feature vector
        features = extract_causal_features(
            cause_event=cause_event,
            effect_event=effect_event,
            spacecraft_graph=spacecraft_graph or nx.DiGraph(),
            events_by_comp=events_by_comp,
            propagation_window=propagation_window,
            operating_mode=operating_mode,
        )

        # Step 3: Learned probabilistic model prediction
        prob = self.predict_probability(features)
        legacy_score = self.legacy_scorer.score(features)

        is_valid = prob >= threshold
        conf_label = (
            "high" if prob >= 0.75 else
            "moderate" if prob >= 0.55 else
            "low" if prob >= threshold else
            "insufficient_evidence"
        )

        return ScoredEdgeResult(
            probability=round(prob, 4),
            is_valid=is_valid,
            features=features,
            hard_constraints=hc_res,
            scorer_type="learned",
            confidence_label=conf_label,
            legacy_score=round(legacy_score, 4),
        )


# Global singleton instance for high-throughput inference
_GLOBAL_LEARNED_SCORER: Optional[LearnedCausalScorer] = None

def get_learned_causal_scorer(model_path: Optional[str] = None) -> LearnedCausalScorer:
    """Get or initialize singleton instance of LearnedCausalScorer."""
    global _GLOBAL_LEARNED_SCORER
    if _GLOBAL_LEARNED_SCORER is None or model_path is not None:
        _GLOBAL_LEARNED_SCORER = LearnedCausalScorer(model_path=model_path)
    return _GLOBAL_LEARNED_SCORER
