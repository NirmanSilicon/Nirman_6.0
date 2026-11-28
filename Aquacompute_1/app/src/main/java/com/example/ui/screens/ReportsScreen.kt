package com.example.ui.screens

import android.content.Intent
import androidx.compose.foundation.BorderStroke
import androidx.compose.foundation.layout.Arrangement
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
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.filled.Share
import androidx.compose.material.icons.filled.WaterDrop
import androidx.compose.material3.Button
import androidx.compose.material3.ButtonDefaults
import androidx.compose.material3.HorizontalDivider
import androidx.compose.material3.Icon
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.OutlinedButton
import androidx.compose.material3.Slider
import androidx.compose.material3.SliderDefaults
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.platform.LocalContext
import androidx.compose.ui.platform.testTag
import androidx.compose.ui.unit.dp
import com.example.ui.components.AquaCard
import com.example.ui.components.BaselineVsOptimizedBars
import com.example.ui.components.SectionHeader
import com.example.ui.components.StatusPill
import com.example.ui.components.formatLitres
import com.example.ui.theme.AmberWarn
import com.example.ui.theme.AquaCyan
import com.example.ui.theme.AquaTeal
import com.example.ui.theme.EmeraldOk
import com.example.ui.theme.NavyVoid
import com.example.ui.theme.SlateBorder
import com.example.ui.theme.SlateDivider
import com.example.ui.theme.TextPrimary
import com.example.ui.theme.TextSecondary
import com.example.viewmodel.AquaComputeViewModel
import com.example.viewmodel.AquaDashboardState

