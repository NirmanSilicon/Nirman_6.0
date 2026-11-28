package com.example.engine

import com.example.model.AgentId
import com.example.model.AgentMessage
import com.example.model.AgentNodeState
import com.example.model.AgentStatus
import com.example.model.AnomalyRecord
import com.example.model.AnomalySeverity
import com.example.model.ManualSensorOverride
import com.example.model.MessageSeverity
import com.example.model.OperatingMode
import com.example.model.OptimizationPriority
import com.example.model.OptimizationRecommendation
import com.example.model.PlcInterlockStatus
import com.example.model.SafetyLimits
import com.example.model.SafetyValidationStatus
import com.example.model.SensorReading
import com.example.model.TelemetryProtocol
import com.example.model.TelemetrySource
import kotlin.math.sin
import kotlin.random.Random

class SyntheticTelemetrySource : TelemetrySource {
    override val protocol: TelemetryProtocol = TelemetryProtocol.SYNTHETIC_SIMULATOR
    override val isSimulated: Boolean = true
    private var tickCount = 0

    override fun nextReading(
        previous: SensorReading?,
        manualOverrides: ManualSensorOverride?
    ): SensorReading {
        tickCount++
        val now = System.currentTimeMillis()
        val prev = previous ?: SensorReading(
            flowRateLpm = 69.4,
            pressureBar = 3.20,
            temperatureC = 23.5,
            workloadPct = 68.0,
            ambientTempC = 26.5,
            humidityPct = 54.0,
            weatherCondition = "Partly Cloudy",
            timestampMs = now
        )

        val wave = sin(tickCount * 0.25)
        val workload = manualOverrides?.workloadPct ?: (prev.workloadPct + wave * 1.4 + Random.nextDouble(-1.0, 1.0)).coerceIn(32.0, 96.0)
        val ambient = manualOverrides?.ambientTempC ?: (prev.ambientTempC + wave * 0.2 + Random.nextDouble(-0.15, 0.15)).coerceIn(18.0, 41.0)
        val naturalFlow = 42.0 + (workload * 0.31) + ((ambient - 20.0) * 0.95)
        val flow = manualOverrides?.flowRateLpm ?: (prev.flowRateLpm * 0.55 + naturalFlow * 0.45 + Random.nextDouble(-0.9, 0.9)).coerceIn(34.0, 130.0)
        val pressure = manualOverrides?.pressureBar ?: (2.75 + (flow / 140.0) * 0.85 + Random.nextDouble(-0.04, 0.04)).coerceIn(1.4, 5.4)
        val temp = manualOverrides?.temperatureC ?: (19.0 + workload * 0.065 + (ambient - 22.0) * 0.18 + Random.nextDouble(-0.12, 0.12)).coerceIn(17.5, 40.0)
        val humidity = (54.0 - wave * 1.5 + Random.nextDouble(-0.6, 0.6)).coerceIn(30.0, 82.0)

        val condition = when {
            ambient >= 33.0 -> "High Heat Load"
            ambient >= 28.0 -> "Warm & Dry"
            humidity >= 68.0 -> "Humid Cooling Air"
            else -> "Partly Cloudy"
        }

        return SensorReading(
            flowRateLpm = flow,
            pressureBar = pressure,
            temperatureC = temp,
            workloadPct = workload,
            ambientTempC = ambient,
            humidityPct = humidity,
            weatherCondition = condition,
            timestampMs = now,
            source = TelemetryProtocol.SYNTHETIC_SIMULATOR
        )
    }
}

data class CoordinationCycleOutput(
    val agents: List<AgentNodeState>,
    val newMessages: List<AgentMessage>,
    val detectedAnomaly: AnomalyRecord?,
    val isolationResult: IsolationForestDetector.IsolationResult,
    val recommendations: List<OptimizationRecommendation>,
    val plcInterlocks: PlcInterlockStatus
)

