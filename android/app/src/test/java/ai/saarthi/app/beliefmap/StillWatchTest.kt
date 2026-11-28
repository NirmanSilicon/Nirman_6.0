package ai.saarthi.app.beliefmap

import ai.saarthi.app.geometry.Box
import org.junit.Assert.assertEquals
import org.junit.Assert.assertNull
import org.junit.Assert.assertTrue
import org.junit.Test

/** Synthetic detector runs (labelled: built by hand, not device data), 5 per second, three told objects. */
class StillWatchTest {

    private val told = setOf("bottle", "cup", "apple")
    private fun box(x: Float, y: Float) = Box(x - 0.06f, y - 0.08f, x + 0.06f, y + 0.08f)
    private fun scene(bottle: Box?, dx: Float = 0f) = listOfNotNull(
        bottle?.let { StillWatch.Seen(1, "bottle", Box(it.left + dx, it.top, it.right + dx, it.bottom), 1) },
        StillWatch.Seen(2, "cup", box(0.5f + dx, 0.5f), 2),
        StillWatch.Seen(3, "apple", box(0.75f + dx, 0.6f), 3),
    )

    /** Runs [ms] of [frame] every 200 ms from [from]; returns the events. */
    private fun run(w: StillWatch, from: Long, ms: Long, still: Boolean = true, own: List<Box> = emptyList(),
                    occluders: List<Box> = emptyList(), frame: () -> List<StillWatch.Seen>): List<StillWatch.Event> =
        (from until from + ms step 200).mapNotNull { t -> w.update(still, frame(), told, occluders, own, true, t) }

    @Test
    fun `phone held still, a teammate moves the bottle - said once, after it rests`() {
        val w = StillWatch()
        assertTrue(run(w, 0, 2_000) { scene(box(0.25f, 0.5f)) }.isEmpty())
        // Being carried (a hand from across the table covers it): nothing.
        assertTrue(run(w, 2_000, 600, occluders = listOf(Box(0.2f, 0.0f, 0.45f, 0.6f))) { scene(box(0.3f, 0.3f)) }.isEmpty())
        val ev = run(w, 2_600, 2_000) { scene(box(0.4f, 0.25f)) }
        assertEquals(1, ev.size)
        assertEquals(StillWatch.Kind.MOVED, ev[0].kind)
        assertEquals("bottle", ev[0].label)
        // No repeat.
        assertTrue(run(w, 4_600, 3_000) { scene(box(0.4f, 0.25f)) }.isEmpty())
    }

    @Test
    fun `with D58's own-hand rule on, the user's own hand moving it is not news`() {
        val w = StillWatch(ownSilences = true)
        run(w, 0, 2_000) { scene(box(0.25f, 0.5f)) }
        run(w, 2_000, 600, own = listOf(Box(0.15f, 0.35f, 0.4f, 0.9f))) { scene(box(0.25f, 0.5f)) }
        assertTrue(run(w, 2_600, 3_000) { scene(box(0.4f, 0.25f)) }.isEmpty())
    }

    @Test
    fun `a move by anyone's hand is said (D60, team)`() {
        val w = StillWatch()
        run(w, 0, 2_000) { scene(box(0.25f, 0.5f)) }
        run(w, 2_000, 600, own = listOf(Box(0.15f, 0.35f, 0.4f, 0.9f))) { scene(box(0.25f, 0.5f)) }
        val ev = run(w, 2_600, 3_000) { scene(box(0.4f, 0.25f)) }
        assertTrue("$ev", ev.size == 1 && ev[0].kind == StillWatch.Kind.MOVED)
    }

    @Test
    fun `pointing the phone somewhere new raises nothing - the reference is dropped`() {
        val w = StillWatch()
        run(w, 0, 2_000) { scene(box(0.25f, 0.5f)) }
        run(w, 2_000, 1_000, still = false) { scene(box(0.25f, 0.5f), dx = -0.2f) }
        // Still again at the new view: everything shifted, nothing said.
        assertTrue(run(w, 3_000, 4_000) { scene(box(0.25f, 0.5f), dx = -0.2f) }.isEmpty())
    }

    @Test
    fun `a shake while it is moved, then the same view again - still caught`() {
        val w = StillWatch()
        run(w, 0, 2_000) { scene(box(0.25f, 0.5f)) }
        run(w, 2_000, 800, still = false) { scene(box(0.3f, 0.3f), dx = 0.03f) }
        val ev = run(w, 2_800, 2_000) { scene(box(0.4f, 0.25f)) }
        assertEquals(listOf(StillWatch.Kind.MOVED), ev.map { it.kind })
    }

    @Test
    fun `taken away while the phone is still - can't see, then back`() {
        val w = StillWatch()
        run(w, 0, 2_000) { scene(box(0.25f, 0.5f)) }
        val gone = run(w, 2_000, 3_000) { scene(null) }
        assertEquals(listOf(StillWatch.Kind.LOST), gone.map { it.kind })
        // At least 3 s after the last sentence (no rapid-fire speech).
        val back = run(w, 5_000, 4_000) { scene(box(0.25f, 0.5f)) }
        assertEquals(listOf(StillWatch.Kind.BACK), back.map { it.kind })
    }

    @Test
    fun `a hand resting over it is hidden, never gone`() {
        val w = StillWatch()
        run(w, 0, 2_000) { scene(box(0.25f, 0.5f)) }
        assertTrue(run(w, 2_000, 6_000, occluders = listOf(Box(0.15f, 0.35f, 0.4f, 0.9f))) { scene(null) }.isEmpty())
    }

    @Test
    fun `not held still, nothing is ever said`() {
        val w = StillWatch()
        assertTrue(run(w, 0, 6_000, still = false) { scene(box(0.25f + (it0++ % 5) * 0.05f, 0.5f)) }.isEmpty())
    }

    private var it0 = 0

    @Test
    fun `with only one known object nothing proves the camera is still - no move`() {
        val w = StillWatch()
        val one = { b: Box -> listOf(StillWatch.Seen(1, "bottle", b, 1)) }
        w.update(true, one(box(0.25f, 0.5f)), setOf("bottle"), emptyList(), emptyList(), true, 0)
        var e: StillWatch.Event? = null
        for (t in 200L..4_000L step 200) e = e ?: w.update(true, one(box(0.6f, 0.3f)), setOf("bottle"), emptyList(), emptyList(), true, t)
        assertNull(e)
    }
}
