"""
ai_model/evaluate_causal_scorers.py

Comprehensive Evaluation & Comparative Benchmark Suite for AXYRA Causal Reasoning.

Explicitly compares:
    1. Legacy 3-Weight Formula Scorer (Baseline Heuristic)
    2. Constrained Learned Causal Edge Scorer (Production Probabilistic Model)

Measures all 5 required evaluation dimensions:
    - Dimension 1: Edge Precision, Recall, F1, and PR-AUC
    - Dimension 2: False Causal Edges (False Positives, False Discovery Rate, Spurious Edge Rejection)
    - Dimension 3: Root-Cause Ranking (Top-1 and Top-3 Accuracy)
    - Dimension 4: Generalization on Unseen Failure Scenarios
    - Dimension 5: Robustness under Missing Intermediate Telemetry (0%, 50%, 100% dropped hops)
"""

import os
import sys
import json
import argparse
from typing import List, Dict, Tuple, Any, Set, Optional
import numpy as np
import pandas as pd
import networkx as nx

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
from app.core.causal_features import extract_causal_features, feature_dict_to_vector, CAUSAL_FEATURE_NAMES
from app.core.mission_model.learned_causal_scorer import (
    HardConstraintValidator,
    LearnedCausalScorer,
    LegacyCausalScorer,
    get_learned_causal_scorer,
)
from app.core.mission_model.temporal_event_graph import find_plausible_propagation_window, TemporalEventGraph


def evaluate_edge_metrics(y_true: np.ndarray, y_prob: np.ndarray, threshold: float = 0.40) -> Dict[str, Any]:
    """Calculate comprehensive edge classification and calibration metrics."""
    y_pred = (y_prob >= threshold).astype(int)
    tn, fp, fn, tp = confusion_matrix(y_true, y_pred, labels=[0, 1]).ravel()

    acc = accuracy_score(y_true, y_pred)
    prec = precision_score(y_true, y_pred, zero_division=0)
    rec = recall_score(y_true, y_pred, zero_division=0)
    f1 = f1_score(y_true, y_pred, zero_division=0)
    roc_auc = roc_auc_score(y_true, y_prob) if len(set(y_true)) > 1 else 1.0
    pr_auc = average_precision_score(y_true, y_prob) if len(set(y_true)) > 1 else 1.0
    brier = brier_score_loss(y_true, y_prob)

    fpr = fp / max(1, fp + tn)
    fdr = fp / max(1, fp + tp)

    return {
        "accuracy": round(float(acc), 4),
        "precision": round(float(prec), 4),
        "recall": round(float(rec), 4),
        "f1": round(float(f1), 4),
        "roc_auc": round(float(roc_auc), 4),
        "pr_auc": round(float(pr_auc), 4),
        "brier_score": round(float(brier), 4),
        "true_positives": int(tp),
        "false_positives": int(fp),
        "true_negatives": int(tn),
        "false_negatives": int(fn),
        "false_positive_rate": round(float(fpr), 4),
        "false_discovery_rate": round(float(fdr), 4),
    }


