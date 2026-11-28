
import json
from pathlib import Path

import numpy as np
import pandas as pd
import xgboost as xgb
from sklearn.metrics import mean_absolute_error, mean_squared_error, r2_score


# --------------------------------------------------
# PATHS AND CONFIGURATION
# --------------------------------------------------

ROOT = Path(__file__).resolve().parents[1]

DATA_FILE = (
    ROOT
    / "phase4_ncmapss"
    / "data"
    / "processed"
    / "ncmapss_ds05_dev_flights.csv"
)

OUTPUT_DIR = ROOT / "phase5_rul" / "outputs" / "asymmetric_experiment"
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

PENALTIES = [1.0, 1.5, 2.0, 3.0]

PARAMETERS = {
    "n_estimators": 600,
    "max_depth": 4,
    "learning_rate": 0.03,
    "subsample": 0.85,
    "colsample_bytree": 0.85,
    "reg_lambda": 2.0,
    "random_state": 42,
    "n_jobs": -1,
}


# --------------------------------------------------
# ASYMMETRIC LOSS
# --------------------------------------------------

def make_asymmetric_objective(alpha):
    """
    Penalize RUL overestimation alpha times more
    heavily than underestimation.

    error = prediction - actual
    """

    def asymmetric_objective(y_true, y_pred):

        error = y_pred - y_true

        weights = np.where(error > 0, alpha, 1.0)

        gradient = 2.0 * weights * error
        hessian = 2.0 * weights

        return gradient, hessian

    return asymmetric_objective


# --------------------------------------------------
# METRICS
# --------------------------------------------------

def calculate_metrics(actual, predicted):

    errors = predicted - actual

    return {
        "MAE": float(mean_absolute_error(actual, predicted)),
        "RMSE": float(
            np.sqrt(mean_squared_error(actual, predicted))
        ),
        "R2": float(r2_score(actual, predicted)),
        "Mean_Error": float(np.mean(errors)),
        "Overestimate_Above_10_Pct": float(
            np.mean(errors > 10) * 100
        ),
        "Underestimate_Above_10_Pct": float(
            np.mean(errors < -10) * 100
        ),
    }


# --------------------------------------------------
# LOAD DATA
# --------------------------------------------------

print("\nLoading DS05 development data...")

df = pd.read_csv(DATA_FILE)

if TARGET not in df.columns:
    raise ValueError(f"Target column '{TARGET}' not found.")

if "unit" not in df.columns:
    raise ValueError("Expected engine identifier column 'unit'.")

feature_columns = [
    column
    for column in df.columns
    if column not in EXCLUDED_COLUMNS
    and column.endswith(("_mean", "_std", "_min", "_max"))
]

if len(feature_columns) != 72:
    raise ValueError(
        f"Expected 72 features, found {len(feature_columns)}."
    )

if df[feature_columns + [TARGET]].isna().any().any():
    raise ValueError("Missing values detected.")

if not np.isfinite(
    df[feature_columns + [TARGET]].to_numpy(dtype=float)
).all():
    raise ValueError("Infinite values detected.")

engines = [int(x) for x in sorted(df["unit"].unique())]

if engines != [1, 2, 3, 4, 5, 6]:
    raise ValueError(
        f"Unexpected development engines: {engines}"
    )

print("Rows:", len(df))
print("Features:", len(feature_columns))
print("Engines:", engines)
print("XGBoost version:", xgb.__version__)


# --------------------------------------------------
# LEAVE-ONE-ENGINE-OUT EXPERIMENT
# --------------------------------------------------

all_predictions = []
summary_rows = []

