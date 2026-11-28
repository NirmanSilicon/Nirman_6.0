# -*- coding: utf-8 -*-
"""
ai_model/retrain_all.py

CAELIS AI -- Unified One-Command Retraining Orchestrator with Drift Governance (Pipeline v4.0)

Runs the complete AI training pipeline with automated drift monitoring and governance gates:

  Stage 0: Human Feedback Pre-Merge (Active Learning Flywheel)
           Queries engineer verdicts from SQLite/Postgres and exports human_feedback_pool.csv.

  Stage 1: build_telemetry_ensemble.py
           Trains the baseline 4-learner soft-voting ensemble (RF + GB + ET + LR)
           with per-dataset Z-score normalisation applied BEFORE merging.
           Outputs: ensemble_model.joblib, training_metrics.json

  Stage 2: enhance_ensemble.py
           Applies hyperparameter optimisation (E1), isotonic calibration (E2),
           per-dataset scaling (E4), and SHAP TreeExplainer computation (E6).
           Outputs: enhanced_ensemble_candidate.joblib, enhancement_metrics.json

  Stage 2 Gate: Drift Governance Gate (drift_monitor.py)
           Calculates Population Stability Index (PSI) on the fixed benchmark
           reference dataset (drift_reference_set.csv).
           - PSI < 0.10: Auto-approves and promotes candidate to enhanced_ensemble.joblib
           - PSI >= 0.10: Holds candidate in pending_review/ with a cryptographically
             hash-chained audit log record. Suspends deployment pending human review.

  Stage 3: scenario_factory.py + train_causal_weights.py
           Generates 250 synthetic cascading incidents and trains the causal
           weight calibrator (LR + RF + GB + ET ensemble).
           Outputs: weights.json

  Stage 4: Artefact Sync
           Copies weights.json to backend/ and simulation/ for all consumers.

Usage:
  python ai_model/retrain_all.py
"""

import os
import sys
import time
import json
import shutil
from datetime import datetime, timezone
import importlib.util

THIS_DIR = os.path.dirname(os.path.abspath(__file__))
PROJECT_ROOT = os.path.abspath(os.path.join(THIS_DIR, ".."))
BACKEND_DIR = os.path.join(PROJECT_ROOT, "backend")
SIMULATION_DIR = os.path.join(PROJECT_ROOT, "simulation")

for p in [PROJECT_ROOT, BACKEND_DIR, SIMULATION_DIR]:
    if p not in sys.path:
        sys.path.insert(0, p)

ENSEMBLE_MODEL   = os.path.join(THIS_DIR, "ensemble_model.joblib")
ENHANCED_MODEL   = os.path.join(THIS_DIR, "enhanced_ensemble.joblib")
CANDIDATE_MODEL  = os.path.join(THIS_DIR, "enhanced_ensemble_candidate.joblib")
DRIFT_REF_CSV    = os.path.join(THIS_DIR, "drift_reference_set.csv")
PENDING_DIR      = os.path.join(THIS_DIR, "pending_review")
AUDIT_LOG_FILE   = os.path.join(THIS_DIR, "model_governance_audit.jsonl")

WEIGHTS_SRC      = os.path.join(THIS_DIR, "weights.json")
METRICS_TRAIN    = os.path.join(THIS_DIR, "training_metrics.json")
METRICS_ENH      = os.path.join(THIS_DIR, "enhancement_metrics.json")
SCENARIOS_FILE   = os.path.join(THIS_DIR, "scenarios.jsonl")
WEIGHTS_BACKEND  = os.path.join(BACKEND_DIR, "weights.json")
WEIGHTS_SIMULATION = os.path.join(SIMULATION_DIR, "weights.json")
WEIGHTS_ROOT     = os.path.join(PROJECT_ROOT, "weights.json")
FEEDBACK_EXPORT  = os.path.join(THIS_DIR, "human_feedback_pool.csv")


def print_banner(title, char="=", width=72):
    print()
    print(char * width)
    print(f"  {title}")
    print(char * width)


def print_stage(n, total, label):
    print()
    print(f"[STAGE {n}/{total}] {label}")
    print("-" * 72)


