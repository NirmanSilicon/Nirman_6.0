package com.example.ai

import android.util.Log
import com.example.model.AnomalyRecord
import com.example.model.OperatingMode
import com.example.model.OptimizationRecommendation
import com.example.model.SafetyLimits
import com.example.model.SensorReading
import com.example.model.WaterSavingsScenario
import com.google.firebase.Firebase
import com.google.firebase.ai.ai
import kotlinx.coroutines.CancellationException
import kotlinx.coroutines.TimeoutCancellationException
import kotlinx.coroutines.flow.Flow
import kotlinx.coroutines.flow.flow
import kotlinx.coroutines.withTimeout

private const val TAG = "AquaAiRepository"

sealed interface AiResponseState {
    data object Idle : AiResponseState
    data object Loading : AiResponseState
    data class Streaming(val text: String) : AiResponseState
    data class Success(val text: String, val isFallback: Boolean = false) : AiResponseState
    data class Error(val message: String, val fallbackText: String) : AiResponseState
}

class AquaAiRepository {

    private val model by lazy {
        Firebase.ai.generativeModel("gemini-3.8-flash")
    }

    private data class CachedAiEntry(
        val responseText: String,
        val cachedAtMs: Long
    )

    private val responseCache = object : LinkedHashMap<String, CachedAiEntry>(24, 0.75f, true) {
        override fun removeEldestEntry(eldest: MutableMap.MutableEntry<String, CachedAiEntry>?): Boolean {
            return size > 20
        }
    }

    private val cacheTtlMs = 30_000L

    private fun buildCacheKey(
        question: String,
        reading: SensorReading,
        anomalies: List<AnomalyRecord>,
        operatingMode: OperatingMode,
        savingsScenario: WaterSavingsScenario,
        isolationScore: Double
    ): String {
        val activeCount = anomalies.count { !it.resolved }
        return buildString {
            append(question.trim().lowercase())
            append('|').append((reading.flowRateLpm * 2).toInt())
            append('|').append((reading.pressureBar * 10).toInt())
            append('|').append((reading.temperatureC * 2).toInt())
            append('|').append(reading.workloadPct.toInt())
            append('|').append(activeCount)
            append('|').append(operatingMode.name)
            append('|').append(savingsScenario.baselineDailyL.toInt())
            append('|').append(savingsScenario.proposedReductionPct.toInt())
            append('|').append((isolationScore * 20).toInt())
        }
    }

    fun streamTelemetryAnalysis(
        question: String,
        reading: SensorReading,
        anomalies: List<AnomalyRecord>,
        recommendations: List<OptimizationRecommendation>,
        safetyLimits: SafetyLimits,
        operatingMode: OperatingMode,
        savingsScenario: WaterSavingsScenario,
        isolationScore: Double
    ): Flow<AiResponseState> = flow {
        val cacheKey = buildCacheKey(question, reading, anomalies, operatingMode, savingsScenario, isolationScore)
        val now = System.currentTimeMillis()
        val cached = synchronized(responseCache) {
            responseCache[cacheKey]?.takeIf { (now - it.cachedAtMs) <= cacheTtlMs }
        }
        if (cached != null) {
            emit(AiResponseState.Success(cached.responseText, isFallback = false))
            return@flow
        }

        emit(AiResponseState.Loading)
        val prompt = buildContextPrompt(
            question = question,
            reading = reading,
            anomalies = anomalies,
            recommendations = recommendations,
            safetyLimits = safetyLimits,
            operatingMode = operatingMode,
            savingsScenario = savingsScenario,
            isolationScore = isolationScore
        )
        val accumulated = StringBuilder()
        try {
            withTimeout(60_000L) {
                model.generateContentStream(prompt).collect { chunk ->
                    val chunkText = chunk.text.orEmpty()
                    if (chunkText.isNotEmpty()) {
                        accumulated.append(chunkText)
                        emit(AiResponseState.Streaming(accumulated.toString()))
                    }
                }
            }
            if (accumulated.isNotBlank()) {
                val finalResponse = accumulated.toString()
                synchronized(responseCache) {
                    responseCache[cacheKey] = CachedAiEntry(finalResponse, System.currentTimeMillis())
                }
                emit(AiResponseState.Success(finalResponse, isFallback = false))
            } else {
                val fallback = buildRuleBasedFallback(
                    question, reading, anomalies, recommendations, safetyLimits, operatingMode, savingsScenario, isolationScore
                )
                emit(AiResponseState.Error("Gemini returned an empty response.", fallback))
            }
        } catch (e: TimeoutCancellationException) {
            Log.e(TAG, "Gemini stream timed out", e)
            val fallback = buildRuleBasedFallback(
                question, reading, anomalies, recommendations, safetyLimits, operatingMode, savingsScenario, isolationScore
            )
            emit(AiResponseState.Error("Gemini request timed out after 60 seconds.", fallback))
        } catch (e: CancellationException) {
            throw e
        } catch (t: Throwable) {
            Log.e(TAG, "Firebase AI Logic inference failed", t)
            val fallback = buildRuleBasedFallback(
                question, reading, anomalies, recommendations, safetyLimits, operatingMode, savingsScenario, isolationScore
            )
            emit(
                AiResponseState.Error(
                    t.localizedMessage?.takeIf { it.isNotBlank() }
                        ?: "Unable to reach Gemini via Firebase AI Logic.",
                    fallback
                )
            )
        }
    }