class MultiAgentCoordinator(
    private val isolationForest: IsolationForestDetector = IsolationForestDetector()
) {
    private val recCacheLock = Any()

    @Volatile
    private var cachedRecKey: String? = null

    @Volatile
    private var cachedRecs: List<OptimizationRecommendation> = emptyList()

    fun evaluateCycle(
        reading: SensorReading,
        previousReading: SensorReading?,
        operatingMode: OperatingMode,
        safetyLimits: SafetyLimits,
        appliedIds: Set<String>,
        targetReductionPct: Double
    ): CoordinationCycleOutput {
        val now = reading.timestampMs
        val iso = isolationForest.evaluate(reading)
        val flowDelta = previousReading?.let { reading.flowRateLpm - it.flowRateLpm } ?: 0.0

        // 1. Monitoring Agent
        val monitorObs = "Flow %.1f L/min (Δ%+.1f), %.2f bar, %.1f°C, Load %.0f%%".format(
            reading.flowRateLpm,
            flowDelta,
            reading.pressureBar,
            reading.temperatureC,
            reading.workloadPct
        )
        val monitorStatus = if (kotlin.math.abs(flowDelta) > 8.0) AgentStatus.WARNING else AgentStatus.ACTIVE

        // 2. Prediction Agent
        val projectedDaily = reading.projectedDailyConsumptionL
        val optimizedDaily = projectedDaily * (1.0 - targetReductionPct / 100.0)
        val predObs = "Projected 24h: %,.0f L | Optimized target: %,.0f L".format(projectedDaily, optimizedDaily)

        // 3. Anomaly Detection Agent (Isolation Forest)
        val anomalyStatus = when (iso.severity) {
            AnomalySeverity.CRITICAL -> AgentStatus.WARNING
            AnomalySeverity.WARNING -> AgentStatus.ANALYZING
            AnomalySeverity.NORMAL -> AgentStatus.ACTIVE
        }
        val detectedAnomaly = if (iso.severity != AnomalySeverity.NORMAL) {
            AnomalyRecord(
                id = "anom_${now / 4000}",
                title = when {
                    reading.pressureBar < safetyLimits.minPressureBar -> "Low Loop Pressure Deviation"
                    reading.temperatureC > safetyLimits.maxTempC - 2.0 -> "Thermal Return Spike"
                    reading.flowRateLpm > safetyLimits.maxFlowLpm - 10.0 -> "Excessive Cooling Water Draw"
                    else -> "Multivariate Telemetry Drift"
                },
                severity = iso.severity,
                affectedSensor = iso.topContributingSensor,
                detectedAtMs = now,
                anomalyScore = iso.score,
                isSimulatedExample = false,
                explanation = iso.featureDeviationSummary,
                suggestedResponse = "Inspect primary valve actuator, verify pump redundancy, and throttle non-critical evaporative makeup."
            )
        } else null

        // 4. Optimization Agent + 6. Safety Agent validation (thread-safe cache when bucketed telemetry & safety constraints match)
        val appliedKey = if (appliedIds.isEmpty()) "" else appliedIds.sorted().joinToString(",")
        val recKey = "${(reading.flowRateLpm * 2).toInt()}|${(reading.pressureBar * 10).toInt()}|${(reading.temperatureC * 2).toInt()}|${reading.workloadPct.toInt()}|${(reading.ambientTempC * 2).toInt()}|$safetyLimits|$appliedKey"
        val candidates = synchronized(recCacheLock) {
            if (recKey == cachedRecKey && cachedRecs.isNotEmpty()) {
                cachedRecs
            } else {
                buildRecommendations(reading, safetyLimits, appliedIds).also {
                    cachedRecKey = recKey
                    cachedRecs = it
                }
            }
        }
        val approvedCount = candidates.count { it.safetyStatus == SafetyValidationStatus.APPROVED }

        // 5. Control Agent + PLC Interlocks
        val interlocks = PlcInterlockStatus(
            primaryPumpOnline = reading.pressureBar >= 1.2,
            backupPumpStandby = true,
            valveActuatorPositionPct = ((reading.flowRateLpm / safetyLimits.maxFlowLpm) * 100.0).toInt().coerceIn(25, 100),
            pressureReliefInterlockHealthy = reading.pressureBar <= safetyLimits.maxPressureBar,
            emergencyBypassLatched = operatingMode == OperatingMode.EMERGENCY
        )

        val controlStatus = when (operatingMode) {
            OperatingMode.EMERGENCY -> AgentStatus.LOCKED
            OperatingMode.MANUAL -> AgentStatus.IDLE
            OperatingMode.AUTOMATIC -> AgentStatus.ACTIVE
        }
        val safetyBreached = reading.flowRateLpm > safetyLimits.maxFlowLpm ||
            reading.flowRateLpm < safetyLimits.minFlowLpm ||
            reading.pressureBar > safetyLimits.maxPressureBar ||
            reading.pressureBar < safetyLimits.minPressureBar ||
            reading.temperatureC > safetyLimits.maxTempC

        val safetyStatus = when {
            operatingMode == OperatingMode.EMERGENCY -> AgentStatus.LOCKED
            safetyBreached -> AgentStatus.WARNING
            else -> AgentStatus.ACTIVE
        }

        val agents = listOf(
            AgentNodeState(
                id = AgentId.MONITORING,
                status = monitorStatus,
                currentTask = "Polling 5 simulated cooling channels",
                latestObservation = monitorObs,
                recommendationOrAction = "Streaming telemetry to Prediction & Anomaly agents",
                timestampMs = now
            ),
            AgentNodeState(
                id = AgentId.PREDICTION,
                status = AgentStatus.ACTIVE,
                currentTask = "Forecasting 24h & 7d cooling demand",
                latestObservation = predObs,
                recommendationOrAction = "WUE estimated at %.2f L/kWh".format(reading.estimatedWue),
                timestampMs = now
            ),
            AgentNodeState(
                id = AgentId.ANOMALY,
                status = anomalyStatus,
                currentTask = "Scoring vector via 24-tree Isolation Forest",
                latestObservation = iso.featureDeviationSummary,
                recommendationOrAction = if (detectedAnomaly != null) "Flagged ${iso.severity.label} alert to Safety & Control" else "Nominal cooling envelope confirmed",
                timestampMs = now
            ),
            AgentNodeState(
                id = AgentId.OPTIMIZATION,
                status = AgentStatus.ANALYZING,
                currentTask = "Evaluating pump & economizer savings",
                latestObservation = "${candidates.size} proposals generated ($approvedCount safety-cleared)",
                recommendationOrAction = "Top opportunity: ${candidates.firstOrNull()?.title ?: "Nominal operation"}",
                timestampMs = now
            ),
            AgentNodeState(
                id = AgentId.CONTROL,
                status = controlStatus,
                currentTask = "Managing ${operatingMode.label} mode actuation (simulated)",
                latestObservation = "Valve setpoint ${interlocks.valveActuatorPositionPct}% | Mode: ${operatingMode.label}",
                recommendationOrAction = when (operatingMode) {
                    OperatingMode.EMERGENCY -> "All automatic setpoints suspended"
                    OperatingMode.MANUAL -> "Awaiting operator sign-off for proposed actions"
                    OperatingMode.AUTOMATIC -> "Auto-staging safety-verified flow reductions"
                },
                timestampMs = now
            ),
            AgentNodeState(
                id = AgentId.SAFETY,
                status = safetyStatus,
                currentTask = "Checking bounds & PLC interlock matrix",
                latestObservation = if (safetyBreached) "Threshold breach detected on active loop" else "All 5 parameters inside configured limits",
                recommendationOrAction = if (safetyBreached) "Blocking flow-reduction commands; interlock guard active" else "PLC interlocks & pump redundancy verified",
                timestampMs = now
            ),
            AgentNodeState(
                id = AgentId.REPORTING,
                status = AgentStatus.ACTIVE,
                currentTask = "Aggregating daily/monthly/yearly savings ledger",
                latestObservation = "Baseline vs optimized delta tracked continuously",
                recommendationOrAction = "Sustainability report ready for export",
                timestampMs = now
            )
        )

        val messages = buildList {
            add(
                AgentMessage(
                    id = "msg_mon_${now}",
                    fromAgent = AgentId.MONITORING,
                    toAgent = AgentId.ANOMALY,
                    summary = "Dispatched sample: %.1f L/min, %.2f bar, %.1f°C".format(
                        reading.flowRateLpm,
                        reading.pressureBar,
                        reading.temperatureC
                    ),
                    severity = MessageSeverity.INFO,
                    timestampMs = now
                )
            )
            if (detectedAnomaly != null) {
                add(
                    AgentMessage(
                        id = "msg_anom_${now}",
                        fromAgent = AgentId.ANOMALY,
                        toAgent = AgentId.SAFETY,
                        summary = "${detectedAnomaly.severity.label}: ${detectedAnomaly.title} (${iso.topContributingSensor})",
                        severity = if (detectedAnomaly.severity == AnomalySeverity.CRITICAL) MessageSeverity.CRITICAL else MessageSeverity.ADVISORY,
                        timestampMs = now
                    )
                )
            } else {
                add(
                    AgentMessage(
                        id = "msg_opt_${now}",
                        fromAgent = AgentId.OPTIMIZATION,
                        toAgent = AgentId.SAFETY,
                        summary = "Submitted $approvedCount/${candidates.size} optimization setpoints for interlock verification",
                        severity = MessageSeverity.INFO,
                        timestampMs = now
                    )
                )
            }
        }

        return CoordinationCycleOutput(
            agents = agents,
            newMessages = messages,
            detectedAnomaly = detectedAnomaly,
            isolationResult = iso,
            recommendations = candidates,
            plcInterlocks = interlocks
        )
    }

    private fun buildRecommendations(
        reading: SensorReading,
        limits: SafetyLimits,
        appliedIds: Set<String>
    ): List<OptimizationRecommendation> {
        val rec1Flow = reading.flowRateLpm * 0.86
        val rec1Safe = rec1Flow >= limits.minFlowLpm && reading.temperatureC <= limits.maxTempC - 2.0
        val rec1 = OptimizationRecommendation(
            id = "opt_vfd_trim",
            title = "Trim Variable-Frequency Pump Flow by 14%",
            reason = "Current workload (${reading.workloadPct.toInt()}%) and return temp (${"%.1f".format(reading.temperatureC)}°C) indicate over-pumping headroom.",
            expectedDailySavingsL = (reading.projectedDailyConsumptionL * 0.14).coerceAtLeast(4500.0),
            priority = OptimizationPriority.HIGH,
            safetyStatus = if (rec1Safe) SafetyValidationStatus.APPROVED else SafetyValidationStatus.BLOCKED_BY_SAFETY,
            safetyReason = if (rec1Safe) "Resulting flow %.1f L/min stays above min %.1f L/min".format(rec1Flow, limits.minFlowLpm)
            else "Blocked: resulting flow %.1f L/min violates safety floor or thermal margin".format(rec1Flow),
            proposedFlowDeltaPct = -14.0,
            proposedTargetTempC = (reading.temperatureC + 1.2).coerceAtMost(limits.maxTempC - 1.5),
            applied = appliedIds.contains("opt_vfd_trim")
        )

        val rec2Safe = reading.ambientTempC < 29.5 && reading.flowRateLpm * 0.82 >= limits.minFlowLpm
        val rec2 = OptimizationRecommendation(
            id = "opt_free_cooling",
            title = "Shift to Hybrid Air-Side Economizer Stage",
            reason = "Ambient conditions (${"%.1f".format(reading.ambientTempC)}°C, ${reading.weatherCondition}) allow evaporative basin bypass.",
            expectedDailySavingsL = (reading.projectedDailyConsumptionL * 0.18).coerceAtLeast(6200.0),
            priority = OptimizationPriority.HIGH,
            safetyStatus = if (rec2Safe) SafetyValidationStatus.APPROVED else SafetyValidationStatus.BLOCKED_BY_SAFETY,
            safetyReason = if (rec2Safe) "Ambient enthalpy within dry-economizer envelope"
            else "Blocked: ambient temp or minimum flow threshold exceeded",
            proposedFlowDeltaPct = -18.0,
            proposedTargetTempC = reading.temperatureC + 0.8,
            applied = appliedIds.contains("opt_free_cooling")
        )

        val rec3Flow = reading.flowRateLpm * 0.92
        val rec3Safe = rec3Flow >= limits.minFlowLpm
        val rec3 = OptimizationRecommendation(
            id = "opt_cycles_conc",
            title = "Increase Cooling Tower Cycles of Concentration",
            reason = "Optimize blowdown bleed schedule to cut makeup water loss while monitoring loop pressure (${"%.2f".format(reading.pressureBar)} bar).",
            expectedDailySavingsL = (reading.projectedDailyConsumptionL * 0.08).coerceAtLeast(3100.0),
            priority = OptimizationPriority.MEDIUM,
            safetyStatus = if (rec3Safe) SafetyValidationStatus.APPROVED else SafetyValidationStatus.BLOCKED_BY_SAFETY,
            safetyReason = if (rec3Safe) "Blowdown valve within pressure & flow safety bounds"
            else "Blocked: flow below minimum safe threshold",
            proposedFlowDeltaPct = -8.0,
            proposedTargetTempC = reading.temperatureC,
            applied = appliedIds.contains("opt_cycles_conc")
        )

        return listOf(rec1, rec2, rec3)
    }
}
