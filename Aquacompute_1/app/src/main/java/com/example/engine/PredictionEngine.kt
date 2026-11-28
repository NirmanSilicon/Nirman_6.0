package com.example.engine

import com.example.model.AnomalyRecord
import com.example.model.ChartTimeRange
import com.example.model.LiveChartBundle
import com.example.model.LiveChartPoint
import com.example.model.PredictionPoint
import com.example.model.SensorReading
import com.example.model.WhatIfParams
import com.example.model.WhatIfResult
import java.text.SimpleDateFormat
import java.util.Date
import java.util.Locale
import kotlin.math.cos
import kotlin.math.sin

object PredictionEngine {

    /**
     * Generates a 24-hour comparison curve:
     * - Historical/Actual simulated L/h for past slots
     * - Predicted Baseline L/h for past & upcoming hours
     * - Predicted AI-Optimized L/h showing potential reduction
     */
    fun generateHourlyForecast(
        history: List<SensorReading>,
        current: SensorReading,
        targetReductionPct: Double
    ): List<PredictionPoint> {
        val baseLph = current.hourlyConsumptionLph
        val reductionFactor = (1.0 - (targetReductionPct / 100.0)).coerceIn(0.4, 1.0)
        val labels = listOf("-6h", "-4h", "-2h", "Now", "+2h", "+4h", "+6h", "+8h", "+12h", "+16h", "+20h", "+24h")

        return labels.mapIndexed { idx, label ->
            val diurnalWave = 1.0 + 0.09 * sin((idx - 2) * 0.55)
            val workloadEffect = 1.0 + ((current.workloadPct - 68.0) / 100.0) * 0.35
            val ambientEffect = 1.0 + ((current.ambientTempC - 26.5) / 30.0) * 0.22
            val predictedBase = (baseLph * diurnalWave * workloadEffect * ambientEffect)
                .coerceIn(1800.0, 9000.0)

            val actualVal: Double? = when {
                idx < 3 && history.size > (3 - idx) * 2 -> {
                    val sample = history[history.size - 1 - (3 - idx) * 2]
                    sample.hourlyConsumptionLph
                }
                idx < 3 -> predictedBase * (0.98 + (idx * 0.01))
                idx == 3 -> current.hourlyConsumptionLph
                else -> null
            }

            PredictionPoint(
                label = label,
                actualOrHistoricalLph = actualVal,
                predictedBaselineLph = predictedBase,
                predictedOptimizedLph = predictedBase * reductionFactor
            )
        }
    }

    /**
     * Generates a 7-day forecast in thousands of litres/day (displayed as L/h normalized or daily L).
     */
    fun generateSevenDayForecast(
        current: SensorReading,
        targetReductionPct: Double
    ): List<PredictionPoint> {
        val baseDailyL = current.projectedDailyConsumptionL
        val reductionFactor = (1.0 - (targetReductionPct / 100.0)).coerceIn(0.4, 1.0)
        val days = listOf("Day 1", "Day 2", "Day 3", "Day 4", "Day 5", "Day 6", "Day 7")
        return days.mapIndexed { idx, day ->
            val wave = 1.0 + 0.06 * sin(idx * 0.9)
            val baseline = baseDailyL * wave
            PredictionPoint(
                label = day,
                actualOrHistoricalLph = if (idx == 0) baseDailyL else null,
                predictedBaselineLph = baseline,
                predictedOptimizedLph = baseline * reductionFactor
            )
        }
    }

