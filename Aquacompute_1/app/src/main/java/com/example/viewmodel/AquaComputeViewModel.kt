package com.example.viewmodel

import android.app.Application
import androidx.compose.runtime.Immutable
import androidx.lifecycle.AndroidViewModel
import androidx.lifecycle.viewModelScope
import com.example.ai.AiResponseState
import com.example.ai.AquaAiRepository
import com.example.data.SettingsPreferencesRepository
import com.example.engine.IsolationForestDetector
import com.example.engine.MultiAgentCoordinator
import com.example.engine.PredictionEngine
import com.example.engine.SyntheticTelemetrySource
import com.example.engine.TelemetryStreamManager
import com.example.model.AgentId
import com.example.model.AgentMessage
import com.example.model.AgentNodeState
import com.example.model.AgentStatus
import com.example.model.AnomalyRecord
import com.example.model.AnomalySeverity
import com.example.model.ChartTimeRange
import com.example.model.ControlActionLog
import com.example.model.CoolingMode
import com.example.model.LiveChartBundle
import com.example.model.ManualSensorOverride
import com.example.model.OperatingMode
import com.example.model.OptimizationRecommendation
import com.example.model.PlcInterlockStatus
import com.example.model.PredictionPoint
import com.example.model.SafetyLimits
import com.example.model.SafetyValidationStatus
import com.example.model.SensorReading
import com.example.model.StreamConnectionState
import com.example.model.TelemetryAdapterSettings
import com.example.model.WaterSavingsScenario
import com.example.model.WhatIfParams
import com.example.model.WhatIfResult
import android.util.Log
import kotlinx.coroutines.CancellationException
import kotlinx.coroutines.CoroutineExceptionHandler
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.Job
import kotlinx.coroutines.async
import kotlinx.coroutines.channels.BufferOverflow
import kotlinx.coroutines.coroutineScope
import kotlinx.coroutines.delay
import kotlinx.coroutines.flow.MutableSharedFlow
import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.flow.StateFlow
import kotlinx.coroutines.flow.asStateFlow
import kotlinx.coroutines.flow.catch
import kotlinx.coroutines.flow.collectLatest
import kotlinx.coroutines.flow.distinctUntilChanged
import kotlinx.coroutines.flow.update
import kotlinx.coroutines.isActive
import kotlinx.coroutines.launch
import kotlinx.coroutines.withContext

@Immutable
data class AquaDashboardState(
    val isSimulationRunning: Boolean = true,
    val currentReading: SensorReading,
    val sensorHistory: List<SensorReading>,
    val manualOverride: ManualSensorOverride = ManualSensorOverride(),
    val isManualOverrideActive: Boolean = false,
    val operatingMode: OperatingMode = OperatingMode.MANUAL,
    val safetyLimits: SafetyLimits = SafetyLimits(),
    val plcInterlocks: PlcInterlockStatus = PlcInterlockStatus(),
    val agents: List<AgentNodeState> = emptyList(),
    val collaborationFeed: List<AgentMessage> = emptyList(),
    val anomalies: List<AnomalyRecord> = emptyList(),
    val isolationScore: Double = 0.34,
    val isolationSeverity: AnomalySeverity = AnomalySeverity.NORMAL,
    val recommendations: List<OptimizationRecommendation> = emptyList(),
    val hourlyForecast: List<PredictionPoint> = emptyList(),
    val weeklyForecast: List<PredictionPoint> = emptyList(),
    val whatIfParams: WhatIfParams = WhatIfParams(),
    val whatIfResult: WhatIfResult = PredictionEngine.evaluateWhatIf(WhatIfParams()),
    val savingsScenario: WaterSavingsScenario = WaterSavingsScenario(),
    val controlLogs: List<ControlActionLog> = emptyList(),
    val adapterSettings: TelemetryAdapterSettings = TelemetryAdapterSettings(),
    val aiQuestion: String = "",
    val aiResponseState: AiResponseState = AiResponseState.Idle,
    val statusBannerMessage: String? = null,
    val activeAnomaliesCount: Int = 1,
    val systemHealthLabel: String = "WARNING",
    val appliedSavingsDailyL: Double = 0.0,
    val selectedTimeRange: ChartTimeRange = ChartTimeRange.TWENTY_FOUR_HOURS,
    val liveChartBundle: LiveChartBundle = LiveChartBundle(),
    val streamConnectionState: StreamConnectionState = StreamConnectionState.DEMO_STREAMING,
    val streamErrorMessage: String? = null,
    val isChartsWarmingUp: Boolean = true
)

