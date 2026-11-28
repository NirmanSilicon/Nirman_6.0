package com.example.ui.screens

import androidx.compose.foundation.BorderStroke
import androidx.compose.foundation.layout.Arrangement
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
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material3.Button
import androidx.compose.material3.ButtonDefaults
import androidx.compose.material3.FilterChip
import androidx.compose.material3.FilterChipDefaults
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.OutlinedButton
import androidx.compose.material3.OutlinedTextField
import androidx.compose.material3.OutlinedTextFieldDefaults
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.remember
import androidx.compose.runtime.setValue
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.unit.dp
import com.example.model.SafetyLimits
import com.example.model.TelemetryProtocol
import com.example.ui.components.AquaCard
import com.example.ui.components.SectionHeader
import com.example.ui.components.StatusPill
import com.example.ui.theme.AquaCyan
import com.example.ui.theme.AquaTeal
import com.example.ui.theme.EmeraldOk
import com.example.ui.theme.NavySurface
import com.example.ui.theme.NavyVoid
import com.example.ui.theme.SlateBorder
import com.example.ui.theme.TextPrimary
import com.example.ui.theme.TextSecondary
import com.example.viewmodel.AquaComputeViewModel
import com.example.viewmodel.AquaDashboardState

@OptIn(ExperimentalLayoutApi::class)
@Composable
fun SettingsScreen(
    state: AquaDashboardState,
    viewModel: AquaComputeViewModel
) {
    var mqttUrl by remember(state.adapterSettings.mqttBrokerUrl) {
        mutableStateOf(state.adapterSettings.mqttBrokerUrl)
    }
    var opcUaUrl by remember(state.adapterSettings.opcUaEndpoint) {
        mutableStateOf(state.adapterSettings.opcUaEndpoint)
    }

    LazyColumn(
        modifier = Modifier.fillMaxSize(),
        contentPadding = PaddingValues(16.dp),
        verticalArrangement = Arrangement.spacedBy(12.dp)
    ) {
        item(key = "settings_header") {
            SectionHeader(
                title = "Platform Settings",
                subtitle = "Telemetry polling, future MQTT / OPC UA connectors & system defaults",
                badge = "SYNTHETIC V1",
                badgeColor = AquaTeal
            )
        }

        item(key = "settings_polling") {
            AquaCard(accentColor = SlateBorder) {
                Row(
                    modifier = Modifier.fillMaxWidth(),
                    horizontalArrangement = Arrangement.SpaceBetween,
                    verticalAlignment = Alignment.CenterVertically
                ) {
                    Text("Telemetry Simulation Interval", style = MaterialTheme.typography.titleMedium, color = TextPrimary)
                    StatusPill(label = "${state.adapterSettings.sampleIntervalSeconds}s ACTIVE", color = EmeraldOk, showDot = false)
                }
                Spacer(Modifier.height(8.dp))
                FlowRow(
                    horizontalArrangement = Arrangement.spacedBy(8.dp),
                    verticalArrangement = Arrangement.spacedBy(6.dp)
                ) {
                    listOf(1, 2, 5).forEach { sec ->
                        FilterChip(
                            selected = state.adapterSettings.sampleIntervalSeconds == sec,
                            onClick = {
                                viewModel.updateAdapterSettings(
                                    state.adapterSettings.copy(sampleIntervalSeconds = sec)
                                )
                            },
                            label = { Text("${sec}s Poll") },
                            colors = FilterChipDefaults.filterChipColors(
                                selectedContainerColor = AquaCyan,
                                selectedLabelColor = NavyVoid
                            )
                        )
                    }
                }
            }
        }

        item(key = "settings_adapters") {
            AquaCard(accentColor = AquaCyan) {
                Row(
                    modifier = Modifier.fillMaxWidth(),
                    horizontalArrangement = Arrangement.SpaceBetween,
                    verticalAlignment = Alignment.CenterVertically
                ) {
                    Text(
                        text = "Industrial Protocol Adapters",
                        style = MaterialTheme.typography.titleMedium,
                        color = TextPrimary,
                        modifier = Modifier.weight(1f)
                    )
                    Spacer(Modifier.width(8.dp))
                    StatusPill(label = "EXTENSIBLE", color = AquaCyan, showDot = false)
                }
                Spacer(Modifier.height(4.dp))
                Text(
                    text = "Current build reads from ${TelemetryProtocol.SYNTHETIC_SIMULATOR.displayName}. Configure target endpoints for future field deployment.",
                    style = MaterialTheme.typography.bodySmall,
                    color = TextSecondary
                )
                Spacer(Modifier.height(10.dp))

                OutlinedTextField(
                    value = mqttUrl,
                    onValueChange = { mqttUrl = it },
                    label = { Text("MQTT Broker URI (Future)") },
                    modifier = Modifier.fillMaxWidth(),
                    singleLine = true,
                    shape = RoundedCornerShape(12.dp),
                    colors = OutlinedTextFieldDefaults.colors(
                        focusedBorderColor = AquaCyan,
                        unfocusedBorderColor = SlateBorder,
                        focusedContainerColor = NavySurface,
                        unfocusedContainerColor = NavySurface
                    )
                )
                Spacer(Modifier.height(8.dp))
                OutlinedTextField(
                    value = opcUaUrl,
                    onValueChange = { opcUaUrl = it },
                    label = { Text("OPC UA Server Endpoint (Future)") },
                    modifier = Modifier.fillMaxWidth(),
                    singleLine = true,
                    shape = RoundedCornerShape(12.dp),
                    colors = OutlinedTextFieldDefaults.colors(
                        focusedBorderColor = AquaCyan,
                        unfocusedBorderColor = SlateBorder,
                        focusedContainerColor = NavySurface,
                        unfocusedContainerColor = NavySurface
                    )
                )
                Spacer(Modifier.height(10.dp))
                FlowRow(
                    horizontalArrangement = Arrangement.spacedBy(8.dp),
                    verticalArrangement = Arrangement.spacedBy(6.dp)
                ) {
                    Button(
                        onClick = {
                            viewModel.updateAdapterSettings(
                                state.adapterSettings.copy(
                                    mqttBrokerUrl = mqttUrl.trim(),
                                    opcUaEndpoint = opcUaUrl.trim()
                                )
                            )
                        },
                        colors = ButtonDefaults.buttonColors(containerColor = AquaCyan, contentColor = NavyVoid)
                    ) {
                        Text("Save Adapter Config")
                    }
                    OutlinedButton(
                        onClick = { viewModel.updateSafetyLimits(SafetyLimits()) },
                        border = BorderStroke(1.dp, SlateBorder)
                    ) {
                        Text("Reset Safety Defaults", color = TextPrimary)
                    }
                }
            }
        }

        item(key = "settings_about") {
            AquaCard(accentColor = SlateBorder) {
                Text("About AquaCompute AI", style = MaterialTheme.typography.titleMedium, color = TextPrimary)
                Spacer(Modifier.height(4.dp))
                Text(
                    text = "AquaCompute AI is an intelligent multi-agent water stewardship platform for data-center cooling systems. This prototype runs synthetic sensor streams, a 24-tree Isolation Forest anomaly detector, What-If thermal-water simulation, and Gemini AI telemetry analysis via Firebase AI Logic.",
                    style = MaterialTheme.typography.bodySmall,
                    color = TextSecondary
                )
            }
        }

        item(key = "settings_spacer") {
            Spacer(Modifier.height(16.dp))
        }
    }
}
