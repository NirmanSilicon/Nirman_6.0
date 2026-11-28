package com.example.ui.components

import androidx.compose.animation.core.LinearEasing
import androidx.compose.animation.core.RepeatMode
import androidx.compose.animation.core.animateFloat
import androidx.compose.animation.core.infiniteRepeatable
import androidx.compose.animation.core.rememberInfiniteTransition
import androidx.compose.animation.core.tween
import androidx.compose.foundation.BorderStroke
import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.Spacer
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.height
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.Surface
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import androidx.compose.runtime.remember
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.drawWithCache
import androidx.compose.ui.geometry.CornerRadius
import androidx.compose.ui.geometry.Offset
import androidx.compose.ui.geometry.Size
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.graphics.Path
import androidx.compose.ui.graphics.StrokeCap
import androidx.compose.ui.graphics.drawscope.Stroke
import androidx.compose.ui.text.style.TextOverflow
import androidx.compose.ui.unit.dp
import com.example.model.CoolingMode
import com.example.ui.theme.AmberWarn
import com.example.ui.theme.AquaCyan
import com.example.ui.theme.AquaTeal
import com.example.ui.theme.CoralCritical
import com.example.ui.theme.NavySurface
import com.example.ui.theme.SlateBorder
import com.example.ui.theme.TextPrimary
import com.example.ui.theme.TextSecondary

