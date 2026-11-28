package ai.saarthi.app.guidance

import ai.saarthi.app.geometry.Box

/**
 * One guidance session (PRD 5.3): "guide my hand to the bottle" until the hand touches it, the user
 * says stop, or [timeoutMs] passes. Every hand-tracker run (about 10 per second, the reflex tier)
 * gives the newest fingertip and target; a tracked hand gets hand guidance, otherwise the camera's
 * aim is steered (presenter handheld). Each step records its mode. Not thread-safe: one thread.
 */
class Guidance(
    private val timeoutMs: Long = 30_000L,
    /** A hand unseen this long hands over to aim mode. */
    private val handLostMs: Long = 1_500L,
    private val lookAgainGapMs: Long = 3_000L,
) {
    data class Target(val worldId: Int, val label: String, val name: String)

    /** What the guide knows this run about the target and the hand. */
    data class View(
        /** Index fingertip of the hand nearest the target, 0..1; null when no hand is tracked. */
        val tip: Pair<Float, Float>?,
        /** The target's latest box (its last known box while a hand hides it); null if unknown. */
        val box: Box?,
        /** Whether the target is in view now (else [box] is stale or null). */
        val inView: Boolean,
        val reachPhrase: String?,
        /** Remembered direction of the target from the user's forward, and the camera's. */
        val targetBearingDeg: Float?,
        val cameraBearingDeg: Float?,
    )

    var target: Target? = null
        private set
    private var startMs = 0L
    private var lastHandMs = Long.MIN_VALUE / 2
    private var lastLookAgainMs = Long.MIN_VALUE / 2
    private val hand = HandGuide()
    private val aim = AimGuide()

    /** Learned over the session's reaches (PRD 5.3); survives between guidance sessions. */
    val bias = ReachBias()
    private var announce: String? = null

    val active: Boolean get() = target != null

    fun start(t: Target, nowMs: Long) {
        target = t
        startMs = nowMs
        lastHandMs = Long.MIN_VALUE / 2
        lastLookAgainMs = nowMs
        hand.reset()
        aim.reset()
        bias.newReach()
    }

    fun stop() { target = null }

    private companion object {
        /** Aim past the target by this share of the learned bias. */
        const val BIAS_GAIN = 0.6f
    }

    /** One run. Returns the step to emit, or null. The session ends after an arrival or the timeout. */
    fun onRun(v: View, nowMs: Long): Step? {
        val t = target ?: return null
        if (nowMs - startMs > timeoutMs) {
            target = null
            return Step(Cue.LOOK_AGAIN, Mode.AIM, "I'll stop guiding now; ask again when you're ready.", 0f, null)
        }
        val step = when {
            v.tip != null && v.box != null -> {
                lastHandMs = nowMs
                val error = ((v.box.left + v.box.right) / 2f - v.tip.first) to ((v.box.top + v.box.bottom) / 2f - v.tip.second)
                bias.observe(v.tip, error, nowMs)
                bias.announcement()?.let { announce = it }
                val e = bias.estimate()
                hand.aimOffset = if (e.confident) e.x * BIAS_GAIN to e.y * BIAS_GAIN else 0f to 0f
                hand.onHand(v.tip, v.box, nowMs)
            }
            nowMs - lastHandMs < handLostMs -> null  // the hand flickered out: wait a moment
            v.inView && v.box != null -> aim.inView(v.box, v.reachPhrase, nowMs)
            v.targetBearingDeg != null && v.cameraBearingDeg != null -> aim.outOfView(v.targetBearingDeg, v.cameraBearingDeg, nowMs)
            nowMs - lastLookAgainMs >= lookAgainGapMs -> {
                lastLookAgainMs = nowMs
                Step(Cue.LOOK_AGAIN, Mode.AIM, "I can't see the ${t.name} now.", 0f, null)
            }
            else -> null
        }
        if (step?.cue == Cue.ARRIVED) target = null
        // The bias sentence rides on the next cue, once.
        val a = announce
        if (step != null && a != null && step.mode == Mode.HAND) {
            announce = null
            return step.copy(phrase = a + (step.phrase?.let { " $it" } ?: ""))
        }
        return step
    }
}
