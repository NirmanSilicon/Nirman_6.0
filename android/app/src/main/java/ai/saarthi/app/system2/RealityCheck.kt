package ai.saarthi.app.system2

import ai.saarthi.app.geometry.Box
import ai.saarthi.app.orientation.Pose
import ai.saarthi.app.perception.SpokenNames
import ai.saarthi.app.perception.Track
import ai.saarthi.app.table.CameraModel
import ai.saarthi.app.worldmap.Seen
import ai.saarthi.app.worldmap.WorldObject

/**
 * System 2's verdict on one world-map object (docs/SYSTEM2.md 3): the detector's guess, the evidence
 * for and against "real", the decision, and the reasons, for speech and the Mind view.
 */
data class Assessment(
    val worldId: Int,
    val label: String,
    /** The live track, or null while the object is out of view. */
    val trackId: Int?,
    /** System 1's smoothed score (not yet calibrated: Phase 4 step 6). */
    val s1Score: Float?,
    val llr: Float,
    val pReal: Float,
    val verdict: Verdict,
    val cues: List<Ledger.CueSum>,
    /** The screen it was last seen inside ("laptop", "tv", "cell phone"), or null. */
    val screen: String?,
    /** Cues shown but not counted: evidence against "real" counts only once it was seen inside a screen (D37). */
    val uncounted: Set<Cue> = emptySet(),
    /** Physical plausibility: its median width on the table, or null until measured (D41). */
    val size: Size? = null,
) {
    /** [widthM] = median of [readings] widths; [plausible] = it fits the class. */
    data class Size(val widthM: Float, val readings: Int, val plausible: Boolean)

    /**
     * Why it may not be stated as a real object now; null if nothing argues against it. Since D42 the
     * background cues never hold an object back: only a picture proven by the torch (asked for) or a
     * size that does not fit.
     */
    val doubt: String?
        get() = when {
            verdict == Verdict.PICTURE -> "a picture (System 2: real %.2f)".format(pReal)
            size != null && !size.plausible -> "its size does not fit ${ai.saarthi.app.brief.BriefComposer.article(SpokenNames.of(label))} ${SpokenNames.of(label)} (%.0f cm wide)".format(size.widthM * 100f)
            else -> null
        }
}

/**
 * Runs the real-vs-picture checks on each detector run and keeps their evidence in the [Ledger].
 * Cues: screen containment; moves as one plane ([PlanarMotion], between this run's frame and the
 * previous run's); light from the area around it. Not thread-safe: call [update] from the detector
 * thread; the returned map is immutable and may be shared.
 */
class RealityCheck(val ledger: Ledger = Ledger()) {

    /** The last planar-motion measurement, for the session log (detector thread). */
    var lastPlane: Pair<Int, PlanarMotion.Result>? = null
        private set

    /** Plane measurements so far per object: the one with fewest goes next (one object per run, to spare the CPU). */
    private val planeTries = HashMap<Int, Int>()

    /** Recent width readings per object (D41). */
    private val widths = HashMap<Int, ArrayDeque<Float>>()

