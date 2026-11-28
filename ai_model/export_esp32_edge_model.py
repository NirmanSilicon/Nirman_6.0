"""Export the reproducible compact CAELIS edge model for ESP32 firmware.

The exporter uses the existing harmonized real/simulated telemetry corpus and
creates a shallow, fixed decision tree.  It deliberately does not export the
full scikit-learn ensemble or causal model: those stay in CAELIS backend.
"""

from pathlib import Path
import json
import argparse

import pandas as pd
from sklearn.metrics import accuracy_score, f1_score, roc_auc_score
from sklearn.model_selection import train_test_split
from sklearn.tree import DecisionTreeClassifier


FEATURES = ["feat_mean", "feat_std", "feat_min", "feat_max", "feat_range", "feat_rate_of_change", "feat_skewness"]
ROOT = Path(__file__).resolve().parent.parent
DATASET = ROOT / "ai_model" / "feature_harmonization_log.csv"


def train_edge_model():
    data = pd.read_csv(DATASET)
    x_train, x_test, y_train, y_test = train_test_split(
        data[FEATURES], data["label"].astype(int), test_size=0.2, random_state=42, stratify=data["label"]
    )
    model = DecisionTreeClassifier(max_depth=5, min_samples_leaf=80, class_weight="balanced", random_state=42)
    model.fit(x_train, y_train)
    probability = model.predict_proba(x_test)[:, 1]
    predicted = (probability >= 0.5).astype(int)
    return model, {
        "samples": int(len(data)), "train_samples": int(len(x_train)), "test_samples": int(len(x_test)),
        "accuracy": round(float(accuracy_score(y_test, predicted)), 4),
        "f1": round(float(f1_score(y_test, predicted)), 4),
        "roc_auc": round(float(roc_auc_score(y_test, probability)), 4),
        "max_depth": 5, "min_samples_leaf": 80, "node_count": int(model.tree_.node_count),
    }


def model_arrays(model):
    """Return C++-ready arrays for refreshing ``caelis_edge_model.h``."""
    tree = model.tree_
    probabilities = []
    for node_values in tree.value:
        total = float(node_values[0].sum())
        probabilities.append(float(node_values[0][1] / total) if total else 0.0)
    return {
        "left": tree.children_left.tolist(), "right": tree.children_right.tolist(),
        "feature": tree.feature.tolist(), "threshold": tree.threshold.tolist(),
        "probability": probabilities,
    }


if __name__ == "__main__":
    parser = argparse.ArgumentParser(description="Train/export the compact CAELIS ESP32 edge model.")
    parser.add_argument("--emit-arrays", action="store_true", help="Print C++-ready tree arrays as JSON.")
    args = parser.parse_args()
    model, metrics = train_edge_model()
    print(json.dumps({"metrics": metrics, "arrays": model_arrays(model) if args.emit_arrays else None}, indent=2))
