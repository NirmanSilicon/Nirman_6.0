package ai.saarthi.app.system2

import ai.saarthi.app.brief.BriefComposer
import ai.saarthi.app.geometry.Box
import ai.saarthi.app.perception.Track
import ai.saarthi.app.worldmap.Scene
import ai.saarthi.app.worldmap.Seen
import ai.saarthi.app.worldmap.WorldObject
import org.junit.Assert.assertEquals
import org.junit.Assert.assertFalse
import org.junit.Assert.assertNotNull
import org.junit.Assert.assertNull
import org.junit.Assert.assertTrue
import org.junit.Test

class LedgerTest {

    private val still = View(0f, 45f)

    @Test
    fun `bounds follow Wald's test for 5 percent errors`() {
        val l = Ledger()
        assertEquals(2.944f, l.upper, 0.001f)
        assertEquals(-2.944f, l.lower, 0.001f)
    }

    @Test
    fun `near-identical frames are one observation`() {
        val l = Ledger()
        var counted = 0
        for (i in 0 until 10) if (l.observe(1, Cue.IN_SCREEN, -1.2f, "inside", 1_000L + i * 60, still)) counted++
        assertEquals(1, counted)
        assertEquals(-1.2f, l.assess(1, 1_600).llr, 1e-4f)
    }

    @Test
    fun `a new view counts after time spacing or a turn of the camera`() {
        val l = Ledger()
        assertTrue(l.observe(1, Cue.IN_SCREEN, -1f, "a", 0, still))
        assertFalse(l.observe(1, Cue.IN_SCREEN, -1f, "a", 300, still))
        assertTrue(l.observe(1, Cue.IN_SCREEN, -1f, "a", 300, View(5f, 45f)))   // turned 5 degrees
        assertFalse(l.observe(1, Cue.IN_SCREEN, -1f, "a", 400, View(12f, 45f)))  // too soon after the last
        assertTrue(l.observe(1, Cue.IN_SCREEN, -1f, "a", 1_000, View(5f, 45f)))  // 0.7 s later
    }

    @Test
    fun `containment alone never reaches the picture verdict`() {
        val l = Ledger()
        for (i in 0 until 20) l.observe(1, Cue.IN_SCREEN, Containment.SCREEN_LLR, "inside a laptop's box", i * 1_000L, still)
        val s = l.assess(1, 19_000)
        assertEquals(-Cue.IN_SCREEN.capLlr, s.llr, 1e-4f)
        assertEquals(Verdict.UNSURE, s.verdict)
        assertTrue(s.pReal < l.priorReal)
    }

    @Test
    fun `old evidence drops out, so a verdict can change`() {
        val l = Ledger()
        l.observe(1, Cue.IN_SCREEN, -1.2f, "inside", 0, still)
        assertEquals(1, l.assess(1, 1_000).cues.size)
        assertTrue(l.assess(1, 25_000).cues.isEmpty())
    }

    @Test
    fun `objects no longer in the world map are forgotten`() {
        val l = Ledger()
        l.observe(1, Cue.IN_SCREEN, -1.2f, "inside", 0, still)
        l.observe(2, Cue.IN_SCREEN, -1.2f, "inside", 0, still)
        l.retain(setOf(2))
        assertTrue(l.assess(1, 100).cues.isEmpty())
        assertEquals(1, l.assess(2, 100).cues.size)
    }

    // ---- RealityCheck and containment ----

    private var nextId = 1
    private fun track(label: String, box: Box, now: Long = 1_000L, hits: Int = 5) =
        Track(nextId++, label, box, 0.7f, hits, 0, now, confirmed = true)

    private fun inView(t: Track, id: Int = t.id) = WorldObject(
        id, t.label, Seen.IN_VIEW, t, null, null, null, null, null, 0, t.lastSeenMs, null,
        resting = true, moving = false, baseCutOff = false, lastBox = t.box,
    )

    @Test
    fun `an apple inside the laptop's box is assessed, one beside it is not`() {
        val laptop = track("laptop", Box(0.1f, 0.2f, 0.7f, 0.7f))
        val onScreen = track("apple", Box(0.3f, 0.3f, 0.45f, 0.45f))
        val beside = track("apple", Box(0.75f, 0.6f, 0.9f, 0.75f))
        val tracks = listOf(laptop, onScreen, beside)
        val r = RealityCheck().update(tracks.map { inView(it) }, tracks, null, 1_000)
        assertEquals(setOf(onScreen.id), r.keys)
        val a = r.getValue(onScreen.id)
        assertEquals("laptop", a.screen)
        assertEquals(Containment.SCREEN_LLR, a.llr, 1e-4f)
        // D42: the background cues alone never hold it back (the brief's screen rule still does, below).
        assertNull(a.doubt)
    }

    @Test
    fun `a picture near the centre of a phone weighs more than one inside a laptop`() {
        val phone = track("cell phone", Box(0.3f, 0.2f, 0.7f, 0.8f), hits = 2)
        val apple = track("apple", Box(0.42f, 0.42f, 0.58f, 0.58f))
        val r = RealityCheck().update(listOf(inView(apple)), listOf(phone, apple), null, 1_000)
        assertEquals(Containment.PHONE_LLR, r.getValue(apple.id).llr, 1e-4f)
        assertTrue(r.getValue(apple.id).cues.single().detail.contains("phone"))
    }

    @Test
    fun `a single-frame screen box is not enough`() {
        val laptop = track("laptop", Box(0.1f, 0.2f, 0.7f, 0.7f), hits = 1)
        val apple = track("apple", Box(0.3f, 0.3f, 0.45f, 0.45f))
        assertTrue(RealityCheck().update(listOf(inView(apple)), listOf(laptop, apple), null, 1_000).isEmpty())
    }

    // ---- Speaking rules ----

    @Test
    fun `an apple inside a laptop's box is said once System 2 has settled it as real`() {
        val composer = BriefComposer()
        val laptop = track("laptop", Box(0.1f, 0.2f, 0.7f, 0.7f))
        val apple = track("apple", Box(0.3f, 0.3f, 0.45f, 0.45f))
        val all = listOf(laptop, apple)
        assertTrue(composer.whyNotStatable(apple, all, 1_000)!!.contains("may be a picture"))
        val real = Assessment(apple.id, "apple", apple.id, 0.7f, 3.5f, 0.99f, Verdict.REAL, emptyList(), "laptop")
        assertNull(composer.whyNotStatable(apple, all, 1_000, reality = mapOf(apple.id to real)))
    }

    @Test
    fun `background picture evidence alone no longer holds an object back`() {
        // D42 (team, 31 Oct): only the torch, asked for, makes a picture; the background cues show on the Mind view only.
        val composer = BriefComposer()
        val apple = track("apple", Box(0.3f, 0.3f, 0.45f, 0.45f))
        val doubted = Assessment(apple.id, "apple", apple.id, 0.7f, -1.5f, 0.5f, Verdict.UNSURE,
            listOf(Ledger.CueSum(Cue.IN_SCREEN, -1.5f, 1, "near the centre of a phone's box")), null)
        val brief = composer.compose(Scene(listOf(apple), listOf(inView(apple)), null, reality = mapOf(apple.id to doubted)), 1_000)
        assertEquals("An apple in front of you.", brief.text)
    }
}
