from typing import List, Tuple
from backend.app.schemas.telemetry import (
    DiagnosticsResult,
    WorkerSafetyStatus,
    RiskBreakdown,
    ActionRecommendation
)

class RiskCorrelationEngine:
    IDLE_CURRENT_THRESHOLD_A = 0.25  # Below this, motor is considered idle/off

    def evaluate_risk(
        self,
        diagnostics: DiagnosticsResult,
        safety: WorkerSafetyStatus,
        motor_current_a: float,
        is_stale: bool = False
    ) -> Tuple[RiskBreakdown, ActionRecommendation]:
        """
        Computes Risk = M + P + Z + C (capped at 100) and checks rules R1 - R4.
        """
        factors: List[str] = []
        active_rules: List[str] = []

        # Rule R4: Sensor Stale / Data Unavailable
        if is_stale:
            active_rules.append("R4: Sensor data is stale or disconnected")
            return RiskBreakdown(
                score=50,
                level="MEDIUM",
                factors=["Sensor data stale", "Status unavailable"],
                machine_component=20.0,
                ppe_component=0.0,
                zone_component=0.0,
                correlation_bonus=0.0,
                active_rules=active_rules
            ), ActionRecommendation(
                action="CHECK_SENSOR_CONNECTIVITY",
                instruction="Sensor telemetry missing or stale (>5s). Inspect ESP32 power and WiFi/MQTT link immediately.",
                priority="HIGH"
            )

        # 1. Machine Component (M)
        m_factor = 0.0
        if diagnostics.severity == "CRITICAL":
            m_factor = 40.0
            factors.append(f"Critical machine fault ({diagnostics.prediction})")
        elif diagnostics.severity == "WARNING":
            m_factor = 20.0
            factors.append(f"Machine degradation ({diagnostics.prediction})")
        
        # 2. PPE Component (P)
        p_factor = 0.0
        if len(safety.missing_ppe) > 0:
            p_factor = 25.0
            factors.append(f"Missing PPE: {', '.join(safety.missing_ppe)}")

        # 3. Zone / Proximity Component (Z)
        z_factor = 0.0
        if safety.zone_violation or safety.unsafe_proximity:
            z_factor = 25.0
            factors.append("Hazardous zone violation / unsafe machine proximity")

        # 4. Correlation Bonus (C)
        c_factor = 0.0
        machine_degraded = diagnostics.severity in ["WARNING", "CRITICAL"]
        worker_violation = (len(safety.missing_ppe) > 0) or safety.zone_violation or safety.unsafe_proximity

        if machine_degraded and worker_violation:
            c_factor = 10.0
            factors.append("Hazard correlation bonus: worker exposed to abnormal machinery")

        total_score = int(min(100.0, m_factor + p_factor + z_factor + c_factor))

        # Risk Level
        if total_score >= 80:
            level = "CRITICAL"
        elif total_score >= 60:
            level = "HIGH"
        elif total_score >= 30:
            level = "MEDIUM"
        else:
            level = "LOW"

        # Check Specific Correlation Rules
        action = "CONTINUE_MONITORING"
        instruction = "Machine operating within normal parameters. Continue standard monitoring."
        priority = level

        # Rule R2: Critical machine fault and person in zone
        if diagnostics.severity == "CRITICAL" and (safety.zone_violation or safety.unsafe_proximity):
            active_rules.append("R2: Critical machine fault with person in zone")
            action = "EMERGENCY_CLEAR_ZONE"
            instruction = "CRITICAL HAZARD: Immediate supervisor alert! Clear zone around machine and execute controlled operator shutdown."
            priority = "CRITICAL"

        # Rule R1: Machine warning + person in zone
        elif diagnostics.severity == "WARNING" and (safety.zone_violation or safety.unsafe_proximity):
            active_rules.append("R1: Worker near degraded machine")
            action = "CLEAR_ZONE_AND_INSPECT"
            instruction = "Worker in hazard zone of degrading machine. Clear zone and inspect motor alignment/bearings."
            priority = "HIGH"

        # Rule R3: Missing PPE while machine is running
        elif len(safety.missing_ppe) > 0 and motor_current_a > self.IDLE_CURRENT_THRESHOLD_A:
            active_rules.append("R3: Missing PPE while machine active")
            action = "NOTIFY_SUPERVISOR_PPE"
            instruction = f"Active machinery: worker missing {', '.join(safety.missing_ppe)}. Enforce PPE compliance immediately."
            if priority in ["LOW", "MEDIUM"]:
                priority = "HIGH"

        # Single-source recommendations if no composite rule triggered
        elif diagnostics.severity == "CRITICAL":
            action = "CONTROLLED_SHUTDOWN"
            instruction = f"Critical condition detected ({diagnostics.prediction}). Recommend controlled operator shutdown."
            priority = "CRITICAL"
        elif diagnostics.severity == "WARNING":
            if diagnostics.prediction == "VIBRATION_ANOMALY":
                action = "INSPECT_MOTOR"
                instruction = "Vibration anomaly detected. Inspect motor mounting, foundation bolts, and shaft alignment."
            elif diagnostics.prediction == "RISING_TEMPERATURE":
                action = "INSPECT_COOLING"
                instruction = "Thermal elevation detected. Inspect cooling airflow and motor mechanical load."
            elif diagnostics.prediction == "MOTOR_OVERCURRENT":
                action = "INSPECT_BELT_LOAD"
                instruction = "Elevated current draw. Check conveyor belt tension and inspect for mechanical binding."
            priority = "MEDIUM"
        elif safety.zone_violation:
            action = "WARN_WORKER"
            instruction = "Worker detected inside yellow danger perimeter. Instruct worker to step back outside perimeter."
            priority = "MEDIUM"
        elif len(safety.missing_ppe) > 0:
            action = "PPE_COMPLIANCE_NOTICE"
            instruction = f"Worker missing required PPE ({', '.join(safety.missing_ppe)}). Notify area safety officer."
            priority = "LOW"

        risk_breakdown = RiskBreakdown(
            score=total_score,
            level=level,
            factors=factors,
            machine_component=m_factor,
            ppe_component=p_factor,
            zone_component=z_factor,
            correlation_bonus=c_factor,
            active_rules=active_rules
        )

        recommendation = ActionRecommendation(
            action=action,
            instruction=instruction,
            priority=priority
        )

        return risk_breakdown, recommendation

risk_engine = RiskCorrelationEngine()
