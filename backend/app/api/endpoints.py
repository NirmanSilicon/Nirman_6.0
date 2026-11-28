from fastapi import APIRouter, Depends, HTTPException, Query, Response
from sqlalchemy.orm import Session
from typing import List, Optional
from datetime import datetime
import json
import io
import csv

from backend.app.database import get_db
from backend.app.models.models import TelemetryRecord, AlertRecord, IncidentRecord
from backend.app.schemas.telemetry import (
    RawSensorBatch,
    UnifiedState,
    WorkerSafetyStatus,
    RiskBreakdown,
    ActionRecommendation
)
from backend.app.websocket.manager import ws_manager
from backend.app.safety.engine import safety_engine

router = APIRouter()

@router.get("/health")
def health_check():
    return {
        "status": "healthy",
        "timestamp": datetime.utcnow().isoformat(),
        "version": "2.0.0"
    }

@router.post("/sensors/data")
async def ingest_sensor_data(batch: RawSensorBatch, db: Session = Depends(get_db)):
    """
    Ingest a 1-second batch of sensor data (vibration, temperature, current).
    """
    # Push to unified manager (triggers diagnostics, risk engine, and WS broadcasts)
    await ws_manager.update_telemetry(
        machine_id=batch.machine_id,
        temperature_c=batch.temperature_c,
        motor_current_a=batch.motor_current_a,
        samples=batch.samples,
        protocol=batch.protocol,
        source="hardware"
    )

    # Persist snapshot in database
    rec = TelemetryRecord(
        machine_id=batch.machine_id,
        temperature_c=batch.temperature_c,
        vibration_rms_g=ws_manager.current_state.vibration_rms_g,
        vibration_peak_g=ws_manager.current_state.vibration_peak_g,
        motor_current_a=batch.motor_current_a,
        dominant_frequency_hz=ws_manager.current_state.dominant_frequency_hz,
        anomaly_score=ws_manager.current_state.diagnostics.anomaly_score,
        health_index=ws_manager.current_state.diagnostics.health_index,
        protocol=batch.protocol,
        source="hardware"
    )
    db.add(rec)
    db.commit()

    return {"status": "ok", "machine_id": batch.machine_id}

@router.get("/sensors/latest")
def get_latest_sensors():
    return ws_manager.current_state

@router.get("/machines")
def get_machines():
    return [
        {
            "id": "MOTOR_01",
            "name": "Conveyor Drive Motor 01",
            "type": "DC Geared Motor",
            "site": "Plant 1 - Section A",
            "status": ws_manager.current_state.sensor_status,
            "health_index": ws_manager.current_state.diagnostics.health_index
        }
    ]

@router.get("/machines/{machine_id}/health")
def get_machine_health(machine_id: str, db: Session = Depends(get_db)):
    records = db.query(TelemetryRecord).filter(
        TelemetryRecord.machine_id == machine_id
    ).order_by(TelemetryRecord.timestamp.desc()).limit(30).all()

    return {
        "machine_id": machine_id,
        "current_health_index": ws_manager.current_state.diagnostics.health_index,
        "current_severity": ws_manager.current_state.diagnostics.severity,
        "history": [
            {
                "timestamp": r.timestamp.isoformat(),
                "health_index": r.health_index,
                "vibration_rms": r.vibration_rms_g,
                "temperature": r.temperature_c,
                "current": r.motor_current_a
            }
            for r in reversed(records)
        ]
    }

@router.get("/diagnostics/latest")
def get_latest_diagnostics():
    return {
        "diagnostics": ws_manager.current_state.diagnostics,
        "recommendation": ws_manager.current_state.recommendation
    }

@router.get("/safety/status")
def get_safety_status():
    return safety_engine.current_status

@router.post("/safety/update")
async def update_safety_status(
    persons: int = Query(default=1),
    missing_helmet: bool = Query(default=False),
    missing_vest: bool = Query(default=False),
    zone_violation: bool = Query(default=False),
    unsafe_proximity: bool = Query(default=False),
    scenario: str = Query(default="custom")
):
    missing_ppe = []
    if missing_helmet:
        missing_ppe.append("helmet")
    if missing_vest:
        missing_ppe.append("vest")

    new_status = safety_engine.update_manual_or_simulated_safety(
        persons=persons,
        missing_ppe=missing_ppe,
        zone_violation=zone_violation,
        unsafe_proximity=unsafe_proximity,
        scenario=scenario
    )

    # Trigger re-evaluation of unified state
    await ws_manager.update_telemetry(
        machine_id=ws_manager.current_state.machine_id,
        temperature_c=ws_manager.current_state.temperature_c,
        motor_current_a=ws_manager.current_state.motor_current_a,
        samples=[],
        protocol=ws_manager.current_state.protocol,
        source=ws_manager.current_state.source
    )

    return new_status

