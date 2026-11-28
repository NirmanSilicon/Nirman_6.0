package com.example

import com.example.ai.AquaAiRepository
import com.example.engine.IsolationForestDetector
import com.example.engine.MultiAgentCoordinator
import com.example.engine.PredictionEngine
import com.example.model.AnomalySeverity
import com.example.model.ChartTimeRange
import com.example.model.CoolingMode
import com.example.model.OperatingMode
import com.example.model.SafetyLimits
import com.example.model.SafetyValidationStatus
import com.example.model.SensorReading
import com.example.model.WaterSavingsScenario
import com.example.model.WhatIfParams
import org.junit.Assert.assertEquals
import org.junit.Assert.assertTrue
import org.junit.Test

class AquaEngineUnitTest {

    @Test
    fun waterSavingsScenario_matchesIllustrativePresentationTarget() {
        val scenario = WaterSavingsScenario(
            baselineDailyL = 100_000.0,
            proposedReductionPct = 20.0
        )
        assertEquals(80_000.0, scenario.optimizedDailyL, 0.01)
        assertEquals(20_000.0, scenario.dailySavingsL, 0.01)
        assertEquals(600_000.0, scenario.monthlySavingsL, 0.01)
        assertEquals(7_300_000.0, scenario.yearlySavingsL, 0.01)
    }

    @Test
    fun isolationForest_detectsNominalVsExtremeTelemetry() {
        val detector = IsolationForestDetector()
        val nominal = SensorReading(
            flowRateLpm = 69.4,
            pressureBar = 3.20,
            temperatureC = 23.5,
            workloadPct = 68.0,
            ambientTempC = 26.5,
            humidityPct = 54.0,
            weatherCondition = "Partly Cloudy",
            timestampMs = 1000L
        )
        val anomalous = nominal.copy(
            flowRateLpm = 124.0,
            pressureBar = 1.25,
            temperatureC = 38.5
        )
        val nomRes = detector.evaluate(nominal)
        val anomRes = detector.evaluate(anomalous)

        assertEquals(AnomalySeverity.NORMAL, nomRes.severity)
        assertEquals(AnomalySeverity.CRITICAL, anomRes.severity)
        assertTrue(anomRes.score > nomRes.score)
    }

    @Test
    fun multiAgentCoordinator_blocksUnsafeFlowReduction() {
        val coordinator = MultiAgentCoordinator()
        val lowFlowReading = SensorReading(
            flowRateLpm = 40.0,
            pressureBar = 2.4,
            temperatureC = 25.0,
            workloadPct = 55.0,
            ambientTempC = 24.0,
            humidityPct = 50.0,
            weatherCondition = "Clear",
            timestampMs = 2000L
        )
        val output = coordinator.evaluateCycle(
            reading = lowFlowReading,
            previousReading = null,
            operatingMode = OperatingMode.MANUAL,
            safetyLimits = SafetyLimits(minFlowLpm = 38.0),
            appliedIds = emptySet(),
            targetReductionPct = 20.0
        )
        assertEquals(7, output.agents.size)
        assertTrue(output.recommendations.any { it.safetyStatus == SafetyValidationStatus.BLOCKED_BY_SAFETY })
    }

    @Test
    fun whatIfSimulation_reducesWaterInDirectLiquidMode() {
        val evap = PredictionEngine.evaluateWhatIf(WhatIfParams(coolingMode = CoolingMode.EVAPORATIVE))
        val liquid = PredictionEngine.evaluateWhatIf(WhatIfParams(coolingMode = CoolingMode.DIRECT_LIQUID))
        assertTrue(liquid.optimizedDailyL < evap.optimizedDailyL)
        assertTrue(liquid.estimatedSavingsDailyL > evap.estimatedSavingsDailyL)
    }

    @Test
    fun isolationForest_cacheReturnsIdenticalResultAndInvalidatesOnShift() {
        val detector = IsolationForestDetector()
        detector.warmUp()
        val base = SensorReading(
            flowRateLpm = 70.0,
            pressureBar = 3.20,
            temperatureC = 23.5,
            workloadPct = 68.0,
            ambientTempC = 26.5,
            humidityPct = 54.0,
            weatherCondition = "Partly Cloudy",
            timestampMs = 1000L
        )
        val first = detector.evaluate(base)
        val nearIdentical = detector.evaluate(base.copy(flowRateLpm = 70.01, timestampMs = 2000L))
        assertEquals(first, nearIdentical)

        val shifted = detector.evaluate(base.copy(flowRateLpm = 118.0, temperatureC = 37.0))
        assertTrue(shifted.score > first.score)
        assertEquals(AnomalySeverity.CRITICAL, shifted.severity)
    }

