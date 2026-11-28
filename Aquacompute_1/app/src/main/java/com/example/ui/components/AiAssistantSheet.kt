package com.example.ui.components

import androidx.compose.foundation.BorderStroke
import androidx.compose.foundation.horizontalScroll
import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.Spacer
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.height
import androidx.compose.foundation.layout.heightIn
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.layout.size
import androidx.compose.foundation.layout.width
import androidx.compose.foundation.rememberScrollState
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.foundation.verticalScroll
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.automirrored.filled.Send
import androidx.compose.material.icons.filled.AutoAwesome
import androidx.compose.material.icons.filled.ErrorOutline
import androidx.compose.material3.Button
import androidx.compose.material3.ButtonDefaults
import androidx.compose.material3.CircularProgressIndicator
import androidx.compose.material3.FilterChip
import androidx.compose.material3.FilterChipDefaults
import androidx.compose.material3.Icon
import androidx.compose.material3.IconButton
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.OutlinedButton
import androidx.compose.material3.OutlinedTextField
import androidx.compose.material3.OutlinedTextFieldDefaults
import androidx.compose.material3.Surface
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
import com.example.ai.AiResponseState
import com.example.ui.theme.AmberWarn
import com.example.ui.theme.AquaCyan
import com.example.ui.theme.AquaTeal
import com.example.ui.theme.CoralCritical
import com.example.ui.theme.NavyCardElevated
import com.example.ui.theme.NavySurface
import com.example.ui.theme.NavyVoid
import com.example.ui.theme.SlateBorder
import com.example.ui.theme.TextPrimary
import com.example.ui.theme.TextSecondary

private val presetQuestions = listOf(
    "Why has water consumption increased?",
    "Which sensor is showing abnormal behaviour?",
    "What is the predicted water consumption?",
    "What optimization can reduce water usage?",
    "How much water could be saved?",
    "Is the proposed optimization within configured safety limits?",
    "What happens if the data-center workload increases?"
)

