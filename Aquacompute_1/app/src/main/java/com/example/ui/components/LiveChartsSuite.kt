package com.example.ui.components

import androidx.compose.animation.AnimatedVisibility
import androidx.compose.animation.core.FastOutSlowInEasing
import androidx.compose.animation.core.animateFloatAsState
import androidx.compose.animation.core.tween
import androidx.compose.foundation.BorderStroke
import androidx.compose.foundation.clickable
import androidx.compose.foundation.gestures.detectHorizontalDragGestures
import androidx.compose.foundation.gestures.detectTapGestures
import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Box
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
import androidx.compose.foundation.shape.CircleShape
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.filled.Pause
import androidx.compose.material.icons.filled.PlayArrow
import androidx.compose.material.icons.filled.Refresh
import androidx.compose.material.icons.filled.WarningAmber
import androidx.compose.material3.CircularProgressIndicator
import androidx.compose.material3.FilterChip
import androidx.compose.material3.FilterChipDefaults
import androidx.compose.material3.Icon
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.OutlinedButton
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
import androidx.compose.ui.geometry.Offset
import androidx.compose.ui.graphics.Brush
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.graphics.Path
import androidx.compose.ui.graphics.PathEffect
import androidx.compose.ui.graphics.StrokeCap
import androidx.compose.ui.graphics.StrokeJoin
import androidx.compose.ui.graphics.drawscope.Stroke
import androidx.compose.ui.input.pointer.pointerInput
import androidx.compose.ui.platform.testTag
import androidx.compose.ui.text.style.TextOverflow
import androidx.compose.ui.unit.dp
import com.example.model.ChartTimeRange
import com.example.model.LiveChartBundle
import com.example.model.LiveChartPoint
import com.example.model.StreamConnectionState
import com.example.ui.theme.AmberWarn
import com.example.ui.theme.AquaCyan
import com.example.ui.theme.AquaTeal
import com.example.ui.theme.CoralCritical
import com.example.ui.theme.EmeraldOk
import com.example.ui.theme.NavySurface
import com.example.ui.theme.NavyVoid
import com.example.ui.theme.PureWhite
import com.example.ui.theme.SlateBorder
import com.example.ui.theme.TextPrimary
import com.example.ui.theme.TextSecondary
import com.example.ui.theme.TextTertiary
import com.example.ui.theme.VioletAgent
import kotlin.math.roundToInt

@OptIn(ExperimentalLayoutApi::class)
@Composable
fun LiveStreamControlStrip(
    connectionState: StreamConnectionState,
    selectedRange: ChartTimeRange,
    lastUpdatedMs: Long,
    isSimulationRunning: Boolean,
    errorMessage: String?,
    onSelectRange: (ChartTimeRange) -> Unit,
    onTogglePause: () -> Unit,
    onRetryStream: () -> Unit,
    modifier: Modifier = Modifier
) {
    val statusColor = when (connectionState) {
        StreamConnectionState.DEMO_STREAMING -> AquaCyan
        StreamConnectionState.PAUSED -> AmberWarn
        StreamConnectionState.RECONNECTING, StreamConnectionState.ERROR -> CoralCritical
        StreamConnectionState.OFFLINE_DEMO -> AquaTeal
    }

    AquaCard(modifier = modifier, accentColor = statusColor) {
        Row(
            modifier = Modifier.fillMaxWidth(),
            horizontalArrangement = Arrangement.SpaceBetween,
            verticalAlignment = Alignment.CenterVertically
        ) {
            StatusPill(
                label = connectionState.badgeLabel,
                color = statusColor
            )
            Spacer(Modifier.width(8.dp))
            Text(
                text = if (lastUpdatedMs > 0L) "Updated ${formatTimeShort(lastUpdatedMs)}" else "Syncing…",
                style = MaterialTheme.typography.labelSmall,
                color = TextSecondary,
                maxLines = 1,
                overflow = TextOverflow.Ellipsis
            )
        }

        Spacer(Modifier.height(6.dp))
        Text(
            text = connectionState.detailLabel,
            style = MaterialTheme.typography.bodySmall,
            color = TextSecondary
        )

        Spacer(Modifier.height(10.dp))

        FlowRow(
            modifier = Modifier.fillMaxWidth(),
            horizontalArrangement = Arrangement.spacedBy(6.dp),
            verticalArrangement = Arrangement.spacedBy(6.dp)
        ) {
            ChartTimeRange.entries.forEach { range ->
                FilterChip(
                    selected = selectedRange == range,
                    onClick = { onSelectRange(range) },
                    label = { Text(range.shortLabel, style = MaterialTheme.typography.labelMedium) },
                    colors = FilterChipDefaults.filterChipColors(
                        selectedContainerColor = AquaCyan,
                        selectedLabelColor = NavyVoid
                    ),
                    modifier = Modifier.testTag("range_${range.shortLabel}")
                )
            }
            OutlinedButton(
                onClick = onTogglePause,
                contentPadding = PaddingValues(horizontal = 12.dp, vertical = 6.dp),
                border = BorderStroke(1.dp, statusColor.copy(alpha = 0.6f)),
                modifier = Modifier.testTag("live_stream_pause_btn")
            ) {
                Icon(
                    imageVector = if (isSimulationRunning) Icons.Default.Pause else Icons.Default.PlayArrow,
                    contentDescription = if (isSimulationRunning) "Pause live stream" else "Resume live stream",
                    tint = statusColor,
                    modifier = Modifier.size(16.dp)
                )
                Spacer(Modifier.width(4.dp))
                Text(
                    text = if (isSimulationRunning) "Pause" else "Resume",
                    style = MaterialTheme.typography.labelMedium,
                    color = statusColor
                )
            }
        }

        AnimatedVisibility(visible = errorMessage != null) {
            Surface(
                modifier = Modifier
                    .fillMaxWidth()
                    .padding(top = 10.dp),
                shape = RoundedCornerShape(10.dp),
                color = CoralCritical.copy(alpha = 0.12f),
                border = BorderStroke(1.dp, CoralCritical.copy(alpha = 0.45f))
            ) {
                Row(
                    modifier = Modifier.padding(horizontal = 10.dp, vertical = 8.dp),
                    horizontalArrangement = Arrangement.SpaceBetween,
                    verticalAlignment = Alignment.CenterVertically
                ) {
                    Row(verticalAlignment = Alignment.CenterVertically, modifier = Modifier.weight(1f)) {
                        Icon(
                            imageVector = Icons.Default.WarningAmber,
                            contentDescription = "Stream warning",
                            tint = CoralCritical,
                            modifier = Modifier.size(16.dp)
                        )
                        Spacer(Modifier.width(6.dp))
                        Text(
                            text = errorMessage.orEmpty(),
                            style = MaterialTheme.typography.labelSmall,
                            color = CoralCritical
                        )
                    }
                    Spacer(Modifier.width(8.dp))
                    OutlinedButton(
                        onClick = onRetryStream,
                        contentPadding = PaddingValues(horizontal = 10.dp, vertical = 4.dp),
                        border = BorderStroke(1.dp, CoralCritical)
                    ) {
                        Icon(
                            imageVector = Icons.Default.Refresh,
                            contentDescription = "Retry stream",
                            tint = CoralCritical,
                            modifier = Modifier.size(14.dp)
                        )
                        Spacer(Modifier.width(4.dp))
                        Text("Retry", style = MaterialTheme.typography.labelSmall, color = CoralCritical)
                    }
                }
            }
        }
    }
}

