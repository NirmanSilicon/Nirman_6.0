"""Data loader service for the Streamlit dashboard.

Connects to SQLite database for high-performance querying and historical retrieval.
"""

from datetime import datetime, timezone, timedelta
from typing import Dict, Any, List, Optional
import pandas as pd
from sqlalchemy import create_engine, desc
from sqlalchemy.orm import sessionmaker

from backend.app.config import DATABASE_URL, DEVICE_OFFLINE_TIMEOUT_SECONDS, ACTIVE_DEVICES
from backend.app.models.device import Device
from backend.app.models.telemetry import Telemetry
from backend.app.models.screening import ScreeningResult
from backend.app.models.model_meta import PlantModelMetadata

engine = create_engine(DATABASE_URL, connect_args={"check_same_thread": False})
SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)


def get_db_session():
    return SessionLocal()


def load_all_devices() -> List[Dict[str, Any]]:
    """Retrieves all 3 registered plant devices and calculates online status."""
    db = get_db_session()
    try:
        now = datetime.now(timezone.utc)
        devices = db.query(Device).all()
        result = []
        for d in devices:
            info = d.to_dict()
            if d.last_seen:
                dt = d.last_seen if d.last_seen.tzinfo else d.last_seen.replace(tzinfo=timezone.utc)
                delta_sec = (now - dt).total_seconds()
                info["is_online"] = (delta_sec <= DEVICE_OFFLINE_TIMEOUT_SECONDS)
                info["seconds_since_last_seen"] = int(delta_sec)
            else:
                info["is_online"] = False
                info["seconds_since_last_seen"] = None
            result.append(info)
        return result
    finally:
        db.close()


def load_latest_plant_status(device_id: str) -> Dict[str, Any]:
    """Retrieves the latest telemetry and screening outcome for a specific plant."""
    db = get_db_session()
    try:
        device = db.query(Device).filter(Device.device_id == device_id).first()
        tele = db.query(Telemetry).filter(Telemetry.device_id == device_id).order_by(desc(Telemetry.id)).first()
        scr = None
        if tele:
            scr = db.query(ScreeningResult).filter(ScreeningResult.telemetry_id == tele.id).first()

        model_meta = db.query(PlantModelMetadata).filter(PlantModelMetadata.device_id == device_id).order_by(desc(PlantModelMetadata.id)).first()

        return {
            "device": device.to_dict() if device else None,
            "telemetry": tele.to_dict() if tele else None,
            "screening": scr.to_dict() if scr else None,
            "model_metadata": model_meta.to_dict() if model_meta else None
        }
    finally:
        db.close()


def load_plant_history_df(device_id: str, limit: int = 100) -> pd.DataFrame:
    """Loads combined telemetry and screening records into a Pandas DataFrame."""
    db = get_db_session()
    try:
        query = (
            db.query(Telemetry, ScreeningResult)
            .outerjoin(ScreeningResult, Telemetry.id == ScreeningResult.telemetry_id)
            .filter(Telemetry.device_id == device_id)
            .order_by(desc(Telemetry.timestamp))
            .limit(limit)
        )
        records = []
        for t, s in query.all():
            row = {
                "id": t.id,
                "timestamp": t.timestamp,
                "soil_moisture_raw": t.soil_moisture_raw,
                "soil_moisture_pct": t.soil_moisture_pct,
                "leaf_temp_c": t.leaf_temp_c,
                "ambient_temp_c": t.ambient_temp_c,
                "ambient_humidity_pct": t.ambient_humidity_pct,
                "light_lux": t.light_lux,
                "vpd_kpa": t.vpd_kpa,
                "delta_t_c": t.delta_t_c,
                "wifi_rssi": t.wifi_rssi,
                "quality_status": t.quality_status,
                "is_simulated": t.is_simulated,
                "expected_leaf_temp_c": s.expected_leaf_temp_c if s else None,
                "residual_c": s.residual_c if s else None,
                "screening_output": s.screening_output if s else "Inconclusive",
                "thermal_status": s.thermal_status if s else "UNKNOWN",
                "soil_status": s.soil_status if s else "UNKNOWN",
                "confidence_score": s.confidence_score if s else 0.0,
                "scientific_reason": s.scientific_reason if s else "",
            }
            records.append(row)
        
        df = pd.DataFrame(records)
        if not df.empty:
            df["timestamp"] = pd.to_datetime(df["timestamp"])
            df = df.sort_values("timestamp")
        return df
    finally:
        db.close()


