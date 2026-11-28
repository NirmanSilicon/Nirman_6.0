package com.example.ui.screens

import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Column
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
import androidx.compose.material.icons.filled.AutoAwesome
import androidx.compose.material.icons.filled.CheckCircle
import androidx.compose.material3.Button
import androidx.compose.material3.ButtonDefaults
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import androidx.compose.runtime.remember
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.platform.testTag
import androidx.compose.ui.unit.dp
import com.example.model.OperatingMode
import com.example.model.OptimizationPriority
import com.example.model.SafetyValidationStatus
import com.example.ui.components.AquaCard
import com.example.ui.components.BaselineVsOptimizedBars
import com.example.ui.components.KpiMetricCard
import com.example.ui.components.LiveChartStateContainer
import com.example.ui.components.SectionHeader
import com.example.ui.components.SimulationNoticeBanner
import com.example.ui.components.StatusPill
import com.example.ui.components.WaterOptimizationSavingsChart
import com.example.ui.components.formatLitres
import com.example.ui.theme.AmberWarn
import com.example.ui.theme.AquaCyan
import com.example.ui.theme.AquaTeal
import com.example.ui.theme.CoralCritical
import com.example.ui.theme.EmeraldOk
import com.example.ui.theme.NavyVoid
import com.example.ui.theme.TextPrimary
import com.example.ui.theme.TextSecondary
import com.example.viewmodel.AquaComputeViewModel
import com.example.viewmodel.AquaDashboardState

@Composable
fun OptimizationScreen(
    state: AquaDashboardState,
    viewModel: AquaComputeViewModel
) {
    val totalPotentialL = remember(state.recommendations) {
        state.recommendations.sumOf { it.expectedDailySavingsL }
    }
    val approvedCount = remember(state.recommendations) {
        state.recommendations.count { it.safetyStatus == SafetyValidationStatus.APPROVED }
    }

    LazyColumn(
        modifier = Modifier.fillMaxSize(),
        contentPadding = PaddingValues(16.dp),
        verticalArrangement = Arrangement.spacedBy(12.dp)
    ) {
        item(key = "opt_header") {
            SectionHeader(
                title = "Optimization Center",
                subtitle = "AI-generated cooling efficiency actions pre-checked by Safety Agent",
                badge = state.operatingMode.label.uppercase(),
                badgeColor = if (state.operatingMode == OperatingMode.EMERGENCY) CoralCritical else AquaTeal
            )
        }

        item(key = "opt_notice") {
            SimulationNoticeBanner(
                text = "SIMULATED CONTROL ACTIONS — Approving recommendations updates simulated setpoints only."
            )
        }

        item(key = "opt_kpis") {
            Row(modifier = Modifier.fillMaxWidth(), horizontalArrangement = Arrangement.spacedBy(12.dp)) {
                KpiMetricCard(
                    title = "Potential Savings",
                    value = formatLitres(totalPotentialL),
                    unitOrSub = "Combined daily estimate",
                    icon = Icons.Default.AutoAwesome,
                    accent = AquaCyan,
                    modifier = Modifier.weight(1f)
                )
                KpiMetricCard(
                    title = "Safety Cleared",
                    value = "$approvedCount / ${state.recommendations.size}",
                    unitOrSub = "Applied: ${formatLitres(state.appliedSavingsDailyL)}",
                    icon = Icons.Default.CheckCircle,
                    accent = EmeraldOk,
                    modifier = Modifier.weight(1f)
                )
            }
        }

        item(key = "opt_live_savings") {
            LiveChartStateContainer(
                isLoading = state.isChartsWarmingUp,
                hasPoints = state.liveChartBundle.points.isNotEmpty(),
                errorMessage = state.streamErrorMessage,
                onRetry = { viewModel.retryTelemetryStream() }
            ) {
                Column(verticalArrangement = Arrangement.spacedBy(12.dp)) {
                    WaterOptimizationSavingsChart(bundle = state.liveChartBundle)
                    AquaCard(accentColor = EmeraldOk) {
                        Text("Before vs After Efficiency Comparison", style = MaterialTheme.typography.titleMedium, color = TextPrimary)
                        Spacer(Modifier.height(8.dp))
                        val baseline = state.currentReading.projectedDailyConsumptionL
                        val after = (baseline - state.appliedSavingsDailyL).coerceAtLeast(baseline * 0.55)
                        BaselineVsOptimizedBars(baselineL = baseline, optimizedL = after)
                    }
                }
            }
        }

        items(state.recommendations, key = { it.id }) { rec ->
            val priorityColor = when (rec.priority) {
                OptimizationPriority.HIGH -> AquaCyan
                OptimizationPriority.MEDIUM -> AmberWarn
                OptimizationPriority.LOW -> AquaTeal
            }
            val safetyColor = when (rec.safetyStatus) {
                SafetyValidationStatus.APPROVED -> EmeraldOk
                SafetyValidationStatus.BLOCKED_BY_SAFETY -> CoralCritical
                SafetyValidationStatus.PENDING_REVIEW -> AmberWarn
            }

            AquaCard(accentColor = if (rec.applied) EmeraldOk else safetyColor) {
                Row(
                    modifier = Modifier.fillMaxWidth(),
                    horizontalArrangement = Arrangement.SpaceBetween,
                    verticalAlignment = Alignment.CenterVertically
                ) {
                    StatusPill(label = "${rec.priority.label} Priority", color = priorityColor, showDot = false)
                    StatusPill(label = rec.safetyStatus.label, color = safetyColor)
                }
                Spacer(Modifier.height(8.dp))
                Text(rec.title, style = MaterialTheme.typography.titleMedium, color = TextPrimary)
                Spacer(Modifier.height(4.dp))
                Text("Reason: ${rec.reason}", style = MaterialTheme.typography.bodySmall, color = TextSecondary)
                Spacer(Modifier.height(6.dp))
                Text(
                    text = "Safety Check: ${rec.safetyReason}",
                    style = MaterialTheme.typography.labelMedium,
                    color = safetyColor
                )
                Spacer(Modifier.height(8.dp))
                Row(
                    modifier = Modifier.fillMaxWidth(),
                    horizontalArrangement = Arrangement.SpaceBetween,
                    verticalAlignment = Alignment.CenterVertically
                ) {
                    Column {
                        Text("Est. Daily Savings", style = MaterialTheme.typography.labelSmall, color = TextSecondary)
                        Text(formatLitres(rec.expectedDailySavingsL), style = MaterialTheme.typography.titleMedium, color = EmeraldOk)
                    }
                    Spacer(Modifier.width(8.dp))
                    val canApply = !rec.applied &&
                        rec.safetyStatus == SafetyValidationStatus.APPROVED &&
                        state.operatingMode != OperatingMode.EMERGENCY
                    Button(
                        onClick = { viewModel.approveRecommendation(rec) },
                        enabled = canApply,
                        colors = ButtonDefaults.buttonColors(
                            containerColor = AquaCyan,
                            contentColor = NavyVoid,
                            disabledContainerColor = safetyColor.copy(alpha = 0.25f)
                        ),
                        modifier = Modifier.testTag("approve_rec_${rec.id}")
                    ) {
                        Text(
                            when {
                                rec.applied -> "Applied (Simulated)"
                                state.operatingMode == OperatingMode.EMERGENCY -> "Locked (Emergency)"
                                rec.safetyStatus == SafetyValidationStatus.BLOCKED_BY_SAFETY -> "Safety Blocked"
                                else -> "Approve & Simulate"
                            }
                        )
                    }
                }
            }
        }

        item(key = "opt_spacer") {
            Spacer(Modifier.height(16.dp))
        }
    }
}
