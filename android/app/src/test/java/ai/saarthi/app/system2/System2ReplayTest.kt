package ai.saarthi.app.system2

import org.junit.Assert.assertEquals
import org.junit.Assert.assertTrue
import org.junit.Test

/**
 * RECORDED: the team's real-or-picture test of 31 Oct on the Vivo
 * (tools/results/phase4_step3_teamtest_20261031.jsonl), where a real cup in front of a white wall was
 * called a picture and corrected out loud, and the real apple was held back. Every cue reading the
 * phone took is replayed, in order, through the ledger and today's decision rules (D37).
 *
 * The readings themselves were taken before the gyro correction (turning was not yet subtracted), so
 * this checks the decision rules against the worst readings seen so far, not the cues.
 */
class System2ReplayTest {

    private data class Reading(val tMs: Long, val world: Int, val label: String, val cue: Cue, val llr: Float)

    private fun readings(): List<Reading> =
        javaClass.classLoader!!.getResourceAsStream("testdata/RECORDED_system2_teamtest_20261031.tsv")!!.bufferedReader().readLines()
            .filter { it.isNotBlank() && !it.startsWith("#") }
            .map { it.split('\t') }
            .map { r -> Reading(r[0].toLong(), r[1].toInt(), r[2], Cue.entries.first { it.key == r[3] }, r[4].toFloat()) }

    @Test
    fun `objects never seen inside a screen are never called a picture`() {
        val all = readings()
        val inScreen = all.filter { it.cue == Cue.IN_SCREEN }.map { it.world }.toSet()
        val ledger = Ledger()
        var n = 0
        val worst = HashMap<Int, Float>()
        for ((i, r) in all.withIndex()) {
            // Each recorded reading already passed the phone's view spacing: give each its own view.
            ledger.observe(r.world, r.cue, r.llr, r.cue.key, r.tMs, View(i * 10f, 45f))
            val d = RealityCheck.decide(ledger.assess(r.world, r.tMs).cues, ledger)
            if (r.world in inScreen) continue
            n++
            worst[r.world] = minOf(worst[r.world] ?: 0f, d.llr)
            assertTrue("${r.label} #${r.world} called a picture at ${r.tMs} ms", d.verdict != Verdict.PICTURE)
        }
        println("replayed $n readings of objects never inside a screen; lowest counted evidence per object: $worst")
        assertTrue("the cup's readings are in the recording", all.any { it.label == "cup" && it.cue == Cue.SCREEN_LIGHT })
    }

    @Test
    fun `under the old rules the same readings did call the cup a picture`() {
        // The failure this replay guards against, reproduced: all cues counted, picture at the bound.
        val ledger = Ledger()
        var picture = false
        for ((i, r) in readings().filter { it.label == "cup" }.withIndex()) {
            ledger.observe(r.world, r.cue, r.llr, r.cue.key, r.tMs, View(i * 10f, 45f))
            if (ledger.assess(r.world, r.tMs).verdict == Verdict.PICTURE) picture = true
        }
        assertEquals(true, picture)
    }

    @Test
    fun `without the torch nothing is ever called a picture`() {
        // D42: every recorded reading, objects inside a screen included, replayed under today's rules.
        val ledger = Ledger()
        for ((i, r) in readings().withIndex()) {
            ledger.observe(r.world, r.cue, r.llr, r.cue.key, r.tMs, View(i * 10f, 45f))
            assertTrue(RealityCheck.decide(ledger.assess(r.world, r.tMs).cues, ledger).verdict != Verdict.PICTURE)
        }
    }

    @Test
    fun `picture needs the torch`() {
        val l = Ledger()
        fun d(vararg c: Pair<Cue, Float>) = RealityCheck.decide(c.map { Ledger.CueSum(it.first, it.second, 2, "") }, l)
        assertEquals(Verdict.UNSURE, d(Cue.IN_SCREEN to -2.4f, Cue.SCREEN_LIGHT to -1.6f).verdict)      // real apple before the laptop
        assertEquals(Verdict.UNSURE, d(Cue.PLANE to -4f, Cue.SCREEN_LIGHT to -1.6f).verdict)            // no screen: not counted
        assertEquals(0f, d(Cue.PLANE to -4f, Cue.SCREEN_LIGHT to -1.6f).llr, 1e-4f)
        assertEquals(Verdict.UNSURE, d(Cue.IN_SCREEN to -1.2f, Cue.PLANE to -3.2f).verdict)   // D42: no longer enough
        assertEquals(Verdict.PICTURE, d(Cue.TORCH to TorchCheck.EMITS_LLR).verdict)
        // A real apple in front of the laptop that stands out: the screen evidence cancels it, so unsure (held back).
        assertEquals(Verdict.UNSURE, d(Cue.IN_SCREEN to -2.4f, Cue.PLANE to 4f, Cue.SCREEN_LIGHT to -1.6f).verdict)
        assertEquals(Verdict.REAL, d(Cue.PLANE to 4f).verdict)
    }
}
