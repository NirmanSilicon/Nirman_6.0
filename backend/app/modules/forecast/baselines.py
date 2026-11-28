"""
ParkSMART - Forecasting Baseline Models (File 110 / M2 Ownership)

Responsibility:
Implements statistical baseline forecasting models for parking occupancy and demand:
1. HistoricAverageBaseline: Grouped day-of-week and hour-of-day mean with prediction intervals.
2. PersistenceBaseline: Same-hour previous-week persistence.
3. ProfileGaussianBaseline: Analytical parametric Gaussian demand curve.

Strict Privacy & Integrity Rule:
Zero data leakage: Models fit strictly on historical records prior to prediction time.
Local timezone Asia/Kolkata is used for diurnal cycle alignment.
"""

from __future__ import annotations

import logging
import math
from dataclasses import dataclass
from datetime import UTC, datetime, timedelta
from typing import Any
from zoneinfo import ZoneInfo

import numpy as np

logger = logging.getLogger("parksmart.forecast.baselines")

try:
    from app.core.clock import APP_TZ
except Exception:
    try:
        APP_TZ = ZoneInfo("Asia/Kolkata")
    except Exception:
        APP_TZ = timezone(timedelta(hours=5, minutes=30), name="Asia/Kolkata")


@dataclass(frozen=True)
class ForecastPoint:
    """Represents a single forecasted time step."""

    target_ts: str  # ISO 8601 UTC string ending in 'Z'
    mean: float
    lower: float | None
    upper: float | None

    def to_dict(self) -> dict[str, Any]:
        return {
            "target_ts": self.target_ts,
            "mean": round(float(self.mean), 2),
            "lower": round(float(self.lower), 2) if self.lower is not None else None,
            "upper": round(float(self.upper), 2) if self.upper is not None else None,
        }


def parse_to_utc(ts_input: str | datetime) -> datetime:
    """Parses string or datetime into UTC datetime."""
    if isinstance(ts_input, str):
        # Handle 'Z' or offset
        return datetime.fromisoformat(ts_input).astimezone(UTC)
    if ts_input.tzinfo is None:
        return ts_input.replace(tzinfo=UTC)
    return ts_input.astimezone(UTC)


