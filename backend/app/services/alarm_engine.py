"""ISA-18.2 Alarm Flood Generator & Consolidation Engine for AlarmSense.

Implements standard threshold breach detection (Warning/Critical, High/Low),
ISA-18.2 on-delay chattering suppression, and alarm flood consolidation
ranking by temporal onset, severity, and peak deviation.
"""

from collections import defaultdict
from collections.abc import Iterable, Mapping, Sequence
from typing import Any, Final, NamedTuple, TypedDict
import numpy as np
import pandas as pd

from app.config import ISA_DELAY_STEPS, SENSOR_COLS, get_sensor_label, get_sensor_unit


class RawAlarmEvent(NamedTuple):
    """Single raw threshold breach event for a sensor at a specific time step.

    Attributes:
        step: Integer time step index (0-based relative to window start).
        tag: Sensor or variable tag name (e.g. 'XMEAS(9)').
        direction: Direction of threshold breach ('HIGH' or 'LOW').
        severity: Severity level ('HIGH', 'LOW', 'HIGH_HIGH', 'LOW_LOW').
        z_score: Standardized deviation relative to normal baseline.
        value: Process measurement value at the time of breach.
    """

    step: int
    tag: str
    direction: str
    severity: str
    z_score: float
    value: float = 0.0


class RawAlarmResult(NamedTuple):
    """Result of raw alarm generation containing breach events and total count.

    Attributes:
        events: Sequence of RawAlarmEvent instances ordered chronologically.
        raw_alarm_count: Total count of raw breach events before any filtering.
    """

    events: list[RawAlarmEvent]
    raw_alarm_count: int


class AlarmEpisode(NamedTuple):
    """Confirmed alarm episode spanning contiguous consecutive breach steps.

    Attributes:
        tag: Sensor tag name.
        direction: Direction of deviation ('HIGH' or 'LOW').
        severity: Peak severity reached during the episode ('HIGH_HIGH', 'LOW_LOW', 'HIGH', 'LOW').
        first_step: First time step where the contiguous breach began.
        last_step: Last consecutive time step where the breach remained active.
        peak_z: Maximum absolute standardized z-score reached during the episode.
    """

    tag: str
    direction: str
    severity: str
    first_step: int
    last_step: int
    peak_z: float


class PriorityAlarmDict(TypedDict):
    """Serialized summary of a top-ranked priority alarm for operator display."""

    tag: str
    label: str
    unit: str
    direction: str
    severity: str
    first_step: int
    peak_z: float


class ConsolidatedAlarmReport(TypedDict):
    """Structured report returned by the alarm consolidation engine."""

    raw_alarm_count: int
    confirmed_alarm_count: int
    priority_alarms: list[PriorityAlarmDict]
    first_triggered_tag: str | None
    reduction_pct: float


# Mapping of all 52 TEP process variables to their physical dynamics category
SENSOR_CATEGORY_MAP: Final[dict[str, str]] = {
    # Temperature sensors
    "XMEAS(9)": "temperature",
    "XMEAS(11)": "temperature",
    "XMEAS(18)": "temperature",
    "XMEAS(21)": "temperature",
    "XMEAS(22)": "temperature",
    # Level sensors
    "XMEAS(8)": "level",
    "XMEAS(12)": "level",
    "XMEAS(15)": "level",
    # Pressure sensors
    "XMEAS(7)": "pressure",
    "XMEAS(13)": "pressure",
    "XMEAS(16)": "pressure",
    # Flow sensors
    "XMEAS(1)": "flow",
    "XMEAS(2)": "flow",
    "XMEAS(3)": "flow",
    "XMEAS(4)": "flow",
    "XMEAS(5)": "flow",
    "XMEAS(6)": "flow",
    "XMEAS(10)": "flow",
    "XMEAS(14)": "flow",
    "XMEAS(17)": "flow",
    "XMEAS(19)": "flow",
    "XMEAS(20)": "flow",
    # Composition analyzer measurements (Stream 6, 9, 11)
    **{f"XMEAS({i})": "composition" for i in range(23, 42)},
    # Manipulated valve positions / actuator flows
    **{f"XMV({i})": "flow" for i in range(1, 12)},
}


