package com.example.ui.screens

import androidx.compose.foundation.BorderStroke
import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.ExperimentalLayoutApi
import androidx.compose.foundation.layout.FlowRow
import androidx.compose.foundation.layout.PaddingValues
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.Spacer
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.height
import androidx.compose.foundation.layout.width
import androidx.compose.foundation.lazy.LazyColumn
import androidx.compose.foundation.lazy.items
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.filled.CheckCircle
import androidx.compose.material3.Button
import androidx.compose.material3.ButtonDefaults
import androidx.compose.material3.FilterChip
import androidx.compose.material3.FilterChipDefaults
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.OutlinedButton
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.remember
import androidx.compose.runtime.setValue
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.platform.testTag
import androidx.compose.ui.unit.dp
import com.example.model.AnomalySeverity
import com.example.ui.components.AquaCard
import com.example.ui.components.EmptyStateCard
import com.example.ui.components.IsolationScoreGauge
import com.example.ui.components.SectionHeader
import com.example.ui.components.StatusPill
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

@OptIn(ExperimentalLayoutApi::class)
@Composable
fun AnomalyScreen(
    state: AquaDashboardState,
    viewModel: AquaComputeViewModel
) {
    var filterSeverity by remember { mutableStateOf<AnomalySeverity?>(null) }
    val filtered = remember(state.anomalies, filterSeverity) {
        if (filterSeverity == null) state.anomalies
        else state.anomalies.filter { it.severity == filterSeverity }
    }

    LazyColumn(
        modifier = Modifier.fillMaxSize(),
        contentPadding = PaddingValues(16.dp),
        verticalArrangement = Arrangement.spacedBy(12.dp)
    ) {
        item(key = "header") {
            SectionHeader(
                title = "Anomaly Detection Center",
                subtitle = "24-Tree Isolation Forest multivariate scoring across 5 cooling telemetry features",
                badge = state.isolationSeverity.label.uppercase(),
                badgeColor = when (state.isolationSeverity) {
                    AnomalySeverity.CRITICAL -> CoralCritical
                    AnomalySeverity.WARNING -> AmberWarn
                    AnomalySeverity.NORMAL -> EmeraldOk
                }
            )
        }

        item(key = "gauge_card") {
            AquaCard(accentColor = AquaCyan) {
                Row(
                    modifier = Modifier.fillMaxWidth(),
                    verticalAlignment = Alignment.CenterVertically
                ) {
                    IsolationScoreGauge(score = state.isolationScore)
                    Spacer(Modifier.width(14.dp))
                    Column(modifier = Modifier.weight(1f)) {
                        Text("Isolation Forest Live Score", style = MaterialTheme.typography.titleMedium, color = TextPrimary)
                        Spacer(Modifier.height(4.dp))
                        Text(
                            text = "Normal < 0.56  |  Warning 0.56–0.67  |  Critical ≥ 0.68",
                            style = MaterialTheme.typography.labelSmall,
                            color = AquaCyan
                        )
                        Spacer(Modifier.height(6.dp))
                        Text(
                            text = "Detects abnormal water flow, loop pressure drops, and coolant thermal excursions.",
                            style = MaterialTheme.typography.bodySmall,
                            color = TextSecondary
                        )
                    }
                }
                Spacer(Modifier.height(10.dp))
                Row(modifier = Modifier.fillMaxWidth(), horizontalArrangement = Arrangement.spacedBy(8.dp)) {
                    OutlinedButton(
                        onClick = { viewModel.injectSimulatedAnomaly("PRESSURE_DROP") },
                        modifier = Modifier.weight(1f).testTag("inject_pressure_drop"),
                        border = BorderStroke(1.dp, AmberWarn.copy(alpha = 0.6f))
                    ) {
                        Text("Sim Pressure Drop", color = AmberWarn, style = MaterialTheme.typography.labelMedium)
                    }
                    OutlinedButton(
                        onClick = { viewModel.injectSimulatedAnomaly("THERMAL_SURGE") },
                        modifier = Modifier.weight(1f).testTag("inject_thermal_surge"),
                        border = BorderStroke(1.dp, CoralCritical.copy(alpha = 0.6f))
                    ) {
                        Text("Sim Thermal Surge", color = CoralCritical, style = MaterialTheme.typography.labelMedium)
                    }
                }
            }
        }

        item(key = "filters") {
            FlowRow(
                horizontalArrangement = Arrangement.spacedBy(8.dp),
                verticalArrangement = Arrangement.spacedBy(6.dp)
            ) {
                FilterChip(
                    selected = filterSeverity == null,
                    onClick = { filterSeverity = null },
                    label = { Text("All (${state.anomalies.size})") },
                    colors = FilterChipDefaults.filterChipColors(selectedContainerColor = AquaCyan, selectedLabelColor = NavyVoid)
                )
                listOf(AnomalySeverity.CRITICAL, AnomalySeverity.WARNING, AnomalySeverity.NORMAL).forEach { sev ->
                    FilterChip(
                        selected = filterSeverity == sev,
                        onClick = { filterSeverity = if (filterSeverity == sev) null else sev },
                        label = { Text(sev.label) },
                        colors = FilterChipDefaults.filterChipColors(selectedContainerColor = AquaCyan, selectedLabelColor = NavyVoid)
                    )
                }
            }
        }

        if (filtered.isEmpty()) {
            item(key = "empty_anomalies") {
                EmptyStateCard(
                    title = "No matching anomalies",
                    description = "All monitored cooling channels are operating inside nominal Isolation Forest bounds.",
                    icon = Icons.Default.CheckCircle,
                    accent = EmeraldOk
                )
            }
        } else {
            items(
                items = filtered,
                key = { it.id }
            ) { anomaly ->
                val sevColor = when (anomaly.severity) {
                    AnomalySeverity.CRITICAL -> CoralCritical
                    AnomalySeverity.WARNING -> AmberWarn
                    AnomalySeverity.NORMAL -> EmeraldOk
                }
                AquaCard(accentColor = if (anomaly.resolved) SlateBorder else sevColor) {
                    Row(
                        modifier = Modifier.fillMaxWidth(),
                        horizontalArrangement = Arrangement.SpaceBetween,
                        verticalAlignment = Alignment.CenterVertically
                    ) {
                        StatusPill(
                            label = if (anomaly.resolved) "RESOLVED" else anomaly.severity.label.uppercase(),
                            color = if (anomaly.resolved) EmeraldOk else sevColor
                        )
                        StatusPill(
                            label = if (anomaly.isSimulatedExample) "SIMULATED EXAMPLE" else "LIVE DETECTED",
                            color = if (anomaly.isSimulatedExample) AquaTeal else AquaCyan,
                            showDot = false
                        )
                    }
                    Spacer(Modifier.height(8.dp))
                    Text(anomaly.title, style = MaterialTheme.typography.titleMedium, color = TextPrimary)
                    Text(
                        text = "${anomaly.affectedSensor} • Score ${"%.2f".format(anomaly.anomalyScore)} • ${formatTimeShort(anomaly.detectedAtMs)}",
                        style = MaterialTheme.typography.labelMedium,
                        color = sevColor
                    )
                    Spacer(Modifier.height(6.dp))
                    Text("Explanation: ${anomaly.explanation}", style = MaterialTheme.typography.bodySmall, color = TextSecondary)
                    Spacer(Modifier.height(4.dp))
                    Text("Suggested Response: ${anomaly.suggestedResponse}", style = MaterialTheme.typography.bodySmall, color = TextPrimary)

                    if (!anomaly.resolved) {
                        Spacer(Modifier.height(10.dp))
                        FlowRow(
                            horizontalArrangement = Arrangement.spacedBy(8.dp),
                            verticalArrangement = Arrangement.spacedBy(6.dp)
                        ) {
                            Button(
                                onClick = { viewModel.resolveAnomaly(anomaly.id) },
                                colors = ButtonDefaults.buttonColors(containerColor = AquaTeal, contentColor = NavyVoid)
                            ) {
                                Text("Acknowledge & Resolve")
                            }
                            OutlinedButton(
                                onClick = { viewModel.resetNominalTelemetry() },
                                border = BorderStroke(1.dp, SlateBorder)
                            ) {
                                Text("Restore Nominal", color = TextPrimary)
                            }
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