private fun AquaDashboardState.withDerivedMetrics(): AquaDashboardState {
    var activeCount = 0
    var hasCritical = false
    var hasWarning = false
    for (i in anomalies.indices) {
        val a = anomalies[i]
        if (!a.resolved && a.severity != AnomalySeverity.NORMAL) {
            activeCount++
            if (a.severity == AnomalySeverity.CRITICAL) hasCritical = true
            else if (a.severity == AnomalySeverity.WARNING) hasWarning = true
        }
    }
    var appliedSavings = 0.0
    for (i in recommendations.indices) {
        val rec = recommendations[i]
        if (rec.applied) appliedSavings += rec.expectedDailySavingsL
    }
    val health = when {
        operatingMode == OperatingMode.EMERGENCY -> "EMERGENCY LOCK"
        hasCritical -> "CRITICAL ALERT"
        hasWarning -> "WARNING"
        else -> "NOMINAL"
    }
    return copy(
        activeAnomaliesCount = activeCount,
        systemHealthLabel = health,
        appliedSavingsDailyL = appliedSavings
    )
}

class AquaComputeViewModel(application: Application) : AndroidViewModel(application) {

    private val telemetrySource = SyntheticTelemetrySource()
    private val streamManager = TelemetryStreamManager(application.applicationContext, telemetrySource)
    private val isolationForest = IsolationForestDetector()
    private val coordinator = MultiAgentCoordinator(isolationForest)
    private val prefsRepo = SettingsPreferencesRepository(application.applicationContext)
    private val aiRepo = AquaAiRepository()

    private val _uiState: MutableStateFlow<AquaDashboardState>
    val uiState: StateFlow<AquaDashboardState>

    private var simJob: Job? = null
    private var aiJob: Job? = null

    @Volatile
    private var isForegroundActive: Boolean = true

    private val appliedRecommendationIds = java.util.Collections.synchronizedSet(mutableSetOf<String>())

    private val safeExceptionHandler = CoroutineExceptionHandler { _, throwable ->
        if (throwable is CancellationException) return@CoroutineExceptionHandler
        Log.e("AquaComputeVM", "Recovered from background coroutine failure", throwable)
        _uiState.update {
            it.copy(
                statusBannerMessage = throwable.localizedMessage?.takeIf { msg -> msg.isNotBlank() }
                    ?: "Recovered from a transient background processing error."
            )
        }
    }

    // Conflated streams to prevent slider drag spikes from queuing redundant evaluation or DataStore writes
    private val manualTriggerFlow = MutableSharedFlow<Unit>(
        replay = 0,
        extraBufferCapacity = 1,
        onBufferOverflow = BufferOverflow.DROP_OLDEST
    )
    private val savingsTriggerFlow = MutableSharedFlow<WaterSavingsScenario>(
        replay = 0,
        extraBufferCapacity = 1,
        onBufferOverflow = BufferOverflow.DROP_OLDEST
    )
    private val safetyLimitsTriggerFlow = MutableSharedFlow<SafetyLimits>(
        replay = 0,
        extraBufferCapacity = 1,
        onBufferOverflow = BufferOverflow.DROP_OLDEST
    )

    init {
        val initialHistory = ArrayList<SensorReading>(16)
        var prev: SensorReading? = null
        val now = System.currentTimeMillis()
        repeat(16) { idx ->
            val sample = telemetrySource.nextReading(prev, null).copy(
                timestampMs = now - ((16 - idx) * 2000L)
            )
            initialHistory.add(sample)
            prev = sample
        }
        val latest = initialHistory.last()

        // Fast main-thread seed state without blocking on Isolation Forest tree construction
        val seedAgents = AgentId.entries.map { id ->
            AgentNodeState(
                id = id,
                status = AgentStatus.ACTIVE,
                currentTask = "Initializing ${id.displayName}",
                latestObservation = "Syncing synthetic cooling telemetry",
                recommendationOrAction = "Warming up inference pipeline",
                timestampMs = now
            )
        }

        _uiState = MutableStateFlow(
            AquaDashboardState(
                currentReading = latest,
                sensorHistory = initialHistory,
                agents = seedAgents,
                anomalies = listOf(
                    AnomalyRecord(
                        id = "sim_example_1",
                        title = "Simulated Example: Secondary Loop Pressure Drift",
                        severity = AnomalySeverity.WARNING,
                        affectedSensor = "Loop Pressure (bar)",
                        detectedAtMs = now - 180_000L,
                        anomalyScore = 0.61,
                        isSimulatedExample = true,
                        explanation = "Preloaded demonstration example illustrating Isolation Forest detection of a 12% pressure dip.",
                        suggestedResponse = "Inspect bypass valve seat and compare against primary pump discharge.",
                        resolved = false
                    )
                ),
                controlLogs = listOf(
                    ControlActionLog(
                        id = "log_init",
                        timestampMs = now - 60_000L,
                        actionTitle = "System initialized in Manual Safe Control Mode (Simulated)",
                        operatingMode = OperatingMode.MANUAL,
                        safetyResult = "All PLC interlocks healthy",
                        accepted = true
                    )
                )
            ).withDerivedMetrics()
        )
        uiState = _uiState.asStateFlow()

        // Offload Isolation Forest tree warm-up and initial forecast/agent cycle off the main thread
        viewModelScope.launch(Dispatchers.Default + safeExceptionHandler) {
            isolationForest.warmUp()
            processNewReadingAsync(latest, isInitialSeed = true)
        }

        observePersistedSettings()
        observeNetworkConnectivity()
        observeManualSensorTriggers()
        observeSavingsScenarioTriggers()
        observeSafetyLimitsTriggers()
        startSimulationLoop()
    }

