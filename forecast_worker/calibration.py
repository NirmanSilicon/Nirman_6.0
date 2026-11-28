"""
ParkSMART - Forecasting Interval Calibration (File 158 / M2 Ownership)

Responsibility:
Calibrates and validates forecasting prediction intervals against empirical residual errors:
- Evaluates empirical coverage against nominal confidence levels (e.g. 90%).
- Computes empirical scale adjustments (conformal scaling) for heteroscedastic residuals.
- Configurable thresholds marked as unvalidated: does not claim accuracy for Bhubaneswar.
- Rejects non-finite values and handles empty or insufficient samples safely.
"""

from __future__ import annotations

import logging
from dataclasses import dataclass
from typing import Any

import numpy as np

logger = logging.getLogger("parksmart.forecast_worker.calibration")

# UNVALIDATED: Calibration scaling factors are empirical baselines computed from simulated/test data.
# No real-world accuracy is claimed for Bhubaneswar without measured historical telemetry.
UNVALIDATED_DISCLAIMER: str = (
    "UNVALIDATED: Calibration adjustments are statistical heuristics on synthetic/test data. "
    "No measured real-world accuracy is claimed for Bhubaneswar without local sensor telemetry."
)


@dataclass
class IntervalCalibrationResult:
    """Outcome of empirical interval calibration."""

    nominal_level: float
    empirical_coverage: float
    scale_factor: float
    sample_count: int
    is_calibrated: bool
    status: str
    disclaimer: str = UNVALIDATED_DISCLAIMER

    def to_dict(self) -> dict[str, Any]:
        return {
            "nominal_level": round(self.nominal_level, 2),
            "empirical_coverage": round(self.empirical_coverage, 3),
            "scale_factor": round(self.scale_factor, 3),
            "sample_count": self.sample_count,
            "is_calibrated": self.is_calibrated,
            "status": self.status,
            "disclaimer": self.disclaimer,
        }


def compute_empirical_coverage(
    y_true: list[float] | np.ndarray,
    lower: list[float] | np.ndarray,
    upper: list[float] | np.ndarray,
) -> float:
    """Computes fraction of actual values falling within [lower, upper]."""
    y = np.asarray(y_true, dtype=float)
    lo = np.asarray(lower, dtype=float)
    hi = np.asarray(upper, dtype=float)

    if len(y) == 0:
        return 0.0

    valid_mask = np.isfinite(y) & np.isfinite(lo) & np.isfinite(hi)
    if not np.any(valid_mask):
        return 0.0

    covered = (y[valid_mask] >= lo[valid_mask]) & (y[valid_mask] <= hi[valid_mask])
    return float(np.mean(covered))


def calibrate_prediction_intervals(
    y_true: list[float] | np.ndarray,
    y_pred: list[float] | np.ndarray,
    y_std: list[float] | np.ndarray,
    nominal_level: float = 0.90,
    min_samples: int = 12,
) -> IntervalCalibrationResult:
    """
    Computes empirical coverage and a conformal scale adjustment factor.

    Parameters:
      y_true: Ground truth target observations
      y_pred: Model predicted means
      y_std: Estimated residual standard deviations
      nominal_level: Target nominal confidence (default: 0.90 for 90% intervals)
      min_samples: Minimum valid observations required for calibration

    Returns:
      IntervalCalibrationResult with scaling factor and empirical coverage.
    """
    yt = np.asarray(y_true, dtype=float)
    yp = np.asarray(y_pred, dtype=float)
    ys = np.asarray(y_std, dtype=float)

    n = min(len(yt), len(yp), len(ys))
    if n < min_samples:
        return IntervalCalibrationResult(
            nominal_level=nominal_level,
            empirical_coverage=0.0,
            scale_factor=1.0,
            sample_count=n,
            is_calibrated=False,
            status="insufficient_samples",
        )

    yt = yt[:n]
    yp = yp[:n]
    ys = ys[:n]

    valid = np.isfinite(yt) & np.isfinite(yp) & np.isfinite(ys) & (ys > 0)
    if np.sum(valid) < min_samples:
        return IntervalCalibrationResult(
            nominal_level=nominal_level,
            empirical_coverage=0.0,
            scale_factor=1.0,
            sample_count=int(np.sum(valid)),
            is_calibrated=False,
            status="insufficient_finite_samples",
        )

    yt = yt[valid]
    yp = yp[valid]
    ys = ys[valid]

    z = 1.645 if abs(nominal_level - 0.90) < 0.02 else (1.96 if abs(nominal_level - 0.95) < 0.02 else 1.645)

    initial_lower = yp - z * ys
    initial_upper = yp + z * ys
    raw_coverage = compute_empirical_coverage(yt, initial_lower, initial_upper)

    # Conformal non-conformity scores: |y_true - y_pred| / y_std
    abs_errors = np.abs(yt - yp)
    scores = abs_errors / ys
    # Empirical quantile for nominal level
    q = float(np.quantile(scores, nominal_level))
    scale_factor = max(0.5, min(3.0, q / z)) if z > 0 else 1.0

    return IntervalCalibrationResult(
        nominal_level=nominal_level,
        empirical_coverage=round(raw_coverage, 3),
        scale_factor=round(scale_factor, 3),
        sample_count=len(yt),
        is_calibrated=True,
        status="calibrated",
    )
