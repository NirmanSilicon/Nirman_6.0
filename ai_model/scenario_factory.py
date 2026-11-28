"""
ai_model/scenario_factory.py

Generates N varied synthetic CubeSat incidents, each with ground truth labels,
for training the causal engine's weight-calibration step (WORKFLOW.md section 7).

Variations introduced across scenarios:
1. Random seeds for baseline telemetry noise (calibrated from ESA OPS-SAT OPSSAT-AD).
2. Random cascade start offsets (150s, 200s, 250s, 300s, 350s, 400s).
3. Pure nominal baseline scenarios (20% default) for true-negative verification.
4. Spliced real cyber/uplink telemetry anomalies from CuCD-ID for independent event isolation testing.
"""

import os
import sys
import json
import argparse
import random
from typing import List, Dict, Tuple
import pandas as pd

# Path setup for clean workspace imports
PROJECT_ROOT = os.path.abspath(os.path.join(os.path.dirname(__file__), ".."))
BACKEND_DIR = os.path.join(PROJECT_ROOT, "backend")
SIMULATION_DIR = os.path.join(PROJECT_ROOT, "simulation")

for p in [PROJECT_ROOT, BACKEND_DIR, SIMULATION_DIR]:
    if p not in sys.path:
        sys.path.insert(0, p)

from app.simulate.log_generator import generate_baseline, load_calibration, DEFAULTS
from app.simulate.fault_injector import inject_cascade, splice_independent_event, CANONICAL_CASCADE
from app.core.dependency_graph import build_dependency_graph
import networkx as nx


# The ordered sequence of subsystem components affected in the canonical cascade
CASCADE_SEQUENCE = [
    "thermal_sensor",
    "heater_controller",
    "battery",
    "battery_protection",
    "power_bus",
    "obc",
    "comms",
    "payload"
]


def generate_scenario(
    scenario_id: int,
    calibration: dict,
    include_cascade: bool = True,
    include_cucd: bool = True,
    cucd_path: str = None,
    g: nx.DiGraph = None
) -> dict:
    """
    Generate a single synthetic mission log with deterministic ground-truth tracking.
    """
    if g is None:
        g = build_dependency_graph()

    seed = random.randint(1000, 9_999_999)
    baseline_df = generate_baseline(
        list(DEFAULTS.keys()), duration_seconds=600, calibration=calibration, seed=seed
    )

    ground_truth_pairs = set()

    if include_cascade:
        cascade_offset = random.choice([150, 200, 250, 300, 350, 400])
        combined_df = inject_cascade(baseline_df, cascade_start_offset_s=cascade_offset)

        # Ground truth: every (ancestor, descendant) pair in the cascade that has a valid
        # dependency graph path represents a TRUE causal relationship.
        for i in range(len(CASCADE_SEQUENCE)):
            for j in range(i + 1, len(CASCADE_SEQUENCE)):
                cause = CASCADE_SEQUENCE[i]
                effect = CASCADE_SEQUENCE[j]
                if nx.has_path(g, cause, effect):
                    ground_truth_pairs.add((cause, effect))
    else:
        # Pure nominal baseline scenario with 0 faults
        combined_df = baseline_df

    # Splicing independent CuCD-ID space-packet anomaly if requested
    if include_cucd and cucd_path and os.path.exists(cucd_path):
        cucd_offset = random.choice([100, 180, 280, 450, 500])
        combined_df = splice_independent_event(
            combined_df, cucd_path, offset_from_start_s=cucd_offset
        )

    # Strip debugging note for raw telemetry stream format
    clean_records = combined_df[["timestamp", "component", "parameter", "value"]].to_dict(orient="records")

    return {
        "scenario_id": scenario_id,
        "seed": seed,
        "has_cascade": include_cascade,
        "has_cucd_independent": include_cucd,
        "ground_truth_causal_pairs": list(ground_truth_pairs),
        "log": clean_records,
    }


def generate_scenario_dataset(
    n_scenarios: int = 200,
    fault_fraction: float = 0.8,
    cucd_fraction: float = 0.5,
    calibration_path: str = None,
    cucd_path: str = None,
    output_path: str = None
) -> str:
    """
    Generate N synthetic incidents to a JSONL dataset file.
    """
    if calibration_path is None:
        calibration_path = os.path.join(SIMULATION_DIR, "calibration.json")
    if cucd_path is None:
        cucd_path = os.path.join(SIMULATION_DIR, "independent_event.json")
    if output_path is None:
        output_path = os.path.join(os.path.dirname(__file__), "scenarios.jsonl")

    os.makedirs(os.path.dirname(os.path.abspath(output_path)), exist_ok=True)

    calibration = load_calibration(calibration_path) if os.path.exists(calibration_path) else None
    g = build_dependency_graph()

    n_with_fault = 0
    n_with_cucd = 0

    with open(output_path, "w", encoding="utf-8") as f:
        for i in range(n_scenarios):
            include_cascade = random.random() < fault_fraction
            include_cucd = random.random() < cucd_fraction
            if include_cascade:
                n_with_fault += 1
            if include_cucd:
                n_with_cucd += 1

            scenario = generate_scenario(
                scenario_id=i,
                calibration=calibration,
                include_cascade=include_cascade,
                include_cucd=include_cucd,
                cucd_path=cucd_path,
                g=g
            )
            f.write(json.dumps(scenario) + "\n")

    print(f"[OK] Generated {n_scenarios} scenarios to: {output_path}")
    print(f"     - Cascading Failure Scenarios: {n_with_fault} ({n_with_fault/n_scenarios:.1%})")
    print(f"     - Pure Nominal Scenarios: {n_scenarios - n_with_fault} ({(n_scenarios - n_with_fault)/n_scenarios:.1%})")
    print(f"     - CuCD Independent Spliced: {n_with_cucd} ({n_with_cucd/n_scenarios:.1%})")

    return output_path


def main():
    parser = argparse.ArgumentParser(description="Scenario Factory for Causal Weight Calibration")
    parser.add_argument("--n-scenarios", type=int, default=200, help="Number of scenarios to generate")
    parser.add_argument("--fault-fraction", type=float, default=0.8, help="Fraction with fault cascades")
    parser.add_argument("--cucd-fraction", type=float, default=0.5, help="Fraction with CuCD cyber anomalies")
    parser.add_argument("--calibration", default=None, help="Path to calibration.json")
    parser.add_argument("--cucd", default=None, help="Path to independent_event.json")
    parser.add_argument("--output", default=None, help="Path to output scenarios.jsonl")
    args = parser.parse_args()

    generate_scenario_dataset(
        n_scenarios=args.n_scenarios,
        fault_fraction=args.fault_fraction,
        cucd_fraction=args.cucd_fraction,
        calibration_path=args.calibration,
        cucd_path=args.cucd,
        output_path=args.output,
    )


if __name__ == "__main__":
    main()
