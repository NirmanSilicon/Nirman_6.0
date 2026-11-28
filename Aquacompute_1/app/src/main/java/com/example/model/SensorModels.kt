package com.example.model

import androidx.compose.runtime.Immutable

enum class TelemetryProtocol(val displayName: String, val endpointHint: String) {
    SYNTHETIC_SIMULATOR("Synthetic Sensor Engine", "internal://synthetic-v1"),
    MQTT_BROKER("MQTT Telemetry Broker (Future Adapter)", "mqtts://broker.facility.local:8883/dc01/cooling/#"),
    OPC_UA_SERVER("OPC UA Industrial Server (Future Adapter)", "opc.tcp://plc-gateway.facility.local:4840")
}

interface TelemetrySource {
    val protocol: TelemetryProtocol
    val isSimulated: Boolean
    fun nextReading(previous: SensorReading?, manualOverrides: ManualSensorOverride?): SensorReading
}

@Immutable
data class ManualSensorOverride(
    val flowRateLpm: Double? = null,
    val pressureBar: Double? = null,
    val temperatureC: Double? = null,
    val workloadPct: Double? = null,
    val ambientTempC: Double? = null
)

@Immutable
data class SensorReading(
    val flowRateLpm: Double,
    val pressureBar: Double,
    val temperatureC: Double,
    val workloadPct: Double,
    val ambientTempC: Double,
    val humidityPct: Double,
    val weatherCondition: String,
    val timestampMs: Long,
    val source: TelemetryProtocol = TelemetryProtocol.SYNTHETIC_SIMULATOR
) {
    val hourlyConsumptionLph: Double
        get() = flowRateLpm * 60.0

    val projectedDailyConsumptionL: Double
        get() = flowRateLpm * 60.0 * 24.0

    /**
     * Illustrative Water Usage Effectiveness (L/kWh) based on workload-derived IT load.
     */
    val estimatedWue: Double
        get() {
            val itPowerKw = (workloadPct.coerceIn(10.0, 100.0) / 100.0) * 2800.0
            return hourlyConsumptionLph / itPowerKw
        }
}

enum class OperatingMode(val label: String, val summary: String) {
    AUTOMATIC("Automatic", "Approved optimizations inside safety bounds apply automatically (simulated)."),
    MANUAL("Manual", "Operator reviews and approves every simulated control action."),
    EMERGENCY("Emergency", "Automatic control suspended. Safety interlocks latched.")
}

@Immutable
data class SafetyLimits(
    val minFlowLpm: Double = 38.0,
    val maxFlowLpm: Double = 125.0,
    val minPressureBar: Double = 1.8,
    val maxPressureBar: Double = 5.2,
    val maxTempC: Double = 36.0,
    val minEmergencyFlowLpm: Double = 45.0
)

@Immutable
data class PlcInterlockStatus(
    val primaryPumpOnline: Boolean = true,
    val backupPumpStandby: Boolean = true,
    val valveActuatorPositionPct: Int = 74,
    val pressureReliefInterlockHealthy: Boolean = true,
    val emergencyBypassLatched: Boolean = false
)

enum class CoolingMode(val label: String, val waterFactor: Double) {
    EVAPORATIVE("Evaporative Tower", 1.0),
    HYBRID_CHILLER("Hybrid Economizer", 0.78),
    DIRECT_LIQUID("Direct-to-Chip Loop", 0.64)
}

@Immutable
data class WhatIfParams(
    val coolingMode: CoolingMode = CoolingMode.HYBRID_CHILLER,
    val flowSettingPct: Double = 85.0,
    val workloadPct: Double = 68.0,
    val ambientTempC: Double = 26.5
)

@Immutable
data class WhatIfResult(
    val baselineDailyL: Double,
    val optimizedDailyL: Double,
    val estimatedSavingsDailyL: Double,
    val simulatedFlowLpm: Double,
    val simulatedTempC: Double,
    val simulatedPressureBar: Double,
    val predictedWue: Double
)

enum class ChartTimeRange(val label: String, val shortLabel: String, val spanMs: Long) {
    ONE_HOUR("1 Hour", "1H", 3_600_000L),
    SIX_HOURS("6 Hours", "6H", 21_600_000L),
    TWENTY_FOUR_HOURS("24 Hours", "24H", 86_400_000L),
    SEVEN_DAYS("7 Days", "7D", 7L * 86_400_000L),
    THIRTY_DAYS("30 Days", "30D", 30L * 86_400_000L)
}

enum class StreamConnectionState(val badgeLabel: String, val detailLabel: String) {
    DEMO_STREAMING("DEMO MODE • LIVE", "Simulated telemetry streaming (ready for WebSocket / SSE / MQTT)"),
    PAUSED("DEMO MODE • PAUSED", "Live telemetry updates paused by operator"),
    RECONNECTING("RECONNECTING", "Network interrupted — retaining buffer & auto-reconnecting"),
    OFFLINE_DEMO("DEMO MODE • OFFLINE", "Device offline — running local deterministic demo telemetry"),
    ERROR("STREAM ERROR", "Stream error encountered — tap retry to recover")
}

@Immutable
data class LiveChartPoint(
    val timestampMs: Long,
    val label: String,
    val waterConsumptionLph: Double,
    val predictedLph: Double,
    val optimizedLph: Double,
    val wue: Double,
    val targetWue: Double,
    val waterSavingsLph: Double,
    val coolantTempC: Double,
    val workloadPct: Double,
    val isForecast: Boolean = false,
    val isAnomaly: Boolean = false,
    val isSimulated: Boolean = true
)

@Immutable
data class LiveChartBundle(
    val timeRange: ChartTimeRange = ChartTimeRange.TWENTY_FOUR_HOURS,
    val points: List<LiveChartPoint> = emptyList(),
    val averageConsumptionLph: Double = 0.0,
    val peakConsumptionLph: Double = 0.0,
    val averageWue: Double = 1.48,
    val targetWue: Double = 1.25,
    val cumulativeWindowSavingsL: Double = 0.0,
    val lastUpdatedMs: Long = 0L
)

