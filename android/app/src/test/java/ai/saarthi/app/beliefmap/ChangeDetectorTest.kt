package ai.saarthi.app.beliefmap

import ai.saarthi.app.geometry.Box
import ai.saarthi.app.geometry.Vec2
import ai.saarthi.app.worldmap.Seen
import ai.saarthi.app.worldmap.WorldObject
import org.junit.Assert.assertEquals
import org.junit.Assert.assertNull
import org.junit.Assert.assertTrue
import org.junit.Test

/** Synthetic world-map states (labelled: built by hand, not device data) against the belief map. */
class ChangeDetectorTest {

    private fun obj(id: Int, label: String, at: Vec2?, seen: Seen = Seen.IN_VIEW, resting: Boolean = true,
                    box: Box = Box(0.4f, 0.4f, 0.5f, 0.6f), lastSeenMs: Long = 0) =
        WorldObject(id, label, seen, null, at, null, null, 0f, null, 0, lastSeenMs, null, resting, !resting, false, box)

    private val describe: (WorldObject) -> String = { "behind the laptop" }
    private val H = 0.4f

    private fun setup(): Pair<BeliefMap, ChangeDetector> {
        val beliefs = BeliefMap()
        beliefs.told(listOf(obj(1, "bottle", Vec2(0.2f, 0.3f))), H, 0)
        return beliefs to ChangeDetector()
    }

    private fun run(d: ChangeDetector, b: BeliefMap, world: List<WorldObject>, t: Long, occluders: List<Box> = emptyList(), canSpeak: Boolean = true,
                    camera: ChangeDetector.Camera = ChangeDetector.Camera.STILL) =
        d.update(b, world, occluders, t, fastRotation = false, canSpeak = canSpeak, heightM = H, camera = camera, describe = describe)

    @Test
    fun `the moved bottle is said once, after it rests a second at its new place`() {
        val (b, d) = setup()
        val moved = listOf(obj(1, "bottle", Vec2(0.0f, 0.6f)))
        assertNull(run(d, b, moved, 1_000).first)
        assertNull(run(d, b, moved, 1_500).first)
        val (alert, _) = run(d, b, moved, 2_100)
        assertEquals("Heads up, your bottle was moved; it's now behind the laptop.", alert!!.text)
        assertTrue(alert.cause.contains("rests"))
        // The user now knows: no repeat.
        assertNull(run(d, b, moved, 6_000).first)
        assertEquals(0.6f, b.snapshot().single().unit.y * H, 1e-5f)
    }

    @Test
    fun `the alert carries the false belief - where the user believed it, when told, how long the evidence held`() {
        val (b, d) = setup()
        val moved = listOf(obj(1, "bottle", Vec2(0.0f, 0.6f)))
        run(d, b, moved, 1_000)
        val alert = run(d, b, moved, 2_100).first!!
        assertEquals(0L, alert.before!!.sinceMs)
        assertEquals(0.3f, alert.before!!.unit.y * H, 1e-5f)
        assertEquals(1_100L, alert.evidenceMs)
        assertEquals(0.6f, alert.toWorldM!!.y, 1e-5f)
        // Gone: no "now".
        val (b2, d2) = setup()
        val gone = listOf(obj(1, "bottle", Vec2(0.2f, 0.3f), seen = Seen.NOT_SEEN))
        run(d2, b2, gone, 0)
        val lost = run(d2, b2, gone, 5_100).first!!
        assertNull(lost.toWorldM)
        assertEquals(5_100L, lost.evidenceMs)
    }

    @Test
    fun `an object last seen at the frame's edge slid out of view - never I can't see it`() {
        val (b, d) = setup()
        val gone = listOf(obj(1, "bottle", Vec2(0.2f, 0.3f), seen = Seen.NOT_SEEN, box = Box(0.85f, 0.4f, 0.995f, 0.6f)))
        for (t in 0L..10_000L step 250) {
            val (alert, st) = run(d, b, gone, t)
            assertNull(alert)
            assertEquals(ChangeDetector.State.OUT_OF_VIEW, st.single().state)
        }
    }

