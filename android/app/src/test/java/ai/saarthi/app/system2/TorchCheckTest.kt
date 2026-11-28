package ai.saarthi.app.system2

import ai.saarthi.app.geometry.Box
import org.junit.Assert.assertEquals
import org.junit.Assert.assertNotNull
import org.junit.Test

/**
 * SIMULATED scenes (no recordings yet: the team's torch measurement is pending, D38). A reflecting
 * surface brightens by (ambient + torch) / ambient whatever its colour; a screen's own light does not
 * change, only the little torch light its glass reflects.
 */
class TorchCheckTest {

    private val table = Box(0f, 0.5f, 1f, 1f)
    private val apple = Box(0.4f, 0.55f, 0.6f, 0.75f)

    /** A frame: the table at [tableLevel], the apple region at [appleLevel], the rest dark wall. */
    private fun frame(tableLevel: Float, appleLevel: Float) = Gray(240, 320, FloatArray(240 * 320) { i ->
        val x = (i % 240 + 0.5f) / 240f
        val y = (i / 240 + 0.5f) / 320f
        when {
            x in apple.left..apple.right && y in apple.top..apple.bottom -> appleLevel
            y >= table.top -> tableLevel
            else -> 30f
        }
    })

    @Test
    fun `a real object brightens like the table, whatever its colour`() {
        // Table and a dark red apple both gain 1.6 x.
        val r = TorchCheck.measure(frame(100f, 40f), frame(160f, 64f), apple, apple, table, listOf(apple))
        assertNotNull(r)
        assertEquals(TorchCheck.Finding.REFLECTS, r!!.finding)
        assertEquals(TorchCheck.REFLECTS_LLR, r.llr, 0f)
    }

    @Test
    fun `a picture on a screen barely changes`() {
        // The table gains 1.6 x; the screen's apple 1.03 x (its glass reflects a little).
        val r = TorchCheck.measure(frame(100f, 150f), frame(160f, 154.5f), apple, apple, table, listOf(apple))
        assertEquals(TorchCheck.Finding.EMITS, r!!.finding)
        assertEquals(TorchCheck.EMITS_LLR, r.llr, 0f)
    }

    @Test
    fun `when the torch makes no difference, nothing is concluded`() {
        val r = TorchCheck.measure(frame(200f, 150f), frame(205f, 151f), apple, apple, table, listOf(apple))
        assertEquals(TorchCheck.Finding.NO_LIGHT, r!!.finding)
        assertEquals(0f, r.llr, 0f)
    }

    @Test
    fun `a burnt-out object cannot be measured`() {
        val r = TorchCheck.measure(frame(100f, 200f), frame(160f, 255f), apple, apple, table, listOf(apple))
        assertEquals(TorchCheck.Finding.UNCLEAR, r!!.finding)
    }

    @Test
    fun `without a table box the rest of the frame is the reference`() {
        val r = TorchCheck.measure(frame(100f, 40f), frame(160f, 64f), apple, apple, null, listOf(apple))
        assertEquals("scene", r!!.ref)
    }

    // ---- Shape from the torch's light (D39) ----

    /**
     * The apple's region lit by the room ([off]) and with the torch added ([on]). A sphere facing the
     * camera takes the torch's light by the cosine of its slope (full in the middle, little at the rim)
     * while the room lights it from above; a print takes the same light everywhere.
     */
    private fun scene(on: Boolean, sphere: Boolean) = Gray(240, 320, FloatArray(240 * 320) { i ->
        val x = (i % 240 + 0.5f) / 240f
        val y = (i / 240 + 0.5f) / 320f
        val u = (x - 0.5f) / 0.1f
        val v = (y - 0.65f) / 0.1f
        val r2 = u * u + v * v
        when {
            r2 <= 1f -> {
                val facing = if (sphere) kotlin.math.sqrt(1f - r2) else 1f
                val room = if (sphere) 50f * (0.6f - 0.4f * v).coerceAtLeast(0.2f) else 50f
                room + if (on) 60f * facing else 0f
            }
            y >= table.top -> if (on) 160f else 100f
            else -> 30f
        }
    })

    @Test
    fun `a rounded object is lit unevenly by the torch, a print evenly`() {
        val real = TorchCheck.measure(scene(false, true), scene(true, true), apple, apple, table, listOf(apple))!!
        val print = TorchCheck.measure(scene(false, false), scene(true, false), apple, apple, table, listOf(apple))!!
        assertEquals(TorchCheck.Finding.REFLECTS, real.finding)
        assertEquals(TorchCheck.Finding.REFLECTS, print.finding)
        assertEquals(true, real.curved)
        assertEquals(false, print.curved)
        // Reflecting and rounded decides "real"; reflecting and even (a print, or a flat real thing) does not.
        assertEquals(Verdict.REAL, d(Cue.TORCH to real.llr).verdict)
        assertEquals(Verdict.UNSURE, d(Cue.TORCH to print.llr).verdict)
    }

    @Test
    fun `a fresh torch reading replaces the last one`() {
        // Exit run, 31 Oct, 432 s: the picture was swapped for the real apple; the old "emits" still decided.
        val l = Ledger()
        l.observe(1, Cue.TORCH, TorchCheck.EMITS_LLR, "emits", 0, null)
        l.clear(1, Cue.TORCH)
        l.observe(1, Cue.TORCH, TorchCheck.REFLECTS_LLR + TorchCheck.CURVED_LLR, "reflects, rounded", 15_000, null)
        assertEquals(Verdict.REAL, RealityCheck.decide(l.assess(1, 15_000).cues, l).verdict)
    }

    // ---- The decision rules with the torch (D38) ----

    private val ledger = Ledger()
    private fun d(vararg c: Pair<Cue, Float>) = RealityCheck.decide(c.map { Ledger.CueSum(it.first, it.second, 1, "") }, ledger)

    @Test
    fun `light from the object itself decides picture, with or without a screen box`() {
        assertEquals(Verdict.PICTURE, d(Cue.TORCH to TorchCheck.EMITS_LLR).verdict)
        assertEquals(Verdict.PICTURE, d(Cue.TORCH to TorchCheck.EMITS_LLR, Cue.IN_SCREEN to -1.2f).verdict)
    }

    @Test
    fun `reflecting the torch overrules a screen box around it`() {
        // Team test, 31 Oct, 9:01: a real apple in front of the laptop, inside its box, with light around it and flat readings.
        val r = d(Cue.TORCH to TorchCheck.REFLECTS_LLR, Cue.IN_SCREEN to -1.2f, Cue.SCREEN_LIGHT to -1.6f, Cue.PLANE to -4f)
        assertEquals(Verdict.UNSURE, r.verdict)
        assertEquals(setOf(Cue.IN_SCREEN, Cue.SCREEN_LIGHT, Cue.PLANE), r.uncounted)
    }

    @Test
    fun `reflecting the torch and standing out make real`() {
        assertEquals(Verdict.REAL, d(Cue.TORCH to TorchCheck.REFLECTS_LLR, Cue.PLANE to 1.4f).verdict)
        // A print reflects too: the torch alone never says "real".
        assertEquals(Verdict.UNSURE, d(Cue.TORCH to TorchCheck.REFLECTS_LLR).verdict)
    }
}
