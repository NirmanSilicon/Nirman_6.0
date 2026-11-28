"""
ParkSMART - Forecasting Module (File 106 / M2 Ownership)

Public exports for baseline forecasting, evaluation, service, repository, and router.
"""

from app.modules.forecast.baselines import (
    ForecastPoint,
    HistoricAverageBaseline,
    PersistenceBaseline,
    SeasonalNaiveBaseline,
    residual_std,
)
from app.modules.forecast.evaluation import (
    compute_interval_coverage,
    compute_mae,
    compute_mape,
    compute_rmse,
    detect_dataset_provenance,
    evaluate_baseline_model,
    evaluate_predictions,
    temporal_train_test_split,
    walk_forward_backtest,
)
from app.modules.forecast.repository import (
    MIN_HISTORY_DAYS,
    MIN_USABLE_DAYS,
    ForecastRepository,
    get_forecast_repository,
)
from app.modules.forecast.router import (
    handle_get_forecast_models,
    handle_get_zone_forecast,
    router,
)
from app.modules.forecast.service import (
    PointForecast,
    generate_forecast_for_zone,
    list_registered_models,
    point_forecast,
)

__all__ = [
    "MIN_HISTORY_DAYS",
    "MIN_USABLE_DAYS",
    "ForecastPoint",
    "ForecastRepository",
    "HistoricAverageBaseline",
    "PersistenceBaseline",
    "PointForecast",
    "SeasonalNaiveBaseline",
    "compute_interval_coverage",
    "compute_mae",
    "compute_mape",
    "compute_rmse",
    "detect_dataset_provenance",
    "evaluate_baseline_model",
    "evaluate_predictions",
    "generate_forecast_for_zone",
    "get_forecast_repository",
    "handle_get_forecast_models",
    "handle_get_zone_forecast",
    "list_registered_models",
    "point_forecast",
    "residual_std",
    "router",
    "temporal_train_test_split",
    "walk_forward_backtest",
]
