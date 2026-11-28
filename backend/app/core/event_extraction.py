"""
app/core/event_extraction.py

Stage 2 — converts raw incident_log.csv rows into structured Event objects
(WORKFLOW.md section 5 / TECH_STACK_GUIDE.md section 5 schema).

IMPORTANT: this deliberately does NOT read the 'injected_note' column from
fault_injector.py. That column exists only for your own debugging /
validation. Detection here works the same way it would on a genuinely raw
log with no ground-truth hints, using:

  1. Rolling z-score threshold crossing (causal / no lookahead — each
     point is compared only against the stats of points BEFORE it, so this
     works the same way on a live stream, not just a finished file)
  2. A hard rule for sentinel "invalid reading" values (-900 or below),
     common in real telemetry encodings for sensor dropout / carrier loss
  3. State-machine tracking (NORMAL -> WARNING -> CRITICAL) per component
  4. Binary/flag-style alarm detection for trip/state fields and independent
     anomaly flags (e.g. cucd_*)
  5. De-duplication of repeated events within a short window

KNOWN LIMITATION (read before you run this):
The canonical cascade's heater_controller event injects duty_cycle=1.0,
which is the same as its own nominal mean (see log_generator.py DEFAULTS).
A z-score detector correctly will NOT flag this as anomalous on its own —
because, taken alone, it isn't anomalous. This is intentional and useful:
it forces Stage 3's causal engine to reason about a "silent" intermediate
hop using the dependency graph and timing, not a directly observed
telemetry breach.
"""

import json
import uuid
import argparse
from dataclasses import dataclass, asdict
from typing import List, Set
import pandas as pd
import numpy as np

from typing import List, Set, Optional, Dict, Any
from dataclasses import dataclass, field, asdict

INVALID_SENTINEL = -900.0   # any value at/below this is treated as "sensor invalid/dropout"
Z_WARNING = 4.0             # threshold for statistical warning (beyond normal Gaussian noise)
Z_CRITICAL = 5.0            # threshold for severe anomaly crossing
ROLLING_WINDOW = 20         # number of prior samples used to compute rolling mean/std
DEDUP_WINDOW_SECONDS = 3.0  # collapse repeated identical events within this window


@dataclass
class Event:
    id: str
    timestamp: str
    component: str
    event_type: str   # "threshold" | "state_change" | "alarm" | "reboot"
    value: float | None
    description: str
    parameter: Optional[str] = None
    severity: str = "warning"
    confidence: float = 0.85
    timing_confidence: str = "documented"
    predicted_value: Optional[float] = None
    residual: Optional[float] = None
    normalized_residual: Optional[float] = None
    anomaly_classification: str = "statistically_abnormal"  # "statistically_abnormal" | "physically_inconsistent" | "both" | "neither"
    is_statistical_anomaly: bool = True
    is_physical_anomaly: bool = False
    physics_evidence: Dict[str, Any] = field(default_factory=dict)


def _rolling_zscore(series: pd.Series, window: int) -> pd.Series:
    roll_mean = series.rolling(window=window, min_periods=5).mean().shift(1)
    roll_std = series.rolling(window=window, min_periods=5).std().shift(1)
    roll_std = roll_std.replace(0, np.nan)
    z = (series - roll_mean) / roll_std
    return z


def extract_threshold_events(df: pd.DataFrame, z_warn: float = Z_WARNING, z_crit: float = Z_CRITICAL) -> List[Event]:
    events = []
    for (component, parameter), group in df.groupby(["component", "parameter"]):
        group = group.sort_values("timestamp").reset_index(drop=True)
        z = _rolling_zscore(group["value"], ROLLING_WINDOW)

        for i, row in group.iterrows():
            zi = z.iloc[i]
            value = row["value"]

            if value <= INVALID_SENTINEL:
                events.append(Event(
                    id=str(uuid.uuid4()),
                    timestamp=row["timestamp"],
                    component=component,
                    event_type="alarm",
                    value=value,
                    description=f"{component}.{parameter} reports invalid/dropout reading ({value})",
                    parameter=str(parameter),
                    severity="critical",
                    confidence=0.99,
                    timing_confidence="documented",
                ))
                continue

            if pd.notna(zi) and abs(zi) >= z_crit:
                events.append(Event(
                    id=str(uuid.uuid4()),
                    timestamp=row["timestamp"],
                    component=component,
                    event_type="threshold",
                    value=value,
                    description=f"{component}.{parameter} crossed CRITICAL threshold "
                                f"(value={value}, z={zi:.1f})",
                    parameter=str(parameter),
                    severity="critical",
                    confidence=round(min(0.99, 0.60 + abs(float(zi)) * 0.07), 4),
                    timing_confidence="documented",
                ))
            elif pd.notna(zi) and abs(zi) >= z_warn:
                events.append(Event(
                    id=str(uuid.uuid4()),
                    timestamp=row["timestamp"],
                    component=component,
                    event_type="threshold",
                    value=value,
                    description=f"{component}.{parameter} crossed WARNING threshold "
                                f"(value={value}, z={zi:.1f})",
                    parameter=str(parameter),
                    severity="warning",
                    confidence=0.85,
                    timing_confidence="documented",
                ))

    return events


