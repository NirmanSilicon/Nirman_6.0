"""Re-evaluates screening results for all existing telemetry readings to populate new features."""

import os
import sys
from pathlib import Path

BASE_DIR = Path(__file__).resolve().parent.parent
sys.path.insert(0, str(BASE_DIR))

from backend.app.database import SessionLocal
from backend.app.models.device import Device
from backend.app.models.telemetry import Telemetry
from backend.app.models.screening import ScreeningResult
from backend.app.services.screener import evaluate_water_stress

def rescreen_all():
    db = SessionLocal()
    # Delete existing screening results
    deleted = db.query(ScreeningResult).delete()
    db.commit()
    print(f"Cleared {deleted} legacy screening records.")
    
    # Process telemetry in chronological order for each device
    devices = db.query(Device).all()
    dev_map = {d.device_id: d for d in devices}
    
    total_screened = 0
    for dev_id in ["TULSI_01", "HIBISCUS_01", "MONEYPLANT_01"]:
        dev = dev_map[dev_id]
        readings = db.query(Telemetry).filter(Telemetry.device_id == dev_id).order_by(Telemetry.id.asc()).all()
        print(f"Screening {len(readings)} chronological readings for {dev_id}...")
        for r in readings:
            issues = r.quality_issues.split("; ") if r.quality_issues else []
            scr = evaluate_water_stress(
                db=db,
                device=dev,
                telemetry=r,
                quality_status=r.quality_status,
                quality_issues=issues
            )
            total_screened += 1
            
    print(f"Successfully rescreened {total_screened} readings across all 3 plants.")
    
    # Check outcomes
    for dev_id in ["TULSI_01", "HIBISCUS_01", "MONEYPLANT_01"]:
        latest = db.query(ScreeningResult).filter(ScreeningResult.device_id == dev_id).order_by(ScreeningResult.id.desc()).first()
        if latest:
            print(f"[{dev_id} LATEST] Outcome: {latest.screening_output} | Residual: {latest.residual_c}°C | Consecutive Elevated: {latest.consecutive_elevated_count} | Soil Trend: {latest.soil_moisture_trend} | Reason: {latest.scientific_reason[:80]}...")
            
    db.close()

if __name__ == "__main__":
    rescreen_all()

