package ai.saarthi.app.worldmap

import ai.saarthi.app.brief.BriefComposer
import ai.saarthi.app.geometry.Box
import ai.saarthi.app.geometry.Vec2
import ai.saarthi.app.geometry.Vec3
import ai.saarthi.app.intent.Answerer
import ai.saarthi.app.intent.IntentInterpreter
import ai.saarthi.app.orientation.Orientation
import ai.saarthi.app.orientation.Pose
import ai.saarthi.app.perception.Track
import ai.saarthi.app.table.CameraModel
import ai.saarthi.app.table.Reach
import ai.saarthi.app.table.TableGeometry
import org.junit.Assert.assertEquals
import org.junit.Assert.assertNotEquals
import org.junit.Assert.assertTrue
import org.junit.Test
import kotlin.math.cos
import kotlin.math.sin

/**
 * Synthetic scenes (labelled: built from chosen table positions, not device data): objects are put
 * on a table 0.4 m below a camera tilted 45°, their boxes are what the camera would see, and the
 * world map must recover where they are, keep them through tracker fragmentation and camera turns.
 */
class WorldMapTest {

    private val cam = CameraModel.VIVO_480x640
    private val h = 0.4f

    private fun pose(yaw: Float = 0f, tiltDeg: Double = 45.0): Pose {
        val a = Math.toRadians(tiltDeg)
        return Orientation.pose(Vec3(0f, cos(a).toFloat(), sin(a).toFloat()), yaw, forwardYawDeg = 0f)
    }

    /** The box an object [wM] wide and [hM] tall makes when its base is at world point [world]. */
    private fun boxAt(world: Vec2, p: Pose, wM: Float = 0.08f, hM: Float = 0.12f): Box {
        val c = TableGeometry.unturn(world, -p.yawDeg)
        val (f, right) = TableGeometry.axes(p.down)
        val base = right * c.x + f * c.y + p.down * h
        val (u, v) = cam.project(base)!!
        val (_, vt) = cam.project(base - p.down * hM)!!
        val half = cam.fx * wM / 2f / base.z / cam.w
        return Box(u - half, vt, u + half, v)
    }

    private fun track(id: Int, label: String, box: Box, now: Long, first: Long = now - 2_000) =
        Track(id, label, box, 0.8f, 10, first, now, true, recentHits = 8, recentRuns = 10, recentMeanScore = 0.8f)

    private val composer = BriefComposer()
    private fun rules(all: List<Track>, now: Long): (Track) -> String? = { t -> composer.whyNotStatable(t, all, now) }

    private fun run(map: WorldMap, tracks: List<Track>, p: Pose, now: Long) = map.update(tracks, p, h, now, rules(tracks, now))

    @Test
    fun `an object is placed where it is, and keeps its entry when the tracker splits it`() {
        val map = WorldMap(cam)
        val p = pose()
        val at = Vec2(0.10f, 0.35f)
        var w = emptyList<WorldObject>()
        for (i in 0..5) w = run(map, listOf(track(1, "cup", boxAt(at, p), 1_000L + i * 150)), p, 1_000L + i * 150)
        val cup = w.single()
        assertEquals(0.10f, cup.world!!.x, 0.01f)
        assertEquals(0.35f, cup.world!!.y, 0.01f)
        assertTrue("resting after 6 still sightings", cup.resting)
        // The tracker loses track 1 and starts track 7 on the same cup.
        val again = run(map, listOf(track(7, "cup", boxAt(Vec2(0.11f, 0.36f), p), 2_500)), p, 2_500)
        assertEquals(cup.id, again.single().id)
        assertEquals(7, again.single().track!!.id)
    }

    @Test
    fun `two cups apart are two entries`() {
        val map = WorldMap(cam)
        val p = pose()
        val w = run(map, listOf(track(1, "cup", boxAt(Vec2(-0.15f, 0.35f), p), 1_000), track(2, "cup", boxAt(Vec2(0.15f, 0.35f), p), 1_000)), p, 1_000)
        assertEquals(2, w.size)
        assertNotEquals(w[0].id, w[1].id)
    }

