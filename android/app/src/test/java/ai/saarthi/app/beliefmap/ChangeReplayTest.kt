package ai.saarthi.app.beliefmap

import ai.saarthi.app.brief.BriefComposer
import ai.saarthi.app.geometry.Box
import ai.saarthi.app.geometry.LabelledBox
import ai.saarthi.app.geometry.Vec3
import ai.saarthi.app.orientation.Pose
import ai.saarthi.app.perception.ObjectTracker
import ai.saarthi.app.table.CameraModel
import ai.saarthi.app.table.TableHeight
import ai.saarthi.app.worldmap.Scene
import ai.saarthi.app.worldmap.WorldMap
import org.junit.Assert.assertTrue
import org.junit.Test
import kotlin.math.cos
import kotlin.math.sin

/**
 * RECORDED replay of the team's first Scenario 2 test on the Vivo (30 Oct, about 5 min, phone handheld
 * near level over a table with a cup, a bottle, a laptop and a mouse; the team moved the cup and the
 * bottle several times and reported many false "moved" alarms from camera shake; on the phone this
 * session produced 23 alerts). The detections and poses go through the current tracker, table
 * height, world map, belief map and change detector; the user is "told" at each recorded brief or
 * answer, as on the phone. The team did not log each move, so this counts alerts and guards against
 * a return to the old rate; it is not an accuracy measure. Development data.
 */
class ChangeReplayTest {

    private class Run(val t: Long, val dets: List<LabelledBox>, val pose: Pose?)

    /** Hand boxes by time (replays extracted since 1 Nov keep them; older ones have none), and the user's own ones (D58). */
    private val handsAt = java.util.TreeMap<Long, List<Box>>()
    private val ownAt = java.util.TreeMap<Long, List<Box>>()

    private fun load(file: String = "RECORDED_phase3_scenario2_20261030.jsonl"): Pair<List<Run>, List<Long>> {
        val runs = ArrayList<Run>()
        val told = ArrayList<Long>()
        handsAt.clear(); ownAt.clear()
        javaClass.classLoader!!.getResourceAsStream("testdata/$file")!!.bufferedReader().forEachLine { line ->
            val t = T.find(line)?.groupValues?.get(1)?.toLong() ?: return@forEachLine
            if ("\"event\"" in line) { told += t; return@forEachLine }
            if ("\"hands\"" in line) {
                val hs = BOX.findAll(line.substringAfter("\"hands\":")).map { g ->
                    val v = g.groupValues.drop(1).filter { it.isNotEmpty() }.map { it.toFloat() }
                    Box(v[0], v[1], v[2], v[3]) to (v.getOrNull(4) == 1f)
                }.toList()
                handsAt[t] = hs.map { it.first }
                ownAt[t] = hs.filter { it.second }.map { it.first }
                return@forEachLine
            }
            val dets = RAW.findAll(line.substringAfter("\"raw\":[").substringBefore("],\"pose\"")).map { r ->
                val g = r.groupValues
                LabelledBox(g[1], g[2].toFloat(), Box(g[3].toFloat(), g[4].toFloat(), g[5].toFloat(), g[6].toFloat()))
            }.toList()
            val p = POSE.find(line)?.groupValues?.get(1)?.split(',')?.map { it.toDouble() }
            runs += Run(t, dets, p?.let {
                val tilt = Math.toRadians(it[0]); val roll = Math.toRadians(it[1])
                Pose(Vec3((cos(tilt) * sin(roll)).toFloat(), (cos(tilt) * cos(roll)).toFloat(), sin(tilt).toFloat()), it[2].toFloat(), it[3].toFloat(), it[4].toFloat(), 0L)
            })
        }
        return runs to told
    }

