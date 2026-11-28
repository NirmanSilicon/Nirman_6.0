import pandas as pd
from nirman.pipeline import HybridWaferPipeline
from nirman.data_loader import generate_multi_wafer_dataset

def test_scenarios():
    print("=" * 70)
    print("TESTING 3 SCENARIOS: NORMAL, CHAMBER DRIFT, PROCESS FAULT")
    print("=" * 70)
    
    # 1. Load pipeline
    pipeline = HybridWaferPipeline.load("models/hybrid_wafer_pipeline.joblib")
    
    # 2. Generate 1 test wafer for each scenario
    test_data = generate_multi_wafer_dataset(
        base_sample_path="data/wafer_sample.csv",
        n_normal_wafers=1,
        n_drift_wafers=1,
        n_fault_wafers=1,
        random_state=999
    )
    
    class_names = {0: "Normal", 1: "Chamber_Drift", 2: "Process_Fault"}
    
    for label_val, group in test_data.groupby("label"):
        scenario_name = class_names[label_val]
        wafer_id = group["wafer_id"].iloc[0]
        
        print(f"\n>>> Running Scenario: {scenario_name} (Wafer: {wafer_id})")
        stream_results = pipeline.process_wafer_stream(group)
        
        alerts = [r for r in stream_results if r["alert_triggered"]]
        normal_ticks = [r for r in stream_results if not r["alert_triggered"]]
        
        # Summary statistics
        mean_anom = sum(r["anomaly_score"] for r in stream_results) / len(stream_results)
        pred_counts = pd.Series([class_names[r["stacking_prediction"]] for r in stream_results]).value_counts().to_dict()
        
        print(f"  * Total Telemetry Ticks: {len(stream_results)}")
        print(f"  * Predictions Breakdown: {pred_counts}")
        print(f"  * Mean Anomaly Score:    {mean_anom:.3f}")
        print(f"  * Alerts Triggered:      {len(alerts)} / {len(stream_results)}")
        
        if alerts:
            first_alert = alerts[0]
            print(f"  * First Triggered Alert at t={first_alert['timestamp']:.1f}s:")
            print(f"      Severity:  {first_alert['severity']}")
            print(f"      Rule:      {first_alert['rule_fired']}")
            print(f"      Root Cause:{first_alert['root_cause']}")
            print(f"      Action:    {first_alert['action_recommendation']}")
        else:
            print("  * Status: All samples within nominal control limits (No False Positives).")
            
    print("\n" + "=" * 70)
    print("ALL SCENARIO TESTS COMPLETED SUCCESSFULLY!")
    print("=" * 70)

if __name__ == "__main__":
    test_scenarios()
