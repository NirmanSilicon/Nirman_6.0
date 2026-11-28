
import json
from pathlib import Path

import numpy as np
import pandas as pd
from xgboost import XGBRegressor
from sklearn.metrics import (
    mean_absolute_error,
    mean_squared_error,
    r2_score,
)

ROOT = Path(__file__).resolve().parents[1]

DATA_PATH = (
    ROOT
    / "phase4_ncmapss"
    / "data"
    / "processed"
    / "ncmapss_ds05_dev_flights.csv"
)

OUTPUT_DIR = ROOT / "phase5_rul" / "outputs"
OUTPUT_DIR.mkdir(parents=True, exist_ok=True)

TARGET = "rul_mean"

EXCLUDED_COLUMNS = {
    "unit",
    "cycle",
    "samples_in_flight",
    "flight_class",
    "health_state_code",
    "rul_first",
    "rul_last",
    "rul_mean",
    "rul_min",
    "rul_max",
    "rul_within_flight_range",
}

df = pd.read_csv(DATA_PATH)

feature_columns = [
    col for col in df.columns
    if col not in EXCLUDED_COLUMNS
]

results = []

for engine in sorted(df["unit"].unique()):

    train = df[df["unit"] != engine]
    validation = df[df["unit"] == engine]

    X_train = train[feature_columns]
    y_train = train[TARGET]

    X_val = validation[feature_columns]
    y_val = validation[TARGET]

    model = XGBRegressor(
        objective="reg:squarederror",
        n_estimators=400,
        max_depth=4,
        learning_rate=0.03,
        subsample=0.85,
        colsample_bytree=0.85,
        reg_lambda=2.0,
        random_state=42,
        n_jobs=-1,
    )

    model.fit(X_train, y_train)

    predictions = model.predict(X_val)

    mae = mean_absolute_error(y_val, predictions)
    rmse = np.sqrt(mean_squared_error(y_val, predictions))
    r2 = r2_score(y_val, predictions)

    results.append({
        "validation_engine": int(engine),
        "training_engines": [
            int(x) for x in sorted(train["unit"].unique())
        ],
        "training_flights": int(len(train)),
        "validation_flights": int(len(validation)),
        "MAE": float(mae),
        "RMSE": float(rmse),
        "R2": float(r2),
    })

    print(f"\nEngine {engine}")
    print(f"MAE:  {mae:.4f}")
    print(f"RMSE: {rmse:.4f}")
    print(f"R2:   {r2:.4f}")

mae_values = [r["MAE"] for r in results]
rmse_values = [r["RMSE"] for r in results]
r2_values = [r["R2"] for r in results]

summary = {
    "validation_method": "Leave-One-Engine-Out",
    "model": "XGBoost",
    "target": TARGET,
    "predictor_count": len(feature_columns),
    "engine_results": results,
    "mean_MAE": float(np.mean(mae_values)),
    "std_MAE": float(np.std(mae_values)),
    "mean_RMSE": float(np.mean(rmse_values)),
    "std_RMSE": float(np.std(rmse_values)),
    "mean_R2": float(np.mean(r2_values)),
    "std_R2": float(np.std(r2_values)),
}

output_path = OUTPUT_DIR / "xgboost_loeo_metrics.json"

with open(output_path, "w") as f:
    json.dump(summary, f, indent=4)

print("\n" + "=" * 45)
print("LEAVE-ONE-ENGINE-OUT SUMMARY")
print("=" * 45)
print(json.dumps({
    key: value
    for key, value in summary.items()
    if key != "engine_results"
}, indent=4))

print(f"\nDetailed results saved to: {output_path}")