def extract_alarm_flag_events(df: pd.DataFrame, flag_parameters: Set[str]) -> List[Event]:
    """
    For binary/flag-style parameters (e.g. trip_state, operational_state,
    or any cucd_* presence flag), emit an alarm whenever the value departs
    from nominal baseline state or represents an injected intrusion flag.
    """
    events = []
    for (component, parameter), group in df.groupby(["component", "parameter"]):
        if parameter not in flag_parameters:
            continue
        group = group.sort_values("timestamp").reset_index(drop=True)
        if group.empty:
            continue

        # Check for CuCD independent anomaly flags
        if str(parameter).startswith("cucd_"):
            for _, row in group.iterrows():
                if row["value"] == 1.0:
                    scenario_name = str(parameter).replace("cucd_", "")
                    events.append(Event(
                        id=str(uuid.uuid4()),
                        timestamp=row["timestamp"],
                        component=component,
                        event_type="alarm",
                        value=row["value"],
                        description=f"{component}.{parameter} independent anomaly detected (scenario: '{scenario_name}')",
                        parameter=str(parameter),
                        severity="critical",
                        confidence=0.95,
                        timing_confidence="documented",
                    ))
            continue

        # Mode-based state tracking for continuous flags (trip_state, operational_state)
        mode_value = group["value"].mode().iloc[0]
        for _, row in group.iterrows():
            if row["value"] != mode_value:
                events.append(Event(
                    id=str(uuid.uuid4()),
                    timestamp=row["timestamp"],
                    component=component,
                    event_type="alarm",
                    value=row["value"],
                    description=f"{component}.{parameter} changed from baseline state "
                                f"({mode_value}) to {row['value']}",
                    parameter=str(parameter),
                    severity="critical",
                    confidence=0.95,
                    timing_confidence="documented",
                ))
    return events


def deduplicate(events: List[Event]) -> List[Event]:
    events_sorted = sorted(events, key=lambda e: (e.component, e.timestamp))
    deduped = []
    last_seen = {}

    for e in events_sorted:
        ts = pd.to_datetime(e.timestamp)
        key = (e.component, e.event_type, e.value)
        prev_ts = last_seen.get(key)
        if prev_ts is not None and (ts - prev_ts).total_seconds() <= DEDUP_WINDOW_SECONDS:
            continue
        last_seen[key] = ts
        deduped.append(e)

    return sorted(deduped, key=lambda e: e.timestamp)


def extract_events_baseline(
    df: pd.DataFrame,
    z_warn: float = Z_WARNING,
    z_crit: float = Z_CRITICAL,
) -> List[Event]:
    """
    Pure statistical baseline extraction (rolling z-score + flag changes).
    Preserved as a baseline so performance can be compared without regression.
    """
    flag_parameters = {"trip_state", "operational_state", "fdir_state"}
    flag_parameters |= {p for p in df["parameter"].unique() if str(p).startswith("cucd_")}

    threshold_df = df[~df["parameter"].isin(flag_parameters)]
    flag_df = df[df["parameter"].isin(flag_parameters)]

    events = extract_threshold_events(threshold_df, z_warn=z_warn, z_crit=z_crit)
    events += extract_alarm_flag_events(flag_df, flag_parameters)
    return deduplicate(events)