    private fun observeNetworkConnectivity() {
        viewModelScope.launch(safeExceptionHandler) {
            streamManager.isNetworkOnline.collect { online ->
                _uiState.update { state ->
                    val nextConn = streamManager.resolveConnectionState(
                        isSimulationRunning = state.isSimulationRunning,
                        hasStreamError = state.streamErrorMessage != null
                    )
                    state.copy(
                        streamConnectionState = nextConn,
                        statusBannerMessage = if (online && state.streamConnectionState == StreamConnectionState.OFFLINE_DEMO) {
                            "Connectivity restored — telemetry stream synchronized."
                        } else {
                            state.statusBannerMessage
                        }
                    )
                }
            }
        }
    }

    private fun observePersistedSettings() {
        viewModelScope.launch(safeExceptionHandler) {
            prefsRepo.settingsFlow
                .distinctUntilChanged()
                .catch { e ->
                    Log.e("AquaComputeVM", "Preferences observation failed", e)
                }
                .collect { saved ->
                    val cur = _uiState.value
                    val reductionChanged = cur.savingsScenario.proposedReductionPct != saved.savingsScenario.proposedReductionPct
                    val (hourly, weekly) = if (reductionChanged) {
                        withContext(Dispatchers.Default) {
                            PredictionEngine.generateHourlyForecast(
                                cur.sensorHistory,
                                cur.currentReading,
                                saved.savingsScenario.proposedReductionPct
                            ) to PredictionEngine.generateSevenDayForecast(
                                cur.currentReading,
                                saved.savingsScenario.proposedReductionPct
                            )
                        }
                    } else {
                        cur.hourlyForecast to cur.weeklyForecast
                    }
                    _uiState.update { state ->
                        state.copy(
                            operatingMode = saved.operatingMode,
                            safetyLimits = saved.safetyLimits,
                            savingsScenario = saved.savingsScenario,
                            adapterSettings = saved.adapterSettings,
                            hourlyForecast = hourly,
                            weeklyForecast = weekly
                        ).withDerivedMetrics()
                    }
                }
        }
    }

    private fun observeManualSensorTriggers() {
        viewModelScope.launch(Dispatchers.Default + safeExceptionHandler) {
            manualTriggerFlow.collectLatest {
                delay(70L)
                try {
                    val current = _uiState.value
                    val next = telemetrySource.nextReading(current.currentReading, current.manualOverride)
                    processNewReadingAsync(next)
                } catch (e: CancellationException) {
                    throw e
                } catch (e: Exception) {
                    Log.e("AquaComputeVM", "Manual sensor evaluation failed", e)
                }
            }
        }
    }

    private fun observeSavingsScenarioTriggers() {
        viewModelScope.launch(Dispatchers.Default + safeExceptionHandler) {
            savingsTriggerFlow.collectLatest { next ->
                delay(100L)
                try {
                    prefsRepo.saveSavingsScenario(next)
                    val s = _uiState.value
                    val hourly = PredictionEngine.generateHourlyForecast(s.sensorHistory, s.currentReading, next.proposedReductionPct)
                    val weekly = PredictionEngine.generateSevenDayForecast(s.currentReading, next.proposedReductionPct)
                    val bundle = PredictionEngine.buildLiveChartBundle(
                        history = s.sensorHistory,
                        current = s.currentReading,
                        anomalies = s.anomalies,
                        targetReductionPct = next.proposedReductionPct,
                        timeRange = s.selectedTimeRange,
                        isolationScore = s.isolationScore
                    )
                    _uiState.update { it.copy(hourlyForecast = hourly, weeklyForecast = weekly, liveChartBundle = bundle) }
                } catch (e: CancellationException) {
                    throw e
                } catch (e: Exception) {
                    Log.e("AquaComputeVM", "Savings update failed", e)
                }
            }
        }
    }

    private fun observeSafetyLimitsTriggers() {
        viewModelScope.launch(Dispatchers.IO + safeExceptionHandler) {
            safetyLimitsTriggerFlow.collectLatest { limits ->
                delay(140L)
                prefsRepo.saveSafetyLimits(limits)
            }
        }
    }