    /**
     * Assessments by world id, for every object that is not a screen, a table or out of the map.
     * [cur] is this run's grey frame and [prev] the previous run's, taken [prevAgeMs] earlier with the
     * phone at [prevPose]; [cam] turns the poses into the image motion of turning ([RotationFlow]).
     * [tableHeightM] = the camera's height above the table when measured from rulers, else null (no size check).
     */
    fun update(
        world: List<WorldObject>, tracks: List<Track>, pose: Pose?, nowMs: Long,
        cur: Gray? = null, prev: Gray? = null, prevAgeMs: Long = 0L, prevPose: Pose? = null, cam: CameraModel? = null,
        tableHeightM: Float? = null,
    ): Map<Int, Assessment> {
        val view = pose?.let { View(it.yawDeg, it.tiltDeg) }
        val screens = tracks.filter { it.label in SCREENS && it.hits >= 2 && nowMs - it.lastSeenMs <= SCREEN_FRESH_MS }
        val fresh = world.filter { it.seen == Seen.IN_VIEW && it.track?.lastSeenMs == nowMs }
        val sceneMedian = cur?.median()
        lastPlane = null

        // Moves as one plane: one standing object per run, the least measured first.
        // Without both poses the phone's turning cannot be told from its shifting: no reading at all (D37).
        val rot = if (pose != null && prevPose != null && cam != null && cur != null) RotationFlow.between(prevPose, pose, cam, cur.w, cur.h) else null
        val pairOk = cur != null && prev != null && rot != null && prevAgeMs in PAIR_MIN_MS..PAIR_MAX_MS && !pose!!.fastRotation
        if (pairOk) {
            fresh.filter { it.label in STANDING && it.track!!.box.bottom < 0.98f }
                .minByOrNull { planeTries[it.id] ?: 0 }
                ?.let { o ->
                    planeTries[o.id] = (planeTries[o.id] ?: 0) + 1
                    val others = fresh.filter { it.id != o.id && it.label !in SCREENS && it.label != "dining table" }.map { it.track!!.box }
                    PlanarMotion.measure(prev!!, cur!!, o.track!!.box, others, rot = rot)?.let { r ->
                        lastPlane = o.id to r
                        when {
                            r.ratio <= PlanarMotion.FLAT_RATIO -> ledger.observe(o.id, Cue.PLANE, PlanarMotion.FLAT_LLR,
                                "moves as one flat plane with its surroundings as the phone shifts (%.2f)".format(r.ratio), nowMs, view)
                            r.ratio >= PlanarMotion.STANDS_OUT_RATIO -> ledger.observe(o.id, Cue.PLANE, PlanarMotion.STANDS_OUT_LLR,
                                "stands out from its surroundings as the phone shifts (%.2f)".format(r.ratio), nowMs, view)
                        }
                    }
                }
        }

        val out = HashMap<Int, Assessment>()
        for (o in world) {
            if (o.label in SCREENS || o.label == "dining table") continue
            var screen: String? = null
            val t = o.track
            if (o.seen == Seen.IN_VIEW && t != null && t.lastSeenMs == nowMs) {
                Containment.of(t.box, screens)?.let { hit ->
                    screen = hit.screen
                    ledger.observe(o.id, Cue.IN_SCREEN, hit.llr, hit.detail, nowMs, view)
                }
                if (pose != null && cam != null && tableHeightM != null && !pose.fastRotation && o.label in SizeCheck.WIDTH_M) {
                    SizeCheck.widthM(t.box, cam, pose, tableHeightM)?.let { w ->
                        val q = widths.getOrPut(o.id) { ArrayDeque() }
                        q.addLast(w)
                        if (q.size > SizeCheck.KEEP) q.removeFirst()
                    }
                }
                if (o.label in STANDING && cur != null && sceneMedian != null) {
                    ringLight(cur, t.box, sceneMedian)?.let { ratio ->
                        if (ratio >= LIGHT_RATIO) ledger.observe(o.id, Cue.SCREEN_LIGHT, LIGHT_LLR,
                            "the area around it gives off light (%.2f x the scene)".format(ratio), nowMs, view)
                    }
                }
            }
            val s = ledger.assess(o.id, nowMs)
            val size = widths[o.id]?.takeIf { it.size >= SizeCheck.NEEDED }?.let { q ->
                val m = q.sorted()[q.size / 2]
                Assessment.Size(m, q.size, SizeCheck.plausible(o.label, m) ?: true)
            }
            // Shown only with evidence about it: a picture cue, or a size that does not fit.
            if (s.cues.isEmpty() && (size == null || size.plausible)) continue
            val d = decide(s.cues, ledger)
            out[o.id] = Assessment(o.id, o.label, t?.id, t?.score, d.llr, ledger.probability(d.llr), d.verdict, s.cues, screen, d.uncounted, size)
        }
        val ids = world.map { it.id }.toSet()
        ledger.retain(ids)
        planeTries.keys.retainAll(ids)
        widths.keys.retainAll(ids)
        return out
    }

    /** Mean brightness of a ring around [box] (1.6 box sizes, the box cut out) against the scene's median. */
    private fun ringLight(g: Gray, box: Box, sceneMedian: Float): Float? {
        val w = g.w.toFloat()
        val h = g.h.toFloat()
        val cx = (box.left + box.right) / 2f * w
        val cy = (box.top + box.bottom) / 2f * h
        val bw = box.width * w * LIGHT_RING / 2f
        val bh = box.height * h * LIGHT_RING / 2f
        val m = g.mean(floatArrayOf(cx - bw, cy - bh, cx + bw, cy + bh), listOf(floatArrayOf(box.left * w, box.top * h, box.right * w, box.bottom * h)))
        return m?.let { it / (sceneMedian + 1f) }
    }

    /** What the evidence decides, and which cues it left uncounted. */
    data class Decision(val llr: Float, val verdict: Verdict, val uncounted: Set<Cue>)

