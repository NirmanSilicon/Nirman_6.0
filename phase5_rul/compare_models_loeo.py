
import json
from pathlib import Path

import numpy as np
import pandas as pd

from xgboost import XGBRegressor
from sklearn.ensemble import RandomForestRegressor
from sklearn.ensemble import ExtraTreesRegressor
from sklearn.metrics import (
    mean_absolute_error,
    mean_squared_error,
    r2_score,
)

ROOT = Path(__file__).resolve().parents[1]

DATA_PATH = (
    ROOT / "phase4_ncmapss" / "data" /
    "processed" / "ncmapss_ds05_dev_flights.csv"
)

OUTPUT_DIR = ROOT / "phase5_rul" / "outputs"
OUTPUT_DIR.mkdir(parents=True, exist_ok=True)

TARGET = "rul_mean"

EXCLUDED = {
    "unit", "cycle", "samples_in_flight",
    "flight_class", "health_state_code",
    "rul_first", "rul_last", "rul_mean",
    "rul_min", "rul_max",
    "rul_within_flight_range",
}

df = pd.read_csv(DATA_PATH)

features = [
    col for col in df.columns
    if col not in EXCLUDED
]

models = {
    "XGBoost": XGBRegressor(
        objective="reg:squarederror",
        n_estimators=400,
        max_depth=4,
        learning_rate=0.03,
        subsample=0.85,
        colsample_bytree=0.85,
        reg_lambda=2.0,
        random_state=42,
        n_jobs=-1,
    ),

    "Random Forest": RandomForestRegressor(
        n_estimators=400,
        max_depth=None,
        min_samples_leaf=2,
        max_features=1.0,
        random_state=42,
        n_jobs=-1,
    ),

    "Extra Trees": ExtraTreesRegressor(
        n_estimators=400,
        max_depth=None,
        min_samples_leaf=2,
        max_features=1.0,
        random_state=42,
        n_jobs=-1,
    ),
}

all_results = []

for model_name, model_template in models.items():

    print(f"\n{'=' * 50}")
    print(f"MODEL: {model_name}")
    print("=" * 50)

    fold_results = []

    for engine in sorted(df["unit"].unique()):

        train = df[df["unit"] != engine]
        validation = df[df["unit"] == engine]

        X_train = train[features]
        y_train = train[TARGET]

        X_val = validation[features]
        y_val = validation[TARGET]

        # Create a fresh model for every fold.
        model = model_template.__class__(
            **model_template.get_params()
        )

        model.fit(X_train, y_train)
        predictions = model.predict(X_val)

        mae = mean_absolute_error(y_val, predictions)
        rmse = np.sqrt(
            mean_squared_error(y_val, predictions)
        )
        r2 = r2_score(y_val, predictions)

        fold_results.append({
            "engine": int(engine),
            "MAE": float(mae),
            "RMSE": float(rmse),
            "R2": float(r2),
        })

        print(
            f"Engine {engine}: "
            f"MAE={mae:.4f}, "
            f"RMSE={rmse:.4f}, "
            f"R2={r2:.4f}"
        )

    maes = [x["MAE"] for x in fold_results]
    rmses = [x["RMSE"] for x in fold_results]
    r2s = [x["R2"] for x in fold_results]

    summary = {
        "model": model_name,
        "mean_MAE": float(np.mean(maes)),
        "std_MAE": float(np.std(maes)),
        "mean_RMSE": float(np.mean(rmses)),
        "std_RMSE": float(np.std(rmses)),
        "mean_R2": float(np.mean(r2s)),
        "std_R2": float(np.std(r2s)),
        "fold_results": fold_results,
    }

    all_results.append(summary)

print("\n" + "=" * 55)
print("FINAL MODEL COMPARISON")
print("=" * 55)

comparison = pd.DataFrame([
    {
        "Model": x["model"],
        "Mean MAE": x["mean_MAE"],
        "MAE Std": x["std_MAE"],
        "Mean RMSE": x["mean_RMSE"],
        "RMSE Std": x["std_RMSE"],
        "Mean R2": x["mean_R2"],
        "R2 Std": x["std_R2"],
    }
    for x in all_results
])

print(comparison.to_string(index=False))

comparison.to_csv(
    OUTPUT_DIR / "model_comparison_loeo.csv",
    index=False,
)

with open(
    OUTPUT_DIR / "model_comparison_loeo.json",
    "w"
) as f:
    json.dump(all_results, f, indent=4)

print("\nComparison files saved successfully.")
