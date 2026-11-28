
import itertools
import json
from pathlib import Path

import numpy as np
import pandas as pd
from xgboost import XGBRegressor
from sklearn.metrics import mean_absolute_error, mean_squared_error, r2_score

# --------------------------------------------------
# PATHS
# --------------------------------------------------

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

# --------------------------------------------------
# LOAD DATA
# --------------------------------------------------

df = pd.read_csv(DATA_PATH)

features = [
    col for col in df.columns
    if col not in EXCLUDED
]

engines = sorted(df["unit"].unique())

print("Dataset shape:", df.shape)
print("Predictor count:", len(features))
print("Engines:", engines)

if len(features) != 72:
    raise ValueError(
        f"Expected 72 predictors, found {len(features)}"
    )

if not np.isfinite(df[features].to_numpy()).all():
    raise ValueError("Predictors contain NaN or infinite values.")

if not np.isfinite(df[TARGET].to_numpy()).all():
    raise ValueError("Target contains NaN or infinite values.")

# --------------------------------------------------
# HYPERPARAMETER CONFIGURATIONS
# --------------------------------------------------

depths = [2, 3, 4, 5]
learning_rates = [0.01, 0.03, 0.05]
estimators = [200, 400, 600]

configurations = list(
    itertools.product(
        depths,
        learning_rates,
        estimators
    )
)

print("\nConfigurations to test:", len(configurations))
print("Total model fits:", len(configurations) * len(engines))

# --------------------------------------------------
# LEAVE-ONE-ENGINE-OUT TUNING
# --------------------------------------------------

all_results = []

for config_number, (depth, rate, trees) in enumerate(
    configurations, start=1
):

    fold_mae = []
    fold_rmse = []
    fold_r2 = []

    for engine in engines:

        train = df[df["unit"] != engine]
        validation = df[df["unit"] == engine]

        X_train = train[features]
        y_train = train[TARGET]

        X_val = validation[features]
        y_val = validation[TARGET]

        model = XGBRegressor(
            objective="reg:squarederror",
            n_estimators=trees,
            max_depth=depth,
            learning_rate=rate,
            subsample=0.85,
            colsample_bytree=0.85,
            reg_lambda=2.0,
            random_state=42,
            n_jobs=-1,
        )

        model.fit(X_train, y_train)

        predictions = model.predict(X_val)

        fold_mae.append(
            mean_absolute_error(y_val, predictions)
        )

        fold_rmse.append(
            np.sqrt(mean_squared_error(y_val, predictions))
        )

        fold_r2.append(
            r2_score(y_val, predictions)
        )

    result = {
        "configuration": config_number,
        "max_depth": depth,
        "learning_rate": rate,
        "n_estimators": trees,
        "mean_MAE": float(np.mean(fold_mae)),
        "std_MAE": float(np.std(fold_mae)),
        "mean_RMSE": float(np.mean(fold_rmse)),
        "std_RMSE": float(np.std(fold_rmse)),
        "mean_R2": float(np.mean(fold_r2)),
        "std_R2": float(np.std(fold_r2)),
    }

    all_results.append(result)

    print(
        f"[{config_number:02d}/{len(configurations)}] "
        f"depth={depth}, "
        f"lr={rate}, "
        f"trees={trees} | "
        f"MAE={result['mean_MAE']:.4f}, "
        f"RMSE={result['mean_RMSE']:.4f}, "
        f"R2={result['mean_R2']:.4f}"
    )

# --------------------------------------------------
# RANK RESULTS
# --------------------------------------------------

results_df = pd.DataFrame(all_results)

results_df = results_df.sort_values(
    by=["mean_MAE", "mean_RMSE"],
    ascending=True
).reset_index(drop=True)

results_df.to_csv(
    OUTPUT_DIR / "xgboost_tuning_results.csv",
    index=False
)

best = results_df.iloc[0].to_dict()

summary = {
    "validation_method": "Leave-One-Engine-Out",
    "selection_metric": "Mean MAE",
    "target": TARGET,
    "predictor_count": len(features),
    "configurations_tested": len(configurations),
    "best_configuration": {
        "max_depth": int(best["max_depth"]),
        "learning_rate": float(best["learning_rate"]),
        "n_estimators": int(best["n_estimators"]),
        "subsample": 0.85,
        "colsample_bytree": 0.85,
        "reg_lambda": 2.0,
        "random_state": 42,
    },
    "best_mean_MAE": float(best["mean_MAE"]),
    "best_std_MAE": float(best["std_MAE"]),
    "best_mean_RMSE": float(best["mean_RMSE"]),
    "best_std_RMSE": float(best["std_RMSE"]),
    "best_mean_R2": float(best["mean_R2"]),
    "best_std_R2": float(best["std_R2"]),
}

with open(
    OUTPUT_DIR / "xgboost_tuning_best.json",
    "w"
) as f:
    json.dump(summary, f, indent=4)

print("\n" + "=" * 65)
print("TOP 10 CONFIGURATIONS")
print("=" * 65)

print(
    results_df.head(10).to_string(index=False)
)

print("\nBEST CONFIGURATION")
print(json.dumps(summary, indent=4))

print("\nSaved:")
print(OUTPUT_DIR / "xgboost_tuning_results.csv")
print(OUTPUT_DIR / "xgboost_tuning_best.json")
