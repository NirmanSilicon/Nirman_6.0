"""
app/simulate/fault_injector.py

Multi-subsystem fault injection engine supporting 7 distinct failure scenarios
for high-variance causal DAG validation, AI pattern-recognition, and counterfactual analysis.
"""

import os
import json
import random
import argparse
from datetime import timedelta
import numpy as np
import pandas as pd

# 7 Distinct multi-subsystem failure mode cascades aligned with the 8-node DAG
SCENARIO_CASCADES = {
    # 1. Thermal Sensor Bias (Root: thermal_sensor)
    "thermal_sensor": [
        {"offset_s": 0,   "component": "thermal_sensor",     "parameter": "temperature_c",        "value": -999.0, "note": "sensor reading freezes / negative rail drift"},
        {"offset_s": 8,   "component": "heater_controller",  "parameter": "duty_cycle",           "value": 1.0,    "note": "erratic heater control, pinned 100%"},
        {"offset_s": 95,  "component": "battery",            "parameter": "temperature_c",        "value": 42.0,   "note": "temperature rising outside nominal bounds"},
        {"offset_s": 140, "component": "battery",            "parameter": "temperature_c",        "value": 61.0,   "note": "crosses thermal runaway threshold"},
        {"offset_s": 142, "component": "battery_protection", "parameter": "trip_state",           "value": 1.0,    "note": "solid-state protection circuit trips"},
        {"offset_s": 143, "component": "power_bus",          "parameter": "voltage_v",            "value": 2.1,    "note": "main bus voltage drops below UVLO"},
        {"offset_s": 144, "component": "obc",                "parameter": "cpu_load",             "value": 0.0,    "note": "OBC loses power from bus voltage drop"},
        {"offset_s": 146, "component": "comms",              "parameter": "signal_strength_dbm",  "value": -999.0, "note": "S-band carrier link lost"},
        {"offset_s": 148, "component": "payload",            "parameter": "operational_state",    "value": 0.0,    "note": "payload aborts due to power loss"},
    ],

    # 2. Battery Cell Degradation / Micro-short (Root: battery)
    "battery_cell": [
        {"offset_s": 0,   "component": "battery",            "parameter": "temperature_c",        "value": 68.4,   "note": "Li-ion cell internal micro-short & Joule heating"},
        {"offset_s": 14,  "component": "battery_protection", "parameter": "trip_state",           "value": 1.0,    "note": "BMS thermal trip breaker latched"},
        {"offset_s": 16,  "component": "power_bus",          "parameter": "voltage_v",            "value": 0.04,   "note": "main power bus collapse to 0.04V"},
        {"offset_s": 18,  "component": "obc",                "parameter": "cpu_load",             "value": 0.0,    "note": "OBC sudden brownout shutdown"},
        {"offset_s": 20,  "component": "payload",            "parameter": "operational_state",    "value": 0.0,    "note": "unscheduled emergency payload shutdown"},
        {"offset_s": 22,  "component": "comms",              "parameter": "signal_strength_dbm",  "value": -999.0, "note": "carrier dropout due to bus failure"},
    ],

    # 3. Heater Controller TRIAC Short (Root: heater_controller)
    "heater_triac": [
        {"offset_s": 0,   "component": "heater_controller",  "parameter": "duty_cycle",           "value": 1.0,    "note": "TRIAC switch failed closed, pinned 100% duty cycle"},
        {"offset_s": 65,  "component": "battery",            "parameter": "temperature_c",        "value": 58.2,   "note": "continuous thermal dissipation overheating battery pack"},
        {"offset_s": 85,  "component": "battery_protection", "parameter": "trip_state",           "value": 1.0,    "note": "over-temperature circuit breaker tripped"},
        {"offset_s": 87,  "component": "power_bus",          "parameter": "voltage_v",            "value": 1.8,    "note": "5V logic and unregulated bus collapse"},
        {"offset_s": 90,  "component": "obc",                "parameter": "cpu_load",             "value": 0.0,    "note": "OBC power loss reset"},
        {"offset_s": 92,  "component": "payload",            "parameter": "operational_state",    "value": 0.0,    "note": "payload mission terminated"},
    ],

    # 4. Power Distribution Bus Regulator Sag / UVLO (Root: power_bus)
    "power_bus_uvlo": [
        {"offset_s": 0,   "component": "power_bus",          "parameter": "voltage_v",            "value": 3.12,   "note": "main EPS boost converter buck inductor latchup"},
        {"offset_s": 4,   "component": "obc",                "parameter": "cpu_load",             "value": 0.0,    "note": "microcontroller UVLO brownout reset"},
        {"offset_s": 6,   "component": "payload",            "parameter": "operational_state",    "value": 0.0,    "note": "payload power cut by EPS sequencer"},
        {"offset_s": 8,   "component": "comms",              "parameter": "signal_strength_dbm",  "value": -999.0, "note": "transponder lost power rail"},
    ],

    # 5. S-Band Comms PA Surge (Root: comms)
    "s_band_pa": [
        {"offset_s": 0,   "component": "comms",              "parameter": "signal_strength_dbm",  "value": -999.0, "note": "S-Band Power Amplifier current surge & carrier loss"},
        {"offset_s": 5,   "component": "power_bus",          "parameter": "voltage_v",            "value": 8.4,    "note": "high-drain power bus momentary voltage dip"},
        {"offset_s": 12,  "component": "obc",                "parameter": "cpu_load",             "value": 0.85,   "note": "OBC comms watchdog retry storm"},
    ],

    # 6. OBC Thread Deadlock & Watchdog Reboot (Root: obc)
    "obc_watchdog": [
        {"offset_s": 0,   "component": "obc",                "parameter": "cpu_load",             "value": 1.0,    "note": "RTOS telemetry task deadlock at 100% CPU"},
        {"offset_s": 15,  "component": "obc",                "parameter": "cpu_load",             "value": 0.0,    "note": "hardware watchdog timer reset triggered"},
        {"offset_s": 18,  "component": "payload",            "parameter": "operational_state",    "value": 0.0,    "note": "payload science schedule suspended during reboot"},
    ],

    # 7. Payload Sensor Overcurrent Latchup (Root: payload)
    "payload_overcurrent": [
        {"offset_s": 0,   "component": "payload",            "parameter": "operational_state",    "value": 0.0,    "note": "Hyperspectral payload focal plane detector latchup"},
        {"offset_s": 10,  "component": "obc",                "parameter": "cpu_load",             "value": 0.15,   "note": "OBC payload interface poll timeout"},
    ],
}

