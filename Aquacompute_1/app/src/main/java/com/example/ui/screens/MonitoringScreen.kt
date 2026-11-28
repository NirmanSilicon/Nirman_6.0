package com.example.ui.screens

import androidx.compose.foundation.BorderStroke
import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.PaddingValues
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.Spacer
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.height
import androidx.compose.foundation.layout.size
import androidx.compose.foundation.layout.width
import androidx.compose.foundation.lazy.LazyColumn
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.filled.Cloud
import androidx.compose.material.icons.filled.Compress
import androidx.compose.material.icons.filled.Memory
import androidx.compose.material.icons.filled.Pause
import androidx.compose.material.icons.filled.PlayArrow
import androidx.compose.material.icons.filled.Refresh
import androidx.compose.material.icons.filled.Thermostat
import androidx.compose.material.icons.filled.WaterDrop
import androidx.compose.material3.Button
import androidx.compose.material3.ButtonDefaults
import androidx.compose.material3.Icon
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.OutlinedButton
import androidx.compose.material3.Slider
import androidx.compose.material3.SliderDefaults
import androidx.compose.material3.Switch
import androidx.compose.material3.SwitchDefaults
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import androidx.compose.runtime.remember
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.graphics.vector.ImageVector
import androidx.compose.ui.platform.testTag
import androidx.compose.ui.unit.dp
import com.example.ui.components.AquaCard
import com.example.ui.components.DataCenterPerformanceChart
import com.example.ui.components.LiveChartStateContainer
import com.example.ui.components.LivePredictionAndAnomalyChart
import com.example.ui.components.LiveStreamControlStrip
import com.example.ui.components.LiveWueMonitoringChart
import com.example.ui.components.RealTimeWaterConsumptionChart
import com.example.ui.components.SectionHeader
import com.example.ui.components.SimulationNoticeBanner
import com.example.ui.components.SparklineChart
import com.example.ui.components.StatusPill
import com.example.ui.components.WaterOptimizationSavingsChart
import com.example.ui.components.formatTimeShort
import com.example.ui.theme.AmberWarn
import com.example.ui.theme.AquaCyan
import com.example.ui.theme.AquaTeal
import com.example.ui.theme.CoralCritical
import com.example.ui.theme.EmeraldOk
import com.example.ui.theme.NavyVoid
import com.example.ui.theme.SlateBorder
import com.example.ui.theme.TextPrimary
import com.example.ui.theme.TextSecondary
import com.example.viewmodel.AquaComputeViewModel
import com.example.viewmodel.AquaDashboardState

