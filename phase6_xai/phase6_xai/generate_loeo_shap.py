from pathlib import Path
import json

import joblib
import matplotlib
matplotlib.use("Agg")
import matplotlib.pyplot as plt
import numpy as np
import pandas as pd
import shap
from xgboost import XGBRegressor
from sklearn.metrics import mean_absolute_error, mean_squared_error, r2_score

ROOT = Path(__file__).resolve().parents[2]
DATA_PATH = ROOT / "phase4_ncmapss" / "data" / "processed" / "ncmapss_ds05_dev_flights.csv"
FEATURES_PATH = ROOT / "phase5_rul" / "outputs" / "xgboost_features.json"
OUT = Path(__file__).resolve().parent / "outputs" / "loeo_shap"
OUT.mkdir(parents=True, exist_ok=True)

TARGET = "rul_mean"
TARGET_ENGINES = [3, 6]
LOW_RUL_THRESHOLD = 20

# Same practical configuration selected during Phase 5 tuning/error analysis.
PARAMS = {
    "objective": "reg:squarederror",
    "n_estimators": 600,
    "max_depth": 4,
    "learning_rate": 0.03,
    "subsample": 0.85,
    "colsample_bytree": 0.85,
    "reg_lambda": 2.0,
    "random_state": 42,
    "n_jobs": -1,
}

