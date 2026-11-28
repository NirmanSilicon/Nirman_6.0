package com.example.ui.screens

import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.PaddingValues
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.Spacer
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.height
import androidx.compose.foundation.lazy.LazyColumn
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.filled.PrecisionManufacturing
import androidx.compose.material.icons.filled.WaterDrop
import androidx.compose.material3.FilterChip
import androidx.compose.material3.FilterChipDefaults
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.Slider
import androidx.compose.material3.SliderDefaults
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import androidx.compose.ui.Modifier
import androidx.compose.ui.platform.testTag
import androidx.compose.ui.unit.dp
import com.example.model.CoolingMode
import com.example.ui.components.AquaCard
import com.example.ui.components.BaselineVsOptimizedBars
import com.example.ui.components.DigitalTwinSchematic
import com.example.ui.components.KpiMetricCard
import com.example.ui.components.SectionHeader
import com.example.ui.components.SimulationNoticeBanner
import com.example.ui.components.formatLitres
import com.example.ui.theme.AquaCyan
import com.example.ui.theme.AquaTeal
import com.example.ui.theme.EmeraldOk
import com.example.ui.theme.NavyVoid
import com.example.ui.theme.SlateBorder
import com.example.ui.theme.TextPrimary
import com.example.ui.theme.TextSecondary
import com.example.viewmodel.AquaComputeViewModel
import com.example.viewmodel.AquaDashboardState

@Composable
fun DigitalTwinScreen(
    state: AquaDashboardState,
    viewModel: AquaComputeViewModel
) {
    val params = state.whatIfParams
    val res = state.whatIfResult

    LazyColumn(
        modifier = Modifier.fillMaxSize(),
        contentPadding = PaddingValues(16.dp),
        verticalArrangement = Arrangement.spacedBy(12.dp)
    ) {
        item(key = "twin_header") {
            SectionHeader(
                title = "Digital Twin & What-If Lab",
                subtitle = "Illustrative software model of servers, chiller loop, storage tank & sensors",
                badge = "SIMULATED ESTIMATE",
                badgeColor = AquaCyan
            )
        }

        item(key = "twin_notice") {
            SimulationNoticeBanner(
                text = "ILLUSTRATIVE SOFTWARE SIMULATION — All Digital Twin & What-If outputs are estimated projections, not physical CFD engineering models."
            )
        }

        // Interactive Animated Schematic
        item(key = "twin_schematic") {
            AquaCard(accentColor = AquaCyan) {
                DigitalTwinSchematic(
                    flowLpm = res.simulatedFlowLpm,
                    temperatureC = res.simulatedTempC,
                    pressureBar = res.simulatedPressureBar,
                    workloadPct = params.workloadPct,
                    coolingMode = params.coolingMode
                )
            }
        }

        // Simulated Impact KPIs
        item(key = "twin_kpis") {
            Row(modifier = Modifier.fillMaxWidth(), horizontalArrangement = Arrangement.spacedBy(12.dp)) {
                KpiMetricCard(
                    title = "Simulated Savings",
                    value = formatLitres(res.estimatedSavingsDailyL),
                    unitOrSub = "Est. daily delta",
                    icon = Icons.Default.WaterDrop,
                    accent = EmeraldOk,
                    modifier = Modifier.weight(1f)
                )
                KpiMetricCard(
                    title = "Simulated WUE",
                    value = "%.2f L/kWh".format(res.predictedWue),
                    unitOrSub = "%.1f L/m • %.1f°C".format(res.simulatedFlowLpm, res.simulatedTempC),
                    icon = Icons.Default.PrecisionManufacturing,
                    accent = AquaCyan,
                    modifier = Modifier.weight(1f)
                )
            }
        }

        // Baseline vs Optimized Comparison
        item(key = "twin_bars") {
            AquaCard(accentColor = SlateBorder) {
                Text("Baseline vs Optimized Water Estimate (Simulated)", style = MaterialTheme.typography.titleMedium, color = TextPrimary)
                Spacer(Modifier.height(10.dp))
                BaselineVsOptimizedBars(
                    baselineL = res.baselineDailyL,
                    optimizedL = res.optimizedDailyL
                )
            }
        }

        // What-If Simulation Controls
        item(key = "twin_controls") {
            AquaCard(accentColor = AquaTeal) {
                Text("What-If Simulation Controls", style = MaterialTheme.typography.titleMedium, color = TextPrimary)
                Text("Adjust cooling conditions to forecast impact on water usage.", style = MaterialTheme.typography.bodySmall, color = TextSecondary)
                Spacer(Modifier.height(10.dp))

                Text("Cooling Operating Mode", style = MaterialTheme.typography.labelLarge, color = AquaCyan)
                Spacer(Modifier.height(6.dp))
                Row(modifier = Modifier.fillMaxWidth(), horizontalArrangement = Arrangement.spacedBy(6.dp)) {
                    CoolingMode.entries.forEach { mode ->
                        FilterChip(
                            selected = params.coolingMode == mode,
                            onClick = { viewModel.updateWhatIf(coolingMode = mode) },
                            label = { Text(mode.label, style = MaterialTheme.typography.labelSmall) },
                            colors = FilterChipDefaults.filterChipColors(
                                selectedContainerColor = AquaCyan,
                                selectedLabelColor = NavyVoid
                            ),
                            modifier = Modifier.weight(1f).testTag("twin_mode_${mode.name}")
                        )
                    }
                }

                Spacer(Modifier.height(10.dp))
                WhatIfSliderRow(
                    label = "Water Flow Setpoint",
                    valueText = "${params.flowSettingPct.toInt()}%",
                    value = params.flowSettingPct.toFloat(),
                    range = 55f..120f,
                    onValueChange = { viewModel.updateWhatIf(flowSettingPct = it.toDouble()) }
                )
                WhatIfSliderRow(
                    label = "Data Center Workload",
                    valueText = "${params.workloadPct.toInt()}%",
                    value = params.workloadPct.toFloat(),
                    range = 25f..100f,
                    onValueChange = { viewModel.updateWhatIf(workloadPct = it.toDouble()) }
                )
                WhatIfSliderRow(
                    label = "Environmental Ambient Temp",
                    valueText = "%.1f °C".format(params.ambientTempC),
                    value = params.ambientTempC.toFloat(),
                    range = 15f..42f,
                    onValueChange = { viewModel.updateWhatIf(ambientTempC = it.toDouble()) }
                )
            }
        }

        item(key = "twin_spacer") {
            Spacer(Modifier.height(16.dp))
        }
    }
}

@Composable
private fun WhatIfSliderRow(
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
