"""
AEROSENTRY Phase 7 â€” Final training and independent DS05 test evaluation.

Run from the Nirman_6.0 project root:
    .\.venv\Scripts\python.exe .\phase7_evaluation\run_phase7_evaluation.py

Uses development engines 1â€“6 for final training and evaluates once on
held-out test engines 7â€“10. Does not tune on the test set.
"""
from pathlib import Path
import json
import warnings

import joblib
import numpy as np
import pandas as pd
from sklearn.metrics import mean_absolute_error, mean_squared_error, r2_score
from xgboost import XGBRegressor

ROOT = Path(__file__).resolve().parents[1]
DEV_PATH = ROOT / "phase4_ncmapss" / "data" / "processed" / "ncmapss_ds05_dev_flights.csv"
TEST_PATH = ROOT / "phase4_ncmapss" / "data" / "processed" / "ncmapss_ds05_test_flights.csv"
OUT = ROOT / "phase7_evaluation" / "outputs"
OUT.mkdir(parents=True, exist_ok=True)

TARGET = "rul_mean"
META = {
    "unit", "cycle", "samples_in_flight", "flight_class", "health_state_code"
}
OTHER_TARGETS = {
    "rul_first", "rul_last", "rul_min", "rul_max",
    "rul_mean", "rul_within_flight_range"
}
EXPECTED_DEV_ENGINES = {1, 2, 3, 4, 5, 6}
EXPECTED_TEST_ENGINES = {7, 8, 9, 10}

PARAMS = dict(
    objective="reg:squarederror",
    n_estimators=600,
    max_depth=4,
    learning_rate=0.03,
    subsample=0.85,
    colsample_bytree=0.85,
    reg_lambda=2,
    random_state=42,
    n_jobs=-1,
)

def metric_row(name, y_true, y_pred):
    return {
        "scope": name,
        "rows": int(len(y_true)),
        "MAE": float(mean_absolute_error(y_true, y_pred)),
        "RMSE": float(np.sqrt(mean_squared_error(y_true, y_pred))),
        "R2": float(r2_score(y_true, y_pred)) if len(y_true) > 1 else None,
        "mean_signed_error_pred_minus_actual": float(np.mean(np.asarray(y_pred)-np.asarray(y_true))),
    }

