package com.example.ui.screens

import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.PaddingValues
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.Spacer
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.height
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.lazy.LazyColumn
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.automirrored.filled.ShowChart
import androidx.compose.material.icons.filled.TrendingDown
import androidx.compose.material3.FilterChip
import androidx.compose.material3.FilterChipDefaults
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.remember
import androidx.compose.runtime.setValue
import androidx.compose.ui.Modifier
import androidx.compose.ui.platform.testTag
import androidx.compose.ui.unit.dp
import com.example.ui.components.AquaCard
import com.example.ui.components.DataCenterPerformanceChart
import com.example.ui.components.KpiMetricCard
import com.example.ui.components.LiveChartStateContainer
import com.example.ui.components.LivePredictionAndAnomalyChart
import com.example.ui.components.LiveStreamControlStrip
import com.example.ui.components.MultiSeriesForecastChart
import com.example.ui.components.SectionHeader
import com.example.ui.components.SimulationNoticeBanner
import com.example.ui.components.formatLitres
import com.example.ui.theme.AmberWarn
import com.example.ui.theme.AquaCyan
import com.example.ui.theme.EmeraldOk
import com.example.ui.theme.NavyVoid
import com.example.ui.theme.SlateBorder
import com.example.ui.theme.TextPrimary
import com.example.ui.theme.TextSecondary
import com.example.viewmodel.AquaComputeViewModel
import com.example.viewmodel.AquaDashboardState

@Composable
fun PredictionsScreen(
    state: AquaDashboardState,
    viewModel: AquaComputeViewModel
) {
    var showWeekly by remember { mutableStateOf(false) }
    val points = if (showWeekly) state.weeklyForecast else state.hourlyForecast
    val unitSuffix = if (showWeekly) "L/day" else "L/hr"

    val totalPredictedDaily = state.currentReading.projectedDailyConsumptionL
    val reductionPct = state.savingsScenario.proposedReductionPct
    val totalOptimizedDaily = remember(totalPredictedDaily, reductionPct) {
        totalPredictedDaily * (1.0 - reductionPct / 100.0)
    }
    val breakdownPoints = remember(points) { points.take(6) }

    LazyColumn(
        modifier = Modifier.fillMaxSize(),
        contentPadding = PaddingValues(16.dp),
        verticalArrangement = Arrangement.spacedBy(12.dp)
    ) {
        item(key = "pred_header") {
            SectionHeader(
                title = "Prediction Center",
                subtitle = "Time-series water demand forecast vs simulated actual consumption & anomaly markers",
                badge = "PREDICTION AGENT",
                badgeColor = AquaCyan
            )
        }

        item(key = "pred_notice") {
            SimulationNoticeBanner(
                text = "DEMO MODE FORECASTS — Simulated baseline measurements vs AI-predicted demand curves and anomaly markers."
            )
        }

        item(key = "pred_live_controls") {
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

        item(key = "pred_live_ai_charts") {
            LiveChartStateContainer(
                isLoading = state.isChartsWarmingUp,
                hasPoints = state.liveChartBundle.points.isNotEmpty(),
                errorMessage = state.streamErrorMessage,
                onRetry = { viewModel.retryTelemetryStream() }
            ) {
                Column(verticalArrangement = Arrangement.spacedBy(12.dp)) {
                    LivePredictionAndAnomalyChart(bundle = state.liveChartBundle)
                    DataCenterPerformanceChart(bundle = state.liveChartBundle)
                }
            }
        }

        item(key = "pred_horizon_chips") {
            Row(horizontalArrangement = Arrangement.spacedBy(8.dp)) {
                FilterChip(
                    selected = !showWeekly,
                    onClick = { showWeekly = false },
                    label = { Text("24-Hour Horizon") },
                    colors = FilterChipDefaults.filterChipColors(
                        selectedContainerColor = AquaCyan,
                        selectedLabelColor = NavyVoid
                    ),
                    modifier = Modifier.testTag("predict_chip_24h")
                )
                FilterChip(
                    selected = showWeekly,
                    onClick = { showWeekly = true },
                    label = { Text("7-Day Horizon") },
                    colors = FilterChipDefaults.filterChipColors(
                        selectedContainerColor = AquaCyan,
                        selectedLabelColor = NavyVoid
                    ),
                    modifier = Modifier.testTag("predict_chip_7d")
                )
            }
        }

        item(key = "pred_kpis") {
            Row(modifier = Modifier.fillMaxWidth(), horizontalArrangement = Arrangement.spacedBy(12.dp)) {
                KpiMetricCard(
                    title = "Baseline Forecast",
                    value = formatLitres(totalPredictedDaily),
                    unitOrSub = "Per 24h at current load",
                    icon = Icons.AutoMirrored.Filled.ShowChart,
                    accent = AmberWarn,
                    modifier = Modifier.weight(1f)
                )
                KpiMetricCard(
                    title = "AI-Optimized Forecast",
                    value = formatLitres(totalOptimizedDaily),
                    unitOrSub = "Est. -${reductionPct.toInt()}% target",
                    icon = Icons.Default.TrendingDown,
                    accent = EmeraldOk,
                    modifier = Modifier.weight(1f)
                )
            }
        }

        item(key = "pred_chart") {
            AquaCard(accentColor = SlateBorder) {
                Text(
                    text = if (showWeekly) "7-Day Consumption Projection (L/day)" else "24-Hour Actual vs Predicted Curve (L/hr)",
                    style = MaterialTheme.typography.titleMedium,
                    color = TextPrimary
                )
                Spacer(Modifier.height(10.dp))
                MultiSeriesForecastChart(points = points, unitSuffix = unitSuffix)
            }
        }

        item(key = "pred_breakdown") {
            AquaCard(accentColor = SlateBorder) {
                Text("Forecast Drivers & Breakdown", style = MaterialTheme.typography.titleMedium, color = TextPrimary)
                Spacer(Modifier.height(8.dp))
                breakdownPoints.forEach { pt ->
                    Row(
                        modifier = Modifier.fillMaxWidth().padding(vertical = 4.dp),
                        horizontalArrangement = Arrangement.SpaceBetween
                    ) {
                        Text(pt.label, style = MaterialTheme.typography.labelMedium, color = AquaCyan)
                        Text(
                            text = "Actual: ${pt.actualOrHistoricalLph?.let { "%,.0f".format(it) } ?: "—"} | Pred: ${"%,.0f".format(pt.predictedBaselineLph)} | Opt: ${"%,.0f".format(pt.predictedOptimizedLph)}",
                            style = MaterialTheme.typography.labelSmall,
                            color = TextSecondary
                        )
                    }
                }
            }
        }

        item(key = "pred_spacer") {
            Spacer(Modifier.height(16.dp))
        }
    }
}
