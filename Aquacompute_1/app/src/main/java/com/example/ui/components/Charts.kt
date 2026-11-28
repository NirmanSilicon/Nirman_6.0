package com.example.ui.components

import androidx.compose.foundation.BorderStroke
import androidx.compose.foundation.Canvas
import androidx.compose.foundation.gestures.detectHorizontalDragGestures
import androidx.compose.foundation.gestures.detectTapGestures
import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.ExperimentalLayoutApi
import androidx.compose.foundation.layout.FlowRow
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.Spacer
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.height
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.layout.size
import androidx.compose.foundation.layout.width
import androidx.compose.foundation.shape.CircleShape
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.Surface
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.remember
import androidx.compose.runtime.setValue
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.drawWithCache
import androidx.compose.ui.geometry.CornerRadius
import androidx.compose.ui.geometry.Offset
import androidx.compose.ui.geometry.Size
import androidx.compose.ui.graphics.Brush
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.graphics.Path
import androidx.compose.ui.graphics.PathEffect
import androidx.compose.ui.graphics.StrokeCap
import androidx.compose.ui.graphics.StrokeJoin
import androidx.compose.ui.graphics.drawscope.Stroke
import androidx.compose.ui.input.pointer.pointerInput
import androidx.compose.ui.unit.dp
import com.example.model.PredictionPoint
import com.example.ui.theme.AmberWarn
import com.example.ui.theme.AquaCyan
import com.example.ui.theme.AquaTeal
import com.example.ui.theme.CoralCritical
import com.example.ui.theme.EmeraldOk
import com.example.ui.theme.NavySurface
import com.example.ui.theme.PureWhite
import com.example.ui.theme.SlateBorder
import com.example.ui.theme.SlateBorderBright
import com.example.ui.theme.TextPrimary
import com.example.ui.theme.TextSecondary
import com.example.ui.theme.TextTertiary

@Composable
fun SparklineChart(
    values: List<Double>,
    lineColor: Color,
    modifier: Modifier = Modifier
) {
    Box(
        modifier = modifier.drawWithCache {
            if (values.size < 2 || size.width <= 1f || size.height <= 1f) {
                onDrawBehind { }
            } else {
                var min = Double.POSITIVE_INFINITY
                var max = Double.NEGATIVE_INFINITY
                for (i in values.indices) {
                    val v = values[i]
                    if (v.isFinite()) {
                        if (v < min) min = v
                        if (v > max) max = v
                    }
                }
                if (min.isInfinite() || max.isInfinite()) {
                    onDrawBehind { }
                } else {
                    val range = (max - min).coerceAtLeast(1e-3)
                    val stepX = size.width / (values.size - 1).toFloat()

                    val linePath = Path()
                    val fillPath = Path()
                    var lastX = 0f
                    var lastY = size.height * 0.5f
                    for (index in values.indices) {
                        val raw = values[index]
                        val v = if (raw.isFinite()) raw else min
                        val x = index * stepX
                        val normalized = ((v - min) / range).toFloat().coerceIn(0f, 1f)
                        val y = size.height - (normalized * size.height * 0.78f + size.height * 0.11f)
                        if (index == 0) {
                            linePath.moveTo(x, y)
                            fillPath.moveTo(x, size.height)
                            fillPath.lineTo(x, y)
                        } else {
                            linePath.lineTo(x, y)
                            fillPath.lineTo(x, y)
                        }
                        lastX = x
                        lastY = y
                    }
                    fillPath.lineTo(size.width, size.height)
                    fillPath.close()

                    val midY = size.height * 0.5f
                    val refColor = SlateBorderBright.copy(alpha = 0.45f)
                    val refDash = PathEffect.dashPathEffect(floatArrayOf(8f, 6f), 0f)
                    val refStrokePx = 1.dp.toPx()

                    val fillBrush = Brush.verticalGradient(
                        colors = listOf(lineColor.copy(alpha = 0.28f), Color.Transparent)
                    )
                    val lineStroke = Stroke(
                        width = 2.5.dp.toPx(),
                        cap = StrokeCap.Round,
                        join = StrokeJoin.Round
                    )
                    val outerDotR = 4.5.dp.toPx()
                    val innerDotR = 2.dp.toPx()

                    onDrawBehind {
                        drawLine(
                            color = refColor,
                            start = Offset(0f, midY),
                            end = Offset(size.width, midY),
                            strokeWidth = refStrokePx,
                            pathEffect = refDash
                        )
                        drawPath(path = fillPath, brush = fillBrush)
                        drawPath(path = linePath, color = lineColor, style = lineStroke)
                        drawCircle(color = lineColor, radius = outerDotR, center = Offset(lastX, lastY))
                        drawCircle(color = PureWhite, radius = innerDotR, center = Offset(lastX, lastY))
                    }
                }
            }
        }
    )
}

