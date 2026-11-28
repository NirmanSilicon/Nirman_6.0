package ai.saarthi.app.guidance

// Adapted from SecondSense voice/VectorToGoalController.kt (owners' permission, commit cc122ea): with
// no hand in view, steer the camera's aim at the target box (direction from its centre's horizontal
// position) and signal arrival when it is centred. Changed: spoken table words on a steady beat
// instead of a continuous sonification target; arrival = centred (the reach zone is said with it);
// a target out of view is found by its remembered bearing from the world map.

import ai.saarthi.app.geometry.Box
import ai.saarthi.app.table.TableGeometry
import kotlin.math.abs

/**
 * Aim mode (PRD 5.3, presenter handheld): no tracked hand, so the camera is steered until the target
 * is straight ahead of it. Pure logic.
 */
class AimGuide(
    private val beatMs: Long = 1_200L,
    /** The target's centre within this of the frame's centre is straight ahead. */
    private val centred: Float = 0.12f,
) {
    private var lastBeatMs: Long? = null
    private var arrived = false

    fun reset() { lastBeatMs = null; arrived = false }

    /** The target is in view at [target]; [reachPhrase] ("within reach") is said on arrival. */
    fun inView(target: Box, reachPhrase: String?, nowMs: Long): Step? {
        if (arrived) return null
        val dx = (target.left + target.right) / 2f - 0.5f
        val dy = (target.top + target.bottom) / 2f - 0.5f
        if (abs(dx) <= centred) {
            arrived = true
            return Step(Cue.ARRIVED, Mode.AIM, "It's straight ahead" + (reachPhrase?.let { ", $it" } ?: "") + ".", 1f, dx to dy)
        }
        if (!onBeat(nowMs)) return null
        val cue = if (dx < 0) Cue.LEFT else Cue.RIGHT
        val phrase = if (abs(dx) < 0.25f) "A little ${if (dx < 0) "left" else "right"}." else "Turn ${if (dx < 0) "left" else "right"}."
        return Step(cue, Mode.AIM, phrase, (1f - abs(dx) * 2f).coerceIn(0f, 1f), dx to dy)
    }

    /**
     * The target is out of view but remembered at [targetBearingDeg] (from the user's forward);
     * the camera points [cameraBearingDeg] from forward. Turn towards it.
     */
    fun outOfView(targetBearingDeg: Float, cameraBearingDeg: Float, nowMs: Long): Step? {
        if (arrived || !onBeat(nowMs)) return null
        val d = TableGeometry.wrap(targetBearingDeg - cameraBearingDeg)
        val cue = if (d < 0) Cue.LEFT else Cue.RIGHT
        return Step(cue, Mode.AIM, "Turn ${if (d < 0) "left" else "right"}.", 0f, null)
    }

    private fun onBeat(nowMs: Long): Boolean {
        val last = lastBeatMs
        if (last != null && nowMs - last < beatMs) return false
        lastBeatMs = nowMs
        return true
    }
}
