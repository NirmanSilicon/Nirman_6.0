package ai.saarthi.app.guidance

import ai.saarthi.app.geometry.Box
import org.junit.Assert.assertEquals
import org.junit.Assert.assertNotNull
import org.junit.Assert.assertNull
import org.junit.Assert.assertTrue
import org.junit.Test

/** Synthetic hand paths (built by hand, not device data) through the guidance logic. */
class GuidanceTest {

    private val bottle = Box(0.60f, 0.30f, 0.70f, 0.45f)  // centre (0.65, 0.375)

    @Test
    fun `a hand left of the target is told right, then forward, then touching`() {
        val g = HandGuide()
        assertEquals(Cue.RIGHT, g.onHand(0.30f to 0.40f, bottle, 0)!!.cue)
        // Lined up but short of it (below it in the image = nearer the user).
        assertEquals(Cue.CLOSER, g.onHand(0.64f to 0.70f, bottle, 1_000)!!.cue)
        val arrived = g.onHand(0.66f to 0.44f, bottle, 1_300)!!
        assertEquals(Cue.ARRIVED, arrived.cue)
        assertEquals("You're touching it.", arrived.phrase)
        assertNull(g.onHand(0.66f to 0.44f, bottle, 3_000))
    }

    @Test
    fun `cues come on a beat, not every frame`() {
        val g = HandGuide()
        assertNotNull(g.onHand(0.30f to 0.40f, bottle, 0))
        for (t in 100L..800L step 100) assertNull(g.onHand(0.30f to 0.40f, bottle, t))
        assertNotNull(g.onHand(0.30f to 0.40f, bottle, 900))
    }

    @Test
    fun `a deliberate wrong-way reach is corrected within half a second, from the growing distance`() {
        val g = HandGuide()
        g.onHand(0.45f to 0.40f, bottle, 0)  // first beat: "right"
        // The hand moves fast to the LEFT, away from the bottle on the right.
        var correction: Step? = null
        var at = 0L
        for ((i, t) in (100L..600L step 100).withIndex()) {
            val s = g.onHand(0.45f - 0.04f * (i + 1) to 0.40f, bottle, t)
            if (s?.correction == true) { correction = s; at = t; break }
        }
        assertNotNull("no correction", correction)
        assertTrue("corrected at $at ms", at <= 500)
        assertEquals(Cue.RIGHT, correction!!.cue)
        assertEquals("Other way: right.", correction.phrase)
    }

    @Test
    fun `the fingertip on the last known box counts as touching, even if the hand hides the bottle`() {
        val g = HandGuide()
        assertEquals(Cue.ARRIVED, g.onHand(0.61f to 0.31f, bottle, 0)!!.cue)
    }

    @Test
    fun `no hand, the camera is steered, then the target is straight ahead`() {
        val s = Guidance()
        s.start(Guidance.Target(7, "bottle", "bottle"), 0)
        val view = Guidance.View(null, bottle, true, "within reach", 20f, 0f)
        val first = s.onRun(view, 2_000)!!
        assertEquals(Cue.RIGHT, first.cue)
        assertEquals(Mode.AIM, first.mode)
        val centred = Guidance.View(null, Box(0.45f, 0.3f, 0.55f, 0.45f), true, "within reach", 0f, 0f)
        val arrived = s.onRun(centred, 4_000)!!
        assertEquals(Cue.ARRIVED, arrived.cue)
        assertEquals("It's straight ahead, within reach.", arrived.phrase)
        assertTrue(!s.active)
    }

    @Test
    fun `a target out of view is found by turning towards its remembered direction`() {
        val s = Guidance()
        s.start(Guidance.Target(7, "bottle", "bottle"), 0)
        val step = s.onRun(Guidance.View(null, null, false, null, -60f, 0f), 2_000)!!
        assertEquals(Cue.LEFT, step.cue)
        assertEquals("Turn left.", step.phrase)
    }

    @Test
    fun `a hand that flickers out briefly does not switch to aim mode`() {
        val s = Guidance()
        s.start(Guidance.Target(7, "bottle", "bottle"), 0)
        s.onRun(Guidance.View(0.3f to 0.4f, bottle, true, null, 20f, 0f), 100)
        assertNull(s.onRun(Guidance.View(null, bottle, true, null, 20f, 0f), 600))
    }

    @Test
    fun `guidance gives up politely after the timeout`() {
        val s = Guidance(timeoutMs = 5_000)
        s.start(Guidance.Target(7, "bottle", "bottle"), 0)
        val end = s.onRun(Guidance.View(null, null, false, null, null, null), 5_100)!!
        assertEquals(Cue.LOOK_AGAIN, end.cue)
        assertTrue(!s.active)
    }

