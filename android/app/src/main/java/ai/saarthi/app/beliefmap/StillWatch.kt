package ai.saarthi.app.beliefmap

import ai.saarthi.app.geometry.Box
import kotlin.math.hypot
import kotlin.math.max

/**
 * Unasked "moved" / "can't see" / "back", judged only within one still spell of the camera (D58, the
 * team's choice after the 1 Nov false alarms: "hold the phone still, then the object is moved").
 *
 * When the camera becomes still ([Steadiness]), the image boxes of the objects the user was told about
 * are taken as the reference. While it stays still, an object that leaves its box and comes to rest
 * elsewhere has moved; one that vanishes from an uncovered box is gone; one said to be gone that appears
 * again is back. Compared in the image of a still camera, nothing depends on the camera's height or on
 * the phone sliding, which caused the false alarms. When the camera moves, the reference is kept for a few
 * seconds and used again only if the camera returns to the same view (the other objects back in their
 * boxes); otherwise it is dropped: nothing is compared across two viewpoints. A move by the user's own hand is said
 * too (D60, team decision over PRD 5.1's edge case; [ownSilences] keeps D58's rule available).
 * Another known object must stay in its box (the camera really is still). Pure logic, tested off-device.
 */
class StillWatch(
    /** A move: the box centre shifts by at least this (frame fractions) … */
    private val minShift: Float = 0.08f,
    /** … and at least this share of the box's own size. */
    private val minShiftOfSize: Float = 0.6f,
    /** It must rest this long in its new place. */
    private val restMs: Long = 600L,
    /** Gone: not seen, uncovered, this long. */
    private val lostMs: Long = 2_500L,
    /** After the user's own hand covered it, a move or removal is theirs for this long. */
    private val ownMs: Long = 6_000L,
    private val gapMs: Long = 3_000L,
    private val coverShare: Float = 0.3f,
    /** A shaken camera that returns to the same view within this keeps its reference. */
    private val resumeMs: Long = 10_000L,
    /**
     * Whether the user's own hand silences a move or removal (D58). Off since D60 (team, 12 Nov): on stage a
     * teammate or the user moves the objects, and every move or removal must be said.
     */
    private val ownSilences: Boolean = false,
) {
    enum class Kind { MOVED, LOST, BACK }

    /** One object seen in this detector run: its track, class and box, and its world-map entry if any. */
    data class Seen(val trackId: Int, val label: String, val box: Box, val worldId: Int?)

    data class Event(val kind: Kind, val label: String, val seen: Seen?, val evidenceMs: Long, val cause: String)

    private var ref: MutableMap<String, Box>? = null
    private val lastBox = HashMap<String, Box>()
    private val restSince = HashMap<String, Long>()
    private val lostSince = HashMap<String, Long>()
    private val ownTouch = HashMap<String, Long>()
    /** Said to be gone, waiting to be seen again (kept across spells). */
    private val gone = HashSet<String>()
    private var lastEventMs = Long.MIN_VALUE / 2
    /** When the camera stopped being still (the reference is kept for [resumeMs] in case the view returns). */
    private var suspendedAtMs: Long? = null

    /**
     * One detector run. [still] = the camera has been held still long enough; [told] = classes the user was
     * told about; [occluders] = hands and people; [own] = the user's own hands. At most one event.
     */
    fun update(still: Boolean, seen: List<Seen>, told: Set<String>, occluders: List<Box>, own: List<Box>, canSpeak: Boolean, nowMs: Long): Event? {
        val byLabel = seen.groupBy { it.label }
        // Whose hand is on what: remembered per class for [ownMs].
        for ((label, box) in (ref ?: emptyMap<String, Box>()) + byLabel.mapValues { it.value.first().box }) {
            if (own.any { covered(box, it) >= coverShare }) ownTouch[label] = nowMs
        }
        ownTouch.entries.removeAll { nowMs - it.value > ownMs }
        if (!ownSilences) ownTouch.clear()
        if (!still) {
            // Suspended, not dropped: if the camera comes back to the same view soon (the phone shook while
            // someone moved the object), the old reference still holds.
            if (suspendedAtMs == null) suspendedAtMs = nowMs
            restSince.clear(); lostSince.clear()
            for ((l, s) in byLabel) lastBox[l] = s.first().box
            return null
        }
        val old = ref
        if (old != null && suspendedAtMs != null) {
            // Same view again? The other reference objects must be back in their boxes (D58).
            val back = old.count { (l, b) -> byLabel[l]?.singleOrNull()?.let { shift(it.box, b) < minShift } == true }
            val needed = minOf(2, old.size - 1)
            if (nowMs - suspendedAtMs!! > resumeMs || needed < 1 || back < needed) ref = null
        }
        suspendedAtMs = null
        val r = ref ?: byLabel.filter { (l, s) -> l in told && s.size == 1 }.mapValues { it.value.first().box }.toMutableMap().also { ref = it }
        val mayEvent = canSpeak && nowMs - lastEventMs >= gapMs
        var event: Event? = null

        // Back: a class said to be gone, seen again (one of it) and resting.
        for (label in gone.toList()) {
            val s = byLabel[label]?.singleOrNull() ?: continue
            if (!resting(label, s.box, nowMs)) continue
            if (nowMs - (restSince[label] ?: nowMs) < restMs) continue
            val own = ownTouch.containsKey(label)
            if (!own && (event != null || !mayEvent)) continue          // say it on a later run
            gone.remove(label)
            r[label] = s.box
            if (!own) event = Event(Kind.BACK, label, s, restMs, "seen again and resting, camera held still")
        }

        fun anchored(except: String) = r.any { (l, b) -> l != except && byLabel[l]?.singleOrNull()?.let { shift(it.box, b) < minShift } == true }

        for ((label, refBox) in r.toMap()) {
            val list = byLabel[label]
            if (list != null && list.size > 1) continue                    // two of a kind: ambiguous, say nothing
            val s = list?.single()
            if (s == null) {
                restSince.remove(label)
                if (occluders.any { covered(refBox, it) >= coverShare }) { lostSince.remove(label); continue }   // hidden
                val since = lostSince.getOrPut(label) { nowMs }
                if (nowMs - since < lostMs) continue
                r.remove(label); lostSince.remove(label)
                if (ownTouch.containsKey(label)) continue                 // the user took it: they know
                if (!anchored(label)) continue
                gone += label
                if (event == null && mayEvent) event = Event(Kind.LOST, label, null, nowMs - since, "its spot uncovered and empty for ${nowMs - since} ms, camera held still")
                continue
            }
            lostSince.remove(label)
            val moved = shift(s.box, refBox) >= max(minShift, minShiftOfSize * max(refBox.width, refBox.height))
            if (!moved) { restSince.remove(label); lastBox[label] = s.box; continue }
            if (!resting(label, s.box, nowMs)) continue
            val held = nowMs - restSince.getValue(label)
            if (held < restMs) continue
            r[label] = s.box
            restSince.remove(label)
            if (ownTouch.containsKey(label) || !anchored(label)) continue
            if (event == null && mayEvent) event = Event(Kind.MOVED, label, s, held, "left its spot and rests elsewhere for $held ms, camera held still")
        }
        if (event != null) lastEventMs = nowMs
        return event
    }

    /**
     * One hand run ([own] = the user's own hands), between detector runs. A hand seen in a single hand run
     * marks its touch even when no detector run falls inside the hand result's freshness (D59: a warm
     * phone's ~3.5 detector runs a second missed the user's own pick-up in the 1 Nov replay and said
     * "I can't see your apple"). Checked against the reference boxes and each object's latest box.
     */
    fun onHands(own: List<Box>, nowMs: Long) {
        if (own.isEmpty() || !ownSilences) return
        for ((label, box) in lastBox + (ref ?: emptyMap<String, Box>())) {
            if (own.any { covered(box, it) >= coverShare }) ownTouch[label] = nowMs
        }
    }

    /** Has [box] stayed put since the last run (and since when)? */
    private fun resting(label: String, box: Box, nowMs: Long): Boolean {
        val prev = lastBox[label]
        lastBox[label] = box
        val still = prev != null && shift(prev, box) < REST_SHIFT
        if (!still) restSince[label] = nowMs else restSince.putIfAbsent(label, nowMs)
        return true
    }

    private fun shift(a: Box, b: Box) = hypot((a.left + a.right - b.left - b.right) / 2f, (a.top + a.bottom - b.top - b.bottom) / 2f)

    private fun covered(target: Box, by: Box): Float {
        val iw = (minOf(target.right, by.right) - maxOf(target.left, by.left)).coerceAtLeast(0f)
        val ih = (minOf(target.bottom, by.bottom) - maxOf(target.top, by.top)).coerceAtLeast(0f)
        return if (target.area <= 0f) 0f else iw * ih / target.area
    }

    companion object {
        /** The camera must have been still this long before the watch starts (team: "still for 1-3 s"; D58). */
        const val HOLD_MS = 1_200L
        /** A box moving less than this between runs is resting. */
        private const val REST_SHIFT = 0.02f
    }
}
