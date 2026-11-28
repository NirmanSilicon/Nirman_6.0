"""Causal propagation link discovery for Tennessee Eastman Process alarm floods.

Combines lagged Pearson cross-correlation with Granger causality F-tests
across top priority alarm and SHAP-driving sensors to trace fault propagation
direction and time lag within a sliding window.
"""

from collections.abc import Sequence
import contextlib
import io
from typing import Literal, TypedDict
import warnings
import numpy as np
import pandas as pd
from statsmodels.tsa.stattools import grangercausalitytests

from app.config import get_sensor_label


class CausalLinkDict(TypedDict):
    """Directed causal propagation link from source sensor to target sensor."""

    source: str
    source_label: str
    target: str
    target_label: str
    best_lag_steps: int
    lag_minutes: int
    correlation: float
    p_value: float | None
    strength: float
    method: Literal["granger+corr", "lag_corr"]
    explanation: str


def _lagged_pearson(src: np.ndarray, dst: np.ndarray, lag: int) -> float | None:
    """Compute Pearson correlation between src[:-lag] and dst[lag:]."""
    if lag <= 0 or lag >= len(src) - 1:
        return None

    x = src[:-lag]
    y = dst[lag:]
    x_centered = x - x.mean()
    y_centered = y - y.mean()
    denom = float(np.sqrt(np.dot(x_centered, x_centered) * np.dot(y_centered, y_centered)))
    if denom < 1e-12 or not np.isfinite(denom):
        return None
    r = float(np.dot(x_centered, y_centered) / denom)
    if not np.isfinite(r):
        return None
    return float(np.clip(r, -1.0, 1.0))


def _safe_granger_pvalue(
    src: np.ndarray,
    dst: np.ndarray,
    max_lag: int,
) -> float | None:
    """Run statsmodels grangercausalitytests(dst ~ src) safely, returning min ssr_ftest p-value."""
    effective_lag = min(max_lag, (len(src) - 3) // 2)
    if effective_lag < 1 or len(src) < 3 * effective_lag + 2:
        return None

    # statsmodels expects column 0 = target (dst), column 1 = predictor (src)
    data = np.column_stack([dst, src])
    try:
        with (
            contextlib.redirect_stdout(io.StringIO()),
            warnings.catch_warnings(),
        ):
            warnings.simplefilter("ignore")
            results = grangercausalitytests(data, maxlag=effective_lag)
    except Exception:
        return None

    p_values: list[float] = []
    for lag in range(1, effective_lag + 1):
        lag_res = results.get(lag)
        if not lag_res:
            continue
        tests_dict = lag_res[0]
        ssr_ftest = tests_dict.get("ssr_ftest")
        if ssr_ftest is not None and len(ssr_ftest) >= 2:
            p_val = float(ssr_ftest[1])
            if np.isfinite(p_val):
                p_values.append(p_val)

    if not p_values:
        return None
    return float(min(p_values))


def compute_causal_links(
    window_df: pd.DataFrame,
    candidate_sensors: Sequence[str],
    max_links: int = 5,
    max_lag: int = 2,
    step_minutes: int = 3,
) -> list[CausalLinkDict]:
    """Infer directed causal propagation links among candidate sensors in window_df.

    Deduplicates candidate_sensors to at most the top 5 valid columns present in
    window_df, skips constant/zero-variance signals, computes lagged Pearson
    correlation across lags 1..max_lag, and augments with Granger F-test p-values
    when numerically feasible.

    Args:
        window_df: Process window DataFrame (typically 20+ rows).
        candidate_sensors: Prioritized sensor tags (alarms + SHAP drivers).
        max_links: Maximum number of directed links to return (default 5).
        max_lag: Maximum lag steps to test (default 2).
        step_minutes: Minutes per sampling step (default 3 for TEP).

    Returns:
        list[CausalLinkDict]: Ranked causal links sorted by strength descending.
    """
    if max_links < 1 or max_lag < 1 or window_df.empty:
        return []

    # Deduplicate preserving priority order, keep valid DataFrame columns, cap at top 5
    deduped = list(
        dict.fromkeys(
            tag for tag in candidate_sensors if tag and tag in window_df.columns
        )
    )[:5]

    if len(deduped) < 2:
        return []

    series_map: dict[str, np.ndarray] = {}
    for tag in deduped:
        arr = window_df[tag].to_numpy(dtype=np.float64, copy=False)
        if len(arr) <= max_lag + 1 or not np.isfinite(arr).all():
            continue
        if float(np.std(arr)) < 1e-8:
            continue
        series_map[tag] = arr

    valid_sensors = [tag for tag in deduped if tag in series_map]
    if len(valid_sensors) < 2:
        return []

    links: list[CausalLinkDict] = []

    for src in valid_sensors:
        src_arr = series_map[src]
        for dst in valid_sensors:
            if src == dst:
                continue
            dst_arr = series_map[dst]

            best_lag = 1
            best_corr: float | None = None

            for lag in range(1, max_lag + 1):
                r = _lagged_pearson(src_arr, dst_arr, lag)
                if r is None:
                    continue
                if best_corr is None or abs(r) > abs(best_corr):
                    best_corr = r
                    best_lag = lag

            if best_corr is None:
                continue

            raw_p = _safe_granger_pvalue(src_arr, dst_arr, max_lag=max_lag)
            is_significant_p = raw_p is not None and raw_p < 0.05

            if abs(best_corr) < 0.35 and not is_significant_p:
                continue

            corr_score = min(1.0, abs(best_corr))
            if raw_p is not None:
                method: Literal["granger+corr", "lag_corr"] = "granger+corr"
                p_value: float | None = round(raw_p, 6)
                if raw_p < 0.05:
                    p_score = max(0.0, 1.0 - raw_p / 0.05)
                else:
                    p_score = max(0.0, 0.25 * (1.0 - min(raw_p, 1.0)))
                strength = round(min(1.0, 0.65 * corr_score + 0.35 * p_score), 4)
            else:
                method = "lag_corr"
                p_value = None
                strength = round(min(1.0, 0.75 * corr_score), 4)

            rounded_corr = round(best_corr, 4)
            lag_minutes = best_lag * step_minutes
            source_label = get_sensor_label(src)
            target_label = get_sensor_label(dst)
            src_display = f"{source_label} ({src})" if source_label != src else src
            dst_display = f"{target_label} ({dst})" if target_label != dst else dst
            direction_word = "positively" if rounded_corr >= 0 else "negatively"
            p_text = f", Granger p={p_value:.4f}" if p_value is not None else ""
            explanation = (
                f"{src_display} leads {dst_display} by {best_lag} step(s) ({lag_minutes} min), "
                f"{direction_word} correlated (r={rounded_corr:+.2f}{p_text})."
            )

            links.append(
                {
                    "source": src,
                    "source_label": source_label,
                    "target": dst,
                    "target_label": target_label,
                    "best_lag_steps": best_lag,
                    "lag_minutes": lag_minutes,
                    "correlation": rounded_corr,
                    "p_value": p_value,
                    "strength": strength,
                    "method": method,
                    "explanation": explanation,
                }
            )

    links.sort(
        key=lambda item: (
            -item["strength"],
            -abs(item["correlation"]),
            item["best_lag_steps"],
            item["source"],
            item["target"],
        )
    )
    return links[:max_links]