    @Test
    fun `while the camera height is changing, nothing counts, and no timer carries over`() {
        val (b, d) = setup()
        val moved = listOf(obj(1, "bottle", Vec2(0.0f, 0.6f)))
        // The height estimate falls 0.40 → 0.30 m over 1.5 s (phone lowered): no evidence once it has
        // changed by more than 10% within 1 s (from 750 ms on).
        for ((i, t) in (0L..1_500L step 250).withIndex()) {
            val (alert, st) = d.update(b, moved, emptyList(), t, false, true, 0.40f - i * 0.0167f, ChangeDetector.Camera.STILL, describe = describe)
            assertNull(alert)
            if (t >= 750) assertEquals(ChangeDetector.State.UNKNOWN, st.single().state)
        }
        // Settled: the evidence starts again from zero, so the alert waits its full 0.6 s.
        for (t in 3_000L..3_500L step 250) assertNull(d.update(b, moved, emptyList(), t, false, true, 0.30f, ChangeDetector.Camera.STILL, describe = describe).first)
        assertTrue(d.update(b, moved, emptyList(), 3_700L, false, true, 0.30f, ChangeDetector.Camera.STILL, describe = describe).first != null)
    }

    @Test
    fun `when every known object looks farther by the same share, it is the camera, not a move`() {
        val beliefs = BeliefMap()
        val told = listOf(obj(1, "cup", Vec2(0.06f, 0.41f)), obj(2, "bottle", Vec2(0.14f, 0.34f)), obj(3, "apple", Vec2(-0.09f, 0.32f)), obj(4, "mouse", Vec2(0.03f, 0.24f)))
        beliefs.told(told, H, 0)
        val d = ChangeDetector()
        // The team's 1 Nov case: all spots ×1.3, the farthest (cup) ×1.6 (tilt error grows with distance).
        val scaled = listOf(obj(1, "cup", Vec2(0.03f, 0.66f)), obj(2, "bottle", Vec2(0.18f, 0.45f)), obj(3, "apple", Vec2(-0.12f, 0.41f)), obj(4, "mouse", Vec2(0.03f, 0.31f)))
        for (t in 500L..5_000L step 250) assertNull(run(d, beliefs, scaled, t).first)
        // A real move among scaled objects is still a move.
        val cupMoved = scaled.map { if (it.id == 1) obj(1, "cup", Vec2(-0.35f, 0.40f)) else it }
        var said: ChangeDetector.Alert? = null
        for (t in 5_250L..7_000L step 250) said = said ?: run(d, beliefs, cupMoved, t).first
        assertEquals("cup", said!!.label)
    }

    @Test
    fun `while it is being carried, nothing is said`() {
        val (b, d) = setup()
        for (t in 0L..5_000L step 300) assertNull(run(d, b, listOf(obj(1, "bottle", Vec2(0.0f, 0.6f), resting = false)), t).first)
    }

    @Test
    fun `a hand over the bottle is hidden, never moved or gone`() {
        val (b, d) = setup()
        val gone = listOf(obj(1, "bottle", Vec2(0.2f, 0.3f), seen = Seen.NOT_SEEN))
        val hand = listOf(Box(0.35f, 0.35f, 0.6f, 0.7f))
        for (t in 0L..10_000L step 250) {
            val (alert, st) = run(d, b, gone, t, occluders = hand)
            assertNull(alert)
            assertEquals(ChangeDetector.State.HIDDEN, st.single().state)
        }
    }

    @Test
    fun `an uncovered empty spot becomes I can't see your bottle any more, once`() {
        val (b, d) = setup()
        val gone = listOf(obj(1, "bottle", Vec2(0.2f, 0.3f), seen = Seen.NOT_SEEN))
        assertNull(run(d, b, gone, 0).first)
        assertNull(run(d, b, gone, 2_000).first)
        // Alone on the table: 5 s with the camera still (D28).
        assertNull(run(d, b, gone, 4_100).first)
        assertEquals("I can't see your bottle any more.", run(d, b, gone, 5_100).first!!.text)
        assertNull(run(d, b, gone, 9_000).first)
    }

    @Test
    fun `taken away and put down elsewhere is found as moved`() {
        val (b, d) = setup()
        val world = listOf(obj(1, "bottle", Vec2(0.2f, 0.3f), seen = Seen.NOT_SEEN), obj(7, "bottle", Vec2(-0.3f, 0.5f)))
        assertNull(run(d, b, world, 0).first)
        val alert = run(d, b, world, 1_100).first!!
        assertEquals(ChangeDetector.Kind.MOVED, alert.kind)
        assertEquals(7, b.snapshot().single().worldId)
    }

    @Test
    fun `turning the camera away gives no evidence, and alerts wait while Saarthi speaks`() {
        val (b, d) = setup()
        for (t in 0L..10_000L step 500) assertNull(run(d, b, listOf(obj(1, "bottle", Vec2(0.2f, 0.3f), seen = Seen.OUT_OF_VIEW)), t).first)
        val moved = listOf(obj(1, "bottle", Vec2(0.0f, 0.6f)))
        run(d, b, moved, 11_000)
        assertNull(run(d, b, moved, 12_500, canSpeak = false).first)
        assertEquals(ChangeDetector.Kind.MOVED, run(d, b, moved, 12_800).first!!.kind)
    }