@Composable
fun LiveChartStateContainer(
    isLoading: Boolean,
    hasPoints: Boolean,
    errorMessage: String?,
    onRetry: () -> Unit,
    content: @Composable () -> Unit
) {
    when {
        isLoading && !hasPoints -> {
            AquaCard(accentColor = AquaCyan) {
                Row(
                    modifier = Modifier
                        .fillMaxWidth()
                        .padding(vertical = 20.dp),
                    horizontalArrangement = Arrangement.Center,
                    verticalAlignment = Alignment.CenterVertically
                ) {
                    CircularProgressIndicator(
                        color = AquaCyan,
                        strokeWidth = 2.5.dp,
                        modifier = Modifier.size(22.dp)
                    )
                    Spacer(Modifier.width(12.dp))
                    Text(
                        text = "Initializing real-time telemetry charts…",
                        style = MaterialTheme.typography.bodyMedium,
                        color = TextSecondary
                    )
                }
            }
        }
        !hasPoints && errorMessage != null -> {
            AquaCard(accentColor = CoralCritical) {
                Column(
                    modifier = Modifier.fillMaxWidth(),
                    horizontalAlignment = Alignment.CenterHorizontally
                ) {
                    Text("Telemetry Chart Unavailable", style = MaterialTheme.typography.titleMedium, color = CoralCritical)
                    Spacer(Modifier.height(4.dp))
                    Text(errorMessage, style = MaterialTheme.typography.bodySmall, color = TextSecondary)
                    Spacer(Modifier.height(10.dp))
                    OutlinedButton(onClick = onRetry, border = BorderStroke(1.dp, CoralCritical)) {
                        Text("Reconnect Stream", color = CoralCritical)
                    }
                }
            }
        }
        else -> content()
    }
}

/**
 * Graph 1: Real-Time Water Consumption (actual/demo vs trend, timestamps, anomaly markers, interactive tooltip).
 */
