"""
backend/app/core/mission_model/causal_model.py

Causal model specification for the AXYRA mission architecture boundary.
Encapsulates scoring weights (w_T, w_D, w_I), confidence thresholds,
hop limits, and evaluation models away from hardcoded global variables.
"""

import os
import json
from dataclasses import dataclass, field
from typing import Tuple, Dict, Any, Optional


@dataclass
class CausalScoringWeights:
    """Consensus weights for 3-term causal edge confidence scoring."""
    w_temporal: float = 0.0475
    w_dependency: float = 0.6320
    w_intermediate: float = 0.3205

    def as_tuple(self) -> Tuple[float, float, float]:
        return (self.w_temporal, self.w_dependency, self.w_intermediate)

    def to_dict(self) -> Dict[str, float]:
        return {
            "w_temporal": round(self.w_temporal, 6),
            "w_dependency": round(self.w_dependency, 6),
            "w_intermediate": round(self.w_intermediate, 6),
        }


@dataclass
class CausalModelSpec:
    """
    Formal specification of a causal reasoning engine instance.
    Controls graph search depth, confidence evaluation, and empirical weights.
    """
    model_id: str = "causal_consensus_v3"
    name: str = "Empirical Consensus Causal Reasoning Engine"
    scoring_weights: CausalScoringWeights = field(default_factory=CausalScoringWeights)
    confidence_threshold: float = 0.40
    max_hops: int = 3
    description: str = "Heterogeneous ensemble consensus weights trained on 250 flight missions."

    def compute_confidence(
        self,
        s_temporal: float,
        s_dependency: float,
        s_intermediate: float
    ) -> float:
        """Compute the composite causal link confidence."""
        return (
            self.scoring_weights.w_temporal * s_temporal +
            self.scoring_weights.w_dependency * s_dependency +
            self.scoring_weights.w_intermediate * s_intermediate
        )

    def to_dict(self) -> Dict[str, Any]:
        return {
            "model_id": self.model_id,
            "name": self.name,
            "scoring_weights": self.scoring_weights.to_dict(),
            "confidence_threshold": self.confidence_threshold,
            "max_hops": self.max_hops,
            "description": self.description,
        }


# Standard reference causal model specification
STANDARD_CAUSAL_MODEL_SPEC = CausalModelSpec(
    model_id="causal_consensus_v3",
    name="Standard CubeSat Empirical Causal Model",
    scoring_weights=CausalScoringWeights(w_temporal=0.0475, w_dependency=0.6320, w_intermediate=0.3205),
    confidence_threshold=0.40,
    max_hops=3,
    description="Validated on 41,222 rows across 5 space datasets and 250 simulated mission scenarios."
)


def load_causal_spec_from_file(weights_file_path: Optional[str] = None) -> CausalModelSpec:
    """
    Load calibrated causal weights from weights.json or environment fallback.
    Returns a configured CausalModelSpec instance.
    """
    current_dir = os.path.dirname(os.path.abspath(__file__))
    project_root = os.path.abspath(os.path.join(current_dir, "..", "..", ".."))
    
    search_paths = [
        weights_file_path,
        os.environ.get("CAUSAL_WEIGHTS_FILE"),
        "weights.json",
        os.path.join(project_root, "weights.json"),
        os.path.join(project_root, "ai_model", "weights.json"),
        os.path.join(project_root, "simulation", "weights.json"),
        os.path.join(project_root, "backend", "weights.json"),
    ]

    for sp in search_paths:
        if sp and os.path.exists(sp):
            try:
                with open(sp, "r", encoding="utf-8") as f:
                    data = json.load(f)
                w_t = float(data.get("w_temporal", 0.0475))
                w_d = float(data.get("w_dependency", 0.6320))
                w_i = float(data.get("w_intermediate", 0.3205))
                total = w_t + w_d + w_i
                if 0.85 <= total <= 1.15:
                    return CausalModelSpec(
                        scoring_weights=CausalScoringWeights(w_temporal=w_t, w_dependency=w_d, w_intermediate=w_i)
                    )
            except Exception:
                pass

    return STANDARD_CAUSAL_MODEL_SPEC