    @Test
    fun `the team's shaky Scenario 2 session no longer raises an alarm every few seconds`() {
        val (runs, toldAt) = load()
        val cam = CameraModel.VIVO_480x640
        val tracker = ObjectTracker()
        val height = TableHeight()
        val map = WorldMap(cam)
        val composer = BriefComposer()
        val beliefs = BeliefMap()
        val changes = ChangeDetector()
        val pendingTells = toldAt.sorted().toMutableList()
        var alerts = 0
        var heights = ArrayList<Float>()
        for (r in runs) {
            val tracks = tracker.update(r.dets, r.t)
            val pose = r.pose ?: continue
            val h = height.update(tracks.filter { it.confirmed && it.lastSeenMs == r.t && composer.whyNotStatable(it, tracks, r.t) == null }.map { it.label to it.box }, cam, pose)
            heights += h.heightM
            val world = map.update(tracks, pose, h.heightM, r.t) { t -> composer.whyNotStatable(t, tracks, r.t) }
            while (pendingTells.isNotEmpty() && pendingTells.first() <= r.t) {
                pendingTells.removeAt(0)
                val brief = composer.compose(Scene(tracks, world, pose.forwardYawDeg), r.t)
                beliefs.told(world.filter { it.id in brief.items.flatMap { i -> i.worldIds } }, h.heightM, r.t)
            }
            val occluders = tracks.filter { it.label == "person" && r.t - it.lastSeenMs <= 500 }.map { it.box }
            val (alert, _) = changes.update(beliefs, world, occluders, r.t, pose.fastRotation, true, h.heightM,
                ChangeDetector.Camera(pose.yawDeg, pose.tiltDeg, pose.rotationDegS)) { "there" }
            if (alert != null) {
                alerts++
                println("RECORDED t+${(r.t - runs.first().t) / 1000}s ALERT ${alert.text} | ${alert.cause}")
            }
        }
        val sorted = heights.sorted()
        println("RECORDED summary: alerts=$alerts (23 on the phone with the old logic), told=${toldAt.size} times, " +
            "height p10..p90 = ${"%.2f".format(sorted[sorted.size / 10])}..${"%.2f".format(sorted[sorted.size * 9 / 10])} m")
        assertTrue("alerts: $alerts", alerts < 23)
    }

    @Test
    fun `the team's camera-move session no longer says can't see when only the camera moved`() {
        // RECORDED 30 Oct: the team moved the phone around the table; the phone (old rule) said
        // "I can't see your …" 8 times, most of them right after camera moves (D28). Some removals
        // in the session were real, and they were not logged, so only the drop is checked.
        val (runs, toldAt) = load("RECORDED_phase3_cameramove_20261030.jsonl")
        val cam = CameraModel.VIVO_480x640
        val tracker = ObjectTracker()
        val height = TableHeight()
        val map = WorldMap(cam)
        val composer = BriefComposer()
        val beliefs = BeliefMap()
        val changes = ChangeDetector()
        val tells = toldAt.sorted().toMutableList()
        val kinds = HashMap<ChangeDetector.Kind, Int>()
        for (r in runs) {
            val tracks = tracker.update(r.dets.map { it.copy(label = ai.saarthi.app.perception.SpokenNames.kitLabel(it.label)) }, r.t)
            val pose = r.pose ?: continue
            val h = height.update(tracks.filter { it.confirmed && it.lastSeenMs == r.t && composer.whyNotStatable(it, tracks, r.t) == null }.map { it.label to it.box }, cam, pose)
            val world = map.update(tracks, pose, h.heightM, r.t) { t -> composer.whyNotStatable(t, tracks, r.t) }
            while (tells.isNotEmpty() && tells.first() <= r.t) {
                tells.removeAt(0)
                val brief = composer.compose(Scene(tracks, world, pose.forwardYawDeg), r.t)
                beliefs.told(world.filter { it.id in brief.items.flatMap { i -> i.worldIds } }, h.heightM, r.t)
            }
            val occluders = tracks.filter { it.label == "person" && r.t - it.lastSeenMs <= 500 }.map { it.box }
            val (alert, _) = changes.update(beliefs, world, occluders, r.t, pose.fastRotation, true, h.heightM,
                ChangeDetector.Camera(pose.yawDeg, pose.tiltDeg, pose.rotationDegS)) { "there" }
            if (alert != null) {
                kinds[alert.kind] = (kinds[alert.kind] ?: 0) + 1
                println("RECORDED t+${(r.t - runs.first().t) / 1000}s ${alert.kind} ${alert.text} | ${alert.cause}")
            }
        }
        println("RECORDED summary (camera-move session): $kinds; the phone said 8 'can't see' with the old rule")
        assertTrue("lost: ${kinds[ChangeDetector.Kind.LOST]}", (kinds[ChangeDetector.Kind.LOST] ?: 0) < 8)
    }

