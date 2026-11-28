package com.example.data

import android.content.Context
import android.util.Log
import androidx.datastore.core.DataStore
import androidx.datastore.core.handlers.ReplaceFileCorruptionHandler
import androidx.datastore.preferences.core.Preferences
import androidx.datastore.preferences.core.doublePreferencesKey
import androidx.datastore.preferences.core.edit
import androidx.datastore.preferences.core.emptyPreferences
import androidx.datastore.preferences.core.intPreferencesKey
import androidx.datastore.preferences.core.stringPreferencesKey
import androidx.datastore.preferences.preferencesDataStore
import com.example.model.OperatingMode
import com.example.model.SafetyLimits
import com.example.model.TelemetryAdapterSettings
import com.example.model.WaterSavingsScenario
import kotlinx.coroutines.flow.Flow
import kotlinx.coroutines.flow.catch
import kotlinx.coroutines.flow.map
import java.io.IOException

private const val TAG = "SettingsPrefsRepo"

private val Context.aquaDataStore: DataStore<Preferences> by preferencesDataStore(
    name = "aquacompute_prefs",
    corruptionHandler = ReplaceFileCorruptionHandler { ex ->
        Log.e(TAG, "Corrupted preferences file detected; resetting to defaults", ex)
        emptyPreferences()
    }
)

data class PersistedSettings(
    val operatingMode: OperatingMode = OperatingMode.MANUAL,
    val safetyLimits: SafetyLimits = SafetyLimits(),
    val savingsScenario: WaterSavingsScenario = WaterSavingsScenario(),
    val adapterSettings: TelemetryAdapterSettings = TelemetryAdapterSettings()
)

class SettingsPreferencesRepository(private val context: Context) {

    private object Keys {
        val OPERATING_MODE = stringPreferencesKey("operating_mode")
        val MIN_FLOW = doublePreferencesKey("min_flow_lpm")
        val MAX_FLOW = doublePreferencesKey("max_flow_lpm")
        val MIN_PRESSURE = doublePreferencesKey("min_pressure_bar")
        val MAX_PRESSURE = doublePreferencesKey("max_pressure_bar")
        val MAX_TEMP = doublePreferencesKey("max_temp_c")
        val BASELINE_DAILY_L = doublePreferencesKey("baseline_daily_l")
        val REDUCTION_PCT = doublePreferencesKey("reduction_pct")
        val MQTT_URL = stringPreferencesKey("mqtt_url")
        val OPC_UA_URL = stringPreferencesKey("opc_ua_url")
        val SAMPLE_INTERVAL_S = intPreferencesKey("sample_interval_s")
    }

    val settingsFlow: Flow<PersistedSettings> = context.aquaDataStore.data
        .catch { exception ->
            if (exception is IOException) {
                Log.e(TAG, "Error reading DataStore preferences; falling back to defaults", exception)
                emit(emptyPreferences())
            } else {
                Log.e(TAG, "Unexpected preferences read failure; falling back to defaults", exception)
                emit(emptyPreferences())
            }
        }
        .map { prefs ->
            val mode = prefs[Keys.OPERATING_MODE]?.let {
                runCatching { OperatingMode.valueOf(it) }.getOrNull()
            } ?: OperatingMode.MANUAL

            PersistedSettings(
                operatingMode = mode,
                safetyLimits = SafetyLimits(
                    minFlowLpm = prefs[Keys.MIN_FLOW] ?: 38.0,
                    maxFlowLpm = prefs[Keys.MAX_FLOW] ?: 125.0,
                    minPressureBar = prefs[Keys.MIN_PRESSURE] ?: 1.8,
                    maxPressureBar = prefs[Keys.MAX_PRESSURE] ?: 5.2,
                    maxTempC = prefs[Keys.MAX_TEMP] ?: 36.0
                ),
                savingsScenario = WaterSavingsScenario(
                    baselineDailyL = prefs[Keys.BASELINE_DAILY_L] ?: 100_000.0,
                    proposedReductionPct = prefs[Keys.REDUCTION_PCT] ?: 20.0
                ),
                adapterSettings = TelemetryAdapterSettings(
                    mqttBrokerUrl = prefs[Keys.MQTT_URL] ?: "mqtts://broker.aquacompute.local:8883",
                    opcUaEndpoint = prefs[Keys.OPC_UA_URL] ?: "opc.tcp://plc-gateway.local:4840",
                    sampleIntervalSeconds = (prefs[Keys.SAMPLE_INTERVAL_S] ?: 2).coerceIn(1, 10)
                )
            )
        }

    suspend fun saveOperatingMode(mode: OperatingMode) {
        safeEdit { it[Keys.OPERATING_MODE] = mode.name }
    }

    suspend fun saveSafetyLimits(limits: SafetyLimits) {
        safeEdit {
            it[Keys.MIN_FLOW] = limits.minFlowLpm
            it[Keys.MAX_FLOW] = limits.maxFlowLpm
            it[Keys.MIN_PRESSURE] = limits.minPressureBar
            it[Keys.MAX_PRESSURE] = limits.maxPressureBar
            it[Keys.MAX_TEMP] = limits.maxTempC
        }
    }

    suspend fun saveSavingsScenario(scenario: WaterSavingsScenario) {
        safeEdit {
            it[Keys.BASELINE_DAILY_L] = scenario.baselineDailyL
            it[Keys.REDUCTION_PCT] = scenario.proposedReductionPct
        }
    }

    suspend fun saveAdapterSettings(settings: TelemetryAdapterSettings) {
        safeEdit {
            it[Keys.MQTT_URL] = settings.mqttBrokerUrl
            it[Keys.OPC_UA_URL] = settings.opcUaEndpoint
            it[Keys.SAMPLE_INTERVAL_S] = settings.sampleIntervalSeconds
        }
    }

    private suspend fun safeEdit(block: (androidx.datastore.preferences.core.MutablePreferences) -> Unit) {
        try {
            context.aquaDataStore.edit(block)
        } catch (e: Exception) {
            Log.e(TAG, "Failed to persist preferences", e)
        }
    }
}
