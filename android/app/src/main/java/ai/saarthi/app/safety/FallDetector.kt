package ai.saarthi.app.safety

import kotlin.math.sqrt

/**
 * A real fall of the phone (Phase 4.5 item 5, D47): a stretch of **free fall** long enough for about
 * half a metre of drop, then a **hard impact** right after. While falling, the accelerometer reads
 * almost nothing (everything falls together); a drop of h metres lasts sqrt(2h/g): 0.32 s for 50 cm,
 * 0.40 s for 80 cm, but only 0.14 s for a 10 cm knock, which is ignored. Free fall first keeps
 * false alarms low (published fall detectors: free fall, impact, then stillness).
 *
 * The gyroscope is not used: it measures turning, and a phone can drop flat without turning.
 * Pure logic, no Android: fed accelerometer samples (m/s², any axes), tested off-device.
 */
class FallDetector(
    /** Below this share of gravity, the phone is falling. */
    private val freeFallG: Float = 0.35f,
    /** At least this long in free fall: about 45 cm of drop (the team: "50-70 cm or more", not a knock). */
    private val minFreeFallMs: Long = 300L,
    /** A sample or two above the free-fall line (sensor noise, a brush) does not end the fall. */
    private val gapMs: Long = 40L,
    /** The impact: above this many g … */
    private val impactG: Float = 2.5f,
    /** … within this long after the free fall ends. */
    private val impactWithinMs: Long = 600L,
) {
    /** A detected fall: when it hit, how long it fell and how hard it hit (for the log only; never spoken). */
    data class Fall(val atMs: Long, val freeFallMs: Long, val impactG: Float)

    private var fallStartMs = -1L
    private var lastLowMs = -1L
    private var fallEndMs = -1L
    private var fallMs = 0L
    private var peakG = 0f

    fun reset() {
        fallStartMs = -1L; lastLowMs = -1L; fallEndMs = -1L; fallMs = 0L; peakG = 0f
    }

    /** One accelerometer sample at [tMs]. Returns a [Fall] once, at the impact. */
    fun onSample(ax: Float, ay: Float, az: Float, tMs: Long): Fall? {
        val g = sqrt(ax * ax + ay * ay + az * az) / G
        if (g < freeFallG) {
            // Continuing the current fall (across a short gap), or starting a new one (also after a bounce).
            val continuing = fallStartMs >= 0 && fallEndMs < 0 && tMs - lastLowMs <= gapMs
            if (!continuing) { fallStartMs = tMs; fallEndMs = -1L; peakG = 0f }
            lastLowMs = tMs
            return null
        }
        if (fallStartMs < 0) return null
        if (fallEndMs < 0) {
            // Still inside a short gap: the fall may go on.
            if (tMs - lastLowMs <= gapMs && g < impactG) return null
            fallMs = lastLowMs - fallStartMs
            if (fallMs < minFreeFallMs) { reset(); return null }
            fallEndMs = lastLowMs
        }
        if (g > peakG) peakG = g
        if (peakG >= impactG) {
            val f = Fall(tMs, fallMs, peakG)
            reset()
            return f
        }
        if (tMs - fallEndMs > impactWithinMs) reset()
        return null
    }

    private companion object {
        const val G = 9.81f
    }
}
