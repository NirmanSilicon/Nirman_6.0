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
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.layout.size
import androidx.compose.foundation.layout.width
import androidx.compose.foundation.lazy.LazyColumn
import androidx.compose.foundation.lazy.itemsIndexed
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.filled.Forum
import androidx.compose.material.icons.filled.Hub
import androidx.compose.material3.HorizontalDivider
import androidx.compose.material3.Icon
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.Surface
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import androidx.compose.runtime.remember
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.unit.dp
import com.example.model.AgentStatus
import com.example.model.MessageSeverity
import com.example.ui.components.AquaCard
import com.example.ui.components.EmptyStateCard
import com.example.ui.components.GeminiAnalystPanel
import com.example.ui.components.SectionHeader
import com.example.ui.components.StatusPill
import com.example.ui.components.formatTimeShort
import com.example.ui.theme.AmberWarn
import com.example.ui.theme.AquaCyan
import com.example.ui.theme.AquaTeal
import com.example.ui.theme.CoralCritical
import com.example.ui.theme.EmeraldOk
import com.example.ui.theme.NavySurface
import com.example.ui.theme.SlateBorder
import com.example.ui.theme.SlateDivider
import com.example.ui.theme.TextPrimary
import com.example.ui.theme.TextSecondary
import com.example.ui.theme.VioletAgent
import com.example.viewmodel.AquaComputeViewModel
import com.example.viewmodel.AquaDashboardState

