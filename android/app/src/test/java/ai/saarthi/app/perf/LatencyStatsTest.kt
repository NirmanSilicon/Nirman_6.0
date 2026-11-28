package ai.saarthi.app.perf

import org.junit.Assert.assertEquals
import org.junit.Assert.assertNull
import org.junit.Test

class LatencyStatsTest {

    @Test
    fun emptyInputHasNoSummary() {
        assertNull(LatencyStats.summarize(emptyList()))
    }

    @Test
    fun singleSampleIsEveryPercentile() {
        val s = LatencyStats.summarize(listOf(42.0))!!
        assertEquals(1, s.count)
        assertEquals(42.0, s.p50Ms, 0.0)
        assertEquals(42.0, s.p90Ms, 0.0)
        assertEquals(42.0, s.maxMs, 0.0)
    }

    @Test
    fun nearestRankOnOneToTen() {
        val s = LatencyStats.summarize((1..10).map { it.toDouble() })!!
        assertEquals(5.0, s.p50Ms, 0.0)   // rank ceil(0.5 * 10) = 5
        assertEquals(9.0, s.p90Ms, 0.0)   // rank ceil(0.9 * 10) = 9
        assertEquals(5.5, s.meanMs, 1e-9)
        assertEquals(10.0, s.maxMs, 0.0)
    }

    @Test
    fun inputOrderDoesNotMatter() {
        val a = LatencyStats.summarize(listOf(30.0, 10.0, 20.0))!!
        val b = LatencyStats.summarize(listOf(10.0, 20.0, 30.0))!!
        assertEquals(a, b)
    }

    @Test
    fun percentileNeverInventsAValue() {
        val samples = listOf(10.0, 100.0)
        // p90 of two samples is the second sample (rank 2), not an interpolated 91.
        assertEquals(100.0, LatencyStats.percentile(samples, 90.0), 0.0)
        assertEquals(10.0, LatencyStats.percentile(samples, 50.0), 0.0)
    }

    @Test(expected = IllegalArgumentException::class)
    fun rejectsPercentileOutOfRange() {
        LatencyStats.percentile(listOf(1.0), 101.0)
    }
}
