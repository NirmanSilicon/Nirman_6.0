package ai.saarthi.app.health

// Adapted from SecondSense perf/ThermalGovernor.kt (owners' permission, commit cc122ea): Android's
// own thermal status (NONE … SHUTDOWN) mapped to tiers, escalation at once, de-escalation only after
// sustained calm, a spoken notice on the first escalation. Changed (D59): the vendor caps the CPU while
// Android says NOMINAL (D26, D32, baseline of 1 Nov), so the tier also comes from what the app can read
// itself every 5 s: the thermal headroom forecast, the battery temperature and the big cores' clock cap
// (median of the last 30 s: single dips to 840 MHz are ignored). Tier rules: `perf/WorkPolicy`.

import ai.saarthi.app.perf.WorkPolicy
import ai.saarthi.app.perf.WorkPolicy.HeatSignals
import ai.saarthi.app.perf.WorkPolicy.HeatTier
import android.content.Context
import android.content.Intent
import android.content.IntentFilter
import android.os.BatteryManager
import android.os.Handler
import android.os.Looper
import android.os.PowerManager
import android.os.SystemClock
import java.io.File

class ThermalWatch(private val context: Context, private val deescalateMs: Long = 20_000L) {

    /** Called on the main thread when the tier changes. */
    var onTier: (HeatTier, HeatSignals) -> Unit = { _, _ -> }

    @Volatile var tier = HeatTier.NOMINAL
        private set

    /** The newest readings (null fields: not readable on this phone). */
    @Volatile var signals = HeatSignals(0, null, null, null)
        private set

    private val power = context.getSystemService(PowerManager::class.java)
    private val main = Handler(Looper.getMainLooper())
    private var coolSinceMs = 0L
    private val caps = ArrayDeque<Int>()
    private var capReadable = true

    private val listener = PowerManager.OnThermalStatusChangedListener { evaluate() }

    private val poll = object : Runnable {
        override fun run() {
            evaluate()
            main.postDelayed(this, POLL_MS)
        }
    }

    fun start() {
        power.addThermalStatusListener(main.asExecutor(), listener)
        main.post(poll)
    }

    fun stop() {
        main.removeCallbacks(poll)
        power.removeThermalStatusListener(listener)
    }

    private fun evaluate() {
        val s = read()
        signals = s
        val next = WorkPolicy.tier(s)
        val now = SystemClock.elapsedRealtime()
        when {
            next.ordinal > tier.ordinal -> { tier = next; coolSinceMs = 0; onTier(next, s) }
            next.ordinal < tier.ordinal -> {
                // Cool down only after a sustained calm, so the policy does not oscillate.
                if (coolSinceMs == 0L) coolSinceMs = now
                if (now - coolSinceMs >= deescalateMs) { tier = next; coolSinceMs = 0; onTier(next, s) }
            }
            else -> coolSinceMs = 0
        }
    }

    private fun read(): HeatSignals {
        // Asked at most every 5 s: Android returns NaN when asked more than once a second.
        val headroom = runCatching { power.getThermalHeadroom(FORECAST_S) }.getOrNull()?.takeIf { !it.isNaN() }
        val battery = runCatching {
            context.registerReceiver(null, IntentFilter(Intent.ACTION_BATTERY_CHANGED))
                ?.getIntExtra(BatteryManager.EXTRA_TEMPERATURE, Int.MIN_VALUE)?.takeIf { it != Int.MIN_VALUE }?.div(10f)
        }.getOrNull()
        return HeatSignals(power.currentThermalStatus, headroom, battery, bigCap())
    }

    /** The big cores' cap in MHz, median of the last 30 s; null when the file cannot be read by an app. */
    private fun bigCap(): Int? {
        if (!capReadable) return null
        val khz = runCatching { File(BIG_CORE_MAX).readText().trim().toInt() }.getOrNull()
        if (khz == null) { capReadable = false; return null }
        caps.addLast(khz / 1000)
        while (caps.size > CAP_WINDOW) caps.removeFirst()
        return caps.sorted()[caps.size / 2]
    }

    private fun Handler.asExecutor() = java.util.concurrent.Executor { post(it) }

    private companion object {
        const val POLL_MS = 5_000L
        const val FORECAST_S = 10
        const val CAP_WINDOW = 6
        const val BIG_CORE_MAX = "/sys/devices/system/cpu/cpu7/cpufreq/scaling_max_freq"
    }
}
