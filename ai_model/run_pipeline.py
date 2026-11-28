"""
ai_model/run_pipeline.py

One-command pipeline runner for:
1. Generating N=250 varied synthetic scenarios using ESA OPS-SAT & CuCD-ID calibrations (Stage 1).
2. Extracting events, generating candidate pairs, and harvesting feature rows (Stage 2 & Stage 3 candidate logic).
3. Training Multi-Model Ensemble Learning system (Logistic Regression, Random Forest, Gradient Boosting, Extra Trees, and Soft Voting Ensemble).
4. Validating all models and ensemble consensus weights on 20% held-out test scenarios with multi-metric evaluations.
5. Exporting weights.json and serialized ensemble_model.joblib for backend causal engine and runtime verification.
"""

import os
import sys
import time

PROJECT_ROOT = os.path.abspath(os.path.join(os.path.dirname(__file__), ".."))
BACKEND_DIR = os.path.join(PROJECT_ROOT, "backend")
SIMULATION_DIR = os.path.join(PROJECT_ROOT, "simulation")

for p in [PROJECT_ROOT, BACKEND_DIR, SIMULATION_DIR]:
    if p not in sys.path:
        sys.path.insert(0, p)

from ai_model.scenario_factory import generate_scenario_dataset
from ai_model.train_causal_weights import train_and_calibrate


def main():
    print("\n" + "#"*75)
    print("#  AXYRA AI MULTI-MODEL ENSEMBLE CALIBRATION PIPELINE (WORKFLOW v4)        #")
    print("#"*75 + "\n")

    start_time = time.time()

    ai_dir = os.path.dirname(os.path.abspath(__file__))
    scenarios_file = os.path.join(ai_dir, "scenarios.jsonl")
    weights_file = os.path.join(ai_dir, "weights.json")

    calibration_json = os.path.join(SIMULATION_DIR, "calibration.json")
    independent_event_json = os.path.join(SIMULATION_DIR, "independent_event.json")

    print("[STEP 1/2] Running Scenario Factory (Generating 250 Varied Mission Incidents)...")
    generate_scenario_dataset(
        n_scenarios=250,
        fault_fraction=0.80,
        cucd_fraction=0.50,
        calibration_path=calibration_json,
        cucd_path=independent_event_json,
        output_path=scenarios_file
    )

    print("\n[STEP 2/2] Training Multi-Model Ensemble & Calibrating Causal Weights...")
    train_and_calibrate(
        scenarios_path=scenarios_file,
        output_path=weights_file,
        test_size=0.20,
        random_state=42
    )

    elapsed = time.time() - start_time
    print(f"\n[SUCCESS] Ensemble pipeline finished successfully in {elapsed:.2f} seconds.")


if __name__ == "__main__":
    main()