    private fun startSimulationLoop() {
        if (simJob?.isActive == true) return
        simJob = viewModelScope.launch(Dispatchers.Default + safeExceptionHandler) {
            while (isActive) {
                val baseIntervalMs = (_uiState.value.adapterSettings.sampleIntervalSeconds.coerceIn(1, 10)) * 1000L
                val delayMs = streamManager.nextBackoffDelayMs(baseIntervalMs)
                delay(delayMs)
                val state = _uiState.value
                if (isForegroundActive && state.isSimulationRunning) {
                    val activeOverride = if (state.isManualOverrideActive) state.manualOverride else null
                    val result = streamManager.pollNextReading(
                        previous = state.currentReading,
                        manualOverrides = activeOverride,
                        adapterSettings = state.adapterSettings
                    )
                    result.onSuccess { next ->
                        try {
                            processNewReadingAsync(next)
                        } catch (e: CancellationException) {
                            throw e
                        } catch (e: Exception) {
                            Log.e("AquaComputeVM", "Telemetry tick recovered from error", e)
                            _uiState.update { s ->
                                s.copy(
                                    streamErrorMessage = e.localizedMessage ?: "Transient telemetry calculation error",
                                    streamConnectionState = streamManager.resolveConnectionState(s.isSimulationRunning, true)
                                )
                            }
                        }
                    }.onFailure { err ->
                        _uiState.update { s ->
                            s.copy(
                                streamErrorMessage = err.localizedMessage ?: "Telemetry stream interrupted; retrying…",
                                streamConnectionState = streamManager.resolveConnectionState(s.isSimulationRunning, true)
                            )
                        }
                    }
                }
            }
        }
    }

    fun setForegroundActive(active: Boolean) {
        isForegroundActive = active
        if (active && simJob?.isActive != true) {
            startSimulationLoop()
        }
    }

    private suspend fun processNewReadingAsync(
        next: SensorReading,
        isInitialSeed: Boolean = false
    ) = coroutineScope {
        val state = _uiState.value
        val updatedHistory = if (isInitialSeed) {
            state.sensorHistory.distinctBy { it.timestampMs }
        } else {
            // Bounded deduplicated ring window (36 points) to prevent duplicate timestamps and cap memory
            (state.sensorHistory + next)
                .distinctBy { it.timestampMs }
                .takeLast(36)
        }
        val reductionPct = state.savingsScenario.proposedReductionPct
        val selectedRange = state.selectedTimeRange

        val appliedSnapshot = synchronized(appliedRecommendationIds) { appliedRecommendationIds.toSet() }

        // Run independent agent evaluation and forecasts concurrently on Dispatchers.Default
        val cycleDeferred = async(Dispatchers.Default) {
            coordinator.evaluateCycle(
                reading = next,
                previousReading = state.currentReading,
                operatingMode = state.operatingMode,
                safetyLimits = state.safetyLimits,
                appliedIds = appliedSnapshot,
                targetReductionPct = reductionPct
            )
        }
        val hourlyDeferred = async(Dispatchers.Default) {
            PredictionEngine.generateHourlyForecast(updatedHistory, next, reductionPct)
        }
        val weeklyDeferred = async(Dispatchers.Default) {
            PredictionEngine.generateSevenDayForecast(next, reductionPct)
        }

        val cycle = cycleDeferred.await()
        val hourly = hourlyDeferred.await()
        val weekly = weeklyDeferred.await()

        _uiState.update { latestState ->
            val autoLogs = mutableListOf<ControlActionLog>()
            if (latestState.operatingMode == OperatingMode.AUTOMATIC) {
                cycle.recommendations.firstOrNull {
                    !it.applied && it.safetyStatus == SafetyValidationStatus.APPROVED
                }?.let { autoRec ->
                    appliedRecommendationIds.add(autoRec.id)
                    autoLogs.add(
                        ControlActionLog(
                            id = "ctrl_auto_${next.timestampMs}",
                            timestampMs = next.timestampMs,
                            actionTitle = "Auto-Applied: ${autoRec.title} (Simulated)",
                            operatingMode = OperatingMode.AUTOMATIC,
                            safetyResult = autoRec.safetyReason,
                            accepted = true
                        )
                    )
                }
            }

            val updatedAnomalies = buildList {
                if (cycle.detectedAnomaly != null) {
                    val alreadyRecent = latestState.anomalies.any {
                        !it.resolved && !it.isSimulatedExample && it.title == cycle.detectedAnomaly.title &&
                            (next.timestampMs - it.detectedAtMs) < 15_000L
                    }
                    if (!alreadyRecent) add(cycle.detectedAnomaly)
                }
                addAll(latestState.anomalies)
            }.take(25)

            val updatedFeed = (cycle.newMessages + latestState.collaborationFeed).take(30)
            val updatedRecs = synchronized(appliedRecommendationIds) {
                cycle.recommendations.map {
                    if (appliedRecommendationIds.contains(it.id)) it.copy(applied = true) else it
                }
            }

            val liveBundle = PredictionEngine.buildLiveChartBundle(
                history = updatedHistory,
                current = next,
                anomalies = updatedAnomalies,
                targetReductionPct = latestState.savingsScenario.proposedReductionPct,
                timeRange = latestState.selectedTimeRange,
                isolationScore = cycle.isolationResult.score
            )

            latestState.copy(
                currentReading = next,
                sensorHistory = updatedHistory,
                agents = cycle.agents,
                collaborationFeed = updatedFeed,
                anomalies = updatedAnomalies,
                isolationScore = cycle.isolationResult.score,
                isolationSeverity = cycle.isolationResult.severity,
                recommendations = updatedRecs,
                plcInterlocks = cycle.plcInterlocks,
                hourlyForecast = hourly,
                weeklyForecast = weekly,
                liveChartBundle = liveBundle,
                streamErrorMessage = null,
                streamConnectionState = streamManager.resolveConnectionState(latestState.isSimulationRunning, false),
                isChartsWarmingUp = false,
                controlLogs = if (autoLogs.isEmpty()) latestState.controlLogs else (autoLogs + latestState.controlLogs).take(30)
            ).withDerivedMetrics()
        }
    }

