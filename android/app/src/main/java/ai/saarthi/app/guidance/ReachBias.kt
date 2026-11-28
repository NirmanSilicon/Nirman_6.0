package ai.saarthi.app.guidance

import kotlin.math.abs
import kotlin.math.hypot

/**
 * Reach bias (PRD 5.3): does this user keep stopping short, or drifting to one side? In each guided
 * reach, the first time the hand moves and then pauses before touching, the error (target minus
 * fingertip, frame fractions; image up = away from the user) is one sample. After [minSamples]
 * reaches agreeing in sign on an axis with a mean beyond [minBias], the bias is confident: Saarthi
 * says so once, and [HandGuide] aims a little past the target on that axis so its cues compensate.
 * Arrival is always judged on the real target. Pure logic; per session, never stored.
 */
class ReachBias(
    private val keep: Int = 6,
    private val minSamples: Int = 3,
    private val minBias: Float = 0.05f,
    /** Agreement in sign needed on an axis (share of samples). */
    private val agree: Float = 0.75f,
) {
    /**
     * [x], [y]: the bias acted on (0 on an axis that is not consistent); [meanX], [meanY] the raw means of the
     * samples and [seX], [seY] their standard errors (the uncertainty band the Mind view's telemetry draws, D48).
     */
    data class Estimate(
        val x: Float, val y: Float, val n: Int, val confident: Boolean,
        val meanX: Float = 0f, val meanY: Float = 0f, val seX: Float = 0f, val seY: Float = 0f,
    )

    private val samples = ArrayDeque<Pair<Float, Float>>()
    private var said = false

    // Per reach: pause detection.
    private var lastTip: Pair<Long, Pair<Float, Float>>? = null
    private var moved = false
    private var stillSinceMs: Long? = null
    private var sampledThisReach = false

    fun newReach() {
        lastTip = null; moved = false; stillSinceMs = null; sampledThisReach = false
    }

    /** One hand run during hand guidance: [error] = target centre minus fingertip. */
    fun observe(tip: Pair<Float, Float>, error: Pair<Float, Float>, nowMs: Long) {
        val prev = lastTip
        lastTip = nowMs to tip
        if (prev == null || sampledThisReach) return
        val dt = (nowMs - prev.first) / 1000f
        if (dt <= 0f) return
        val speed = hypot(tip.first - prev.second.first, tip.second - prev.second.second) / dt
        when {
            speed > MOVING -> { moved = true; stillSinceMs = null }
            moved && speed < STILL -> {
                val since = stillSinceMs ?: nowMs.also { stillSinceMs = it }
                if (nowMs - since >= PAUSE_MS && hypot(error.first, error.second) > 0.02f) {
                    samples.addLast(error)
                    if (samples.size > keep) samples.removeFirst()
                    sampledThisReach = true
                }
            }
            else -> stillSinceMs = null
        }
    }

    fun estimate(): Estimate {
        val n = samples.size
        if (n == 0) return Estimate(0f, 0f, 0, false)
        val mx = samples.map { it.first }.average().toFloat()
        val my = samples.map { it.second }.average().toFloat()
        fun consistent(values: List<Float>, mean: Float) =
            abs(mean) > minBias && values.count { it * mean > 0 } >= agree * values.size
        val cx = consistent(samples.map { it.first }, mx)
        val cy = consistent(samples.map { it.second }, my)
        fun se(values: List<Float>, mean: Float) =
            if (values.size < 2) 0f else kotlin.math.sqrt(values.sumOf { ((it - mean) * (it - mean)).toDouble() } / (values.size - 1) / values.size).toFloat()
        return Estimate(if (cx) mx else 0f, if (cy) my else 0f, n, n >= minSamples && (cx || cy),
            mx, my, se(samples.map { it.first }, mx), se(samples.map { it.second }, my))
    }

    /** The one-time sentence when the bias first becomes confident, else null. */
    fun announcement(): String? {
        val e = estimate()
        if (said || !e.confident) return null
        said = true
        return when {
            abs(e.y) >= abs(e.x) && e.y < 0 -> "You tend to reach a bit short; I'll guide you further."
            abs(e.y) >= abs(e.x) -> "You tend to reach a bit far; I'll stop you sooner."
            e.x > 0 -> "You tend to reach a bit to the left; I'll guide you more to the right."
            else -> "You tend to reach a bit to the right; I'll guide you more to the left."
        }
    }

    private companion object {
        /** Frame fractions per second. */
        const val MOVING = 0.20f
        const val STILL = 0.06f
        const val PAUSE_MS = 250L
    }
}