    @Test
    fun multiAgentCoordinator_updatesAppliedRecommendationsAcrossCachedCycles() {
        val coordinator = MultiAgentCoordinator()
        val reading = SensorReading(
            flowRateLpm = 72.0,
            pressureBar = 3.20,
            temperatureC = 24.0,
            workloadPct = 70.0,
            ambientTempC = 25.0,
            humidityPct = 50.0,
            weatherCondition = "Clear",
            timestampMs = 3000L
        )
        val first = coordinator.evaluateCycle(
            reading = reading,
            previousReading = null,
            operatingMode = OperatingMode.MANUAL,
            safetyLimits = SafetyLimits(),
            appliedIds = emptySet(),
            targetReductionPct = 20.0
        )
        assertTrue(first.recommendations.none { it.applied })

        val second = coordinator.evaluateCycle(
            reading = reading.copy(timestampMs = 5000L),
            previousReading = reading,
            operatingMode = OperatingMode.MANUAL,
            safetyLimits = SafetyLimits(),
            appliedIds = setOf("opt_vfd_trim"),
            targetReductionPct = 20.0
        )
        assertTrue(second.recommendations.first { it.id == "opt_vfd_trim" }.applied)
    }

    @Test
    fun aquaAiFallback_handlesAnomalySafetyAndSavingsQueriesGracefully() {
        val repo = AquaAiRepository()
        val reading = SensorReading(
            flowRateLpm = 74.0,
            pressureBar = 3.15,
            temperatureC = 24.5,
            workloadPct = 72.0,
            ambientTempC = 27.0,
            humidityPct = 55.0,
            weatherCondition = "Clear",
            timestampMs = 4000L
        )
        val safetyText = repo.buildRuleBasedFallback(
            question = "Are safety limits satisfied?",
            reading = reading,
            anomalies = emptyList(),
            recommendations = emptyList(),
            safetyLimits = SafetyLimits(),
            operatingMode = OperatingMode.AUTOMATIC,
            savingsScenario = WaterSavingsScenario(),
            isolationScore = 0.34
        )
        val savingsText = repo.buildRuleBasedFallback(
            question = "How can we save water?",
            reading = reading,
            anomalies = emptyList(),
            recommendations = emptyList(),
            safetyLimits = SafetyLimits(),
            operatingMode = OperatingMode.MANUAL,
            savingsScenario = WaterSavingsScenario(),
            isolationScore = 0.34
        )
        assertTrue(safetyText.contains("RULE-BASED FALLBACK"))
        assertTrue(safetyText.contains("Envelopes healthy"))
        assertTrue(savingsText.contains("20000 L/day"))
    }

    @Test
    fun predictionEngine_producesFiniteBoundedForecastsOnExtremeInputs() {
        val extreme = SensorReading(
            flowRateLpm = 220.0,
            pressureBar = 0.5,
            temperatureC = 45.0,
            workloadPct = 100.0,
            ambientTempC = 48.0,
            humidityPct = 95.0,
            weatherCondition = "Heatwave",
            timestampMs = 5000L
        )
        val hourly = PredictionEngine.generateHourlyForecast(emptyList(), extreme, 95.0)
        val weekly = PredictionEngine.generateSevenDayForecast(extreme, 95.0)
        val whatIf = PredictionEngine.evaluateWhatIf(WhatIfParams(workloadPct = 0.0, flowSettingPct = 200.0))

        assertEquals(12, hourly.size)
        assertEquals(7, weekly.size)
        assertTrue(hourly.all { it.predictedBaselineLph.isFinite() && it.predictedOptimizedLph.isFinite() })
        assertTrue(weekly.all { it.predictedBaselineLph.isFinite() && it.predictedOptimizedLph.isFinite() })
        assertTrue(whatIf.predictedWue.isFinite() && whatIf.predictedWue >= 0.0)
    }

    @Test
    fun liveChartBundle_supportsAllFiveTimeRangesAndDeduplicatesTimestamps() {
        val base = SensorReading(
            flowRateLpm = 72.0,
            pressureBar = 3.20,
            temperatureC = 24.0,
            workloadPct = 70.0,
            ambientTempC = 25.0,
            humidityPct = 50.0,
            weatherCondition = "Clear",
            timestampMs = 10_000L
        )
        // Include duplicate timestamp sample to verify deduplication in 1H live history
        val historyWithDup = listOf(
            base.copy(timestampMs = 6_000L),
            base.copy(timestampMs = 8_000L),
            base.copy(timestampMs = 8_000L),
            base
        )

        ChartTimeRange.entries.forEach { range ->
            val bundle = PredictionEngine.buildLiveChartBundle(
                history = historyWithDup,
                current = base,
                anomalies = emptyList(),
                targetReductionPct = 20.0,
                timeRange = range,
                isolationScore = 0.34
            )
            assertEquals(range, bundle.timeRange)
            assertTrue(bundle.points.isNotEmpty())
            assertTrue(bundle.points.any { !it.isForecast })
            assertTrue(bundle.points.any { it.isForecast })
            assertTrue(bundle.points.all { it.isSimulated })
            assertTrue(bundle.points.all {
                it.waterConsumptionLph.isFinite() &&
                    it.predictedLph.isFinite() &&
                    it.optimizedLph.isFinite() &&
                    it.wue.isFinite() &&
                    it.waterSavingsLph.isFinite() &&
                    it.coolantTempC.isFinite() &&
                    it.workloadPct.isFinite()
            })
            if (range == ChartTimeRange.ONE_HOUR) {
                val livePoints = bundle.points.filter { !it.isForecast }
                assertEquals(3, livePoints.size)
            }
        }
    }
}
