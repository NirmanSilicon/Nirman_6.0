"""
backend/app/core/physics_anomaly/__init__.py

Physics-informed anomaly detection module for AXYRA.
Provides lightweight predictors, residual calculation, and 4-way classification:
- statistically_abnormal
- physically_inconsistent
- both
- neither
"""

from .predictors import (
    PhysicsPredictionResult,
    ThermalHeaterPredictor,
    PowerBusVoltagePredictor,
    SensorIntegrityPredictor,
)
from .hybrid_detector import (
    HybridAnomalyResult,
    HybridAnomalyDetector,
)

__all__ = [
    "PhysicsPredictionResult",
    "ThermalHeaterPredictor",
    "PowerBusVoltagePredictor",
    "SensorIntegrityPredictor",
    "HybridAnomalyResult",
    "HybridAnomalyDetector",
]