for alpha in PENALTIES:

    print("\n" + "=" * 60)
    print(f"RUNNING OVERESTIMATION PENALTY: {alpha}x")
    print("=" * 60)

    alpha_predictions = []

    for held_out_engine in engines:

        train_df = df[df["unit"] != held_out_engine]
        valid_df = df[df["unit"] == held_out_engine]

        X_train = train_df[feature_columns]
        y_train = train_df[TARGET]

        X_valid = valid_df[feature_columns]
        y_valid = valid_df[TARGET]

        model = xgb.XGBRegressor(
            **PARAMETERS,
            objective=make_asymmetric_objective(alpha),
        )

        model.fit(X_train, y_train)

        predictions = model.predict(X_valid)

        fold_output = pd.DataFrame({
            "penalty": alpha,
            "engine": held_out_engine,
            "cycle": valid_df["cycle"].to_numpy(),
            "actual_rul": y_valid.to_numpy(),
            "predicted_rul": predictions,
        })

        fold_output["error"] = (
            fold_output["predicted_rul"]
            - fold_output["actual_rul"]
        )

        fold_output["absolute_error"] = (
            fold_output["error"].abs()
        )

        alpha_predictions.append(fold_output)

        fold_metrics = calculate_metrics(
            y_valid.to_numpy(),
            predictions,
        )

        print(
            f"Engine {held_out_engine}: "
            f"MAE={fold_metrics['MAE']:.3f}, "
            f"RMSE={fold_metrics['RMSE']:.3f}, "
            f"R2={fold_metrics['R2']:.3f}"
        )

    predictions_df = pd.concat(
        alpha_predictions,
        ignore_index=True,
    )

    all_predictions.append(predictions_df)

    # Overall pooled metrics
    overall = calculate_metrics(
        predictions_df["actual_rul"],
        predictions_df["predicted_rul"],
    )

    # Critical low-RUL subset
    low_rul = predictions_df[
        predictions_df["actual_rul"] <= 20
    ]

    low_rul_metrics = calculate_metrics(
        low_rul["actual_rul"],
        low_rul["predicted_rul"],
    )

    overall["penalty"] = alpha
    overall["Low_RUL_MAE"] = low_rul_metrics["MAE"]
    overall["Low_RUL_Mean_Error"] = low_rul_metrics["Mean_Error"]
    overall["Low_RUL_Overestimate_Above_5_Pct"] = float(
        (low_rul["error"] > 5).mean() * 100
    )
    overall["Low_RUL_Overestimate_Above_10_Pct"] = float(
        (low_rul["error"] > 10).mean() * 100
    )
    overall["Low_RUL_Overestimate_Above_20_Pct"] = float(
        (low_rul["error"] > 20).mean() * 100
    )
    overall["Low_RUL_Max_Overestimate"] = float(
        low_rul["error"].max()
    )

    summary_rows.append(overall)

    prediction_path = (
        OUTPUT_DIR / f"predictions_alpha_{alpha}.csv"
    )

    predictions_df.to_csv(prediction_path, index=False)

    print("\nPooled results:")
    for key, value in overall.items():
        if key != "penalty":
            print(f"{key}: {value:.4f}")

    print("Saved:", prediction_path)


# --------------------------------------------------
# SAVE FINAL COMPARISON
# --------------------------------------------------

summary_df = pd.DataFrame(summary_rows)

summary_df = summary_df.sort_values(
    "MAE",
    ascending=True,
)

summary_path = OUTPUT_DIR / "asymmetric_comparison.csv"

summary_df.to_csv(summary_path, index=False)

all_predictions_df = pd.concat(
    all_predictions,
    ignore_index=True,
)

all_predictions_df.to_csv(
    OUTPUT_DIR / "all_asymmetric_predictions.csv",
    index=False,
)

metadata = {
    "experiment": "Asymmetric XGBoost RUL",
    "dataset": "NASA N-CMAPSS DS05",
    "target": TARGET,
    "feature_count": len(feature_columns),
    "features": feature_columns,
    "validation": "Leave-One-Engine-Out",
    "development_engines": engines,
    "penalties": PENALTIES,
    "parameters": PARAMETERS,
    "objective": (
        "Asymmetric squared error; "
        "overestimation receives alpha times the penalty"
    ),
    "test_engines_used": False,
}

with open(
    OUTPUT_DIR / "experiment_metadata.json",
    "w",
    encoding="utf-8",
) as file:
    json.dump(metadata, file, indent=4)


print("\n" + "=" * 60)
print("FINAL MODEL COMPARISON")
print("=" * 60)

print(
    summary_df[
        [
            "penalty",
            "MAE",
            "RMSE",
            "R2",
            "Low_RUL_MAE",
            "Low_RUL_Overestimate_Above_10_Pct",
            "Low_RUL_Max_Overestimate",
        ]
    ].round(3).to_string(index=False)
)

print("\nResults saved in:", OUTPUT_DIR)
print("\nExperiment completed.")