    private fun buildContextPrompt(
        question: String,
        reading: SensorReading,
        anomalies: List<AnomalyRecord>,
        recommendations: List<OptimizationRecommendation>,
        safetyLimits: SafetyLimits,
        operatingMode: OperatingMode,
        savingsScenario: WaterSavingsScenario,
        isolationScore: Double
    ): String {
        val activeAnomalies = anomalies.filter { !it.resolved }.take(3)
        val anomalySummary = if (activeAnomalies.isEmpty()) {
            "None (Isolation Forest score: ${"%.2f".format(isolationScore)})"
        } else {
            activeAnomalies.joinToString("; ") {
                "${it.severity.label}: ${it.title} on ${it.affectedSensor} (score ${"%.2f".format(it.anomalyScore)}, simulatedExample=${it.isSimulatedExample})"
            }
        }
        val recSummary = recommendations.joinToString("; ") {
            "${it.title} (~${it.expectedDailySavingsL.toInt()} L/day, ${it.safetyStatus.label})"
        }

        return """
            You are the AquaCompute AI industrial water stewardship analyst for a simulated data center cooling plant.
            Answer the operator's question concisely, technically, and accurately using ONLY the live telemetry context below.
            Never claim to control real industrial hardware; note that telemetry and control actions are software simulations.

            LIVE TELEMETRY (SYNTHETIC):
            - Water Flow: ${"%.1f".format(reading.flowRateLpm)} L/min (${"%.0f".format(reading.hourlyConsumptionLph)} L/hr, projected ${"%.0f".format(reading.projectedDailyConsumptionL)} L/day)
            - Loop Pressure: ${"%.2f".format(reading.pressureBar)} bar
            - Coolant Temperature: ${"%.1f".format(reading.temperatureC)} °C
            - Data Center Workload: ${"%.1f".format(reading.workloadPct)}%
            - Weather / Ambient: ${"%.1f".format(reading.ambientTempC)} °C, ${"%.0f".format(reading.humidityPct)}% RH (${reading.weatherCondition})
            - Estimated WUE: ${"%.2f".format(reading.estimatedWue)} L/kWh
            - Isolation Forest Anomaly Score: ${"%.2f".format(isolationScore)}

            SAFETY & CONTROL:
            - Operating Mode: ${operatingMode.label}
            - Limits: Flow ${safetyLimits.minFlowLpm}–${safetyLimits.maxFlowLpm} L/min, Pressure ${safetyLimits.minPressureBar}–${safetyLimits.maxPressureBar} bar, Max Temp ${safetyLimits.maxTempC}°C

            ACTIVE ANOMALIES:
            $anomalySummary

            OPTIMIZATION PROPOSALS:
            $recSummary

            ILLUSTRATIVE SAVINGS SCENARIO:
            - Baseline: ${"%.0f".format(savingsScenario.baselineDailyL)} L/day, Proposed Reduction: ${"%.0f".format(savingsScenario.proposedReductionPct)}% -> Daily ${"%.0f".format(savingsScenario.dailySavingsL)} L, Monthly ${"%.0f".format(savingsScenario.monthlySavingsL)} L, Yearly ${"%.0f".format(savingsScenario.yearlySavingsL)} L.

            OPERATOR QUESTION:
            $question
        """.trimIndent()
    }