SCENARIO_TITLES = {
    "thermal_sensor": "Thermal Sensor Negative Rail Freeze Cascade",
    "battery_cell": "Li-Ion Battery Cell Micro-Short & Bus Collapse",
    "heater_triac": "Survival Heater TRIAC Short & Pack Thermal Runaway",
    "power_bus_uvlo": "EPS Main Power Distribution Bus UVLO Sag",
    "s_band_pa": "S-Band RF Power Amplifier Failure & Link Mute",
    "obc_watchdog": "OBC RTOS Deadlock & Hardware Watchdog Reboot",
    "payload_overcurrent": "Hyperspectral Payload Detector Overcurrent Latchup",
    "capstone_2022": "CAPSTONE (2022) — Real Incident Replay",
    "dellingr_2017": "Dellingr 6U (2017) — Real Incident Replay",
    "opssat_2021": "ESA OPS-SAT (2021) — SEU Memory Corruption Replay",
}

CANONICAL_CASCADE = SCENARIO_CASCADES["thermal_sensor"]


def inject_cascade(
    baseline_df: pd.DataFrame,
    cascade_start_offset_s: int = 300,
    scenario_key: str = "thermal_sensor",
    scenario_source: str = "synthetic",
    scenario_definition: list | None = None,
    randomize_jitter: bool = True
) -> pd.DataFrame:
    """
    Injects chosen failure mode cascade into telemetry dataframe.
    Supports both synthetic cascades and real incident definitions.
    Routes real_incident requests to real_incident_loader if scenario_source is 'real_incident'.
    """
    # Route real incident scenarios
    if scenario_source == "real_incident" or scenario_key in ["capstone_2022", "dellingr_2017", "opssat_2021"]:
        try:
            try:
                from simulation.real_incident_loader import load_real_incident
            except ImportError:
                from real_incident_loader import load_real_incident

            incident = load_real_incident(scenario_key)
            base_start = pd.to_datetime(baseline_df["timestamp"]).min()
            rows = []
            cum_offset = 0
            for ev in incident.events:
                off = ev.relative_offset_seconds if ev.relative_offset_seconds is not None else cum_offset
                cum_offset = off + 10
                ts = base_start + timedelta(seconds=cascade_start_offset_s + off)
                rows.append({
                    "timestamp": ts.isoformat(),
                    "component": ev.component,
                    "parameter": ev.parameter,
                    "value": ev.value,
                    "injected_note": f"[{ev.timing_confidence.upper()}] {ev.description}",
                    "timing_confidence": ev.timing_confidence,
                })
            cascade_df = pd.DataFrame(rows)
            combined = pd.concat([baseline_df, cascade_df], ignore_index=True)
            return combined.sort_values("timestamp").reset_index(drop=True)
        except Exception as e:
            print(f"[fault_injector] Real incident load warning: {e}, falling back to synthetic")

    if scenario_definition is not None:
        cascade_events = scenario_definition
    else:
        if scenario_key in ["random", "auto", "dynamic", "all", None]:
            available = list(SCENARIO_CASCADES.keys())
            scenario_key = random.choice(available)
        cascade_events = SCENARIO_CASCADES.get(scenario_key, CANONICAL_CASCADE)

    base_start = pd.to_datetime(baseline_df["timestamp"]).min()
    cascade_rows = []

    # Small seed-based random jitter for realism
    rng = np.random.default_rng()

    for event in cascade_events:
        offset = event.get("offset_s", event.get("relative_offset_seconds", 0)) or 0
        jitter_s = int(rng.uniform(-3, 4)) if randomize_jitter and offset > 0 else 0
        actual_offset = max(0, offset + jitter_s)
        ts = base_start + timedelta(seconds=cascade_start_offset_s + actual_offset)
        
        # Small value noise if not extreme sentinel
        val = event["value"]
        if val not in (-999.0, 0.0, 1.0) and randomize_jitter:
            val = round(val + float(rng.normal(0, 0.02 * abs(val))), 3)

        cascade_rows.append({
            "timestamp": ts.isoformat(),
            "component": event["component"],
            "parameter": event.get("parameter", "value"),
            "value": val,
            "injected_note": event.get("note", event.get("description", "injected fault")),
            "timing_confidence": event.get("timing_confidence", "documented"),
        })

    cascade_df = pd.DataFrame(cascade_rows)
    combined = pd.concat([baseline_df, cascade_df], ignore_index=True)
    return combined.sort_values("timestamp").reset_index(drop=True)