    /**
     * Builds unified, deduplicated multi-metric time-series data for the 5 live dashboard graphs
     * across 1H, 6H, 24H, 7D, and 30D windows while preserving live simulated samples.
     */
    fun buildLiveChartBundle(
        history: List<SensorReading>,
        current: SensorReading,
        anomalies: List<AnomalyRecord>,
        targetReductionPct: Double,
        timeRange: ChartTimeRange,
        isolationScore: Double
    ): LiveChartBundle {
        val reductionFactor = (1.0 - (targetReductionPct / 100.0)).coerceIn(0.4, 1.0)
        val targetWue = 1.25
        val nowMs = current.timestampMs
        val activeAnomalyPresent = anomalies.any { !it.resolved && !it.isSimulatedExample } || isolationScore >= 0.58

        val timeFmt = SimpleDateFormat(
            when (timeRange) {
                ChartTimeRange.ONE_HOUR, ChartTimeRange.SIX_HOURS -> "HH:mm:ss"
                ChartTimeRange.TWENTY_FOUR_HOURS -> "HH:mm"
                ChartTimeRange.SEVEN_DAYS, ChartTimeRange.THIRTY_DAYS -> "MM/dd"
            },
            Locale.US
        )

        val points = when (timeRange) {
            ChartTimeRange.ONE_HOUR -> {
                // Use live captured streaming points + 4 upcoming AI forecast horizon slots
                val liveSlice = (if (history.isEmpty()) listOf(current) else history)
                    .distinctBy { it.timestampMs }
                    .takeLast(16)
                val out = ArrayList<LiveChartPoint>(liveSlice.size + 4)
                liveSlice.forEachIndexed { idx, sample ->
                    val baseLph = sample.hourlyConsumptionLph
                    val optLph = baseLph * reductionFactor
                    val predictedLph = baseLph * (0.97 + 0.03 * sin(idx * 0.4))
                    val isLatestAnom = (idx == liveSlice.lastIndex && activeAnomalyPresent) ||
                        (sample.temperatureC > 34.0 || sample.pressureBar < 2.0 || sample.flowRateLpm > 108.0)
                    out.add(
                        LiveChartPoint(
                            timestampMs = sample.timestampMs,
                            label = timeFmt.format(Date(sample.timestampMs)),
                            waterConsumptionLph = baseLph,
                            predictedLph = predictedLph,
                            optimizedLph = optLph,
                            wue = sample.estimatedWue,
                            targetWue = targetWue,
                            waterSavingsLph = (baseLph - optLph).coerceAtLeast(0.0),
                            coolantTempC = sample.temperatureC,
                            workloadPct = sample.workloadPct,
                            isForecast = false,
                            isAnomaly = isLatestAnom,
                            isSimulated = true
                        )
                    )
                }
                val stepMs = 15 * 60_000L
                for (f in 1..4) {
                    val ts = nowMs + f * stepMs
                    val wave = 1.0 + 0.05 * sin(f * 0.8)
                    val predBase = (current.hourlyConsumptionLph * wave).coerceIn(1800.0, 9500.0)
                    val opt = predBase * reductionFactor
                    out.add(
                        LiveChartPoint(
                            timestampMs = ts,
                            label = "+${f * 15}m",
                            waterConsumptionLph = predBase,
                            predictedLph = predBase,
                            optimizedLph = opt,
                            wue = (current.estimatedWue * (0.98 + 0.02 * cos(f * 0.7))).coerceIn(0.9, 2.8),
                            targetWue = targetWue,
                            waterSavingsLph = (predBase - opt).coerceAtLeast(0.0),
                            coolantTempC = (current.temperatureC + 0.25 * sin(f * 0.6)).coerceIn(16.0, 42.0),
                            workloadPct = (current.workloadPct + 1.5 * sin(f * 0.7)).coerceIn(20.0, 100.0),
                            isForecast = true,
                            isAnomaly = false,
                            isSimulated = true
                        )
                    )
                }
                out
            }

            else -> {
                val totalPoints = 14
                val historyPoints = 10
                val stepMs = timeRange.spanMs / historyPoints
                val out = ArrayList<LiveChartPoint>(totalPoints)
                for (i in 0 until totalPoints) {
                    val offsetIdx = i - (historyPoints - 1)
                    val ts = nowMs + offsetIdx * stepMs
                    val isForecast = offsetIdx > 0
                    val phase = (i + (nowMs / 10_000L).toInt() % 10) * 0.45
                    val diurnal = 1.0 + 0.09 * sin(phase) + 0.04 * cos(phase * 0.5)

                    val actualReading = if (offsetIdx == 0) current else null
                    val rawWater = actualReading?.hourlyConsumptionLph
                        ?: (current.hourlyConsumptionLph * diurnal).coerceIn(1800.0, 9500.0)
                    val predWater = (rawWater * (0.98 + 0.04 * cos(phase * 0.7))).coerceIn(1800.0, 9500.0)
                    val optWater = predWater * reductionFactor
                    val wueVal = actualReading?.estimatedWue
                        ?: (current.estimatedWue * (0.96 + 0.06 * sin(phase * 0.8))).coerceIn(1.05, 2.65)
                    val tempVal = actualReading?.temperatureC
                        ?: (current.temperatureC + 1.4 * sin(phase * 0.7)).coerceIn(17.0, 41.0)
                    val loadVal = actualReading?.workloadPct
                        ?: (current.workloadPct + 7.5 * sin(phase * 0.9)).coerceIn(24.0, 99.0)

                    val label = when {
                        offsetIdx == 0 -> "Now"
                        isForecast -> when (timeRange) {
                            ChartTimeRange.SIX_HOURS -> "+${offsetIdx * 30}m"
                            ChartTimeRange.TWENTY_FOUR_HOURS -> "+${offsetIdx * 2}h"
                            ChartTimeRange.SEVEN_DAYS -> "+${offsetIdx}d"
                            ChartTimeRange.THIRTY_DAYS -> "+${offsetIdx * 2}d"
                            else -> timeFmt.format(Date(ts))
                        }
                        else -> timeFmt.format(Date(ts))
                    }

                    val anomFlag = (!isForecast && offsetIdx == 0 && activeAnomalyPresent) ||
                        (!isForecast && offsetIdx == -3 && anomalies.any { !it.resolved })

                    out.add(
                        LiveChartPoint(
                            timestampMs = ts,
                            label = label,
                            waterConsumptionLph = rawWater,
                            predictedLph = predWater,
                            optimizedLph = optWater,
                            wue = wueVal,
                            targetWue = targetWue,
                            waterSavingsLph = (predWater - optWater).coerceAtLeast(0.0),
                            coolantTempC = tempVal,
                            workloadPct = loadVal,
                            isForecast = isForecast,
                            isAnomaly = anomFlag,
                            isSimulated = true
                        )
                    )
                }
                out
            }
        }

        val actualPoints = points.filter { !it.isForecast }.ifEmpty { points }
        val avgDraw = actualPoints.map { it.waterConsumptionLph }.average().takeIf { it.isFinite() }
            ?: current.hourlyConsumptionLph
        val peakDraw = actualPoints.maxOfOrNull { it.waterConsumptionLph }?.takeIf { it.isFinite() }
            ?: current.hourlyConsumptionLph
        val avgWue = actualPoints.map { it.wue }.average().takeIf { it.isFinite() }
            ?: current.estimatedWue
        val spanHours = (timeRange.spanMs / 3_600_000.0).coerceAtLeast(1.0)
        val avgSavingsLph = points.map { it.waterSavingsLph }.average().takeIf { it.isFinite() } ?: 0.0

        return LiveChartBundle(
            timeRange = timeRange,
            points = points,
            averageConsumptionLph = avgDraw,
            peakConsumptionLph = peakDraw,
            averageWue = avgWue,
            targetWue = targetWue,
            cumulativeWindowSavingsL = avgSavingsLph * spanHours,
            lastUpdatedMs = nowMs
        )
    }