@OptIn(ExperimentalLayoutApi::class)
@Composable
fun RealTimeWaterConsumptionChart(
    bundle: LiveChartBundle,
    modifier: Modifier = Modifier
) {
    val points = bundle.points
    if (points.isEmpty()) return

    var selectedIdx by remember(bundle.timeRange, points.size) { mutableStateOf<Int?>(null) }
    val animProgress by animateFloatAsState(
        targetValue = 1f,
        animationSpec = tween(durationMillis = 420, easing = FastOutSlowInEasing),
        label = "consumption_chart_anim"
    )

    val (minVal, maxVal, range) = remember(points) {
        val vals = points.mapNotNull { it.waterConsumptionLph.takeIf(Double::isFinite) }
        val lo = (vals.minOrNull() ?: 1800.0) * 0.90
        val hi = (vals.maxOrNull() ?: 6000.0) * 1.08
        Triple(lo, hi, (hi - lo).coerceAtLeast(1.0))
    }

    val activePt = selectedIdx?.let { points.getOrNull(it) } ?: points.lastOrNull()

    AquaCard(modifier = modifier, accentColor = AquaCyan) {
        Row(
            modifier = Modifier.fillMaxWidth(),
            horizontalArrangement = Arrangement.SpaceBetween,
            verticalAlignment = Alignment.CenterVertically
        ) {
            Column(modifier = Modifier.weight(1f)) {
                Text("1. Real-Time Water Consumption", style = MaterialTheme.typography.titleMedium, color = TextPrimary)
                Text(
                    text = "Avg ${"%,.0f".format(bundle.averageConsumptionLph)} L/hr • Peak ${"%,.0f".format(bundle.peakConsumptionLph)} L/hr (${bundle.timeRange.label})",
                    style = MaterialTheme.typography.labelSmall,
                    color = TextSecondary
                )
            }
            Spacer(Modifier.width(8.dp))
            StatusPill(label = "DEMO SIM", color = AquaCyan, showDot = false)
        }

        Spacer(Modifier.height(8.dp))

        FlowRow(
            horizontalArrangement = Arrangement.spacedBy(12.dp),
            verticalArrangement = Arrangement.spacedBy(4.dp)
        ) {
            SeriesLegendChip("Actual Draw (L/hr)", AquaCyan, active = true, onClick = {})
            SeriesLegendChip("Anomaly Spike", CoralCritical, active = true, onClick = {})
        }

        Spacer(Modifier.height(8.dp))

        activePt?.let { pt ->
            val lpm = pt.waterConsumptionLph / 60.0
            TooltipBanner(
                leftText = "${pt.label}${if (pt.isForecast) " (AI Horizon)" else " (Demo Sim)"}",
                rightText = "${"%,.0f".format(pt.waterConsumptionLph)} L/hr (${"%.1f".format(lpm)} L/m)",
                accent = if (pt.isAnomaly) CoralCritical else AquaCyan
            )
        }

        Spacer(Modifier.height(8.dp))

        InteractiveChartFrame(
            points = points,
            minLabel = "${"%,.0f".format(minVal)}",
            midLabel = "${"%,.0f".format((minVal + maxVal) * 0.5)}",
            maxLabel = "${"%,.0f".format(maxVal)}",
            selectedIdx = selectedIdx,
            onSelectIdx = { selectedIdx = it }
        ) { w, h, stepX ->
            fun yFor(v: Double): Float {
                val safe = if (v.isFinite()) v else minVal
                val norm = ((safe - minVal) / range).toFloat().coerceIn(0f, 1f)
                return h - (norm * h * animProgress)
            }

            val linePath = Path()
            val fillPath = Path()
            val coords = ArrayList<Offset>(points.size)
            val anomCoords = ArrayList<Offset>()

            points.forEachIndexed { idx, pt ->
                val x = idx * stepX
                val y = yFor(pt.waterConsumptionLph)
                val off = Offset(x, y)
                coords.add(off)
                if (pt.isAnomaly) anomCoords.add(off)
                if (idx == 0) {
                    linePath.moveTo(x, y)
                    fillPath.moveTo(x, h)
                    fillPath.lineTo(x, y)
                } else {
                    linePath.lineTo(x, y)
                    fillPath.lineTo(x, y)
                }
            }
            fillPath.lineTo(w, h)
            fillPath.close()

            val fillBrush = Brush.verticalGradient(listOf(AquaCyan.copy(alpha = 0.28f), Color.Transparent))
            val stroke = Stroke(width = 2.8.dp.toPx(), cap = StrokeCap.Round, join = StrokeJoin.Round)
            val gridStrokePx = 1.dp.toPx()
            val gridColor = SlateBorder.copy(alpha = 0.6f)
            val gridDash = PathEffect.dashPathEffect(floatArrayOf(6f, 6f), 0f)
            val selStroke = 1.5.dp.toPx()
            val dotR = 3.5.dp.toPx()
            val anomR = 5.5.dp.toPx()
            val selR = 6.dp.toPx()

            onDrawBehind {
                for (i in 0..3) {
                    val y = h * (i / 3f)
                    drawLine(gridColor, Offset(0f, y), Offset(w, y), gridStrokePx, pathEffect = if (i in 1..2) gridDash else null)
                }
                drawPath(fillPath, brush = fillBrush)
                drawPath(linePath, color = AquaCyan, style = stroke)
                coords.forEachIndexed { idx, c ->
                    if (!points[idx].isForecast) {
                        drawCircle(color = AquaCyan, radius = dotR, center = c)
                    }
                }
                anomCoords.forEach { ac ->
                    drawCircle(color = CoralCritical, radius = anomR, center = ac)
                    drawCircle(color = PureWhite, radius = 2.dp.toPx(), center = ac)
                }
                selectedIdx?.takeIf { it in coords.indices }?.let { idx ->
                    val c = coords[idx]
                    drawLine(AquaCyan.copy(alpha = 0.6f), Offset(c.x, 0f), Offset(c.x, h), selStroke)
                    drawCircle(color = AquaCyan, radius = selR, center = c)
                    drawCircle(color = PureWhite, radius = 2.5.dp.toPx(), center = c)
                }
            }
        }
    }
}

/**
 * Graph 2: Live Water Usage Effectiveness (WUE) vs Target Optimal Comparison.
 */
