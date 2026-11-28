from pathlib import Path
import json
import numpy as np
import pandas as pd
import joblib
import shap
import matplotlib
matplotlib.use("Agg")
import matplotlib.pyplot as plt
from xgboost import XGBRegressor
from sklearn.metrics import mean_absolute_error, mean_squared_error, r2_score

ROOT = Path(__file__).resolve().parents[1]
DATA = ROOT / "phase4_ncmapss" / "data" / "processed" / "ncmapss_ds05_dev_flights.csv"
OUT = Path(__file__).resolve().parent / "outputs"
OUT.mkdir(parents=True, exist_ok=True)

TARGET = "rul_mean"
META = ["unit", "cycle", "samples_in_flight", "flight_class", "health_state_code"]
TARGETS = ["rul_first", "rul_last", "rul_mean", "rul_min", "rul_max", "rul_within_flight_range"]
PARAMS = dict(objective="reg:squarederror", n_estimators=600, max_depth=4,
              learning_rate=0.03, subsample=0.85, colsample_bytree=0.85,
              reg_lambda=2.0, random_state=42, n_jobs=-1)

def main():
    if not DATA.exists():
        raise FileNotFoundError(f"Missing development dataset: {DATA}")
    df = pd.read_csv(DATA)
    if not {"unit", TARGET}.issubset(df.columns):
        raise ValueError("Dataset must contain unit and rul_mean.")
    if df["unit"].isna().any() or df[TARGET].isna().any():
        raise ValueError("Missing engine IDs or RUL targets.")

    features = [c for c in df.columns if c not in set(META + TARGETS)]
    if len(features) != 72:
        raise ValueError(f"Expected 72 features; found {len(features)}.")
    X = df[features].apply(pd.to_numeric, errors="raise")
    y = df[TARGET].astype(float)
    if not np.isfinite(X.to_numpy(dtype=float)).all():
        raise ValueError("Features contain NaN or infinity.")

    engines = sorted(int(v) for v in df["unit"].unique())
    if engines != [1, 2, 3, 4, 5, 6]:
        raise ValueError(f"Expected development engines 1-6 only; found {engines}. Test engines must remain untouched.")

    print(f"Development rows: {len(df)} | engines: {engines} | features: {len(features)}")
    model = XGBRegressor(**PARAMS)
    model.fit(X, y)
    pred = model.predict(X)

    metadata = {
        "model": "XGBoost",
        "purpose": "development-fit model for global SHAP exploration",
        "training_engines": engines,
        "training_rows": int(len(df)),
        "target": TARGET,
        "feature_count": len(features),
        "parameters": PARAMS,
        "in_sample_MAE": float(mean_absolute_error(y, pred)),
        "in_sample_RMSE": float(np.sqrt(mean_squared_error(y, pred))),
        "in_sample_R2": float(r2_score(y, pred)),
        "warning": "In-sample metrics are not independent test performance."
    }
    joblib.dump(model, OUT / "xgboost_ds05_dev_model.joblib")
    (OUT / "model_metadata.json").write_text(json.dumps(metadata, indent=2), encoding="utf-8")
    (OUT / "feature_columns.json").write_text(json.dumps(features, indent=2), encoding="utf-8")
    pd.DataFrame({
        "unit": df["unit"].astype(int),
        "cycle": df["cycle"] if "cycle" in df else np.arange(len(df)),
        "actual_rul": y,
        "predicted_rul": pred,
        "error_predicted_minus_actual": pred-y
    }).to_csv(OUT / "development_predictions_in_sample.csv", index=False)

    print("Calculating SHAP values...")
    explainer = shap.TreeExplainer(model)
    sv = explainer(X)
    imp = pd.DataFrame({
        "feature": features,
        "mean_absolute_shap_value": np.abs(sv.values).mean(axis=0)
    }).sort_values("mean_absolute_shap_value", ascending=False)
    imp.to_csv(OUT / "shap_global_feature_importance.csv", index=False)

    shap.plots.beeswarm(sv, max_display=20, show=False)
    plt.tight_layout()
    plt.savefig(OUT / "shap_summary_beeswarm.png", dpi=180, bbox_inches="tight")
    plt.close()

    shap.plots.bar(sv, max_display=20, show=False)
    plt.tight_layout()
    plt.savefig(OUT / "shap_global_bar.png", dpi=180, bbox_inches="tight")
    plt.close()

    # These are in-sample illustrative explanations, not prior LOEO predictions.
    examples = []
    for engine in (3, 6):
        ids = np.flatnonzero(df["unit"].to_numpy() == engine)
        if not len(ids):
            continue
        idx = int(ids[np.argmin(y.iloc[ids].to_numpy())])
        shap.plots.waterfall(sv[idx], max_display=15, show=False)
        plt.tight_layout()
        plt.savefig(OUT / f"shap_engine_{engine}_lowest_rul_in_sample.png", dpi=180, bbox_inches="tight")
        plt.close()
        examples.append({
            "engine": engine, "row_index": idx,
            "cycle": int(df.iloc[idx]["cycle"]) if "cycle" in df else None,
            "actual_rul": float(y.iloc[idx]), "predicted_rul": float(pred[idx])
        })
    notes = {
        "type": "in-sample exploratory explanations",
        "warning": "Engine 3/6 plots explain predictions from a model trained on all six development engines. They are not explanations of earlier LOEO held-out predictions. Recreate the exact fold model excluding the explained engine for those.",
        "examples": examples,
        "interpretation": "SHAP values describe model attribution, not causal sensor effects."
    }
    (OUT / "local_explanation_notes.json").write_text(json.dumps(notes, indent=2), encoding="utf-8")

    print("\nPHASE 6.2 COMPLETE")
    print("Outputs:", OUT)
    print("\nTop 15 SHAP features:")
    print(imp.head(15).to_string(index=False))
    print("\nReminder: reported fit metrics and local plots are in-sample only.")

if __name__ == "__main__":
    main()
