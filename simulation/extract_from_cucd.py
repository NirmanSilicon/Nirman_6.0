"""
extract_from_cucd.py

Two uses of the CuCD-ID dataset for your synthetic CubeSat log simulation:

1. STRUCTURAL REALISM — CuCD-ID telemetry follows the real CCSDS space-packet
   format. Pull its column/field names so your log generator's output schema
   looks like real spacecraft telemetry (header fields, sequence counters,
   error counters) rather than an invented CSV shape.

2. A REAL INDEPENDENT/UNRELATED EVENT — CuCD-ID's four attack scenarios
   (command flooding, GPS data injection, defence impairment, storage
   exhaustion) are categorically unrelated to your thermal->power hardware
   cascade. Splicing ONE of these labeled scenarios into your incident
   timeline gives you a genuinely real "independent failure" test case
   (see WORKFLOW.md sections 4.3 and 13: "over-linking" check) instead of
   a hand-authored strawman.

Usage:
    python simulation/extract_from_cucd.py \
        --raw "simulation/CubeSat cybersecurity dataset/Data/Raw/consolidated_dataset_raw.csv" \
        --output simulation/independent_event.json \
        --scenario command_flooding \
        --rows 50
"""

import argparse
import json
import os
import pandas as pd

# Mapping of integer labels from CuCD-ID to semantic scenario names
LABEL_MAP = {
    0: "command_flooding",
    1: "data_injection",
    2: "defence_impairment",
    3: "normal",
    4: "storage_exhaustion",
}
REVERSE_LABEL_MAP = {v: k for k, v in LABEL_MAP.items()}

LABEL_COL = "Label"


def inspect(df: pd.DataFrame):
    print("Dataset Shape:", df.shape)
    print("Columns:", list(df.columns))
    if LABEL_COL in df.columns:
        counts = df[LABEL_COL].value_counts().to_dict()
        readable_counts = {LABEL_MAP.get(k, str(k)): v for k, v in counts.items()}
        print("Label distributions:", readable_counts)
    else:
        print(f"WARNING: column '{LABEL_COL}' not found in dataframe.")


def pull_independent_event(df: pd.DataFrame, scenario: str, n_rows: int = 50) -> dict:
    """
    Pull a contiguous slice of one attack scenario to use as a spliced-in
    independent event. Returns a portable JSON block that fault_injector.py
    can insert at an arbitrary offset in the demo timeline.
    """
    if scenario in REVERSE_LABEL_MAP:
        target_val = REVERSE_LABEL_MAP[scenario]
    else:
        try:
            target_val = int(scenario)
        except ValueError:
            raise ValueError(
                f"Unknown scenario '{scenario}'. Valid options: {list(REVERSE_LABEL_MAP.keys())} or {list(LABEL_MAP.keys())}"
            )

    scenario_name = LABEL_MAP.get(target_val, str(target_val))
    subset = df[df[LABEL_COL] == target_val].reset_index(drop=True)
    if subset.empty:
        raise ValueError(f"No rows found for scenario '{scenario}' (label value {target_val}).")

    slice_ = subset.iloc[:n_rows]

    # CCSDS Structural metadata definition
    ccsds_headers = [
        "MsgId", "CmdCode", "TimeRadians", "SequenceCount", "MsgLength",
        "HasSecondaryHeader", "MsgType", "ApId", "HeaderVersion", "SegmentationFlag"
    ]
    telemetry_features = [c for c in slice_.columns if c not in ccsds_headers and c != LABEL_COL]

    return {
        "scenario": scenario_name,
        "label_id": target_val,
        "row_count": len(slice_),
        "ccsds_header_fields": [c for c in ccsds_headers if c in slice_.columns],
        "telemetry_feature_fields": telemetry_features,
        "columns": list(slice_.columns),
        # Raw records formatted for direct replay by fault_injector.py
        "records": slice_.to_dict(orient="records"),
    }


def main():
    parser = argparse.ArgumentParser(description="Extract structural telemetry and independent event slices from CuCD-ID.")
    parser.add_argument("--raw", default="simulation/CubeSat cybersecurity dataset/Data/Raw/consolidated_dataset_raw.csv",
                        help="Path to CuCD-ID raw table CSV")
    parser.add_argument("--output", default="simulation/independent_event.json",
                        help="Output JSON file path")
    parser.add_argument("--scenario", default="command_flooding",
                        help="Which CuCD-ID scenario to extract (command_flooding, data_injection, defence_impairment, storage_exhaustion)")
    parser.add_argument("--rows", type=int, default=50,
                        help="Number of contiguous anomaly rows to extract")
    args = parser.parse_args()

    if not os.path.exists(args.raw):
        raise FileNotFoundError(f"Input file not found: {args.raw}")

    print(f"Loading CuCD-ID dataset from: {args.raw}")
    df = pd.read_csv(args.raw)
    inspect(df)

    event_block = pull_independent_event(df, args.scenario, args.rows)

    os.makedirs(os.path.dirname(os.path.abspath(args.output)), exist_ok=True)
    with open(args.output, "w", encoding="utf-8") as f:
        json.dump(event_block, f, indent=2, default=str)

    print(f"\n[SUCCESS] Wrote {event_block['row_count']} rows of real '{event_block['scenario']}' telemetry to {args.output}")
    print("In fault_injector.py: this payload will be spliced as an independent event on 'Comms Uplink Handler' / 'OBC'")
    print("at an offset timestamp, verifying that the causal engine does NOT force-link it into the thermal->power cascade.")


if __name__ == "__main__":
    main()
