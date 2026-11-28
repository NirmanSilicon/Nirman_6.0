package ai.saarthi.app.safety

/**
 * A sudden, very loud sound (D47): a moment far louder than the room has been over the last few
 * seconds ("generally 5, then suddenly 30-40", the team's words). Judged against the room's own
 * level, not a fixed volume, because a hackathon hall is loud all the time. Fed one loudness level per
 * ~50 ms (dB relative to full scale; only this number is kept, never any audio). Saarthi's own voice
 * is not a spike: the caller marks those frames. A spike alone never starts the SOS; it only tells
 * the trusted contact what probably happened with a fall. Pure logic, tested off-device.
 */
class LoudSpike(
    /** This much above the room's median level over [roomMs]: about 8× the sound pressure. */
    private val aboveRoomDb: Float = 18f,
    /** And at least this loud in absolute terms (no spike in a silent room from a cough far away). */
    private val minDb: Float = -30f,
    private val roomMs: Long = 4_000L,
    /** Remember spikes this long. */
    private val keepMs: Long = 15_000L,
) {
    data class Spike(val atMs: Long, val db: Float, val aboveRoomDb: Float)

    private val levels = ArrayDeque<Pair<Long, Float>>()
    private val spikes = ArrayDeque<Spike>()

    /** One level reading. [ownVoice] = Saarthi was speaking: not the room, not a spike. */
    fun onLevel(db: Float, tMs: Long, ownVoice: Boolean): Spike? {
        while (levels.isNotEmpty() && tMs - levels.first().first > roomMs) levels.removeFirst()
        while (spikes.isNotEmpty() && tMs - spikes.first().atMs > keepMs) spikes.removeFirst()
        if (ownVoice) return null
        val room = if (levels.size >= MIN_LEVELS) levels.map { it.second }.sorted()[levels.size / 2] else null
        levels.addLast(tMs to db)
        if (room == null || db < minDb || db - room < aboveRoomDb) return null
        // One spike per loud moment: a bang lasting several frames counts once.
        if (spikes.isNotEmpty() && tMs - spikes.last().atMs < 1_000L) return null
        return Spike(tMs, db, db - room).also { spikes.addLast(it) }
    }

    /** The loudest spike from [beforeMs] before [atMs] to [afterMs] after it, if any. */
    fun near(atMs: Long, beforeMs: Long = 8_000L, afterMs: Long = 1_000L): Spike? =
        spikes.filter { it.atMs in (atMs - beforeMs)..(atMs + afterMs) }.maxByOrNull { it.aboveRoomDb }

    private companion object {
        /** About a second of room before anything counts as a spike. */
        const val MIN_LEVELS = 20
    }
}