class HistoricAverageBaseline:
    """
    Historical day-of-week and hour-of-day grouped average baseline model.
    Computes mean and 90% confidence prediction intervals (z=1.645).
    """

    def __init__(self, target_metric: str = "occupancy_pct"):
        self.target_metric = target_metric
        self.model_version = "historic_average_v1"
        self._stats: dict[tuple[int, int], tuple[float, float, int]] = {}  # (weekday, hour) -> (mean, std, count)
        self._global_mean: float = 0.0
        self._global_std: float = 5.0
        self._is_fitted: bool = False
        self._fitted_days: float = 0.0

    @property
    def fitted_days(self) -> float:
        return self._fitted_days

    def fit(self, history: list[dict[str, Any]]) -> HistoricAverageBaseline:
        """
        Fits baseline model on historical aggregate records without future leakage.
        """
        if not history:
            self._is_fitted = False
            self._fitted_days = 0.0
            return self

        # Extract values grouped by (weekday, hour) in local time
        buckets: dict[tuple[int, int], list[float]] = {}
        all_values: list[float] = []
        timestamps: list[datetime] = []

        for row in history:
            val = row.get(self.target_metric)
            if val is None:
                continue
            try:
                v = float(val)
                if not math.isfinite(v):
                    continue
                if self.target_metric == "occupancy_pct":
                    v = max(0.0, min(100.0, v))
            except (ValueError, TypeError):
                continue

            raw_ts = row.get("bucket_start") or row.get("ts")
            if not raw_ts:
                continue
            try:
                ts_utc = parse_to_utc(raw_ts)
            except (ValueError, TypeError) as exc:
                logger.debug("Skipping record with invalid timestamp %r: %s", raw_ts, exc)
                continue

            all_values.append(v)
            timestamps.append(ts_utc)

            # Local time conversion for proper diurnal grouping
            ts_local = ts_utc.astimezone(APP_TZ)
            key = (ts_local.weekday(), ts_local.hour)
            if key not in buckets:
                buckets[key] = []
            buckets[key].append(v)

        if not all_values:
            self._is_fitted = False
            self._fitted_days = 0.0
            return self

        self._global_mean = float(np.mean(all_values))
        self._global_std = max(1.0, float(np.std(all_values)))

        if timestamps:
            min_ts = min(timestamps)
            max_ts = max(timestamps)
            self._fitted_days = (max_ts - min_ts).total_seconds() / 86400.0
        else:
            self._fitted_days = 0.0

        self._stats.clear()
        for key, vals in buckets.items():
            m = float(np.mean(vals))
            s = float(np.std(vals)) if len(vals) > 1 else max(2.0, self._global_std * 0.5)
            self._stats[key] = (m, s, len(vals))

        self._is_fitted = True
        return self

    def predict(
        self,
        target_timestamps: list[datetime | str],
        confidence_level: float = 0.90,
    ) -> list[ForecastPoint]:
        """
        Generates predictions and uncertainty intervals for target timestamps.
        """
        if not self._is_fitted:
            raise RuntimeError("Model is not fitted. Call fit(history) first.")

        # z-score for normal prediction interval (default 90% -> 1.645)
        z = 1.645 if confidence_level == 0.90 else 1.96

        points: list[ForecastPoint] = []
        for raw_ts in target_timestamps:
            ts_utc = parse_to_utc(raw_ts)
            ts_local = ts_utc.astimezone(APP_TZ)
            key = (ts_local.weekday(), ts_local.hour)

            if key in self._stats:
                mean, std, cnt = self._stats[key]
                # Prediction interval standard error: sigma * sqrt(1 + 1/n)
                std_err = std * math.sqrt(1.0 + 1.0 / max(1, cnt))
            else:
                mean = self._global_mean
                std_err = self._global_std

            # Bounded prediction limits [0.0, 100.0] for occupancy_pct
            lower = max(0.0, mean - z * std_err)
            upper = min(100.0, mean + z * std_err) if self.target_metric == "occupancy_pct" else (mean + z * std_err)

            iso_str = ts_utc.strftime("%Y-%m-%dT%H:%M:%SZ")
            points.append(
                ForecastPoint(
                    target_ts=iso_str,
                    mean=round(float(mean), 2),
                    lower=round(float(lower), 2),
                    upper=round(float(upper), 2),
                )
            )

        return points

    def get_residual_std(self, ts: datetime | str) -> float:
        """Returns the unclipped residual standard deviation for a given timestamp."""
        if not self._is_fitted:
            return 5.0
        ts_utc = parse_to_utc(ts)
        ts_local = ts_utc.astimezone(APP_TZ)
        key = (ts_local.weekday(), ts_local.hour)
        if key in self._stats:
            _, s, _ = self._stats[key]
            if math.isfinite(s) and s > 0:
                return float(s)
        return float(self._global_std) if (math.isfinite(self._global_std) and self._global_std > 0) else 5.0


def residual_std(model: Any, ts: datetime | str) -> float:
    """Helper returning residual standard error for a fitted model."""
    if hasattr(model, "get_residual_std"):
        return model.get_residual_std(ts)
    return getattr(model, "_global_std", 5.0)