    fun selectTimeRange(range: ChartTimeRange) {
        _uiState.update { it.copy(selectedTimeRange = range) }
        viewModelScope.launch(Dispatchers.Default + safeExceptionHandler) {
            val s = _uiState.value
            val bundle = PredictionEngine.buildLiveChartBundle(
                history = s.sensorHistory,
                current = s.currentReading,
                anomalies = s.anomalies,
                targetReductionPct = s.savingsScenario.proposedReductionPct,
                timeRange = range,
                isolationScore = s.isolationScore
            )
            _uiState.update { it.copy(selectedTimeRange = range, liveChartBundle = bundle) }
        }
    }

    fun retryTelemetryStream() {
        _uiState.update { s ->
            s.copy(
                isSimulationRunning = true,
                streamErrorMessage = null,
                streamConnectionState = streamManager.resolveConnectionState(true, false)
            )
        }
        viewModelScope.launch(Dispatchers.Default + safeExceptionHandler) {
            val s = _uiState.value
            val activeOverride = if (s.isManualOverrideActive) s.manualOverride else null
            streamManager.pollNextReading(s.currentReading, activeOverride, s.adapterSettings)
                .onSuccess { next -> processNewReadingAsync(next) }
        }
    }

    fun toggleSimulationRunning() {
        _uiState.update { state ->
            val nextRunning = !state.isSimulationRunning
            state.copy(
                isSimulationRunning = nextRunning,
                streamConnectionState = streamManager.resolveConnectionState(nextRunning, state.streamErrorMessage != null)
            )
        }
    }

    fun setManualOverrideEnabled(enabled: Boolean) {
        _uiState.update { state ->
            val override = if (enabled) {
                ManualSensorOverride(
                    flowRateLpm = state.currentReading.flowRateLpm,
                    pressureBar = state.currentReading.pressureBar,
                    temperatureC = state.currentReading.temperatureC,
                    workloadPct = state.currentReading.workloadPct,
                    ambientTempC = state.currentReading.ambientTempC
                )
            } else {
                ManualSensorOverride()
            }
            state.copy(isManualOverrideActive = enabled, manualOverride = override)
        }
    }

    fun updateManualSensor(
        flowRateLpm: Double? = null,
        pressureBar: Double? = null,
        temperatureC: Double? = null,
        workloadPct: Double? = null,
        ambientTempC: Double? = null
    ) {
        _uiState.update { state ->
            val updated = state.manualOverride.copy(
                flowRateLpm = flowRateLpm ?: state.manualOverride.flowRateLpm,
                pressureBar = pressureBar ?: state.manualOverride.pressureBar,
                temperatureC = temperatureC ?: state.manualOverride.temperatureC,
                workloadPct = workloadPct ?: state.manualOverride.workloadPct,
                ambientTempC = ambientTempC ?: state.manualOverride.ambientTempC
            )
            // Immediately reflect slider values on UI while conflating heavy Isolation Forest cycle
            val instantReading = state.currentReading.copy(
                flowRateLpm = updated.flowRateLpm ?: state.currentReading.flowRateLpm,
                pressureBar = updated.pressureBar ?: state.currentReading.pressureBar,
                temperatureC = updated.temperatureC ?: state.currentReading.temperatureC,
                workloadPct = updated.workloadPct ?: state.currentReading.workloadPct,
                ambientTempC = updated.ambientTempC ?: state.currentReading.ambientTempC
            )
            state.copy(
                isManualOverrideActive = true,
                manualOverride = updated,
                currentReading = instantReading
            )
        }
        manualTriggerFlow.tryEmit(Unit)
    }

