package ai.saarthi.app.reach

import kotlin.math.acos
import kotlin.math.hypot
import kotlin.math.sin

/**
 * Where is the hand heading? (Phase 4.5 item 2, PRD 5.0.1: stop the wrong reach before it lands.)
 * The hand's direction of travel over the last ~0.6 s, extended forward from the fingertip, meets the
 * spot it is heading to. Spots are real objects in view and **watched** spots: places where the user
 * may still believe an object is, but the world map says it is not (moved or gone). If a watched spot
 * is the hand's best match on two checks in a row, the reach is predicted to land on a false belief.
 *
 * All in the camera image (0..1), like [ai.saarthi.app.guidance.HandGuide]: the hand and the spots are
 * seen in the same frame, so camera shake moves both. The honest claim: "it predicts the target from
 * the direction of your hand", never "it reads your mind". Pure logic, no Android: tested off-device.
 */
class ReachPredictor(
    private val windowMs: Long = 600L,
    /** The samples must span at least this long. */
    private val minSpanMs: Long = 200L,
    /** The hand must travel at least this far (frame fractions) within the window: a reach, not a twitch. */
    private val minTravel: Float = 0.08f,
    /** A spot within this angle of the direction of travel is on the hand's course. */
    private val maxAngleDeg: Float = 25f,
    /** Closer than this, the hand is already there: too late to predict. */
    private val minDist: Float = 0.06f,
    /** Farther than this, the course is too uncertain to name a target. */
    private val maxDist: Float = 0.75f,
    /** Consecutive agreeing checks before a prediction (D31's lesson: one check fires on ordinary movement). */
    private val needChecks: Int = 2,
    /** The fingertip must have come at least this much nearer the spot within the window: closing in, not passing by. */
    private val minClosing: Float = 0.04f,
) {
    /** A place the hand may be heading to. [watched] = the user may wrongly believe an object is here. */
    data class Spot(val key: Int, val x: Float, val y: Float, val radius: Float, val watched: Boolean)

    /** The hand heads to [spot]: [distance] from the fingertip, [angleDeg] off its course, arriving in about [etaMs]. */
    data class Prediction(val spot: Spot, val distance: Float, val angleDeg: Float, val etaMs: Long, val speed: Float)

    private val recent = ArrayDeque<Triple<Long, Float, Float>>()
    private val tips = ArrayDeque<Triple<Long, Float, Float>>()
    private var streakKey: Int? = null
    private var streak = 0

    fun reset() {
        recent.clear(); tips.clear(); streakKey = null; streak = 0
    }

    /**
     * One hand-tracker run: [hand] = a steady point on the hand (the knuckles' centre), [tip] = the index
     * fingertip, [wrist] = the wrist. Returns a prediction when a watched spot is the target on
     * [needChecks] checks in a row.
     */
    fun onHand(hand: Pair<Float, Float>, tip: Pair<Float, Float>, wrist: Pair<Float, Float>, nowMs: Long, spots: List<Spot>): Prediction? {
        recent.addLast(Triple(nowMs, hand.first, hand.second))
        tips.addLast(Triple(nowMs, tip.first, tip.second))
        while (recent.size > 1 && nowMs - recent.first().first > windowMs) recent.removeFirst()
        while (tips.size > 1 && nowMs - tips.first().first > windowMs) tips.removeFirst()
        // The user's own hand points away from them: its wrist is nearer the image's bottom than its
        // fingertip. A hand reaching in from across the table (someone else's) points the other way
        // (team recordings: several pick-ups came from the top of the frame).
        val own = wrist.second > tip.second
        val best = if (own) course()?.let { (dx, dy, speed) -> target(tip, dx, dy, speed, spots) } else null
        if (best == null || !best.spot.watched) {
            streakKey = null; streak = 0
            return null
        }
        if (best.spot.key == streakKey) streak++ else { streakKey = best.spot.key; streak = 1 }
        if (streak < needChecks) return null
        streakKey = null; streak = 0
        return best
    }

    /** The unit direction of travel and the speed (frame/s), if the hand is reaching steadily; else null. */
    private fun course(): Triple<Float, Float, Float>? {
        if (recent.size < 3) return null
        val (t0, x0, y0) = recent.first()
        val (t1, x1, y1) = recent.last()
        val span = t1 - t0
        if (span < minSpanMs) return null
        val tx = x1 - x0
        val ty = y1 - y0
        val travel = hypot(tx, ty)
        if (travel < minTravel) return null
        // Both halves of the window must go the same way, and the hand must still be moving at the end.
        val mid = recent.minByOrNull { kotlin.math.abs(it.first - (t0 + span / 2)) }!!
        val ax = mid.second - x0; val ay = mid.third - y0
        val bx = x1 - mid.second; val by = y1 - mid.third
        val la = hypot(ax, ay); val lb = hypot(bx, by)
        if (lb < 0.3f * travel || la < 0.2f * travel) return null
        if ((ax * tx + ay * ty) / (la * travel) < COS_HALF || (bx * tx + by * ty) / (lb * travel) < COS_HALF) return null
        return Triple(tx / travel, ty / travel, travel / (span / 1000f))
    }

    /** The spot best on the course (smallest miss), among those ahead of the fingertip and not yet reached. */
    private fun target(tip: Pair<Float, Float>, dx: Float, dy: Float, speed: Float, spots: List<Spot>): Prediction? {
        var best: Prediction? = null
        var bestMiss = Float.MAX_VALUE
        val (_, ox, oy) = tips.first()
        for (s in spots) {
            val vx = s.x - tip.first
            val vy = s.y - tip.second
            val dist = hypot(vx, vy)
            if (dist < minDist || dist > maxDist) continue
            val cos = ((vx * dx + vy * dy) / dist).coerceIn(-1f, 1f)
            if (cos <= 0f) continue
            val angle = Math.toDegrees(acos(cos).toDouble()).toFloat()
            val miss = dist * sin(Math.toRadians(angle.toDouble())).toFloat()
            if (angle > maxAngleDeg && miss > s.radius) continue
            if (hypot(s.x - ox, s.y - oy) - dist < minClosing) continue
            // A nearer spot on nearly the same line wins: the hand reaches the first thing on its way.
            val m = miss + 0.1f * dist
            if (m < bestMiss) {
                bestMiss = m
                best = Prediction(s, dist, angle, (dist / speed * 1000f).toLong(), speed)
            }
        }
        return best
    }

    private companion object {
        /** cos 35°: each half of the window within 35° of the whole. */
        const val COS_HALF = 0.82f
    }
}
