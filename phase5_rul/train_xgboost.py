
from pathlib import Path
import json

import joblib
import numpy as np
import pandas as pd

from xgboost import XGBRegressor
from sklearn.metrics import mean_absolute_error, mean_squared_error, r2_score


# --------------------------------------------------
# PATHS
# --------------------------------------------------

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


# --------------------------------------------------
# CONFIGURATION
# --------------------------------------------------

TARGET = "rul_mean"

METADATA_COLUMNS = [
    "unit",
    "cycle",
    "samples_in_flight",
    "flight_class",
    "health_state_code",
]

TARGET_COLUMNS = [
    "rul_first",
    "rul_last",
    "rul_mean",
    "rul_min",
    "rul_max",
    "rul_within_flight_range",
]

VALIDATION_ENGINE = 6


# --------------------------------------------------
# LOAD DATA
# --------------------------------------------------

df = pd.read_csv(DATA_PATH)

print("Dataset shape:", df.shape)

if df["unit"].isna().any():
    raise ValueError("Missing engine identifiers.")

if df[TARGET].isna().any():
    raise ValueError("Missing RUL targets.")


# --------------------------------------------------
# SELECT FEATURES
# --------------------------------------------------

excluded = METADATA_COLUMNS + TARGET_COLUMNS

feature_columns = [
    col for col in df.columns
    if col not in excluded
]

X = df[feature_columns]
y = df[TARGET]

if len(feature_columns) != 72:
    raise ValueError(
        f"Expected 72 predictor features, "
        f"found {len(feature_columns)}"
    )

if not np.isfinite(X.to_numpy()).all():
    raise ValueError("Predictors contain NaN or infinity.")

print("Predictor count:", len(feature_columns))


# --------------------------------------------------
# ENGINE-WISE SPLIT
# --------------------------------------------------

train_mask = df["unit"] != VALIDATION_ENGINE
val_mask = df["unit"] == VALIDATION_ENGINE

X_train = X.loc[train_mask]
y_train = y.loc[train_mask]

X_val = X.loc[val_mask]
y_val = y.loc[val_mask]

train_units = sorted(df.loc[train_mask, "unit"].unique().tolist())
val_units = sorted(df.loc[val_mask, "unit"].unique().tolist())

assert set(train_units).isdisjoint(set(val_units))

print("Training engines:", train_units)
print("Validation engines:", val_units)
print("Training flights:", len(X_train))
print("Validation flights:", len(X_val))


# --------------------------------------------------
# TRAIN XGBOOST
# --------------------------------------------------

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


# --------------------------------------------------
# VALIDATION
# --------------------------------------------------

predictions = model.predict(X_val)

mae = mean_absolute_error(y_val, predictions)
rmse = np.sqrt(mean_squared_error(y_val, predictions))
r2 = r2_score(y_val, predictions)

metrics = {
    "model": "XGBoost",
    "target": TARGET,
    "training_engines": train_units,
    "validation_engines": val_units,
    "training_flights": len(X_train),
    "validation_flights": len(X_val),
    "predictor_count": len(feature_columns),
    "MAE": float(mae),
    "RMSE": float(rmse),
    "R2": float(r2),
}

print("\nVALIDATION RESULTS")
print(json.dumps(metrics, indent=4))


# --------------------------------------------------
# SAVE ARTIFACTS
# --------------------------------------------------

joblib.dump(
    model,
    OUTPUT_DIR / "xgboost_rul_model.joblib"
)

with open(
    OUTPUT_DIR / "xgboost_metrics.json",
    "w"
) as file:
    json.dump(metrics, file, indent=4)

pd.DataFrame({
    "engine_unit": df.loc[val_mask, "unit"].values,
    "actual_rul": y_val.values,
    "predicted_rul": predictions,
    "absolute_error": np.abs(y_val.values - predictions),
}).to_csv(
    OUTPUT_DIR / "xgboost_validation_predictions.csv",
    index=False
)

with open(
    OUTPUT_DIR / "xgboost_features.json",
    "w"
) as file:
    json.dump(feature_columns, file, indent=4)


print("\nXGBOOST BASELINE COMPLETE")
print("Saved outputs to:", OUTPUT_DIR)
