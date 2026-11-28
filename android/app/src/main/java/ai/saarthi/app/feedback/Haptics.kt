package ai.saarthi.app.feedback

// Adapted from SecondSense output/HapticOutput.kt (owners' permission, commit cc122ea): the vibrator
// lookup (VibratorManager on Android 12+). Changed: the Vivo has no amplitude control (Phase 0), so
// meaning is carried by pulse count and length only; patterns are driven by guidance events, never
// by timers (PRD 4: one event stream).

import ai.saarthi.app.guidance.Cue
import android.content.Context
import android.os.Build
import android.os.VibrationEffect
import android.os.Vibrator
import android.os.VibratorManager

/** The phone's vibration for one guidance event. */
class Haptics(context: Context) {

    private val vibrator: Vibrator? =
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.S) {
            (context.getSystemService(Context.VIBRATOR_MANAGER_SERVICE) as? VibratorManager)?.defaultVibrator
        } else {
            @Suppress("DEPRECATION")
            context.getSystemService(Context.VIBRATOR_SERVICE) as? Vibrator
        }

    /** One short tap for a direction, a double tap on arrival, a long buzz to look again. */
    fun play(cue: Cue, correction: Boolean) {
        val v = vibrator ?: return
        if (!v.hasVibrator()) return
        val pattern = when {
            correction -> longArrayOf(0, 120, 60, 120)
            cue == Cue.ARRIVED -> longArrayOf(0, 60, 80, 60)
            cue == Cue.LOOK_AGAIN -> longArrayOf(0, 300)
            else -> longArrayOf(0, 35)
        }
        v.vibrate(VibrationEffect.createWaveform(pattern, -1))
    }

    /** A one-off pattern (off, on, off, on … ms), e.g. the online mode's on/off signal (D54). */
    fun pattern(ms: LongArray) {
        val v = vibrator ?: return
        if (v.hasVibrator()) v.vibrate(VibrationEffect.createWaveform(ms, -1))
    }

    fun cancel() = vibrator?.cancel()
}
