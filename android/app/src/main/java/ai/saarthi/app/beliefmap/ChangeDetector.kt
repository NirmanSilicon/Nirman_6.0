package ai.saarthi.app.beliefmap

import ai.saarthi.app.geometry.Box
import ai.saarthi.app.perception.SpokenNames
import ai.saarthi.app.worldmap.Seen
import ai.saarthi.app.worldmap.WorldObject

/**
 * Divergence between the belief map and the world map (PRD 5.1, docs/SYSTEM2.md 4.4): has an object
 * the user knows about been moved, or can Saarthi no longer see it? It speaks only on evidence held
 * over time, never on one frame:
 *
 * - **moved**: the object rests at least [movedM] from where the user believes it, for [confirmMs]
 *   (either the same entry slid there in view, or the believed spot is empty and an object of the same
 *   class rests elsewhere, not already known as another object);
 * - **can't see it any more**: its believed spot is in view, nothing covers it, and it has not been
 *   seen for [lostMs];
 * - **hidden**: a hand or a person covers its last box: no evidence either way, timers restart.
 *   A hand passing over the bottle is never "moved" or "gone".
 *
 * While the object is moving (carried), nothing is said until it rests. Each alert carries its
 * cause for the log and the Mind view. Alerts are at least [gapMs] apart and wait while Saarthi is
 * speaking or listening. Not thread-safe: call from one thread.
 */
