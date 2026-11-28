package ai.saarthi.app.record

import android.content.Context
import android.os.Build
import android.os.SystemClock
import android.util.Log
import org.json.JSONObject
import java.io.BufferedWriter
import java.io.File
import java.text.SimpleDateFormat
import java.util.Date
import java.util.Locale
import java.util.concurrent.Executors

/**
 * Writes one session as JSON lines (one event per line) to the app's external files dir, which
 * `adb pull` can read: /sdcard/Android/data/<app id>/files/sessions/session_<stamp>.jsonl.
 * This vivo build only logs Error-level messages (D6), so results live in files, not logcat.
 *
 * Every line has `t` (ms since boot, the same clock as frame timestamps) and `type`. Writing happens
 * on its own thread, so recording never slows perception. No camera frames are written here
 * (PRD rule 7.6).
 */
class SessionRecorder(context: Context, flavour: String) {

    private val executor = Executors.newSingleThreadExecutor { r -> Thread(r, "saarthi-recorder") }
    val file: File
    private val writer: BufferedWriter

    init {
        val stamp = SimpleDateFormat("yyyyMMdd_HHmmss", Locale.US).format(Date())
        val dir = File(context.getExternalFilesDir(null), "sessions").apply { mkdirs() }
        file = File(dir, "session_$stamp.jsonl")
        writer = file.bufferedWriter()
        record("session", JSONObject().apply {
            put("startedAt", SimpleDateFormat("yyyy-MM-dd'T'HH:mm:ss.SSSZ", Locale.US).format(Date()))
            put("flavour", flavour)
            put("model", Build.MODEL)
            put("sdk", Build.VERSION.SDK_INT)
        })
    }

    /** Queues one event. [fields] must not be modified by the caller afterwards. */
    fun record(type: String, fields: JSONObject = JSONObject()) {
        val t = SystemClock.elapsedRealtime()
        executor.execute {
            try {
                fields.put("t", t).put("type", type)
                writer.write(fields.toString())
                writer.newLine()
                writer.flush()
            } catch (e: Exception) {
                Log.e(TAG, "could not write $type event", e)
            }
        }
    }

    /** Writes one already-built JSON line as it is (feed messages, which carry their own `t` and `type`). */
    fun writeLine(line: String) {
        executor.execute {
            try {
                writer.write(line)
                writer.newLine()
                writer.flush()
            } catch (e: Exception) {
                Log.e(TAG, "could not write a line", e)
            }
        }
    }

    fun close() {
        executor.execute { runCatching { writer.close() } }
        executor.shutdown()
    }

    private companion object {
        const val TAG = "Saarthi/record"
    }
}
