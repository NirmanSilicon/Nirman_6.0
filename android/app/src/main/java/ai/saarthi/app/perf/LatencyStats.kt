package ai.saarthi.app.perf

import kotlin.math.ceil

/** Count, mean, 50th and 90th percentile and maximum of a set of durations, in milliseconds. */
data class LatencySummary(
    val count: Int,
    val meanMs: Double,
    val p50Ms: Double,
    val p90Ms: Double,
    val maxMs: Double,
)

/**
 * Latency summaries for benchmarks and metrics (PRD 9.2 reports the 50th and 90th percentiles).
 *
 * Percentiles use the nearest-rank method: the p-th percentile is the smallest sample such that at
 * least p% of samples are less than or equal to it. Simple, exact on small samples, and it never
 * invents a value that was not measured.
 */
object LatencyStats {

    fun summarize(samplesMs: List<Double>): LatencySummary? {
        if (samplesMs.isEmpty()) return null
        val sorted = samplesMs.sorted()
        return LatencySummary(
            count = sorted.size,
            meanMs = sorted.average(),
            p50Ms = percentile(sorted, 50.0),
            p90Ms = percentile(sorted, 90.0),
            maxMs = sorted.last(),
        )
    }

    /** Nearest-rank percentile of an already sorted, non-empty list. */
    fun percentile(sorted: List<Double>, p: Double): Double {
        require(sorted.isNotEmpty()) { "no samples" }
        require(p in 0.0..100.0) { "percentile out of range: $p" }
        val rank = ceil(p / 100.0 * sorted.size).toInt().coerceIn(1, sorted.size)
        return sorted[rank - 1]
    }
}