    /**
     * Replays [file] through the current pipeline as the phone runs it (tracker, table height, world map,
     * belief map told at each brief, change detector with hands and people as occluders); returns each
     * alert with its seconds from the start. [runsPerS] thins the detector runs to what a warm phone
     * manages (D32: 6 → 3.5 runs a second after ~17 min; D59), keeping each run's own detections.
     */
    /**
     * Who may speak: D58's still-camera watch (own hands silent, its first stillness limits); D60's tuning of
     * it (no own-hand silence, looser stillness); that plus the change detector while the camera is still;
     * the Phase 4 change detector alone (**the app since D61**); the change detector only while still.
     */
    enum class Mode { D58, D60, HYBRID, PHASE4, PHASE4_STEADY }

    private fun replay(
        file: String, useSteadiness: Boolean = true, runsPerS: Double? = null, mode: Mode = Mode.PHASE4,
    ): List<Pair<Long, ChangeDetector.Alert>> {
        val (allRuns, toldAt) = load(file)
        val runs = if (runsPerS == null) allRuns else {
            var last = Long.MIN_VALUE / 2
            allRuns.filter { r -> (r.t - last >= 1000.0 / runsPerS).also { if (it) last = r.t } }
        }
        val cam = CameraModel.VIVO_480x640
        val tracker = ObjectTracker()
        val height = TableHeight()
        val map = WorldMap(cam)
        val composer = BriefComposer()
        val beliefs = BeliefMap()
        val changes = ChangeDetector()
        val steady = if (mode == Mode.D58) Steadiness(10f, 0.03f, 0.06f) else Steadiness()
        val watch = if (mode == Mode.D58) StillWatch(ownSilences = true) else StillWatch()
        val tells = toldAt.sorted().toMutableList()
        val out = ArrayList<Pair<Long, ChangeDetector.Alert>>()
        var handsDone = Long.MIN_VALUE
        for (r in runs) {
            // Each hand run as it comes, as on the phone (StillWatch.onHands, D59).
            for ((t, boxes) in ownAt.subMap(handsDone, false, r.t, true)) watch.onHands(boxes, t)
            handsDone = r.t
            val tracks = tracker.update(r.dets.map { it.copy(label = ai.saarthi.app.perception.SpokenNames.kitLabel(it.label)) }, r.t)
            val pose = r.pose ?: continue
            val h = height.update(tracks.filter { it.confirmed && it.lastSeenMs == r.t && composer.whyNotStatable(it, tracks, r.t) == null }.map { it.label to it.box }, cam, pose)
            val world = map.update(tracks, pose, h.heightM, r.t) { t -> composer.whyNotStatable(t, tracks, r.t) }
            while (tells.isNotEmpty() && tells.first() <= r.t) {
                tells.removeAt(0)
                val brief = composer.compose(Scene(tracks, world, pose.forwardYawDeg), r.t)
                beliefs.told(world.filter { it.id in brief.items.flatMap { i -> i.worldIds } }, h.heightM, r.t)
            }
            // Hand boxes stay fresh 450 ms, as on the phone (D32).
            val hands = handsAt.floorEntry(r.t)?.takeIf { r.t - it.key <= 450 }?.value ?: emptyList()
            val own = ownAt.floorEntry(r.t)?.takeIf { r.t - it.key <= 450 }?.value ?: emptyList()
            val occluders = hands + tracks.filter { it.label == "person" && r.t - it.lastSeenMs <= 500 }.map { it.box }
            val still = steady.update(tracks.filter { it.confirmed && it.lastSeenMs == r.t && it.label != "dining table" && it.label != "person" }
                .associate { it.id to it.box }, pose.rotationDegS, r.t)
            // D58: alerts come from the still-camera watch; the change detector keeps the belief map's statuses.
            val seen = tracks.filter { it.confirmed && it.lastSeenMs == r.t && it.label != "dining table" && it.label != "person" }
                .map { t -> StillWatch.Seen(t.id, t.label, t.box, world.firstOrNull { it.track?.id == t.id }?.id) }
            val watchSpeaks = useSteadiness && mode != Mode.PHASE4 && mode != Mode.PHASE4_STEADY
            val ev = if (watchSpeaks) watch.update(still >= StillWatch.HOLD_MS, seen, beliefs.snapshot().map { it.label }.toSet(),
                occluders, own, true, r.t) else null
            val changeMaySpeak = !useSteadiness || mode == Mode.PHASE4 ||
                ((mode == Mode.HYBRID || mode == Mode.PHASE4_STEADY) && still >= StillWatch.HOLD_MS)
            val (alert0, sts) = changes.update(beliefs, world, occluders, r.t, pose.fastRotation, changeMaySpeak, h.heightM,
                ChangeDetector.Camera(pose.yawDeg, pose.tiltDeg, pose.rotationDegS)) { "there" }
            val alert = alert0 ?: ev?.let { e ->
                val kind = when (e.kind) { StillWatch.Kind.MOVED -> ChangeDetector.Kind.MOVED; StillWatch.Kind.LOST -> ChangeDetector.Kind.LOST; StillWatch.Kind.BACK -> ChangeDetector.Kind.BACK }
                ChangeDetector.Alert(kind, e.label, "${e.kind} ${e.label}", e.cause, 0, null)
            }
            if (alert != null) {
                val s = (r.t - runs.first().t) / 1000
                out += s to alert
                println("RECORDED t+${s}s ${alert.kind} ${alert.text} | ${alert.cause}")
            }
        }
        return out
    }

