"""ESP32 CAELIS hardware-in-the-loop telemetry adapter.

The adapter deliberately keeps observed and injected values separate.  A missing
sensor is never represented as REAL data: a bounded engineering estimate is
marked SIMULATED/DEGRADED together with its reason and uncertainty.
"""

from __future__ import annotations

import json
import math
import os
import time
import uuid
from datetime import datetime, timezone
from typing import Any, Dict, Iterable, List, Tuple

from app.simulate.simulation_models import CanonicalTelemetryRecord, SimulationDataset
from app.simulate.validator import validate_telemetry_records
from app.core.telemetry_normalizer import TelemetryNormalizer


DEFAULT_PORT = os.environ.get("CAELIS_ESP32_PORT", "COM8")
DEFAULT_BAUDRATE = 115200


class ESP32TelemetryAdapter:
    """Convert the JSON frames emitted by ``sketch_nov27a.ino`` into CAELIS records."""

    # Conservative lab-reference values used only when a sensor explicitly reports
    # unavailable.  They are deterministic so replay and audit remain reproducible.
    FALLBACKS = {
        "bmp_temp_c": (22.0, "degC"),
        "probe_temp_c": (22.5, "degC"),
        "pressure_hpa": (1013.25, "hPa"),
        "voltage_v": (3.30, "V"),
        "current_ma": (85.0, "mA"),
        "power_mw": (280.5, "mW"),
        "gyro_x": (0.0, "rad/s"),
        "gyro_y": (0.0, "rad/s"),
        "gyro_z": (0.0, "rad/s"),
        "acc_x": (0.0, "m/s2"),
        "acc_y": (0.0, "m/s2"),
        "acc_z": (9.80665, "m/s2"),
    }

    # These names intentionally align with CAELIS's canonical component inference.
    CHANNELS = {
        "bmp_temp_c": ("THERMAL", "THM_TEMP_RAW", "BMP280 ambient temperature", "degC"),
        "pressure_hpa": ("THERMAL", "ENV_PRESSURE_HPA", "BMP280 lab pressure", "hPa"),
        "probe_temp_c": ("BATTERY", "BATT_TEMP", "DS18B20 thermal probe", "degC"),
        # The bench INA219 monitors the ESP32's 3.3 V rail.  It is not the
        # spacecraft main bus, whose collapse threshold is modelled separately.
        "voltage_v": ("EPS", "EPS_RAIL_3V3", "INA219 3.3 V rail voltage", "V"),
        "current_ma": ("EPS", "EPS_CURR", "INA219 bus current", "mA"),
        "power_mw": ("EPS", "EPS_POWER", "INA219 estimated load power", "mW"),
        "gyro_x": ("ADCS", "ADCS_GYRO_X", "MPU6050 gyro X", "rad/s"),
        "gyro_y": ("ADCS", "ADCS_GYRO_Y", "MPU6050 gyro Y", "rad/s"),
        "gyro_z": ("ADCS", "ADCS_GYRO_Z", "MPU6050 gyro Z", "rad/s"),
        "acc_x": ("ADCS", "ADCS_ACC_X", "MPU6050 acceleration X", "m/s2"),
        "acc_y": ("ADCS", "ADCS_ACC_Y", "MPU6050 acceleration Y", "m/s2"),
        "acc_z": ("ADCS", "ADCS_ACC_Z", "MPU6050 acceleration Z", "m/s2"),
    }

    SENSOR_FOR_FIELD = {
        "bmp_temp_c": "bmp280", "pressure_hpa": "bmp280",
        "probe_temp_c": "ds18b20",
        "voltage_v": "ina219", "current_ma": "ina219", "power_mw": "ina219",
        "gyro_x": "mpu6050", "gyro_y": "mpu6050", "gyro_z": "mpu6050",
        "acc_x": "mpu6050", "acc_y": "mpu6050", "acc_z": "mpu6050",
    }

    def read_serial_frames(
        self, port: str = DEFAULT_PORT, max_frames: int = 10, timeout_seconds: float = 8.0
    ) -> Tuple[List[Dict[str, Any]], Dict[str, Any]]:
        """Read complete JSON lines without sending commands to the flight testbed."""
        try:
            import serial  # Installed through backend/requirements.txt.
        except ImportError as exc:
            return [], {"port": port, "connected": False, "reason": f"pyserial unavailable: {exc}"}

        frames: List[Dict[str, Any]] = []
        deadline = time.monotonic() + max(1.0, timeout_seconds)
        try:
            with serial.Serial(port, DEFAULT_BAUDRATE, timeout=0.5) as connection:
                # ESP32 boards may reset on open.  Discard banner lines and wait for a frame.
                while len(frames) < max(1, min(max_frames, 120)) and time.monotonic() < deadline:
                    line = connection.readline().decode("utf-8", errors="replace").strip()
                    if not line or line.startswith("#"):
                        continue
                    try:
                        payload = json.loads(line)
                    except json.JSONDecodeError:
                        continue
                    if isinstance(payload, dict) and isinstance(payload.get("raw"), dict):
                        frames.append(payload)
        except Exception as exc:  # Port busy/disconnected must not create counterfeit REAL data.
            return [], {"port": port, "connected": False, "reason": str(exc)}

        return frames, {
            "port": port,
            "connected": bool(frames),
            "frames_read": len(frames),
            "reason": None if frames else "No valid ESP32 JSON telemetry frame received before timeout.",
        }

    @staticmethod
    def _finite(value: Any) -> bool:
        return isinstance(value, (int, float)) and math.isfinite(float(value))

    def _record(
        self, *, channel_key: str, value: float, met: float, sequence: int,
        timestamp: str, source_type: str, quality: str, metadata: Dict[str, Any], raw: bool = False,
    ) -> CanonicalTelemetryRecord:
        subsystem, channel_id, signal_name, unit = self.CHANNELS[channel_key]
        return CanonicalTelemetryRecord(
            packet_id=f"ESP32-{sequence:07d}",
            mission_id="MISSION-ESP32-HIL",
            spacecraft_id="AXYRA-ESP32-01",
            timestamp=timestamp,
            mission_elapsed_time=round(met, 3),
            subsystem=subsystem,
            channel_id=(f"{channel_id}_OBSERVED" if channel_id.endswith("_RAW") else f"{channel_id}_RAW") if raw else channel_id,
            signal_name=signal_name,
            value=float(value),
            unit=unit,
            quality=quality,
            source_type=source_type,
            packet_sequence=sequence,
            expected_value=None,
            metadata=metadata,
        )

    def frame_to_records(
        self, frame: Dict[str, Any], sequence_start: int = 1, include_scenario: bool = True
    ) -> List[CanonicalTelemetryRecord]:
        """Create REAL raw records plus explicitly marked scenario/fallback records."""
        now = datetime.now(timezone.utc).isoformat()
        met = float(frame.get("timestamp_ms", 0)) / 1000.0
        scenario = str(frame.get("scenario", "NOMINAL")).upper()
        health = frame.get("sensor_health") if isinstance(frame.get("sensor_health"), dict) else {}
        raw = frame.get("raw") if isinstance(frame.get("raw"), dict) else {}
        simulated = frame.get("simulated") if isinstance(frame.get("simulated"), dict) else {}
        records: List[CanonicalTelemetryRecord] = []
        sequence = sequence_start

        for key in self.CHANNELS:
            sensor = self.SENSOR_FOR_FIELD[key]
            sensor_ok = health.get(sensor, False) is True
            raw_value = raw.get(key)
            common_metadata = {
                "device": "ESP32_DEVKIT_V1",
                "scenario": scenario,
                "sensor": sensor,
                "sensor_health": sensor_ok,
                "edge_ai": frame.get("edge_ai", {}),
            }
            if sensor_ok and self._finite(raw_value):
                records.append(self._record(
                    channel_key=key, value=float(raw_value), met=met, sequence=sequence,
                    timestamp=now, source_type="REAL", quality="VALID", metadata=common_metadata, raw=True,
                ))
                sequence += 1
            else:
                estimate, _ = self.FALLBACKS[key]
                fallback_metadata = {
                    **common_metadata,
                    "fallback": True,
                    "fallback_reason": "sensor_not_ready_or_non_finite_reading",
                    "uncertainty": "HIGH",
                    "not_observed_hardware_data": True,
                }
                records.append(self._record(
                    channel_key=key, value=estimate, met=met, sequence=sequence,
                    timestamp=now, source_type="SIMULATED", quality="DEGRADED", metadata=fallback_metadata, raw=False,
                ))
                sequence += 1

            # For an explicit firmware scenario, preserve the injected value in the
            # canonical channel. Raw hardware remains in the *_RAW sibling channel.
            sim_value = simulated.get(key)
            if include_scenario and scenario != "NOMINAL" and self._finite(sim_value):
                records.append(self._record(
                    channel_key=key, value=float(sim_value), met=met, sequence=sequence,
                    timestamp=now, source_type="SIMULATED", quality="VALID",
                    metadata={**common_metadata, "scenario_injection": True, "uncertainty": "CONTROLLED"},
                ))
                sequence += 1

        return records

    def cascade_records(
        self, frame: Dict[str, Any], sequence_start: int) -> List[CanonicalTelemetryRecord]:
        """Add only declared, auditable consequences for firmware fault scenarios."""
        scenario = str(frame.get("scenario", "NOMINAL")).upper()
        met = float(frame.get("timestamp_ms", 0)) / 1000.0
        now = datetime.now(timezone.utc).isoformat()
        plans: List[Tuple[str, float, float, str]] = []
        if scenario in {"THERMAL", "COMBINED"}:
            plans.extend([
                ("HEAT_DUTY", 1.0, 8.0, "ratio"),
                ("BATT_TEMP", 58.2, 60.0, "degC"),
                ("BATT_TRIP", 1.0, 80.0, "state"),
                ("EPS_BUS_V", 0.8, 82.0, "V"),
                ("OBC_CPU_LOAD", 0.0, 90.0, "ratio"),
                ("COM_RSSI_DBM", -999.0, 94.0, "dBm"),
            ])
        elif scenario == "POWER":
            plans.extend([
                ("EPS_BUS_V", 0.8, 0.0, "V"),
                ("OBC_CPU_LOAD", 0.0, 8.0, "ratio"),
                ("COM_RSSI_DBM", -999.0, 12.0, "dBm"),
            ])

        subsystem_for = {
            "HEAT_DUTY": "THERMAL", "BATT_TEMP": "BATTERY", "BATT_TRIP": "BATTERY",
            "EPS_BUS_V": "EPS", "OBC_CPU_LOAD": "OBC", "COM_RSSI_DBM": "COMMS",
        }
        records = []
        for index, (channel_id, value, offset, unit) in enumerate(plans):
            records.append(CanonicalTelemetryRecord(
                packet_id=f"ESP32-CASCADE-{sequence_start + index:07d}",
                mission_id="MISSION-ESP32-HIL",
                spacecraft_id="AXYRA-ESP32-01",
                timestamp=now,
                mission_elapsed_time=round(met + offset, 3),
                subsystem=subsystem_for[channel_id], channel_id=channel_id,
                signal_name=f"Controlled {scenario.lower()} cascade consequence",
                value=value, unit=unit, quality="VALID", source_type="SIMULATED",
                packet_sequence=sequence_start + index, expected_value=None,
                metadata={"scenario": scenario, "cascade_model": "canonical_cubesat_v2.4", "synthetic_consequence": True},
            ))
        return records

    def build_dataset(self, frames: Iterable[Dict[str, Any]], connection: Dict[str, Any]) -> SimulationDataset:
        frames = list(frames)
        records: List[CanonicalTelemetryRecord] = []
        for frame in frames:
            frame_records = self.frame_to_records(frame, sequence_start=len(records) + 1)
            records.extend(frame_records)
            records.extend(self.cascade_records(frame, sequence_start=len(records) + 1))

        normalizer = TelemetryNormalizer()
        validation = validate_telemetry_records(records)
        sim_id = f"ESP32-{uuid.uuid4().hex[:8].upper()}"
        events = normalizer.extract_discrete_events(records)
        scenarios = sorted({str(f.get("scenario", "NOMINAL")).upper() for f in frames})
        return SimulationDataset(
            simulation_id=sim_id,
            scenario_id="esp32_hardware_in_loop",
            name=f"ESP32 hardware-in-the-loop capture ({sim_id})",
            description="Observed ESP32 telemetry with separately labelled controlled scenario and degraded estimates.",
            created_at=datetime.now(timezone.utc).isoformat(), random_seed=0, configuration_version="v2.4-esp32",
            parameters={"connection": connection, "scenarios": scenarios, "real_frames": len(frames)},
            records=records, events=events, ground_truth={"scenario_commands": scenarios},
            status="VALIDATED" if validation.valid else "VALIDATION_FAILED",
            subsystems=sorted({r.subsystem for r in records}), channels=sorted({r.channel_id for r in records}),
            summary={"total_packets": len(records), "events_extracted": len(events), "validation": validation.to_dict()},
        )
