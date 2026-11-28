package com.example.ui.screens

import androidx.compose.foundation.BorderStroke
import androidx.compose.foundation.Image
import androidx.compose.foundation.background
import androidx.compose.foundation.clickable
import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.BoxWithConstraints
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.ExperimentalLayoutApi
import androidx.compose.foundation.layout.FlowRow
import androidx.compose.foundation.layout.PaddingValues
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.Spacer
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.height
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.layout.size
import androidx.compose.foundation.layout.width
import androidx.compose.foundation.lazy.LazyColumn
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.automirrored.filled.ShowChart
import androidx.compose.material.icons.filled.AutoAwesome
import androidx.compose.material.icons.filled.Pause
import androidx.compose.material.icons.filled.PlayArrow
import androidx.compose.material.icons.filled.Savings
import androidx.compose.material.icons.filled.Shield
import androidx.compose.material.icons.filled.Speed
import androidx.compose.material.icons.filled.WaterDrop
import androidx.compose.material.icons.filled.WarningAmber
import androidx.compose.material3.Button
import androidx.compose.material3.ButtonDefaults
import androidx.compose.material3.Icon
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.OutlinedButton
import androidx.compose.material3.Surface
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import androidx.compose.runtime.remember
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.clip
import androidx.compose.ui.graphics.Brush
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.graphics.vector.ImageVector
import androidx.compose.ui.layout.ContentScale
import androidx.compose.ui.platform.testTag
import androidx.compose.ui.res.painterResource
import androidx.compose.ui.unit.dp
import com.example.R
import com.example.model.OperatingMode
import com.example.ui.AquaSection
import com.example.ui.components.AquaCard
import com.example.ui.components.GeminiAnalystPanel
import com.example.ui.components.KpiMetricCard
import com.example.ui.components.LiveChartStateContainer
import com.example.ui.components.LiveStreamControlStrip
import com.example.ui.components.LiveWueMonitoringChart
import com.example.ui.components.MultiSeriesForecastChart
import com.example.ui.components.RealTimeWaterConsumptionChart
import com.example.ui.components.SimulationNoticeBanner
import com.example.ui.components.StatusPill
import com.example.ui.components.formatLitres
import com.example.ui.theme.AmberWarn
import com.example.ui.theme.AquaCyan
import com.example.ui.theme.AquaTeal
import com.example.ui.theme.CoralCritical
import com.example.ui.theme.EmeraldOk
import com.example.ui.theme.NavyVoid
import com.example.ui.theme.PureWhite
import com.example.ui.theme.SlateBorder
import com.example.ui.theme.TextPrimary
import com.example.ui.theme.TextSecondary
import com.example.viewmodel.AquaComputeViewModel
import com.example.viewmodel.AquaDashboardState

private data class OverviewKpiItem(
    val title: String,
    val value: String,
    val unitOrSub: String,
    val icon: ImageVector,
    val accent: Color,
    val targetSection: AquaSection
)