@Composable
fun ReportsScreen(
    state: AquaDashboardState,
    viewModel: AquaComputeViewModel
) {
    val context = LocalContext.current
    val sc = state.savingsScenario

    LazyColumn(
        modifier = Modifier.fillMaxSize(),
        contentPadding = PaddingValues(16.dp),
        verticalArrangement = Arrangement.spacedBy(12.dp)
    ) {
        item(key = "rep_header") {
            SectionHeader(
                title = "Reports & Sustainability",
                subtitle = "Water savings calculator, WUE metrics, and exportable stewardship summary",
                badge = "REPORTING AGENT",
                badgeColor = EmeraldOk
            )
        }

        // Interactive Water Savings Calculator (Section 7)
        item(key = "rep_calculator") {
            AquaCard(accentColor = AquaCyan) {
                Row(
                    modifier = Modifier.fillMaxWidth(),
                    horizontalArrangement = Arrangement.SpaceBetween,
                    verticalAlignment = Alignment.CenterVertically
                ) {
                    Text(
                        text = "Water Savings Calculator",
                        style = MaterialTheme.typography.titleMedium,
                        color = TextPrimary,
                        modifier = Modifier.weight(1f)
                    )
                    Spacer(Modifier.width(8.dp))
                    StatusPill(label = "ILLUSTRATIVE TARGET", color = AmberWarn, showDot = false)
                }
                Spacer(Modifier.height(6.dp))
                Text(
                    text = "Adjust baseline daily consumption and proposed reduction percentage to evaluate potential stewardship impact.",
                    style = MaterialTheme.typography.bodySmall,
                    color = TextSecondary
                )
                Spacer(Modifier.height(10.dp))

                Row(modifier = Modifier.fillMaxWidth(), horizontalArrangement = Arrangement.SpaceBetween) {
                    Text("Baseline Daily Consumption", style = MaterialTheme.typography.bodySmall, color = TextSecondary)
                    Text(formatLitres(sc.baselineDailyL), style = MaterialTheme.typography.labelMedium, color = AquaCyan)
                }
                Slider(
                    value = sc.baselineDailyL.toFloat(),
                    onValueChange = { viewModel.updateSavingsScenario(baselineDailyL = it.toDouble()) },
                    valueRange = 20_000f..500_000f,
                    colors = SliderDefaults.colors(thumbColor = AquaCyan, activeTrackColor = AquaCyan),
                    modifier = Modifier.testTag("calc_baseline_slider")
                )

                Row(modifier = Modifier.fillMaxWidth(), horizontalArrangement = Arrangement.SpaceBetween) {
                    Text("Illustrative Reduction Target", style = MaterialTheme.typography.bodySmall, color = TextSecondary)
                    Text("${sc.proposedReductionPct.toInt()}%", style = MaterialTheme.typography.labelMedium, color = EmeraldOk)
                }
                Slider(
                    value = sc.proposedReductionPct.toFloat(),
                    onValueChange = { viewModel.updateSavingsScenario(reductionPct = it.toDouble()) },
                    valueRange = 5f..45f,
                    colors = SliderDefaults.colors(thumbColor = EmeraldOk, activeTrackColor = EmeraldOk),
                    modifier = Modifier.testTag("calc_reduction_slider")
                )

                OutlinedButton(
                    onClick = { viewModel.updateSavingsScenario(baselineDailyL = 100_000.0, reductionPct = 20.0) },
                    border = BorderStroke(1.dp, SlateBorder)
                ) {
                    Text("Reset to Presentation Scenario (100,000 L @ 20%)", color = TextPrimary, style = MaterialTheme.typography.labelMedium)
                }

                Spacer(Modifier.height(12.dp))
                BaselineVsOptimizedBars(baselineL = sc.baselineDailyL, optimizedL = sc.optimizedDailyL)
                Spacer(Modifier.height(12.dp))

                SavingsSummaryRow("Optimized Daily Usage", formatLitres(sc.optimizedDailyL))
                SavingsSummaryRow("Daily Potential Savings", formatLitres(sc.dailySavingsL), highlight = true)
                SavingsSummaryRow("Monthly Potential Savings (30d)", formatLitres(sc.monthlySavingsL), highlight = true)
                SavingsSummaryRow("Yearly Potential Savings (365d)", formatLitres(sc.yearlySavingsL), highlight = true)

                Spacer(Modifier.height(8.dp))
                Text(
                    text = "Disclaimer: The ${sc.proposedReductionPct.toInt()}% reduction is an illustrative simulation target, not a validated result, guaranteed saving, or proven real-world performance.",
                    style = MaterialTheme.typography.labelSmall,
                    color = AmberWarn
                )
            }
        }

        // Consumption Ledger (Daily / Monthly / Yearly)
        item(key = "rep_ledger") {
            AquaCard(accentColor = SlateBorder) {
                Text("Projected Consumption Ledger", style = MaterialTheme.typography.titleMedium, color = TextPrimary)
                Spacer(Modifier.height(8.dp))
                SavingsSummaryRow("Daily Baseline (Current Sim)", formatLitres(state.currentReading.projectedDailyConsumptionL))
                SavingsSummaryRow("Monthly Baseline (30d)", formatLitres(state.currentReading.projectedDailyConsumptionL * 30.0))
                SavingsSummaryRow("Yearly Baseline (365d)", formatLitres(state.currentReading.projectedDailyConsumptionL * 365.0))
                HorizontalDivider(color = SlateDivider, modifier = Modifier.padding(vertical = 6.dp))
                SavingsSummaryRow("Active / Historical Anomalies", "${state.anomalies.size} logged")
                SavingsSummaryRow("AI Recommendations", "${state.recommendations.size} proposals")
            }
        }

        // Water Usage Effectiveness (WUE) Info Section
        item(key = "rep_wue") {
            AquaCard(accentColor = AquaTeal) {
                Row(verticalAlignment = Alignment.CenterVertically) {
                    Icon(Icons.Default.WaterDrop, contentDescription = "WUE metric", tint = AquaTeal, modifier = Modifier.size(20.dp))
                    Spacer(Modifier.width(8.dp))
                    Text("Water Usage Effectiveness (WUE)", style = MaterialTheme.typography.titleMedium, color = TextPrimary)
                }
                Spacer(Modifier.height(6.dp))
                Text(
                    text = "Current Simulated WUE: %.2f L/kWh".format(state.currentReading.estimatedWue),
                    style = MaterialTheme.typography.titleSmall,
                    color = AquaCyan
                )
                Spacer(Modifier.height(4.dp))
                Text(
                    text = "WUE (Litres per kWh of IT Equipment Energy) is The Green Grid's standard sustainability metric for data centers. Lower WUE indicates higher cooling water efficiency. Predictive economizer staging and variable-frequency pump trimming reduce evaporative loss without compromising server thermal envelopes.",
                    style = MaterialTheme.typography.bodySmall,
                    color = TextSecondary
                )
            }
        }

        // Export / Share Report Button
        item(key = "rep_export") {
            Button(
                onClick = {
                    try {
                        val reportText = viewModel.buildExportReportText()
                        val shareIntent = Intent(Intent.ACTION_SEND).apply {
                            type = "text/plain"
                            putExtra(Intent.EXTRA_SUBJECT, "AquaCompute AI — Water Stewardship Report")
                            putExtra(Intent.EXTRA_TEXT, reportText)
                        }
                        val chooser = Intent.createChooser(shareIntent, "Export AquaCompute AI Report").apply {
                            addFlags(Intent.FLAG_ACTIVITY_NEW_TASK)
                        }
                        context.startActivity(chooser)
                    } catch (e: Exception) {
                        viewModel.reportStatusBanner(
                            e.localizedMessage ?: "No compatible share app available on this device to export the report."
                        )
                    }
                },
                modifier = Modifier.fillMaxWidth().testTag("export_report_button"),
                colors = ButtonDefaults.buttonColors(containerColor = AquaCyan, contentColor = NavyVoid)
            ) {
                Icon(Icons.Default.Share, contentDescription = "Export report", modifier = Modifier.size(18.dp))
                Spacer(Modifier.width(8.dp))
                Text("Export Stewardship Report")
            }
        }

        item(key = "rep_spacer") {
            Spacer(Modifier.height(16.dp))
        }
    }
}

@Composable
private fun SavingsSummaryRow(label: String, value: String, highlight: Boolean = false) {
    Row(
        modifier = Modifier.fillMaxWidth().padding(vertical = 3.dp),
        horizontalArrangement = Arrangement.SpaceBetween
    ) {
        Text(label, style = MaterialTheme.typography.bodySmall, color = TextSecondary)
        Text(value, style = MaterialTheme.typography.labelLarge, color = if (highlight) EmeraldOk else TextPrimary)
    }
}
