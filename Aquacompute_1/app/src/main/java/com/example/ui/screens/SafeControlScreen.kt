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
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.layout.width
import androidx.compose.foundation.lazy.LazyColumn
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.filled.History
import androidx.compose.material3.Button
import androidx.compose.material3.ButtonDefaults
import androidx.compose.material3.HorizontalDivider
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.OutlinedButton
import androidx.compose.material3.Slider
import androidx.compose.material3.SliderDefaults
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import androidx.compose.runtime.remember
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.platform.testTag
import androidx.compose.ui.text.style.TextOverflow
import androidx.compose.ui.unit.dp
import com.example.model.OperatingMode
import com.example.ui.components.AquaCard
import com.example.ui.components.EmptyStateCard
import com.example.ui.components.SectionHeader
import com.example.ui.components.SimulationNoticeBanner
import com.example.ui.components.StatusPill
import com.example.ui.components.formatTimeShort
import com.example.ui.theme.AmberWarn
import com.example.ui.theme.AquaCyan
import com.example.ui.theme.AquaTeal
import com.example.ui.theme.CoralCritical
import com.example.ui.theme.EmeraldOk
import com.example.ui.theme.NavyVoid
import com.example.ui.theme.SlateBorder
import com.example.ui.theme.SlateDivider
import com.example.ui.theme.TextPrimary
import com.example.ui.theme.TextSecondary
import com.example.viewmodel.AquaComputeViewModel
import com.example.viewmodel.AquaDashboardState