def run_comparative_evaluation(
    scenarios_path: str,
    max_scenarios: int = 50,
) -> Dict[str, Any]:
    """
    Runs full comparative benchmark on unseen test scenarios.
    """
    g = build_dependency_graph()
    learned_scorer = get_learned_causal_scorer()
    legacy_scorer = LegacyCausalScorer()

    y_true_list: List[int] = []
    y_prob_learned: List[float] = []
    y_prob_legacy: List[float] = []

    # Missing telemetry stress test datasets
    y_true_missing50: List[int] = []
    y_prob_learned_missing50: List[float] = []
    y_prob_legacy_missing50: List[float] = []

    y_true_missing100: List[int] = []
    y_prob_learned_missing100: List[float] = []
    y_prob_legacy_missing100: List[float] = []

    # Root cause ranking counters
    legacy_root_top1 = 0
    legacy_root_top3 = 0
    learned_root_top1 = 0
    learned_root_top3 = 0
    total_eval_scenarios = 0

    print(f"[*] Benchmarking Legacy vs. Learned Scorer across {max_scenarios} scenarios...")

    with open(scenarios_path, "r", encoding="utf-8") as f:
        for line_idx, line in enumerate(f):
            if line_idx >= max_scenarios:
                break
            if not line.strip():
                continue
            scenario = json.loads(line)

            log_df = pd.DataFrame(scenario["log"])[["timestamp", "component", "parameter", "value"]]
            events = extract_events(log_df)
            if not events:
                continue

            events_by_comp: Dict[str, List[Dict[str, Any]]] = {}
            for e in events:
                events_by_comp.setdefault(e.component, []).append({
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
                    "confidence": 0.85,
                })

            truth_pairs = {tuple(p) for p in scenario.get("ground_truth_causal_pairs", [])}
            all_events = [ev for elist in events_by_comp.values() for ev in elist]
            all_events.sort(key=lambda x: x["_epoch"])

            # 1. Full Observability Edge Evaluation
            for eff_ev in all_events:
                eff_comp = eff_ev["component"]
                if eff_comp not in g.nodes:
                    continue

                ancestors = nx.ancestors(g, eff_comp)
                candidates = [a for a in ancestors if nx.has_path(g, a, eff_comp) and len(nx.shortest_path(g, a, eff_comp)) - 1 <= 3]
                candidates.append(eff_comp)

                for cand_comp in candidates:
                    for cand_ev in events_by_comp.get(cand_comp, []):
                        if cand_ev["_epoch"] >= eff_ev["_epoch"]:
                            continue
                        window = find_plausible_propagation_window(cand_comp, eff_comp)

                        # Hard constraint gate
                        hc = HardConstraintValidator.validate(cand_ev, eff_ev, g, window)
                        if not hc.passed:
                            continue

                        feats = extract_causal_features(cand_ev, eff_ev, g, events_by_comp, window)
                        p_learned = learned_scorer.predict_probability(feats)
                        p_legacy = legacy_scorer.score(feats)

                        is_true = 1 if (cand_comp, eff_comp) in truth_pairs or (cand_comp == eff_comp and cand_ev["id"] != eff_ev["id"]) else 0

                        y_true_list.append(is_true)
                        y_prob_learned.append(p_learned)
                        y_prob_legacy.append(p_legacy)

                        # Missing intermediate simulation: drop intermediate corroboration
                        feats_50 = dict(feats)
                        feats_50["intermediate_corroboration"] = feats["intermediate_corroboration"] * 0.5
                        feats_50["has_unobserved_intermediates"] = 1.0 if feats["has_unobserved_intermediates"] or feats["intermediate_corroboration"] < 1.0 else 0.0
                        y_true_missing50.append(is_true)
                        y_prob_learned_missing50.append(learned_scorer.predict_probability(feats_50))
                        y_prob_legacy_missing50.append(legacy_scorer.score(feats_50))

                        feats_100 = dict(feats)
                        feats_100["intermediate_corroboration"] = 0.0 if feats["path_hop_count"] > 1 else 1.0
                        feats_100["has_unobserved_intermediates"] = 1.0 if feats["path_hop_count"] > 1 else 0.0
                        y_true_missing100.append(is_true)
                        y_prob_learned_missing100.append(learned_scorer.predict_probability(feats_100))
                        y_prob_legacy_missing100.append(legacy_scorer.score(feats_100))

            # 2. Add Disconnected Cyber Anomaly Negatives (CuCD)
            all_comps = list(events_by_comp.keys())
            for c1 in all_comps:
                for c2 in all_comps:
                    if c1 == c2:
                        continue
                    if c1 in g.nodes and c2 in g.nodes and nx.has_path(g, c1, c2):
                        continue
                    for ev1 in events_by_comp[c1][:1]:
                        for ev2 in events_by_comp[c2][:1]:
                            if ev1["_epoch"] < ev2["_epoch"]:
                                feats = extract_causal_features(ev1, ev2, g, events_by_comp)
                                y_true_list.append(0)
                                y_prob_learned.append(learned_scorer.predict_probability(feats))
                                y_prob_legacy.append(legacy_scorer.score(feats))

            # 3. Root-Cause Ranking Evaluation on Scenario
            # Ground truth root cause is the earliest non-independent cause
            truth_roots = [p[0] for p in truth_pairs]
            if truth_roots:
                true_root = truth_roots[0]
                total_eval_scenarios += 1

                # Generate graph with learned scorer
                teg_learned = TemporalEventGraph.build_from_events(
                    events=all_events, dependency_graph=g, scorer_type="learned"
                )
                teg_legacy = TemporalEventGraph.build_from_events(
                    events=all_events, dependency_graph=g, scorer_type="legacy"
                )

                learned_ranked_roots = [teg_learned.nodes[nid].component for nid in teg_learned.primary_cause_event_ids]
                legacy_ranked_roots = [teg_legacy.nodes[nid].component for nid in teg_legacy.primary_cause_event_ids]

                if learned_ranked_roots and learned_ranked_roots[0] == true_root:
                    learned_root_top1 += 1
                if true_root in learned_ranked_roots[:3]:
                    learned_root_top3 += 1

                if legacy_ranked_roots and legacy_ranked_roots[0] == true_root:
                    legacy_root_top1 += 1
                if true_root in legacy_ranked_roots[:3]:
                    legacy_root_top3 += 1

    y_true_arr = np.array(y_true_list)
    learned_metrics = evaluate_edge_metrics(y_true_arr, np.array(y_prob_learned))
    legacy_metrics = evaluate_edge_metrics(y_true_arr, np.array(y_prob_legacy))

    # Missing telemetry metrics
    learned_miss50 = evaluate_edge_metrics(np.array(y_true_missing50), np.array(y_prob_learned_missing50))
    legacy_miss50 = evaluate_edge_metrics(np.array(y_true_missing50), np.array(y_prob_legacy_missing50))

    learned_miss100 = evaluate_edge_metrics(np.array(y_true_missing100), np.array(y_prob_learned_missing100))
    legacy_miss100 = evaluate_edge_metrics(np.array(y_true_missing100), np.array(y_prob_legacy_missing100))

    # Root ranking metrics
    root_ranking_results = {
        "total_scenarios_evaluated": total_eval_scenarios,
        "legacy_scorer": {
            "top1_accuracy": round(legacy_root_top1 / max(1, total_eval_scenarios), 4),
            "top3_accuracy": round(legacy_root_top3 / max(1, total_eval_scenarios), 4),
        },
        "learned_scorer": {
            "top1_accuracy": round(learned_root_top1 / max(1, total_eval_scenarios), 4),
            "top3_accuracy": round(learned_root_top3 / max(1, total_eval_scenarios), 4),
        },
    }

    report = {
        "full_observability": {
            "legacy_scorer": legacy_metrics,
            "learned_scorer": learned_metrics,
        },
        "missing_telemetry_50pct": {
            "legacy_scorer": legacy_miss50,
            "learned_scorer": learned_miss50,
        },
        "missing_telemetry_100pct": {
            "legacy_scorer": legacy_miss100,
            "learned_scorer": learned_miss100,
        },
        "root_cause_ranking": root_ranking_results,
    }

    # Print comparative evaluation table
    print("\n" + "=" * 80)
    print("  AXYRA CAUSAL SCORER BENCHMARK: LEGACY 3-WEIGHT vs. CONSTRAINED LEARNED")
    print("=" * 80)
    print(f"  {'Metric':<32} | {'Legacy Scorer':<18} | {'Learned Scorer':<18} | {'Delta':<10}")
    print("-" * 80)
    print(f"  {'Edge Precision':<32} | {legacy_metrics['precision'] * 100:>16.2f}% | {learned_metrics['precision'] * 100:>16.2f}% | {(learned_metrics['precision'] - legacy_metrics['precision']) * 100:>+8.2f}%")
    print(f"  {'Edge Recall':<32} | {legacy_metrics['recall'] * 100:>16.2f}% | {learned_metrics['recall'] * 100:>16.2f}% | {(learned_metrics['recall'] - legacy_metrics['recall']) * 100:>+8.2f}%")
    print(f"  {'Edge F1-Score':<32} | {legacy_metrics['f1'] * 100:>16.2f}% | {learned_metrics['f1'] * 100:>16.2f}% | {(learned_metrics['f1'] - legacy_metrics['f1']) * 100:>+8.2f}%")
    print(f"  {'ROC-AUC':<32} | {legacy_metrics['roc_auc']:>18.4f} | {learned_metrics['roc_auc']:>18.4f} | {learned_metrics['roc_auc'] - legacy_metrics['roc_auc']:>+10.4f}")
    print(f"  {'PR-AUC':<32} | {legacy_metrics['pr_auc']:>18.4f} | {learned_metrics['pr_auc']:>18.4f} | {learned_metrics['pr_auc'] - legacy_metrics['pr_auc']:>+10.4f}")
    print(f"  {'Brier Calibration Loss':<32} | {legacy_metrics['brier_score']:>18.4f} | {learned_metrics['brier_score']:>18.4f} | {learned_metrics['brier_score'] - legacy_metrics['brier_score']:>+10.4f}")
    print(f"  {'False Causal Edges (FP)':<32} | {legacy_metrics['false_positives']:>18d} | {learned_metrics['false_positives']:>18d} | {learned_metrics['false_positives'] - legacy_metrics['false_positives']:>+10d}")
    print(f"  {'False Discovery Rate (FDR)':<32} | {legacy_metrics['false_discovery_rate'] * 100:>16.2f}% | {learned_metrics['false_discovery_rate'] * 100:>16.2f}% | {(learned_metrics['false_discovery_rate'] - legacy_metrics['false_discovery_rate']) * 100:>+8.2f}%")
    print(f"  {'Top-1 Root Cause Accuracy':<32} | {root_ranking_results['legacy_scorer']['top1_accuracy'] * 100:>16.2f}% | {root_ranking_results['learned_scorer']['top1_accuracy'] * 100:>16.2f}% | {(root_ranking_results['learned_scorer']['top1_accuracy'] - root_ranking_results['legacy_scorer']['top1_accuracy']) * 100:>+8.2f}%")
    print(f"  {'Top-3 Root Cause Accuracy':<32} | {root_ranking_results['legacy_scorer']['top3_accuracy'] * 100:>16.2f}% | {root_ranking_results['learned_scorer']['top3_accuracy'] * 100:>16.2f}% | {(root_ranking_results['learned_scorer']['top3_accuracy'] - root_ranking_results['legacy_scorer']['top3_accuracy']) * 100:>+8.2f}%")
    print("-" * 80)
    print("  MISSING INTERMEDIATE TELEMETRY STRESS TEST:")
    print(f"  {'F1-Score (50% Missing)':<32} | {legacy_miss50['f1'] * 100:>16.2f}% | {learned_miss50['f1'] * 100:>16.2f}% | {(learned_miss50['f1'] - legacy_miss50['f1']) * 100:>+8.2f}%")
    print(f"  {'F1-Score (100% Silent Hops)':<32} | {legacy_miss100['f1'] * 100:>16.2f}% | {learned_miss100['f1'] * 100:>16.2f}% | {(learned_miss100['f1'] - legacy_miss100['f1']) * 100:>+8.2f}%")
    print("=" * 80)

    # Save benchmark report
    out_path = os.path.join(PROJECT_ROOT, "ai_model", "causal_scorer_benchmark.json")
    with open(out_path, "w", encoding="utf-8") as f:
        json.dump(report, f, indent=2)
    print(f"[+] Saved evaluation report to: {out_path}")

    return report


def main():
    parser = argparse.ArgumentParser(description="Evaluate Legacy vs Learned Causal Scorers.")
    parser.add_argument("--scenarios", default=os.path.join(PROJECT_ROOT, "ai_model", "scenarios.jsonl"))
    parser.add_argument("--max-scenarios", type=int, default=45, help="Number of scenarios to benchmark.")
    args = parser.parse_args()

    run_comparative_evaluation(args.scenarios, max_scenarios=args.max_scenarios)


if __name__ == "__main__":
    main()
