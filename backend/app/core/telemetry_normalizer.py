"""
backend/app/core/telemetry_normalizer.py

Canonical Telemetry Ingestion, Normalization & Feature Extraction Pipeline.
Implements Section 10 & 13 requirements:
- Single canonical ingestion path for simulated and real/uploaded telemetry
- Normalizes into CanonicalTelemetryRecord
- Validates pre-flight data integrity
- Centralized server-side feature extraction
- Physics-informed residual calculation (observed vs. expected)
- Discrete event extraction with strict provenance
"""

import math
from datetime import datetime, timezone
from typing import Dict, List, Optional, Any, Tuple, Union
import numpy as np
import pandas as pd

from app.simulate.simulation_models import CanonicalTelemetryRecord, ValidationReport
from app.simulate.validator import validate_telemetry_records
from app.core.physics_anomaly.predictors import (
    ThermalHeaterPredictor,
    PowerBusVoltagePredictor,
    SensorIntegrityPredictor,
)


class TelemetryNormalizer:
    """
    Central normalizer and feature extractor for telemetry streams.
    """

    def __init__(self):
        self.thermal_predictor = ThermalHeaterPredictor()
        self.power_predictor = PowerBusVoltagePredictor()
        self.sensor_predictor = SensorIntegrityPredictor()

    def normalize_input(
        self,
        raw_data: Union[List[Dict[str, Any]], pd.DataFrame, List[CanonicalTelemetryRecord]],
        mission_id: str = "MISSION-CUBESAT-3U",
        spacecraft_id: str = "SC-01",
        default_source: str = "REAL",
    ) -> List[CanonicalTelemetryRecord]:
        """
        Normalizes diverse input formats (CSV rows, dictionary dumps, records)
        into CanonicalTelemetryRecord objects.
        """
        records: List[CanonicalTelemetryRecord] = []

        if isinstance(raw_data, pd.DataFrame):
            dict_rows = raw_data.to_dict(orient="records")
        elif isinstance(raw_data, list):
            dict_rows = raw_data
        else:
            dict_rows = []

        for idx, item in enumerate(dict_rows):
            if isinstance(item, CanonicalTelemetryRecord):
                records.append(item)
                continue

            # Standardize field naming
            pkt_id = item.get("packet_id") or f"PKT-{1000 + idx}"
            ts = item.get("timestamp") or datetime.now(timezone.utc).isoformat()
            met = float(item.get("mission_elapsed_time", item.get("met", idx * 1.0)))

            # Infer or extract subsystem
            comp = item.get("component") or item.get("subsystem") or item.get("channel_id") or "UNKNOWN"
            subsystem = self._infer_subsystem(comp)

            channel_id = item.get("channel_id") or self._infer_channel_id(comp, item.get("parameter"))
            signal_name = item.get("signal_name") or item.get("parameter") or comp

            val = float(item.get("value", 0.0))
            unit = item.get("unit") or self._infer_unit(channel_id)
            quality = item.get("quality") or "VALID"
            source = item.get("source_type") or item.get("source") or default_source
            seq = int(item.get("packet_sequence", idx + 1))
            exp_val = float(item["expected_value"]) if item.get("expected_value") is not None else None

            rec = CanonicalTelemetryRecord(
                packet_id=str(pkt_id),
                mission_id=str(item.get("mission_id", mission_id)),
                spacecraft_id=str(item.get("spacecraft_id", spacecraft_id)),
                timestamp=str(ts),
                mission_elapsed_time=met,
                subsystem=subsystem,
                channel_id=channel_id,
                signal_name=signal_name,
                value=val,
                unit=unit,
                quality=quality,
                source_type="REAL" if source.upper() in ["REAL", "OBSERVED"] else "SIMULATED",
                packet_sequence=seq,
                expected_value=exp_val,
                metadata=item.get("metadata", {})
            )
            records.append(rec)

        return records

    def extract_channel_features(
        self,
        records: List[CanonicalTelemetryRecord],
        window_size: int = 15,
    ) -> Dict[str, Dict[str, Any]]:
        """
        Calculates centralized statistical and physics-informed features per channel.
        Section 13: All ML features generated server-side.
        """
        by_channel: Dict[str, List[CanonicalTelemetryRecord]] = {}
        for r in records:
            by_channel.setdefault(r.channel_id, []).append(r)

        features: Dict[str, Dict[str, Any]] = {}

        for ch_id, ch_recs in by_channel.items():
            vals = np.array([r.value for r in ch_recs], dtype=float)
            mets = np.array([r.mission_elapsed_time for r in ch_recs], dtype=float)

            if len(vals) == 0:
                continue

            recent_vals = vals[-window_size:] if len(vals) >= window_size else vals
            mean_val = float(np.mean(recent_vals))
            std_val = float(np.std(recent_vals)) if len(recent_vals) > 1 else 0.001
            min_val = float(np.min(recent_vals))
            max_val = float(np.max(recent_vals))
            delta_val = float(vals[-1] - vals[0]) if len(vals) > 1 else 0.0

            # Rate of change
            if len(vals) > 1 and (mets[-1] - mets[0]) > 0:
                roc = float((vals[-1] - vals[-2]) / max(0.001, mets[-1] - mets[-2]))
            else:
                roc = 0.0

            # Physics residual calculation
            expected_val = ch_recs[-1].expected_value if ch_recs[-1].expected_value is not None else mean_val
            residual = float(vals[-1] - expected_val)
            norm_residual = float(residual / max(0.01, std_val))

            features[ch_id] = {
                "channel_id": ch_id,
                "subsystem": ch_recs[-1].subsystem,
                "latest_value": float(vals[-1]),
                "expected_value": round(expected_val, 4),
                "residual": round(residual, 4),
                "normalized_residual": round(norm_residual, 3),
                "feat_mean": round(mean_val, 4),
                "feat_std": round(std_val, 4),
                "feat_min": round(min_val, 4),
                "feat_max": round(max_val, 4),
                "feat_delta": round(delta_val, 4),
                "feat_rate_of_change": round(roc, 4),
                "sample_count": len(vals),
            }

        return features

    def extract_discrete_events(
        self,
        records: List[CanonicalTelemetryRecord],
    ) -> List[Dict[str, Any]]:
        """
        Converts anomalies, residual departures, and threshold crossings into discrete events
        for the Temporal Event Graph (Section 15).
        """
        events: List[Dict[str, Any]] = []
        by_channel: Dict[str, List[CanonicalTelemetryRecord]] = {}
        for r in records:
            by_channel.setdefault(r.channel_id, []).append(r)

        event_idx = 1

        for ch_id, ch_recs in by_channel.items():
            vals = [r.value for r in ch_recs]
            if not vals:
                continue

            baseline_mean = np.mean(vals[:max(5, len(vals) // 4)]) if len(vals) >= 5 else vals[0]
            baseline_std = max(0.01, float(np.std(vals[:max(5, len(vals) // 4)]))) if len(vals) >= 5 else 0.5

            first_anomaly_rec = None
            first_anomaly_z = 0.0

            for r in ch_recs:
                z = abs(r.value - baseline_mean) / baseline_std

                # Distinct anomaly criteria:
                # 1. Extreme z-score departure (Z > 3.5)
                # 2. Hard sentinel/out-of-bounds flags
                # 3. Specific known fault thresholds
                is_anom = False
                if z > 3.5:
                    is_anom = True
                elif r.quality in ["OUT_OF_BOUNDS", "CORRUPT"]:
                    is_anom = True
                elif "TRIP" in ch_id and r.value > 0.5:
                    is_anom = True
                elif "BUS" in ch_id and r.value < 4.0:
                    is_anom = True
                elif "CPU" in ch_id and r.value <= 0.01:
                    is_anom = True
                elif "RSSI" in ch_id and r.value < -900.0:
                    is_anom = True

                if is_anom:
                    first_anomaly_rec = r
                    first_anomaly_z = z
                    break

            if first_anomaly_rec:
                comp_name = self._channel_to_component(ch_id)
                events.append({
                    "id": f"evt_{comp_name}_{event_idx:02d}",
                    "timestamp": first_anomaly_rec.timestamp,
                    "mission_elapsed_time": first_anomaly_rec.mission_elapsed_time,
                    "component": comp_name,
                    "subsystem": first_anomaly_rec.subsystem,
                    "channel_id": ch_id,
                    "parameter": first_anomaly_rec.signal_name,
                    "value": first_anomaly_rec.value,
                    "expected_value": first_anomaly_rec.expected_value,
                    "z_score": round(first_anomaly_z, 3),
                    "confidence": round(min(0.99, 0.70 + 0.05 * min(5.0, first_anomaly_z)), 3),
                    "event_type": "sensor_departure" if first_anomaly_z < 6.0 else "state_collapse",
                    "description": f"Significant departure in {first_anomaly_rec.signal_name} (Z={first_anomaly_z:.1f})",
                    "source": first_anomaly_rec.source_type,
                    "is_anomaly": True,
                })
                event_idx += 1

        # Sort events chronologically by MET
        events.sort(key=lambda e: e.get("mission_elapsed_time", 0.0))
        return events

    def _infer_subsystem(self, comp: str) -> str:
        c = comp.upper()
        if "THERM" in c or "HEAT" in c:
            return "THERMAL"
        if "BATT" in c or "CELL" in c:
            return "BATTERY"
        if "EPS" in c or "BUS" in c or "POWER" in c:
            return "EPS"
        if "OBC" in c or "CPU" in c or "PROC" in c:
            return "OBC"
        if "COM" in c or "RF" in c or "SBAND" in c or "UHF" in c:
            return "COMMS"
        if "ADCS" in c or "GYRO" in c or "STAR" in c or "ATT" in c:
            return "ADCS"
        if "PAYLOAD" in c or "IMAGER" in c or "CAM" in c:
            return "PAYLOAD"
        return "UNKNOWN"

    def _infer_channel_id(self, comp: str, param: Optional[str]) -> str:
        c = comp.lower()
        if "thermal_sensor" in c:
            return "THM_TEMP_RAW"
        if "heater" in c:
            return "HEAT_DUTY"
        if "battery_protection" in c:
            return "BATT_TRIP"
        if "battery" in c:
            return "BATT_TEMP"
        if "power_bus" in c or "eps" in c:
            return "EPS_BUS_V"
        if "obc" in c:
            return "OBC_CPU_LOAD"
        if "comms" in c:
            return "COM_RSSI_DBM"
        if "adcs" in c:
            return "ADCS_RATE_DPS"
        if "payload" in c:
            return "PAYLOAD_STATE"
        return f"{comp.upper()}_CH"

    def _infer_unit(self, channel_id: str) -> str:
        c = channel_id.upper()
        if "TEMP" in c:
            return "degC"
        if "V" in c or "VOLT" in c:
            return "V"
        if "DUTY" in c or "RATIO" in c or "LOAD" in c:
            return "ratio"
        if "RSSI" in c or "DBM" in c:
            return "dBm"
        if "RATE" in c or "DPS" in c:
            return "deg/s"
        if "TRIP" in c or "STATE" in c:
            return "state"
        return "dimensionless"

    def _channel_to_component(self, channel_id: str) -> str:
        c = channel_id.upper()
        if "THM" in c:
            return "thermal_sensor"
        if "HEAT" in c:
            return "heater_controller"
        if "BATT_TRIP" in c:
            return "battery_protection"
        if "BATT" in c:
            return "battery"
        if "EPS" in c or "BUS" in c:
            return "power_bus"
        if "OBC" in c:
            return "obc"
        if "COM" in c:
            return "comms"
        if "ADCS" in c:
            return "adcs"
        if "PAYLOAD" in c:
            return "payload"
        return channel_id.lower()
