package ai.saarthi.app.personal

import ai.saarthi.app.geometry.Box
import ai.saarthi.app.intent.Intent
import ai.saarthi.app.intent.IntentInterpreter
import org.junit.Assert.assertEquals
import org.junit.Assert.assertTrue
import org.junit.Test
import kotlin.random.Random

/** Synthetic vectors and hands (labelled: built by hand, not device data). */
class PersonalTest {

    private val rnd = Random(5)

    /** Views of one object: a fixed direction plus noise (turning it in the hand). */
    private fun views(base: FloatArray, n: Int, noise: Float) = List(n) { FloatArray(base.size) { i -> base[i] + noise * (rnd.nextFloat() - 0.5f) } }
    private fun dir(seed: Int) = Random(seed).let { r -> FloatArray(64) { r.nextFloat() - 0.5f } }

    @Test
    fun `the user's watch and a look-alike are told apart by the gap, and something else is neither`() {
        val mine = dir(1)
        // A look-alike: mostly the same (both watches), partly different (strap, dial).
        val other = FloatArray(64) { i -> if (i < 40) mine[i] else -mine[i] }
        val p = PersonalObjects()
        p.teach("watch", mine = true, views(mine, 15, 0.1f))
        p.teach("watch", mine = false, views(other, 15, 0.1f))
        assertTrue(p.ready)
        repeat(10) { assertEquals(PersonalObjects.Decision.MINE, p.judge(views(mine, 1, 0.15f)[0]).decision) }
        repeat(10) { assertEquals(PersonalObjects.Decision.NOT_MINE, p.judge(views(other, 1, 0.15f)[0]).decision) }
        // Halfway between: not sure.
        val mid = FloatArray(64) { (mine[it] + other[it]) / 2f }
        assertEquals(PersonalObjects.Decision.UNSURE, p.judge(mid).decision)
        // An unrelated thing in the hand.
        assertEquals(PersonalObjects.Decision.NONE, p.judge(dir(99)).decision)
    }

    @Test
    fun `a second look-alike is added, not swapped for the first`() {
        val mine = dir(1)
        val p = PersonalObjects()
        p.teach("watch", true, views(mine, 10, 0.1f))
        p.teach("watch", false, views(dir(2), 10, 0.1f))
        p.teach("watch", false, views(dir(3), 10, 0.1f))
        // Both look-alikes are still known.
        assertEquals(PersonalObjects.Decision.NOT_MINE, p.judge(dir(2)).decision)
        assertEquals(PersonalObjects.Decision.NOT_MINE, p.judge(dir(3)).decision)
    }

    @Test
    fun `with only the user's watch taught there is no gap, so never yours or not yours`() {
        val p = PersonalObjects()
        p.teach("watch", mine = true, views(dir(1), 15, 0.1f))
        assertEquals(PersonalObjects.Decision.UNSURE, p.judge(dir(1)).decision)
    }

    @Test
    fun `taught views survive a restart as vectors`() {
        val p = PersonalObjects()
        p.teach("watch", true, views(dir(1), 3, 0.1f))
        p.teach("watch", false, views(dir(2), 3, 0.1f))
        val q = PersonalObjects()
        q.load(p.toText())
        assertTrue(q.ready)
        assertEquals(p.judge(dir(1)).mine, q.judge(dir(1)).mine, 1e-5f)
    }

    /** A right hand from the bottom of the frame, index finger along (dx, dy) from its knuckle at (kx, ky). */
    private fun hand(kx: Float, ky: Float, dx: Float, dy: Float): List<Pair<Float, Float>> {
        val l = MutableList(21) { kx to ky + 0.1f }
        l[0] = kx to ky + 0.15f
        l[5] = kx to ky
        l[8] = kx + dx to ky + dy
        l[4] = kx - 0.04f to ky + 0.03f
        l[9] = kx + 0.02f to ky
        return l
    }

    private val cup = TouchAsk.Candidate(1, Box(0.30f, 0.30f, 0.45f, 0.45f))
    private val bottle = TouchAsk.Candidate(2, Box(0.32f, 0.05f, 0.44f, 0.22f))
    private val mouse = TouchAsk.Candidate(3, Box(0.70f, 0.50f, 0.85f, 0.60f))

    @Test
    fun `touching the cup is the cup`() {
        assertEquals(TouchAsk.Found.Touching(1), TouchAsk.find(hand(0.38f, 0.50f, 0f, -0.1f), listOf(cup, bottle, mouse)))
    }

    @Test
    fun `pointing up past the cup crosses the cup, then the bottle behind it - both are said`() {
        assertEquals(TouchAsk.Found.Pointing(listOf(1, 2)), TouchAsk.find(hand(0.38f, 0.80f, 0f, -0.1f), listOf(cup, bottle, mouse)))
    }

    @Test
    fun `pointing at nothing, or with a curled finger, finds nothing`() {
        assertEquals(TouchAsk.Found.Nothing, TouchAsk.find(hand(0.1f, 0.8f, -0.05f, -0.05f), listOf(cup, bottle, mouse)))
        assertEquals(TouchAsk.Found.Nothing, TouchAsk.find(hand(0.38f, 0.8f, 0f, -0.01f), listOf(cup, bottle, mouse)))
    }

    @Test
    fun `the region around a grip is square in pixels and inside the frame`() {
        val b = HandRegion.held(hand(0.5f, 0.6f, 0f, -0.1f))
        assertEquals((b.right - b.left) * 480f, (b.bottom - b.top) * 640f, 2f)
        assertTrue(b.left >= 0f && b.right <= 1f && b.top >= 0f && b.bottom <= 1f)
    }

    @Test
    fun `teach, ask and touch requests`() {
        assertEquals(Intent.TeachMine("watch"), IntentInterpreter.interpret("This is my watch."))
        assertEquals(Intent.TeachMine("watch"), IntentInterpreter.interpret("remember this is my watch"))
        assertEquals(Intent.TeachOther("watch"), IntentInterpreter.interpret("This is not my watch"))
        assertEquals(Intent.TeachOther("watch"), IntentInterpreter.interpret("this is the other watch"))
        assertEquals(Intent.TeachOther("watch"), IntentInterpreter.interpret("This is another watch."))
        assertEquals(Intent.IsMine("watch"), IntentInterpreter.interpret("Is this my watch?"))
        assertEquals(Intent.WhatIsThis, IntentInterpreter.interpret("What's this?"))
        assertEquals(Intent.WhatIsThis, IntentInterpreter.interpret("What am I touching?"))
        assertEquals(Intent.WhatIsThis, IntentInterpreter.interpret("what am I pointing at"))
        // Not these: questions about the table.
        assertTrue(IntentInterpreter.interpret("what is on my right") is Intent.ObjectsOn)
        assertTrue(IntentInterpreter.interpret("what's around me") is Intent.Brief)
    }
}
