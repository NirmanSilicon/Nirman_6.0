package ai.saarthi.app.bench

import android.content.Context
import android.media.AudioManager
import android.os.Build
import android.os.VibrationEffect
import android.os.Vibrator
import android.os.VibratorManager
import org.json.JSONObject

/**
 * Plays three short pulses and records what the vibrator reports about itself. Whether the pulses
 * were felt is confirmed by the person holding the phone; the API cannot tell us.
 */
class VibrationCheck(private val context: Context) {

    fun run(): JSONObject {
        val vibrator: Vibrator = if (Build.VERSION.SDK_INT >= 31) {
            context.getSystemService(VibratorManager::class.java).defaultVibrator
        } else {
            @Suppress("DEPRECATION")
            context.getSystemService(Vibrator::class.java)
        }
        val audio = context.getSystemService(AudioManager::class.java)
        val out = JSONObject()
        out.put("hasVibrator", vibrator.hasVibrator())
        out.put("hasAmplitudeControl", vibrator.hasAmplitudeControl())
        out.put("ringerMode", when (audio.ringerMode) {
            AudioManager.RINGER_MODE_SILENT -> "silent"
            AudioManager.RINGER_MODE_VIBRATE -> "vibrate"
            else -> "normal"
        })
        if (vibrator.hasVibrator()) {
            vibrator.vibrate(VibrationEffect.createWaveform(PATTERN_MS, -1))
            out.put("played", "3 pulses of 200 ms, 150 ms apart")
        }
        return out
    }

    private companion object {
        val PATTERN_MS = longArrayOf(0, 200, 150, 200, 150, 200)
    }
}
