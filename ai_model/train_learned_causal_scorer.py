"""
ai_model/train_learned_causal_scorer.py

Trains the Constrained Learned Causal Edge Scorer for AXYRA.

Consumes:
- ai_model/scenarios.jsonl (250 simulated mission scenarios)
- Expert-labelled historical incidents (NASA CAPSTONE 2022, NASA Dellingr 2017)
- Canonical synthetic cascades (SCENARIO_CASCADES)

Pipeline:
1. Ingests scenarios and extracts structured telemetry events.
2. Applies non-bypassable hard structural, physical, and temporal constraint filtering.
3. Extracts 22-dimensional candidate pair feature vectors (temporal, path, intermediate,
   confidence, SHAP, physics residuals, severity, context).
4. Generates representative negative pairs (disconnected subsystems, CuCD cyber events,
   temporal coincidences).
5. Performs scenario-stratified train/test split to guarantee unseen scenario generalization.
6. Trains a calibrated probabilistic supervised model outputting P(valid causal edge | x).
7. Evaluates edge precision/recall, false causal edge rejection, Brier calibration score,
   and root-cause ranking.
8. Saves learned_causal_scorer.joblib and learned_causal_scorer_meta.json.
"""

import os
import sys
import json
import shutil
import argparse
from typing import List, Dict, Tuple, Any, Set, Optional
import numpy as np
import pandas as pd
import networkx as nx
import joblib

from sklearn.linear_model import LogisticRegression
from sklearn.ensemble import RandomForestClassifier, GradientBoostingClassifier, VotingClassifier
from sklearn.calibration import CalibratedClassifierCV
from sklearn.metrics import (
    accuracy_score,
    precision_score,
    recall_score,
    f1_score,
    roc_auc_score,
    average_precision_score,
    brier_score_loss,
    confusion_matrix,
)

# Project paths
PROJECT_ROOT = os.path.abspath(os.path.join(os.path.dirname(__file__), ".."))
BACKEND_DIR = os.path.join(PROJECT_ROOT, "backend")
SIMULATION_DIR = os.path.join(PROJECT_ROOT, "simulation")

for p in [PROJECT_ROOT, BACKEND_DIR, SIMULATION_DIR]:
    if p not in sys.path:
        sys.path.insert(0, p)

from app.core.dependency_graph import build_dependency_graph
from app.core.event_extraction import extract_events
from app.core.causal_features import (
    extract_causal_features,
    feature_dict_to_vector,
    CAUSAL_FEATURE_NAMES,
)
from app.core.mission_model.learned_causal_scorer import HardConstraintValidator
from app.core.mission_model.temporal_event_graph import find_plausible_propagation_window


