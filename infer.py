import os
import sys
import argparse
import numpy as np
import pandas as pd

from nirman.data_loader import clean_wafer_dataframe
from nirman.pipeline import HybridWaferPipeline

def main():
    parser = argparse.ArgumentParser(description="Run inference using the Hybrid Wafer Pipeline and save output to CSV")
    parser.add_argument("--csv", type=str, default="data/wafer_sample.csv", help="Path to wafer telemetry CSV")
    parser.add_argument("--model", type=str, default="models/hybrid_wafer_pipeline.joblib", help="Path to saved model")
    parser.add_argument("--output", type=str, default="data/inference_output.csv", help="Path to save output CSV")
    parser.add_argument("--limit", type=int, default=20, help="Number of ticks to display in console")
    args = parser.parse_args()

    print("=" * 80)
    print("NIRMAN: STREAMING INFERENCE & ALERT ENGINE")
    print("=" * 80)
    print(f"Loading model from: {args.model}")
    pipeline = HybridWaferPipeline.load(args.model)

    print(f"Loading wafer telemetry from: {args.csv}")
    raw_df = pd.read_csv(args.csv)
    wafer_df = clean_wafer_dataframe(raw_df)
    print(f"Loaded {len(wafer_df)} sensor telemetry ticks.\n")

    print(f"{'Time(s)':<8} | {'Stacking Class':<15} | {'Anom Score':<11} | {'Fastest TTT':<13} | {'Drift Sensor':<16} | {'Alert Severity'}")
    print("-" * 90)

    stream_results = pipeline.process_wafer_stream(wafer_df)
    class_map = {0: "Normal", 1: "Chamber_Drift", 2: "Process_Fault"}

    # Display preview rows
    for idx, r in enumerate(stream_results[:args.limit]):
        t_sec = r["timestamp"]
        c_name = class_map.get(r["stacking_prediction"], "Unknown")
        anom_s = r["anomaly_score"]
        ttt = f"{r['min_ttt_seconds']:.1f}s" if r["min_ttt_seconds"] < float("inf") else "inf"
        d_sensor = r["fastest_breach_sensor"] or (r["active_drifting_sensors"][0] if r["active_drifting_sensors"] else "None")
        sev = r["severity"]

        print(f"{t_sec:<8.1f} | {c_name:<15} | {anom_s:<11.3f} | {ttt:<13} | {d_sensor:<16} | {sev}")

    # Build rich output DataFrame
    output_rows = []
    for idx, r in enumerate(stream_results):
        row_dict = wafer_df.iloc[idx].to_dict()
        row_dict["predicted_class_id"] = r["stacking_prediction"]
        row_dict["predicted_state"] = class_map.get(r["stacking_prediction"], "Unknown")
        row_dict["prob_normal"] = round(r["stacking_probabilities"]["Normal"], 4)
        row_dict["prob_chamber_drift"] = round(r["stacking_probabilities"]["Chamber_Drift"], 4)
        row_dict["prob_process_fault"] = round(r["stacking_probabilities"]["Process_Fault"], 4)
        row_dict["anomaly_score"] = round(r["anomaly_score"], 4)
        row_dict["is_isolated_anomaly"] = r["is_isolated_anomaly"]
        row_dict["min_ttt_seconds"] = round(r["min_ttt_seconds"], 2) if r["min_ttt_seconds"] < float("inf") else -1.0
        row_dict["fastest_breach_sensor"] = r["fastest_breach_sensor"] or "None"
        row_dict["fastest_breach_type"] = r["fastest_breach_type"]
        row_dict["active_drifting_sensors"] = ";".join(r["active_drifting_sensors"]) if r["active_drifting_sensors"] else "None"
        row_dict["alert_triggered"] = r["alert_triggered"]
        row_dict["severity"] = r["severity"]
        row_dict["rule_fired"] = r["rule_fired"]
        row_dict["root_cause"] = r["root_cause"]
        row_dict["action_recommendation"] = r["action_recommendation"]
        output_rows.append(row_dict)

    output_df = pd.DataFrame(output_rows)
    os.makedirs(os.path.dirname(args.output), exist_ok=True)
    output_df.to_csv(args.output, index=False)
    print("-" * 90)
    print(f"[+] Complete model inference output saved to CSV: {args.output}")
    print(f"    Saved {len(output_df)} rows and {len(output_df.columns)} columns.")

    alerts = [r for r in stream_results if r["alert_triggered"]]
    print(f"\nInference Summary: Total Ticks: {len(stream_results)} | Total Alerts Triggered: {len(alerts)}")
    if alerts:
        print("\nFirst 3 Alerts:")
        for a in alerts[:3]:
            print(f"  * [t={a['timestamp']:.1f}s] [{a['severity']}] {a['rule_fired']}")
            print(f"    Cause:  {a['root_cause']}")
            print(f"    Action: {a['action_recommendation']}\n")
    else:
        print("All ticks within verified nominal parameters.")
    print("=" * 80)

if __name__ == "__main__":
    main()
