"""
backend/app/simulate/simulation_engine.py

Aerospace-Grade Spacecraft Simulation Engine for CAELIS.
Generates deterministic, physically grounded CubeSat telemetry and discrete event streams.

Separates:
- NominalSignalModel: Baseline physical equations & orbital parameters
- FaultInjector: Physically plausibly shaped disturbances and downstream multi-subsystem reactions
- NoiseModel: Seed-deterministic PRNG
- PacketModel: Canonical packets with quality flags, monotonic MET, and provenance

Supports the 5 Canonical Failure Scenarios (A - E) with hidden Ground Truth metadata:
  SCENARIO A — Thermal Cascade
  SCENARIO B — Power Cascade
  SCENARIO C — Misleading Early Anomaly
  SCENARIO D — Competing Root Causes
  SCENARIO E — Missing Telemetry
Plus custom parametric fault injection.
"""

import uuid
import math
from datetime import datetime, timedelta, timezone
from typing import Dict, List, Optional, Any, Tuple
import numpy as np
import pandas as pd

from app.simulate.simulation_models import (
    CanonicalTelemetryRecord,
    SimulationDataset,
    ValidationReport,
)
from app.simulate.validator import validate_telemetry_records


class SimulationEngine:
    """
    Authoritative simulation dataset generator.
    """

    CHANNEL_SPECS = {
        "THM_TEMP_RAW":   {"subsystem": "THERMAL", "signal": "thermal_sensor_temp",    "unit": "degC", "mean": 20.0, "std": 0.45},
        "HEAT_DUTY":      {"subsystem": "THERMAL", "signal": "heater_duty_cycle",      "unit": "ratio","mean": 0.325,"std": 0.025},
        "BATT_TEMP":      {"subsystem": "BATTERY", "signal": "battery_temperature",    "unit": "degC", "mean": 22.5, "std": 0.60},
        "BATT_TRIP":      {"subsystem": "BATTERY", "signal": "battery_protection_trip","unit": "state","mean": 0.0,  "std": 0.00},
        "EPS_BUS_V":      {"subsystem": "EPS",     "signal": "main_power_bus_voltage", "unit": "V",    "mean": 7.42, "std": 0.08},
        "EPS_BUS_3V3":    {"subsystem": "EPS",     "signal": "eps_3v3_logic_bus",      "unit": "V",    "mean": 3.32, "std": 0.03},
        "OBC_CPU_LOAD":   {"subsystem": "OBC",     "signal": "obc_cpu_load_ratio",     "unit": "ratio","mean": 0.245,"std": 0.030},
        "COM_RSSI_DBM":   {"subsystem": "COMMS",   "signal": "sband_rx_power",         "unit": "dBm",  "mean": -70.0,"std": 1.50},
        "ADCS_RATE_DPS":  {"subsystem": "ADCS",    "signal": "gyro_body_rate",         "unit": "deg/s","mean": 0.02, "std": 0.010},
        "PAYLOAD_STATE":  {"subsystem": "PAYLOAD", "signal": "payload_operational_state","unit":"state","mean": 1.0,  "std": 0.00},
    }

    PREDEFINED_SCENARIOS = {
        "power_collapse": {
            "key": "power_collapse",
            "name": "Power Bus Cascade Collapse (Standard Incident)",
            "description": "EPS main boost regulator UVLO sag causes main bus voltage collapse, triggering OBC brownout and RF loss.",
            "canonical_id": "power_cascade",
            "root_cause": "power_bus",
            "expected_event_order": ["power_bus", "obc", "payload", "comms"],
            "expected_affected": ["EPS", "OBC", "PAYLOAD", "COMMS"],
        },
        "thermal_runaway": {
            "key": "thermal_runaway",
            "name": "Thermal Sensor Negative Rail Freeze & Battery Overheating",
            "description": "Thermistor negative rail freeze induces false cold trigger, pinning heater 100%, causing battery thermal runaway and protection trip.",
            "canonical_id": "thermal_cascade",
            "root_cause": "thermal_sensor",
            "expected_event_order": ["thermal_sensor", "heater_controller", "battery", "battery_protection", "power_bus", "obc", "comms", "payload"],
            "expected_affected": ["THERMAL", "BATTERY", "EPS", "OBC", "COMMS", "PAYLOAD"],
        },
        "solar_storm": {
            "key": "solar_storm",
            "name": "Solar Radiation Storm & ADCS Gyro Glitch",
            "description": "High-energy solar proton event causes momentary ADCS single-event latchup and S-band transponder RF jitter.",
            "canonical_id": "solar_storm",
            "root_cause": "adcs",
            "expected_event_order": ["adcs", "comms"],
            "expected_affected": ["ADCS", "COMMS"],
        },
        "nominal_leo": {
            "key": "nominal_leo",
            "name": "Nominal LEO Orbit (Baseline Benchmark)",
            "description": "Nominal orbital telemetry without fault injection. Verifies baseline zero-false-positive rate.",
            "canonical_id": "nominal_leo",
            "root_cause": "NONE",
            "expected_event_order": [],
            "expected_affected": [],
        },
        "misleading_early_anomaly": {
            "key": "misleading_early_anomaly",
            "name": "Misleading Early Anomaly (ADCS Glitch before Cell Runaway)",
            "description": "ADCS gyro experiences early benign rate glitch at T+80s, but true root cause is Battery Micro-Short at T+120s.",
            "canonical_id": "misleading_early_anomaly",
            "root_cause": "battery",
            "expected_event_order": ["adcs", "battery", "battery_protection", "power_bus", "obc"],
            "expected_affected": ["ADCS", "BATTERY", "EPS", "OBC"],
        },
        "competing_root_causes": {
            "key": "competing_root_causes",
            "name": "Competing Hypotheses (Thermal Sensor vs Heater TRIAC)",
            "description": "Both sensor negative bias and TRIAC short closed produce similar symptoms. Requires Next Best Evidence discrimination.",
            "canonical_id": "competing_root_causes",
            "root_cause": "thermal_sensor",
            "competing_cause": "heater_controller",
            "expected_event_order": ["thermal_sensor", "heater_controller", "battery", "battery_protection", "power_bus"],
            "expected_affected": ["THERMAL", "BATTERY", "EPS"],
        },
        "missing_telemetry": {
            "key": "missing_telemetry",
            "name": "Missing Telemetry Stream (Unobserved Battery Sensors)",
            "description": "Critical battery temperature and protection channels are missing from downlink, forcing INSUFFICIENT EVIDENCE status.",
            "canonical_id": "missing_telemetry",
            "root_cause": "UNKNOWN",
            "expected_event_order": ["power_bus", "obc"],
            "expected_affected": ["EPS", "OBC"],
        },
    }

    def __init__(self, random_seed: int = 42):
        self.random_seed = random_seed

    def generate(
        self,
        scenario_id: str = "power_collapse",
        duration_seconds: int = 300,
        orbit_altitude_km: float = 550.0,
        noise_level: float = 1.0,
        sampling_rate_hz: float = 1.0,
        random_seed: Optional[int] = None,
        custom_fault: Optional[Dict[str, Any]] = None,
        omitted_channels: Optional[List[str]] = None,
    ) -> SimulationDataset:
        """
        Generates a complete, deterministic, reproducible SimulationDataset.
        """
        seed = random_seed if random_seed is not None else self.random_seed
        rng = np.random.default_rng(seed)

        start_time = datetime.now(timezone.utc)
        sim_id = f"SIM-{uuid.uuid4().hex[:10].upper()}"

        scenario_meta = self.PREDEFINED_SCENARIOS.get(scenario_id, self.PREDEFINED_SCENARIOS["power_collapse"])
        name = scenario_meta.get("name", f"Simulation {scenario_id}")
        desc = scenario_meta.get("description", "Dynamic spacecraft telemetry simulation.")

        # Ground truth hidden metadata for benchmarking (Section 36)
        ground_truth = {
            "scenario_id": scenario_id,
            "root_cause": scenario_meta.get("root_cause", "UNKNOWN"),
            "expected_event_order": scenario_meta.get("expected_event_order", []),
            "expected_affected_subsystems": scenario_meta.get("expected_affected", []),
            "competing_cause": scenario_meta.get("competing_cause"),
            "random_seed": seed,
            "orbit_altitude_km": orbit_altitude_km,
            "noise_level": noise_level,
        }

        # Select channels to simulate
        active_channel_specs = dict(self.CHANNEL_SPECS)
        if scenario_id == "missing_telemetry" or omitted_channels:
            to_omit = omitted_channels or ["BATT_TEMP", "BATT_TRIP"]
            for ch in to_omit:
                active_channel_specs.pop(ch, None)

        time_steps = int(duration_seconds * sampling_rate_hz)
        dt = 1.0 / sampling_rate_hz

        # Altitude-dependent orbital frequency: T_orbit = 2*pi * sqrt( (R_E + h)^3 / GM_E )
        r_orb = 6371.0 + orbit_altitude_km
        orbit_period_s = 2.0 * math.pi * math.sqrt((r_orb * 1000.0) ** 3 / 3.986004418e14)
        orbital_freq = (2.0 * math.pi) / orbit_period_s

        records: List[CanonicalTelemetryRecord] = []
        logs: List[str] = []
        events: List[Dict[str, Any]] = []

        # Nominal initial spacecraft state
        logs.append(
            f"[T+00:00.000] [BOOT] CubeSat 3U OBC EPS initialized - NOMINAL "
            f"(Altitude {orbit_altitude_km:.0f}km, Period {orbit_period_s/60.0:.1f}m, Seed {seed})"
        )
        logs.append(
            f"[T+00:45.120] [SOLAR] Solar Array Panel +X deployed: 14.82V, +Y deployed: 14.79V"
        )
        logs.append(
            f"[T+01:30.400] [BATT] 2x LiFePO4 cells balanced (8.22V), state-of-charge 98.4%"
        )
        logs.append(
            f"[T+02:15.890] [THERM] Thermistor THM_TEMP_RAW base temp: +18.4°C, noise ratio ±{noise_level:.1f}%"
        )

        # Build trajectory matrix
        pkt_seq = 1000

        # Timing offsets for fault cascades (seconds into simulation)
        # Default fault starts at ~60-70% of duration
        fault_start_s = min(285.0, duration_seconds * 0.65) if duration_seconds > 60 else duration_seconds * 0.5

        if custom_fault and "injection_offset_s" in custom_fault:
            fault_start_s = float(custom_fault["injection_offset_s"])

        # Trace physical states across time
        for step in range(time_steps):
            met = round(step * dt, 3)
            current_time = start_time + timedelta(seconds=met)
            iso_time = current_time.isoformat()

            # Orbit sine harmonic for thermal and power
            orbit_phase = orbital_freq * met
            sunlight_ratio = max(0.0, math.sin(orbit_phase))  # 1.0 in noon, 0.0 in eclipse

            for ch_id, spec in active_channel_specs.items():
                mean_val = spec["mean"]
                std_val = spec["std"] * noise_level

                # Nominal physical expected value y_hat
                if ch_id == "THM_TEMP_RAW":
                    y_expected = mean_val + 3.5 * math.sin(orbit_phase)
                elif ch_id == "HEAT_DUTY":
                    y_expected = mean_val - 0.05 * math.sin(orbit_phase)
                elif ch_id == "BATT_TEMP":
                    y_expected = mean_val + 2.0 * math.sin(orbit_phase)
                elif ch_id == "EPS_BUS_V":
                    y_expected = mean_val + 0.15 * sunlight_ratio - 0.0002 * met
                elif ch_id == "EPS_BUS_3V3":
                    y_expected = 3.32
                elif ch_id == "OBC_CPU_LOAD":
                    y_expected = mean_val
                elif ch_id == "COM_RSSI_DBM":
                    y_expected = mean_val
                elif ch_id == "ADCS_RATE_DPS":
                    y_expected = mean_val
                else:
                    y_expected = mean_val

                # Add noise
                noise = rng.normal(0.0, max(1e-4, std_val))
                val = y_expected + noise

                quality = "VALID"

                # =====================================================================
                # FAULT INJECTION LAYERS (Section 5 & 6: physically shaped cascades)
                # =====================================================================

                # Scenario A / thermal_runaway
                if scenario_id in ["thermal_runaway", "thermal_cascade"]:
                    if met >= fault_start_s:
                        tau = met - fault_start_s
                        if ch_id == "THM_TEMP_RAW":
                            # Negative rail drift
                            val = max(-65.0, 20.0 - (tau * 1.8) ** 1.3)
                            quality = "DEGRADED" if val < -40.0 else "VALID"
                        elif ch_id == "HEAT_DUTY" and met >= fault_start_s + 8.0:
                            # Closed-loop heater override pinned 100%
                            val = 1.0
                        elif ch_id == "BATT_TEMP" and met >= fault_start_s + 20.0:
                            # Joule heating of battery pack
                            val = 22.5 + 0.55 * (met - (fault_start_s + 20.0))
                            if val > 60.0:
                                quality = "OUT_OF_BOUNDS"
                        elif ch_id == "BATT_TRIP" and met >= fault_start_s + 85.0:
                            # BMS protection circuit trips at 60C
                            val = 1.0
                        elif ch_id == "EPS_BUS_V" and met >= fault_start_s + 87.0:
                            # Bus collapses to 0.4V
                            val = 0.42
                        elif ch_id == "EPS_BUS_3V3" and met >= fault_start_s + 87.0:
                            val = 0.95
                        elif ch_id == "OBC_CPU_LOAD" and met >= fault_start_s + 89.0:
                            # OBC brownout
                            val = 0.0
                        elif ch_id == "COM_RSSI_DBM" and met >= fault_start_s + 91.0:
                            # S-band lost
                            val = -999.0
                            quality = "CORRUPT"
                        elif ch_id == "PAYLOAD_STATE" and met >= fault_start_s + 93.0:
                            val = 0.0

                # Scenario B / power_collapse
                elif scenario_id in ["power_collapse", "power_cascade"]:
                    if met >= fault_start_s:
                        tau = met - fault_start_s
                        if ch_id == "EPS_BUS_V":
                            # UVLO converter sag
                            val = max(0.04, 7.4 - (tau * 0.45) ** 1.5)
                        elif ch_id == "EPS_BUS_3V3" and met >= fault_start_s + 4.0:
                            val = 1.18
                        elif ch_id == "OBC_CPU_LOAD" and met >= fault_start_s + 8.0:
                            val = 0.0
                        elif ch_id == "PAYLOAD_STATE" and met >= fault_start_s + 10.0:
                            val = 0.0
                        elif ch_id == "COM_RSSI_DBM" and met >= fault_start_s + 12.0:
                            val = -999.0
                            quality = "CORRUPT"

                # Scenario C / misleading_early_anomaly
                elif scenario_id == "misleading_early_anomaly":
                    # Early benign ADCS spike at T+80s
                    if 78.0 <= met <= 84.0 and ch_id == "ADCS_RATE_DPS":
                        val = 4.85  # rate spike
                        quality = "DEGRADED"
                    # Real root cause at fault_start_s (T+120s): Battery Cell micro-short
                    if met >= fault_start_s:
                        tau = met - fault_start_s
                        if ch_id == "BATT_TEMP":
                            val = 22.5 + 0.65 * tau
                        elif ch_id == "BATT_TRIP" and met >= fault_start_s + 40.0:
                            val = 1.0
                        elif ch_id == "EPS_BUS_V" and met >= fault_start_s + 42.0:
                            val = 0.08
                        elif ch_id == "OBC_CPU_LOAD" and met >= fault_start_s + 45.0:
                            val = 0.0

                # Scenario D / competing_root_causes
                elif scenario_id == "competing_root_causes":
                    if met >= fault_start_s:
                        tau = met - fault_start_s
                        if ch_id == "THM_TEMP_RAW":
                            # Ambiguous sensor drift: negative bias
                            val = 20.0 - 0.25 * tau
                        elif ch_id == "HEAT_DUTY" and met >= fault_start_s + 5.0:
                            val = 1.0
                        elif ch_id == "BATT_TEMP" and met >= fault_start_s + 25.0:
                            val = 22.5 + 0.45 * (met - (fault_start_s + 25.0))
                        elif ch_id == "BATT_TRIP" and met >= fault_start_s + 80.0:
                            val = 1.0
                        elif ch_id == "EPS_BUS_V" and met >= fault_start_s + 82.0:
                            val = 1.2

                # Scenario / solar_storm
                elif scenario_id == "solar_storm":
                    if met >= fault_start_s:
                        if ch_id == "ADCS_RATE_DPS" and met <= fault_start_s + 18.0:
                            val = 2.45
                            quality = "DEGRADED"
                        elif ch_id == "COM_RSSI_DBM" and met <= fault_start_s + 30.0:
                            val = -88.5 + rng.normal(0, 4.0)

                # Custom Fault Injection
                elif custom_fault:
                    tgt_sub = custom_fault.get("target_subsystem", "thermal_loop")
                    f_type = custom_fault.get("failure_type", "bias_drift")
                    sev = float(custom_fault.get("severity_pct", 85)) / 100.0

                    if met >= fault_start_s:
                        tau = met - fault_start_s
                        if (tgt_sub == "thermal_loop" or tgt_sub == "thermal") and ch_id == "THM_TEMP_RAW":
                            if f_type == "bias_drift":
                                val = val + (tau * 0.8) * sev
                            elif f_type == "stuck_at_zero":
                                val = 0.0
                            elif f_type == "oscillatory_spike":
                                val = val + 15.0 * math.sin(tau * 1.5) * sev
                            elif f_type == "cascade_collapse":
                                val = -64.0 * sev
                        elif (tgt_sub == "eps_bus" or tgt_sub == "eps") and ch_id in ["EPS_BUS_V", "EPS_BUS_3V3"]:
                            val = max(0.0, val * (1.0 - sev * 0.9))
                        elif tgt_sub == "adcs_gyro" and ch_id == "ADCS_RATE_DPS":
                            val = val + 5.0 * sev
                        elif tgt_sub == "comms_rf" and ch_id == "COM_RSSI_DBM":
                            val = -999.0 if f_type == "cascade_collapse" else val - 30.0 * sev
                        elif tgt_sub == "payload_sensor" and ch_id == "PAYLOAD_STATE":
                            val = 0.0

                pkt_seq += 1
                rec = CanonicalTelemetryRecord(
                    packet_id=f"PKT-{pkt_seq}",
                    mission_id="MISSION-CUBESAT-3U",
                    spacecraft_id="SC-01",
                    timestamp=iso_time,
                    mission_elapsed_time=met,
                    subsystem=spec["subsystem"],
                    channel_id=ch_id,
                    signal_name=spec["signal"],
                    value=round(float(val), 4),
                    unit=spec["unit"],
                    quality=quality,
                    source_type="SIMULATED",
                    packet_sequence=pkt_seq,
                    expected_value=round(float(y_expected), 4),
                    metadata={"step": step, "orbit_altitude_km": orbit_altitude_km, "noise_ratio": noise_level}
                )
                records.append(rec)

        # Generate scenario logs for mission lab terminal
        mins = int(fault_start_s // 60)
        secs = int(fault_start_s % 60)
        fault_met_str = f"T+{mins:02d}:{secs:02d}"

        raw_event_specs = []
        if scenario_id in ["power_collapse", "power_cascade"]:
            logs.append(f"[{fault_met_str}.210] [WARN] EPS 7.4V primary rail voltage sag detected (5.12V < 7.20V)")
            logs.append(f"[{fault_met_str}.040] [ALERT] Buck-boost regulator duty cycle saturated at 100%")
            logs.append(f"[{fault_met_str}.320] [CRIT] EPS 3.3V bus current exceeded threshold (2.84A > 2.10A). Power collapse imminent.")
            logs.append(f"[{fault_met_str}.900] [FATAL] OBC UVLO brownout reset triggered. UHF transmitter link muted.")
            raw_event_specs = [
                {"component": "power_bus", "parameter": "voltage_v", "value": 3.12, "offset_s": fault_start_s, "severity": "CRITICAL"},
                {"component": "obc", "parameter": "cpu_load", "value": 0.0, "offset_s": fault_start_s + 8.0, "severity": "FATAL"},
                {"component": "payload", "parameter": "operational_state", "value": 0.0, "offset_s": fault_start_s + 10.0, "severity": "FATAL"},
                {"component": "comms", "parameter": "signal_strength_dbm", "value": -999.0, "offset_s": fault_start_s + 12.0, "severity": "FATAL"},
            ]

        elif scenario_id in ["thermal_runaway", "thermal_cascade"]:
            logs.append(f"[{fault_met_str}.210] [WARN] THM_TEMP_RAW thermistor reading drifted negative by -84.2°C [Sensor Rail Freeze]")
            logs.append(f"[{fault_met_str}.040] [ALERT] Heater control loop triggered 100% duty cycle continuous override")
            logs.append(f"[{fault_met_str}.320] [CRIT] Battery cell temperature exceeded redline (61.4°C > 45.0°C). Over-temp trip triggered.")
            logs.append(f"[{fault_met_str}.850] [FATAL] Solid-state BMS breaker latched. Main power bus collapsed to 0.42V.")
            raw_event_specs = [
                {"component": "thermal_sensor", "parameter": "temperature_c", "value": -64.2, "offset_s": fault_start_s, "severity": "CRITICAL"},
                {"component": "heater_controller", "parameter": "duty_cycle", "value": 1.0, "offset_s": fault_start_s + 8.0, "severity": "WARNING"},
                {"component": "battery", "parameter": "temperature_c", "value": 61.4, "offset_s": fault_start_s + 80.0, "severity": "CRITICAL"},
                {"component": "battery_protection", "parameter": "trip_state", "value": 1.0, "offset_s": fault_start_s + 85.0, "severity": "FATAL"},
                {"component": "power_bus", "parameter": "voltage_v", "value": 0.42, "offset_s": fault_start_s + 87.0, "severity": "FATAL"},
                {"component": "obc", "parameter": "cpu_load", "value": 0.0, "offset_s": fault_start_s + 89.0, "severity": "FATAL"},
                {"component": "comms", "parameter": "signal_strength_dbm", "value": -999.0, "offset_s": fault_start_s + 91.0, "severity": "FATAL"},
            ]

        elif scenario_id == "misleading_early_anomaly":
            logs.append(f"[T+01:20.000] [WARN] ADCS star-tracker rate gyro momentary anomaly (4.85 deg/s > 0.10 deg/s)")
            logs.append(f"[{fault_met_str}.000] [CRIT] Battery cell internal micro-short detected; Joule heat rate +18.4W")
            logs.append(f"[{fault_met_str}.400] [FATAL] BMS protection disconnect latched. EPS bus collapse.")
            raw_event_specs = [
                {"component": "adcs", "parameter": "rate_dps", "value": 4.85, "offset_s": 80.0, "severity": "WARNING"},
                {"component": "battery", "parameter": "temperature_c", "value": 58.2, "offset_s": fault_start_s, "severity": "CRITICAL"},
                {"component": "battery_protection", "parameter": "trip_state", "value": 1.0, "offset_s": fault_start_s + 40.0, "severity": "FATAL"},
                {"component": "power_bus", "parameter": "voltage_v", "value": 0.08, "offset_s": fault_start_s + 42.0, "severity": "FATAL"},
                {"component": "obc", "parameter": "cpu_load", "value": 0.0, "offset_s": fault_start_s + 45.0, "severity": "FATAL"},
            ]

        elif scenario_id == "competing_root_causes":
            logs.append(f"[{fault_met_str}.000] [WARN] Thermal control loop mismatch: Sensor drift vs Heater TRIAC short-circuit")
            logs.append(f"[{fault_met_str}.150] [ALERT] Heater current 1.84A drawn continuously at 100% duty cycle")
            logs.append(f"[{fault_met_str}.800] [CRIT] Pack thermal stress threshold exceeded. Protection breaker tripped.")
            raw_event_specs = [
                {"component": "thermal_sensor", "parameter": "temperature_c", "value": 12.0, "offset_s": fault_start_s, "severity": "WARNING"},
                {"component": "heater_controller", "parameter": "duty_cycle", "value": 1.0, "offset_s": fault_start_s, "severity": "WARNING"},
                {"component": "battery", "parameter": "temperature_c", "value": 52.0, "offset_s": fault_start_s + 60.0, "severity": "CRITICAL"},
                {"component": "battery_protection", "parameter": "trip_state", "value": 1.0, "offset_s": fault_start_s + 80.0, "severity": "FATAL"},
                {"component": "power_bus", "parameter": "voltage_v", "value": 1.2, "offset_s": fault_start_s + 82.0, "severity": "FATAL"},
            ]

        elif scenario_id == "missing_telemetry":
            logs.append(f"[{fault_met_str}.000] [CRIT] Downlink frame dropped: BATT_TEMP and BATT_TRIP channels unobserved")
            logs.append(f"[{fault_met_str}.200] [ALERT] Main power bus sudden collapse without battery precursor telemetry")
            logs.append(f"[{fault_met_str}.500] [INFO] Caelis pipeline engaging UNCERTAINTY / INSUFFICIENT_EVIDENCE fallback")
            raw_event_specs = [
                {"component": "power_bus", "parameter": "voltage_v", "value": 0.8, "offset_s": fault_start_s, "severity": "FATAL"},
                {"component": "obc", "parameter": "cpu_load", "value": 0.0, "offset_s": fault_start_s + 6.0, "severity": "FATAL"},
            ]

        elif scenario_id == "solar_storm":
            logs.append(f"[{fault_met_str}.000] [WARN] Solar particle flux exceeded 10^4 pfu; single-event rate upset in ADCS")
            logs.append(f"[{fault_met_str}.120] [INFO] Transponder bit-error-rate increased; carrier link maintained")
            raw_event_specs = [
                {"component": "adcs", "parameter": "rate_dps", "value": 2.45, "offset_s": fault_start_s, "severity": "WARNING"},
                {"component": "comms", "parameter": "signal_strength_dbm", "value": -88.5, "offset_s": fault_start_s + 10.0, "severity": "WARNING"},
            ]

        elif custom_fault or scenario_id == "custom_fault":
            tgt = (custom_fault or {}).get("target_subsystem", "thermal_loop")
            ftype = (custom_fault or {}).get("failure_type", "bias_drift")
            sev = float((custom_fault or {}).get("severity_pct", 85))

            if "thermal" in tgt:
                logs.append(f"[{fault_met_str}.000] [WARN] Origin: THERM_01 sensor excursion ({ftype.upper()}, severity {sev:.0f}%)")
                logs.append(f"[{fault_met_str}.120] [ALERT] Firmware thermal control loop triggered heater 100% continuous override")
                logs.append(f"[{fault_met_str}.400] [CRIT] Battery cell temperature surge under sustained load")
                logs.append(f"[{fault_met_str}.800] [FATAL] EPS bus undervoltage trip. Telemetry blackout.")
                raw_event_specs = [
                    {"component": "thermal_sensor", "parameter": "temperature_c", "value": 65.4, "offset_s": fault_start_s, "severity": "CRITICAL"},
                    {"component": "heater_controller", "parameter": "duty_cycle", "value": 1.0, "offset_s": fault_start_s + 8.0, "severity": "WARNING"},
                    {"component": "battery", "parameter": "temperature_c", "value": 58.2, "offset_s": fault_start_s + 20.0, "severity": "CRITICAL"},
                    {"component": "power_bus", "parameter": "voltage_v", "value": 0.8, "offset_s": fault_start_s + 85.0, "severity": "FATAL"},
                ]
            elif "eps" in tgt or "power" in tgt:
                logs.append(f"[{fault_met_str}.000] [WARN] Origin: EPS 3.3V bus current surge ({ftype.upper()}, severity {sev:.0f}%)")
                logs.append(f"[{fault_met_str}.120] [ALERT] Primary power converter reached current limit threshold")
                logs.append(f"[{fault_met_str}.400] [CRIT] Low-voltage cutoff latched; OBC brownout impending")
                logs.append(f"[{fault_met_str}.900] [FATAL] Transmitter carrier muted; spacecraft entered safe mode")
                raw_event_specs = [
                    {"component": "power_bus", "parameter": "voltage_v", "value": 1.18, "offset_s": fault_start_s, "severity": "CRITICAL"},
                    {"component": "obc", "parameter": "cpu_load", "value": 0.0, "offset_s": fault_start_s + 8.0, "severity": "FATAL"},
                    {"component": "comms", "parameter": "signal_strength_dbm", "value": -999.0, "offset_s": fault_start_s + 12.0, "severity": "FATAL"},
                ]
            elif "adcs" in tgt or "gyro" in tgt:
                logs.append(f"[{fault_met_str}.000] [WARN] Origin: ADCS rate gyro anomalous spike ({ftype.upper()}, severity {sev:.0f}%)")
                logs.append(f"[{fault_met_str}.200] [ALERT] Attitude determination filter covariance diverged")
                logs.append(f"[{fault_met_str}.600] [CRIT] Spacecraft tumbling; high-gain antenna off-pointing")
                raw_event_specs = [
                    {"component": "adcs", "parameter": "rate_dps", "value": 4.85, "offset_s": fault_start_s, "severity": "CRITICAL"},
                    {"component": "comms", "parameter": "signal_strength_dbm", "value": -88.0, "offset_s": fault_start_s + 15.0, "severity": "WARNING"},
                ]
            elif "comms" in tgt or "rf" in tgt:
                logs.append(f"[{fault_met_str}.000] [WARN] Origin: Transponder RF front-end degradation ({ftype.upper()})")
                logs.append(f"[{fault_met_str}.150] [CRIT] Bit error rate exceeded UHF threshold; frame loss 92%")
                raw_event_specs = [
                    {"component": "comms", "parameter": "signal_strength_dbm", "value": -999.0, "offset_s": fault_start_s, "severity": "CRITICAL"},
                ]
            else:
                logs.append(f"[{fault_met_str}.000] [WARN] Origin: Payload imager sensor malfunction ({ftype.upper()})")
                logs.append(f"[{fault_met_str}.150] [CRIT] Payload power switch tripped by EPS supervisor")
                raw_event_specs = [
                    {"component": "payload", "parameter": "operational_state", "value": 0.0, "offset_s": fault_start_s, "severity": "CRITICAL"},
                ]

        else:
            logs.append(f"[{fault_met_str}.000] [INFO] Nominal spacecraft operation maintained across all telemetry channels.")
            raw_event_specs = []

        for idx, spec in enumerate(raw_event_specs):
            off_s = float(spec.get("offset_s", fault_start_s))
            ev_time = start_time + timedelta(seconds=off_s)
            events.append({
                "id": f"evt_{spec['component']}_{idx+1:02d}",
                "timestamp": ev_time.isoformat(),
                "mission_elapsed_time": round(off_s, 2),
                "component": spec["component"],
                "parameter": spec.get("parameter", "value"),
                "value": spec["value"],
                "z_score": 4.5,
                "confidence": 0.95,
                "source": "SIMULATED",
                "is_anomaly": True,
                "description": f"Injected fault cascade event on {spec['component']}",
                "severity": spec.get("severity", "CRITICAL"),
            })

        summary = {
            "orbit_altitude_km": orbit_altitude_km,
            "duration_seconds": duration_seconds,
            "sampling_rate_hz": sampling_rate_hz,
            "noise_level": noise_level,
            "fault_injected": scenario_id != "nominal_leo",
            "fault_start_met_seconds": fault_start_s,
            "raw_logs": logs,
        }

        subsystems = sorted(list(set(r.subsystem for r in records)))
        channels = sorted(list(set(r.channel_id for r in records)))

        dataset = SimulationDataset(
            simulation_id=sim_id,
            scenario_id=scenario_id,
            name=name,
            description=desc,
            created_at=datetime.now(timezone.utc).isoformat(),
            random_seed=seed,
            configuration_version="v2.4",
            parameters={
                "duration_seconds": duration_seconds,
                "orbit_altitude_km": orbit_altitude_km,
                "noise_level": noise_level,
                "sampling_rate_hz": sampling_rate_hz,
                "custom_fault": custom_fault,
            },
            records=records,
            events=events,
            ground_truth=ground_truth,
            status="GENERATED",
            subsystems=subsystems,
            channels=channels,
            summary=summary,
        )

        # Auto-persist in db_adapter
        try:
            from app.core import db_adapter
            db_adapter.save_simulation_dataset(dataset.to_dict(include_records=True))
        except Exception:
            pass

        return dataset