    fun injectSimulatedAnomaly(type: String) {
        val now = System.currentTimeMillis()
        val cur = _uiState.value.currentReading
        val anomalousReading = when (type) {
            "PRESSURE_DROP" -> cur.copy(
                pressureBar = 1.35,
                flowRateLpm = cur.flowRateLpm + 26.0,
                timestampMs = now
            )
            "THERMAL_SURGE" -> cur.copy(
                temperatureC = 37.8,
                workloadPct = 94.0,
                flowRateLpm = 114.0,
                timestampMs = now
            )
            else -> cur.copy(flowRateLpm = 122.0, pressureBar = 4.95, timestampMs = now)
        }
        val injectedRecord = AnomalyRecord(
            id = "sim_injected_$now",
            title = when (type) {
                "PRESSURE_DROP" -> "Simulated Scenario: Header Pressure Drop & Flow Surge"
                "THERMAL_SURGE" -> "Simulated Scenario: Rack Thermal Excursion"
                else -> "Simulated Scenario: High Draw Spike"
            },
            severity = AnomalySeverity.CRITICAL,
            affectedSensor = if (type == "PRESSURE_DROP") "Loop Pressure (bar)" else "Coolant Temp (°C)",
            detectedAtMs = now,
            anomalyScore = 0.84,
            isSimulatedExample = true,
            explanation = "User-triggered simulated fault injected to test Isolation Forest & Safety Agent response.",
            suggestedResponse = "Verify backup pump standby engagement and isolate secondary branch."
        )
        _uiState.update { state ->
            state.copy(
                anomalies = (listOf(injectedRecord) + state.anomalies).take(25),
                isManualOverrideActive = true,
                manualOverride = ManualSensorOverride(
                    flowRateLpm = anomalousReading.flowRateLpm,
                    pressureBar = anomalousReading.pressureBar,
                    temperatureC = anomalousReading.temperatureC,
                    workloadPct = anomalousReading.workloadPct,
                    ambientTempC = anomalousReading.ambientTempC
                )
            ).withDerivedMetrics()
        }
        viewModelScope.launch(Dispatchers.Default + safeExceptionHandler) {
            processNewReadingAsync(anomalousReading)
        }
    }

    fun resolveAnomaly(id: String) {
        _uiState.update { state ->
            state.copy(
                anomalies = state.anomalies.map {
                    if (it.id == id) it.copy(resolved = true) else it
                }
            ).withDerivedMetrics()
        }
    }

    fun resetNominalTelemetry() {
        _uiState.update {
            it.copy(
                isManualOverrideActive = false,
                manualOverride = ManualSensorOverride()
            )
        }
        val nominal = SensorReading(
            flowRateLpm = 69.4,
            pressureBar = 3.20,
            temperatureC = 23.5,
            workloadPct = 68.0,
            ambientTempC = 26.5,
            humidityPct = 54.0,
            weatherCondition = "Partly Cloudy",
            timestampMs = System.currentTimeMillis()
        )
        viewModelScope.launch(Dispatchers.Default + safeExceptionHandler) {
            processNewReadingAsync(nominal)
        }
    }

    fun approveRecommendation(rec: OptimizationRecommendation) {
        val state = _uiState.value
        val now = System.currentTimeMillis()
        if (state.operatingMode == OperatingMode.EMERGENCY) {
            _uiState.update {
                it.copy(
                    controlLogs = (listOf(
                        ControlActionLog(
                            id = "ctrl_block_$now",
                            timestampMs = now,
                            actionTitle = "Blocked: ${rec.title}",
                            operatingMode = OperatingMode.EMERGENCY,
                            safetyResult = "Emergency Mode active — automatic & optimization actuation locked",
                            accepted = false
                        )
                    ) + it.controlLogs).take(30),
                    statusBannerMessage = "Blocked: Emergency Mode is active."
                )
            }
            return
        }
        if (rec.safetyStatus == SafetyValidationStatus.BLOCKED_BY_SAFETY) {
            _uiState.update {
                it.copy(
                    controlLogs = (listOf(
                        ControlActionLog(
                            id = "ctrl_safe_block_$now",
                            timestampMs = now,
                            actionTitle = "Rejected by Safety Agent: ${rec.title}",
                            operatingMode = state.operatingMode,
                            safetyResult = rec.safetyReason,
                            accepted = false
                        )
                    ) + it.controlLogs).take(30),
                    statusBannerMessage = rec.safetyReason
                )
            }
            return
        }

        appliedRecommendationIds.add(rec.id)
        val newFlow = (state.currentReading.flowRateLpm * (1.0 + rec.proposedFlowDeltaPct / 100.0))
            .coerceAtLeast(state.safetyLimits.minFlowLpm)
        val updatedReading = state.currentReading.copy(
            flowRateLpm = newFlow,
            temperatureC = rec.proposedTargetTempC,
            timestampMs = now
        )
        _uiState.update { s ->
            s.copy(
                controlLogs = (listOf(
                    ControlActionLog(
                        id = "ctrl_ok_$now",
                        timestampMs = now,
                        actionTitle = "Simulated Action Applied: ${rec.title}",
                        operatingMode = s.operatingMode,
                        safetyResult = rec.safetyReason,
                        accepted = true
                    )
                ) + s.controlLogs).take(30),
                statusBannerMessage = "Simulated control action applied (${rec.title})."
            )
        }
        viewModelScope.launch(Dispatchers.Default + safeExceptionHandler) {
            processNewReadingAsync(updatedReading)
        }
    }

