package ai.saarthi.app.personal

import ai.saarthi.app.geometry.Box
import kotlin.math.hypot

/**
 * "What's this?" by touch, then by pointing (PRD 5.0.1 item 3, team input, D49), on the phone where
 * hand tracking runs. **Touch** first (most accurate): the index fingertip on an object's box. Else
 * **pointing**: a line from the index knuckle through the fingertip, continued across the frame; the
 * objects it crosses beyond the fingertip, nearest first. If it crosses two, both are said. In the
 * camera image (0..1), like the guides. Pure logic, tested off-device.
 */
object TouchAsk {

    data class Candidate(val id: Int, val box: Box)

    sealed interface Found {
        data class Touching(val id: Int) : Found
        /** Nearest first; at most two. */
        data class Pointing(val ids: List<Int>) : Found
        /** A hand is in view, but no object is under or along the finger. */
        data object Nothing : Found
    }

    /** The fingertip within the box grown by this is touching it (as arrival in guidance, D29). */
    private const val TOUCH_MARGIN = 0.03f
    /** The finger must be this long (knuckle to tip, frame fractions) for its direction to mean anything. */
    private const val MIN_FINGER = 0.04f

    fun find(landmarks: List<Pair<Float, Float>>, objects: List<Candidate>): Found {
        val (x, y) = landmarks[8]
        objects.filter { it.box.grown(TOUCH_MARGIN).contains(x, y) }
            .minByOrNull { hypot(it.box.cx - x, it.box.cy - y) }
            ?.let { return Found.Touching(it.id) }
        val (kx, ky) = landmarks[5]
        val dx = x - kx
        val dy = y - ky
        val len = hypot(dx, dy)
        if (len < MIN_FINGER) return Found.Nothing
        val ux = dx / len
        val uy = dy / len
        val hits = objects.mapNotNull { o -> enter(x, y, ux, uy, o.box)?.let { t -> o.id to t } }.sortedBy { it.second }
        return if (hits.isEmpty()) Found.Nothing else Found.Pointing(hits.take(2).map { it.first })
    }

    /** How far along the ray from ([x], [y]) in direction ([ux], [uy]) it first meets [b]; null if it misses (slab test). */
    private fun enter(x: Float, y: Float, ux: Float, uy: Float, b: Box): Float? {
        var t0 = 0f
        var t1 = Float.MAX_VALUE
        for ((p, u, lo, hi) in listOf(Quad(x, ux, b.left, b.right), Quad(y, uy, b.top, b.bottom))) {
            if (kotlin.math.abs(u) < 1e-6f) {
                if (p < lo || p > hi) return null
            } else {
                var a = (lo - p) / u
                var c = (hi - p) / u
                if (a > c) { val s = a; a = c; c = s }
                t0 = maxOf(t0, a)
                t1 = minOf(t1, c)
                if (t0 > t1) return null
            }
        }
        return t0
    }

    private data class Quad(val p: Float, val u: Float, val lo: Float, val hi: Float)

    private fun Box.grown(m: Float) = Box(left - m, top - m, right + m, bottom + m)
    private fun Box.contains(x: Float, y: Float) = x in left..right && y in top..bottom
    private val Box.cx get() = (left + right) / 2f
    private val Box.cy get() = (top + bottom) / 2f
}
