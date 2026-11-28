package ai.saarthi.app.bench

import ai.saarthi.app.perf.LatencySummary
import android.content.Context
import android.content.Intent
import android.content.IntentFilter
import android.os.BatteryManager
import android.os.Build
import android.os.PowerManager
import org.json.JSONObject
import java.io.File
import java.text.SimpleDateFormat
import java.util.Date
import java.util.Locale

/**
 * Builds and saves one benchmark run as JSON in the app's external files dir, which `adb pull`
 * can read without root: /sdcard/Android/data/ai.saarthi.app.dev/files/bench/.
 * Results go to files, not logcat, because this vivo build only logs Error-level messages.
 */
class BenchReport(private val context: Context, private val runName: String) {

    val json = JSONObject()
    private val stamp = SimpleDateFormat("yyyyMMdd_HHmmss", Locale.US).format(Date())

    init {
        json.put("run", runName)
        json.put("startedAt", iso())
        json.put("device", JSONObject().apply {
            put("manufacturer", Build.MANUFACTURER)
            put("model", Build.MODEL)
            put("socModel", if (Build.VERSION.SDK_INT >= 31) Build.SOC_MODEL else "unknown")
            put("sdk", Build.VERSION.SDK_INT)
        })
        json.put("thermalAtStart", thermal())
    }

    fun put(section: String, value: JSONObject) {
        json.put(section, value)
    }

    fun save(): File {
        json.put("finishedAt", iso())
        json.put("thermalAtEnd", thermal())
        val dir = File(context.getExternalFilesDir(null), "bench").apply { mkdirs() }
        val file = File(dir, "${runName}_$stamp.json")
        file.writeText(json.toString(2))
        return file
    }

    /** Thermal status (0 = none … 6 = shutdown) and battery temperature, for throttling context. */
    fun thermal(): JSONObject {
        val pm = context.getSystemService(PowerManager::class.java)
        val battery = context.registerReceiver(null, IntentFilter(Intent.ACTION_BATTERY_CHANGED))
        val tenthsC = battery?.getIntExtra(BatteryManager.EXTRA_TEMPERATURE, Int.MIN_VALUE)
        return JSONObject().apply {
            put("thermalStatus", pm.currentThermalStatus)
            put("batteryTempC", if (tenthsC == null || tenthsC == Int.MIN_VALUE) JSONObject.NULL else tenthsC / 10.0)
            put("batteryPercent", battery?.getIntExtra(BatteryManager.EXTRA_LEVEL, -1) ?: -1)
        }
    }

    private fun iso(): String =
        SimpleDateFormat("yyyy-MM-dd'T'HH:mm:ss.SSSZ", Locale.US).format(Date())

    companion object {
        fun toJson(s: LatencySummary?): Any = s?.let {
            JSONObject().apply {
                put("count", it.count)
                put("meanMs", round(it.meanMs))
                put("p50Ms", round(it.p50Ms))
                put("p90Ms", round(it.p90Ms))
                put("maxMs", round(it.maxMs))
            }
        } ?: JSONObject.NULL

        fun round(x: Double): Double = Math.round(x * 100.0) / 100.0
    }
}
