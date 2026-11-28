import os
import json
import numpy as np
import pandas as pd
from sklearn.model_selection import train_test_split
from sklearn.metrics import accuracy_score, f1_score

from nirman.data_loader import (
    load_complete_process_data,
    generate_multi_wafer_dataset,
    SENSOR_COLUMNS
)
from nirman.pipeline import HybridWaferPipeline

def main():
    print("=" * 75)
    print("NIRMAN: HYBRID STACKING ENSEMBLE + STATISTICAL FORECASTING TRAINING")
    print("=" * 75)

    complete_data_path = "data/complete_process_data.csv"
    if not os.path.exists(complete_data_path) and os.path.exists("D:\\complete_process_data.csv"):
        complete_data_path = "D:\\complete_process_data.csv"

    if os.path.exists(complete_data_path):
        print(f"[1/5] Ingesting real production dataset from: {complete_data_path}...")
        # sample_stride=5 downsamples from 5 Hz to 1 Hz (~62,600 samples) preserving all 96 wafers
        full_dataset = load_complete_process_data(
            csv_path=complete_data_path,
            sample_stride=5,
            random_state=42
        )
    else:
        print("[1/5] Complete dataset not found, using multi-wafer generator...")
        full_dataset = generate_multi_wafer_dataset(
            base_sample_path="data/wafer_sample.csv",
            n_normal_wafers=45,
            n_drift_wafers=30,
            n_fault_wafers=25,
            random_state=42
        )

    print(f"      Total telemetry points for training/validation: {len(full_dataset)}")
    print(f"      Across {full_dataset['wafer_id'].nunique()} distinct production wafers.")
    print("      Class Distribution:")
    print(full_dataset["label_name"].value_counts().to_string())

    # 2. Wafer-level split to prevent data leakage across time-series
    print("\n[2/5] Creating wafer-level stratified train/test split...")
    wafer_meta = full_dataset.groupby("wafer_id")[["label", "label_name"]].first().reset_index()
    train_wafers, test_wafers = train_test_split(
        wafer_meta["wafer_id"],
        test_size=0.25,
        stratify=wafer_meta["label"],
        random_state=42
    )

    train_df = full_dataset[full_dataset["wafer_id"].isin(train_wafers)].copy()
    test_df = full_dataset[full_dataset["wafer_id"].isin(test_wafers)].copy()
    print(f"      Train set: {len(train_df)} samples ({len(train_wafers)} wafers)")
    print(f"      Test set:  {len(test_df)} samples ({len(test_wafers)} wafers)")

    # 3. Initialize and train the Hybrid Pipeline
    print("\n[3/5] Fitting Hybrid Pipeline on Real Telemetry (44 Sensors):")
    print("      - Base Model 1: Random Forest (120 trees)")
    print("      - Base Model 2: XGBoost (120 estimators, depth=5)")
    print("      - Base Model 3: Extra Trees (120 trees)")
    print("      - Meta-Learner: Stacking Logistic Regression (5-fold CV)")
    print("      - Anomaly Detector: Isolation Forest (unsupervised)")
    print("      - Drift Velocity Analyzer: OLS Linear Regression")
    print("      - Time-To-Threshold Forecaster: Ridge Regression with Spec Limits")
    print("      - Alert Engine: Rule-Based Debouncing & Attribution")

    pipeline = HybridWaferPipeline(sensor_columns=SENSOR_COLUMNS, random_state=42)
    pipeline.fit(train_df, label_col="label")

    # 4. Comprehensive Evaluation on Unseen Test Wafers
    print("\n[4/5] Evaluating Primary Stacking Ensemble vs. Base Models on Test Set:")
    target_names = ["Normal", "Chamber_Drift", "Process_Fault"]
    
    # Base models comparison
    base_eval = pipeline.stacking_classifier.get_base_model_predictions(test_df)
    y_true = test_df["label"].values

    print("\n" + "-" * 60)
    print(f"{'Model':<25} | {'Accuracy':<12} | {'F1 Macro':<12}")
    print("-" * 60)
    for name, p_dict in base_eval.items():
        acc = accuracy_score(y_true, p_dict["pred"])
        f1m = f1_score(y_true, p_dict["pred"], average="macro")
        model_display = {"rf": "Random Forest", "xgb": "XGBoost", "et": "Extra Trees"}.get(name, name)
        print(f"{model_display:<25} | {acc:<12.4f} | {f1m:<12.4f}")

    # Stacking Ensemble
    stacking_metrics = pipeline.stacking_classifier.evaluate(test_df, y_true, target_names=target_names)
    print(f"{'Stacking Ensemble (Meta)':<25} | {stacking_metrics['accuracy']:<12.4f} | {stacking_metrics['f1_macro']:<12.4f}")
    print("-" * 60)

    print("\nStacking Ensemble Detailed Classification Report:")
    print(stacking_metrics["classification_report_text"])

    # Test Anomaly Detector metrics
    is_anom, scores = pipeline.anomaly_detector.score_samples(test_df)
    print(f"Isolation Forest Mean Anomaly Score on Normal:  {scores[y_true == 0].mean():.4f}")
    print(f"Isolation Forest Mean Anomaly Score on Drift:   {scores[y_true == 1].mean():.4f}")
    print(f"Isolation Forest Mean Anomaly Score on Fault:   {scores[y_true == 2].mean():.4f}")

    # 5. Save Model and Reports
    print("\n[5/5] Exporting trained pipeline artifacts and metrics...")
    model_path = "models/hybrid_wafer_pipeline.joblib"
    pipeline.save(model_path)

    report_payload = {
        "stacking_ensemble": {
            "accuracy": stacking_metrics["accuracy"],
            "f1_macro": stacking_metrics["f1_macro"],
            "f1_weighted": stacking_metrics["f1_weighted"],
            "report": stacking_metrics["classification_report"]
        },
        "anomaly_detector": {
            "normal_mean_score": float(scores[y_true == 0].mean()),
            "drift_mean_score": float(scores[y_true == 1].mean()),
            "fault_mean_score": float(scores[y_true == 2].mean())
        },
        "test_samples": len(test_df),
        "train_samples": len(train_df),
        "total_wafers": full_dataset['wafer_id'].nunique()
    }

    report_path = "models/evaluation_report.json"
    with open(report_path, "w") as f:
        json.dump(report_payload, f, indent=2)
    print(f"[+] Evaluation metrics saved to {report_path}")

    # Generate inference output on test wafer and full sample
    sample_wafer_id = test_wafers.iloc[0]
    sample_stream_df = test_df[test_df["wafer_id"] == sample_wafer_id]
    print(f"\n[*] Running sample inference stream on wafer: {sample_wafer_id} ({sample_stream_df['label_name'].iloc[0]})...")
    stream_results = pipeline.process_wafer_stream(sample_stream_df)
    
    alerts_fired = [r for r in stream_results if r["alert_triggered"]]
    print(f"      Total ticks: {len(stream_results)}, Alerts Triggered: {len(alerts_fired)}")
    if alerts_fired:
        first_alert = alerts_fired[0]
        print(f"      First Alert at t={first_alert['timestamp']:.1f}s | Severity: {first_alert['severity']} | Rule: {first_alert['rule_fired']}")
        print(f"      Root Cause: {first_alert['root_cause']}")
        print(f"      Action: {first_alert['action_recommendation']}")

    # Save complete test set inference to CSV
    print("\n[*] Saving complete test wafer predictions to CSV: data/inference_output.csv...")
    output_rows = []
    class_map = {0: "Normal", 1: "Chamber_Drift", 2: "Process_Fault"}
    
    # Process batch predictions on test set
    preds = pipeline.stacking_classifier.predict(test_df)
    probas = pipeline.stacking_classifier.predict_proba(test_df)
    is_anom, anom_scores = pipeline.anomaly_detector.score_samples(test_df)

    test_out = test_df.copy()
    test_out["predicted_class_id"] = preds
    test_out["predicted_state"] = [class_map.get(p, "Unknown") for p in preds]
    test_out["prob_normal"] = np.round(probas[:, 0], 4)
    test_out["prob_chamber_drift"] = np.round(probas[:, 1], 4)
    test_out["prob_process_fault"] = np.round(probas[:, 2], 4)
    test_out["anomaly_score"] = np.round(anom_scores, 4)
    test_out["is_isolated_anomaly"] = is_anom

    csv_out_path = "data/inference_output.csv"
    test_out.to_csv(csv_out_path, index=False)
    print(f"[+] Output CSV successfully saved: {csv_out_path} ({len(test_out)} rows, {len(test_out.columns)} columns)")

    print("\n" + "=" * 75)
    print("TRAINING AND ARTIFACT EXPORT COMPLETE!")
    print("=" * 75)

if __name__ == "__main__":
    main()