    @Test
    fun `small shifts are not moves`() {
        val (b, d) = setup()
        for (t in 0L..5_000L step 300) assertNull(run(d, b, listOf(obj(1, "bottle", Vec2(0.25f, 0.36f))), t).first)
    }

    @Test
    fun `a new height estimate never reads as a move`() {
        // Told at height 0.4 m; later the height reads 0.3 m, so every metre position shrinks by a quarter.
        val b = BeliefMap()
        b.told(listOf(obj(1, "bottle", Vec2(0.2f, 0.6f))), 0.4f, 0)
        val d = ChangeDetector()
        val rescaled = listOf(obj(1, "bottle", Vec2(0.15f, 0.45f)))
        for (t in 0L..6_000L step 300) assertNull(d.update(b, rescaled, emptyList(), t, false, true, 0.3f, ChangeDetector.Camera.STILL, describe = describe).first)
    }

    @Test
    fun `re-found near its spot as a new entry is the same object, not lost`() {
        val (b, d) = setup()
        val world = listOf(obj(1, "bottle", Vec2(0.2f, 0.3f), seen = Seen.NOT_SEEN), obj(9, "bottle", Vec2(0.25f, 0.38f)))
        for (t in 0L..6_000L step 300) assertNull(run(d, b, world, t).first)
        assertEquals(9, b.snapshot().single().worldId)
    }

    @Test
    fun `far and shallow, the move threshold grows with the shake it must ignore`() {
        val d = ChangeDetector()
        assertEquals(0.20f, d.moveThreshold(Vec2(0f, 0.4f), 0.4f), 1e-6f)
        assert(d.moveThreshold(Vec2(0f, 1.2f), 0.25f) > 0.25f)
    }

    @Test
    fun `after I can't see your bottle, putting it back is said`() {
        val (b, d) = setup()
        val gone = listOf(obj(1, "bottle", Vec2(0.2f, 0.3f), seen = Seen.NOT_SEEN))
        run(d, b, gone, 0)
        assertEquals(ChangeDetector.Kind.LOST, run(d, b, gone, 5_100).first!!.kind)
        // Put back at its spot (a new entry, as after the world map forgot it).
        val back = listOf(obj(5, "bottle", Vec2(0.21f, 0.31f)))
        assertNull(run(d, b, back, 9_000).first)
        val alert = run(d, b, back, 9_700).first!!
        assertEquals(ChangeDetector.Kind.BACK, alert.kind)
        assertEquals("Your bottle is back, behind the laptop.", alert.text)
        assertNull(run(d, b, back, 15_000).first)
    }

    @Test
    fun `put back somewhere else after it was gone`() {
        val (b, d) = setup()
        val gone = listOf(obj(1, "bottle", Vec2(0.2f, 0.3f), seen = Seen.NOT_SEEN))
        run(d, b, gone, 0)
        run(d, b, gone, 5_100)
        val elsewhere = listOf(obj(1, "bottle", Vec2(0.2f, 0.3f), seen = Seen.NOT_SEEN), obj(6, "bottle", Vec2(-0.3f, 0.6f)))
        run(d, b, elsewhere, 9_000)
        assertEquals("Your bottle is back, now behind the laptop.", run(d, b, elsewhere, 9_700).first!!.text)
    }

    private fun two(): Pair<BeliefMap, ChangeDetector> {
        val beliefs = BeliefMap()
        beliefs.told(listOf(obj(1, "bottle", Vec2(0.2f, 0.3f)), obj(2, "cup", Vec2(-0.2f, 0.3f), box = Box(0.1f, 0.4f, 0.2f, 0.6f))), H, 0)
        return beliefs to ChangeDetector()
    }

    @Test
    fun `moving the camera never makes an object gone`() {
        val (b, d) = two()
        // Both vanish together while the camera turns and slides: the camera moved.
        val bothGone = listOf(obj(1, "bottle", Vec2(0.2f, 0.3f), seen = Seen.NOT_SEEN), obj(2, "cup", Vec2(-0.2f, 0.3f), seen = Seen.NOT_SEEN))
        for (t in 0L..10_000L step 250) assertNull(run(d, b, bothGone, t, camera = ChangeDetector.Camera(t / 100f, 30f, 45f)).first)
        // Only the bottle missing but the camera keeps turning: the clock never runs.
        val bottleGone = listOf(obj(1, "bottle", Vec2(0.2f, 0.3f), seen = Seen.NOT_SEEN), obj(2, "cup", Vec2(-0.2f, 0.3f)))
        for (t in 10_000L..20_000L step 250) assertNull(run(d, b, bottleGone, t, camera = ChangeDetector.Camera(0f, 30f, 35f)).first)
    }