def load_cross_plant_comparison_df(limit_per_plant: int = 50) -> pd.DataFrame:
    """Loads historical telemetry across all plants for side-by-side comparison."""
    db = get_db_session()
    try:
        dfs = []
        for dev_id in ACTIVE_DEVICES.keys():
            df_p = load_plant_history_df(dev_id, limit=limit_per_plant)
            if not df_p.empty:
                df_p["device_id"] = dev_id
                df_p["plant_name"] = ACTIVE_DEVICES[dev_id]["plant_name"]
                dfs.append(df_p)
        if dfs:
            return pd.concat(dfs, ignore_index=True)
        return pd.DataFrame()
    finally:
        db.close()


def load_fleet_summary_metrics() -> Dict[str, Any]:
    """Calculates aggregated real-time metrics across all 3 plant specimens."""
    devices = load_all_devices()
    plant_statuses = [load_latest_plant_status(d["device_id"]) for d in devices]

    total_nodes = len(devices)
    online_count = sum(1 for d in devices if d.get("is_online"))

    normal_count = sum(1 for p in plant_statuses if p["device"] and p["device"].get("is_online") and p["screening"] and p["screening"].get("screening_output") == "Normal")
    stress_count = sum(1 for p in plant_statuses if p["screening"] and p["screening"].get("screening_output") == "Possible Water-Stress Indication")
    inconclusive_count = sum(1 for p in plant_statuses if not p["screening"] or p["screening"].get("screening_output") == "Inconclusive" or not (p["device"] and p["device"].get("is_online")))

    # Compute averages across valid latest readings
    soil_vals = [p["telemetry"]["soil_moisture_pct"] for p in plant_statuses if p["telemetry"] and p["telemetry"].get("soil_moisture_pct") is not None and p["telemetry"]["soil_moisture_pct"] >= 0]
    delta_vals = [p["telemetry"]["delta_t_c"] for p in plant_statuses if p["telemetry"] and p["telemetry"].get("delta_t_c") is not None and p["telemetry"]["delta_t_c"] > -50]
    ambient_vals = [p["telemetry"]["ambient_temp_c"] for p in plant_statuses if p["telemetry"] and p["telemetry"].get("ambient_temp_c") is not None and p["telemetry"]["ambient_temp_c"] > -50]

    avg_soil = sum(soil_vals) / len(soil_vals) if soil_vals else None
    avg_delta = sum(delta_vals) / len(delta_vals) if delta_vals else None
    avg_ambient = sum(ambient_vals) / len(ambient_vals) if ambient_vals else None

    # Find latest timestamp
    latest_ts_str = "Just now"
    timestamps = [p["telemetry"]["timestamp"] for p in plant_statuses if p["telemetry"] and p["telemetry"].get("timestamp")]
    if timestamps:
        try:
            latest_dt = max([pd.to_datetime(ts) for ts in timestamps])
            latest_ts_str = latest_dt.strftime("%d %b %Y, %I:%M %p")
        except Exception:
            latest_ts_str = "Live"

    return {
        "devices": devices,
        "plant_statuses": plant_statuses,
        "total_nodes": total_nodes,
        "online_count": online_count,
        "normal_count": normal_count,
        "stress_count": stress_count,
        "inconclusive_count": inconclusive_count,
        "avg_soil_pct": avg_soil,
        "avg_delta_t_c": avg_delta,
        "avg_ambient_temp_c": avg_ambient,
        "last_updated": latest_ts_str
    }