@OptIn(ExperimentalLayoutApi::class)
@Composable
fun MultiSeriesForecastChart(
    points: List<PredictionPoint>,
    unitSuffix: String,
    modifier: Modifier = Modifier
) {
    if (points.isEmpty()) return

    var selectedIdx by remember(points.size) { mutableStateOf<Int?>(null) }

    val (minVal, maxVal, range) = remember(points) {
        var minRaw = Double.POSITIVE_INFINITY
        var maxRaw = Double.NEGATIVE_INFINITY
        for (i in points.indices) {
            val pt = points[i]
            pt.actualOrHistoricalLph?.let {
                if (it.isFinite()) {
                    if (it < minRaw) minRaw = it
                    if (it > maxRaw) maxRaw = it
                }
            }
            if (pt.predictedBaselineLph.isFinite()) {
                if (pt.predictedBaselineLph < minRaw) minRaw = pt.predictedBaselineLph
                if (pt.predictedBaselineLph > maxRaw) maxRaw = pt.predictedBaselineLph
            }
            if (pt.predictedOptimizedLph.isFinite()) {
                if (pt.predictedOptimizedLph < minRaw) minRaw = pt.predictedOptimizedLph
                if (pt.predictedOptimizedLph > maxRaw) maxRaw = pt.predictedOptimizedLph
            }
        }
        val lo = (if (minRaw.isInfinite()) 0.0 else minRaw) * 0.90
        val hi = (if (maxRaw.isInfinite()) 100.0 else maxRaw) * 1.08
        Triple(lo, hi, (hi - lo).coerceAtLeast(1.0))
    }

    val midVal = (minVal + maxVal) * 0.5
    val activePoint = selectedIdx?.let { points.getOrNull(it) }

    Column(modifier = modifier) {
        FlowRow(
            modifier = Modifier.fillMaxWidth(),
            horizontalArrangement = Arrangement.spacedBy(12.dp),
            verticalArrangement = Arrangement.spacedBy(4.dp)
        ) {
            ChartLegendItem("Simulated Actual", AquaCyan)
            ChartLegendItem("Predicted Baseline", AmberWarn)
            ChartLegendItem("AI Optimized", EmeraldOk)
        }

        Spacer(Modifier.height(8.dp))

        // Interactive inspection tooltip readout pill
        Surface(
            modifier = Modifier.fillMaxWidth(),
            shape = RoundedCornerShape(10.dp),
            color = NavySurface,
            border = BorderStroke(
                1.dp,
                if (activePoint != null) AquaCyan.copy(alpha = 0.45f) else SlateBorder
            )
        ) {
            if (activePoint != null) {
                val deltaPct = if (activePoint.predictedBaselineLph > 0.0) {
                    ((activePoint.predictedBaselineLph - activePoint.predictedOptimizedLph) / activePoint.predictedBaselineLph) * 100.0
                } else 0.0
                Row(
                    modifier = Modifier
                        .fillMaxWidth()
                        .padding(horizontal = 10.dp, vertical = 6.dp),
                    horizontalArrangement = Arrangement.SpaceBetween,
                    verticalAlignment = Alignment.CenterVertically
                ) {
                    Text(
                        text = activePoint.label,
                        style = MaterialTheme.typography.labelLarge,
                        color = AquaCyan
                    )
                    Text(
                        text = buildString {
                            activePoint.actualOrHistoricalLph?.let {
                                append("Act ${"%,.0f".format(it)} • ")
                            }
                            append("Base ${"%,.0f".format(activePoint.predictedBaselineLph)} • ")
                            append("Opt ${"%,.0f".format(activePoint.predictedOptimizedLph)} $unitSuffix (-${"%.0f".format(deltaPct)}%)")
                        },
                        style = MaterialTheme.typography.labelSmall,
                        color = TextPrimary
                    )
                }
            } else {
                Row(
                    modifier = Modifier
                        .fillMaxWidth()
                        .padding(horizontal = 10.dp, vertical = 6.dp),
                    horizontalArrangement = Arrangement.SpaceBetween,
                    verticalAlignment = Alignment.CenterVertically
                ) {
                    Text(
                        text = "Tap or scrub chart to inspect point values",
                        style = MaterialTheme.typography.labelSmall,
                        color = TextSecondary
                    )
                    Text(
                        text = "${"%,.0f".format(minVal)}–${"%,.0f".format(maxVal)} $unitSuffix",
                        style = MaterialTheme.typography.labelSmall,
                        color = AquaCyan
                    )
                }
            }
        }

        Spacer(Modifier.height(6.dp))

        Row(
            modifier = Modifier
                .fillMaxWidth()
                .height(190.dp),
            verticalAlignment = Alignment.CenterVertically
        ) {
            // Readable Y-axis labels
            Column(
                modifier = Modifier
                    .height(190.dp)
                    .padding(top = 6.dp, bottom = 6.dp, end = 6.dp),
                verticalArrangement = Arrangement.SpaceBetween,
                horizontalAlignment = Alignment.End
            ) {
                Text("${"%,.0f".format(maxVal)}", style = MaterialTheme.typography.labelSmall, color = TextTertiary)
                Text("${"%,.0f".format(midVal)}", style = MaterialTheme.typography.labelSmall, color = TextTertiary)
                Text("${"%,.0f".format(minVal)}", style = MaterialTheme.typography.labelSmall, color = TextTertiary)
            }

            Box(
                modifier = Modifier
                    .weight(1f)
                    .height(190.dp)
                    .padding(top = 8.dp, bottom = 8.dp, start = 4.dp, end = 6.dp)
                    .pointerInput(points) {
                        detectTapGestures { offset ->
                            if (points.size > 1 && size.width > 0) {
                                val frac = (offset.x / size.width.toFloat()).coerceIn(0f, 1f)
                                val idx = kotlin.math.round(frac * (points.size - 1)).toInt()
                                selectedIdx = if (selectedIdx == idx) null else idx
                            }
                        }
                    }
                    .pointerInput(points) {
                        detectHorizontalDragGestures { change, _ ->
                            if (points.size > 1 && size.width > 0) {
                                val frac = (change.position.x / size.width.toFloat()).coerceIn(0f, 1f)
                                selectedIdx = kotlin.math.round(frac * (points.size - 1)).toInt()
                            }
                        }
                    }
                    .drawWithCache {
                        if (size.width <= 1f || size.height <= 1f) {
                            onDrawBehind { }
                        } else {
                            val w = size.width
                            val h = size.height
                            val stepX = if (points.size > 1) w / (points.size - 1).toFloat() else w

                            fun yFor(v: Double): Float {
                                val safe = if (v.isFinite()) v else minVal
                                val norm = ((safe - minVal) / range).toFloat().coerceIn(0f, 1f)
                                return h - (norm * h)
                            }

                            val basePath = Path()
                            val optPath = Path()
                            val optFill = Path()
                            val actualPath = Path()
                            val actualDots = ArrayList<Offset>(points.size)
                            val baseCoords = ArrayList<Offset>(points.size)
                            val optCoords = ArrayList<Offset>(points.size)
                            var actualStarted = false

                            for (idx in points.indices) {
                                val pt = points[idx]
                                val x = idx * stepX
                                val yBase = yFor(pt.predictedBaselineLph)
                                val yOpt = yFor(pt.predictedOptimizedLph)
                                baseCoords.add(Offset(x, yBase))
                                optCoords.add(Offset(x, yOpt))

                                if (idx == 0) {
                                    basePath.moveTo(x, yBase)
                                    optPath.moveTo(x, yOpt)
                                    optFill.moveTo(x, h)
                                    optFill.lineTo(x, yOpt)
                                } else {
                                    basePath.lineTo(x, yBase)
                                    optPath.lineTo(x, yOpt)
                                    optFill.lineTo(x, yOpt)
                                }

                                pt.actualOrHistoricalLph?.let { actual ->
                                    val yAct = yFor(actual)
                                    if (!actualStarted) {
                                        actualPath.moveTo(x, yAct)
                                        actualStarted = true
                                    } else {
                                        actualPath.lineTo(x, yAct)
                                    }
                                    actualDots.add(Offset(x, yAct))
                                }
                            }
                            optFill.lineTo(w, h)
                            optFill.close()

                            val gridStrokePx = 1.dp.toPx()
                            val gridColor = SlateBorder.copy(alpha = 0.65f)
                            val gridDash = PathEffect.dashPathEffect(floatArrayOf(6f, 6f), 0f)
                            val baseStroke = Stroke(
                                width = 2.5.dp.toPx(),
                                pathEffect = PathEffect.dashPathEffect(floatArrayOf(12f, 8f), 0f),
                                cap = StrokeCap.Round
                            )
                            val optBrush = Brush.verticalGradient(
                                listOf(EmeraldOk.copy(alpha = 0.24f), Color.Transparent)
                            )
                            val optStroke = Stroke(
                                width = 2.5.dp.toPx(),
                                cap = StrokeCap.Round,
                                join = StrokeJoin.Round
                            )
                            val actualStroke = Stroke(width = 3.dp.toPx(), cap = StrokeCap.Round)
                            val dotRadius = 3.8.dp.toPx()
                            val selDotRadius = 6.dp.toPx()
                            val selInnerRadius = 2.5.dp.toPx()
                            val crosshairStrokePx = 1.5.dp.toPx()

                            onDrawBehind {
                                for (i in 0..3) {
                                    val y = h * (i / 3f)
                                    drawLine(
                                        color = gridColor,
                                        start = Offset(0f, y),
                                        end = Offset(w, y),
                                        strokeWidth = gridStrokePx,
                                        pathEffect = if (i in 1..2) gridDash else null
                                    )
                                }
                                drawPath(path = basePath, color = AmberWarn, style = baseStroke)
                                drawPath(path = optFill, brush = optBrush)
                                drawPath(path = optPath, color = EmeraldOk, style = optStroke)
                                if (actualStarted) {
                                    drawPath(path = actualPath, color = AquaCyan, style = actualStroke)
                                    for (i in actualDots.indices) {
                                        drawCircle(color = AquaCyan, radius = dotRadius, center = actualDots[i])
                                    }
                                }
                                selectedIdx?.takeIf { it in baseCoords.indices }?.let { idx ->
                                    val selX = baseCoords[idx].x
                                    drawLine(
                                        color = AquaCyan.copy(alpha = 0.55f),
                                        start = Offset(selX, 0f),
                                        end = Offset(selX, h),
                                        strokeWidth = crosshairStrokePx
                                    )
                                    drawCircle(color = AmberWarn, radius = selDotRadius, center = baseCoords[idx])
                                    drawCircle(color = PureWhite, radius = selInnerRadius, center = baseCoords[idx])
                                    drawCircle(color = EmeraldOk, radius = selDotRadius, center = optCoords[idx])
                                    drawCircle(color = PureWhite, radius = selInnerRadius, center = optCoords[idx])
                                }
                            }
                        }
                    }
            )
        }

        Row(
            modifier = Modifier
                .fillMaxWidth()
                .padding(start = 38.dp),
            horizontalArrangement = Arrangement.SpaceBetween
        ) {
            val step = if (points.size > 7) 2 else 1
            points.forEachIndexed { index, pt ->
                if (index % step == 0 || index == points.lastIndex) {
                    Text(
                        text = pt.label,
                        style = MaterialTheme.typography.labelSmall,
                        color = if (selectedIdx == index) AquaCyan else TextTertiary
                    )
                }
            }
        }
    }
}

