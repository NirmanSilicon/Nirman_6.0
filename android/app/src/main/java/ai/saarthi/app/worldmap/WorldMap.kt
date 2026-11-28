package ai.saarthi.app.worldmap

// The resting test is adapted from SecondSense inference/decode/RestingStateVerifier.kt (owners'
// permission, commit cc122ea): an object counts as placed only when its position has barely varied
// over a short window of sightings spanning a minimum time. Changed: positions are table positions
// in metres in a yaw-stable frame (SecondSense used image centres and rough metres, keyed by label,
// so a second bottle overwrote the first); objects keep an id; the result is a state on the object,
// not a one-off event; sightings during fast camera turns are skipped.

import ai.saarthi.app.geometry.Box
import ai.saarthi.app.geometry.Vec2
import ai.saarthi.app.orientation.Pose
import ai.saarthi.app.perception.Track
import ai.saarthi.app.table.CameraModel
import ai.saarthi.app.table.Reach
import ai.saarthi.app.table.TableGeometry
import kotlin.math.abs
import kotlin.math.hypot

/**
 * The world map at table scale (PRD 5.1): one entry per physical object or person, kept in a
 * table frame that stays put while the camera turns (gyro yaw), so it survives the tracker
 * splitting one object into several tracks (D12) and the camera briefly looking away.
 *
 * Each detector run: every confirmed track seen in this run is placed on the table (its base's ray
 * meets the table plane) or, for a person, given a bearing; it is matched to the entry it already
 * belongs to, else to the nearest entry of the same class within [MATCH_M] (or [MATCH_DEG] for
 * people), else a new entry. Entries not seen are marked out of view (the camera turned away) or
 * not seen (in view but undetected). Not thread-safe: call [update] from the detector thread and
 * share the returned list.
 *
 * Positions are kept in units of the camera's height above the table and turned into metres only
 * on output. A ray meets the table at a distance proportional to that height, so when the height
 * estimate changes (a ruler comes into view), every stored position rescales with it and old
 * entries still match new sightings of the same object.
 */
class WorldMap(private val cam: CameraModel) {

    private class Entry(val id: Int, val label: String, val firstSeenMs: Long) {
        var trackId = -1
        var track: Track? = null
        var world: Vec2? = null
        var worldLeft: Vec2? = null
        var worldRight: Vec2? = null
        var bearing: Float? = null
        var reach: Reach? = null
        var lastSeenMs = firstSeenMs
        var notStatable: String? = "not yet judged"
        var everStatable = false
        var baseCutOff = false
        var box = Box(0f, 0f, 0f, 0f)
        var seen = Seen.IN_VIEW
        /** Recent table positions (time, position), oldest first. */
        val recent = ArrayDeque<Pair<Long, Vec2>>()
        /** Entries seen in view at the same moment as this one: certainly other objects. */
        val coSeen = HashSet<Int>()
        var resting = false
        var moving = false
    }

    private val entries = ArrayList<Entry>()
    private var nextId = 1
    /** The camera's height above the table for this run (metres per stored unit). */
    private var h = 0.4f

    /**
     * Feeds one detector run. [pose] is the camera's pose at the frame's time (null without the
     * IMU: nothing is placed and entries match by image position). [whyNotStatable] applies the
     * speaking rules to a track (null = it may be said).
     */
    fun update(
        tracks: List<Track>, pose: Pose?, heightM: Float, nowMs: Long,
        whyNotStatable: (Track) -> String?,
    ): List<WorldObject> {
        h = heightM
        val live = tracks.associateBy { it.id }
        val claimed = HashSet<Int>()
        val fresh = tracks.filter { it.confirmed && it.lastSeenMs == nowMs }
            .sortedByDescending { t -> if (entries.any { it.trackId == t.id }) 1 else 0 }  // existing bindings first

        for (t in fresh) {
            val place = place(t, pose)
            val e = entries.firstOrNull { it.trackId == t.id && it.id !in claimed }
                ?: nearest(t, place, pose, claimed, live)
                ?: Entry(nextId++, t.label, nowMs).also { entries += it }
            claimed += e.id
            e.trackId = t.id
            e.track = t
            e.lastSeenMs = nowMs
            e.box = t.box
            e.seen = Seen.IN_VIEW
            e.notStatable = whyNotStatable(t)
            if (e.notStatable == null) e.everStatable = true
            e.baseCutOff = t.box.bottom >= 1f - EDGE
            if (place != null && !(pose?.fastRotation ?: true)) {
                e.bearing = place.bearing
                if (place.world != null) {
                    e.recent.addLast(nowMs to place.world)
                    e.worldLeft = place.left
                    e.worldRight = place.right
                }
            }
            while (e.recent.isNotEmpty() && nowMs - e.recent.first().first > WINDOW_MS) e.recent.removeFirst()
            settle(e, pose)
        }

        for (e in entries) {
            if (e.id in claimed) continue
            val t = live[e.trackId]
            if (t != null && nowMs - t.lastSeenMs <= IN_VIEW_MS) {
                e.track = t
                e.seen = Seen.IN_VIEW
                continue
            }
            e.track = null
            e.seen = if (pose != null && !expectedInView(e, pose)) Seen.OUT_OF_VIEW else Seen.NOT_SEEN
        }
        entries.removeAll { e ->
            val unseen = nowMs - e.lastSeenMs
            (!e.everStatable && unseen > FORGET_NEVER_SAID_MS) ||
                (e.seen == Seen.NOT_SEEN && unseen > FORGET_NOT_SEEN_MS) ||
                unseen > FORGET_OUT_OF_VIEW_MS
        }
        val inView = entries.filter { it.id in claimed }
        for (a in inView) for (b in inView) if (a !== b) a.coSeen += b.id
        mergeSplits()
        return entries.map { it.snapshot() }
    }