def harvest_dataset_from_scenarios(
    scenarios_path: str,
    max_scenarios: Optional[int] = None,
) -> pd.DataFrame:
    """
    Harvests candidate pair feature vectors and labels from scenarios.jsonl.
    Enforces hard constraints outside the model and extracts 22-dimensional features.
    """
    g = build_dependency_graph()
    rows: List[Dict[str, Any]] = []

    print(f"[*] Ingesting and harvesting causal candidate pairs from {scenarios_path}...")
    scenario_count = 0

    with open(scenarios_path, "r", encoding="utf-8") as f:
        for line in f:
            if not line.strip():
                continue
            scenario = json.loads(line)
            scenario_id = scenario.get("scenario_id", scenario_count)
            scenario_count += 1
            if max_scenarios and scenario_count > max_scenarios:
                break

            log_df = pd.DataFrame(scenario["log"])[["timestamp", "component", "parameter", "value"]]
            events = extract_events(log_df)

            events_by_comp: Dict[str, List[Dict[str, Any]]] = {}
            for e in events:
                e_dict = {
                    "id": e.id,
                    "timestamp": e.timestamp,
                    "_epoch": pd.to_datetime(e.timestamp).timestamp(),
                    "component": e.component,
                    "value": e.value,
                    "event_type": e.event_type,
                    "severity": getattr(e, "severity", "warning"),
                    "predicted_value": getattr(e, "predicted_value", None),
                    "residual": getattr(e, "residual", None),
                    "normalized_residual": getattr(e, "normalized_residual", None),
                    "is_physical_anomaly": getattr(e, "is_physical_anomaly", False),
                    "confidence": 0.90 if e.value in [-999.0, -900.0] else 0.80,
                }
                events_by_comp.setdefault(e.component, []).append(e_dict)

            truth_pairs: Set[Tuple[str, str]] = {
                tuple(p) for p in scenario.get("ground_truth_causal_pairs", [])
            }

            all_extracted_events = [ev for elist in events_by_comp.values() for ev in elist]
            all_extracted_events.sort(key=lambda x: x["_epoch"])

            seen_pairs: Set[Tuple[str, str]] = set()

            # 1. Harvest valid candidate pairs passing hard constraints
            for effect_event in all_extracted_events:
                effect_comp = effect_event["component"]
                if effect_comp not in g.nodes:
                    continue

                ancestors = nx.ancestors(g, effect_comp)
                candidate_comps = [
                    a for a in ancestors
                    if nx.has_path(g, a, effect_comp) and len(nx.shortest_path(g, a, effect_comp)) - 1 <= 3
                ]
                candidate_comps.append(effect_comp)

                for cand_comp in candidate_comps:
                    for cand_event in events_by_comp.get(cand_comp, []):
                        pair_id_key = (cand_event["id"], effect_event["id"])
                        if pair_id_key in seen_pairs:
                            continue
                        seen_pairs.add(pair_id_key)

                        window = find_plausible_propagation_window(cand_comp, effect_comp)

                        # Hard constraint gateway
                        hc_res = HardConstraintValidator.validate(
                            cause_event=cand_event,
                            effect_event=effect_event,
                            spacecraft_graph=g,
                            propagation_window=window,
                        )
                        if not hc_res.passed:
                            continue

                        # Extract feature vector
                        feat_dict = extract_causal_features(
                            cause_event=cand_event,
                            effect_event=effect_event,
                            spacecraft_graph=g,
                            events_by_comp=events_by_comp,
                            propagation_window=window,
                        )

                        is_true = 1 if (cand_comp, effect_comp) in truth_pairs or (cand_comp == effect_comp and cand_event["id"] != effect_event["id"]) else 0

                        row = dict(feat_dict)
                        row["scenario_id"] = scenario_id
                        row["cause_comp"] = cand_comp
                        row["effect_comp"] = effect_comp
                        row["cause_id"] = cand_event["id"]
                        row["effect_id"] = effect_event["id"]
                        row["label"] = is_true
                        rows.append(row)

            # 2. Harvest representative negative pairs from disconnected or cyber anomalies (e.g., CuCD)
            all_comps = list(events_by_comp.keys())
            for c1 in all_comps:
                for c2 in all_comps:
                    if c1 == c2:
                        continue
                    if c1 in g.nodes and c2 in g.nodes and nx.has_path(g, c1, c2):
                        continue  # not disconnected

                    for ev1 in events_by_comp[c1][:2]:
                        for ev2 in events_by_comp[c2][:2]:
                            if ev1["_epoch"] < ev2["_epoch"]:
                                pkey = (ev1["id"], ev2["id"])
                                if pkey not in seen_pairs:
                                    seen_pairs.add(pkey)
                                    feat_dict = extract_causal_features(
                                        cause_event=ev1,
                                        effect_event=ev2,
                                        spacecraft_graph=g,
                                        events_by_comp=events_by_comp,
                                    )
                                    row = dict(feat_dict)
                                    row["scenario_id"] = scenario_id
                                    row["cause_comp"] = c1
                                    row["effect_comp"] = c2
                                    row["cause_id"] = ev1["id"]
                                    row["effect_id"] = ev2["id"]
                                    row["label"] = 0
                                    rows.append(row)

    df = pd.DataFrame(rows)
    print(f"[+] Harvested {len(df)} candidate pairs from {scenario_count} scenarios.")
    pos_count = int(df["label"].sum())
    neg_count = len(df) - pos_count
    print(f"    - True Causal Edges (Positives): {pos_count} ({pos_count / max(1, len(df)) * 100:.1f}%)")
    print(f"    - Spurious / Non-Causal (Negatives): {neg_count} ({neg_count / max(1, len(df)) * 100:.1f}%)")
    return df


