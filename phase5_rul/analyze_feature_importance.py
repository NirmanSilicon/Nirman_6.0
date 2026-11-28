
import pandas as pd
from pathlib import Path
from xgboost import XGBRegressor

ROOT = Path(__file__).resolve().parents[1]

DATA_PATH = (
    ROOT / "phase4_ncmapss" / "data" /
    "processed" / "ncmapss_ds05_dev_flights.csv"
)

OUTPUT_DIR = ROOT / "phase5_rul" / "outputs"

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
    c for c in df.columns
    if c not in EXCLUDED
]

# Train on all development engines for exploratory
# feature importance only. This is not validation.
X = df[features]
y = df[TARGET]

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

model.fit(X, y)

importance = pd.DataFrame({
    "feature": features,
    "importance": model.feature_importances_,
})

importance = importance.sort_values(
    "importance", ascending=False
)

importance.to_csv(
    OUTPUT_DIR / "xgboost_feature_importance.csv",
    index=False,
)

print("\nTOP 20 FEATURES")
print(importance.head(20).to_string(index=False))

print("\nSaved feature importance report.")
