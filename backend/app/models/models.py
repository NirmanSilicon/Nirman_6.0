from sqlalchemy import Column, Integer, Float, String, DateTime, Boolean, Text
from datetime import datetime
from backend.app.database import Base

class TelemetryRecord(Base):
    __tablename__ = "telemetry_records"

    id = Column(Integer, primary_key=True, index=True)
    machine_id = Column(String(50), index=True, default="MOTOR_01")
    timestamp = Column(DateTime, default=datetime.utcnow, index=True)
    temperature_c = Column(Float, nullable=False)
    vibration_rms_g = Column(Float, nullable=False)
    vibration_peak_g = Column(Float, nullable=False)
    motor_current_a = Column(Float, nullable=False)
    dominant_frequency_hz = Column(Float, default=0.0)
    anomaly_score = Column(Float, default=0.0)
    health_index = Column(Integer, default=100)
    protocol = Column(String(20), default="mqtt")
    source = Column(String(20), default="hardware")

class AlertRecord(Base):
    __tablename__ = "alerts"

    id = Column(String(50), primary_key=True, index=True)
    timestamp = Column(DateTime, default=datetime.utcnow, index=True)
    machine_id = Column(String(50), index=True, default="MOTOR_01")
    incident_type = Column(String(100), nullable=False)
    severity = Column(String(20), nullable=False)  # WARNING, CRITICAL
    risk_score = Column(Integer, nullable=False)
    recommendation = Column(Text, nullable=False)
    status = Column(String(20), default="NEW")  # NEW, ACKNOWLEDGED, RESOLVED
    evidence_frame_url = Column(String(255), nullable=True)

class IncidentRecord(Base):
    __tablename__ = "incidents"

    id = Column(String(50), primary_key=True, index=True)
    timestamp = Column(DateTime, default=datetime.utcnow, index=True)
    machine_id = Column(String(50), index=True, default="MOTOR_01")
    title = Column(String(150), nullable=False)
    description = Column(Text, nullable=False)
    risk_score = Column(Integer, nullable=False)
    missing_ppe = Column(String(100), default="")
    zone_violation = Column(Boolean, default=False)
    machine_prediction = Column(String(50), default="NORMAL")
    evidence_image = Column(String(255), nullable=True)
    status = Column(String(20), default="OPEN")  # OPEN, RESOLVED
