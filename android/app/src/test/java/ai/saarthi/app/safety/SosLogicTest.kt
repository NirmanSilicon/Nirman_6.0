package ai.saarthi.app.safety

import org.junit.Assert.assertEquals
import org.junit.Assert.assertNotNull
import org.junit.Assert.assertNull
import org.junit.Assert.assertTrue
import org.junit.Test
import kotlin.random.Random

/** Synthetic accelerometer and loudness traces (labelled: built by hand, not device data), 100 samples a second. */
class SosLogicTest {

    private val g = 9.81f

    /** At rest, then [fallMs] of free fall, then an impact of [impactG] for 30 ms, then rest. */
    private fun drop(fallMs: Long, impactG: Float, d: FallDetector = FallDetector()): FallDetector.Fall? {
        val rnd = Random(1)
        var out: FallDetector.Fall? = null
        var t = 0L
        fun s(gs: Float) { out = out ?: d.onSample(0f, gs * g + rnd.nextFloat() * 0.2f, 0.1f, t); t += 10 }
        repeat(100) { s(1f) }
        repeat((fallMs / 10).toInt()) { s(0.05f + rnd.nextFloat() * 0.1f) }
        repeat(3) { s(impactG) }
        repeat(100) { s(1f) }
        return out
    }

    @Test
    fun `a drop from about 80 cm onto a cushion is a fall`() {
        val f = drop(400, 5f)
        assertNotNull(f)
        assertTrue("${f!!.freeFallMs} ms", kotlin.math.abs(f.freeFallMs - 400L) <= 20L)
    }

    @Test
    fun `a 10 cm knock is not a fall`() {
        assertNull(drop(140, 4f))
    }

    @Test
    fun `free fall caught softly in the hand is not a fall`() {
        assertNull(drop(400, 1.6f))
    }

    @Test
    fun `shaking or putting the phone down hard never looks like a fall`() {
        val d = FallDetector()
        val rnd = Random(7)
        for (t in 0L..20_000L step 10) {
            // Shaking: 0.6-3 g in every direction, never a long free fall.
            val a = (0.6f + rnd.nextFloat() * 2.4f) * g
            assertNull(d.onSample(a * 0.6f, a * 0.8f, 0f, t))
        }
        // Set down hard on a table: a bump, no free fall.
        assertNull(drop(0, 3f, d))
    }

    @Test
    fun `a sudden loud bang in a steady room is a spike, the room getting louder slowly is not`() {
        val s = LoudSpike()
        var t = 0L
        repeat(100) { assertNull(s.onLevel(-50f, t, false)); t += 50 }
        assertNotNull(s.onLevel(-15f, t, false)); t += 50
        // A bang lasting several frames counts once.
        assertNull(s.onLevel(-16f, t, false)); t += 50
        val s2 = LoudSpike()
        var level = -50f
        for (i in 0 until 600) { assertNull(s2.onLevel(level, i * 50L, false)); level += 0.05f }
    }

    @Test
    fun `Saarthi's own voice is never a spike`() {
        val s = LoudSpike()
        repeat(100) { s.onLevel(-50f, it * 50L, false) }
        assertNull(s.onLevel(-10f, 5_000, true))
    }

    @Test
    fun `the message says what was measured, without numbers, and where`() {
        val fall = FallDetector.Fall(10_000, 400, 5f)
        val spike = LoudSpike.Spike(8_000, -12f, 30f)
        val sit = SosMessage.situation(spike, fall)
        assertEquals("Possible accident: a sudden very loud sound, then the phone suddenly fell and hit hard.", sit)
        assertEquals("Possible fall: the phone suddenly fell and hit hard.", SosMessage.situation(null, fall))
        val text = SosMessage.text("Ananya", sit, true, 15, SosMessage.Place(12.97164, 77.59456, 0), "10:21")
        assertEquals("SAARTHI SOS for Ananya. $sit No movement since. No answer to \"Are you OK?\" for 15 seconds. " +
            "Approximate location: https://maps.google.com/?q=12.972,77.595. Sent at 10:21.", text)
        assertTrue(SosMessage.text(null, sit, false, 15, null, "10:21").contains("Location not available."))
    }
}
