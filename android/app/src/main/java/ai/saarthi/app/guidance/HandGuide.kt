package ai.saarthi.app.guidance

// The steady-beat voting is adapted from SightBuddy core/CueBeat.kt (MIT, Copyright (c) 2026
// Drophouse Ltd, commit 578771d): one cue per beat, the most frequent since the last beat, so a
// one-frame flicker is outvoted and the voice keeps a regular rhythm. Changed: cues steer a tracked
// fingertip to a target box (SightBuddy steered the camera at an object); a wrong-way reach is
// corrected at once, outside the beat; arrival is the fingertip on the target's last known box.

import ai.saarthi.app.geometry.Box
import kotlin.math.abs
import kotlin.math.hypot

/**
 * Hand-to-target guidance (PRD 5.3), in the camera image (0..1): with the phone looking down at the
 * table, image right is the user's right and image up is away from the user. Fed every hand-tracker
 * run (about 10 per second). Pure logic, no Android: tested off-device.
 */
class HandGuide(
    private val beatMs: Long = 900L,
    /** Within this of the target's centre on an axis, that axis needs no cue. */
    private val deadZone: Float = 0.05f,
    /** The fingertip within the target box grown by this is touching it. */
    private val arriveMargin: Float = 0.03f,
    /**
     * A wrong-way reach: the fingertip's distance to the target grew by this much (frame fractions)
     * within [WINDOW_MS], on two checks in a row (D31). The distance between fingertip and target, both
     * seen in the same image, is unaffected by camera shake; a single check on fingertip speed fired on
     * ordinary hand movement in the team's recorded hand data.
     */
    private val wrongWayGrowth: Float = 0.06f,
    /** At least this long between two corrections. */
    private val correctionGapMs: Long = 800L,
) {
    /** Recent (time, distance from the fingertip to the target). */
    private val recent = ArrayDeque<Pair<Long, Float>>()
    private var awayStreak = 0
    private val votes = ArrayDeque<Pair<Long, Cue>>()
    private var lastBeatMs: Long? = null
    private var lastCorrectionMs = Long.MIN_VALUE / 2
    private var arrived = false

    /**
     * Reach-bias compensation (frame fractions): cues aim this far past the target, so a user who
     * habitually stops short keeps hearing "forward" a little longer. Arrival ignores it.
     */
    var aimOffset: Pair<Float, Float> = 0f to 0f

    fun reset() {
        recent.clear(); votes.clear(); lastBeatMs = null; lastCorrectionMs = Long.MIN_VALUE / 2; arrived = false; awayStreak = 0
    }

    /**
     * One hand-tracker run: the index fingertip [tip] and the target's latest box [target]. Returns
     * the step to emit now, or null (between beats). After arrival, returns null until [reset].
     */
    fun onHand(tip: Pair<Float, Float>, target: Box, nowMs: Long): Step? {
        if (arrived) return null
        val tx = (target.left + target.right) / 2f
        val ty = (target.top + target.bottom) / 2f
        val ex = tx - tip.first
        val ey = ty - tip.second
        val dist = hypot(ex, ey)
        val intensity = (1f - dist / 0.7f).coerceIn(0f, 1f)
        recent.addLast(nowMs to dist)
        while (recent.size > 1 && nowMs - recent.first().first > WINDOW_MS) recent.removeFirst()

        if (tip.first in (target.left - arriveMargin)..(target.right + arriveMargin) &&
            tip.second in (target.top - arriveMargin)..(target.bottom + arriveMargin)
        ) {
            arrived = true
            return Step(Cue.ARRIVED, Mode.HAND, "You're touching it.", 1f, ex to ey)
        }

        // Wrong way: the distance to the target keeps growing. Corrected at once, outside the beat.
        val (t0, d0) = recent.first()
        val growing = nowMs - t0 >= MIN_WINDOW_MS && dist - d0 >= wrongWayGrowth && dist > deadZone
        awayStreak = if (growing) awayStreak + 1 else 0
        if (awayStreak >= 2 && nowMs - lastCorrectionMs >= correctionGapMs) {
            awayStreak = 0
            lastCorrectionMs = nowMs
            lastBeatMs = nowMs
            votes.clear()
            val cue = cueFor(ex, ey)
            return Step(cue, Mode.HAND, "Other way: ${word(cue, ex, ey)}.", intensity, ex to ey, correction = true)
        }

        val ax = ex + aimOffset.first
        val ay = ey + aimOffset.second
        votes.addLast(nowMs to cueFor(ax, ay))
        while (votes.isNotEmpty() && nowMs - votes.first().first > beatMs) votes.removeFirst()
        val last = lastBeatMs
        if (last != null && nowMs - last < beatMs) return null
        lastBeatMs = nowMs
        val counts = votes.groupingBy { it.second }.eachCount()
        val most = counts.values.max()
        val cue = votes.last { counts[it.second] == most }.second
        return Step(cue, Mode.HAND, word(cue, ax, ay).replaceFirstChar { it.uppercase() } + ".", intensity, ex to ey)
    }

    /** The axis that needs most correction: sideways first unless the target is mostly ahead or behind. */
    private fun cueFor(ex: Float, ey: Float): Cue = when {
        abs(ex) > deadZone && abs(ex) >= 0.6f * abs(ey) -> if (ex < 0) Cue.LEFT else Cue.RIGHT
        ey < -deadZone -> Cue.CLOSER
        ey > deadZone -> Cue.BACK
        abs(ex) > deadZone / 2 -> if (ex < 0) Cue.LEFT else Cue.RIGHT
        else -> Cue.CLOSER
    }

    private fun word(cue: Cue, ex: Float, ey: Float): String {
        val small = hypot(ex, ey) < SMALL
        return when (cue) {
            Cue.LEFT -> if (small) "a little left" else "left"
            Cue.RIGHT -> if (small) "a little right" else "right"
            Cue.CLOSER -> if (small) "a little forward" else "forward"
            Cue.BACK -> if (small) "a little back" else "back towards you"
            Cue.ARRIVED -> "you're touching it"
            Cue.LOOK_AGAIN -> "hold still"
        }
    }

    private companion object {
        const val WINDOW_MS = 350L
        const val MIN_WINDOW_MS = 250L
        /** Closer than this (frame fractions), cues become "a little …". */
        const val SMALL = 0.15f
    }
}