    @Test
    fun `turning away leaves an object out of view, not lost, and looking back finds the same entry`() {
        val map = WorldMap(cam)
        val ahead = pose(yaw = 0f)
        val at = Vec2(0f, 0.4f)
        run(map, listOf(track(1, "bottle", boxAt(at, ahead), 1_000)), ahead, 1_000)
        val id = run(map, listOf(track(1, "bottle", boxAt(at, ahead), 1_200)), ahead, 1_200).single().id
        // Turn 70° right: the bottle is far outside the 54° view; nothing is detected for 3 s.
        val away = pose(yaw = 70f)
        val w = run(map, emptyList(), away, 4_200)
        assertEquals(Seen.OUT_OF_VIEW, w.single().seen)
        // Turn back: a new track at the same place is the same entry.
        val back = run(map, listOf(track(9, "bottle", boxAt(at, ahead), 5_000)), ahead, 5_000)
        assertEquals(id, back.single().id)
        assertEquals(Seen.IN_VIEW, back.single().seen)
    }

    @Test
    fun `in view but not detected is not-seen, never silently present`() {
        val map = WorldMap(cam)
        val p = pose()
        run(map, listOf(track(1, "bottle", boxAt(Vec2(0f, 0.4f), p), 1_000)), p, 1_000)
        val w = run(map, emptyList(), p, 3_000)
        assertEquals(Seen.NOT_SEEN, w.single().seen)
    }

    @Test
    fun `a moving object is flagged moving and not resting`() {
        val map = WorldMap(cam)
        val p = pose()
        var w = emptyList<WorldObject>()
        for (i in 0..5) {
            val at = Vec2(-0.2f + i * 0.04f, 0.4f)
            w = run(map, listOf(track(1, "cup", boxAt(at, p), 1_000L + i * 150)), p, 1_000L + i * 150)
        }
        assertTrue(w.single().moving)
        assertTrue(!w.single().resting)
    }

    @Test
    fun `reach zones and clock directions from the body`() {
        val map = WorldMap(cam)
        val p = pose()
        // Body frame = world + 0.10 m forward (chest behind the camera).
        val w = run(map, listOf(
            track(1, "cup", boxAt(Vec2(0.20f, 0.20f), p), 1_000),
            track(2, "bottle", boxAt(Vec2(-0.05f, 0.55f), p), 1_000),
            track(3, "laptop", boxAt(Vec2(0f, 0.95f), p, wM = 0.32f, hM = 0.22f), 1_000),
        ), p, 1_000)
        val cup = w.first { it.label == "cup" }.placement(0f)!!
        val bottle = w.first { it.label == "bottle" }.placement(0f)!!
        val laptop = w.first { it.label == "laptop" }.placement(0f)!!
        assertEquals(Reach.WITHIN, cup.reach)
        assertEquals(1, cup.clock)                      // 34° right of ahead
        assertEquals(Reach.JUST_BEYOND, bottle.reach)   // 0.65 m
        assertEquals(12, bottle.clock)
        assertEquals(Reach.OUT, laptop.reach)
    }

    @Test
    fun `a bottle behind the laptop, a cup left of it`() {
        val map = WorldMap(cam)
        val p = pose()
        val w = run(map, listOf(
            track(1, "laptop", boxAt(Vec2(0f, 0.45f), p, wM = 0.32f, hM = 0.22f), 1_000),
            track(2, "bottle", boxAt(Vec2(0.03f, 0.70f), p), 1_000),
            track(3, "cup", boxAt(Vec2(-0.30f, 0.50f), p), 1_000),
        ), p, 1_000)
        val bottle = w.first { it.label == "bottle" }
        val cup = w.first { it.label == "cup" }
        assertEquals(Relations.Rel.BEHIND, Relations.of(bottle, w, 0f)!!.rel)
        assertEquals(Relations.Rel.LEFT_OF, Relations.of(cup, w, 0f)!!.rel)
    }