    @Test
    fun `the false-alarm session - a handheld phone pointed at new things`() {
        // RECORDED 1 Nov 22:38 (team, Vivo, ~11 min; the phone handheld and pointed at the apple, the laptop
        // screen's apple picture and the watches): ~30 moved / can't see / back on the phone, almost all from
        // the phone moving. D58's still-camera watch cut this to 2, but on the team's 12 Nov tests with a stand
        // it missed and misnamed real moves; D61 returns to the change detector, which says 42 here. The demo
        // holds the phone in a stand for the moved-object moment. Guards against anything worse.
        val phase4 = replay("RECORDED_phase5_falsealarms_20261101.jsonl")
        val d58 = replay("RECORDED_phase5_falsealarms_20261101.jsonl", mode = Mode.D58)
        println("RECORDED summary (false-alarm session): ${phase4.size} alerts with the change detector (the app), ${d58.size} with D58's watch")
        assertTrue("change detector: ${phase4.size} alerts (42 measured)", phase4.size <= 42)
    }

    @Test
    fun `the theory-of-mind test session - real moves and removals said, camera moves not`() {
        // RECORDED 1 Nov (team, Vivo, ~8 min; cup, bottle, apple, mouse; the phone slid and was lowered at
        // times). Said on the phone: bottle moved at 292, 313 and 442 s (the team moved the bottle; 442
        // confirmed by the team), apple gone at 388 and back at 395, mouse gone at 412 and back at 451 (a
        // hand took each away with the camera still, from the middle of the frame), "your apple was
        // moved" at 447 s (unknown: it had rested 17-20 cm left of its told spot since 436 s), and one
        // false alarm caused by the camera, not the table: "your cup was moved" at 455 s (the phone tilted
        // and was lowered: the farthest object's computed spot jumped 20 cm; the team's screenshot; D45).
        val alerts = replay("RECORDED_phase45_tomtest_20261101.jsonl")
        fun said(kind: ChangeDetector.Kind, label: String, from: Long, to: Long) =
            alerts.any { (s, a) -> a.kind == kind && a.label == label && s in from..to }
        println("RECORDED summary (theory-of-mind session): ${alerts.size} alerts")
        assertTrue("apple gone at ~388 s", said(ChangeDetector.Kind.LOST, "apple", 383, 392))
        assertTrue("mouse gone at ~412 s", said(ChangeDetector.Kind.LOST, "mouse", 407, 416))
        assertTrue("bottle moved at ~442 s", said(ChangeDetector.Kind.MOVED, "bottle", 436, 446))
        assertTrue("no cup moved after the camera was lowered", !said(ChangeDetector.Kind.MOVED, "cup", 450, 470))
    }

