package com.example.model

import androidx.compose.runtime.Immutable

enum class AgentId(val displayName: String, val roleSubtitle: String) {
    MONITORING("Monitoring Agent", "Telemetry Ingestion & Drift Watch"),
    PREDICTION("Prediction Agent", "Time-Series Demand Forecasting"),
    ANOMALY("Anomaly Detection Agent", "Isolation Forest Scoring"),
    OPTIMIZATION("Optimization Agent", "Cooling Efficiency & Savings"),
    CONTROL("Control Agent", "Simulated Setpoint Orchestration"),
    SAFETY("Safety Agent", "Envelope & PLC Interlock Guard"),
    REPORTING("Reporting Agent", "WUE & Sustainability Ledger")
}

enum class AgentStatus(val label: String) {
    ACTIVE("Active"),
    ANALYZING("Analyzing"),
    WARNING("Alert"),
    LOCKED("Interlock Hold"),
    IDLE("Standby")
}

@Immutable
data class AgentNodeState(
    val id: AgentId,
    val status: AgentStatus,
    val currentTask: String,
    val latestObservation: String,
    val recommendationOrAction: String,
    val timestampMs: Long
)

enum class MessageSeverity {
    INFO,
    ADVISORY,
    CRITICAL
}

@Immutable
data class AgentMessage(
    val id: String,
    val fromAgent: AgentId,
    val toAgent: AgentId,
    val summary: String,
    val severity: MessageSeverity,
    val timestampMs: Long
)

enum class AnomalySeverity(val label: String) {
    NORMAL("Normal"),
    WARNING("Warning"),
    CRITICAL("Critical")
}

@Immutable
data class AnomalyRecord(
    val id: String,
    val title: String,
    val severity: AnomalySeverity,
    val affectedSensor: String,
    val detectedAtMs: Long,
    val anomalyScore: Double,
    val isSimulatedExample: Boolean,
    val explanation: String,
    val suggestedResponse: String,
    val resolved: Boolean = false
)

enum class OptimizationPriority(val label: String) {
    HIGH("High"),
    MEDIUM("Medium"),
    LOW("Low")
}

enum class SafetyValidationStatus(val label: String) {
    APPROVED("Safety Approved"),
    BLOCKED_BY_SAFETY("Blocked by Safety"),
    PENDING_REVIEW("Pending Review")
}

@Immutable
data class OptimizationRecommendation(
    val id: String,
    val title: String,
    val reason: String,
    val expectedDailySavingsL: Double,
    val priority: OptimizationPriority,
    val safetyStatus: SafetyValidationStatus,
    val safetyReason: String,
    val proposedFlowDeltaPct: Double,
    val proposedTargetTempC: Double,
    val applied: Boolean = false,
    val appliedAtMs: Long? = null
)

@Immutable
data class PredictionPoint(
    val label: String,
    val actualOrHistoricalLph: Double?,
    val predictedBaselineLph: Double,
    val predictedOptimizedLph: Double
)

@Immutable
data class ControlActionLog(
    val id: String,
    val timestampMs: Long,
    val actionTitle: String,
    val operatingMode: OperatingMode,
    val safetyResult: String,
    val accepted: Boolean
)

@Immutable
data class WaterSavingsScenario(
    val baselineDailyL: Double = 100_000.0,
    val proposedReductionPct: Double = 20.0
) {
    val optimizedDailyL: Double
        get() = baselineDailyL * (1.0 - (proposedReductionPct / 100.0))

    val dailySavingsL: Double
        get() = baselineDailyL - optimizedDailyL

    val monthlySavingsL: Double
        get() = dailySavingsL * 30.0

    val yearlySavingsL: Double
        get() = dailySavingsL * 365.0
}

@Immutable
data class TelemetryAdapterSettings(
    val mqttBrokerUrl: String = "mqtts://broker.aquacompute.local:8883",
    val mqttTopicPrefix: String = "datacenter/dc-west-01/cooling",
    val opcUaEndpoint: String = "opc.tcp://plc-gateway.local:4840",
    val sampleIntervalSeconds: Int = 2
)
