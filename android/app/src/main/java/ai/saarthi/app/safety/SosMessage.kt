package ai.saarthi.app.safety

/**
 * The SMS to the trusted contact (D47): who, the most probable situation in plain words (no numbers:
 * team decision), whether the phone has moved since, that nobody answered "Are you OK?", and roughly
 * where (a map link rounded to about 100 m: the team wants the area, not a pin). Only what the
 * sensors measured is said, always as "possible": a phone's fall is not proof of a person's fall.
 */
object SosMessage {

    data class Place(val lat: Double, val lon: Double, val ageMin: Long)

    /** The situation line: what the sensors measured, and what it most probably means. */
    fun situation(spike: LoudSpike.Spike?, fall: FallDetector.Fall): String = when {
        spike == null -> "Possible fall: the phone suddenly fell and hit hard."
        spike.atMs <= fall.atMs - 500 -> "Possible accident: a sudden very loud sound, then the phone suddenly fell and hit hard."
        else -> "Possible accident: the phone suddenly fell and hit hard, with a sudden very loud sound."
    }

    fun text(name: String?, situation: String, stillSince: Boolean, waitedS: Int, place: Place?, clock: String): String {
        val who = name?.takeIf { it.isNotBlank() } ?: "the Saarthi user"
        val where = if (place == null) "Location not available."
        else "Approximate location: https://maps.google.com/?q=%.3f,%.3f".format(place.lat, place.lon) +
            if (place.ageMin >= 2) " (from ${place.ageMin} min ago)." else "."
        return "SAARTHI SOS for $who. $situation " +
            (if (stillSince) "No movement since. " else "") +
            "No answer to \"Are you OK?\" for $waitedS seconds. $where Sent at $clock."
    }
}