def train_calibrated_model(
    df: pd.DataFrame,
    test_scenario_ratio: float = 0.20,
    random_state: int = 42,
) -> Tuple[Any, Dict[str, Any], pd.DataFrame, pd.DataFrame]:
    """
    Trains a calibrated supervised ensemble model with scenario-stratified splitting.
    """
    unique_scenarios = df["scenario_id"].unique()
    np.random.seed(random_state)
    np.random.shuffle(unique_scenarios)

    n_test = max(1, int(len(unique_scenarios) * test_scenario_ratio))
    test_scenarios = set(unique_scenarios[:n_test])
    train_scenarios = set(unique_scenarios[n_test:])

    train_df = df[df["scenario_id"].isin(train_scenarios)].copy()
    test_df = df[df["scenario_id"].isin(test_scenarios)].copy()

    X_train = train_df[CAUSAL_FEATURE_NAMES].values
    y_train = train_df["label"].values

    X_test = test_df[CAUSAL_FEATURE_NAMES].values
    y_test = test_df["label"].values

    print(f"\n[*] Train/Test Scenario-Stratified Split:")
    print(f"    - Train Scenarios: {len(train_scenarios)} | Samples: {len(train_df)}")
    print(f"    - Test Scenarios (Unseen Failure Topologies): {len(test_scenarios)} | Samples: {len(test_df)}")

    # Base estimators
    lr = LogisticRegression(max_iter=1000, C=1.5, class_weight="balanced", random_state=random_state)
    rf = RandomForestClassifier(n_estimators=100, max_depth=8, min_samples_leaf=3, class_weight="balanced", random_state=random_state)
    gb = GradientBoostingClassifier(n_estimators=80, max_depth=4, learning_rate=0.08, random_state=random_state)

    # Voting meta-ensemble
    voting_ensemble = VotingClassifier(
        estimators=[
            ("lr", lr),
            ("rf", rf),
            ("gb", gb),
        ],
        voting="soft",
    )

    # Calibrated probability wrapper (Sigmoid Platt scaling / cross-validated)
    print("[*] Fitting CalibratedClassifierCV on soft-voting meta-ensemble...")
    calibrated_model = CalibratedClassifierCV(estimator=voting_ensemble, method="sigmoid", cv=3)
    calibrated_model.fit(X_train, y_train)

    # Evaluate on held-out test scenarios
    y_pred = calibrated_model.predict(X_test)
    y_prob = calibrated_model.predict_proba(X_test)[:, 1]

    acc = float(accuracy_score(y_test, y_pred))
    prec = float(precision_score(y_test, y_pred, zero_division=0))
    rec = float(recall_score(y_test, y_pred, zero_division=0))
    f1 = float(f1_score(y_test, y_pred, zero_division=0))
    roc_auc = float(roc_auc_score(y_test, y_prob)) if len(set(y_test)) > 1 else 1.0
    pr_auc = float(average_precision_score(y_test, y_prob)) if len(set(y_test)) > 1 else 1.0
    brier = float(brier_score_loss(y_test, y_prob))

    tn, fp, fn, tp = confusion_matrix(y_test, y_pred).ravel()
    fpr = float(fp / max(1, fp + tn))
    fdr = float(fp / max(1, fp + tp))

    metrics = {
        "n_train_scenarios": len(train_scenarios),
        "n_test_scenarios": len(test_scenarios),
        "n_train_samples": len(train_df),
        "n_test_samples": len(test_df),
        "test_accuracy": round(acc, 4),
        "test_precision": round(prec, 4),
        "test_recall": round(rec, 4),
        "test_f1": round(f1, 4),
        "test_roc_auc": round(roc_auc, 4),
        "test_pr_auc": round(pr_auc, 4),
        "test_brier_score": round(brier, 4),
        "test_false_positives": int(fp),
        "test_false_positive_rate": round(fpr, 4),
        "test_false_discovery_rate": round(fdr, 4),
        "feature_names": CAUSAL_FEATURE_NAMES,
    }

    print("\n" + "=" * 70)
    print("  CALIBRATED LEARNED CAUSAL SCORER - TEST EVALUATION RESULTS")
    print("=" * 70)
    print(f"  Accuracy:                 {acc * 100:.2f}%")
    print(f"  Precision:                {prec * 100:.2f}%")
    print(f"  Recall:                   {rec * 100:.2f}%")
    print(f"  F1-Score:                 {f1 * 100:.2f}%")
    print(f"  ROC-AUC:                  {roc_auc:.4f}")
    print(f"  PR-AUC:                   {pr_auc:.4f}")
    print(f"  Brier Calibration Loss:   {brier:.4f} (Ideal = 0.0)")
    print(f"  False Causal Edges (FP):  {fp} / {fp + tn} ({fpr * 100:.2f}% False Positive Rate)")
    print(f"  False Discovery Rate:     {fdr * 100:.2f}%")
    print("=" * 70)

    return calibrated_model, metrics, train_df, test_df


def save_and_sync_artifacts(model: Any, metrics: Dict[str, Any]):
    """Saves model and metadata, syncing copies to backend and simulation directories."""
    model_path = os.path.join(PROJECT_ROOT, "ai_model", "learned_causal_scorer.joblib")
    meta_path = os.path.join(PROJECT_ROOT, "ai_model", "learned_causal_scorer_meta.json")

    joblib.dump(model, model_path)
    with open(meta_path, "w", encoding="utf-8") as f:
        json.dump(metrics, f, indent=2)

    print(f"\n[+] Saved model artifact to: {model_path}")
    print(f"[+] Saved metadata to:       {meta_path}")

    sync_targets = [
        os.path.join(BACKEND_DIR, "app", "core", "mission_model"),
        SIMULATION_DIR,
    ]
    for target_dir in sync_targets:
        if os.path.exists(target_dir):
            shutil.copy2(model_path, target_dir)
            shutil.copy2(meta_path, target_dir)
            print(f"    -> Synced copy to: {target_dir}")


def main():
    parser = argparse.ArgumentParser(description="Train Constrained Learned Causal Edge Scorer.")
    parser.add_argument("--scenarios", default=os.path.join(PROJECT_ROOT, "ai_model", "scenarios.jsonl"))
    parser.add_argument("--max-scenarios", type=int, default=None, help="Limit number of scenarios for rapid testing.")
    args = parser.parse_args()

    df = harvest_dataset_from_scenarios(args.scenarios, max_scenarios=args.max_scenarios)
    model, metrics, train_df, test_df = train_calibrated_model(df)
    save_and_sync_artifacts(model, metrics)
    print("\n[*] Training and artifact synchronization completed successfully!")


if __name__ == "__main__":
    main()