def main():
    for path in (DATA_PATH, FEATURES_PATH):
        if not path.exists():
            raise FileNotFoundError(f"Required file not found: {path}")

    df = pd.read_csv(DATA_PATH)
    features = json.loads(FEATURES_PATH.read_text(encoding="utf-8"))

    required = {"unit", "cycle", TARGET}
    missing = required.difference(df.columns)
    if missing:
        raise ValueError(f"Dataset missing columns: {sorted(missing)}")
    missing_features = [c for c in features if c not in df.columns]
    if missing_features:
        raise ValueError(f"Feature columns missing from dataset: {missing_features}")

    engines = sorted(int(x) for x in df["unit"].unique())
    if engines != [1, 2, 3, 4, 5, 6]:
        raise ValueError(f"Expected development engines 1-6; found {engines}.")
    X = df[features].apply(pd.to_numeric, errors="raise")
    y = df[TARGET].astype(float)
    if not np.isfinite(X.to_numpy(dtype=float)).all() or not np.isfinite(y.to_numpy()).all():
        raise ValueError("Non-finite values found in features or target.")

    all_predictions = []
    run_metadata = {
        "validation_method": "Leave-One-Engine-Out",
        "explained_engines": TARGET_ENGINES,
        "training_engine_policy": "For each explained engine, train on the other five development engines.",
        "model_parameters": PARAMS,
        "low_rul_selection_threshold": LOW_RUL_THRESHOLD,
        "warning": "SHAP explains the reproduced held-out LOEO predictions. It describes model attribution, not causality."
    }

    for heldout_engine in TARGET_ENGINES:
        train_mask = df["unit"] != heldout_engine
        test_mask = df["unit"] == heldout_engine
        X_train, y_train = X.loc[train_mask], y.loc[train_mask]
        X_test, y_test = X.loc[test_mask], y.loc[test_mask]

        train_engines = sorted(int(x) for x in df.loc[train_mask, "unit"].unique())
        if heldout_engine in train_engines:
            raise AssertionError("Held-out engine leaked into training split.")

        print(f"\nEngine {heldout_engine}: training on engines {train_engines}")
        model = XGBRegressor(**PARAMS)
        model.fit(X_train, y_train)
        predictions = model.predict(X_test)
        errors = predictions - y_test.to_numpy()

        fold_metrics = {
            "heldout_engine": heldout_engine,
            "training_engines": train_engines,
            "heldout_flights": int(len(X_test)),
            "MAE": float(mean_absolute_error(y_test, predictions)),
            "RMSE": float(np.sqrt(mean_squared_error(y_test, predictions))),
            "R2": float(r2_score(y_test, predictions)),
        }
        print("Fold metrics:", json.dumps(fold_metrics, indent=2))

        fold_df = pd.DataFrame({
            "row_index": X_test.index,
            "engine": heldout_engine,
            "cycle": df.loc[test_mask, "cycle"].to_numpy(),
            "actual_rul": y_test.to_numpy(),
            "predicted_rul": predictions,
            "error_predicted_minus_actual": errors,
            "absolute_error": np.abs(errors),
        })
        fold_df.to_csv(OUT / f"engine_{heldout_engine}_loeo_predictions.csv", index=False)
        all_predictions.append(fold_df)

        # Select the most severe overestimation among low-RUL held-out flights.
        eligible = fold_df[
            (fold_df["actual_rul"] <= LOW_RUL_THRESHOLD) &
            (fold_df["error_predicted_minus_actual"] > 0)
        ]
        selection_rule = "largest positive error among actual RUL <= 20"
        if eligible.empty:
            eligible = fold_df.loc[[fold_df["error_predicted_minus_actual"].idxmax()]]
            selection_rule = "largest positive error in this held-out engine (no low-RUL overestimate found)"

        chosen = eligible.sort_values("error_predicted_minus_actual", ascending=False).iloc[0]
        row_index = int(chosen["row_index"])
        x_row = X.loc[[row_index]]

        # Explain this exact held-out prediction using the fold-specific model.
        explainer = shap.TreeExplainer(model)
        explanation = explainer(x_row)
        shap.plots.waterfall(explanation[0], max_display=18, show=False)
        plt.title(
            f"AEROSENTRY LOEO SHAP — Engine {heldout_engine}\\n"
            f"Actual RUL={chosen['actual_rul']:.2f}, Predicted RUL={chosen['predicted_rul']:.2f}"
        )
        plt.tight_layout()
        plot_path = OUT / f"engine_{heldout_engine}_loeo_waterfall.png"
        plt.savefig(plot_path, dpi=180, bbox_inches="tight")
        plt.close()

        # Save the exact fold model and selected row metadata for reproducibility.
        joblib.dump(model, OUT / f"engine_{heldout_engine}_loeo_model.joblib")
        selected_metadata = {
            "engine": heldout_engine,
            "row_index": row_index,
            "cycle": int(chosen["cycle"]),
            "actual_rul": float(chosen["actual_rul"]),
            "predicted_rul": float(chosen["predicted_rul"]),
            "error_predicted_minus_actual": float(chosen["error_predicted_minus_actual"]),
            "selection_rule": selection_rule,
            "training_engines": train_engines,
            "waterfall_plot": plot_path.name,
            "interpretation_note": "Positive SHAP values increase predicted RUL; negative SHAP values decrease predicted RUL. Attribution is not causation."
        }
        (OUT / f"engine_{heldout_engine}_selected_case.json").write_text(
            json.dumps(selected_metadata, indent=2), encoding="utf-8"
        )
        print("Selected held-out case:", json.dumps(selected_metadata, indent=2))

    combined = pd.concat(all_predictions, ignore_index=True)
    combined.to_csv(OUT / "engines_3_6_loeo_predictions.csv", index=False)
    run_metadata["fold_metrics"] = [
        {
            "engine": int(engine),
            "MAE": float(mean_absolute_error(
                group["actual_rul"], group["predicted_rul"]
            )),
            "RMSE": float(np.sqrt(mean_squared_error(
                group["actual_rul"], group["predicted_rul"]
            ))),
            "R2": float(r2_score(group["actual_rul"], group["predicted_rul"])),
        }
        for engine, group in combined.groupby("engine")
    ]
    (OUT / "run_metadata.json").write_text(json.dumps(run_metadata, indent=2), encoding="utf-8")

    print("\nPHASE 6.4 LOEO SHAP COMPLETE")
    print("Outputs:", OUT)
    print("Open engine_3_loeo_waterfall.png and engine_6_loeo_waterfall.png")
    print("These explanations correspond to held-out predictions from fold-specific models.")

if __name__ == "__main__":
    main()