    @Test
    fun `taken away while the camera holds still, with the cup still in place, is said after 3 s`() {
        val (b, d) = two()
        val bottleGone = listOf(obj(1, "bottle", Vec2(0.2f, 0.3f), seen = Seen.NOT_SEEN), obj(2, "cup", Vec2(-0.2f, 0.3f)))
        val still = ChangeDetector.Camera(5f, 35f, 4f)
        assertNull(run(d, b, bottleGone, 0, camera = still).first)
        assertNull(run(d, b, bottleGone, 2_500, camera = still).first)
        val alert = run(d, b, bottleGone, 3_100, camera = still).first!!
        assertEquals("I can't see your bottle any more.", alert.text)
        assertTrue(alert.cause.contains("camera still"))
    }

    @Test
    fun `a camera that drifts away restarts the clock`() {
        val (b, d) = two()
        val bottleGone = listOf(obj(1, "bottle", Vec2(0.2f, 0.3f), seen = Seen.NOT_SEEN), obj(2, "cup", Vec2(-0.2f, 0.3f)))
        run(d, b, bottleGone, 0, camera = ChangeDetector.Camera(0f, 35f, 3f))
        // Slowly drifts 10° by 2.5 s: the evidence restarts there.
        assertNull(run(d, b, bottleGone, 2_500, camera = ChangeDetector.Camera(10f, 35f, 4f)).first)
        assertNull(run(d, b, bottleGone, 4_000, camera = ChangeDetector.Camera(10f, 35f, 3f)).first)
        assertEquals(ChangeDetector.Kind.LOST, run(d, b, bottleGone, 5_600, camera = ChangeDetector.Camera(10f, 35f, 3f)).first!!.kind)
    }

    @Test
    fun `a cup the detector dropped earlier does not hide a real removal`() {
        val (b, d) = two()
        // The cup has been missed since t=0 (detector glitch); the bottle is taken at t=5 s.
        val still = ChangeDetector.Camera(5f, 35f, 3f)
        val world = { t: Long -> listOf(
            obj(1, "bottle", Vec2(0.2f, 0.3f), seen = Seen.NOT_SEEN, lastSeenMs = 5_000),
            obj(2, "cup", Vec2(-0.2f, 0.3f), seen = Seen.NOT_SEEN, lastSeenMs = 0),
        ) }
        var said: ChangeDetector.Alert? = null
        for (t in 5_000L..12_000L step 250) run(d, b, world(t), t, camera = still).first?.let { if (it.label == "bottle") said = it }
        assertEquals(ChangeDetector.Kind.LOST, said!!.kind)
    }

    @Test
    fun `a relocated object never loops because older beliefs have camera drift, and still catches the next real move`() {
        val beliefs = BeliefMap()
        // Cup and apple were told earlier at t=0; bottle was relocated at t=30_000 (where it sits now).
        beliefs.told(listOf(obj(1, "cup", Vec2(0.09f, 0.30f)), obj(2, "apple", Vec2(-0.09f, 0.29f)), obj(3, "bottle", Vec2(-0.03f, 0.34f))), H, 0L)
        beliefs.relocate(beliefs.of(3)!!, 3, Vec2(-0.02f, 0.49f), H, 30_000L)
        val d = ChangeDetector()
        // Cup and apple show 1.43x drift since t=0 (under 20 cm so they stay OK), while the bottle sits still at its relocated spot.
        val steady = listOf(obj(1, "cup", Vec2(0.15f, 0.44f)), obj(2, "apple", Vec2(-0.095f, 0.42f)), obj(3, "bottle", Vec2(-0.018f, 0.492f)))
        for (t in 31_000L..45_000L step 250) assertNull(run(d, beliefs, steady, t).first)
        // Moving the bottle again for real must still trigger an alert once.
        val movedAgain = listOf(obj(1, "cup", Vec2(0.15f, 0.44f)), obj(2, "apple", Vec2(-0.095f, 0.42f)), obj(3, "bottle", Vec2(0.28f, 0.49f)))
        var secondAlert: ChangeDetector.Alert? = null
        for (t in 46_000L..48_000L step 250) secondAlert = secondAlert ?: run(d, beliefs, movedAgain, t).first
        assertEquals(ChangeDetector.Kind.MOVED, secondAlert!!.kind)
        assertEquals("bottle", secondAlert.label)
        for (t in 48_500L..56_000L step 250) assertNull(run(d, beliefs, movedAgain, t).first)
    }
}
