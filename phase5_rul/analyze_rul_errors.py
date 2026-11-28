
import json
from pathlib import Path

import numpy as np
import pandas as pd

from xgboost import XGBRegressor
from sklearn.metrics import mean_absolute_error

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

predictions_all = []

# Six-engine LOEO evaluation using selected
# configuration 24.
for engine in sorted(df["unit"].unique()):

    train = df[df["unit"] != engine]
    validation = df[df["unit"] == engine]

    model = XGBRegressor(
        objective="reg:squarederror",
        n_estimators=600,
        max_depth=4,
        learning_rate=0.03,
        subsample=0.85,
        colsample_bytree=0.85,
        reg_lambda=2.0,
        random_state=42,
        n_jobs=-1,
    )

    model.fit(
        train[features],
        train[TARGET]
    )

    predicted = model.predict(
        validation[features]
    )

    for actual, prediction, cycle in zip(
        validation[TARGET],
        predicted,
        validation["cycle"]
    ):
        predictions_all.append({
            "engine": int(engine),
            "cycle": int(cycle),
            "actual_rul": float(actual),
            "predicted_rul": float(prediction),
            "error": float(prediction - actual),
            "absolute_error": float(
                abs(prediction - actual)
            ),
        })

results = pd.DataFrame(predictions_all)

# Overall analysis
print("\nOVERALL ERROR ANALYSIS")
print("MAE:", mean_absolute_error(
    results["actual_rul"],
    results["predicted_rul"]
))

print("Mean signed error:", results["error"].mean())
print("Mean absolute error:", results["absolute_error"].mean())

# Engine-wise analysis
print("\nENGINE-WISE ERROR ANALYSIS")

engine_summary = results.groupby("engine").agg(
    MAE=("absolute_error", "mean"),
    Mean_Error=("error", "mean"),
    Max_Error=("absolute_error", "max"),
    Flights=("actual_rul", "count"),
).reset_index()

print(engine_summary.to_string(index=False))

# RUL range analysis
results["rul_band"] = pd.cut(
    results["actual_rul"],
    bins=[-np.inf, 20, 40, 60, 80, np.inf],
    labels=[
        "0-20",
        "21-40",
        "41-60",
        "61-80",
        "Above 80"
    ]
)

print("\nERROR BY ACTUAL RUL RANGE")

range_summary = results.groupby(
    "rul_band",
    observed=False
).agg(
    MAE=("absolute_error", "mean"),
    Mean_Error=("error", "mean"),
    Samples=("actual_rul", "count"),
).reset_index()

print(range_summary.to_string(index=False))

# Save predictions and summaries
results.to_csv(
    OUTPUT_DIR / "xgboost_error_predictions.csv",
    index=False
)

engine_summary.to_csv(
    OUTPUT_DIR / "xgboost_engine_error_summary.csv",
    index=False
)

range_summary.to_csv(
    OUTPUT_DIR / "xgboost_rul_band_error_summary.csv",
    index=False
)

print("\nError analysis files saved successfully.")