@Composable
private fun ChartLegendItem(label: String, color: Color) {
    Row(verticalAlignment = Alignment.CenterVertically) {
        Surface(
            modifier = Modifier.size(8.dp),
            shape = CircleShape,
            color = color
        ) {}
        Spacer(Modifier.width(5.dp))
        Text(
            text = label,
            style = MaterialTheme.typography.labelSmall,
            color = TextSecondary
        )
    }
}

@Composable
fun BaselineVsOptimizedBars(
    baselineL: Double,
    optimizedL: Double,
    modifier: Modifier = Modifier
) {
    val maxVal = maxOf(baselineL, optimizedL, 1.0)
    val deltaL = (baselineL - optimizedL).coerceAtLeast(0.0)
    val pct = if (baselineL > 0.0) (deltaL / baselineL) * 100.0 else 0.0

    Column(modifier = modifier, verticalArrangement = Arrangement.spacedBy(10.dp)) {
        BarRow("Baseline Consumption", baselineL, maxVal, AmberWarn)
        BarRow("AI-Optimized Target", optimizedL, maxVal, AquaTeal)
        if (deltaL > 0.0) {
            Row(
                modifier = Modifier.fillMaxWidth(),
                horizontalArrangement = Arrangement.End
            ) {
                StatusPill(
                    label = "Est. Reduction: -${"%.1f".format(pct)}% (${formatLitres(deltaL)})",
                    color = EmeraldOk,
                    showDot = false
                )
            }
        }
    }
}

