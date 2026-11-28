"""
ParkSMART - Forecasting Model Evaluation (File 111 / M2 Ownership)

Responsibility:
Evaluates forecasting baseline models without temporal data leakage:
- Temporal train/test splitting and rolling walk-forward cross-validation.
- Computes standard error metrics: MAE, RMSE, MAPE, and Prediction Interval Coverage.
- Never allows future target observations to leak into model fitting or feature sets.
"""

from __future__ import annotations

import logging
from datetime import datetime
from typing import Any

import numpy as np

from app.modules.forecast.baselines import ForecastPoint, parse_to_utc

logger = logging.getLogger("parksmart.forecast.evaluation")


def temporal_train_test_split(
    records: list[dict[str, Any]],
    cutoff_time: datetime | str,
) -> tuple[list[dict[str, Any]], list[dict[str, Any]]]:
    """
    Splits time-series records strictly by timestamp cutoff without leakage.
    Train: strictly before cutoff_time.
    Test: at or after cutoff_time.
    """
    cutoff = parse_to_utc(cutoff_time)
    train: list[dict[str, Any]] = []
    test: list[dict[str, Any]] = []

    for r in records:
        raw_ts = r.get("bucket_start") or r.get("ts")
        if not raw_ts:
            continue
        ts = parse_to_utc(raw_ts)
        if ts < cutoff:
            train.append(r)
        else:
            test.append(r)

    train.sort(key=lambda x: parse_to_utc(x.get("bucket_start") or x.get("ts")))
    test.sort(key=lambda x: parse_to_utc(x.get("bucket_start") or x.get("ts")))
    return train, test


def compute_mae(y_true: np.ndarray, y_pred: np.ndarray) -> float:
    """Computes Mean Absolute Error."""
    if len(y_true) == 0:
        return 0.0
    return float(np.mean(np.abs(y_true - y_pred)))


def compute_rmse(y_true: np.ndarray, y_pred: np.ndarray) -> float:
    """Computes Root Mean Square Error."""
    if len(y_true) == 0:
        return 0.0
    return float(np.sqrt(np.mean((y_true - y_pred) ** 2)))


def compute_mape(y_true: np.ndarray, y_pred: np.ndarray, epsilon: float = 1.0) -> float:
    """
    Computes Mean Absolute Percentage Error (MAPE).
    Uses epsilon in denominator to avoid division by zero when actual occupancy is 0%.
    """
    if len(y_true) == 0:
        return 0.0
    denom = np.maximum(np.abs(y_true), epsilon)
    return float(np.mean(np.abs((y_true - y_pred) / denom)) * 100.0)


def compute_interval_coverage(
    y_true: np.ndarray,
    lower_bounds: np.ndarray,
    upper_bounds: np.ndarray,
) -> float:
    """Computes empirical coverage ratio: fraction of actuals inside [lower, upper]."""
    if len(y_true) == 0:
        return 0.0
    covered = (y_true >= lower_bounds) & (y_true <= upper_bounds)
    return float(np.mean(covered))


def evaluate_predictions(
    actuals: list[float],
    forecasts: list[ForecastPoint],
) -> dict[str, float]:
    """
    Computes full evaluation metrics dictionary between actual values and ForecastPoints.
    """
    if not actuals or not forecasts:
        return {"mae": 0.0, "rmse": 0.0, "mape": 0.0, "coverage": 0.0, "count": 0.0}

    n = min(len(actuals), len(forecasts))
    y_true = np.array(actuals[:n], dtype=float)
    y_pred = np.array([f.mean for f in forecasts[:n]], dtype=float)

    # Uncertainty bounds
    lowers = np.array([f.lower if f.lower is not None else f.mean for f in forecasts[:n]], dtype=float)
    uppers = np.array([f.upper if f.upper is not None else f.mean for f in forecasts[:n]], dtype=float)

    mae_val = round(compute_mae(y_true, y_pred), 3)
    rmse_val = round(compute_rmse(y_true, y_pred), 3)
    mape_val = round(compute_mape(y_true, y_pred), 3)
    cov_val = round(compute_interval_coverage(y_true, lowers, uppers), 3)

    return {
        "mae": mae_val,
        "rmse": rmse_val,
        "mape": mape_val,
        "coverage": cov_val,
        "count": float(n),
    }


def evaluate_baseline_model(
    model: Any,
    train_records: list[dict[str, Any]],
    test_records: list[dict[str, Any]],
    target_metric: str = "occupancy_pct",
) -> dict[str, float]:
    """
    Fits model strictly on train_records, predicts timestamps from test_records,
    and returns evaluation metrics.
    """
    # Fit strictly on train
    model.fit(train_records)

    test_timestamps = [r.get("bucket_start") or r.get("ts") for r in test_records]
    actuals = [float(r[target_metric]) for r in test_records if target_metric in r]

    predictions = model.predict(test_timestamps)
    return evaluate_predictions(actuals, predictions)


def detect_dataset_provenance(records: list[dict[str, Any]]) -> str:
    """Detects whether dataset is simulated, observed, mixed, or none."""
    if not records:
        return "none"
    provs = {r.get("provenance") for r in records if r.get("provenance")}
    if "simulated" in provs and "observed" in provs:
        return "mixed"
    if "simulated" in provs:
        return "simulated"
    if "observed" in provs:
        return "observed"
    return "simulated"