@OptIn(ExperimentalLayoutApi::class)
@Composable
fun LiveWueMonitoringChart(
    bundle: LiveChartBundle,
    modifier: Modifier = Modifier
) {
    val points = bundle.points
    if (points.isEmpty()) return

    var selectedIdx by remember(bundle.timeRange, points.size) { mutableStateOf<Int?>(null) }
    var showTargetLine by remember { mutableStateOf(true) }

    val (minVal, maxVal, range) = remember(points, showTargetLine) {
        val vals = buildList {
            points.forEach {
                if (it.wue.isFinite()) add(it.wue)
                if (showTargetLine && it.targetWue.isFinite()) add(it.targetWue)
            }
        }
        val lo = ((vals.minOrNull() ?: 1.0) - 0.15).coerceAtLeast(0.5)
        val hi = ((vals.maxOrNull() ?: 2.2) + 0.15).coerceAtLeast(lo + 0.5)
        Triple(lo, hi, (hi - lo).coerceAtLeast(0.2))
    }

    val activePt = selectedIdx?.let { points.getOrNull(it) } ?: points.lastOrNull()

    AquaCard(modifier = modifier, accentColor = AquaTeal) {
        Row(
            modifier = Modifier.fillMaxWidth(),
            horizontalArrangement = Arrangement.SpaceBetween,
            verticalAlignment = Alignment.CenterVertically
        ) {
            Column(modifier = Modifier.weight(1f)) {
                Text("2. Water Usage Effectiveness (WUE)", style = MaterialTheme.typography.titleMedium, color = TextPrimary)
                Text(
                    text = "Avg ${"%.2f".format(bundle.averageWue)} L/kWh vs Optimal ${"%.2f".format(bundle.targetWue)} L/kWh",
                    style = MaterialTheme.typography.labelSmall,
                    color = TextSecondary
                )
            }
            Spacer(Modifier.width(8.dp))
            val gapPct = if (bundle.averageWue > 0) ((bundle.averageWue - bundle.targetWue) / bundle.averageWue) * 100.0 else 0.0
            StatusPill(
                label = if (gapPct <= 2.0) "OPTIMAL" else "${"%.0f".format(gapPct)}% ABOVE TARGET",
                color = if (gapPct <= 2.0) EmeraldOk else AmberWarn,
                showDot = false
            )
        }

        Spacer(Modifier.height(8.dp))

        FlowRow(
            horizontalArrangement = Arrangement.spacedBy(10.dp),
            verticalArrangement = Arrangement.spacedBy(4.dp)
        ) {
            SeriesLegendChip("Live WUE (L/kWh)", AquaTeal, active = true, onClick = {})
            SeriesLegendChip(
                label = "Target WUE (1.25)",
                color = EmeraldOk,
                active = showTargetLine,
                onClick = { showTargetLine = !showTargetLine }
            )
        }

        Spacer(Modifier.height(8.dp))

        activePt?.let { pt ->
            val diff = pt.wue - pt.targetWue
            TooltipBanner(
                leftText = pt.label,
                rightText = "WUE ${"%.2f".format(pt.wue)} L/kWh (Δ ${if (diff >= 0) "+" else ""}${"%.2f".format(diff)})",
                accent = if (pt.wue <= pt.targetWue * 1.05) EmeraldOk else AquaTeal
            )
        }

        Spacer(Modifier.height(8.dp))

        InteractiveChartFrame(
            points = points,
            minLabel = "%.2f".format(minVal),
            midLabel = "%.2f".format((minVal + maxVal) * 0.5),
            maxLabel = "%.2f".format(maxVal),
            selectedIdx = selectedIdx,
            onSelectIdx = { selectedIdx = it }
        ) { w, h, stepX ->
            fun yFor(v: Double): Float {
                val safe = if (v.isFinite()) v else minVal
                val norm = ((safe - minVal) / range).toFloat().coerceIn(0f, 1f)
                return h - (norm * h)
            }

            val wuePath = Path()
            val wueFill = Path()
            val targetPath = Path()
            val coords = ArrayList<Offset>(points.size)

            points.forEachIndexed { idx, pt ->
                val x = idx * stepX
                val yWue = yFor(pt.wue)
                val yTarget = yFor(pt.targetWue)
                coords.add(Offset(x, yWue))
                if (idx == 0) {
                    wuePath.moveTo(x, yWue)
                    wueFill.moveTo(x, h)
                    wueFill.lineTo(x, yWue)
                    targetPath.moveTo(x, yTarget)
                } else {
                    wuePath.lineTo(x, yWue)
                    wueFill.lineTo(x, yWue)
                    targetPath.lineTo(x, yTarget)
                }
            }
            wueFill.lineTo(w, h)
            wueFill.close()

            val fillBrush = Brush.verticalGradient(listOf(AquaTeal.copy(alpha = 0.24f), Color.Transparent))
            val lineStroke = Stroke(width = 2.6.dp.toPx(), cap = StrokeCap.Round, join = StrokeJoin.Round)
            val targetStroke = Stroke(
                width = 2.dp.toPx(),
                pathEffect = PathEffect.dashPathEffect(floatArrayOf(10f, 6f), 0f),
                cap = StrokeCap.Round
            )
            val gridStrokePx = 1.dp.toPx()
            val gridColor = SlateBorder.copy(alpha = 0.6f)
            val selStroke = 1.5.dp.toPx()

            onDrawBehind {
                for (i in 0..3) {
                    val y = h * (i / 3f)
                    drawLine(gridColor, Offset(0f, y), Offset(w, y), gridStrokePx)
                }
                drawPath(wueFill, brush = fillBrush)
                if (showTargetLine) {
                    drawPath(targetPath, color = EmeraldOk, style = targetStroke)
                }
                drawPath(wuePath, color = AquaTeal, style = lineStroke)
                coords.lastOrNull()?.let { last ->
                    drawCircle(color = AquaTeal, radius = 4.5.dp.toPx(), center = last)
                    drawCircle(color = PureWhite, radius = 2.dp.toPx(), center = last)
                }
                selectedIdx?.takeIf { it in coords.indices }?.let { idx ->
                    val c = coords[idx]
                    drawLine(AquaTeal.copy(alpha = 0.6f), Offset(c.x, 0f), Offset(c.x, h), selStroke)
                    drawCircle(color = AquaTeal, radius = 6.dp.toPx(), center = c)
                    drawCircle(color = PureWhite, radius = 2.5.dp.toPx(), center = c)
                }
            }
        }
    }
}

/**
 * Graph 3: AI Water Consumption Prediction (Historical/Simulated Actual vs AI Predicted vs Optimized + Anomaly Dots).
 */