    @Test
    fun `a bottle next to the cup is right of the cup, not of the laptop farther away (D61)`() {
        val map = WorldMap(cam)
        val p = pose()
        val w = run(map, listOf(
            track(1, "laptop", boxAt(Vec2(-0.30f, 0.45f), p, wM = 0.32f, hM = 0.22f), 1_000),
            track(2, "cup", boxAt(Vec2(0f, 0.50f), p), 1_000),
            track(3, "bottle", boxAt(Vec2(0.12f, 0.50f), p), 1_000),
        ), p, 1_000)
        val r = Relations.of(w.first { it.label == "bottle" }, w, 0f)!!
        assertEquals("cup", r.anchorLabel)
        assertEquals(Relations.Rel.RIGHT_OF, r.rel)
    }

    @Test
    fun `the brief places each object by clock and reach, and finds say the relation`() {
        val map = WorldMap(cam)
        val p = pose()
        val tracks = listOf(
            track(1, "laptop", boxAt(Vec2(0f, 0.45f), p, wM = 0.32f, hM = 0.22f), 1_000),
            // A tall bottle: its box rises above the laptop's, so it is not "inside the laptop's box".
            track(2, "bottle", boxAt(Vec2(0.03f, 0.70f), p, hM = 0.25f), 1_000),
            track(3, "cup", boxAt(Vec2(0.12f, 0.20f), p), 1_000),
        )
        val w = run(map, tracks, p, 1_000)
        val scene = Scene(tracks, w, 0f)
        val brief = composer.compose(scene, 1_000)
        assertEquals(
            "A cup slightly to your right, within reach; a laptop in front of you, just beyond reach; a bottle in front of you, out of reach.",
            brief.text,
        )
        val answer = Answerer(composer).answer(IntentInterpreter.interpret("where is my bottle"), scene, 1_000, null).text
        assertEquals("The bottle is in front of you, out of reach, behind the laptop.", answer)
        assertEquals("Within reach: a cup slightly to your right.",
            Answerer(composer).answer(IntentInterpreter.interpret("what can I reach"), scene, 1_000, null).text)
        assertEquals("On your right: a cup slightly to your right, within reach.",
            Answerer(composer).answer(IntentInterpreter.interpret("what is on my right"), scene, 1_000, null).text)
    }

    @Test
    fun `an object out of view is still described for a while, and a find says when it was seen`() {
        val map = WorldMap(cam)
        val ahead = pose()
        // Watched for 2 s (a glimpse is not recalled), then the camera turns away.
        for (t in 1_000L..3_000L step 500) run(map, listOf(track(1, "cup", boxAt(Vec2(0.1f, 0.3f), ahead), t)), ahead, t)
        val w = run(map, emptyList(), pose(yaw = -80f), 8_000)
        val scene = Scene(emptyList(), w, 0f)
        assertEquals("A cup slightly to your right, within reach.", composer.compose(scene, 8_000).text)
        assertEquals("The cup was slightly to your right, within reach, 5 seconds ago.",
            Answerer(composer).answer(IntentInterpreter.interpret("where is the cup"), scene, 8_000, null).text)
        assertEquals(BriefComposer.NOTHING, composer.compose(scene, 30_000).text)
    }

    @Test
    fun `people across the table and on a side`() {
        val map = WorldMap(cam)
        val p = pose(tiltDeg = 20.0)
        val tracks = listOf(
            track(1, "dining table", Box(0f, 0.3f, 1f, 1f), 1_000),
            track(2, "person", Box(0.40f, 0.0f, 0.60f, 0.35f), 1_000),
            track(3, "person", Box(0.0f, 0.0f, 0.20f, 0.50f), 1_000),
        )
        val w = run(map, tracks, p, 1_000)
        val scene = Scene(tracks, w, 0f)
        assertEquals("You're at a table. Two people: one across the table, one on your left.", composer.compose(scene, 1_000).text)
    }