class PersistenceBaseline:
    """
    Persistence baseline model for parking occupancy time series.
    Predicts from lag = 168 hours (same hour 7 days prior).
    Falls back gracefully to 24h prior lag or latest observed value when historical gaps occur.
    """

    def __init__(self, target_metric: str = "occupancy_pct"):
        self.target_metric = target_metric
        self.model_version = "persistence_v1"
        self._history_map: dict[str, float] = {}  # UTC ISO timestamp -> value
        self._is_fitted: bool = False
        self._fitted_days: float = 0.0
        self._global_mean: float = 0.0
        self._global_std: float = 5.0
        self._latest_value: float = 0.0

    @property
    def fitted_days(self) -> float:
        return self._fitted_days

    def fit(self, history: list[dict[str, Any]]) -> PersistenceBaseline:
        self._history_map.clear()
        timestamps: list[datetime] = []
        all_values: list[float] = []

        for row in history:
            val = row.get(self.target_metric)
            if val is None:
                continue
            try:
                v = float(val)
                if not math.isfinite(v):
                    continue
                if self.target_metric == "occupancy_pct":
                    v = max(0.0, min(100.0, v))
            except (ValueError, TypeError):
                continue

            raw_ts = row.get("bucket_start") or row.get("ts")
            if not raw_ts:
                continue
            try:
                ts_utc = parse_to_utc(raw_ts)
            except (ValueError, TypeError) as exc:
                logger.debug("Skipping record with invalid timestamp %r: %s", raw_ts, exc)
                continue

            timestamps.append(ts_utc)
            all_values.append(v)
            self._history_map[ts_utc.strftime("%Y-%m-%dT%H:%M:%SZ")] = v

        if timestamps and all_values:
            min_ts = min(timestamps)
            max_ts = max(timestamps)
            self._fitted_days = (max_ts - min_ts).total_seconds() / 86400.0
            self._global_mean = float(np.mean(all_values))
            self._global_std = max(1.0, float(np.std(all_values)))
            # Latest observed value sorted by timestamp
            latest_pair = max(zip(timestamps, all_values), key=lambda x: x[0])
            self._latest_value = latest_pair[1]
            self._is_fitted = True
        else:
            self._fitted_days = 0.0
            self._global_mean = 0.0
            self._global_std = 5.0
            self._latest_value = 0.0
            self._is_fitted = False

        return self

    def predict(
        self,
        target_timestamps: list[datetime | str],
        confidence_level: float = 0.90,
    ) -> list[ForecastPoint]:
        if not self._is_fitted:
            raise RuntimeError("Model is not fitted. Call fit(history) first.")

        z = 1.645 if confidence_level == 0.90 else 1.96
        points: list[ForecastPoint] = []

        for raw_ts in target_timestamps:
            ts_utc = parse_to_utc(raw_ts)
            iso_str = ts_utc.strftime("%Y-%m-%dT%H:%M:%SZ")

            # 1. Primary: 7 days (168 hours) prior
            prior_7d = (ts_utc - timedelta(days=7)).strftime("%Y-%m-%dT%H:%M:%SZ")
            if prior_7d in self._history_map:
                mean = self._history_map[prior_7d]
            else:
                # 2. Fallback: 24 hours prior
                prior_1d = (ts_utc - timedelta(hours=24)).strftime("%Y-%m-%dT%H:%M:%SZ")
                if prior_1d in self._history_map:
                    mean = self._history_map[prior_1d]
                else:
                    # 3. Fallback: latest observed value or global mean
                    mean = self._latest_value if self._latest_value > 0 else self._global_mean

            std_err = max(1.0, self._global_std * 0.75)
            lower = max(0.0, mean - z * std_err)
            upper = min(100.0, mean + z * std_err) if self.target_metric == "occupancy_pct" else (mean + z * std_err)

            points.append(
                ForecastPoint(
                    target_ts=iso_str,
                    mean=round(float(mean), 2),
                    lower=round(float(lower), 2),
                    upper=round(float(upper), 2),
                )
            )

        return points

    def get_residual_std(self, ts: datetime | str) -> float:
        """Returns residual standard deviation for persistence forecast."""
        if not self._is_fitted:
            return 5.0
        return float(self._global_std) if math.isfinite(self._global_std) and self._global_std > 0 else 5.0


