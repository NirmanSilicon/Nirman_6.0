package ai.saarthi.app.beliefmap

import ai.saarthi.app.geometry.Vec2
import ai.saarthi.app.worldmap.WorldObject

/**
 * What the user knows about the table (PRD 5.1): the objects Saarthi has told them about, and where
 * they were when told. Saarthi compares this with the world map and speaks only where the two
 * differ (the Two Maps model). People are not tracked here: they move freely and are counted, never
 * followed. Not thread-safe: use from one thread (the detector's) and publish [snapshot]s.
 */
class BeliefMap {

    enum class Source { TOLD }

    data class Belief(
        /** The world-map entry the user knows as this object (rebinds when it is re-found elsewhere). */
        val worldId: Int,
        val label: String,
        /**
         * Where the user believes it is, world frame, in units of the camera's height above the table
         * (as the world map stores it): a new height estimate rescales it with everything else, so it
         * can never look like a move (Vivo, 29 Oct: height estimates of 0.13-0.36 m made still objects
         * "move" 30 cm). Metres = this × the current height.
         */
        val unit: Vec2,
        val sinceMs: Long,
        val source: Source,
        /** Saarthi has said it can no longer see it; cleared when it is seen again. */
        val lostSaid: Boolean = false,
    )

    /**
     * A spot where the user may still believe an object is: where it was before Saarthi said it moved
     * ([nowWorldId] = where it is now) or that it could no longer see it ([nowWorldId] null). A hand
     * heading here reveals that the correction did not land (Phase 4.5 item 2, D46). Kept [STALE_MS].
     */
    data class Stale(val id: Int, val label: String, val unit: Vec2, val nowWorldId: Int?, val sinceMs: Long)

    private val beliefs = LinkedHashMap<Int, Belief>()
    private val stale = ArrayList<Stale>()
    private var nextStaleId = 1

    /** The stale spots younger than [STALE_MS], newest first. */
    fun staleSpots(nowMs: Long): List<Stale> {
        stale.removeAll { nowMs - it.sinceMs > STALE_MS }
        return stale.sortedByDescending { it.sinceMs }
    }

    /** The user has been told again (a stopped reach): this spot is no longer watched. */
    fun clearStale(id: Int) {
        stale.removeAll { it.id == id }
    }

    /** The user was just told where [label] really is: its spot at [unit] is no longer watched. */
    fun clearStale(label: String, unit: Vec2) {
        stale.removeAll { it.label == label && (it.unit - unit).length < SAME_SPOT_UNITS }
    }

    private fun addStale(b: Belief, nowWorldId: Int?, nowMs: Long) {
        stale.removeAll { it.label == b.label && (it.unit - b.unit).length < 1e-3f }
        stale += Stale(nextStaleId++, b.label, b.unit, nowWorldId, nowMs)
        while (stale.size > MAX_STALE) stale.removeAt(0)
    }

    fun snapshot(): List<Belief> = beliefs.values.toList()

    fun of(worldId: Int): Belief? = beliefs[worldId]

    /**
     * The user was just told about [objects] (a brief item, an answer, an alert): they now believe what
     * Saarthi said. [heightM] is the camera height the objects' metres were computed with.
     */
    fun told(objects: List<WorldObject>, heightM: Float, nowMs: Long) {
        for (o in objects) {
            if (o.isPerson || o.label == "dining table") continue
            val w = o.world ?: continue
            beliefs[o.id] = Belief(o.id, o.label, w * (1f / heightM), nowMs, Source.TOLD)
        }
    }

    /** The user has been told [belief]'s object is now world entry [toId] at [whereM] metres (height [heightM]). */
    fun relocate(belief: Belief, toId: Int, whereM: Vec2, heightM: Float, nowMs: Long) {
        // Older stale spots of this object (and its "gone" spot, if it was said to be gone) now point here.
        stale.replaceAll {
            val same = it.label == belief.label && (it.nowWorldId == belief.worldId || it.nowWorldId == null && belief.lostSaid)
            if (same) it.copy(nowWorldId = toId) else it
        }
        if (!belief.lostSaid) addStale(belief, toId, nowMs)
        beliefs.remove(belief.worldId)
        beliefs[toId] = belief.copy(worldId = toId, unit = whereM * (1f / heightM), sinceMs = nowMs, lostSaid = false)
    }

    fun markLostSaid(belief: Belief, nowMs: Long) {
        addStale(belief, null, nowMs)
        beliefs[belief.worldId] = belief.copy(lostSaid = true)
    }

    /** It is where the user believes again (or nearly): nothing to correct. */
    fun found(belief: Belief, toId: Int) {
        // Back where the user believes: nothing stale about this object any more.
        stale.removeAll { it.label == belief.label && (it.unit - belief.unit).length < SAME_SPOT_UNITS }
        beliefs.remove(belief.worldId)
        beliefs[toId] = belief.copy(worldId = toId, lostSaid = false)
    }

    /** The user was told it is not a real object after all (System 2's correction): nothing to keep believing. */
    fun forget(worldId: Int) {
        beliefs.remove(worldId)
    }

    fun clear() {
        beliefs.clear(); stale.clear()
    }

    companion object {
        /** A correction older than this has had time to land (or the user has moved on). */
        const val STALE_MS = 90_000L
        const val MAX_STALE = 4
        /** Within this (camera heights; about 15 cm at 0.3 m) a stale spot is the believed spot itself. */
        const val SAME_SPOT_UNITS = 0.5f
    }
}