    fun setOperatingMode(mode: OperatingMode) {
        val now = System.currentTimeMillis()
        viewModelScope.launch(Dispatchers.IO + safeExceptionHandler) { prefsRepo.saveOperatingMode(mode) }
        _uiState.update { state ->
            state.copy(
                operatingMode = mode,
                controlLogs = (listOf(
                    ControlActionLog(
                        id = "mode_$now",
                        timestampMs = now,
                        actionTitle = "Mode switched to ${mode.label}",
                        operatingMode = mode,
                        safetyResult = mode.summary,
                        accepted = true
                    )
                ) + state.controlLogs).take(30)
            ).withDerivedMetrics()
        }
    }

    fun updateSafetyLimits(limits: SafetyLimits) {
        _uiState.update { it.copy(safetyLimits = limits) }
        safetyLimitsTriggerFlow.tryEmit(limits)
    }

    fun triggerManualOverridePumpTest() {
        val now = System.currentTimeMillis()
        val state = _uiState.value
        _uiState.update {
            it.copy(
                controlLogs = (listOf(
                    ControlActionLog(
                        id = "override_$now",
                        timestampMs = now,
                        actionTitle = "Manual Override: Standby Pump Redundancy Check (Simulated)",
                        operatingMode = state.operatingMode,
                        safetyResult = "Backup pump verified at 100% readiness; PLC interlock nominal",
                        accepted = true
                    )
                ) + it.controlLogs).take(30),
                statusBannerMessage = "Simulated PLC redundancy & override check completed."
            )
        }
    }

    fun updateWhatIf(
        coolingMode: CoolingMode? = null,
        flowSettingPct: Double? = null,
        workloadPct: Double? = null,
        ambientTempC: Double? = null
    ) {
        _uiState.update { state ->
            val nextParams = state.whatIfParams.copy(
                coolingMode = coolingMode ?: state.whatIfParams.coolingMode,
                flowSettingPct = flowSettingPct ?: state.whatIfParams.flowSettingPct,
                workloadPct = workloadPct ?: state.whatIfParams.workloadPct,
                ambientTempC = ambientTempC ?: state.whatIfParams.ambientTempC
            )
            state.copy(
                whatIfParams = nextParams,
                whatIfResult = PredictionEngine.evaluateWhatIf(nextParams)
            )
        }
    }

    fun updateSavingsScenario(baselineDailyL: Double? = null, reductionPct: Double? = null) {
        val cur = _uiState.value.savingsScenario
        val next = WaterSavingsScenario(
            baselineDailyL = (baselineDailyL ?: cur.baselineDailyL).coerceIn(5_000.0, 2_000_000.0),
            proposedReductionPct = (reductionPct ?: cur.proposedReductionPct).coerceIn(1.0, 60.0)
        )
        _uiState.update { it.copy(savingsScenario = next) }
        savingsTriggerFlow.tryEmit(next)
    }

    fun updateAdapterSettings(settings: TelemetryAdapterSettings) {
        viewModelScope.launch(Dispatchers.IO + safeExceptionHandler) { prefsRepo.saveAdapterSettings(settings) }
        _uiState.update {
            it.copy(
                adapterSettings = settings,
                statusBannerMessage = "Telemetry adapter & polling configuration saved."
            )
        }
    }