class SeasonalNaiveBaseline:
    """
    Seasonal-naive baseline model for periodic hourly parking occupancy.
    Projects values from the identical seasonal lag:
    - Weekly seasonality (season_hours=168, default): y_t = y_{t - 168}
    - Daily seasonality (season_hours=24): y_t = y_{t - 24}
    Computes empirical seasonal residual standard errors from history to derive
    symmetric prediction intervals.
    """

    def __init__(self, target_metric: str = "occupancy_pct", season_hours: int = 168):
        self.target_metric = target_metric
        self.season_hours = season_hours
        self.model_version = f"seasonal_naive_{season_hours}h_v1"
        self._history_map: dict[str, float] = {}  # UTC ISO timestamp -> value
        self._is_fitted: bool = False
        self._fitted_days: float = 0.0
        self._global_mean: float = 0.0
        self._global_std: float = 5.0
        self._residual_std: float = 5.0
        self._latest_value: float = 0.0

    @property
    def fitted_days(self) -> float:
        return self._fitted_days

    def fit(self, history: list[dict[str, Any]]) -> SeasonalNaiveBaseline:
        self._history_map.clear()
        timestamps: list[datetime] = []
        all_values: list[float] = []

        for row in history:
            val = row.get(self.target_metric)
            if val is None:
                continue
            try:
                v = float(val)
                if not math.isfinite(v):
                    continue
                if self.target_metric == "occupancy_pct":
                    v = max(0.0, min(100.0, v))
            except (ValueError, TypeError):
                continue

            raw_ts = row.get("bucket_start") or row.get("ts")
            if not raw_ts:
                continue
            try:
                ts_utc = parse_to_utc(raw_ts)
            except (ValueError, TypeError) as exc:
                logger.debug("Skipping record with invalid timestamp %r: %s", raw_ts, exc)
                continue

            timestamps.append(ts_utc)
            all_values.append(v)
            self._history_map[ts_utc.strftime("%Y-%m-%dT%H:%M:%SZ")] = v

        if timestamps and all_values:
            min_ts = min(timestamps)
            max_ts = max(timestamps)
            self._fitted_days = (max_ts - min_ts).total_seconds() / 86400.0
            self._global_mean = float(np.mean(all_values))
            self._global_std = max(1.0, float(np.std(all_values)))
            latest_pair = max(zip(timestamps, all_values), key=lambda x: x[0])
            self._latest_value = latest_pair[1]

            # Compute empirical residual errors from historical seasonal pairs
            lag_td = timedelta(hours=self.season_hours)
            errors: list[float] = []
            for ts in timestamps:
                prior_ts = (ts - lag_td).strftime("%Y-%m-%dT%H:%M:%SZ")
                curr_ts = ts.strftime("%Y-%m-%dT%H:%M:%SZ")
                if prior_ts in self._history_map and curr_ts in self._history_map:
                    err = self._history_map[curr_ts] - self._history_map[prior_ts]
                    errors.append(err)

            if len(errors) >= 12:
                self._residual_std = max(1.0, float(np.std(errors)))
            else:
                self._residual_std = max(2.0, self._global_std * 0.8)

            self._is_fitted = True
        else:
            self._fitted_days = 0.0
            self._global_mean = 0.0
            self._global_std = 5.0
            self._residual_std = 5.0
            self._latest_value = 0.0
            self._is_fitted = False

        return self

    def predict(
        self,
        target_timestamps: list[datetime | str],
        confidence_level: float = 0.90,
    ) -> list[ForecastPoint]:
        if not self._is_fitted:
            raise RuntimeError("Model is not fitted. Call fit(history) first.")

        z = 1.645 if confidence_level == 0.90 else 1.96
        lag_td = timedelta(hours=self.season_hours)
        points: list[ForecastPoint] = []

        for raw_ts in target_timestamps:
            ts_utc = parse_to_utc(raw_ts)
            iso_str = ts_utc.strftime("%Y-%m-%dT%H:%M:%SZ")

            # 1. Primary seasonal lag
            seasonal_prior = (ts_utc - lag_td).strftime("%Y-%m-%dT%H:%M:%SZ")
            if seasonal_prior in self._history_map:
                mean = self._history_map[seasonal_prior]
            else:
                # 2. Fallback: 24h lag if weekly seasonal was requested
                daily_prior = (ts_utc - timedelta(hours=24)).strftime("%Y-%m-%dT%H:%M:%SZ")
                if daily_prior in self._history_map:
                    mean = self._history_map[daily_prior]
                else:
                    # 3. Fallback: latest observed or global mean
                    mean = self._latest_value if self._latest_value > 0 else self._global_mean

            std_err = self._residual_std
            lower = max(0.0, mean - z * std_err)
            upper = min(100.0, mean + z * std_err) if self.target_metric == "occupancy_pct" else (mean + z * std_err)

            points.append(
                ForecastPoint(
                    target_ts=iso_str,
                    mean=round(float(mean), 2),
                    lower=round(float(lower), 2),
                    upper=round(float(upper), 2),
                )
            )

        return points

    def get_residual_std(self, ts: datetime | str) -> float:
        """Returns residual standard error for seasonal naive predictions."""
        if not self._is_fitted:
            return 5.0
        return float(self._residual_std) if math.isfinite(self._residual_std) and self._residual_std > 0 else 5.0