def splice_independent_event(
    combined_df: pd.DataFrame,
    independent_event_path: str = None,
    offset_from_start_s: int = 450,
    independent_component_label: str = "comms_uplink_handler",
) -> pd.DataFrame:
    """
    Splices an independent background anomaly (e.g. CuCD-ID cybersecurity command flood)
    to test the causal engine's ability to isolate uncoupled noise events.
    """
    base_start = pd.to_datetime(combined_df["timestamp"]).min()
    splice_start = base_start + timedelta(seconds=offset_from_start_s)

    rows = []
    if independent_event_path and os.path.exists(independent_event_path):
        try:
            with open(independent_event_path, "r", encoding="utf-8") as f:
                block = json.load(f)
            for i, record in enumerate(block.get("records", [])):
                rows.append({
                    "timestamp": (splice_start + timedelta(seconds=i)).isoformat(),
                    "component": independent_component_label,
                    "parameter": f"cucd_{block.get('scenario', 'event')}",
                    "value": 1.0,
                    "injected_note": f"real CuCD-ID '{block.get('scenario')}' cyber event, record {i}",
                })
        except Exception:
            pass

    if not rows:
        # Generate synthetic CuCD-ID command flooding burst
        for i in range(5):
            rows.append({
                "timestamp": (splice_start + timedelta(seconds=i * 2)).isoformat(),
                "component": independent_component_label,
                "parameter": "cucd_command_flooding",
                "value": 1.0,
                "injected_note": f"CuCD-ID independent command flooding record {i}",
            })

    splice_df = pd.DataFrame(rows)
    combined = pd.concat([combined_df, splice_df], ignore_index=True)
    return combined.sort_values("timestamp").reset_index(drop=True)