def sync_artefacts():
    if not os.path.exists(WEIGHTS_SRC):
        print("  [WARN] weights.json not found -- skipping sync")
        return
    for dest in [WEIGHTS_BACKEND, WEIGHTS_SIMULATION, WEIGHTS_ROOT]:
        os.makedirs(os.path.dirname(dest), exist_ok=True)
        shutil.copy2(WEIGHTS_SRC, dest)
        print(f"  [Sync] weights.json -> {dest}")


def load_metrics_summary():
    summary = {}
    if os.path.exists(METRICS_TRAIN):
        with open(METRICS_TRAIN) as f:
            m = json.load(f)
            ss = m.get("standard_split_metrics", {})
            summary["baseline"] = {k: ss.get(k) for k in ["accuracy","precision","recall","f1","roc_auc"]}
    if os.path.exists(METRICS_ENH):
        with open(METRICS_ENH) as f:
            me = json.load(f)
            fin = me.get("final", {}).get("metrics", {})
            summary["enhanced"] = {k: fin.get(k) for k in ["accuracy","precision","recall","f1","roc_auc"]}
    if os.path.exists(WEIGHTS_SRC):
        with open(WEIGHTS_SRC) as f:
            w = json.load(f)
            mv = w.get("meta_ensemble_validation", {})
            summary["causal_weights"] = {
                "w_T": w.get("w_temporal"), "w_D": w.get("w_dependency"),
                "w_I": w.get("w_intermediate"),
                "accuracy": mv.get("accuracy"), "f1": mv.get("f1"), "roc_auc": mv.get("roc_auc"),
            }
    return summary


def run_stage_module(script_path, module_name, *args, **kwargs):
    spec = importlib.util.spec_from_file_location(module_name, script_path)
    mod = importlib.util.module_from_spec(spec)
    spec.loader.exec_module(mod)
    if hasattr(mod, "main"):
        return mod.main(*args, **kwargs)
    return None