@Composable
fun MonitoringScreen(
    state: AquaDashboardState,
    viewModel: AquaComputeViewModel
) {
    val r = state.currentReading
    val hist = state.sensorHistory
    val limits = state.safetyLimits

    // Memoize the 5 sparkline series only when sensorHistory changes
    val flowHistory = remember(hist) { hist.map { it.flowRateLpm } }
    val pressureHistory = remember(hist) { hist.map { it.pressureBar } }
    val tempHistory = remember(hist) { hist.map { it.temperatureC } }
    val workloadHistory = remember(hist) { hist.map { it.workloadPct } }
    val ambientHistory = remember(hist) { hist.map { it.ambientTempC } }

    LazyColumn(
        modifier = Modifier.fillMaxSize(),
        contentPadding = PaddingValues(16.dp),
        verticalArrangement = Arrangement.spacedBy(12.dp)
    ) {
        item(key = "header") {
            SectionHeader(
                title = "Live Sensor Telemetry",
                subtitle = "Last update: ${formatTimeShort(r.timestampMs)} • ${r.source.displayName}",
                badge = if (state.isSimulationRunning) "STREAMING" else "PAUSED",
                badgeColor = if (state.isSimulationRunning) AquaCyan else AmberWarn
            )
        }

        item(key = "notice") {
            SimulationNoticeBanner(
                text = "DEMO MODE (SYNTHETIC STREAM) — Not connected to live IoT/PLC sensors; architecture ready for WebSocket, SSE, MQTT & OPC UA adapters."
            )
        }

        item(key = "stream_control_strip") {
            LiveStreamControlStrip(
                connectionState = state.streamConnectionState,
                selectedRange = state.selectedTimeRange,
                lastUpdatedMs = r.timestampMs,
                isSimulationRunning = state.isSimulationRunning,
                errorMessage = state.streamErrorMessage,
                onSelectRange = { viewModel.selectTimeRange(it) },
                onTogglePause = { viewModel.toggleSimulationRunning() },
                onRetryStream = { viewModel.retryTelemetryStream() }
            )
        }

        item(key = "live_5_charts_suite") {
            LiveChartStateContainer(
                isLoading = state.isChartsWarmingUp,
                hasPoints = state.liveChartBundle.points.isNotEmpty(),
                errorMessage = state.streamErrorMessage,
                onRetry = { viewModel.retryTelemetryStream() }
            ) {
                Column(verticalArrangement = Arrangement.spacedBy(12.dp)) {
                    RealTimeWaterConsumptionChart(bundle = state.liveChartBundle)
                    LiveWueMonitoringChart(bundle = state.liveChartBundle)
                    LivePredictionAndAnomalyChart(bundle = state.liveChartBundle)
                    WaterOptimizationSavingsChart(bundle = state.liveChartBundle)
                    DataCenterPerformanceChart(bundle = state.liveChartBundle)
                }
            }
        }

        item(key = "controls") {
            Row(modifier = Modifier.fillMaxWidth(), horizontalArrangement = Arrangement.spacedBy(10.dp)) {
                Button(
                    onClick = { viewModel.toggleSimulationRunning() },
                    modifier = Modifier.weight(1f).testTag("monitoring_pause_resume"),
                    colors = ButtonDefaults.buttonColors(
                        containerColor = if (state.isSimulationRunning) AquaTeal else AquaCyan,
                        contentColor = NavyVoid
                    )
                ) {
                    Icon(
                        imageVector = if (state.isSimulationRunning) Icons.Default.Pause else Icons.Default.PlayArrow,
                        contentDescription = "Pause or resume simulation",
                        modifier = Modifier.size(18.dp)
                    )
                    Spacer(Modifier.width(6.dp))
                    Text(if (state.isSimulationRunning) "Pause Live Feed" else "Resume Live Feed")
                }
                OutlinedButton(
                    onClick = { viewModel.resetNominalTelemetry() },
                    modifier = Modifier.weight(1f).testTag("monitoring_reset_nominal"),
                    border = BorderStroke(1.dp, SlateBorder)
                ) {
                    Icon(Icons.Default.Refresh, contentDescription = "Reset nominal", tint = TextPrimary, modifier = Modifier.size(18.dp))
                    Spacer(Modifier.width(6.dp))
                    Text("Reset Nominal", color = TextPrimary)
                }
            }
        }

        item(key = "sensor_flow") {
            SensorTelemetryCard(
                name = "1. Water Flow Rate",
                value = "%.1f L/min".format(r.flowRateLpm),
                detail = "%.0f L/hr • Safe bounds: %.0f–%.0f L/min".format(r.hourlyConsumptionLph, limits.minFlowLpm, limits.maxFlowLpm),
                icon = Icons.Default.WaterDrop,
                color = if (r.flowRateLpm > limits.maxFlowLpm || r.flowRateLpm < limits.minFlowLpm) CoralCritical else AquaCyan,
                isInBounds = r.flowRateLpm in limits.minFlowLpm..limits.maxFlowLpm,
                history = flowHistory
            )
        }

        item(key = "sensor_pressure") {
            SensorTelemetryCard(
                name = "2. Cooling Loop Pressure",
                value = "%.2f bar".format(r.pressureBar),
                detail = "Safe bounds: %.1f–%.1f bar • Actuator ${state.plcInterlocks.valveActuatorPositionPct}%".format(limits.minPressureBar, limits.maxPressureBar),
                icon = Icons.Default.Compress,
                color = if (r.pressureBar > limits.maxPressureBar || r.pressureBar < limits.minPressureBar) CoralCritical else AquaTeal,
                isInBounds = r.pressureBar in limits.minPressureBar..limits.maxPressureBar,
                history = pressureHistory
            )
        }

        item(key = "sensor_temp") {
            SensorTelemetryCard(
                name = "3. Coolant Return Temperature",
                value = "%.1f °C".format(r.temperatureC),
                detail = "Thermal ceiling: %.1f °C • ΔT tracking active".format(limits.maxTempC),
                icon = Icons.Default.Thermostat,
                color = if (r.temperatureC > limits.maxTempC) CoralCritical else if (r.temperatureC > 30.0) AmberWarn else EmeraldOk,
                isInBounds = r.temperatureC <= limits.maxTempC,
                history = tempHistory
            )
        }

        item(key = "sensor_workload") {
            SensorTelemetryCard(
                name = "4. Data Center IT Workload",
                value = "%.1f %%".format(r.workloadPct),
                detail = "Heat rejection driver • Est. WUE %.2f L/kWh".format(r.estimatedWue),
                icon = Icons.Default.Memory,
                color = if (r.workloadPct > 85.0) AmberWarn else AquaCyan,
                isInBounds = true,
                history = workloadHistory
            )
        }

        item(key = "sensor_weather") {
            SensorTelemetryCard(
                name = "5. Ambient Weather & Environment",
                value = "%.1f °C • %.0f%% RH".format(r.ambientTempC, r.humidityPct),
                detail = "Condition: ${r.weatherCondition} • Economizer enthalpy input",
                icon = Icons.Default.Cloud,
                color = if (r.ambientTempC > 32.0) AmberWarn else AquaTeal,
                isInBounds = true,
                history = ambientHistory
            )
        }

        item(key = "manual_override") {
            AquaCard(accentColor = AmberWarn) {
                Row(
                    modifier = Modifier.fillMaxWidth(),
                    horizontalArrangement = Arrangement.SpaceBetween,
                    verticalAlignment = Alignment.CenterVertically
                ) {
                    Column(modifier = Modifier.weight(1f)) {
                        Text("Manual Sensor Override (Testing)", style = MaterialTheme.typography.titleMedium, color = TextPrimary)
                        Text("Pin synthetic values to test Isolation Forest & Safety Agent.", style = MaterialTheme.typography.bodySmall, color = TextSecondary)
                    }
                    Switch(
                        checked = state.isManualOverrideActive,
                        onCheckedChange = { viewModel.setManualOverrideEnabled(it) },
                        colors = SwitchDefaults.colors(checkedThumbColor = NavyVoid, checkedTrackColor = AmberWarn),
                        modifier = Modifier.testTag("monitoring_manual_switch")
                    )
                }

                Spacer(Modifier.height(8.dp))
                SensorAdjustSlider(
                    label = "Water Flow",
                    valueText = "%.1f L/min".format(r.flowRateLpm),
                    value = r.flowRateLpm.toFloat(),
                    range = 25f..140f,
                    onValueChange = { viewModel.updateManualSensor(flowRateLpm = it.toDouble()) }
                )
                SensorAdjustSlider(
                    label = "Loop Pressure",
                    valueText = "%.2f bar".format(r.pressureBar),
                    value = r.pressureBar.toFloat(),
                    range = 1.0f..6.0f,
                    onValueChange = { viewModel.updateManualSensor(pressureBar = it.toDouble()) }
                )
                SensorAdjustSlider(
                    label = "Coolant Temp",
                    valueText = "%.1f °C".format(r.temperatureC),
                    value = r.temperatureC.toFloat(),
                    range = 16f..42f,
                    onValueChange = { viewModel.updateManualSensor(temperatureC = it.toDouble()) }
                )
                SensorAdjustSlider(
                    label = "IT Workload",
                    valueText = "%.0f %%".format(r.workloadPct),
                    value = r.workloadPct.toFloat(),
                    range = 20f..100f,
                    onValueChange = { viewModel.updateManualSensor(workloadPct = it.toDouble()) }
                )
                SensorAdjustSlider(
                    label = "Ambient Weather Temp",
                    valueText = "%.1f °C".format(r.ambientTempC),
                    value = r.ambientTempC.toFloat(),
                    range = 14f..44f,
                    onValueChange = { viewModel.updateManualSensor(ambientTempC = it.toDouble()) }
                )
            }
        }

        item(key = "bottom_spacer") {
            Spacer(Modifier.height(12.dp))
        }
    }
}