@Composable
private fun BarRow(label: String, value: Double, maxVal: Double, color: Color) {
    val safeVal = if (value.isFinite()) value else 0.0
    val fraction = (safeVal / maxVal).toFloat().coerceIn(0.04f, 1f)
    Column {
        Row(
            modifier = Modifier.fillMaxWidth(),
            horizontalArrangement = Arrangement.SpaceBetween
        ) {
            Text(label, style = MaterialTheme.typography.bodySmall, color = TextSecondary)
            Text(formatLitres(safeVal), style = MaterialTheme.typography.labelMedium, color = color)
        }
        Spacer(Modifier.height(5.dp))
        Canvas(modifier = Modifier.fillMaxWidth().height(11.dp)) {
            if (size.width <= 1f || size.height <= 1f) return@Canvas
            val radius = CornerRadius(6.dp.toPx(), 6.dp.toPx())
            drawRoundRect(
                color = SlateBorder.copy(alpha = 0.55f),
                cornerRadius = radius
            )
            drawRoundRect(
                brush = Brush.horizontalGradient(
                    colors = listOf(color.copy(alpha = 0.85f), color)
                ),
                size = Size(size.width * fraction, size.height),
                cornerRadius = radius
            )
        }
    }
}

@Composable
fun IsolationScoreGauge(
    score: Double,
    modifier: Modifier = Modifier
) {
    val safeScore = if (score.isFinite()) score.coerceIn(0.0, 1.0) else 0.0
    val color = when {
        safeScore >= 0.68 -> CoralCritical
        safeScore >= 0.56 -> AmberWarn
        else -> EmeraldOk
    }
    Box(modifier = modifier.size(114.dp), contentAlignment = Alignment.Center) {
        Canvas(modifier = Modifier.fillMaxSize().padding(8.dp)) {
            if (size.width <= 1f || size.height <= 1f) return@Canvas
            val stroke = Stroke(width = 10.dp.toPx(), cap = StrokeCap.Round)
            drawArc(
                color = SlateBorder,
                startAngle = 135f,
                sweepAngle = 270f,
                useCenter = false,
                style = stroke
            )
            // Subtle threshold zone markers along the arc
            drawArc(
                color = EmeraldOk.copy(alpha = 0.25f),
                startAngle = 135f,
                sweepAngle = 270f * 0.56f,
                useCenter = false,
                style = Stroke(width = 4.dp.toPx(), cap = StrokeCap.Round)
            )
            drawArc(
                color = AmberWarn.copy(alpha = 0.28f),
                startAngle = 135f + 270f * 0.56f,
                sweepAngle = 270f * 0.12f,
                useCenter = false,
                style = Stroke(width = 4.dp.toPx(), cap = StrokeCap.Round)
            )
            drawArc(
                color = CoralCritical.copy(alpha = 0.28f),
                startAngle = 135f + 270f * 0.68f,
                sweepAngle = 270f * 0.32f,
                useCenter = false,
                style = Stroke(width = 4.dp.toPx(), cap = StrokeCap.Round)
            )
            drawArc(
                color = color,
                startAngle = 135f,
                sweepAngle = (270f * safeScore.toFloat()),
                useCenter = false,
                style = stroke
            )
        }
        Column(horizontalAlignment = Alignment.CenterHorizontally) {
            Text(
                text = "%.2f".format(safeScore),
                style = MaterialTheme.typography.titleLarge,
                color = color
            )
            Text(
                text = "IF SCORE",
                style = MaterialTheme.typography.labelSmall,
                color = TextSecondary
            )
        }
    }
}