    fun evaluateWhatIf(params: WhatIfParams): WhatIfResult {
        // Baseline reference: 100,000 L/day scaled by workload & ambient temperature
        val workloadScale = 0.55 + (params.workloadPct / 100.0) * 0.65
        val ambientScale = 0.85 + ((params.ambientTempC - 18.0).coerceAtLeast(0.0) / 25.0) * 0.35
        val baselineDailyL = 100_000.0 * workloadScale * ambientScale

        val flowScale = (params.flowSettingPct / 100.0).coerceIn(0.5, 1.3)
        val optimizedDailyL = baselineDailyL * params.coolingMode.waterFactor * (0.72 + 0.28 * flowScale)
        val savingsDailyL = (baselineDailyL - optimizedDailyL).coerceAtLeast(0.0)

        val simFlowLpm = (optimizedDailyL / 1440.0).coerceIn(32.0, 140.0)
        val simTempC = (19.5 + (params.workloadPct * 0.07) + ((params.ambientTempC - 20.0) * 0.22) - ((params.flowSettingPct - 80.0) * 0.05))
            .coerceIn(16.0, 42.0)
        val simPressureBar = (2.6 + (params.flowSettingPct / 100.0) * 0.85).coerceIn(1.5, 5.5)

        val itKw = (params.workloadPct.coerceIn(10.0, 100.0) / 100.0) * 2800.0
        val wue = (optimizedDailyL / 24.0) / itKw

        return WhatIfResult(
            baselineDailyL = baselineDailyL,
            optimizedDailyL = optimizedDailyL,
            estimatedSavingsDailyL = savingsDailyL,
            simulatedFlowLpm = simFlowLpm,
            simulatedTempC = simTempC,
            simulatedPressureBar = simPressureBar,
            predictedWue = wue
        )
    }
}