def main():
    for path in (DEV_PATH, TEST_PATH):
        if not path.exists():
            raise FileNotFoundError(f"Required processed dataset not found: {path}")

    dev = pd.read_csv(DEV_PATH)
    test = pd.read_csv(TEST_PATH)

    required = {"unit", TARGET}
    for label, frame in (("development", dev), ("test", test)):
        missing = required - set(frame.columns)
        if missing:
            raise ValueError(f"{label} CSV missing required columns: {sorted(missing)}")
        if frame[list(required)].isna().any().any():
            raise ValueError(f"{label} CSV has missing engine IDs or target values.")

    dev_engines = set(pd.to_numeric(dev["unit"], errors="raise").astype(int).unique())
    test_engines = set(pd.to_numeric(test["unit"], errors="raise").astype(int).unique())
    if dev_engines != EXPECTED_DEV_ENGINES:
        raise ValueError(f"Expected development engines {sorted(EXPECTED_DEV_ENGINES)}, found {sorted(dev_engines)}")
    if test_engines != EXPECTED_TEST_ENGINES:
        raise ValueError(f"Expected test engines {sorted(EXPECTED_TEST_ENGINES)}, found {sorted(test_engines)}")
    if dev_engines & test_engines:
        raise ValueError("Engine leakage detected: development and test engine IDs overlap.")

    # Derive the feature list from the development schema, excluding identifiers
    # and every RUL-derived target/label column.
    feature_cols = [
        c for c in dev.columns
        if c not in META and c not in OTHER_TARGETS
    ]
    if len(feature_cols) != 72:
        raise ValueError(
            f"Expected 72 predictor features from the Phase 5 schema, found {len(feature_cols)}. "
            f"Review columns before proceeding; no model was trained."
        )
    missing_test_features = sorted(set(feature_cols) - set(test.columns))
    if missing_test_features:
        raise ValueError(f"Test CSV is missing feature columns: {missing_test_features}")

    X_train = dev[feature_cols].apply(pd.to_numeric, errors="raise")
    y_train = pd.to_numeric(dev[TARGET], errors="raise")
    X_test = test[feature_cols].apply(pd.to_numeric, errors="raise")
    y_test = pd.to_numeric(test[TARGET], errors="raise")

    if not np.isfinite(X_train.to_numpy()).all() or not np.isfinite(X_test.to_numpy()).all():
        raise ValueError("Non-finite predictor values found.")
    if not np.isfinite(y_train.to_numpy()).all() or not np.isfinite(y_test.to_numpy()).all():
        raise ValueError("Non-finite RUL target values found.")

    print("PHASE 7 DATA AUDIT")
    print(f"Development rows: {len(dev)} | engines: {sorted(dev_engines)}")
    print(f"Independent test rows: {len(test)} | engines: {sorted(test_engines)}")
    print(f"Predictor features: {len(feature_cols)}")
    print("Engine overlap: none")
    print("\nTraining final XGBoost model on all development engines 1â€“6...")

    model = XGBRegressor(**PARAMS)
    model.fit(X_train, y_train)
    predictions = model.predict(X_test)

    result = test[["unit", "cycle", TARGET]].copy()
    result["predicted_rul"] = predictions
    result["error_pred_minus_actual"] = result["predicted_rul"] - result[TARGET]
    result["absolute_error"] = result["error_pred_minus_actual"].abs()
    result["overestimation_gt_10"] = result["error_pred_minus_actual"] > 10
    result.to_csv(OUT / "independent_test_predictions.csv", index=False)

    overall = metric_row("all_test_engines_7_to_10", y_test, predictions)
    per_engine = []
    for engine, group in result.groupby("unit"):
        per_engine.append(metric_row(
            f"engine_{int(engine)}", group[TARGET], group["predicted_rul"]
        ))

    # Low-RUL risk analysis. A positive signed error means RUL was overestimated.
    low = result[result[TARGET] <= 20]
    low_summary = {
        "definition": "low RUL means actual rul_mean <= 20 cycles",
        "rows": int(len(low)),
        "MAE": float(mean_absolute_error(low[TARGET], low["predicted_rul"])) if len(low) else None,
        "overestimation_gt_10_count": int((low["error_pred_minus_actual"] > 10).sum()),
        "overestimation_gt_10_rate": float((low["error_pred_minus_actual"] > 10).mean()) if len(low) else None,
        "maximum_overestimation": float(low["error_pred_minus_actual"].max()) if len(low) else None,
    }

    bands = [-np.inf, 20, 40, 60, 80, np.inf]
    labels = ["0-20", "21-40", "41-60", "61-80", ">80"]
    result["actual_rul_band"] = pd.cut(
        result[TARGET], bins=bands, labels=labels, right=True, include_lowest=True
    )
    band_rows = []
    for band, group in result.groupby("actual_rul_band", observed=False):
        if len(group):
            band_rows.append(metric_row(str(band), group[TARGET], group["predicted_rul"]))
    pd.DataFrame(per_engine).to_csv(OUT / "engine_wise_metrics.csv", index=False)
    pd.DataFrame(band_rows).to_csv(OUT / "rul_band_metrics.csv", index=False)

    model_path = OUT / "xgboost_ds05_final_dev_engines_1_6.joblib"
    joblib.dump(model, model_path)
    (OUT / "feature_columns.json").write_text(json.dumps(feature_cols, indent=2))
    report = {
        "phase": "7 â€” Final model training and independent test evaluation",
        "dataset": "NASA N-CMAPSS DS05 processed flight-level data",
        "development_engines": sorted(dev_engines),
        "independent_test_engines": sorted(test_engines),
        "development_rows": int(len(dev)),
        "independent_test_rows": int(len(test)),
        "feature_count": len(feature_cols),
        "model_parameters": PARAMS,
        "overall_metrics": overall,
        "engine_wise_metrics": per_engine,
        "low_rul_risk": low_summary,
        "test_set_policy": "Engines 7â€“10 used only for final evaluation; do not tune from these results.",
        "prediction_policy": "Raw regression predictions retained; no clipping applied.",
        "limitations": [
            "Results apply to this processed DS05 split and this evaluation protocol.",
            "SHAP explanations do not establish physical causality.",
            "This is a research prototype, not a certified aircraft maintenance system."
        ]
    }
    (OUT / "phase7_evaluation_report.json").write_text(json.dumps(report, indent=2, default=lambda value: value.item() if isinstance(value, np.generic) else str(value)))
    print("\nINDEPENDENT TEST RESULTS")
    print(json.dumps(overall, indent=2))
    print("\nENGINE-WISE RESULTS")
    print(pd.DataFrame(per_engine).to_string(index=False))
    print("\nLOW-RUL RISK")
    print(json.dumps(low_summary, indent=2))
    print(f"\nOutputs saved to: {OUT}")
    print("PHASE 7 EVALUATION SCRIPT COMPLETE")

if __name__ == "__main__":
    main()