@OptIn(ExperimentalLayoutApi::class)
@Composable
fun LivePredictionAndAnomalyChart(
    bundle: LiveChartBundle,
    modifier: Modifier = Modifier
) {
    val points = bundle.points
    if (points.isEmpty()) return

    var selectedIdx by remember(bundle.timeRange, points.size) { mutableStateOf<Int?>(null) }
    var showPredicted by remember { mutableStateOf(true) }
    var showOptimized by remember { mutableStateOf(true) }

    val (minVal, maxVal, range) = remember(points) {
        val vals = buildList {
            points.forEach {
                if (it.waterConsumptionLph.isFinite()) add(it.waterConsumptionLph)
                if (it.predictedLph.isFinite()) add(it.predictedLph)
                if (it.optimizedLph.isFinite()) add(it.optimizedLph)
            }
        }
        val lo = (vals.minOrNull() ?: 1500.0) * 0.90
        val hi = (vals.maxOrNull() ?: 6500.0) * 1.08
        Triple(lo, hi, (hi - lo).coerceAtLeast(1.0))
    }

    val activePt = selectedIdx?.let { points.getOrNull(it) } ?: points.firstOrNull { it.isForecast } ?: points.lastOrNull()

    AquaCard(modifier = modifier, accentColor = AmberWarn) {
        Row(
            modifier = Modifier.fillMaxWidth(),
            horizontalArrangement = Arrangement.SpaceBetween,
            verticalAlignment = Alignment.CenterVertically
        ) {
            Column(modifier = Modifier.weight(1f)) {
                Text("3. Water Consumption Prediction", style = MaterialTheme.typography.titleMedium, color = TextPrimary)
                Text(
                    text = "Actual (Demo) vs AI Forecast & Optimized Target (${bundle.timeRange.label})",
                    style = MaterialTheme.typography.labelSmall,
                    color = TextSecondary
                )
            }
            Spacer(Modifier.width(8.dp))
            StatusPill(label = "AI FORECAST", color = AmberWarn, showDot = false)
        }

        Spacer(Modifier.height(8.dp))

        FlowRow(
            horizontalArrangement = Arrangement.spacedBy(8.dp),
            verticalArrangement = Arrangement.spacedBy(4.dp)
        ) {
            SeriesLegendChip("Actual (Demo)", AquaCyan, active = true, onClick = {})
            SeriesLegendChip("AI Predicted", AmberWarn, active = showPredicted, onClick = { showPredicted = !showPredicted })
            SeriesLegendChip("AI Optimized", EmeraldOk, active = showOptimized, onClick = { showOptimized = !showOptimized })
            SeriesLegendChip("Anomaly", CoralCritical, active = true, onClick = {})
        }

        Spacer(Modifier.height(8.dp))

        activePt?.let { pt ->
            val srcTag = if (pt.isForecast) "AI Forecast" else "Demo Actual"
            TooltipBanner(
                leftText = "${pt.label} • $srcTag",
                rightText = "Pred ${"%,.0f".format(pt.predictedLph)} | Opt ${"%,.0f".format(pt.optimizedLph)} L/hr",
                accent = if (pt.isAnomaly) CoralCritical else AmberWarn
            )
        }

        Spacer(Modifier.height(8.dp))

        InteractiveChartFrame(
            points = points,
            minLabel = "${"%,.0f".format(minVal)}",
            midLabel = "${"%,.0f".format((minVal + maxVal) * 0.5)}",
            maxLabel = "${"%,.0f".format(maxVal)}",
            selectedIdx = selectedIdx,
            onSelectIdx = { selectedIdx = it }
        ) { w, h, stepX ->
            fun yFor(v: Double): Float {
                val safe = if (v.isFinite()) v else minVal
                val norm = ((safe - minVal) / range).toFloat().coerceIn(0f, 1f)
                return h - (norm * h)
            }

            val actualPath = Path()
            val predPath = Path()
            val optPath = Path()
            val optFill = Path()
            val actualDots = ArrayList<Offset>()
            val anomDots = ArrayList<Offset>()
            val predCoords = ArrayList<Offset>(points.size)
            var actualStarted = false
            var firstForecastX: Float? = null

            points.forEachIndexed { idx, pt ->
                val x = idx * stepX
                val yAct = yFor(pt.waterConsumptionLph)
                val yPred = yFor(pt.predictedLph)
                val yOpt = yFor(pt.optimizedLph)
                predCoords.add(Offset(x, yPred))

                if (!pt.isForecast) {
                    if (!actualStarted) {
                        actualPath.moveTo(x, yAct)
                        actualStarted = true
                    } else {
                        actualPath.lineTo(x, yAct)
                    }
                    actualDots.add(Offset(x, yAct))
                    if (pt.isAnomaly) anomDots.add(Offset(x, yAct))
                } else if (firstForecastX == null) {
                    firstForecastX = x
                }

                if (idx == 0) {
                    predPath.moveTo(x, yPred)
                    optPath.moveTo(x, yOpt)
                    optFill.moveTo(x, h)
                    optFill.lineTo(x, yOpt)
                } else {
                    predPath.lineTo(x, yPred)
                    optPath.lineTo(x, yOpt)
                    optFill.lineTo(x, yOpt)
                }
            }
            optFill.lineTo(w, h)
            optFill.close()

            val gridStrokePx = 1.dp.toPx()
            val gridColor = SlateBorder.copy(alpha = 0.6f)
            val predStroke = Stroke(
                width = 2.4.dp.toPx(),
                pathEffect = PathEffect.dashPathEffect(floatArrayOf(12f, 7f), 0f),
                cap = StrokeCap.Round
            )
            val optStroke = Stroke(width = 2.4.dp.toPx(), cap = StrokeCap.Round)
            val actualStroke = Stroke(width = 2.8.dp.toPx(), cap = StrokeCap.Round)
            val optBrush = Brush.verticalGradient(listOf(EmeraldOk.copy(alpha = 0.20f), Color.Transparent))
            val nowLineDash = PathEffect.dashPathEffect(floatArrayOf(6f, 6f), 0f)

            onDrawBehind {
                for (i in 0..3) {
                    val y = h * (i / 3f)
                    drawLine(gridColor, Offset(0f, y), Offset(w, y), gridStrokePx)
                }
                firstForecastX?.let { fx ->
                    drawLine(
                        color = PureWhite.copy(alpha = 0.30f),
                        start = Offset(fx, 0f),
                        end = Offset(fx, h),
                        strokeWidth = 1.2.dp.toPx(),
                        pathEffect = nowLineDash
                    )
                }
                if (showOptimized) {
                    drawPath(optFill, brush = optBrush)
                    drawPath(optPath, color = EmeraldOk, style = optStroke)
                }
                if (showPredicted) {
                    drawPath(predPath, color = AmberWarn, style = predStroke)
                }
                if (actualStarted) {
                    drawPath(actualPath, color = AquaCyan, style = actualStroke)
                    actualDots.forEach { drawCircle(AquaCyan, radius = 3.2.dp.toPx(), center = it) }
                }
                anomDots.forEach { ad ->
                    drawCircle(CoralCritical, radius = 6.dp.toPx(), center = ad)
                    drawCircle(PureWhite, radius = 2.2.dp.toPx(), center = ad)
                }
                selectedIdx?.takeIf { it in predCoords.indices }?.let { idx ->
                    val c = predCoords[idx]
                    drawLine(AquaCyan.copy(alpha = 0.6f), Offset(c.x, 0f), Offset(c.x, h), 1.5.dp.toPx())
                    drawCircle(AmberWarn, radius = 5.5.dp.toPx(), center = c)
                    drawCircle(PureWhite, radius = 2.dp.toPx(), center = c)
                }
            }
        }
    }
}

