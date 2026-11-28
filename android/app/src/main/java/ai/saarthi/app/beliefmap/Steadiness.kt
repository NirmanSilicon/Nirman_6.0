package ai.saarthi.app.beliefmap

import ai.saarthi.app.geometry.Box
import kotlin.math.hypot

/**
 * Is the camera being held still? (D58, team choice after the 1 Nov false alarms.) Unasked "moved" /
 * "can't see" / "back" are judged only once the phone has been still for a moment, because a handheld
 * phone also **slides**, which the gyro cannot see, and a slide shifts every computed position.
 *
 * Still = the gyro turns slower than [maxRotationDegS] **and** the objects in the image hold their
 * places: between two detector runs the lower median shift of the tracked boxes stays under
 * [maxStepShift] (one object being moved does not break it while another stands still), and since the
 * stillness began the drift stays under [maxDrift] (a slow slide adds up). Frame fractions. Pure logic.
 */
class Steadiness(
    // Tuned on the team's two handheld recordings of 1 Nov (D58): hand jitter while held reaches 1.7-3.6% of
    // the frame per run; pointing the phone somewhere new moves 3-7% per run and drifts up to 10%. Loosened in
    // D60 (10°/s, 3%, 6% → 15°/s, 4%, 8%): on the team's 12 Nov test with the phone in a hand-held stand the
    // watch was on 62% of the time in ~6 s spells (mostly the gyro); now 71%, and the replays gain real
    // removals (the 1 Nov apple taken by a hand) for one possible extra alert in the false-alarm session.
    private val maxRotationDegS: Float = 15f,
    private val maxStepShift: Float = 0.04f,
    private val maxDrift: Float = 0.08f,
) {
    private var last: Map<Int, Pair<Float, Float>> = emptyMap()
    private var anchor: Map<Int, Pair<Float, Float>> = emptyMap()
    private var stillSinceMs: Long? = null
    /** The last run's measurements (for logs and tuning). */
    var lastStep: Float? = null
        private set
    var lastDrift: Float? = null
        private set

    /**
     * One detector run: confirmed objects seen in this run (id → box; not the table or people, whose boxes
     * jitter or move by themselves) and the gyro's turn rate. Returns how long it has been still (ms).
     */
    fun update(tracks: Map<Int, Box>, rotationDegS: Float, nowMs: Long): Long {
        val centres = tracks.mapValues { (_, b) -> (b.left + b.right) / 2f to (b.top + b.bottom) / 2f }
        val step = lowerMedianShift(last, centres)
        last = centres
        val drift = lowerMedianShift(anchor, centres)
        lastStep = step; lastDrift = drift
        val still = rotationDegS <= maxRotationDegS && (step ?: 0f) <= maxStepShift && (drift ?: 0f) <= maxDrift
        if (!still) {
            // The next still spell is measured from here (a stale reference would never let it start again).
            stillSinceMs = null
            anchor = centres
        } else if (stillSinceMs == null) {
            stillSinceMs = nowMs
            anchor = centres
        }
        // New objects join the anchor set as they appear, so drift is always measured on shared tracks.
        if (still) anchor = centres.keys.associateWith { anchor[it] ?: centres.getValue(it) }
        return stillSinceMs?.let { nowMs - it } ?: 0L
    }

    /** The lower median of the shifts of tracks seen in both, or null when none are shared. */
    private fun lowerMedianShift(a: Map<Int, Pair<Float, Float>>, b: Map<Int, Pair<Float, Float>>): Float? {
        val shifts = b.mapNotNull { (id, p) -> a[id]?.let { q -> hypot(p.first - q.first, p.second - q.second) } }.sorted()
        return if (shifts.isEmpty()) null else shifts[(shifts.size - 1) / 2]
    }
}
