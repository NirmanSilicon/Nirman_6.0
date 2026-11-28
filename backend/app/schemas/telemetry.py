from pydantic import BaseModel, Field
from typing import List, Optional, Dict, Any
from datetime import datetime

class AccelerationSample(BaseModel):
    x: float
    y: float
    z: float

class RawSensorBatch(BaseModel):
    machine_id: str = Field(default="MOTOR_01")
    timestamp: Optional[datetime] = None
    temperature_c: float
    motor_current_a: float
    samples: List[AccelerationSample] = []
    protocol: str = "http"

class FeatureSnapshot(BaseModel):
    temperature_c: float
    temp_rate_c_min: float = 0.0
    vibration_rms_g: float
    vibration_peak_g: float
    crest_factor: float
    dominant_frequency_hz: float
    motor_current_a: float
    current_spike_ratio: float = 1.0

class DiagnosticsResult(BaseModel):
    health_index: int = 100
    anomaly_score: float = 0.0
    prediction: str = "NORMAL"  # NORMAL, VIBRATION_ANOMALY, RISING_TEMPERATURE, CRITICAL_TEMPERATURE, MOTOR_OVERCURRENT, SENSOR_FAULT
    severity: str = "NORMAL"    # NORMAL, WARNING, CRITICAL
    probable_fault: Optional[str] = None
    confidence: float = 0.95

class WorkerSafetyStatus(BaseModel):
    persons_detected: int = 0
    missing_ppe: List[str] = []  # ["helmet", "vest"]
    zone_violation: bool = False
    unsafe_proximity: bool = False
    details: List[Dict[str, Any]] = []

class RiskBreakdown(BaseModel):
    score: int = 0               # 0 - 100
    level: str = "LOW"           # LOW, MEDIUM, HIGH, CRITICAL
    factors: List[str] = []
    machine_component: float = 0.0
    ppe_component: float = 0.0
    zone_component: float = 0.0
    correlation_bonus: float = 0.0
    active_rules: List[str] = [] # e.g. ["R1: Worker near degraded machine"]

class ActionRecommendation(BaseModel):
    action: str = "CONTINUE_MONITORING"
    instruction: str = "Machine operating within normal parameters. Continue standard monitoring."
    priority: str = "LOW"        # LOW, MEDIUM, HIGH, CRITICAL

class UnifiedState(BaseModel):
    machine_id: str = "MOTOR_01"
    timestamp: str
    source: str = "hardware"     # hardware, simulation
    protocol: str = "mqtt"       # mqtt, http, opcua
    sensor_status: str = "CONNECTED"  # CONNECTED, STALE, DISCONNECTED
    model_version: str = "1.0.0"
    
    # Telemetry
    temperature_c: float
    vibration_rms_g: float
    vibration_peak_g: float
    dominant_frequency_hz: float
    motor_current_a: float
    
    # AI Modules
    diagnostics: DiagnosticsResult
    safety: WorkerSafetyStatus
    risk: RiskBreakdown
    recommendation: ActionRecommendation
