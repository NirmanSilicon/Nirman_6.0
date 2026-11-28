package ai.saarthi.app.table

import ai.saarthi.app.geometry.Vec2
import kotlin.math.atan2
import kotlin.math.roundToInt

/** How far an object is from the user's hand, in words (PRD 5.0.1). Never centimetres. */
enum class Reach(val phrase: String) {
    WITHIN("within reach"),
    JUST_BEYOND("just beyond reach"),
    OUT("out of reach");

    companion object {
        /**
         * Starting values for a seated adult (D20): a comfortable reach is about half a metre from
         * the chest; a lean gets about a quarter metre more. [previous] adds hysteresis so an object
         * near a boundary does not flip between words as the camera shakes.
         */
        const val WITHIN_M = 0.50f
        const val JUST_BEYOND_M = 0.75f
        const val HYSTERESIS_M = 0.04f

        fun of(distM: Float, previous: Reach? = null): Reach {
            val raw = when {
                distM <= WITHIN_M -> WITHIN
                distM <= JUST_BEYOND_M -> JUST_BEYOND
                else -> OUT
            }
            if (previous == null || previous == raw) return raw
            val boundary = if (minOf(raw.ordinal, previous.ordinal) == 0) WITHIN_M else JUST_BEYOND_M
            return if (kotlin.math.abs(distM - boundary) < HYSTERESIS_M) previous else raw
        }
    }
}

/** An object's place relative to the user's body: [body] in metres from the chest (x right, y forward). */
data class Placement(val body: Vec2, val reach: Reach) {
    val distM: Float get() = body.length
    /** Degrees from straight ahead, positive to the right. */
    val bearingDeg: Float get() = Math.toDegrees(atan2(body.x.toDouble(), body.y.toDouble())).toFloat()
    val clock: Int get() = Clock.hour(bearingDeg)
}

/**
 * Spoken directions (team decision, 29 Oct, D24): plain words instead of clock hours, which the team
 * found unclear. Bearing is degrees from the user's forward, positive to the right.
 */
object Direction {
    /** Within this of straight ahead: "in front of you". */
    const val AHEAD_DEG = 12f
    /** Up to this: "slightly to your right"; beyond: "on your right". */
    const val SLIGHT_DEG = 35f

    fun phrase(bearingDeg: Float): String {
        val b = TableGeometry.wrap(bearingDeg)
        val side = if (b > 0) "right" else "left"
        return when {
            kotlin.math.abs(b) <= AHEAD_DEG -> "in front of you"
            kotlin.math.abs(b) <= SLIGHT_DEG -> "slightly to your $side"
            else -> "on your $side"
        }
    }

    /** Short form for screens: "ahead", "slightly right", "right". */
    fun word(bearingDeg: Float): String = phrase(bearingDeg)
        .replace("in front of you", "ahead").replace(" to your ", " ").replace("on your ", "")
}

/** Clock hours: kept in the feed for displays; no longer spoken (D24). */
object Clock {
    /** 12 = straight ahead, 3 = right, 9 = left; each hour is 30°. */
    fun hour(bearingDeg: Float): Int {
        val h = (TableGeometry.wrap(bearingDeg) / 30f).roundToInt()
        return if (h <= 0) 12 + h else h
    }

    /** "in front of you" for 12 o'clock, else "at 2 o'clock". */
    fun phrase(hour: Int): String = if (hour == 12) "in front of you" else "at $hour o'clock"
}
