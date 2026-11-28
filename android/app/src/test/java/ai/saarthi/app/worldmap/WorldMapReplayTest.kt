package ai.saarthi.app.worldmap

import ai.saarthi.app.brief.BriefComposer
import ai.saarthi.app.geometry.Box
import ai.saarthi.app.geometry.LabelledBox
import ai.saarthi.app.geometry.Vec3
import ai.saarthi.app.orientation.Pose
import ai.saarthi.app.perception.ObjectTracker
import ai.saarthi.app.table.CameraModel
import ai.saarthi.app.table.TableHeight
import org.junit.Assert.assertTrue
import org.junit.Test
import kotlin.math.cos
import kotlin.math.sin

/**
 * RECORDED replay: a real handheld session on the Vivo (29 Oct, 3.5 min, phone moved by hand around
 * a desk with a laptop, mouse, book and cup; see tools/results/phase2_handheld_20261029_122934.jsonl),
 * compacted by tools/extract_replay.py. The raw detections and poses go through the real tracker,
 * table height and world map, and a brief is composed every 5 s and at each recorded request.
 *
 * No ground truth was recorded for this session (the agent did not see the desk), so this guards
 * development invariants only: a brief stays within five items and no class is counted more than
 * twice. It is not evidence of accuracy. Development data, not held out.
 */
class WorldMapReplayTest {

    private class Run(val t: Long, val dets: List<LabelledBox>, val pose: Pose?)

    private fun load(): Pair<List<Run>, List<Long>> {
        val runs = ArrayList<Run>()
        val asks = ArrayList<Long>()
        javaClass.classLoader!!.getResourceAsStream("testdata/RECORDED_phase2_handheld_20261029_122934.jsonl")!!
            .bufferedReader().forEachLine { line ->
                // org.json is not available in JVM unit tests; the compact format is simple enough for regexes.
                val t = T.find(line)?.groupValues?.get(1)?.toLong() ?: return@forEachLine
                if ("\"event\"" in line) { asks += t; return@forEachLine }
                val dets = RAW.findAll(line.substringAfter("\"raw\":[").substringBefore("],\"pose\"")).map { r ->
                    val g = r.groupValues
                    LabelledBox(g[1], g[2].toFloat(), Box(g[3].toFloat(), g[4].toFloat(), g[5].toFloat(), g[6].toFloat()))
                }.toList()
                runs += Run(t, dets, POSE.find(line)?.groupValues?.get(1)?.split(',')?.map { it.toDouble() }?.let(::pose))
            }
        return runs to asks
    }

    /** The feed's tilt and roll give the down vector exactly: down = (cos t · sin r, cos t · cos r, sin t). */
    private fun pose(p: List<Double>): Pose {
        val tilt = Math.toRadians(p[0])
        val roll = Math.toRadians(p[1])
        val down = Vec3((cos(tilt) * sin(roll)).toFloat(), (cos(tilt) * cos(roll)).toFloat(), sin(tilt).toFloat())
        return Pose(down, p[2].toFloat(), p[3].toFloat(), p[4].toFloat(), 0L)
    }

    private companion object {
        val T = Regex(""""t":(\d+)""")
        val NUM = "(-?[0-9.]+(?:[eE]-?[0-9]+)?)"
        val RAW = Regex("""\["([^"]+)",$NUM,$NUM,$NUM,$NUM,$NUM]""")
        val POSE = Regex(""""pose":\[([^\]]+)]""")
    }

    @Test
    fun `a real handheld session keeps briefs short and never multiplies an object`() {
        val (runs, asks) = load()
        val cam = CameraModel.VIVO_480x640
        val tracker = ObjectTracker()
        val height = TableHeight()
        val map = WorldMap(cam)
        val composer = BriefComposer()
        val moments = (asks + (runs.first().t..runs.last().t step 5_000)).sorted().toMutableList()
        var briefs = 0
        var maxPerClass = 0
        var maxEntries = 0
        for (r in runs) {
            val tracks = tracker.update(r.dets, r.t)
            val pose = r.pose ?: continue
            val h = height.update(tracks.filter { it.confirmed && it.lastSeenMs == r.t && composer.whyNotStatable(it, tracks, r.t) == null }.map { it.label to it.box }, cam, pose)
            val world = map.update(tracks, pose, h.heightM, r.t) { t -> composer.whyNotStatable(t, tracks, r.t) }
            maxEntries = maxOf(maxEntries, world.size)
            while (moments.isNotEmpty() && moments.first() <= r.t) {
                moments.removeAt(0)
                val brief = composer.compose(Scene(tracks, world, pose.forwardYawDeg), r.t)
                val perClass = brief.items.maxOfOrNull { it.worldIds.size } ?: 0
                maxPerClass = maxOf(maxPerClass, perClass)
                briefs++
                println("RECORDED t+${(r.t - runs.first().t) / 1000}s tilt ${"%.0f".format(pose.tiltDeg)}° h=${"%.2f".format(h.heightM)}: ${brief.text}")
                assertTrue("five items at most", brief.items.size <= 5)
            }
        }
        println("RECORDED summary: briefs=$briefs, most of one class in a brief=$maxPerClass, most world entries at once=$maxEntries")
        assertTrue("an object counted three or more times: $maxPerClass", maxPerClass <= 2)
    }
}
