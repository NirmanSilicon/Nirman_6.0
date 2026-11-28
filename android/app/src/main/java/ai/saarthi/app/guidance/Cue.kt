package ai.saarthi.app.guidance

/**
 * One guidance event (PRD 4: one stream, one source). Speech, vibration, the feed, and later the
 * BLE wristbands and the HUD all consume the same event; no consumer makes its own cues. [event] is
 * the feed v1 name (`shared/feed/v1/README.md`); `guide_back` is a v1 addition (the hand overshot).
 */
enum class Cue(val event: String) {
    LEFT("guide_left"),
    RIGHT("guide_right"),
    /** Keep going: towards the target (hand) — "forward". */
    CLOSER("closer"),
    /** The hand went past the target: come back towards you. */
    BACK("guide_back"),
    ARRIVED("arrived"),
    /** The hand or the target is not seen: look again / hold still. */
    LOOK_AGAIN("look_again"),
}

/** Which guidance produced an event (PRD 5.3): a tracked hand steered to the target, or the camera's aim. */
enum class Mode { HAND, AIM }

/**
 * One step of guidance, as decided by [HandGuide] or [AimGuide].
 * [phrase] is what is said (null = no speech this step); [vector] is the target minus the
 * fingertip (hand) or the image centre (aim), in 0..1 of the frame, for the Mind view;
 * [intensity] 0..1 grows as the target nears (pulse rate; the Vivo has no amplitude control).
 */
data class Step(
    val cue: Cue,
    val mode: Mode,
    val phrase: String?,
    val intensity: Float,
    val vector: Pair<Float, Float>?,
    /** A wrong-way reach corrected at once, outside the beat (PRD 5.3: within 1 s). */
    val correction: Boolean = false,
)
