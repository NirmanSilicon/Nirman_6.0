package com.example.engine

import android.content.Context
import android.net.ConnectivityManager
import android.net.Network
import android.net.NetworkCapabilities
import android.net.NetworkRequest
import android.util.Log
import com.example.model.ManualSensorOverride
import com.example.model.SensorReading
import com.example.model.StreamConnectionState
import com.example.model.TelemetryAdapterSettings
import com.example.model.TelemetrySource
import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.flow.StateFlow
import kotlinx.coroutines.flow.asStateFlow

/**
 * Coordinates real-time telemetry ingestion, network connectivity monitoring,
 * timestamp deduplication, and resilient reconnect behavior.
 *
 * Currently backed by [TelemetrySource] in DEMO MODE; structured so future
 * WebSocket, Server-Sent Events (SSE), MQTT, or OPC UA adapters can plug in
 * without altering UI consumers.
 */
class TelemetryStreamManager(
    context: Context,
    private val telemetrySource: TelemetrySource
) {
    private val connectivityManager =
        runCatching { context.getSystemService(Context.CONNECTIVITY_SERVICE) as? ConnectivityManager }
            .getOrNull()

    private val _isNetworkOnline = MutableStateFlow(checkCurrentConnectivity())
    val isNetworkOnline: StateFlow<Boolean> = _isNetworkOnline.asStateFlow()

    @Volatile
    private var lastAcceptedTimestampMs: Long = 0L

    @Volatile
    private var consecutiveFailures: Int = 0

    private var networkCallback: ConnectivityManager.NetworkCallback? = null

    init {
        registerNetworkCallback()
    }

    private fun checkCurrentConnectivity(): Boolean {
        return runCatching {
            val cm = connectivityManager ?: return@runCatching true
            val active = cm.activeNetwork ?: return@runCatching false
            val caps = cm.getNetworkCapabilities(active) ?: return@runCatching false
            caps.hasCapability(NetworkCapabilities.NET_CAPABILITY_INTERNET)
        }.getOrDefault(true)
    }

    private fun registerNetworkCallback() {
        runCatching {
            val cm = connectivityManager ?: return
            val request = NetworkRequest.Builder()
                .addCapability(NetworkCapabilities.NET_CAPABILITY_INTERNET)
                .build()
            val callback = object : ConnectivityManager.NetworkCallback() {
                override fun onAvailable(network: Network) {
                    _isNetworkOnline.value = true
                }

                override fun onLost(network: Network) {
                    _isNetworkOnline.value = checkCurrentConnectivity()
                }
            }
            cm.registerNetworkCallback(request, callback)
            networkCallback = callback
        }.onFailure { err ->
            Log.w("TelemetryStream", "NetworkCallback unavailable in current runtime", err)
        }
    }

    fun pollNextReading(
        previous: SensorReading?,
        manualOverrides: ManualSensorOverride?,
        adapterSettings: TelemetryAdapterSettings
    ): Result<SensorReading> {
        return try {
            val raw = telemetrySource.nextReading(previous, manualOverrides)
            // Guarantee strictly monotonic timestamp to prevent duplicate chart points
            val now = System.currentTimeMillis()
            val monotonicTs = maxOf(raw.timestampMs, now, lastAcceptedTimestampMs + 1L)
            lastAcceptedTimestampMs = monotonicTs
            consecutiveFailures = 0
            Result.success(
                raw.copy(
                    timestampMs = monotonicTs,
                    source = telemetrySource.protocol
                )
            )
        } catch (t: Throwable) {
            consecutiveFailures++
            Log.e("TelemetryStream", "Telemetry poll failure #$consecutiveFailures", t)
            Result.failure(t)
        }
    }

    fun resolveConnectionState(
        isSimulationRunning: Boolean,
        hasStreamError: Boolean
    ): StreamConnectionState {
        return when {
            !isSimulationRunning -> StreamConnectionState.PAUSED
            hasStreamError -> StreamConnectionState.RECONNECTING
            !_isNetworkOnline.value -> StreamConnectionState.OFFLINE_DEMO
            else -> StreamConnectionState.DEMO_STREAMING
        }
    }

    fun nextBackoffDelayMs(baseIntervalMs: Long): Long {
        if (consecutiveFailures <= 0) return baseIntervalMs
        val multiplier = (1 shl consecutiveFailures.coerceAtMost(3))
        return (baseIntervalMs * multiplier).coerceAtMost(15_000L)
    }

    fun release() {
        runCatching {
            networkCallback?.let { connectivityManager?.unregisterNetworkCallback(it) }
            networkCallback = null
        }
    }
}