    /**
     * One object can end up as several entries when the camera pans away and back (handheld steps,
     * gyro drift, the tracker splitting it). Same-class entries closer than [MERGE_M] that were
     * never in view together are taken as one object; the most recently seen one is kept
     * (Vivo, 29 Oct: three remembered "laptop" entries at 10-11 o'clock were said as three laptops).
     * Two real objects that close and never seen together are under-counted: preferred to a phantom.
     */
    private fun mergeSplits() {
        val gone = HashSet<Int>()
        val byRecency = entries.sortedByDescending { it.lastSeenMs }
        for ((i, keep) in byRecency.withIndex()) {
            if (keep.id in gone) continue
            for (other in byRecency.drop(i + 1)) {
                if (other.id in gone || other.label != keep.label || other.id in keep.coSeen) continue
                if (other.seen == Seen.IN_VIEW && keep.seen == Seen.IN_VIEW) continue
                val close = when {
                    keep.world != null && other.world != null -> (keep.world!! - other.world!!).length * h < MERGE_M
                    keep.bearing != null && other.bearing != null -> abs(TableGeometry.wrap(keep.bearing!! - other.bearing!!)) < MATCH_DEG
                    else -> false
                }
                if (!close) continue
                gone += other.id
                keep.coSeen += other.coSeen
                if (other.everStatable) keep.everStatable = true
            }
        }
        if (gone.isNotEmpty()) entries.removeAll { it.id in gone }
    }

    fun reset() {
        entries.clear()
    }

    private class Place(val world: Vec2?, val left: Vec2?, val right: Vec2?, val bearing: Float)

    /** A track's position on the table (objects, in height units) and bearing (everything), in the world frame. */
    private fun place(t: Track, pose: Pose?): Place? {
        pose ?: return null
        val b = t.box
        val cx = (b.left + b.right) / 2f
        if (t.label == "person" || t.label == "dining table") {
            // A person's base is not on the table; the table's own base is its near edge, not a spot on it.
            val bearing = TableGeometry.bearingInCamera(cam, pose, cx, (b.top + b.bottom) / 2f) + pose.yawDeg
            return Place(null, null, null, bearing)
        }
        val base = TableGeometry.onTable(cam, pose, 1f, cx, b.bottom) ?: return null
        val world = TableGeometry.cameraToWorld(base, pose)
        val left = TableGeometry.onTable(cam, pose, 1f, b.left, b.bottom)?.let { TableGeometry.cameraToWorld(it, pose) }
        val right = TableGeometry.onTable(cam, pose, 1f, b.right, b.bottom)?.let { TableGeometry.cameraToWorld(it, pose) }
        val bearing = Math.toDegrees(kotlin.math.atan2(world.x.toDouble(), world.y.toDouble())).toFloat()
        return Place(world, left, right, bearing)
    }