    fun buildRuleBasedFallback(
        question: String,
        reading: SensorReading,
        anomalies: List<AnomalyRecord>,
        recommendations: List<OptimizationRecommendation>,
        safetyLimits: SafetyLimits,
        operatingMode: OperatingMode,
        savingsScenario: WaterSavingsScenario,
        isolationScore: Double
    ): String {
        val q = question.lowercase()
        val activeAnom = anomalies.firstOrNull { !it.resolved }
        val topRec = recommendations.firstOrNull()
        return buildString {
            appendLine("[RULE-BASED FALLBACK ANALYSIS — GEMINI UNAVAILABLE]")
            when {
                q.contains("abnormal") || q.contains("anomal") -> {
                    if (activeAnom != null) {
                        appendLine("• Active alert: ${activeAnom.title} (${activeAnom.severity.label}) affecting ${activeAnom.affectedSensor}.")
                        appendLine("• Detail: ${activeAnom.explanation}")
                    } else {
                        appendLine("• No active anomalies. Isolation Forest score is ${"%.2f".format(isolationScore)} (nominal < 0.56).")
                    }
                }
                q.contains("predict") || q.contains("future") -> {
                    appendLine("• Current draw is ${"%.1f".format(reading.flowRateLpm)} L/min (${"%.0f".format(reading.hourlyConsumptionLph)} L/hr).")
                    appendLine("• Projected 24h baseline: ${"%.0f".format(reading.projectedDailyConsumptionL)} L/day at ${reading.workloadPct.toInt()}% workload and ${"%.1f".format(reading.ambientTempC)}°C ambient.")
                }
                q.contains("save") || q.contains("optim") -> {
                    if (topRec != null) {
                        appendLine("• Top proposal: ${topRec.title} (${topRec.safetyStatus.label}).")
                        appendLine("• Estimated daily savings: ${"%.0f".format(topRec.expectedDailySavingsL)} L/day (${topRec.reason}).")
                    }
                    appendLine("• Illustrative calculator target (${savingsScenario.proposedReductionPct.toInt()}%): ${"%.0f".format(savingsScenario.dailySavingsL)} L/day | ${"%.0f".format(savingsScenario.yearlySavingsL)} L/year.")
                }
                q.contains("safety") || q.contains("limit") -> {
                    val withinLimits = reading.flowRateLpm in safetyLimits.minFlowLpm..safetyLimits.maxFlowLpm &&
                        reading.pressureBar in safetyLimits.minPressureBar..safetyLimits.maxPressureBar &&
                        reading.temperatureC <= safetyLimits.maxTempC
                    appendLine("• Operating mode: ${operatingMode.label}. Envelopes healthy: $withinLimits.")
                    appendLine("• Configured limits: Flow ${safetyLimits.minFlowLpm}–${safetyLimits.maxFlowLpm} L/min, Pressure ${safetyLimits.minPressureBar}–${safetyLimits.maxPressureBar} bar, Max Temp ${safetyLimits.maxTempC}°C.")
                }
                q.contains("workload") -> {
                    val plus15Flow = reading.flowRateLpm * 1.11
                    appendLine("• At ${reading.workloadPct.toInt()}% load, flow is ${"%.1f".format(reading.flowRateLpm)} L/min.")
                    appendLine("• A +15% workload surge increases heat rejection, raising simulated water demand toward ~${"%.1f".format(plus15Flow)} L/min unless hybrid economizer stage compensates.")
                }
                else -> {
                    appendLine("• Flow is ${"%.1f".format(reading.flowRateLpm)} L/min driven by ${reading.workloadPct.toInt()}% server load and ${"%.1f".format(reading.ambientTempC)}°C ambient weather.")
                    appendLine("• Coolant temp: ${"%.1f".format(reading.temperatureC)}°C | Pressure: ${"%.2f".format(reading.pressureBar)} bar | WUE: ${"%.2f".format(reading.estimatedWue)} L/kWh.")
                    if (topRec != null) {
                        appendLine("• Recommended simulated action: ${topRec.title} (~${topRec.expectedDailySavingsL.toInt()} L/day).")
                    }
                }
            }
        }.trim()
    }
}
