package ai.saarthi.app.brief

import ai.saarthi.app.geometry.Box
import ai.saarthi.app.geometry.LabelledBox
import ai.saarthi.app.perception.ObjectTracker
import ai.saarthi.app.perception.Track
import org.junit.Assert.assertEquals
import org.junit.Assert.assertTrue
import org.junit.Test

/**
 * RECORDED replay (PRD 9.1): the raw detections of the team's Phase 1 milestone session on the
 * Vivo (20 min, handheld, real table) go through the real tracker and brief composer, and the
 * brief is composed at each of the 40 moments the team actually tapped, plus the settle wait.
 *
 * This session was also used to choose the speaking rule (D12), so these are **development**
 * numbers: the test guards against regressions; it is not evidence of accuracy on new scenes.
 * Ground truth is the team's account of the session: real = cup, laptop, person, book, mouse,
 * keyboard, clock; false = classes that were not there.
 */
class BriefReplayTest {

    private val real = setOf("cup", "laptop", "person", "book", "mouse", "keyboard", "clock")
    private val notThere = setOf(
        "cat", "bed", "frisbee", "toilet", "sink", "refrigerator", "microwave", "sports ball", "dog",
        "elephant", "airplane", "bench", "couch", "teddy bear", "stop sign", "baseball bat", "car",
        "bird", "hair drier", "suitcase", "bowl",
    )

    private class Run(val t: Long, val dets: List<LabelledBox>)

    private val rawItem = Regex("""\["([^"]+)",([0-9.]+),([0-9.]+),([0-9.]+),([0-9.]+),([0-9.]+)]""")
    private val tField = Regex(""""t":(\d+),"type":"(detections|brief)"""")

    private fun load(): Pair<List<Run>, List<Long>> {
        val stream = javaClass.classLoader!!.getResourceAsStream("testdata/RECORDED_phase1_milestone_20261028_151250.jsonl")!!
        val runs = ArrayList<Run>()
        val taps = ArrayList<Long>()
        stream.bufferedReader().forEachLine { line ->
            val m = tField.find(line) ?: return@forEachLine
            val t = m.groupValues[1].toLong()
            if (m.groupValues[2] == "brief") { taps += t; return@forEachLine }
            val raw = line.substringAfter("\"raw\":[").substringBefore("],\"tracks\"")
            val dets = rawItem.findAll(raw).map { r ->
                val g = r.groupValues
                LabelledBox(g[1], g[2].toFloat(), Box(g[3].toFloat(), g[4].toFloat(), g[5].toFloat(), g[6].toFloat()))
            }.toList()
            runs += Run(t, dets)
        }
        return runs to taps
    }

    /** The tracker's state after the last detector run at or before each requested time. */
    private fun statesAt(runs: List<Run>, times: List<Long>): List<Pair<Long, List<Track>>> {
        val tracker = ObjectTracker()
        val out = ArrayList<Pair<Long, List<Track>>>()
        var next = 0
        var last: Pair<Long, List<Track>> = 0L to emptyList()
        val sorted = times.sorted()
        for (r in runs) {
            while (next < sorted.size && sorted[next] < r.t) { out += last; next++ }
            last = r.t to tracker.update(r.dets, r.t)
        }
        while (next < sorted.size) { out += last; next++ }
        return out
    }

    @Test
    fun `at the team's real taps the brief names real objects and nothing that was not there`() {
        val (runs, taps) = load()
        assertEquals(40, taps.size)
        val composer = BriefComposer()
        val settled = statesAt(runs, taps.map { it + SETTLE_MS })
        var realSaid = 0
        var falseSaid = 0
        var empty = 0
        for ((t, tracks) in settled) {
            val brief = composer.compose(tracks, t)
            val labels = brief.items.flatMap { item -> item.trackIds.map { id -> tracks.first { it.id == id }.label } }.toSet()
            realSaid += labels.count { it in real }
            falseSaid += labels.count { it in notThere }
            if (brief.items.isEmpty()) empty++
            println("RECORDED tap+${SETTLE_MS}ms: ${brief.text}")
        }
        println("RECORDED summary: real labels said=$realSaid, labels not there said=$falseSaid, empty briefs=$empty/${taps.size}")
        assertEquals("no object that was not there may be named", 0, falseSaid)
        // The Phase 1 v0 rule (D10) named 20 real labels at these taps (and one that was not there);
        // D12's rule must name more. Measured when written: 24 (D12 explains the 3 it leaves out).
        assertTrue("real labels said: $realSaid", realSaid > 20)
    }

    private companion object {
        const val SETTLE_MS = 700L
    }
}