def main():
    total_start = time.time()
    print_banner("CAELIS AI  -  Full Retrain Pipeline v4.0 (with Drift Governance)")
    print(f"  Project root: {PROJECT_ROOT}")

    # Ensure drift reference set exists
    if not os.path.exists(DRIFT_REF_CSV):
        from ai_model.drift_reference_set import generate_drift_reference_set
        generate_drift_reference_set(output_path=DRIFT_REF_CSV)

    # -----------------------------------------------------------------------
    # Stage 0: Human Feedback Pre-Merge (Active Learning Flywheel)
    # -----------------------------------------------------------------------
    print_stage(0, 5, "Human Feedback Pre-Merge (Active Learning Flywheel)")
    t0 = time.time()
    try:
        from ai_model.active_learning import collect_feedback_dataset, FEATURE_COLS
        import csv

        feedback_records = collect_feedback_dataset()
        if feedback_records:
            print(f"  Found {len(feedback_records)} human-validated feedback records.")
            with open(FEEDBACK_EXPORT, "w", newline="", encoding="utf-8") as csvf:
                writer = csv.writer(csvf)
                writer.writerow(FEATURE_COLS + ["label", "sample_weight", "source"])
                for r in feedback_records:
                    fv = r.get("feature_vector", {})
                    row = [fv.get(c, 0.0) for c in FEATURE_COLS]
                    row += [r["label"], 3.0, "human_feedback"]
                    writer.writerow(row)
            print(f"  [Stage 0] Human feedback pool written: {FEEDBACK_EXPORT}")
        else:
            print("  [Stage 0] No pending feedback records found — Stage 0 is a no-op.")
            if os.path.exists(FEEDBACK_EXPORT):
                os.remove(FEEDBACK_EXPORT)
    except Exception as e:
        print(f"  [Stage 0 WARN] Could not load feedback records: {e}. Continuing without them.")
    print(f"\n  Stage 0 complete in {time.time()-t0:.1f}s")

    # -----------------------------------------------------------------------
    # Stage 1: Baseline Ensemble Training
    # -----------------------------------------------------------------------
    print_stage(1, 5, "Baseline Ensemble (RF+GB+ET+LR with per-dataset Z-normalisation)")
    t0 = time.time()
    run_stage_module(os.path.join(THIS_DIR, "build_telemetry_ensemble.py"), "build_telemetry_ensemble")
    print(f"\n  Stage 1 complete in {time.time()-t0:.1f}s")
    if not os.path.exists(ENSEMBLE_MODEL):
        print("  [ERROR] ensemble_model.joblib not found. Stage 1 failed.")
        sys.exit(1)

    # -----------------------------------------------------------------------
    # Stage 2: Enhancement Pass (outputs candidate model artifact)
    # -----------------------------------------------------------------------
    print_stage(2, 5, "Enhancement Pass (Candidate Model Generation)")
    t0 = time.time()
    # Write candidate to CANDIDATE_MODEL path so production model is not prematurely overwritten
    os.environ["ENHANCED_MODEL_OUT"] = CANDIDATE_MODEL
    run_stage_module(os.path.join(THIS_DIR, "enhance_ensemble.py"), "enhance_ensemble", output_path=CANDIDATE_MODEL)
    if "ENHANCED_MODEL_OUT" in os.environ:
        del os.environ["ENHANCED_MODEL_OUT"]
    print(f"\n  Stage 2 complete in {time.time()-t0:.1f}s")

    if not os.path.exists(CANDIDATE_MODEL):
        print("  [ERROR] Candidate model was not generated. Stage 2 failed.")
        sys.exit(1)

    # -----------------------------------------------------------------------
    # Stage 2 Gate: Population Stability Index (PSI) Drift Check
    # -----------------------------------------------------------------------
    print_stage("2-Gate", 5, "Drift Governance Gate (PSI Check on Fixed Reference Set)")
    from ai_model.drift_monitor import check_drift, append_audit_entry

    # Reference is the currently deployed production model, or baseline if no previous enhanced model exists
    ref_model_path = ENHANCED_MODEL if os.path.exists(ENHANCED_MODEL) else ENSEMBLE_MODEL

    drift_report = check_drift(
        reference_model_path=ref_model_path,
        candidate_model_path=CANDIDATE_MODEL,
        reference_set_path=DRIFT_REF_CSV,
    )

    print(f"  Reference Model : {os.path.basename(ref_model_path)} (SHA: {drift_report.reference_model_hash[:12]}...)")
    print(f"  Candidate Model : {os.path.basename(CANDIDATE_MODEL)} (SHA: {drift_report.candidate_model_hash[:12]}...)")
    print(f"  Calculated PSI  : {drift_report.psi_score:.6f}")
    print(f"  Classification  : {drift_report.classification.upper()}")
    print(f"  Gate Decision   : {drift_report.decision.upper()}")

    if drift_report.decision == "auto_approved":
        # Candidate passed PSI threshold (< 0.10) — promote directly to production
        shutil.move(CANDIDATE_MODEL, ENHANCED_MODEL)
        audit_rec = append_audit_entry(
            event_type="retrain_auto_approved",
            payload={
                "psi_score": drift_report.psi_score,
                "classification": drift_report.classification,
                "reference_model_hash": drift_report.reference_model_hash,
                "candidate_model_hash": drift_report.candidate_model_hash,
                "production_path": ENHANCED_MODEL,
                "timestamp": drift_report.timestamp,
            },
            audit_log_path=AUDIT_LOG_FILE,
        )
        print(f"  [GATE PASSED] Candidate auto-approved and deployed to {ENHANCED_MODEL}")
        print(f"  [Audit Trail] Recorded entry {audit_rec['entry_id']} (Hash: {audit_rec['this_entry_hash'][:12]}...)")
    else:
        # Candidate showed moderate or significant drift — hold for manual engineer review
        os.makedirs(PENDING_DIR, exist_ok=True)
        ts_str = datetime.now(timezone.utc).strftime("%Y%m%d_%H%M%S")
        candidate_id = f"cand_{ts_str}"
        held_joblib = os.path.join(PENDING_DIR, f"enhanced_ensemble_{candidate_id}.joblib")
        held_report = os.path.join(PENDING_DIR, f"drift_report_{candidate_id}.json")

        shutil.move(CANDIDATE_MODEL, held_joblib)
        with open(held_report, "w", encoding="utf-8") as f:
            f.write(drift_report.model_dump_json(indent=2))

        audit_rec = append_audit_entry(
            event_type="retrain_held_for_review",
            payload={
                "candidate_id": candidate_id,
                "psi_score": drift_report.psi_score,
                "classification": drift_report.classification,
                "reference_model_hash": drift_report.reference_model_hash,
                "candidate_model_hash": drift_report.candidate_model_hash,
                "held_model_path": held_joblib,
                "held_report_path": held_report,
                "timestamp": drift_report.timestamp,
            },
            audit_log_path=AUDIT_LOG_FILE,
        )

        print("\n" + "!" * 72)
        print(f"  [GATE HELD FOR REVIEW] Candidate model exhibits {drift_report.classification.upper()} drift!")
        print(f"  PSI Score: {drift_report.psi_score:.6f} >= threshold")
        print(f"  Held Candidate : {held_joblib}")
        print(f"  Drift Report   : {held_report}")
        print(f"  Audit Entry ID : {audit_rec['entry_id']}")
        print(f"  Production model was NOT modified. Use POST /api/feedback/approve-model/ to promote.")
        print("!" * 72)
        print("\nPipeline execution halted for unapproved candidate.")
        return

    # -----------------------------------------------------------------------
    # Stage 3: Causal Weight Calibration
    # -----------------------------------------------------------------------
    print_stage(3, 5, "Causal Engine Weight Calibration (250 Scenarios)")
    t0 = time.time()
    from ai_model.scenario_factory import generate_scenario_dataset
    from ai_model.train_causal_weights import train_and_calibrate

    calibration_json = os.path.join(SIMULATION_DIR, "calibration.json")
    independent_event_json = os.path.join(SIMULATION_DIR, "independent_event.json")
    print("  Generating 250 synthetic cascading incidents...")
    generate_scenario_dataset(
        n_scenarios=250, fault_fraction=0.80, cucd_fraction=0.50,
        calibration_path=calibration_json, cucd_path=independent_event_json,
        output_path=SCENARIOS_FILE,
    )
    print("  Training Multi-Model Ensemble causal weight calibrator...")
    train_and_calibrate(scenarios_path=SCENARIOS_FILE, output_path=WEIGHTS_SRC, test_size=0.20, random_state=42)
    if os.path.exists(SCENARIOS_FILE):
        os.remove(SCENARIOS_FILE)
        print("  [Cleanup] Removed temporary scenarios.jsonl")
    print(f"\n  Stage 3 complete in {time.time()-t0:.1f}s")

    # -----------------------------------------------------------------------
    # Stage 4: Syncing Artefacts
    # -----------------------------------------------------------------------
    print_stage(4, 5, "Syncing Artefacts to backend/ and simulation/")
    sync_artefacts()

    elapsed = time.time() - total_start
    summary = load_metrics_summary()
    print_banner("RETRAIN COMPLETE & GOVERNANCE APPROVED")
    print(f"  Total time: {elapsed/60:.1f} minutes")

    fmt = lambda v: f"{v:.4f}" if v is not None else "N/A"

    for label, key in [("BASELINE ENSEMBLE", "baseline"), ("ENHANCED ENSEMBLE", "enhanced")]:
        if key in summary:
            m = summary[key]
            print(f"\n  [{label}]")
            print(f"    Accuracy={fmt(m['accuracy'])}  Precision={fmt(m['precision'])}"
                  f"  Recall={fmt(m['recall'])}  F1={fmt(m['f1'])}  AUC={fmt(m['roc_auc'])}")

    if "causal_weights" in summary:
        c = summary["causal_weights"]
        print(f"\n  [CAUSAL WEIGHTS]")
        print(f"    w_T={c['w_T']}  w_D={c['w_D']}  w_I={c['w_I']}")
        print(f"    Accuracy={fmt(c['accuracy'])}  F1={fmt(c['f1'])}  AUC={fmt(c['roc_auc'])}")

    print("\n  Artefacts ready:")
    for p in [ENSEMBLE_MODEL, ENHANCED_MODEL, WEIGHTS_SRC, METRICS_TRAIN, METRICS_ENH]:
        if os.path.exists(p):
            print(f"    OK  {os.path.basename(p):<45}  {os.path.getsize(p):>10,} bytes")

    print("\n  Verify with:  python ai_model/infer_telemetry.py --demo")
    print()


if __name__ == "__main__":
    main()