def walk_forward_backtest(
    model_factory: Any,
    history: list[dict[str, Any]],
    initial_train_days: int = 14,
    horizon_hours: int = 24,
    step_hours: int = 24,
    target_metric: str = "occupancy_pct",
) -> dict[str, Any]:
    """
    Executes rolling origin walk-forward cross-validation across chronological time series.
    Guarantees strict zero-leakage: model at step k trains strictly on data prior to cutoff_k.

    Parameters:
      model_factory: Class or callable returning a fresh baseline model instance (e.g. HistoricAverageBaseline)
      history: Chronological aggregate records
      initial_train_days: Minimum days of history required before first evaluation fold
      horizon_hours: Number of hours ahead to forecast per fold (default: 24)
      step_hours: Step size to advance cutoff between folds (default: 24)
      target_metric: Target metric to evaluate

    Returns:
      Summary dict containing mean MAE, RMSE, MAPE, coverage, number of folds, and provenance.
    """
    if not history:
        return {
            "status": "empty_history",
            "folds_count": 0,
            "mean_mae": None,
            "mean_rmse": None,
            "mean_mape": None,
            "mean_coverage": None,
            "provenance": "none",
        }

    # Clean and sort history chronologically
    valid_records: list[dict[str, Any]] = []
    for r in history:
        raw_ts = r.get("bucket_start") or r.get("ts")
        if raw_ts and r.get(target_metric) is not None:
            try:
                parse_to_utc(raw_ts)
                valid_records.append(r)
            except (ValueError, TypeError) as exc:
                logger.debug("Skipping record with invalid timestamp %r: %s", raw_ts, exc)
                continue

    if not valid_records:
        return {
            "status": "no_valid_records",
            "folds_count": 0,
            "mean_mae": None,
            "mean_rmse": None,
            "mean_mape": None,
            "mean_coverage": None,
            "provenance": "none",
        }

    valid_records.sort(key=lambda x: parse_to_utc(x.get("bucket_start") or x.get("ts")))
    min_ts = parse_to_utc(valid_records[0].get("bucket_start") or valid_records[0].get("ts"))
    max_ts = parse_to_utc(valid_records[-1].get("bucket_start") or valid_records[-1].get("ts"))

    total_days = (max_ts - min_ts).total_seconds() / 86400.0
    min_required_days = initial_train_days + (horizon_hours / 24.0)

    if total_days < min_required_days:
        return {
            "status": "insufficient_history",
            "folds_count": 0,
            "history_days": round(total_days, 1),
            "required_days": round(min_required_days, 1),
            "mean_mae": None,
            "mean_rmse": None,
            "mean_mape": None,
            "mean_coverage": None,
            "provenance": detect_dataset_provenance(valid_records),
        }

    from datetime import timedelta
    step_td = timedelta(hours=step_hours)
    horizon_td = timedelta(hours=horizon_hours)

    current_cutoff = min_ts + timedelta(days=initial_train_days)
    fold_metrics: list[dict[str, float]] = []

    while current_cutoff + horizon_td <= max_ts + timedelta(hours=1):
        # 1. Strictly chronological train split (strictly before cutoff)
        train_records = [
            r for r in valid_records
            if parse_to_utc(r.get("bucket_start") or r.get("ts")) < current_cutoff
        ]

        # 2. Evaluation split [current_cutoff, current_cutoff + horizon_td)
        test_records = [
            r for r in valid_records
            if current_cutoff <= parse_to_utc(r.get("bucket_start") or r.get("ts")) < current_cutoff + horizon_td
        ]

        if len(test_records) >= (horizon_hours // 2):
            model = model_factory(target_metric=target_metric) if callable(model_factory) else model_factory
            metrics = evaluate_baseline_model(
                model=model,
                train_records=train_records,
                test_records=test_records,
                target_metric=target_metric,
            )
            if metrics.get("count", 0) > 0:
                fold_metrics.append(metrics)

        current_cutoff += step_td

    if not fold_metrics:
        return {
            "status": "insufficient_evaluation_samples",
            "folds_count": 0,
            "mean_mae": None,
            "mean_rmse": None,
            "mean_mape": None,
            "mean_coverage": None,
            "provenance": detect_dataset_provenance(valid_records),
        }

    avg_mae = round(float(np.mean([m["mae"] for m in fold_metrics])), 3)
    avg_rmse = round(float(np.mean([m["rmse"] for m in fold_metrics])), 3)
    avg_mape = round(float(np.mean([m["mape"] for m in fold_metrics])), 3)
    avg_cov = round(float(np.mean([m["coverage"] for m in fold_metrics])), 3)

    return {
        "status": "ok",
        "folds_count": len(fold_metrics),
        "mean_mae": avg_mae,
        "mean_rmse": avg_rmse,
        "mean_mape": avg_mape,
        "mean_coverage": avg_cov,
        "history_days": round(total_days, 1),
        "provenance": detect_dataset_provenance(valid_records),
    }