@router.get("/risk/current")
def get_current_risk():
    return {
        "risk": ws_manager.current_state.risk,
        "recommendation": ws_manager.current_state.recommendation
    }

@router.get("/alerts")
def get_alerts(db: Session = Depends(get_db)):
    alerts = db.query(AlertRecord).order_by(AlertRecord.timestamp.desc()).limit(50).all()
    return alerts

@router.post("/alerts/create")
def create_alert(
    incident_type: str,
    severity: str,
    risk_score: int,
    recommendation: str,
    db: Session = Depends(get_db)
):
    alert_id = f"ALT-{int(datetime.utcnow().timestamp())}"
    evidence_url = safety_engine.capture_evidence_frame(alert_id)
    
    alert = AlertRecord(
        id=alert_id,
        machine_id="MOTOR_01",
        incident_type=incident_type,
        severity=severity,
        risk_score=risk_score,
        recommendation=recommendation,
        status="NEW",
        evidence_frame_url=evidence_url
    )
    db.add(alert)
    db.commit()
    db.refresh(alert)
    return alert

@router.patch("/alerts/{alert_id}")
def update_alert_status(alert_id: str, status: str = Query(..., pattern="^(NEW|ACKNOWLEDGED|RESOLVED)$"), db: Session = Depends(get_db)):
    alert = db.query(AlertRecord).filter(AlertRecord.id == alert_id).first()
    if not alert:
        raise HTTPException(status_code=404, detail="Alert not found")
    alert.status = status
    db.commit()
    return alert

@router.get("/incidents")
def get_incidents(db: Session = Depends(get_db)):
    return db.query(IncidentRecord).order_by(IncidentRecord.timestamp.desc()).all()

@router.get("/analytics/export-csv")
def export_analytics_csv(db: Session = Depends(get_db)):
    records = db.query(TelemetryRecord).order_by(TelemetryRecord.timestamp.desc()).limit(500).all()
    
    output = io.StringIO()
    writer = csv.writer(output)
    writer.writerow([
        "ID", "MachineID", "Timestamp", "Temperature_C", "VibrationRMS_g",
        "VibrationPeak_g", "MotorCurrent_A", "DominantFreq_Hz", "AnomalyScore", "HealthIndex"
    ])
    for r in records:
        writer.writerow([
            r.id, r.machine_id, r.timestamp.isoformat(), r.temperature_c,
            r.vibration_rms_g, r.vibration_peak_g, r.motor_current_a,
            r.dominant_frequency_hz, r.anomaly_score, r.health_index
        ])

    return Response(
        content=output.getvalue(),
        media_type="text/csv",
        headers={"Content-Disposition": "attachment; filename=mechguard_telemetry.csv"}
    )

@router.get("/devices")
def get_devices():
    return [
        {
            "id": "ESP32-DEV-01",
            "type": "Sensor Gateway Microcontroller",
            "status": ws_manager.current_state.sensor_status,
            "ip": "192.168.4.15",
            "sensors": ["MPU6050 (Vibration)", "DS18B20 (Temperature)", "ACS712 (Current)"],
            "sampling_rate": "100 Hz vibration, 10 Hz current, 1 Hz temp",
            "last_seen": ws_manager.current_state.timestamp
        },
        {
            "id": "CAM-SAFETY-01",
            "type": "Industrial RTSP / USB CCTV",
            "status": "ONLINE",
            "fps": 15,
            "yolo_model": "YOLOv8n-PPE v1.0",
            "last_seen": datetime.utcnow().isoformat()
        },
        {
            "id": "MQTT-MOSQUITTO",
            "type": "MQTT Broker",
            "status": "READY",
            "port": 1883
        },
        {
            "id": "OPCUA-GATEWAY",
            "type": "OPC UA Demo Server",
            "status": "READY",
            "port": 4840
        }
    ]