@OptIn(ExperimentalLayoutApi::class)
@Composable
fun OverviewScreen(
    state: AquaDashboardState,
    viewModel: AquaComputeViewModel,
    onNavigate: (AquaSection) -> Unit
) {
    val r = state.currentReading
    val statusColor = when {
        state.operatingMode == OperatingMode.EMERGENCY -> CoralCritical
        state.activeAnomaliesCount > 0 -> AmberWarn
        else -> EmeraldOk
    }
    val predictedDailyL = remember(state.hourlyForecast, r.projectedDailyConsumptionL) {
        state.hourlyForecast.lastOrNull()?.predictedBaselineLph?.times(24.0) ?: r.projectedDailyConsumptionL
    }
    val topRec = state.recommendations.firstOrNull()
    val kpiItems = remember(
        r.flowRateLpm,
        r.hourlyConsumptionLph,
        r.projectedDailyConsumptionL,
        r.estimatedWue,
        predictedDailyL,
        state.savingsScenario.dailySavingsL,
        state.savingsScenario.proposedReductionPct,
        state.activeAnomaliesCount,
        state.isolationScore,
        state.systemHealthLabel,
        state.agents.size,
        statusColor
    ) {
        listOf(
            OverviewKpiItem(
                title = "Current Flow",
                value = "%.1f L/m".format(r.flowRateLpm),
                unitOrSub = "%.0f L/hr draw".format(r.hourlyConsumptionLph),
                icon = Icons.Default.WaterDrop,
                accent = AquaCyan,
                targetSection = AquaSection.MONITORING
            ),
            OverviewKpiItem(
                title = "Daily Usage",
                value = formatLitres(r.projectedDailyConsumptionL),
                unitOrSub = "WUE %.2f L/kWh".format(r.estimatedWue),
                icon = Icons.Default.Speed,
                accent = AquaTeal,
                targetSection = AquaSection.REPORTS
            ),
            OverviewKpiItem(
                title = "Predicted 24h",
                value = formatLitres(predictedDailyL),
                unitOrSub = "AI trend forecast",
                icon = Icons.AutoMirrored.Filled.ShowChart,
                accent = AmberWarn,
                targetSection = AquaSection.PREDICTIONS
            ),
            OverviewKpiItem(
                title = "Est. Savings",
                value = formatLitres(state.savingsScenario.dailySavingsL),
                unitOrSub = "${state.savingsScenario.proposedReductionPct.toInt()}% target/day",
                icon = Icons.Default.Savings,
                accent = EmeraldOk,
                targetSection = AquaSection.OPTIMIZATION
            ),
            OverviewKpiItem(
                title = "Active Anomalies",
                value = "${state.activeAnomaliesCount}",
                unitOrSub = "IF Score %.2f".format(state.isolationScore),
                icon = Icons.Default.WarningAmber,
                accent = if (state.activeAnomaliesCount > 0) CoralCritical else EmeraldOk,
                targetSection = AquaSection.ANOMALIES
            ),
            OverviewKpiItem(
                title = "System Status",
                value = state.systemHealthLabel,
                unitOrSub = "${state.agents.size} AI agents active",
                icon = Icons.Default.Shield,
                accent = statusColor,
                targetSection = AquaSection.SAFE_CONTROL
            )
        )
    }

    LazyColumn(
        modifier = Modifier.fillMaxSize(),
        contentPadding = PaddingValues(16.dp),
        verticalArrangement = Arrangement.spacedBy(14.dp)
    ) {
        item(key = "hero_banner") {
            Surface(
                modifier = Modifier
                    .fillMaxWidth()
                    .height(196.dp),
                shape = RoundedCornerShape(20.dp),
                border = BorderStroke(1.dp, SlateBorder)
            ) {
                Box(modifier = Modifier.fillMaxSize()) {
                    Image(
                        painter = painterResource(id = R.drawable.img_datacenter_banner_1795442206869),
                        contentDescription = "Data center sustainable liquid cooling architecture",
                        contentScale = ContentScale.Crop,
                        modifier = Modifier.fillMaxSize()
                    )
                    Box(
                        modifier = Modifier
                            .fillMaxSize()
                            .background(
                                Brush.verticalGradient(
                                    colors = listOf(
                                        NavyVoid.copy(alpha = 0.50f),
                                        NavyVoid.copy(alpha = 0.94f)
                                    )
                                )
                            )
                            .padding(16.dp)
                    ) {
                        Column(
                            modifier = Modifier.fillMaxSize(),
                            verticalArrangement = Arrangement.SpaceBetween
                        ) {
                            Row(
                                modifier = Modifier.fillMaxWidth(),
                                horizontalArrangement = Arrangement.SpaceBetween,
                                verticalAlignment = Alignment.CenterVertically
                            ) {
                                StatusPill(
                                    label = if (state.isSimulationRunning) "LIVE SIM" else "PAUSED",
                                    color = if (state.isSimulationRunning) AquaCyan else AmberWarn
                                )
                                StatusPill(
                                    label = "${state.operatingMode.label.uppercase()} MODE",
                                    color = statusColor
                                )
                            }
                            Column {
                                Text(
                                    text = "AquaCompute AI",
                                    style = MaterialTheme.typography.headlineMedium,
                                    color = PureWhite
                                )
                                Text(
                                    text = "Smarter Cooling. Less Water Waste. A Sustainable Digital Future.",
                                    style = MaterialTheme.typography.bodySmall,
                                    color = AquaCyan
                                )
                                Spacer(Modifier.height(10.dp))
                                FlowRow(
                                    horizontalArrangement = Arrangement.spacedBy(8.dp),
                                    verticalArrangement = Arrangement.spacedBy(6.dp)
                                ) {
                                    HeroTelemetryTag("Load %.0f%%".format(r.workloadPct))
                                    HeroTelemetryTag("Coolant %.1f°C".format(r.temperatureC))
                                    HeroTelemetryTag("Ambient %.1f°C".format(r.ambientTempC))
                                }
                            }
                        }
                    }
                }
            }
        }

        item(key = "sim_notice") {
            SimulationNoticeBanner()
        }

        item(key = "sim_controls") {
            Row(
                modifier = Modifier.fillMaxWidth(),
                horizontalArrangement = Arrangement.spacedBy(10.dp)
            ) {
                Button(
                    onClick = { viewModel.toggleSimulationRunning() },
                    modifier = Modifier.weight(1f).testTag("overview_toggle_sim"),
                    colors = ButtonDefaults.buttonColors(
                        containerColor = if (state.isSimulationRunning) AquaTeal else AquaCyan,
                        contentColor = NavyVoid
                    )
                ) {
                    Icon(
                        imageVector = if (state.isSimulationRunning) Icons.Default.Pause else Icons.Default.PlayArrow,
                        contentDescription = "Toggle simulation",
                        modifier = Modifier.size(18.dp)
                    )
                    Spacer(Modifier.width(6.dp))
                    Text(if (state.isSimulationRunning) "Pause Sim" else "Resume Sim")
                }
                OutlinedButton(
                    onClick = { onNavigate(AquaSection.DIGITAL_TWIN) },
                    modifier = Modifier.weight(1f).testTag("overview_open_twin"),
                    border = BorderStroke(1.dp, AquaCyan.copy(alpha = 0.5f))
                ) {
                    Text("What-If Twin", color = AquaCyan)
                }
            }
        }

        item(key = "kpi_adaptive_grid") {
            BoxWithConstraints(modifier = Modifier.fillMaxWidth()) {
                val columns = if (maxWidth >= 580.dp) 3 else 2
                val rows = kpiItems.chunked(columns)
                Column(verticalArrangement = Arrangement.spacedBy(12.dp)) {
                    rows.forEach { rowItems ->
                        Row(
                            modifier = Modifier.fillMaxWidth(),
                            horizontalArrangement = Arrangement.spacedBy(12.dp)
                        ) {
                            rowItems.forEach { item ->
                                KpiMetricCard(
                                    title = item.title,
                                    value = item.value,
                                    unitOrSub = item.unitOrSub,
                                    icon = item.icon,
                                    accent = item.accent,
                                    modifier = Modifier
                                        .weight(1f)
                                        .clickable { onNavigate(item.targetSection) }
                                )
                            }
                            repeat(columns - rowItems.size) {
                                Spacer(Modifier.weight(1f))
                            }
                        }
                    }
                }
            }
        }

        item(key = "live_stream_controls") {
            LiveStreamControlStrip(
                connectionState = state.streamConnectionState,
                selectedRange = state.selectedTimeRange,
                lastUpdatedMs = state.currentReading.timestampMs,
                isSimulationRunning = state.isSimulationRunning,
                errorMessage = state.streamErrorMessage,
                onSelectRange = { viewModel.selectTimeRange(it) },
                onTogglePause = { viewModel.toggleSimulationRunning() },
                onRetryStream = { viewModel.retryTelemetryStream() }
            )
        }

        item(key = "live_consumption_overview") {
            LiveChartStateContainer(
                isLoading = state.isChartsWarmingUp,
                hasPoints = state.liveChartBundle.points.isNotEmpty(),
                errorMessage = state.streamErrorMessage,
                onRetry = { viewModel.retryTelemetryStream() }
            ) {
                Column(verticalArrangement = Arrangement.spacedBy(12.dp)) {
                    RealTimeWaterConsumptionChart(bundle = state.liveChartBundle)
                    LiveWueMonitoringChart(bundle = state.liveChartBundle)
                }
            }
        }

        item(key = "forecast_preview") {
            AquaCard(accentColor = SlateBorder) {
                Row(
                    modifier = Modifier.fillMaxWidth(),
                    horizontalArrangement = Arrangement.SpaceBetween,
                    verticalAlignment = Alignment.CenterVertically
                ) {
                    Text(
                        text = "24h Consumption & Optimization Forecast",
                        style = MaterialTheme.typography.titleMedium,
                        color = TextPrimary,
                        modifier = Modifier.weight(1f)
                    )
                    Spacer(Modifier.width(8.dp))
                    Text(
                        text = "Details →",
                        style = MaterialTheme.typography.labelLarge,
                        color = AquaCyan,
                        modifier = Modifier
                            .clip(RoundedCornerShape(8.dp))
                            .clickable { onNavigate(AquaSection.PREDICTIONS) }
                            .padding(4.dp)
                    )
                }
                Spacer(Modifier.height(10.dp))
                MultiSeriesForecastChart(points = state.hourlyForecast, unitSuffix = "L/hr")
            }
        }

        if (topRec != null) {
            item(key = "top_rec") {
                AquaCard(accentColor = AquaTeal) {
                    Row(
                        modifier = Modifier.fillMaxWidth(),
                        horizontalArrangement = Arrangement.SpaceBetween,
                        verticalAlignment = Alignment.CenterVertically
                    ) {
                        Row(verticalAlignment = Alignment.CenterVertically, modifier = Modifier.weight(1f)) {
                            Icon(Icons.Default.AutoAwesome, contentDescription = "Top recommendation", tint = AquaTeal, modifier = Modifier.size(18.dp))
                            Spacer(Modifier.width(8.dp))
                            Text(topRec.title, style = MaterialTheme.typography.titleMedium, color = TextPrimary)
                        }
                        Spacer(Modifier.width(8.dp))
                        StatusPill(label = topRec.safetyStatus.label, color = EmeraldOk, showDot = false)
                    }
                    Spacer(Modifier.height(6.dp))
                    Text(topRec.reason, style = MaterialTheme.typography.bodySmall, color = TextSecondary)
                    Spacer(Modifier.height(10.dp))
                    Row(
                        modifier = Modifier.fillMaxWidth(),
                        horizontalArrangement = Arrangement.SpaceBetween,
                        verticalAlignment = Alignment.CenterVertically
                    ) {
                        Text(
                            text = "Est. savings: ${formatLitres(topRec.expectedDailySavingsL)}/day",
                            style = MaterialTheme.typography.labelMedium,
                            color = EmeraldOk
                        )
                        Button(
                            onClick = { viewModel.approveRecommendation(topRec) },
                            enabled = !topRec.applied,
                            colors = ButtonDefaults.buttonColors(containerColor = AquaCyan, contentColor = NavyVoid),
                            modifier = Modifier.testTag("overview_apply_top_rec")
                        ) {
                            Text(if (topRec.applied) "Applied (Sim)" else "Approve & Simulate")
                        }
                    }
                }
            }
        }

        item(key = "gemini_panel") {
            GeminiAnalystPanel(
                aiState = state.aiResponseState,
                onAskQuestion = { viewModel.askAi(it) },
                onShowFallback = { viewModel.showFallbackAnalysis() }
            )
        }

        item(key = "bottom_spacer") {
            Spacer(Modifier.height(12.dp))
        }
    }
}

@Composable
private fun HeroTelemetryTag(label: String) {
    Surface(
        shape = RoundedCornerShape(8.dp),
        color = NavyVoid.copy(alpha = 0.72f),
        border = BorderStroke(1.dp, AquaCyan.copy(alpha = 0.35f))
    ) {
        Text(
            text = label,
            style = MaterialTheme.typography.labelSmall,
            color = PureWhite,
            modifier = Modifier.padding(horizontal = 8.dp, vertical = 4.dp)
        )
    }
}