def get_delay_steps(tag: str, delay_steps_map: Mapping[str, int] = ISA_DELAY_STEPS) -> int:
    """Resolve the required consecutive breach steps for a sensor tag.

    Lookup priority:
    1. Direct tag match in delay_steps_map (e.g. 'XMEAS(9)').
    2. Category match via SENSOR_CATEGORY_MAP (e.g. 'temperature' -> 2).
    3. Compound category match ('temp_level' or 'flow_pressure').
    4. Heuristic name match ('temp', 'level', 'comp', 'flow', 'press').
    5. Fallback default (1 step).

    Args:
        tag: Sensor tag name.
        delay_steps_map: Mapping of tags or categories to delay steps.

    Returns:
        int: Required consecutive time steps for alarm confirmation (>= 1).
    """
    # 1. Direct tag match
    if tag in delay_steps_map:
        return max(1, int(delay_steps_map[tag]))

    # 2. Known TEP category match
    category = SENSOR_CATEGORY_MAP.get(tag)
    if category is not None:
        if category in delay_steps_map:
            return max(1, int(delay_steps_map[category]))
        if category in ("temperature", "level", "composition") and "temp_level" in delay_steps_map:
            return max(1, int(delay_steps_map["temp_level"]))
        if category in ("flow", "pressure") and "flow_pressure" in delay_steps_map:
            return max(1, int(delay_steps_map["flow_pressure"]))

    # 3. Heuristic tag name inspection
    tag_lower = tag.lower()
    if any(k in tag_lower for k in ("temp", "level", "comp")):
        if "temperature" in delay_steps_map:
            return max(1, int(delay_steps_map["temperature"]))
        if "temp_level" in delay_steps_map:
            return max(1, int(delay_steps_map["temp_level"]))
        return 2

    if any(k in tag_lower for k in ("flow", "press")):
        if "flow" in delay_steps_map:
            return max(1, int(delay_steps_map["flow"]))
        if "flow_pressure" in delay_steps_map:
            return max(1, int(delay_steps_map["flow_pressure"]))
        return 1

    # 4. Fallback default
    return max(1, int(delay_steps_map.get("default", 1)))


def generate_raw_alarms(
    window_df: pd.DataFrame,
    baseline: pd.DataFrame,
    sigma_warn: float = 3.0,
    sigma_crit: float = 4.5,
    sensor_cols: Sequence[str] = SENSOR_COLS,
) -> RawAlarmResult:
    """Scan process variables in window_df and detect raw threshold breaches.

    Threshold classification:
        - |z| >= sigma_crit: 'HIGH_HIGH' (z > 0) or 'LOW_LOW' (z < 0)
        - sigma_warn <= |z| < sigma_crit: 'HIGH' (z > 0) or 'LOW' (z < 0)

    Args:
        window_df: Process observations DataFrame over the analysis window.
        baseline: Baseline DataFrame containing 'mean' and 'std' for sensors.
        sigma_warn: Standard deviation threshold for warning alarms (default 3.0).
        sigma_crit: Standard deviation threshold for critical alarms (default 4.5).

    Returns:
        RawAlarmResult: NamedTuple containing the chronological raw breach events
            and total raw_alarm_count.

    Raises:
        ValueError: If thresholds are invalid or baseline columns are missing.
    """
    if sigma_warn <= 0.0:
        raise ValueError(f"sigma_warn must be positive, got {sigma_warn}")
    if sigma_crit <= sigma_warn:
        raise ValueError(
            f"sigma_crit ({sigma_crit}) must be strictly greater than sigma_warn ({sigma_warn})"
        )

    for col in ("mean", "std"):
        if col not in baseline.columns:
            raise ValueError(f"Baseline DataFrame missing required column '{col}'")

    if window_df.empty:
        return RawAlarmResult(events=[], raw_alarm_count=0)

    # Prioritize requested sensor_cols that exist in both window_df and baseline
    cols = [c for c in sensor_cols if c in window_df.columns and c in baseline.index]
    if not cols:
        # Fallback to any common sensor columns between window_df and baseline
        cols = [c for c in window_df.columns if c in baseline.index]

    if not cols:
        return RawAlarmResult(events=[], raw_alarm_count=0)

    means = baseline.loc[cols, "mean"].to_numpy(dtype=np.float64)
    stds = baseline.loc[cols, "std"].to_numpy(dtype=np.float64)
    # Guard against zero or non-finite standard deviations
    stds_safe = np.where((stds > 1e-9) & np.isfinite(stds), stds, 1e-9)

    values = window_df[cols].to_numpy(dtype=np.float64)
    z_scores = (values - means) / stds_safe

    num_steps, num_cols = z_scores.shape
    events: list[RawAlarmEvent] = []

    for step in range(num_steps):
        for col_idx in range(num_cols):
            z = z_scores[step, col_idx]
            if np.isnan(z):
                continue

            tag = cols[col_idx]
            val = float(values[step, col_idx])

            if z >= sigma_crit:
                events.append(
                    RawAlarmEvent(
                        step=step,
                        tag=tag,
                        direction="HIGH",
                        severity="HIGH_HIGH",
                        z_score=round(float(z), 4),
                        value=val,
                    )
                )
            elif z >= sigma_warn:
                events.append(
                    RawAlarmEvent(
                        step=step,
                        tag=tag,
                        direction="HIGH",
                        severity="HIGH",
                        z_score=round(float(z), 4),
                        value=val,
                    )
                )
            elif z <= -sigma_crit:
                events.append(
                    RawAlarmEvent(
                        step=step,
                        tag=tag,
                        direction="LOW",
                        severity="LOW_LOW",
                        z_score=round(float(z), 4),
                        value=val,
                    )
                )
            elif z <= -sigma_warn:
                events.append(
                    RawAlarmEvent(
                        step=step,
                        tag=tag,
                        direction="LOW",
                        severity="LOW",
                        z_score=round(float(z), 4),
                        value=val,
                    )
                )

    return RawAlarmResult(events=events, raw_alarm_count=len(events))