@Composable
private fun SensorTelemetryCard(
    name: String,
    value: String,
    detail: String,
    icon: ImageVector,
    color: Color,
    isInBounds: Boolean,
    history: List<Double>
) {
    AquaCard(accentColor = if (isInBounds) SlateBorder else CoralCritical) {
        Row(
            modifier = Modifier.fillMaxWidth(),
            horizontalArrangement = Arrangement.SpaceBetween,
            verticalAlignment = Alignment.CenterVertically
        ) {
            Row(verticalAlignment = Alignment.CenterVertically, modifier = Modifier.weight(1f)) {
                Icon(icon, contentDescription = name, tint = color, modifier = Modifier.size(22.dp))
                Spacer(Modifier.width(10.dp))
                Column {
                    Text(name, style = MaterialTheme.typography.titleSmall, color = TextSecondary)
                    Text(value, style = MaterialTheme.typography.headlineSmall, color = TextPrimary)
                }
            }
            StatusPill(
                label = if (isInBounds) "IN BOUNDS" else "OUT OF BOUNDS",
                color = if (isInBounds) EmeraldOk else CoralCritical
            )
        }
        Spacer(Modifier.height(8.dp))
        SparklineChart(
            values = history,
            lineColor = color,
            modifier = Modifier.fillMaxWidth().height(46.dp)
        )
        Spacer(Modifier.height(6.dp))
        Text(detail, style = MaterialTheme.typography.labelMedium, color = TextSecondary)
    }
}

@Composable
private fun SensorAdjustSlider(
    label: String,
    valueText: String,
    value: Float,
    range: ClosedFloatingPointRange<Float>,
    onValueChange: (Float) -> Unit
) {
    Column(modifier = Modifier.fillMaxWidth()) {
        Row(modifier = Modifier.fillMaxWidth(), horizontalArrangement = Arrangement.SpaceBetween) {
            Text(label, style = MaterialTheme.typography.bodySmall, color = TextSecondary)
            Text(valueText, style = MaterialTheme.typography.labelMedium, color = AquaCyan)
        }
        Slider(
            value = value.coerceIn(range.start, range.endInclusive),
            onValueChange = onValueChange,
            valueRange = range,
            colors = SliderDefaults.colors(thumbColor = AquaCyan, activeTrackColor = AquaCyan)
        )
    }
}