    fun askAi(question: String) {
        val trimmed = question.trim()
        if (trimmed.isEmpty()) return
        val s = _uiState.value
        // Prevent duplicate in-flight Gemini calls for identical question
        val inFlight = s.aiResponseState is AiResponseState.Loading || s.aiResponseState is AiResponseState.Streaming
        if (inFlight && s.aiQuestion.equals(trimmed, ignoreCase = true)) {
            return
        }

        aiJob?.cancel()
        _uiState.update { it.copy(aiQuestion = trimmed) }
        aiJob = viewModelScope.launch(safeExceptionHandler) {
            aiRepo.streamTelemetryAnalysis(
                question = trimmed,
                reading = s.currentReading,
                anomalies = s.anomalies,
                recommendations = s.recommendations,
                safetyLimits = s.safetyLimits,
                operatingMode = s.operatingMode,
                savingsScenario = s.savingsScenario,
                isolationScore = s.isolationScore
            ).catch { err ->
                Log.e("AquaComputeVM", "AI stream crashed gracefully caught", err)
                val fallback = aiRepo.buildRuleBasedFallback(
                    question = trimmed,
                    reading = s.currentReading,
                    anomalies = s.anomalies,
                    recommendations = s.recommendations,
                    safetyLimits = s.safetyLimits,
                    operatingMode = s.operatingMode,
                    savingsScenario = s.savingsScenario,
                    isolationScore = s.isolationScore
                )
                emit(
                    AiResponseState.Error(
                        err.localizedMessage ?: "Gemini analysis failed unexpectedly.",
                        fallback
                    )
                )
            }.collect { resp ->
                _uiState.update { it.copy(aiResponseState = resp) }
            }
        }
    }

    fun reportStatusBanner(message: String) {
        _uiState.update { it.copy(statusBannerMessage = message) }
    }

    fun showFallbackAnalysis() {
        val s = _uiState.value
        val currentState = s.aiResponseState
        val fallback = if (currentState is AiResponseState.Error) {
            currentState.fallbackText
        } else {
            aiRepo.buildRuleBasedFallback(
                question = s.aiQuestion.ifBlank { "Why has water consumption increased?" },
                reading = s.currentReading,
                anomalies = s.anomalies,
                recommendations = s.recommendations,
                safetyLimits = s.safetyLimits,
                operatingMode = s.operatingMode,
                savingsScenario = s.savingsScenario,
                isolationScore = s.isolationScore
            )
        }
        _uiState.update {
            it.copy(aiResponseState = AiResponseState.Success(fallback, isFallback = true))
        }
    }

    fun clearBanner() {
        _uiState.update { it.copy(statusBannerMessage = null) }
    }

    fun buildExportReportText(): String {
        val s = _uiState.value
        val sc = s.savingsScenario
        val r = s.currentReading
        return buildString {
            appendLine("# AquaCompute AI — Water Stewardship Report (Simulated)")
            appendLine("Generated: ${java.text.SimpleDateFormat("yyyy-MM-dd HH:mm:ss", java.util.Locale.US).format(java.util.Date())}")
            appendLine("Operating Mode: ${s.operatingMode.label} | System Status: ${s.systemHealthLabel}")
            appendLine()
            appendLine("## Current Telemetry Snapshot (Synthetic)")
            appendLine("- Water Flow: ${"%.1f".format(r.flowRateLpm)} L/min (${"%.0f".format(r.hourlyConsumptionLph)} L/hr)")
            appendLine("- Loop Pressure: ${"%.2f".format(r.pressureBar)} bar")
            appendLine("- Coolant Temperature: ${"%.1f".format(r.temperatureC)} °C")
            appendLine("- IT Workload: ${"%.1f".format(r.workloadPct)}%")
            appendLine("- Ambient Weather: ${"%.1f".format(r.ambientTempC)} °C, ${"%.0f".format(r.humidityPct)}% RH (${r.weatherCondition})")
            appendLine("- Estimated WUE: ${"%.2f".format(r.estimatedWue)} L/kWh")
            appendLine()
            appendLine("## Illustrative Water Savings Scenario")
            appendLine("- Baseline Daily Usage: ${"%,.0f".format(sc.baselineDailyL)} L")
            appendLine("- Illustrative Reduction Target: ${"%.1f".format(sc.proposedReductionPct)}%")
            appendLine("- Optimized Daily Usage: ${"%,.0f".format(sc.optimizedDailyL)} L")
            appendLine("- Estimated Daily Savings: ${"%,.0f".format(sc.dailySavingsL)} L")
            appendLine("- Estimated Monthly Savings (30d): ${"%,.0f".format(sc.monthlySavingsL)} L")
            appendLine("- Estimated Yearly Savings (365d): ${"%,.0f".format(sc.yearlySavingsL)} L")
            appendLine("Note: Savings figures are illustrative simulation estimates, not validated real-world performance.")
            appendLine()
            appendLine("## Active & Recent Anomalies")
            s.anomalies.take(5).forEach {
                appendLine("- [${it.severity.label}] ${it.title} (${it.affectedSensor}, score ${"%.2f".format(it.anomalyScore)}, simulatedExample=${it.isSimulatedExample})")
            }
            appendLine()
            appendLine("## Optimization Recommendations")
            s.recommendations.forEach {
                appendLine("- ${it.title}: ~${"%,.0f".format(it.expectedDailySavingsL)} L/day [${it.safetyStatus.label}]")
            }
        }
    }

    override fun onCleared() {
        simJob?.cancel()
        aiJob?.cancel()
        streamManager.release()
        super.onCleared()
    }
}