    /** The entry this new track most likely is: same class, not taken this run, not held by another live track, nearest. */
    private fun nearest(t: Track, place: Place?, pose: Pose?, claimed: Set<Int>, live: Map<Int, Track>): Entry? {
        var best: Entry? = null
        var bestD = Float.MAX_VALUE
        for (e in entries) {
            if (e.label != t.label || e.id in claimed) continue
            val holder = live[e.trackId]
            if (holder != null && holder.id != t.id && holder.lastSeenMs >= t.lastSeenMs - IN_VIEW_MS) continue
            val d = when {
                // An entry not in view may have drifted (handheld steps, gyro drift): match it more loosely.
                place?.world != null && e.world != null ->
                    (place.world - e.world!!).length * h / (if (e.seen == Seen.IN_VIEW) MATCH_M else MATCH_UNSEEN_M)
                place != null && e.bearing != null && pose != null -> abs(TableGeometry.wrap(place.bearing - e.bearing!!)) / MATCH_DEG
                else -> hypot(centreX(t.box) - centreX(e.box), centreY(t.box) - centreY(e.box)) / MATCH_IMAGE
            }
            if (d < 1f && d < bestD) { best = e; bestD = d }
        }
        return best
    }

    /** Resting and moving from the recent table positions; the position is their mean while resting. */
    private fun settle(e: Entry, pose: Pose?) {
        val r = e.recent
        if (r.isEmpty()) {
            e.resting = false
            e.moving = false
            return
        }
        val mean = Vec2(r.map { it.second.x }.average().toFloat(), r.map { it.second.y }.average().toFloat())
        val spread = r.maxOf { (it.second - mean).length }
        val span = r.last().first - r.first().first
        e.resting = r.size >= MIN_SIGHTINGS && span >= MIN_SPAN_MS && spread * h <= RESTING_SPREAD_M
        e.moving = (r.last().second - r.first().second).length * h > MOVING_M
        e.world = if (e.resting) mean else r.last().second
        e.reach = pose?.let { Reach.of(TableGeometry.worldToBody(e.world!! * h, it.forwardYawDeg).length, e.reach) }
    }

    /** Whether the camera now looks at where [e] was (so not seeing it means something). */
    private fun expectedInView(e: Entry, pose: Pose): Boolean {
        val w = e.world
        if (w != null) {
            val p = TableGeometry.projectWorld(cam, pose, 1f, w) ?: return false
            return p.first in VIEW_MARGIN..(1f - VIEW_MARGIN) && p.second in VIEW_MARGIN..(1f - VIEW_MARGIN)
        }
        val b = e.bearing ?: return true
        val off = TableGeometry.wrap(b - (TableGeometry.bearingInCamera(cam, pose, 0.5f, 0.5f) + pose.yawDeg))
        return abs(off) < cam.horizontalFovDeg / 2f - 3f
    }

    private fun Entry.snapshot() = WorldObject(
        id, label, seen, track, world?.times(h), worldLeft?.times(h), worldRight?.times(h), bearing, reach, firstSeenMs, lastSeenMs,
        notStatable, resting, moving, baseCutOff, box,
    )

    private fun centreX(b: Box) = (b.left + b.right) / 2f
    private fun centreY(b: Box) = (b.top + b.bottom) / 2f

    companion object {
        /** A track this close (table metres) to an entry of the same class is that entry. */
        const val MATCH_M = 0.20f
        const val MATCH_UNSEEN_M = 0.35f
        const val MERGE_M = 0.35f
        const val MATCH_DEG = 12f
        const val MATCH_IMAGE = 0.12f
        /** A track not seen for this long no longer keeps its entry in view. */
        const val IN_VIEW_MS = 1_000L
        const val WINDOW_MS = 1_000L
        // 3 sightings over 0.4 s (was 4 over 0.5 s): with a warm phone the detector drops to ~3.5 runs/s,
        // and 4 sightings then took over a second (D26).
        const val MIN_SIGHTINGS = 3
        const val MIN_SPAN_MS = 400L
        /** Handheld jitter of a base on the table is a few centimetres (D20). */
        const val RESTING_SPREAD_M = 0.05f
        const val MOVING_M = 0.10f
        // Team decision (29 Oct): a briefly seen laptop was forgotten too soon; remember longer.
        const val FORGET_NEVER_SAID_MS = 15_000L
        const val FORGET_NOT_SEEN_MS = 10_000L
        const val FORGET_OUT_OF_VIEW_MS = 300_000L
        private const val EDGE = 0.02f
        /**
         * An entry counts as "not seen" (rather than out of view) only if its spot is well inside the
         * frame: objects near the edge are often cut and missed (Vivo, 30 Oct: "can't see your bottle"
         * for a bottle at the frame's edge).
         */
        private const val VIEW_MARGIN = 0.10f
    }
}
