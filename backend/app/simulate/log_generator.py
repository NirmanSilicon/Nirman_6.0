"""
app/simulate/log_generator.py

Stage 1a — generates a "normal mission" baseline telemetry log across every
component in the Stage 0 dependency graph, for a given duration.

Loads calibration.json (produced by calibrate_from_opssat.py) if present,
to set realistic noise/std-dev and sampling interval per component. Falls
back to reasonable hardcoded defaults if a component has no calibration
entry, so the script always runs even before calibration is finished.

Output format (matches WORKFLOW.md section 4.3):
    flat rows of: timestamp, component, parameter, value
"""

import json
import argparse
from datetime import datetime, timedelta, timezone
import numpy as np
import pandas as pd

# Fallback defaults if calibration.json doesn't cover a component.
# (mean, std, sampling_interval_seconds, parameter_name)
DEFAULTS = {
    "thermal_sensor":     (20.0, 0.5, 5.0, "temperature_c"),
    "heater_controller":  (0.325, 0.028, 5.0, "duty_cycle"),  # calibrated: OPS-SAT nominal duty cycle
    "battery":            (25.0, 0.8, 1.0, "temperature_c"),
    "battery_protection": (0.0, 0.0, 5.0, "trip_state"),
    "power_bus":          (7.4, 0.1, 1.0, "voltage_v"),
    "comms":              (-70.0, 2.0, 2.0, "signal_strength_dbm"),
    "obc":                (0.243, 0.031, 1.0, "cpu_load"),  # calibrated: OPS-SAT nominal cpu load
    "payload":            (1.0, 0.0, 10.0, "operational_state"),
    "flight_software":    (1.0, 0.0, 5.0, "fdir_state"),
}


def load_calibration(path: str | None) -> dict:
    if not path:
        return {}
    try:
        with open(path, "r", encoding="utf-8") as f:
            return json.load(f)
    except FileNotFoundError:
        print(f"WARNING: calibration file '{path}' not found — using defaults for all components.")
        return {}


def generate_baseline(
    components: list[str],
    duration_seconds: int = 600,
    start_time: datetime | None = None,
    calibration: dict | None = None,
    seed: int = 42,
) -> pd.DataFrame:
    rng = np.random.default_rng(seed)
    start_time = start_time or datetime.now(timezone.utc)
    calibration = calibration or {}

    rows = []
    for component in components:
        cal = calibration.get(component, {})
        mean = cal.get("nominal_mean")
        std = cal.get("nominal_std")
        interval = cal.get("sampling_interval_seconds")
        param_name = cal.get("parameter")

        default_mean, default_std, default_interval, default_param = DEFAULTS.get(
            component, (0.0, 0.1, 1.0, "value")
        )
        mean = mean if mean is not None else default_mean
        std = std if std is not None else default_std
        interval = interval if interval is not None else default_interval
        param_name = param_name if param_name is not None else default_param

        n_samples = max(1, int(duration_seconds / interval))
        timestamps = [start_time + timedelta(seconds=i * interval) for i in range(n_samples)]
        values = rng.normal(loc=mean, scale=std, size=n_samples)

        for ts, val in zip(timestamps, values):
            rows.append({
                "timestamp": ts.isoformat(),
                "component": component,
                "parameter": param_name,
                "value": round(float(val), 4),
            })

    df = pd.DataFrame(rows).sort_values("timestamp").reset_index(drop=True)
    return df


def main():
    parser = argparse.ArgumentParser(description="Generate synthetic baseline CubeSat telemetry.")
    parser.add_argument("--calibration", default="simulation/calibration.json")
    parser.add_argument("--duration", type=int, default=600, help="seconds of baseline mission time")
    parser.add_argument("--output", default="baseline_log.csv")
    args = parser.parse_args()

    calibration = load_calibration(args.calibration)
    components = list(DEFAULTS.keys())

    df = generate_baseline(components, duration_seconds=args.duration, calibration=calibration)
    df.to_csv(args.output, index=False)

    print(f"Generated {len(df)} baseline rows across {len(components)} components.")
    print(f"Written to {args.output}")
    print("\nNext: run fault_injector.py against this baseline to inject the canonical cascade.")


if __name__ == "__main__":
    main()
