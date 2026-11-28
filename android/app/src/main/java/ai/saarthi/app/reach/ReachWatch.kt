package ai.saarthi.app.reach

import ai.saarthi.app.beliefmap.BeliefMap
import ai.saarthi.app.beliefmap.ChangeDetector
import ai.saarthi.app.geometry.Box
import ai.saarthi.app.orientation.Pose
import ai.saarthi.app.table.CameraModel
import ai.saarthi.app.table.TableGeometry
import ai.saarthi.app.worldmap.Seen
import ai.saarthi.app.worldmap.WorldObject

/**
 * Stop the wrong reach before it lands (PRD 5.0.1 item 2, D46). Builds the spots a hand may head to
 * from the world map (real objects in view) and the belief map (watched: where the user may still
 * believe an object is), feeds the hand to [ReachPredictor], and turns a prediction into one sentence:
 * "Wait, your bottle moved; it's now on your left." Watched spots:
 * - **stale**: where an object was before Saarthi said it moved or was gone, for 90 s (the user may
 *   not have heard, or forgot: the hand shows it);
 * - **pending**: a believed spot the world already contradicts but Saarthi has not said so yet
 *   (moved, evidence still building; or empty, not yet "can't see").
 * Each watched spot is spoken about once. Not thread-safe: call from the hand thread.
 */
class ReachWatch(private val cam: CameraModel, private val predictor: ReachPredictor = ReachPredictor()) {

    /** The moment and the facts of a stopped reach. [nowWorldId] = where the object is now (null: gone). */
    data class Stop(
        val text: String, val label: String, val believedWorldId: Int?, val staleId: Int?, val nowWorldId: Int?,
        val believedUnit: ai.saarthi.app.geometry.Vec2, val toldMs: Long?, val prediction: ReachPredictor.Prediction,
        val kind: String,
    )

    private class Watched(val spot: ReachPredictor.Spot, val label: String, val unit: ai.saarthi.app.geometry.Vec2,
                          val staleId: Int?, val beliefWorldId: Int?, val nowWorldId: Int?, val toldMs: Long?)

    /** Is anything watched now? (The caller runs hands at full rate only then.) */
    fun watching(stale: List<BeliefMap.Stale>, statuses: List<ChangeDetector.Status>): Boolean =
        stale.isNotEmpty() || statuses.any { it.state == ChangeDetector.State.MOVED_PENDING || it.state == ChangeDetector.State.NOT_SEEN }

    fun reset() = predictor.reset()

    /**
     * One hand run. [knuckles], [tip], [wrist] in 0..1 of the frame; [pose] at the hand's frame;
     * [heightM] the camera's height above the table. Returns a [Stop] to say now, or null.
     */
    fun onHand(
        knuckles: Pair<Float, Float>, tip: Pair<Float, Float>, wrist: Pair<Float, Float>, nowMs: Long,
        pose: Pose, heightM: Float, world: List<WorldObject>,
        beliefs: List<BeliefMap.Belief>, stale: List<BeliefMap.Stale>, statuses: List<ChangeDetector.Status>,
        forwardBearing: (WorldObject) -> Float?,
    ): Stop? {
        val real = world.filter { it.seen == Seen.IN_VIEW && !it.isPerson && it.label != "dining table" && it.track != null }
            .map { o -> val b = o.track!!.box; ReachPredictor.Spot(o.id, (b.left + b.right) / 2f, (b.top + b.bottom) / 2f, radius(b), false) }
        val watched = ArrayList<Watched>()
        var key = WATCH_KEY
        fun add(label: String, unit: ai.saarthi.app.geometry.Vec2, staleId: Int?, beliefId: Int?, nowId: Int?, toldMs: Long?) {
            val (u, v) = TableGeometry.projectWorld(cam, pose, heightM, unit * heightM) ?: return
            if (u !in 0f..1f || v !in 0f..1f) return
            // Something real sits there now (another object put in its place): reaching there is no mistake.
            if (real.any { kotlin.math.hypot(it.x - u, it.y - v) < it.radius }) return
            watched += Watched(ReachPredictor.Spot(key++, u, v, WATCH_RADIUS, true), label, unit, staleId, beliefId, nowId, toldMs)
        }
        for (s in stale) add(s.label, s.unit, s.id, null, s.nowWorldId, null)
        val byWorld = beliefs.associateBy { it.worldId }
        for (st in statuses) {
            if (st.state != ChangeDetector.State.MOVED_PENDING && st.state != ChangeDetector.State.NOT_SEEN) continue
            val b = byWorld[st.worldId] ?: continue
            add(b.label, b.unit, null, b.worldId, st.target, b.sinceMs)
        }
        if (watched.isEmpty()) {
            predictor.reset()
            return null
        }
        val p = predictor.onHand(knuckles, tip, wrist, nowMs, real + watched.map { it.spot }) ?: return null
        val w = watched.first { it.spot.key == p.spot.key }
        val now = w.nowWorldId?.let { id -> world.firstOrNull { it.id == id } }
        val bearing = now?.let(forwardBearing)
        val text = if (bearing != null) StopPhrases.moved(w.label, bearing) else StopPhrases.gone(w.label)
        return Stop(text, w.label, w.beliefWorldId, w.staleId, now?.id, w.unit, w.toldMs, p,
            if (w.staleId != null) "stale" else "pending")
    }

    private fun radius(b: Box) = maxOf(0.04f, minOf(b.right - b.left, b.bottom - b.top) / 2f)

    private companion object {
        const val WATCH_KEY = 1_000_000
        /** About an object's half-width in the image at table distance. */
        const val WATCH_RADIUS = 0.06f
    }
}