@Composable
fun DigitalTwinSchematic(
    flowLpm: Double,
    temperatureC: Double,
    pressureBar: Double,
    workloadPct: Double,
    coolingMode: CoolingMode,
    modifier: Modifier = Modifier
) {
    // Quantize duration into 250ms buckets so normal telemetry jitter never restarts the animation
    val quantizedDuration = remember((flowLpm / 15.0).toInt()) {
        (2200 - (((flowLpm / 15.0).toInt() * 15.0) * 10.0)).toInt().coerceIn(750, 2200)
    }
    val transition = rememberInfiniteTransition(label = "water_flow")
    val flowProgressState = transition.animateFloat(
        initialValue = 0f,
        targetValue = 1f,
        animationSpec = infiniteRepeatable(
            animation = tween(durationMillis = quantizedDuration, easing = LinearEasing),
            repeatMode = RepeatMode.Restart
        ),
        label = "particle_progress"
    )

    val tempColor = when {
        temperatureC >= 33.0 -> CoralCritical
        temperatureC >= 28.0 -> AmberWarn
        else -> AquaCyan
    }
    val loadGlowAlpha = (workloadPct / 100.0).toFloat().coerceIn(0.15f, 0.85f)

    Column(modifier = modifier) {
        Row(
            modifier = Modifier.fillMaxWidth(),
            horizontalArrangement = Arrangement.SpaceBetween,
            verticalAlignment = Alignment.CenterVertically
        ) {
            Text(
                text = "Simulated Cooling Circulation Loop",
                style = MaterialTheme.typography.titleMedium,
                color = TextPrimary
            )
            StatusPill(label = coolingMode.label, color = AquaTeal, showDot = false)
        }
        Spacer(Modifier.height(10.dp))

        // Defer reading flowProgressState.value strictly into onDrawBehind so 60fps frames skip recomposition
        Box(
            modifier = Modifier
                .fillMaxWidth()
                .height(230.dp)
                .padding(4.dp)
                .drawWithCache {
                    if (size.width <= 1f || size.height <= 1f) {
                        onDrawBehind { }
                    } else {
                        val w = size.width
                        val h = size.height

                        val loopLeft = w * 0.14f
                        val loopRight = w * 0.86f
                        val loopTop = h * 0.24f
                        val loopBottom = h * 0.78f
                        val loopW = loopRight - loopLeft
                        val loopH = loopBottom - loopTop

                        val pipePath = Path().apply {
                            moveTo(loopLeft, loopTop)
                            lineTo(loopRight, loopTop)
                            lineTo(loopRight, loopBottom)
                            lineTo(loopLeft, loopBottom)
                            close()
                        }
                        val outerPipeStroke = Stroke(width = 12.dp.toPx(), cap = StrokeCap.Round)
                        val innerPipeStroke = Stroke(width = 6.dp.toPx(), cap = StrokeCap.Round)
                        val innerPipeColor = tempColor.copy(alpha = 0.25f)
                        val particleRadius = 4.5.dp.toPx()

                        val boxCorner = CornerRadius(10.dp.toPx())
                        val fillCorner = CornerRadius(7.dp.toPx())
                        val boxStroke = Stroke(width = 2.dp.toPx())
                        val serverStroke = Stroke(width = 2.5.dp.toPx())
                        val serverGlowColor = tempColor.copy(alpha = loadGlowAlpha)
                        val bladeColor = tempColor.copy(alpha = 0.7f)
                        val bladeStrokePx = 3.dp.toPx()

                        val tankPos = Offset(w * 0.03f, h * 0.56f)
                        val tankSize = Size(w * 0.22f, h * 0.34f)
                        val fillH = tankSize.height * 0.68f
                        val tankFillPos = Offset(tankPos.x + 3.dp.toPx(), tankPos.y + tankSize.height - fillH)
                        val tankFillSize = Size(tankSize.width - 6.dp.toPx(), fillH - 3.dp.toPx())
                        val tankFillColor = AquaCyan.copy(alpha = 0.32f)

                        val coolPos = Offset(w * 0.03f, h * 0.08f)
                        val coolSize = Size(w * 0.24f, h * 0.30f)

                        val srvPos = Offset(w * 0.72f, h * 0.24f)
                        val srvSize = Size(w * 0.25f, h * 0.52f)
                        val bladeInset = 10.dp.toPx()
                        val bladeStartY = srvPos.y + 14.dp.toPx()
                        val bladeStepY = (srvSize.height - 28.dp.toPx()) / 4f

                        val sensorTopCenter = Offset(w * 0.48f, loopTop)
                        val sensorBotCenter = Offset(w * 0.48f, loopBottom)
                        val sensorOuterR = 9.dp.toPx()
                        val sensorInnerR = 5.dp.toPx()

                        onDrawBehind {
                            val progress = flowProgressState.value

                            drawPath(path = pipePath, color = SlateBorder, style = outerPipeStroke)
                            drawPath(path = pipePath, color = innerPipeColor, style = innerPipeStroke)

                            for (idx in 0 until 8) {
                                val t = (progress + idx / 8f) % 1f
                                val segment = (t * 4f).toInt()
                                val segT = (t * 4f) - segment
                                val pos = when (segment) {
                                    0 -> Offset(loopLeft + loopW * segT, loopTop)
                                    1 -> Offset(loopRight, loopTop + loopH * segT)
                                    2 -> Offset(loopRight - loopW * segT, loopBottom)
                                    else -> Offset(loopLeft, loopBottom - loopH * segT)
                                }
                                drawCircle(
                                    color = if (segment == 1 || segment == 2) tempColor else AquaCyan,
                                    radius = particleRadius,
                                    center = pos
                                )
                            }

                            // Water Storage Tank
                            drawRoundRect(color = NavySurface, topLeft = tankPos, size = tankSize, cornerRadius = boxCorner)
                            drawRoundRect(color = AquaTeal, topLeft = tankPos, size = tankSize, cornerRadius = boxCorner, style = boxStroke)
                            drawRoundRect(color = tankFillColor, topLeft = tankFillPos, size = tankFillSize, cornerRadius = fillCorner)

                            // Cooling System / Heat Exchanger
                            drawRoundRect(color = NavySurface, topLeft = coolPos, size = coolSize, cornerRadius = boxCorner)
                            drawRoundRect(color = AquaCyan, topLeft = coolPos, size = coolSize, cornerRadius = boxCorner, style = boxStroke)

                            // Server Racks
                            drawRoundRect(color = NavySurface, topLeft = srvPos, size = srvSize, cornerRadius = boxCorner)
                            drawRoundRect(color = serverGlowColor, topLeft = srvPos, size = srvSize, cornerRadius = boxCorner, style = serverStroke)
                            for (blade in 0 until 5) {
                                val by = bladeStartY + blade * bladeStepY
                                drawLine(
                                    color = bladeColor,
                                    start = Offset(srvPos.x + bladeInset, by),
                                    end = Offset(srvPos.x + srvSize.width - bladeInset, by),
                                    strokeWidth = bladeStrokePx,
                                    cap = StrokeCap.Round
                                )
                            }

                            // Monitoring Nodes
                            drawCircle(color = AquaCyan, radius = sensorOuterR, center = sensorTopCenter)
                            drawCircle(color = NavySurface, radius = sensorInnerR, center = sensorTopCenter)
                            drawCircle(color = tempColor, radius = sensorOuterR, center = sensorBotCenter)
                            drawCircle(color = NavySurface, radius = sensorInnerR, center = sensorBotCenter)
                        }
                    }
                }
        )

        Spacer(Modifier.height(8.dp))
        Row(
            modifier = Modifier.fillMaxWidth(),
            horizontalArrangement = Arrangement.spacedBy(8.dp)
        ) {
            TwinNodeBadge("Chiller + Tank", "68% Reserve", AquaTeal, Modifier.weight(1f))
            TwinNodeBadge("FT-101 / PT-108", "${"%.1f".format(flowLpm)} L/m • ${"%.2f".format(pressureBar)}b", AquaCyan, Modifier.weight(1f))
            TwinNodeBadge("Servers / TT-204", "${workloadPct.toInt()}% • ${"%.1f".format(temperatureC)}°C", tempColor, Modifier.weight(1f))
        }
    }
}

@Composable
private fun TwinNodeBadge(title: String, value: String, color: Color, modifier: Modifier = Modifier) {
    Surface(
        modifier = modifier,
        shape = RoundedCornerShape(10.dp),
        color = NavySurface,
        border = BorderStroke(1.dp, color.copy(alpha = 0.35f))
    ) {
        Column(modifier = Modifier.padding(horizontal = 8.dp, vertical = 6.dp)) {
            Text(title, style = MaterialTheme.typography.labelSmall, color = TextSecondary, maxLines = 1, overflow = TextOverflow.Ellipsis)
            Spacer(Modifier.height(2.dp))
            Text(value, style = MaterialTheme.typography.labelMedium, color = color, maxLines = 1, overflow = TextOverflow.Ellipsis)
        }
    }
}