    companion object {
        /**
         * The decision rules (D37, after the team's test of 31 Oct: a real cup before a white wall called
         * a picture). Evidence for "real" always counts. Evidence against it (moves as one plane, light
         * around it) counts **only once the object was seen inside a screen's box**: brightness and
         * motion alone never hold back or "correct" a real object. "Picture" needs the bound **and**
         * the torch's "gives off its own light" (D42): the background cues alone never decide it.
         */
        fun decide(cues: List<Ledger.CueSum>, ledger: Ledger): Decision {
            // D38: the torch tests "is it on a screen?" directly, so it overrules the indirect hints.
            // Light from the object itself is a screen, with or without a screen box (the detector
            // rarely boxes a judge's phone); reflecting the torch like the table means not a screen,
            // so a box around it (a real apple in front of the laptop, team test 31 Oct) stops counting.
            val torch = cues.firstOrNull { it.cue == Cue.TORCH }?.llr ?: 0f
            val emits = torch < 0f
            val inScreen = emits || (torch <= 0f && cues.any { it.cue == Cue.IN_SCREEN })
            val uncounted = if (inScreen) emptySet() else cues.filter { it.llr < 0f }.map { it.cue }.toSet()
            val llr = cues.filter { it.cue !in uncounted }.sumOf { it.llr.toDouble() }.toFloat()
            // D42 (team, after an unasked "Correction: the cup … is a picture" on a real cup before a
            // white wall): "picture" only from the torch, which runs only when the user asks. The
            // background cues (box, light around it, flat motion) still gather and show on the Mind
            // view, but never make a picture by themselves.
            val verdict = when {
                llr >= ledger.upper -> Verdict.REAL
                llr <= ledger.lower && emits -> Verdict.PICTURE
                else -> Verdict.UNSURE
            }
            return Decision(llr, verdict, uncounted)
        }

        val SCREENS = setOf("laptop", "tv", "cell phone")
        /** Objects that stand up from the table: a flat real object (a book) would look like a picture. */
        val STANDING = setOf("apple", "banana", "cup", "bottle")
        /** The previous frame must be this recent (not across a pause) and not the same moment. */
        const val PAIR_MIN_MS = 80L
        const val PAIR_MAX_MS = 400L
        /** Clips of 31 Oct: rings around pictures 1.12-2.3 x the scene's median, around real apples 0.84-1.10. */
        const val LIGHT_RATIO = 1.15f
        const val LIGHT_LLR = -0.8f
        private const val LIGHT_RING = 1.6f
        /** A screen box this recent still counts (the detector misses a phone's box most runs: probe, 31 Oct). */
        const val SCREEN_FRESH_MS = 500L
    }
}

/**
 * Screen containment (docs/SYSTEM2.md 4.2): an object's box lying inside a laptop's, a tv's or a
 * phone's box may be a picture on that screen. Weights are starting values from the probe of
 * 31 Oct (an apple picture on the laptop lay inside a laptop or tv box in about half the runs; the
 * real apple almost never), to be tuned on held-out recordings.
 */
object Containment {

    data class Hit(val screen: String, val fraction: Float, val llr: Float, val detail: String)

    fun of(box: Box, screens: List<Track>): Hit? {
        var best: Hit? = null
        for (s in screens) {
            if (box.area >= s.box.area) continue
            val f = containedFraction(box, s.box)
            if (f < MIN_INSIDE) continue
            val central = s.label == "cell phone" && centreOffset(box, s.box) <= PHONE_CENTRE
            val llr = if (central) PHONE_LLR else SCREEN_LLR
            val name = if (s.label == "cell phone") "phone" else s.label
            val hit = Hit(s.label, f, llr, if (central) "near the centre of a $name's box" else "inside a $name's box")
            if (best == null || hit.llr < best.llr) best = hit
        }
        return best
    }

    fun containedFraction(inner: Box, outer: Box): Float {
        val iw = (minOf(inner.right, outer.right) - maxOf(inner.left, outer.left)).coerceAtLeast(0f)
        val ih = (minOf(inner.bottom, outer.bottom) - maxOf(inner.top, outer.top)).coerceAtLeast(0f)
        return if (inner.area <= 0f) 0f else iw * ih / inner.area
    }

    /** Distance of the inner box's centre from the outer box's centre, in outer-box half-sizes (0 = centred, 1 = at an edge). */
    private fun centreOffset(inner: Box, outer: Box): Float {
        val dx = ((inner.left + inner.right) - (outer.left + outer.right)) / 2f / (outer.width / 2f)
        val dy = ((inner.top + inner.bottom) - (outer.top + outer.bottom)) / 2f / (outer.height / 2f)
        return maxOf(kotlin.math.abs(dx), kotlin.math.abs(dy))
    }

    const val MIN_INSIDE = 0.9f
    const val SCREEN_LLR = -1.2f
    const val PHONE_LLR = -1.5f
    private const val PHONE_CENTRE = 0.5f
}