    /** A reach that moves towards [stop] and pauses there, 10 runs a second. */
    private fun reachTo(b: ReachBias, stop: Pair<Float, Float>, target: Pair<Float, Float>, t0: Long) {
        b.newReach()
        val start = 0.5f to 0.95f
        for (i in 0..10) {
            val f = i / 10f
            val tip = (start.first + (stop.first - start.first) * f) to (start.second + (stop.second - start.second) * f)
            b.observe(tip, (target.first - tip.first) to (target.second - tip.second), t0 + i * 100L)
        }
        for (i in 1..5) b.observe(stop, (target.first - stop.first) to (target.second - stop.second), t0 + 1_000L + i * 100L)
    }

    @Test
    fun `a user who keeps stopping short is noticed after three reaches, and told once`() {
        val b = ReachBias()
        val target = 0.5f to 0.40f
        reachTo(b, 0.5f to 0.50f, target, 0)
        reachTo(b, 0.51f to 0.52f, target, 10_000)
        assertTrue(!b.estimate().confident)
        reachTo(b, 0.49f to 0.49f, target, 20_000)
        val e = b.estimate()
        assertTrue(e.confident)
        assertEquals(-0.10f, e.y, 0.02f)
        assertEquals("You tend to reach a bit short; I'll guide you further.", b.announcement())
        assertNull(b.announcement())
    }

    @Test
    fun `scattered reaches are not a bias`() {
        val b = ReachBias()
        val target = 0.5f to 0.40f
        reachTo(b, 0.5f to 0.50f, target, 0)
        reachTo(b, 0.5f to 0.31f, target, 10_000)
        reachTo(b, 0.5f to 0.47f, target, 20_000)
        reachTo(b, 0.5f to 0.33f, target, 30_000)
        assertTrue(!b.estimate().confident)
    }

    @Test
    fun `with a short bias the guide keeps saying forward, not a little forward`() {
        val box = Box(0.55f, 0.18f, 0.75f, 0.36f)   // centre (0.65, 0.27)
        val tip = 0.65f to 0.40f                     // 0.13 short of the centre, not touching
        assertEquals("A little forward.", HandGuide().onHand(tip, box, 0)!!.phrase)
        assertEquals("Forward.", HandGuide().apply { aimOffset = 0f to -0.06f }.onHand(tip, box, 0)!!.phrase)
    }

    @Test
    fun `the phrasebook covers every sentence the guides say`() {
        val said = HashSet<String>()
        val rnd = java.util.Random(1)
        repeat(4_000) { k ->
            val g = HandGuide()
            val l = 0.3f + rnd.nextFloat() * 0.4f
            val t0 = 0.2f + rnd.nextFloat() * 0.4f
            val box = Box(l, t0, l + 0.1f, t0 + 0.12f)
            var tip = rnd.nextFloat() to rnd.nextFloat()
            for (t in 0L..3_000L step 100) {
                // Random walks, some away from the target, to provoke corrections.
                tip = (tip.first + (rnd.nextFloat() - 0.5f) * 0.12f).coerceIn(0f, 1f) to (tip.second + (rnd.nextFloat() - 0.5f) * 0.12f).coerceIn(0f, 1f)
                g.onHand(tip, box, k * 10_000L + t)?.phrase?.let { said += it }
            }
            val a = AimGuide()
            val al = rnd.nextFloat() * 0.9f
            a.inView(Box(al, 0.3f, al + 0.1f, 0.5f), listOf("within reach", "just beyond reach", "out of reach", null)[k % 4], 0)?.phrase?.let { said += it }
            a.outOfView(rnd.nextFloat() * 180f - 90f, 0f, 5_000)?.phrase?.let { said += it }
        }
        val missing = said - Phrases.ALL.toSet()
        assertTrue("not in the phrasebook: $missing", missing.isEmpty())
    }

    @Test
    fun `a hand trembling near the target is never told it went the wrong way`() {
        val g = HandGuide()
        val rnd = java.util.Random(3)
        // About 1 cm of tremor around a point 0.15 short of the bottle, for 10 s.
        for (t in 0L..10_000L step 100) {
            val tip = (0.65f + (rnd.nextFloat() - 0.5f) * 0.04f) to (0.53f + (rnd.nextFloat() - 0.5f) * 0.04f)
            val s = g.onHand(tip, bottle, t)
            assertTrue("false correction at $t", s?.correction != true)
        }
    }
}