@Composable
fun GeminiAnalystPanel(
    aiState: AiResponseState,
    onAskQuestion: (String) -> Unit,
    onShowFallback: () -> Unit,
    modifier: Modifier = Modifier
) {
    var input by remember { mutableStateOf("") }

    AquaCard(modifier = modifier, accentColor = AquaCyan, elevated = true) {
        Row(
            verticalAlignment = Alignment.CenterVertically,
            horizontalArrangement = Arrangement.SpaceBetween,
            modifier = Modifier.fillMaxWidth()
        ) {
            Row(verticalAlignment = Alignment.CenterVertically, modifier = Modifier.weight(1f)) {
                Surface(
                    shape = RoundedCornerShape(10.dp),
                    color = AquaCyan.copy(alpha = 0.16f),
                    border = BorderStroke(1.dp, AquaCyan.copy(alpha = 0.35f)),
                    modifier = Modifier.size(34.dp)
                ) {
                    androidx.compose.foundation.layout.Box(contentAlignment = Alignment.Center) {
                        Icon(
                            imageVector = Icons.Default.AutoAwesome,
                            contentDescription = "Gemini AI Analyst",
                            tint = AquaCyan,
                            modifier = Modifier.size(18.dp)
                        )
                    }
                }
                Spacer(Modifier.width(10.dp))
                Column {
                    Text(
                        text = "AquaCompute AI Analyst",
                        style = MaterialTheme.typography.titleMedium,
                        color = TextPrimary
                    )
                    Text(
                        text = "Live telemetry & safety reasoning",
                        style = MaterialTheme.typography.labelSmall,
                        color = TextSecondary
                    )
                }
            }
            Spacer(Modifier.width(8.dp))
            StatusPill(label = "Gemini AI", color = AquaCyan, showDot = false)
        }
        Spacer(Modifier.height(8.dp))
        Text(
            text = "Ask operational questions grounded in current synthetic telemetry, Isolation Forest scores, and safety envelopes.",
            style = MaterialTheme.typography.bodySmall,
            color = TextSecondary
        )
        Spacer(Modifier.height(10.dp))

        Row(
            modifier = Modifier
                .fillMaxWidth()
                .horizontalScroll(rememberScrollState()),
            horizontalArrangement = Arrangement.spacedBy(8.dp)
        ) {
            presetQuestions.forEach { q ->
                FilterChip(
                    selected = false,
                    onClick = {
                        input = q
                        onAskQuestion(q)
                    },
                    label = { Text(q, style = MaterialTheme.typography.bodySmall) },
                    colors = FilterChipDefaults.filterChipColors(
                        containerColor = NavySurface,
                        labelColor = TextPrimary
                    ),
                    border = BorderStroke(1.dp, SlateBorder)
                )
            }
        }

        Spacer(Modifier.height(10.dp))
        Row(
            modifier = Modifier.fillMaxWidth(),
            verticalAlignment = Alignment.CenterVertically
        ) {
            OutlinedTextField(
                value = input,
                onValueChange = { input = it },
                placeholder = { Text("Ask about flow, anomalies, WUE, or safety...", style = MaterialTheme.typography.bodySmall) },
                modifier = Modifier
                    .weight(1f)
                    .testTag("ai_question_input"),
                singleLine = true,
                shape = RoundedCornerShape(12.dp),
                colors = OutlinedTextFieldDefaults.colors(
                    focusedBorderColor = AquaCyan,
                    unfocusedBorderColor = SlateBorder,
                    focusedContainerColor = NavySurface,
                    unfocusedContainerColor = NavySurface
                )
            )
            Spacer(Modifier.width(8.dp))
            IconButton(
                onClick = { if (input.isNotBlank()) onAskQuestion(input) },
                modifier = Modifier.size(48.dp).testTag("ai_send_button")
            ) {
                Icon(
                    imageVector = Icons.AutoMirrored.Filled.Send,
                    contentDescription = "Send AI Query",
                    tint = AquaCyan
                )
            }
        }

        Spacer(Modifier.height(12.dp))
        when (aiState) {
            AiResponseState.Idle -> {
                Surface(
                    modifier = Modifier.fillMaxWidth(),
                    shape = RoundedCornerShape(12.dp),
                    color = NavySurface,
                    border = BorderStroke(1.dp, SlateBorder)
                ) {
                    Text(
                        text = "Select a prompt chip above or enter a question to run live Gemini telemetry reasoning.",
                        style = MaterialTheme.typography.bodySmall,
                        color = TextSecondary,
                        modifier = Modifier.padding(12.dp)
                    )
                }
            }
            AiResponseState.Loading -> {
                Row(
                    modifier = Modifier.fillMaxWidth().padding(vertical = 8.dp),
                    verticalAlignment = Alignment.CenterVertically
                ) {
                    CircularProgressIndicator(modifier = Modifier.size(18.dp), color = AquaCyan, strokeWidth = 2.dp)
                    Spacer(Modifier.width(10.dp))
                    Text("Analyzing live cooling telemetry via Gemini...", style = MaterialTheme.typography.bodySmall, color = AquaCyan)
                }
            }
            is AiResponseState.Streaming -> {
                Surface(
                    modifier = Modifier.fillMaxWidth().heightIn(max = 260.dp),
                    shape = RoundedCornerShape(12.dp),
                    color = NavySurface,
                    border = BorderStroke(1.dp, AquaCyan.copy(alpha = 0.45f))
                ) {
                    Column(modifier = Modifier.padding(12.dp).verticalScroll(rememberScrollState())) {
                        StatusPill(label = "Streaming Gemini Output", color = AquaCyan)
                        Spacer(Modifier.height(8.dp))
                        Text(aiState.text, style = MaterialTheme.typography.bodyMedium, color = TextPrimary)
                    }
                }
            }
            is AiResponseState.Success -> {
                val borderCol = if (aiState.isFallback) AmberWarn else AquaTeal
                Surface(
                    modifier = Modifier.fillMaxWidth().heightIn(max = 260.dp),
                    shape = RoundedCornerShape(12.dp),
                    color = NavySurface,
                    border = BorderStroke(1.dp, borderCol.copy(alpha = 0.55f))
                ) {
                    Column(modifier = Modifier.padding(12.dp).verticalScroll(rememberScrollState())) {
                        StatusPill(
                            label = if (aiState.isFallback) "Rule-Based Fallback (Offline)" else "Gemini Telemetry Analysis",
                            color = borderCol
                        )
                        Spacer(Modifier.height(8.dp))
                        Text(aiState.text, style = MaterialTheme.typography.bodyMedium, color = TextPrimary)
                    }
                }
            }
            is AiResponseState.Error -> {
                Surface(
                    modifier = Modifier.fillMaxWidth(),
                    shape = RoundedCornerShape(12.dp),
                    color = CoralCritical.copy(alpha = 0.1f),
                    border = BorderStroke(1.dp, CoralCritical.copy(alpha = 0.5f))
                ) {
                    Column(modifier = Modifier.padding(12.dp)) {
                        Row(verticalAlignment = Alignment.CenterVertically) {
                            Icon(Icons.Default.ErrorOutline, contentDescription = "AI Error", tint = CoralCritical, modifier = Modifier.size(18.dp))
                            Spacer(Modifier.width(6.dp))
                            Text("Gemini Unavailable", style = MaterialTheme.typography.titleSmall, color = CoralCritical)
                        }
                        Spacer(Modifier.height(4.dp))
                        Text(aiState.message, style = MaterialTheme.typography.bodySmall, color = TextSecondary)
                        Spacer(Modifier.height(10.dp))
                        Row(horizontalArrangement = Arrangement.spacedBy(8.dp)) {
                            Button(
                                onClick = onShowFallback,
                                colors = ButtonDefaults.buttonColors(containerColor = AmberWarn, contentColor = NavyVoid)
                            ) {
                                Text("View Rule-Based Fallback")
                            }
                            OutlinedButton(
                                onClick = { if (input.isNotBlank()) onAskQuestion(input) },
                                border = BorderStroke(1.dp, SlateBorder)
                            ) {
                                Text("Retry Gemini", color = TextPrimary)
                            }
                        }
                    }
                }
            }
        }
    }
}