def _normalize_event(event: Any) -> RawAlarmEvent:
    """Normalize event object, NamedTuple, or dictionary to RawAlarmEvent."""
    if isinstance(event, RawAlarmEvent):
        return event
    if isinstance(event, dict):
        return RawAlarmEvent(
            step=int(event["step"]),
            tag=str(event["tag"]),
            direction=str(event["direction"]),
            severity=str(event["severity"]),
            z_score=float(event["z_score"]),
            value=float(event.get("value", 0.0)),
        )
    return RawAlarmEvent(
        step=int(getattr(event, "step")),
        tag=str(getattr(event, "tag")),
        direction=str(getattr(event, "direction")),
        severity=str(getattr(event, "severity")),
        z_score=float(getattr(event, "z_score")),
        value=float(getattr(event, "value", 0.0)),
    )


def suppress_chattering(
    raw_events: Sequence[RawAlarmEvent] | RawAlarmResult | Iterable[Any],
    delay_steps_map: Mapping[str, int] = ISA_DELAY_STEPS,
) -> list[AlarmEpisode]:
    """Apply ISA-18.2 on-delay filtering to suppress transient chattering alarms.

    An alarm is confirmed only if the same (tag, direction) stays in breach for
    at least delay_steps consecutive time steps. Contiguous breach steps are
    deduplicated into clean alarm episodes.

    Args:
        raw_events: Sequence of raw alarm events (or RawAlarmResult).
        delay_steps_map: Mapping of sensor tags or categories to delay steps.

    Returns:
        list[AlarmEpisode]: Sequence of confirmed, deduplicated alarm episodes.
    """
    if isinstance(raw_events, RawAlarmResult):
        events_iter = raw_events.events
    elif hasattr(raw_events, "events"):
        events_iter = getattr(raw_events, "events")
    else:
        events_iter = raw_events

    # Group events by (tag, direction)
    events_by_key: dict[tuple[str, str], list[RawAlarmEvent]] = defaultdict(list)
    for raw in events_iter:
        ev = _normalize_event(raw)
        events_by_key[(ev.tag, ev.direction)].append(ev)

    confirmed_episodes: list[AlarmEpisode] = []

    for (tag, direction), events in events_by_key.items():
        # Sort events chronologically by time step
        sorted_events = sorted(events, key=lambda e: e.step)

        # Deduplicate multiple entries at the identical time step (keep highest |z|)
        unique_step_events: list[RawAlarmEvent] = []
        for ev in sorted_events:
            if not unique_step_events or ev.step != unique_step_events[-1].step:
                unique_step_events.append(ev)
            elif abs(ev.z_score) > abs(unique_step_events[-1].z_score):
                unique_step_events[-1] = ev

        # Partition into contiguous consecutive step runs
        runs: list[list[RawAlarmEvent]] = []
        current_run: list[RawAlarmEvent] = []

        for ev in unique_step_events:
            if not current_run:
                current_run.append(ev)
            elif ev.step == current_run[-1].step + 1:
                current_run.append(ev)
            else:
                runs.append(current_run)
                current_run = [ev]

        if current_run:
            runs.append(current_run)

        delay_steps = get_delay_steps(tag, delay_steps_map)

        # Confirm runs meeting or exceeding the on-delay requirement
        for run in runs:
            if len(run) >= delay_steps:
                first_step = run[0].step
                last_step = run[-1].step
                peak_z = round(float(max(abs(e.z_score) for e in run)), 4)

                # Peak severity classification
                if direction == "HIGH":
                    severity = "HIGH_HIGH" if any(e.severity == "HIGH_HIGH" for e in run) else "HIGH"
                else:
                    severity = "LOW_LOW" if any(e.severity == "LOW_LOW" for e in run) else "LOW"

                confirmed_episodes.append(
                    AlarmEpisode(
                        tag=tag,
                        direction=direction,
                        severity=severity,
                        first_step=first_step,
                        last_step=last_step,
                        peak_z=peak_z,
                    )
                )

    # Sort confirmed episodes deterministically by onset time step, tag, direction
    confirmed_episodes.sort(key=lambda ep: (ep.first_step, ep.tag, ep.direction))
    return confirmed_episodes


