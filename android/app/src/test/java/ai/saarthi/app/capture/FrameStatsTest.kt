package ai.saarthi.app.capture

import org.junit.Assert.assertEquals
import org.junit.Assert.assertNull
import org.junit.Test

class FrameStatsTest {

    @Test
    fun `thirty frames a second are measured as thirty`() {
        val stats = FrameStats()
        val gapNs = 33_333_333L
        for (i in 0 until 31) stats.onFrame(i * gapNs)
        val w = stats.snapshotAndReset(30 * gapNs + gapNs)
        assertEquals(31, w.frames)
        assertEquals(30.0, w.fps, 0.1)
        assertEquals(33.3, w.gaps!!.p50Ms, 0.1)
    }

    @Test
    fun `a window with no frames reports zero, not a guess`() {
        val stats = FrameStats()
        stats.onFrame(0L)
        stats.snapshotAndReset(1_000_000_000L)
        val w = stats.snapshotAndReset(2_000_000_000L)
        assertEquals(0, w.frames)
        assertEquals(0.0, w.fps, 0.0)
        assertNull(w.gaps)
    }

    @Test
    fun `the gap across a window boundary still counts`() {
        val stats = FrameStats()
        stats.onFrame(0L)
        stats.snapshotAndReset(10_000_000L)
        stats.onFrame(50_000_000L)
        val w = stats.snapshotAndReset(100_000_000L)
        assertEquals(50.0, w.gaps!!.p50Ms, 0.001)
    }
}