    @Test
    fun `a warm phone's slower detector - what is still said`() {
        // D59 / Phase 5 step 4: the speaking rules at a warm phone's rate (RECORDED sessions thinned).
        val full = replay("RECORDED_phase5_falsealarms_20261101.jsonl").size
        for (rate in listOf(3.5, 3.0)) {
            val warm = replay("RECORDED_phase5_falsealarms_20261101.jsonl", runsPerS = rate)
            val tom = replay("RECORDED_phase45_tomtest_20261101.jsonl", runsPerS = rate)
            val today = replay("RECORDED_phase5_d60test_20261112.jsonl", runsPerS = rate)
            println("RECORDED summary at $rate runs/s: false-alarm session ${warm.size} (full rate $full); theory-of-mind " +
                tom.joinToString("; ") { (t, x) -> "${t}s ${x.kind} ${x.label}" } + "; 12 Nov ${today.size}: " +
                today.joinToString("; ") { (t, x) -> "${t}s ${x.kind} ${x.label}" })
            assertTrue("false-alarm session at $rate runs/s: ${warm.size} vs $full", warm.size <= full)
            assertTrue("mouse gone at ~412 s at $rate runs/s", tom.any { (s, a) -> a.kind == ChangeDetector.Kind.LOST && a.label == "mouse" && s in 407..418 })
        }
    }

    @Test
    fun `the team's 12 Nov test - the bottle's moves are said, the laptop at the frame edge is not lost`() {
        // RECORDED 12 Nov 04:48 (team, Vivo, phone in a hand-held stand; mostly the bottle moved, the apple taken
        // and put back). With D60's still-camera watch the phone said "your cup was moved" three times for bottle
        // moves and "can't see your laptop" twice for a laptop at the frame's edge. D61: the change detector.
        for (m in Mode.values()) for (f in listOf("RECORDED_phase5_d59test_20261112.jsonl", "RECORDED_phase5_d60test_20261112.jsonl")) {
            val a = replay(f, mode = m)
            println("RECORDED $f $m: ${a.size} alerts: " + a.joinToString("; ") { (t, x) -> "${t}s ${x.kind} ${x.label}" })
        }
        val a = replay("RECORDED_phase5_d60test_20261112.jsonl")
        val bottleMoves = a.count { (_, x) -> x.kind == ChangeDetector.Kind.MOVED && x.label == "bottle" }
        assertTrue("bottle moves said: $bottleMoves", bottleMoves >= 5)
        assertTrue("no 'can't see your laptop'", a.none { (_, x) -> x.kind == ChangeDetector.Kind.LOST && x.label == "laptop" })
    }

    private companion object {
        val BOX = Regex("""\[$NUM,$NUM,$NUM,$NUM(?:,$NUM)?]""")
        val T = Regex(""""t":(\d+)""")
        const val NUM = "(-?[0-9.]+(?:[eE]-?[0-9]+)?)"
        val RAW = Regex("""\["([^"]+)",$NUM,$NUM,$NUM,$NUM,$NUM]""")
        val POSE = Regex(""""pose":\[([^\]]+)]""")
    }
}