    @Test
    fun `a new height estimate rescales the map, and the same object still matches`() {
        val map = WorldMap(cam)
        val p = pose()
        val box = boxAt(Vec2(0f, 0.4f), p)
        val first = map.update(listOf(track(1, "cup", box, 1_000)), p, 0.4f, 1_000, rules(emptyList(), 1_000)).single()
        // Same box, but rulers now say the camera is 0.3 m above the table: 3/4 of the distance.
        val second = map.update(listOf(track(5, "cup", box, 1_200)), p, 0.3f, 1_200, rules(emptyList(), 1_200)).single()
        assertEquals(first.id, second.id)
        assertEquals(0.3f, second.world!!.y, 0.01f)
    }

    @Test
    fun `an object remembered out of view is not counted again when one like it is in view`() {
        val map = WorldMap(cam)
        val ahead = pose()
        run(map, listOf(track(1, "cup", boxAt(Vec2(0f, 0.4f), ahead), 1_000)), ahead, 1_000)
        // Turn right; a cup is seen there (perhaps the same one, perhaps not).
        val right = pose(yaw = 60f)
        val there = TableGeometry.cameraToWorld(Vec2(0f, 0.4f), right)
        val tracks = listOf(track(2, "cup", boxAt(there, right), 2_000))
        val w = run(map, tracks, right, 2_000)
        assertEquals(2, w.size)
        val brief = composer.compose(Scene(tracks, w, 0f), 2_000)
        assertEquals(1, brief.items.single().worldIds.size)
        assertTrue(brief.leftOut.any { it.reason == "out of view; may be the one in view" })
    }

    @Test
    fun `entries split by a pan are merged, but objects once seen together never are`() {
        val map = WorldMap(cam)
        val p = pose()
        // Two cups seen together: always two.
        run(map, listOf(track(1, "cup", boxAt(Vec2(-0.08f, 0.4f), p), 1_000), track(2, "cup", boxAt(Vec2(0.08f, 0.4f), p), 1_000)), p, 1_000)
        // A bottle seen once, then (after a pan) re-found 0.25 m away as a new entry: one bottle.
        run(map, listOf(track(3, "bottle", boxAt(Vec2(0f, 0.5f), p), 1_000)), p, 1_000)
        val away = pose(yaw = 80f)
        run(map, emptyList(), away, 2_000)
        val w = run(map, listOf(track(9, "bottle", boxAt(Vec2(0.25f, 0.55f), p), 3_000)), p, 3_000)
        assertEquals(1, w.count { it.label == "bottle" })
        assertEquals(2, w.count { it.label == "cup" })
    }

    @Test
    fun `a repeated brief says only what changed, or that nothing did`() {
        val map = WorldMap(cam)
        val p = pose()
        val tracks = listOf(
            track(1, "laptop", boxAt(Vec2(0f, 0.45f), p, wM = 0.32f, hM = 0.22f), 1_000),
            track(3, "cup", boxAt(Vec2(0.12f, 0.20f), p), 1_000),
        )
        val w = run(map, tracks, p, 1_000)
        val scene = Scene(tracks, w, 0f)
        val cup = w.first { it.label == "cup" }.id
        val laptop = w.first { it.label == "laptop" }.id
        assertEquals("A laptop in front of you, just beyond reach. Nothing else has changed.",
            composer.compose(scene, 1_000, known = setOf(cup)).text)
        val same = composer.compose(scene, 1_000, known = setOf(cup, laptop))
        assertTrue(same.text, same.text.startsWith("Same as before: ") && "a cup" in same.text && "a laptop" in same.text)
        assertEquals(setOf(cup, laptop), same.unchanged.toSet())
    }
}