class ChangeDetector(
    /** 20 cm, not the PRD's ~10 cm: handheld at ~0.2 m above the table, noise reaches ~15 cm (D25). */
    private val movedM: Float = 0.20f,
    /** 0.6 s (was 1 s): the team found alerts slow; resting is already checked by the world map (D26). */
    private val confirmMs: Long = 600L,
    private val lostMs: Long = 3_000L,
    /** With no other known object in place to prove the camera did not slide away (D28). */
    private val lostAloneMs: Long = 5_000L,
    private val gapMs: Long = 3_000L,
    /** Share of the object's last box an occluder must cover to count as hiding it. */
    private val coverShare: Float = 0.3f,
    /** Camera shake plus box jitter, in degrees of view, that must never read as a move. */
    private val shakeDeg: Float = 4f,
) {
    enum class State { OK, MOVING, MOVED_PENDING, BACK_PENDING, HIDDEN, NOT_SEEN, LOST, OUT_OF_VIEW, UNKNOWN }

    /** BACK: an object Saarthi said it could no longer see is on the table again (team request, 30 Oct). */
    enum class Kind { MOVED, LOST, BACK }

    /**
     * One thing said unasked. [before] is the belief as it stood when the divergence was decided (what the
     * user believed and when they were told), [evidenceMs] how long the evidence held before speaking, and
     * [toWorldM] where the object is now (world frame, metres; null when it is gone): the Mind view's
     * theory-of-mind panel shows the false belief from these (Phase 4.5, D44).
     */
    data class Alert(
        val kind: Kind, val label: String, val text: String, val cause: String, val fromWorldId: Int, val toWorldId: Int?,
        val before: BeliefMap.Belief? = null, val evidenceMs: Long = 0L, val toWorldM: ai.saarthi.app.geometry.Vec2? = null,
    )

    /** One belief's standing against the world, for the feed and the Mind view. */
    data class Status(val worldId: Int, val label: String, val state: State, val evidenceMs: Long, val note: String, val target: Int? = null)

    /** What the other known objects share: a scale about the camera and a shift (camera effects, not moves). */
    private data class Shared(val scale: Float, val offset: ai.saarthi.app.geometry.Vec2)
    private data class Ref(val sinceMs: Long, val bel: ai.saarthi.app.geometry.Vec2, val cur: ai.saarthi.app.geometry.Vec2)

    private class Pending(val state: State, val sinceMs: Long, val target: Int?, val yawDeg: Float = 0f, val tiltDeg: Float = 0f)

    /** Where the camera points and how fast it turns, for the steadiness rule (D28). */
    data class Camera(val yawDeg: Float, val tiltDeg: Float, val rotationDegS: Float) {
        companion object { val STILL = Camera(0f, 0f, 0f) }
    }

    private companion object {
        /** Other objects' displacements this close together are one shared camera shift. */
        const val AGREE_M = 0.06f
        /** Objects last seen within this of each other vanished together (D32). */
        const val TOGETHER_MS = 1_000L
        /** Faster than this, the camera is moving: "not seen" proves nothing (Vivo, 30 Oct: false "can't see" at 29-79°/s). */
        const val STEADY_DEG_S = 20f
        /** The camera must stay within this of where it pointed when the evidence started. */
        const val STEADY_DRIFT_DEG = 8f
        /** Others must agree on a shared scale within this share to count as one camera effect (D45). */
        const val AGREE_SCALE = 0.15f
        /** A shared scale beyond these is no small camera error: no correction (D45). */
        const val MIN_SCALE = 0.6f
        const val MAX_SCALE = 1.7f
        /** The camera-height estimate changing by more than this share within [HEIGHT_WINDOW_MS]: positions are in flux (D45). */
        const val HEIGHT_FLUX = 0.10f
        const val HEIGHT_WINDOW_MS = 1_000L
        /** A last box this close to the frame's edge went out of view, not away (team, 1 Nov; D45). */
        const val EDGE = 0.02f
        /** Only compare against other beliefs from the same tell/update epoch so pre-existing drift cannot loop a relocated belief. */
        const val EPOCH_WINDOW_MS = 500L
    }

    /** Recent camera-height estimates, for the flux rule. */
    private val heights = ArrayDeque<Pair<Long, Float>>()

    /**
     * For each belief (keyed by worldId + sinceMs), the resting positions (in camera-height units) of
     * older peers when this belief epoch began, so pre-existing camera drift on older peers never
     * manufactures a fake offset on a freshly relocated belief.
     */
    private val peerUnits = HashMap<Int, Pair<Long, HashMap<Int, ai.saarthi.app.geometry.Vec2>>>()

    private val pending = HashMap<Int, Pending>()
    private var lastAlertMs = Long.MIN_VALUE / 2

    /**
     * One detector run. [occluders] are boxes of hands and people in view; [describe] says where an
     * object is ("behind the laptop"); [canSpeak] is false while Saarthi is talking or listening.
     * Returns at most one alert (already applied to [beliefs]) and every belief's status.
     */
    fun update(
        beliefs: BeliefMap, world: List<WorldObject>, occluders: List<Box>, nowMs: Long,
        fastRotation: Boolean, canSpeak: Boolean, heightM: Float, camera: Camera, describe: (WorldObject) -> String,
    ): Pair<Alert?, List<Status>> {
        val statuses = ArrayList<Status>()
        var alert: Alert? = null
        val byId = world.associateBy { it.id }
        val known = beliefs.snapshot().map { it.worldId }.toSet()
        val mayAlert = canSpeak && nowMs - lastAlertMs >= gapMs

        // Is the camera still looking at the same table? Known objects seen where expected prove it; known
        // objects that vanished at the same moment mean the camera moved (often by sliding, which the gyro
        // cannot see), not that the objects were taken (D28).
        val inPlace = HashSet<Int>()
        /** Known objects not seen where expected, with when each was last seen. */
        val missing = HashMap<Int, Long>()
        for (b in beliefs.snapshot()) {
            val e = byId[b.worldId] ?: continue
            when {
                e.seen == Seen.IN_VIEW && e.world != null && (e.world - b.unit * heightM).length <= movedM -> inPlace += b.worldId
                e.seen == Seen.NOT_SEEN -> missing[b.worldId] = e.lastSeenMs
            }
        }

        // While the camera-height estimate is changing (the phone raised, lowered or slid), every computed
        // position is in flux: no evidence either way, and no timer carries over (team, 1 Nov: "your cup
        // was moved" while the phone was lowered onto the table; D45).
        heights.addLast(nowMs to heightM)
        while (heights.isNotEmpty() && nowMs - heights.first().first > HEIGHT_WINDOW_MS) heights.removeFirst()
        val hMin = heights.minOf { it.second }
        if (heights.maxOf { it.second } - hMin > HEIGHT_FLUX * hMin) {
            pending.clear()
            return null to beliefs.snapshot().map { Status(it.worldId, it.label, State.UNKNOWN, 0, "camera height changing: no evidence") }
        }

        // Common-mode rejection: when the phone shifts in the hand, every resting object in view
        // appears displaced the same way, and when its height or tilt is misjudged, every position is
        // scaled about the camera (the farther, the more). Each object is judged against the scale and
        // shift the *other* known objects in view share, so only a move relative to the rest of the
        // table counts (D25, D45; the same principle as optical flow's ego-motion, without the CPU).
        val pairs = HashMap<Int, Ref>()
        for (b in beliefs.snapshot()) {
            val e = byId[b.worldId] ?: continue
            if (e.seen == Seen.IN_VIEW && e.resting && e.world != null) pairs[b.worldId] = Ref(b.sinceMs, b.unit * heightM, e.world)
        }
        val none = ai.saarthi.app.geometry.Vec2(0f, 0f)
        fun common(forBelief: BeliefMap.Belief): Shared {
            val baseEntry = peerUnits[forBelief.worldId]
            val baseMap = if (baseEntry != null && baseEntry.first == forBelief.sinceMs) {
                baseEntry.second
            } else {
                HashMap<Int, ai.saarthi.app.geometry.Vec2>().also { peerUnits[forBelief.worldId] = forBelief.sinceMs to it }
            }
            // Only what at least two other objects agree on. For peers from an older brief/epoch, measure
            // their change since this belief epoch started (peerUnits), not from before it existed.
            val others = ArrayList<Pair<ai.saarthi.app.geometry.Vec2, ai.saarthi.app.geometry.Vec2>>()
            for ((id, ref) in pairs) {
                if (id == forBelief.worldId) continue
                val bel = if (ref.sinceMs >= forBelief.sinceMs - EPOCH_WINDOW_MS) {
                    ref.bel
                } else {
                    val u = baseMap.getOrPut(id) { ref.cur * (1f / heightM) }
                    u * heightM
                }
                others += bel to ref.cur
            }
            if (others.size < 2) return Shared(1f, none)
            val ratios = others.mapNotNull { (bel, cur) ->
                val n = bel.x * bel.x + bel.y * bel.y
                if (n < 1e-4f) null else (cur.x * bel.x + cur.y * bel.y) / n
            }.sorted()
            var scale = if (ratios.size >= 2) ratios[ratios.size / 2] else 1f
            if (ratios.count { kotlin.math.abs(it - scale) <= AGREE_SCALE * scale } < 2 || scale !in MIN_SCALE..MAX_SCALE) scale = 1f
            val offs = others.map { (bel, cur) -> cur - bel * scale }
            val xs = offs.map { it.x }.sorted()
            val ys = offs.map { it.y }.sorted()
            val median = ai.saarthi.app.geometry.Vec2(xs[xs.size / 2], ys[ys.size / 2])
            val agreeing = offs.count { (it - median).length <= AGREE_M }
            return Shared(scale, if (agreeing >= 2) median else none)
        }

        for (b in beliefs.snapshot()) {
            val name = SpokenNames.of(b.label)
            val common = common(b)
            // Where the believed spot appears now, after the scale and shift every other known object shows.
            val believed = b.unit * (heightM * common.scale) + common.offset
            val moveM = moveThreshold(believed, heightM)
            val e = byId[b.worldId]
            if (fastRotation) {
                statuses += Status(b.worldId, b.label, State.UNKNOWN, 0, "camera turning fast: no evidence")
                continue
            }
            fun hold(state: State, target: Int?): Long {
                val p = pending[b.worldId]
                if (p == null || p.state != state || p.target != target) pending[b.worldId] = Pending(state, nowMs, target)
                return nowMs - pending[b.worldId]!!.sinceMs
            }

            // In view and placed: where is it compared with where the user believes?
            if (e != null && e.seen == Seen.IN_VIEW && e.world != null) {
                val d = (e.world - believed).length
                when {
                    d <= moveM && b.lostSaid -> {
                        // It was said to be gone: say it is back, once it rests.
                        val held = if (e.resting) hold(State.BACK_PENDING, e.id) else 0L
                        if (e.resting && held >= confirmMs && mayAlert && alert == null) {
                            alert = Alert(Kind.BACK, b.label, "Your $name is back, ${describe(e)}.",
                                "seen again at its spot, resting for %d ms".format(held), b.worldId, e.id, b, held, e.world)
                            beliefs.found(b, e.id)
                            pending.remove(b.worldId)
                        } else {
                            statuses += Status(b.worldId, b.label, State.BACK_PENDING, held, "seen again at its spot")
                        }
                    }
                    d <= moveM -> {
                        pending.remove(b.worldId)
                        statuses += Status(b.worldId, b.label, State.OK, 0, "where the user believes (%.2f m)".format(d))
                    }
                    !e.resting -> {
                        pending.remove(b.worldId)
                        statuses += Status(b.worldId, b.label, State.MOVING, 0, "moving: waiting until it rests")
                    }
                    else -> {
                        val held = hold(State.MOVED_PENDING, e.id)
                        if (held >= confirmMs && mayAlert && alert == null) {
                            alert = Alert(if (b.lostSaid) Kind.BACK else Kind.MOVED, b.label, movedText(b, name, describe(e)),
                                "$name rests %.2f m from where the user believes, for %d ms".format(d, held), b.worldId, e.id, b, held, e.world)
                            beliefs.relocate(b, e.id, e.world, heightM, nowMs)
                            pending.remove(b.worldId)
                        } else {
                            statuses += Status(b.worldId, b.label, State.MOVED_PENDING, held, "rests %.2f m away".format(d), e.id)
                        }
                    }
                }
                continue
            }
            if (e != null && e.seen == Seen.IN_VIEW) {
                pending.remove(b.worldId)
                statuses += Status(b.worldId, b.label, State.UNKNOWN, 0, "in view but too near the horizon to place")
                continue
            }
            if (e != null && e.seen == Seen.OUT_OF_VIEW) {
                pending.remove(b.worldId)
                statuses += Status(b.worldId, b.label, State.OUT_OF_VIEW, 0, "camera looks elsewhere: no evidence")
                continue
            }

            // Not seen where it should be (or forgotten by the world map).
            val lastBox = e?.lastBox
            if (lastBox != null && occluders.any { covered(lastBox, it) >= coverShare }) {
                pending.remove(b.worldId)
                statuses += Status(b.worldId, b.label, State.HIDDEN, 0, "hidden by a hand or a person, not moved")
                continue
            }
            val sameClass = world.filter {
                it.label == b.label && it.seen == Seen.IN_VIEW && it.resting && it.statable && it.world != null && it.id !in known
            }
            // Re-found near its spot as a new world-map entry: the same object, nothing changed.
            val nearSpot = sameClass.firstOrNull { (it.world!! - believed).length <= moveM }
            if (nearSpot != null && b.lostSaid) {
                val held = hold(State.BACK_PENDING, nearSpot.id)
                if (held >= confirmMs && mayAlert && alert == null) {
                    alert = Alert(Kind.BACK, b.label, "Your $name is back, ${describe(nearSpot)}.",
                        "seen again at its spot, resting for %d ms".format(held), b.worldId, nearSpot.id, b, held, nearSpot.world)
                    beliefs.found(b, nearSpot.id)
                    pending.remove(b.worldId)
                } else {
                    statuses += Status(b.worldId, b.label, State.BACK_PENDING, held, "seen again at its spot")
                }
                continue
            }
            if (nearSpot != null) {
                pending.remove(b.worldId)
                beliefs.found(b, nearSpot.id)
                statuses += Status(nearSpot.id, b.label, State.OK, 0, "re-found at its spot")
                continue
            }
            val elsewhere = sameClass.minByOrNull { (it.world!! - believed).length }
            if (elsewhere != null) {
                val held = hold(State.MOVED_PENDING, elsewhere.id)
                if (held >= confirmMs && mayAlert && alert == null) {
                    val d = (elsewhere.world!! - believed).length
                    alert = Alert(if (b.lostSaid) Kind.BACK else Kind.MOVED, b.label, movedText(b, name, describe(elsewhere)),
                        "not at its spot; a $name rests %.2f m away for %d ms".format(d, held), b.worldId, elsewhere.id, b, held, elsewhere.world)
                    beliefs.relocate(b, elsewhere.id, elsewhere.world!!, heightM, nowMs)
                    pending.remove(b.worldId)
                } else {
                    statuses += Status(b.worldId, b.label, State.MOVED_PENDING, held, "a $name rests elsewhere", elsewhere.id)
                }
                continue
            }
            if (e == null) {
                pending.remove(b.worldId)
                statuses += Status(b.worldId, b.label, if (b.lostSaid) State.LOST else State.UNKNOWN, 0, "no longer in the world map")
                continue
            }
            if (b.lostSaid) {
                statuses += Status(b.worldId, b.label, State.LOST, 0, "already told the user")
                continue
            }
            // Last seen touching the frame's edge: it slid out of view as the camera moved, it was not taken
            // away (team, 1 Nov: "can't see" only for an object removed from the view, not one drifting out).
            if (lastBox != null && (lastBox.left <= EDGE || lastBox.top <= EDGE || lastBox.right >= 1f - EDGE || lastBox.bottom >= 1f - EDGE)) {
                pending.remove(b.worldId)
                statuses += Status(b.worldId, b.label, State.OUT_OF_VIEW, 0, "last seen at the frame's edge: out of view, not gone")
                continue
            }
            val otherInPlace = inPlace.any { it != b.worldId }
            // Only objects that vanished at about the same moment point to a camera move; one dropping out
            // at another time is a detector miss (warm phone, fewer runs: D32).
            val otherMissing = missing.any { (id, seenMs) -> id != b.worldId && kotlin.math.abs(seenMs - e.lastSeenMs) <= TOGETHER_MS }
            if (!otherInPlace && otherMissing) {
                pending.remove(b.worldId)
                statuses += Status(b.worldId, b.label, State.NOT_SEEN, 0, "other known objects vanished too: the camera moved")
                continue
            }
            // The evidence clock runs only while the camera holds still on the spot (D28).
            val p0 = pending[b.worldId]
            val moved = p0 != null && p0.state == State.NOT_SEEN && (
                camera.rotationDegS > STEADY_DEG_S ||
                    kotlin.math.abs(ai.saarthi.app.table.TableGeometry.wrap(camera.yawDeg - p0.yawDeg)) > STEADY_DRIFT_DEG ||
                    kotlin.math.abs(camera.tiltDeg - p0.tiltDeg) > STEADY_DRIFT_DEG)
            if (p0 == null || p0.state != State.NOT_SEEN || moved || camera.rotationDegS > STEADY_DEG_S) {
                pending[b.worldId] = Pending(State.NOT_SEEN, nowMs, null, camera.yawDeg, camera.tiltDeg)
            }
            val held = nowMs - pending[b.worldId]!!.sinceMs
            val needMs = if (otherInPlace) lostMs else lostAloneMs
            if (held >= needMs && mayAlert && alert == null) {
                alert = Alert(Kind.LOST, b.label, "I can't see your $name any more.",
                    "its spot is in view and uncovered; not seen for %d ms with the camera still%s".format(
                        held, if (otherInPlace) ", other objects in place" else ""), b.worldId, null, b, held, null)
                beliefs.markLostSaid(b, nowMs)
                pending.remove(b.worldId)
            } else {
                statuses += Status(b.worldId, b.label, State.NOT_SEEN, held,
                    if (camera.rotationDegS > STEADY_DEG_S) "spot in view, not seen; camera moving" else "spot in view, not seen")
            }
        }
        val liveIds = beliefs.snapshot().map { it.worldId }.toSet()
        pending.keys.retainAll(liveIds)
        peerUnits.keys.retainAll(liveIds)
        if (alert != null) lastAlertMs = nowMs
        return alert to statuses
    }

    /**
     * How far an object must be from its believed spot to count as moved. On a table seen at a shallow
     * angle, a degree of hand shake moves the computed spot by (d² + h²) / h per radian along the line
     * of sight; [shakeDeg] of that is noise, never a move (Vivo, 29 Oct: phone held near level).
     */
    fun moveThreshold(at: ai.saarthi.app.geometry.Vec2, heightM: Float): Float {
        val d2 = at.x * at.x + at.y * at.y
        val perDegree = (d2 + heightM * heightM) / heightM * (Math.PI.toFloat() / 180f)
        return maxOf(movedM, shakeDeg * perDegree)
    }

    /** "Heads up, your bottle was moved; it's now …", or "Your bottle is back, now …" after it was said to be gone. */
    private fun movedText(b: BeliefMap.Belief, name: String, where: String) =
        if (b.lostSaid) "Your $name is back, now $where." else "Heads up, your $name was moved; it's now $where."

    private fun covered(target: Box, by: Box): Float {
        val iw = (minOf(target.right, by.right) - maxOf(target.left, by.left)).coerceAtLeast(0f)
        val ih = (minOf(target.bottom, by.bottom) - maxOf(target.top, by.top)).coerceAtLeast(0f)
        return if (target.area <= 0f) 0f else iw * ih / target.area
    }
}