/**
 * Graph 4: Water Optimization — Savings Over Time & Before/After Efficiency Comparison.
 */
@Composable
fun WaterOptimizationSavingsChart(
    bundle: LiveChartBundle,
    modifier: Modifier = Modifier
) {
    val points = bundle.points
    if (points.isEmpty()) return

    var selectedIdx by remember(bundle.timeRange, points.size) { mutableStateOf<Int?>(null) }

    val (minVal, maxVal, range) = remember(points) {
        val vals = points.mapNotNull { it.waterSavingsLph.takeIf(Double::isFinite) }
        val lo = 0.0
        val hi = ((vals.maxOrNull() ?: 800.0) * 1.18).coerceAtLeast(100.0)
        Triple(lo, hi, hi)
    }

    val activePt = selectedIdx?.let { points.getOrNull(it) } ?: points.lastOrNull()

    AquaCard(modifier = modifier, accentColor = EmeraldOk) {
        Row(
            modifier = Modifier.fillMaxWidth(),
            horizontalArrangement = Arrangement.SpaceBetween,
            verticalAlignment = Alignment.CenterVertically
        ) {
            Column(modifier = Modifier.weight(1f)) {
                Text("4. Water Optimization & Savings", style = MaterialTheme.typography.titleMedium, color = TextPrimary)
                Text(
                    text = "Est. window savings: ${formatLitres(bundle.cumulativeWindowSavingsL)} over ${bundle.timeRange.label}",
                    style = MaterialTheme.typography.labelSmall,
                    color = TextSecondary
                )
            }
            Spacer(Modifier.width(8.dp))
            StatusPill(label = "SAVINGS SIM", color = EmeraldOk, showDot = false)
        }

        Spacer(Modifier.height(8.dp))

        activePt?.let { pt ->
            val pct = if (pt.predictedLph > 0.0) (pt.waterSavingsLph / pt.predictedLph) * 100.0 else 0.0
            TooltipBanner(
                leftText = pt.label,
                rightText = "Saved ${"%,.0f".format(pt.waterSavingsLph)} L/hr (-${"%.0f".format(pct)}% vs baseline)",
                accent = EmeraldOk
            )
        }

        Spacer(Modifier.height(8.dp))

        InteractiveChartFrame(
            points = points,
            minLabel = "0",
            midLabel = "${"%,.0f".format(maxVal * 0.5)}",
            maxLabel = "${"%,.0f".format(maxVal)}",
            selectedIdx = selectedIdx,
            onSelectIdx = { selectedIdx = it }
        ) { w, h, stepX ->
            fun yFor(v: Double): Float {
                val safe = if (v.isFinite()) v else 0.0
                val norm = ((safe - minVal) / range).toFloat().coerceIn(0f, 1f)
                return h - (norm * h)
            }

            val savPath = Path()
            val savFill = Path()
            val coords = ArrayList<Offset>(points.size)

            points.forEachIndexed { idx, pt ->
                val x = idx * stepX
                val y = yFor(pt.waterSavingsLph)
                coords.add(Offset(x, y))
                if (idx == 0) {
                    savPath.moveTo(x, y)
                    savFill.moveTo(x, h)
                    savFill.lineTo(x, y)
                } else {
                    savPath.lineTo(x, y)
                    savFill.lineTo(x, y)
                }
            }
            savFill.lineTo(w, h)
            savFill.close()

            val fillBrush = Brush.verticalGradient(listOf(EmeraldOk.copy(alpha = 0.34f), Color.Transparent))
            val lineStroke = Stroke(width = 2.8.dp.toPx(), cap = StrokeCap.Round, join = StrokeJoin.Round)
            val gridStrokePx = 1.dp.toPx()
            val gridColor = SlateBorder.copy(alpha = 0.6f)

            onDrawBehind {
                for (i in 0..3) {
                    val y = h * (i / 3f)
                    drawLine(gridColor, Offset(0f, y), Offset(w, y), gridStrokePx)
                }
                drawPath(savFill, brush = fillBrush)
                drawPath(savPath, color = EmeraldOk, style = lineStroke)
                coords.forEach { c ->
                    drawCircle(EmeraldOk, radius = 3.2.dp.toPx(), center = c)
                }
                selectedIdx?.takeIf { it in coords.indices }?.let { idx ->
                    val c = coords[idx]
                    drawLine(EmeraldOk.copy(alpha = 0.65f), Offset(c.x, 0f), Offset(c.x, h), 1.5.dp.toPx())
                    drawCircle(EmeraldOk, radius = 6.dp.toPx(), center = c)
                    drawCircle(PureWhite, radius = 2.4.dp.toPx(), center = c)
                }
            }
        }
    }
}