def extract_events(
    df: pd.DataFrame,
    z_warn: float = Z_WARNING,
    z_crit: float = Z_CRITICAL,
    use_physics: bool = True,
    mission_config: Optional[dict] = None,
) -> List[Event]:
    """
    Extract structured events from telemetry using the Hybrid Statistical + Physics-Informed Pipeline.
    When use_physics=True:
      - Runs baseline statistical detector
      - Runs discrete-time physics predictors (thermal energy balance, BMS-bus circuit coupling)
      - Computes observed, predicted, residual, and 4-way classification:
        ('statistically_abnormal', 'physically_inconsistent', 'both', 'neither')
      - Captures both statistical threshold breaches and physically inconsistent state transitions
    When use_physics=False:
      - Runs pure statistical baseline extraction without physics evaluation
    """
    if not use_physics:
        return extract_events_baseline(df, z_warn=z_warn, z_crit=z_crit)

    # 1. Statistical baseline events
    stat_events = extract_events_baseline(df, z_warn=z_warn, z_crit=z_crit)

    # 2. Run physics-informed anomaly detector
    try:
        from app.core.physics_anomaly import HybridAnomalyDetector
    except ImportError:
        try:
            from .physics_anomaly import HybridAnomalyDetector
        except ImportError:
            from physics_anomaly import HybridAnomalyDetector

    detector = HybridAnomalyDetector(
        mission_config=mission_config,
        z_warning=z_warn,
        z_critical=z_crit,
        rolling_window=ROLLING_WINDOW,
    )
    hybrid_results = detector.evaluate_dataframe(df)

    # Index hybrid results by (component, timestamp, value) for accurate lookup when fault points share timestamps
    res_map_exact = {}
    res_map_comp_ts = {}
    for r in hybrid_results:
        exact_key = (r.component, r.timestamp, round(r.observed_value, 2))
        res_map_exact[exact_key] = r
        res_map_comp_ts[(r.component, r.timestamp)] = r

    enriched_events = []
    # 3. Enrich statistical events with physics predictions & residuals
    for ev in stat_events:
        exact_key = (ev.component, ev.timestamp, round(ev.value, 2) if ev.value is not None else None)
        match = res_map_exact.get(exact_key) or res_map_comp_ts.get((ev.component, ev.timestamp))
        if match is not None:
            ev.predicted_value = match.predicted_value
            ev.residual = match.residual
            ev.normalized_residual = match.normalized_residual
            ev.is_statistical_anomaly = True
            ev.is_physical_anomaly = match.is_physical_anomaly
            ev.anomaly_classification = match.anomaly_classification
            if match.is_physical_anomaly:
                ev.severity = "critical"
                ev.confidence = max(ev.confidence, 0.95)
            ev.physics_evidence = {
                "rule_name": match.physics_rule,
                "residual": match.residual,
                "normalized_residual": match.normalized_residual,
                "predicted": match.predicted_value,
                "observed": match.observed_value,
                "is_physical_anomaly": match.is_physical_anomaly,
                "is_statistical_anomaly": True,
                **match.physics_evidence,
            }
        enriched_events.append(ev)

    # 4. Check for pure physical violations (physically_inconsistent, S=0, P=1)
    # Track state per component to emit an event on physical inconsistency onset
    phys_active: Dict[str, bool] = {}
    for r in hybrid_results:
        is_inconsistent = (r.anomaly_classification == "physically_inconsistent")
        was_active = phys_active.get(r.component, False)

        if is_inconsistent and not was_active:
            enriched_events.append(
                Event(
                    id=str(uuid.uuid4()),
                    timestamp=r.timestamp,
                    component=r.component,
                    event_type="threshold",
                    value=r.observed_value,
                    description=f"{r.component}.{r.parameter} physically inconsistent ({r.physics_rule}: obs={r.observed_value}, pred={r.predicted_value}, res={r.residual})",
                    parameter=str(r.parameter),
                    severity="critical",
                    confidence=round(min(0.99, 0.70 + abs(float(r.normalized_residual or 0.0)) * 0.1), 4),
                    timing_confidence="documented",
                    predicted_value=r.predicted_value,
                    residual=r.residual,
                    normalized_residual=r.normalized_residual,
                    anomaly_classification="physically_inconsistent",
                    is_statistical_anomaly=False,
                    is_physical_anomaly=True,
                    physics_evidence={
                        "rule_name": r.physics_rule,
                        "residual": r.residual,
                        "normalized_residual": r.normalized_residual,
                        "predicted": r.predicted_value,
                        "observed": r.observed_value,
                        "is_physical_anomaly": True,
                        "is_statistical_anomaly": False,
                        **r.physics_evidence,
                    },
                )
            )
        phys_active[r.component] = is_inconsistent

    return deduplicate(enriched_events)


def main():
    parser = argparse.ArgumentParser(description="Extract structured events from raw incident telemetry using Hybrid Statistical + Physics Anomaly Pipeline.")
    parser.add_argument("--input", default="simulation/incident_log.csv")
    parser.add_argument("--output", default="simulation/events.json")
    parser.add_argument("--z-warn", type=float, default=Z_WARNING)
    parser.add_argument("--z-crit", type=float, default=Z_CRITICAL)
    parser.add_argument("--baseline", action="store_true", help="Run pure statistical baseline extraction without physics predictors.")
    args = parser.parse_args()

    df = pd.read_csv(args.input)
    # Deliberately drop any debugging columns before extraction, so this
    # runs exactly as it would on a genuinely raw log.
    df = df[["timestamp", "component", "parameter", "value"]]

    use_physics = not args.baseline
    events = extract_events(df, z_warn=args.z_warn, z_crit=args.z_crit, use_physics=use_physics)

    with open(args.output, "w", encoding="utf-8") as f:
        json.dump([asdict(e) for e in events], f, indent=2)

    mode_label = "Statistical Baseline" if not use_physics else "Hybrid Statistical + Physics-Informed"
    print(f"Extracted {len(events)} structured events from {len(df)} raw log rows using [{mode_label}].")
    print(f"Written to {args.output}\n")
    for e in events:
        class_str = f" [{e.anomaly_classification}]" if hasattr(e, "anomaly_classification") else ""
        print(f"  [{e.event_type:^12}]{class_str:<26} {e.timestamp}  {e.component:<22} {e.description}")

    print("\nExpected (ground truth from fault_injector.py's CANONICAL_CASCADE):")
    print("  thermal_sensor invalid -> heater duty change (may not surface, see docstring)")
    print("  -> battery temp rise -> battery temp critical -> battery_protection trip")
    print("  -> power_bus voltage drop -> comms invalid -> payload offline")
    print("  plus 1+ alarm events from the spliced independent CuCD event, if present.")
    print("\nNext: build Stage 3 (causal_engine.py) to score and classify these events —")
    print("see WORKFLOW.md section 6.")


if __name__ == "__main__":
    main()