@Composable
fun SafeControlScreen(
    state: AquaDashboardState,
    viewModel: AquaComputeViewModel
) {
    val limits = state.safetyLimits
    val plc = state.plcInterlocks
    val recentLogs = remember(state.controlLogs) { state.controlLogs.take(8) }

    LazyColumn(
        modifier = Modifier.fillMaxSize(),
        contentPadding = PaddingValues(16.dp),
        verticalArrangement = Arrangement.spacedBy(12.dp)
    ) {
        item(key = "header") {
            SectionHeader(
                title = "Safe Control & Interlocks",
                subtitle = "Safety Agent validation, PLC interlock matrix & operating modes",
                badge = state.operatingMode.label.uppercase(),
                badgeColor = when (state.operatingMode) {
                    OperatingMode.AUTOMATIC -> AquaCyan
                    OperatingMode.MANUAL -> AquaTeal
                    OperatingMode.EMERGENCY -> CoralCritical
                }
            )
        }

        item(key = "notice") {
            if (state.operatingMode == OperatingMode.EMERGENCY) {
                SimulationNoticeBanner(
                    text = "EMERGENCY MODE ACTIVE — All simulated automatic optimizations are suspended and safety bypass is latched.",
                    color = CoralCritical
                )
            } else {
                SimulationNoticeBanner(
                    text = "SOFTWARE SAFETY SIMULATION — Does not connect to or issue commands to real industrial PLCs."
                )
            }
        }

        item(key = "mode_selector") {
            AquaCard(accentColor = SlateBorder) {
                Text("Operating Mode Selection", style = MaterialTheme.typography.titleMedium, color = TextPrimary)
                Spacer(Modifier.height(10.dp))
                Row(modifier = Modifier.fillMaxWidth(), horizontalArrangement = Arrangement.spacedBy(8.dp)) {
                    OperatingMode.entries.forEach { mode ->
                        val selected = state.operatingMode == mode
                        val modeCol = when (mode) {
                            OperatingMode.AUTOMATIC -> AquaCyan
                            OperatingMode.MANUAL -> AquaTeal
                            OperatingMode.EMERGENCY -> CoralCritical
                        }
                        Button(
                            onClick = { viewModel.setOperatingMode(mode) },
                            modifier = Modifier.weight(1f).testTag("safe_mode_${mode.name}"),
                            contentPadding = PaddingValues(horizontal = 6.dp, vertical = 10.dp),
                            colors = ButtonDefaults.buttonColors(
                                containerColor = if (selected) modeCol else NavyVoid,
                                contentColor = if (selected) NavyVoid else TextPrimary
                            ),
                            border = BorderStroke(1.dp, if (selected) modeCol else SlateBorder)
                        ) {
                            Text(
                                text = mode.label,
                                style = MaterialTheme.typography.labelLarge,
                                maxLines = 1,
                                overflow = TextOverflow.Ellipsis
                            )
                        }
                    }
                }
                Spacer(Modifier.height(8.dp))
                Text(state.operatingMode.summary, style = MaterialTheme.typography.bodySmall, color = TextSecondary)
            }
        }

        item(key = "plc_matrix") {
            AquaCard(accentColor = AquaTeal) {
                Row(
                    modifier = Modifier.fillMaxWidth(),
                    horizontalArrangement = Arrangement.SpaceBetween,
                    verticalAlignment = Alignment.CenterVertically
                ) {
                    Text(
                        text = "PLC Interlock & Redundancy (Simulated)",
                        style = MaterialTheme.typography.titleMedium,
                        color = TextPrimary,
                        modifier = Modifier.weight(1f)
                    )
                    Spacer(Modifier.width(8.dp))
                    StatusPill(label = "PLC SIM OK", color = EmeraldOk)
                }
                Spacer(Modifier.height(10.dp))
                InterlockRow("Primary Circulation Pump", if (plc.primaryPumpOnline) "ONLINE" else "FAULT", if (plc.primaryPumpOnline) EmeraldOk else CoralCritical)
                InterlockRow("Backup Pump N+1 Redundancy", if (plc.backupPumpStandby) "HOT STANDBY" else "OFFLINE", EmeraldOk)
                InterlockRow("Proportional Control Valve", "${plc.valveActuatorPositionPct}% OPEN", AquaCyan)
                InterlockRow("Pressure Relief Interlock", if (plc.pressureReliefInterlockHealthy) "ARMED / HEALTHY" else "TRIPPED", if (plc.pressureReliefInterlockHealthy) EmeraldOk else CoralCritical)
                InterlockRow("Emergency Bypass Latch", if (plc.emergencyBypassLatched) "LATCHED" else "CLEAR", if (plc.emergencyBypassLatched) CoralCritical else EmeraldOk)

                Spacer(Modifier.height(10.dp))
                OutlinedButton(
                    onClick = { viewModel.triggerManualOverridePumpTest() },
                    modifier = Modifier.fillMaxWidth().testTag("safe_manual_override_btn"),
                    border = BorderStroke(1.dp, AmberWarn)
                ) {
                    Text("Run Manual Override Redundancy Test (Sim)", color = AmberWarn)
                }
            }
        }

        item(key = "safety_limits") {
            AquaCard(accentColor = SlateBorder) {
                Text("Configurable Safety Limits", style = MaterialTheme.typography.titleMedium, color = TextPrimary)
                Text("Safety Agent blocks any proposed setpoint outside these thresholds.", style = MaterialTheme.typography.bodySmall, color = TextSecondary)
                Spacer(Modifier.height(8.dp))

                LimitSlider(
                    label = "Minimum Flow Floor",
                    valueText = "%.0f L/min".format(limits.minFlowLpm),
                    value = limits.minFlowLpm.toFloat(),
                    range = 20f..65f,
                    onValueChange = { viewModel.updateSafetyLimits(limits.copy(minFlowLpm = it.toDouble())) }
                )
                LimitSlider(
                    label = "Maximum Flow Ceiling",
                    valueText = "%.0f L/min".format(limits.maxFlowLpm),
                    value = limits.maxFlowLpm.toFloat(),
                    range = 90f..160f,
                    onValueChange = { viewModel.updateSafetyLimits(limits.copy(maxFlowLpm = it.toDouble())) }
                )
                LimitSlider(
                    label = "Minimum Pressure Floor",
                    valueText = "%.1f bar".format(limits.minPressureBar),
                    value = limits.minPressureBar.toFloat(),
                    range = 1.0f..2.8f,
                    onValueChange = { viewModel.updateSafetyLimits(limits.copy(minPressureBar = it.toDouble())) }
                )
                LimitSlider(
                    label = "Maximum Coolant Temp",
                    valueText = "%.1f °C".format(limits.maxTempC),
                    value = limits.maxTempC.toFloat(),
                    range = 28f..45f,
                    onValueChange = { viewModel.updateSafetyLimits(limits.copy(maxTempC = it.toDouble())) }
                )
            }
        }

        item(key = "audit_log") {
            if (recentLogs.isEmpty()) {
                EmptyStateCard(
                    title = "No control actions recorded yet",
                    description = "Mode transitions, safety interlock checks, and simulated recommendation approvals will appear here.",
                    icon = Icons.Default.History,
                    accent = AquaCyan
                )
            } else {
                AquaCard(accentColor = SlateBorder) {
                    Text("Control & Safety Audit Log", style = MaterialTheme.typography.titleMedium, color = TextPrimary)
                    Spacer(Modifier.height(8.dp))
                    recentLogs.forEachIndexed { idx, log ->
                        Column(modifier = Modifier.padding(vertical = 4.dp)) {
                            Row(
                                modifier = Modifier.fillMaxWidth(),
                                horizontalArrangement = Arrangement.SpaceBetween
                            ) {
                                Text(
                                    text = log.actionTitle,
                                    style = MaterialTheme.typography.labelLarge,
                                    color = if (log.accepted) AquaCyan else CoralCritical,
                                    modifier = Modifier.weight(1f)
                                )
                                Spacer(Modifier.width(8.dp))
                                Text(formatTimeShort(log.timestampMs), style = MaterialTheme.typography.labelSmall, color = TextSecondary)
                            }
                            Text("${log.operatingMode.label} • ${log.safetyResult}", style = MaterialTheme.typography.bodySmall, color = TextSecondary)
                        }
                        if (idx < recentLogs.lastIndex) {
                            HorizontalDivider(color = SlateDivider)
                        }
                    }
                }
            }
        }

        item(key = "bottom_spacer") {
            Spacer(Modifier.height(12.dp))
        }
    }
}

@Composable
private fun InterlockRow(label: String, status: String, color: Color) {
    Row(
        modifier = Modifier.fillMaxWidth().padding(vertical = 4.dp),
        horizontalArrangement = Arrangement.SpaceBetween,
        verticalAlignment = Alignment.CenterVertically
    ) {
        Text(label, style = MaterialTheme.typography.bodySmall, color = TextSecondary)
        StatusPill(label = status, color = color, showDot = false)
    }
}

@Composable
private fun LimitSlider(
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