/**
 * Graph 5: Data Centre Performance (Cooling Water, Coolant Temp °C, & IT Workload % normalized overlay).
 */
@OptIn(ExperimentalLayoutApi::class)
@Composable
fun DataCenterPerformanceChart(
    bundle: LiveChartBundle,
    modifier: Modifier = Modifier
) {
    val points = bundle.points
    if (points.isEmpty()) return

    var selectedIdx by remember(bundle.timeRange, points.size) { mutableStateOf<Int?>(null) }
    var showWater by remember { mutableStateOf(true) }
    var showTemp by remember { mutableStateOf(true) }
    var showWorkload by remember { mutableStateOf(true) }

    val activePt = selectedIdx?.let { points.getOrNull(it) } ?: points.lastOrNull()

    val (waterMin, waterRange) = remember(points) {
        val vals = points.mapNotNull { it.waterConsumptionLph.takeIf(Double::isFinite) }
        val lo = (vals.minOrNull() ?: 1500.0) * 0.9
        val hi = (vals.maxOrNull() ?: 6500.0) * 1.1
        lo to (hi - lo).coerceAtLeast(1.0)
    }

    AquaCard(modifier = modifier, accentColor = VioletAgent) {
        Row(
            modifier = Modifier.fillMaxWidth(),
            horizontalArrangement = Arrangement.SpaceBetween,
            verticalAlignment = Alignment.CenterVertically
        ) {
            Column(modifier = Modifier.weight(1f)) {
                Text("5. Data Centre Performance", style = MaterialTheme.typography.titleMedium, color = TextPrimary)
                Text(
                    text = "Cooling water demand vs thermal & IT utilization (${bundle.timeRange.label})",
                    style = MaterialTheme.typography.labelSmall,
                    color = TextSecondary
                )
            }
            Spacer(Modifier.width(8.dp))
            StatusPill(label = "MULTI-METRIC", color = VioletAgent, showDot = false)
        }

        Spacer(Modifier.height(8.dp))

        FlowRow(
            horizontalArrangement = Arrangement.spacedBy(8.dp),
            verticalArrangement = Arrangement.spacedBy(4.dp)
        ) {
            SeriesLegendChip("Cooling Water", AquaCyan, active = showWater, onClick = { showWater = !showWater })
            SeriesLegendChip("Coolant Temp °C", AmberWarn, active = showTemp, onClick = { showTemp = !showTemp })
            SeriesLegendChip("IT Load %", VioletAgent, active = showWorkload, onClick = { showWorkload = !showWorkload })
        }

        Spacer(Modifier.height(8.dp))

        activePt?.let { pt ->
            TooltipBanner(
                leftText = pt.label,
                rightText = "${"%,.0f".format(pt.waterConsumptionLph)} L/hr • ${"%.1f".format(pt.coolantTempC)}°C • ${pt.workloadPct.roundToInt()}% Load",
                accent = VioletAgent
            )
        }

        Spacer(Modifier.height(8.dp))

        InteractiveChartFrame(
            points = points,
            minLabel = "Low",
            midLabel = "Mid",
            maxLabel = "High",
            selectedIdx = selectedIdx,
            onSelectIdx = { selectedIdx = it }
        ) { w, h, stepX ->
            fun yNorm(norm: Double): Float {
                val safe = if (norm.isFinite()) norm.coerceIn(0.0, 1.0) else 0.5
                return h - (safe.toFloat() * h)
            }

            val waterPath = Path()
            val tempPath = Path()
            val loadPath = Path()
            val waterCoords = ArrayList<Offset>(points.size)

            points.forEachIndexed { idx, pt ->
                val x = idx * stepX
                val wNorm = (pt.waterConsumptionLph - waterMin) / waterRange
                val tNorm = (pt.coolantTempC - 16.0) / 26.0
                val lNorm = pt.workloadPct / 100.0

                val yW = yNorm(wNorm)
                val yT = yNorm(tNorm)
                val yL = yNorm(lNorm)
                waterCoords.add(Offset(x, yW))

                if (idx == 0) {
                    waterPath.moveTo(x, yW)
                    tempPath.moveTo(x, yT)
                    loadPath.moveTo(x, yL)
                } else {
                    waterPath.lineTo(x, yW)
                    tempPath.lineTo(x, yT)
                    loadPath.lineTo(x, yL)
                }
            }

            val gridStrokePx = 1.dp.toPx()
            val gridColor = SlateBorder.copy(alpha = 0.6f)
            val lineStroke = Stroke(width = 2.5.dp.toPx(), cap = StrokeCap.Round, join = StrokeJoin.Round)

            onDrawBehind {
                for (i in 0..3) {
                    val y = h * (i / 3f)
                    drawLine(gridColor, Offset(0f, y), Offset(w, y), gridStrokePx)
                }
                if (showWater) drawPath(waterPath, color = AquaCyan, style = lineStroke)
                if (showTemp) drawPath(tempPath, color = AmberWarn, style = lineStroke)
                if (showWorkload) drawPath(loadPath, color = VioletAgent, style = lineStroke)

                selectedIdx?.takeIf { it in waterCoords.indices }?.let { idx ->
                    val x = waterCoords[idx].x
                    drawLine(VioletAgent.copy(alpha = 0.6f), Offset(x, 0f), Offset(x, h), 1.5.dp.toPx())
                }
            }
        }
    }
}

