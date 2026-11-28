"""Script to calibrate and register all 3 plant baseline models."""

import os
import sys
from pathlib import Path

BASE_DIR = Path(__file__).resolve().parent.parent
sys.path.insert(0, str(BASE_DIR))

from backend.app.database import SessionLocal
from backend.app.models.device import Device
from backend.app.models.telemetry import Telemetry
from backend.app.models.model_meta import PlantModelMetadata
from ml_engine.baseline_trainer import train_plant_baseline, load_plant_baseline
from datetime import datetime, timezone

def calibrate_all():
    db = SessionLocal()
    devices = ["TULSI_01", "HIBISCUS_01", "MONEYPLANT_01"]
    
    for dev_id in devices:
        dev = db.query(Device).filter(Device.device_id == dev_id).first()
        if not dev:
            print(f"Device {dev_id} not found.")
            continue
            
        query = db.query(Telemetry).filter(
            Telemetry.device_id == dev_id,
            Telemetry.quality_status == "VALID",
            Telemetry.light_lux >= 100.0
        )
        
        # Check well-watered subset
        ww_records = query.filter(Telemetry.soil_moisture_pct >= dev.provisional_soil_dry_threshold_pct).order_by(Telemetry.timestamp.asc()).all()
        if len(ww_records) >= 10:
            records = ww_records
            print(f"[{dev_id}] Using {len(records)} well-watered calibration records.")
        else:
            records = query.order_by(Telemetry.timestamp.asc()).all()
            print(f"[{dev_id}] Using all {len(records)} daytime valid records.")

        data = [
            {
                "ambient_temp_c": r.ambient_temp_c,
                "ambient_humidity_pct": r.ambient_humidity_pct,
                "light_lux": r.light_lux,
                "vpd_kpa": r.vpd_kpa if r.vpd_kpa is not None else 1.0,
                "leaf_temp_c": r.leaf_temp_c,
                "timestamp": r.timestamp.isoformat() if r.timestamp else None,
            }
            for r in records
        ]

        metrics = train_plant_baseline(dev_id, data)
        print(f"[{dev_id}] Trained: R2={metrics['r2_score']}, MAE={metrics['mae_score']}°C, Adaptive Threshold={metrics['adaptive_threshold_c']}°C")

        # Update device adaptive threshold
        dev.provisional_temp_residual_threshold_c = metrics["adaptive_threshold_c"]

        # Save metadata record
        meta = PlantModelMetadata(
            device_id=dev_id,
            trained_at=datetime.now(timezone.utc),
            n_samples=metrics["n_samples"],
            n_train=metrics["n_train"],
            n_test=metrics["n_test"],
            r2_score=metrics["r2_score"],
            mae_score=metrics["mae_score"],
            adaptive_threshold_c=metrics["adaptive_threshold_c"],
            residual_std_c=metrics["residual_std_c"],
            residual_mean_c=metrics["residual_mean_c"],
            model_path=metrics["model_path"],
            features_list=",".join(metrics["features_used"]),
            validation_approach=metrics["validation_approach"],
            data_provenance="SIMULATED_TEST_DATA",
            is_active=True,
            notes="Baseline calibration model. Chronological forward validation.",
            scientific_limitations=metrics["scientific_limitations"]
        )
        db.add(meta)
        db.commit()
        
    db.close()
    print("All 3 individual baselines successfully calibrated and registered.")

if __name__ == "__main__":
    calibrate_all()

