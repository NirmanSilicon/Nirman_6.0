package ai.saarthi.app.insight

import kotlin.math.exp

/**
 * How likely an object is still where it was last seen, by its kind (D56): the "spatial decay curve".
 * Each kit class moves at its own rate; measured on the team's recordings with survival analysis
 * (`tools/belief_model.py`, Kaplan–Meier, 1 Nov; development data, testers moving things): a laptop almost
 * never moves, a bottle or cup often. Constant-rate model: P(still there after t) = e^(−rate·t).
 */
object SpatialDecay {

    /** Moves per minute, measured (D56). Classes never seen moved are treated as the laptop. */
    private val ratePerMin = mapOf(
        "bottle" to 0.325, "cup" to 0.225, "apple" to 0.137, "banana" to 0.137, "mouse" to 0.100,
        "laptop" to 0.010, "book" to 0.010, "cell phone" to 0.100,
    )

    fun stillThere(label: String, ageMs: Long): Double = exp(-(ratePerMin[label] ?: 0.1) * ageMs / 60_000.0)

    /** Below this, a remembered place is said as a probability, not a fact. */
    const val SAY_MAYBE = 0.5
}