@Composable
private fun TooltipBanner(
    leftText: String,
    rightText: String,
    accent: Color
) {
    Surface(
        modifier = Modifier.fillMaxWidth(),
        shape = RoundedCornerShape(10.dp),
        color = NavySurface,
        border = BorderStroke(1.dp, accent.copy(alpha = 0.45f))
    ) {
        Row(
            modifier = Modifier
                .fillMaxWidth()
                .padding(horizontal = 10.dp, vertical = 6.dp),
            horizontalArrangement = Arrangement.SpaceBetween,
            verticalAlignment = Alignment.CenterVertically
        ) {
            Text(
                text = leftText,
                style = MaterialTheme.typography.labelMedium,
                color = accent,
                maxLines = 1,
                overflow = TextOverflow.Ellipsis
            )
            Spacer(Modifier.width(8.dp))
            Text(
                text = rightText,
                style = MaterialTheme.typography.labelSmall,
                color = TextPrimary,
                maxLines = 1,
                overflow = TextOverflow.Ellipsis
            )
        }
    }
}

@Composable
private fun SeriesLegendChip(
    label: String,
    color: Color,
    active: Boolean,
    onClick: () -> Unit
) {
    Surface(
        shape = RoundedCornerShape(50),
        color = if (active) color.copy(alpha = 0.14f) else NavySurface,
        border = BorderStroke(1.dp, if (active) color.copy(alpha = 0.45f) else SlateBorder),
        modifier = Modifier.clickable(onClick = onClick)
    ) {
        Row(
            modifier = Modifier.padding(horizontal = 8.dp, vertical = 4.dp),
            verticalAlignment = Alignment.CenterVertically
        ) {
            Surface(
                modifier = Modifier.size(7.dp),
                shape = CircleShape,
                color = if (active) color else TextTertiary
            ) {}
            Spacer(Modifier.width(5.dp))
            Text(
                text = label,
                style = MaterialTheme.typography.labelSmall,
                color = if (active) TextPrimary else TextTertiary
            )
        }
    }
}

@Composable
private fun InteractiveChartFrame(
    points: List<LiveChartPoint>,
    minLabel: String,
    midLabel: String,
    maxLabel: String,
    selectedIdx: Int?,
    onSelectIdx: (Int?) -> Unit,
    buildDraw: androidx.compose.ui.draw.CacheDrawScope.(
        w: Float,
        h: Float,
        stepX: Float
    ) -> androidx.compose.ui.draw.DrawResult
) {
    Column(modifier = Modifier.fillMaxWidth()) {
        Row(
            modifier = Modifier
                .fillMaxWidth()
                .height(176.dp),
            verticalAlignment = Alignment.CenterVertically
        ) {
            Column(
                modifier = Modifier
                    .height(176.dp)
                    .padding(top = 6.dp, bottom = 6.dp, end = 6.dp),
                verticalArrangement = Arrangement.SpaceBetween,
                horizontalAlignment = Alignment.End
            ) {
                Text(maxLabel, style = MaterialTheme.typography.labelSmall, color = TextTertiary)
                Text(midLabel, style = MaterialTheme.typography.labelSmall, color = TextTertiary)
                Text(minLabel, style = MaterialTheme.typography.labelSmall, color = TextTertiary)
            }

            Box(
                modifier = Modifier
                    .weight(1f)
                    .height(176.dp)
                    .padding(top = 8.dp, bottom = 8.dp, start = 4.dp, end = 6.dp)
                    .pointerInput(points) {
                        detectTapGestures { offset ->
                            if (points.size > 1 && size.width > 0) {
                                val frac = (offset.x / size.width.toFloat()).coerceIn(0f, 1f)
                                val idx = kotlin.math.round(frac * (points.size - 1)).toInt()
                                onSelectIdx(if (selectedIdx == idx) null else idx)
                            }
                        }
                    }
                    .pointerInput(points) {
                        detectHorizontalDragGestures { change, _ ->
                            if (points.size > 1 && size.width > 0) {
                                val frac = (change.position.x / size.width.toFloat()).coerceIn(0f, 1f)
                                onSelectIdx(kotlin.math.round(frac * (points.size - 1)).toInt())
                            }
                        }
                    }
                    .drawWithCache {
                        if (size.width <= 1f || size.height <= 1f || points.size < 2) {
                            onDrawBehind { }
                        } else {
                            val stepX = size.width / (points.size - 1).toFloat()
                            buildDraw(size.width, size.height, stepX)
                        }
                    }
            )
        }

        Row(
            modifier = Modifier
                .fillMaxWidth()
                .padding(start = 40.dp),
            horizontalArrangement = Arrangement.SpaceBetween
        ) {
            val step = when {
                points.size > 12 -> 4
                points.size > 7 -> 3
                else -> 1
            }
            points.forEachIndexed { index, pt ->
                if (index % step == 0 || index == points.lastIndex) {
                    Text(
                        text = pt.label,
                        style = MaterialTheme.typography.labelSmall,
                        color = if (selectedIdx == index) AquaCyan else TextTertiary,
                        maxLines = 1
                    )
                }
            }
        }
    }
}