@OptIn(ExperimentalLayoutApi::class)
@Composable
fun AgentsScreen(
    state: AquaDashboardState,
    viewModel: AquaComputeViewModel
) {
    val recentFeed = remember(state.collaborationFeed) { state.collaborationFeed.take(12) }

    LazyColumn(
        modifier = Modifier.fillMaxSize(),
        contentPadding = PaddingValues(16.dp),
        verticalArrangement = Arrangement.spacedBy(12.dp)
    ) {
        item(key = "header") {
            SectionHeader(
                title = "AI Multi-Agent Intelligence Center",
                subtitle = "7 specialized agents collaborating through a central coordination bus",
                badge = "${state.agents.size} AGENTS",
                badgeColor = VioletAgent
            )
        }

        item(key = "pipeline_overview") {
            AquaCard(accentColor = VioletAgent) {
                Text("Central Coordination Pipeline", style = MaterialTheme.typography.titleMedium, color = TextPrimary)
                Spacer(Modifier.height(4.dp))
                Text(
                    text = "Each simulation cycle propagates telemetry sequentially through detection, safety validation, and simulated actuation.",
                    style = MaterialTheme.typography.bodySmall,
                    color = TextSecondary
                )
                Spacer(Modifier.height(10.dp))
                FlowRow(
                    horizontalArrangement = Arrangement.spacedBy(6.dp),
                    verticalArrangement = Arrangement.spacedBy(6.dp)
                ) {
                    state.agents.forEachIndexed { idx, agent ->
                        val chipColor = when (agent.status) {
                            AgentStatus.ACTIVE -> EmeraldOk
                            AgentStatus.ANALYZING -> AquaCyan
                            AgentStatus.WARNING -> AmberWarn
                            AgentStatus.LOCKED -> CoralCritical
                            AgentStatus.IDLE -> AquaTeal
                        }
                        Surface(
                            shape = RoundedCornerShape(8.dp),
                            color = NavySurface,
                            border = BorderStroke(1.dp, chipColor.copy(alpha = 0.45f))
                        ) {
                            Text(
                                text = "${idx + 1}. ${agent.id.displayName.removeSuffix(" Agent")}",
                                style = MaterialTheme.typography.labelSmall,
                                color = chipColor,
                                modifier = Modifier.padding(horizontal = 8.dp, vertical = 4.dp)
                            )
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

        itemsIndexed(
            items = state.agents,
            key = { _, agent -> agent.id.name }
        ) { idx, agent ->
            val statusColor = when (agent.status) {
                AgentStatus.ACTIVE -> EmeraldOk
                AgentStatus.ANALYZING -> AquaCyan
                AgentStatus.WARNING -> AmberWarn
                AgentStatus.LOCKED -> CoralCritical
                AgentStatus.IDLE -> AquaTeal
            }
            AquaCard(accentColor = statusColor) {
                Row(
                    modifier = Modifier.fillMaxWidth(),
                    horizontalArrangement = Arrangement.SpaceBetween,
                    verticalAlignment = Alignment.CenterVertically
                ) {
                    Row(verticalAlignment = Alignment.CenterVertically, modifier = Modifier.weight(1f)) {
                        Icon(Icons.Default.Hub, contentDescription = agent.id.displayName, tint = statusColor, modifier = Modifier.size(20.dp))
                        Spacer(Modifier.width(8.dp))
                        Column {
                            Text("Agent ${idx + 1}: ${agent.id.displayName}", style = MaterialTheme.typography.titleMedium, color = TextPrimary)
                            Text(agent.id.roleSubtitle, style = MaterialTheme.typography.bodySmall, color = TextSecondary)
                        }
                    }
                    Spacer(Modifier.width(8.dp))
                    StatusPill(label = agent.status.label, color = statusColor)
                }
                Spacer(Modifier.height(10.dp))
                AgentFieldRow("Current Task", agent.currentTask)
                AgentFieldRow("Observation", agent.latestObservation)
                AgentFieldRow("Action / Output", agent.recommendationOrAction)
                Spacer(Modifier.height(4.dp))
                Text(
                    text = "Updated ${formatTimeShort(agent.timestampMs)}",
                    style = MaterialTheme.typography.labelSmall,
                    color = TextSecondary
                )
            }
        }

        item(key = "collab_feed") {
            if (recentFeed.isEmpty()) {
                EmptyStateCard(
                    title = "No inter-agent handshakes logged yet",
                    description = "Agent findings and safety validation handshakes will appear here as telemetry updates.",
                    icon = Icons.Default.Forum,
                    accent = AquaCyan
                )
            } else {
                AquaCard(accentColor = AquaCyan) {
                    Text("Central Multi-Agent Collaboration Feed", style = MaterialTheme.typography.titleMedium, color = TextPrimary)
                    Text("Inter-agent findings & safety verification handshakes", style = MaterialTheme.typography.bodySmall, color = TextSecondary)
                    Spacer(Modifier.height(10.dp))
                    recentFeed.forEachIndexed { index, msg ->
                        val msgCol = when (msg.severity) {
                            MessageSeverity.CRITICAL -> CoralCritical
                            MessageSeverity.ADVISORY -> AmberWarn
                            MessageSeverity.INFO -> AquaCyan
                        }
                        Column(modifier = Modifier.fillMaxWidth().padding(vertical = 6.dp)) {
                            Row(
                                modifier = Modifier.fillMaxWidth(),
                                horizontalArrangement = Arrangement.SpaceBetween
                            ) {
                                Text(
                                    text = "${msg.fromAgent.displayName} → ${msg.toAgent.displayName}",
                                    style = MaterialTheme.typography.labelLarge,
                                    color = msgCol,
                                    modifier = Modifier.weight(1f)
                                )
                                Spacer(Modifier.width(8.dp))
                                Text(
                                    text = formatTimeShort(msg.timestampMs),
                                    style = MaterialTheme.typography.labelSmall,
                                    color = TextSecondary
                                )
                            }
                            Spacer(Modifier.height(2.dp))
                            Text(msg.summary, style = MaterialTheme.typography.bodySmall, color = TextPrimary)
                        }
                        if (index < recentFeed.lastIndex) {
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
private fun AgentFieldRow(label: String, value: String) {
    Column(modifier = Modifier.padding(vertical = 2.dp)) {
        Text(label.uppercase(), style = MaterialTheme.typography.labelSmall, color = AquaCyan)
        Text(value, style = MaterialTheme.typography.bodySmall, color = TextPrimary)
    }
}