def _alarm_sort_key(ep: AlarmEpisode) -> tuple[int, int, float, str]:
    """Deterministic ranking key for confirmed alarms:

    1. Earliest first_step (ascending).
    2. Severity (HIGH_HIGH / LOW_LOW first -> 0, else 1).
    3. Peak |z| deviation (descending -> -peak_z).
    4. Tag name (ascending) for tie-breaking.
    """
    sev_priority = 0 if ep.severity in ("HIGH_HIGH", "LOW_LOW") else 1
    return (ep.first_step, sev_priority, -ep.peak_z, ep.tag)


def consolidate_alarm_flood(
    window_df: pd.DataFrame,
    baseline: pd.DataFrame,
    top_k: int = 5,
    sigma_warn: float = 3.0,
    sigma_crit: float = 4.5,
    delay_steps_map: Mapping[str, int] = ISA_DELAY_STEPS,
    sensor_cols: Sequence[str] = SENSOR_COLS,
) -> ConsolidatedAlarmReport:
    """Run full alarm generation, on-delay suppression, and priority ranking.

    Executes:
        generate_raw_alarms -> suppress_chattering -> priority ranking

    Args:
        window_df: Process observations DataFrame over the analysis window.
        baseline: Baseline DataFrame containing 'mean' and 'std' for sensors.
        top_k: Maximum number of priority alarms to retain (default 5).
        sigma_warn: Standard deviation threshold for warning alarms.
        sigma_crit: Standard deviation threshold for critical alarms.
        delay_steps_map: Mapping of sensor tags or categories to delay steps.

    Returns:
        ConsolidatedAlarmReport: Structured dictionary containing:
            - raw_alarm_count: int
            - confirmed_alarm_count: int
            - priority_alarms: top top_k ranked alarm dicts
            - first_triggered_tag: str or None
            - reduction_pct: float
    """
    raw_result = generate_raw_alarms(
        window_df=window_df,
        baseline=baseline,
        sigma_warn=sigma_warn,
        sigma_crit=sigma_crit,
        sensor_cols=sensor_cols,
    )

    confirmed_episodes = suppress_chattering(
        raw_events=raw_result.events,
        delay_steps_map=delay_steps_map,
    )

    sorted_episodes = sorted(confirmed_episodes, key=_alarm_sort_key)
    priority_episodes = sorted_episodes[:top_k]

    priority_alarms: list[PriorityAlarmDict] = [
        {
            "tag": ep.tag,
            "label": get_sensor_label(ep.tag),
            "unit": get_sensor_unit(ep.tag),
            "direction": ep.direction,
            "severity": ep.severity,
            "first_step": ep.first_step,
            "peak_z": ep.peak_z,
        }
        for ep in priority_episodes
    ]

    first_triggered_tag: str | None = (
        priority_alarms[0]["tag"] if priority_alarms else None
    )

    raw_alarm_count = raw_result.raw_alarm_count
    confirmed_alarm_count = len(sorted_episodes)

    if raw_alarm_count == 0:
        reduction_pct = 0.0
    else:
        reduction_pct = round(
            (raw_alarm_count - len(priority_alarms)) / raw_alarm_count * 100, 2
        )

    return {
        "raw_alarm_count": raw_alarm_count,
        "confirmed_alarm_count": confirmed_alarm_count,
        "priority_alarms": priority_alarms,
        "first_triggered_tag": first_triggered_tag,
        "reduction_pct": reduction_pct,
    }
