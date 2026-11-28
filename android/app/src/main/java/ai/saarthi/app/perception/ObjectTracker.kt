package ai.saarthi.app.perception

// Adapted from SecondSense inference/decode/DetectionStabilizer.kt (used with the owners' written
// permission, commit cc122ea): per-object tracks across frames, EMA-smoothed score, a hit count
// that confirms a track only after it has been re-seen. Changed: tracks match by IoU first (our
// BoxMatcher rule) with SecondSense's centre-distance gate only as a fallback for small boxes;
// tracks carry a stable id and box; expiry is by time, not missed-frame count, because the
// detector's rate changes with load and heat; scores are not boosted or penalised, the track
// states whether it is confirmed instead; each track also reports how consistently it was seen
// over a recent window (real objects are re-detected far more consistently than false ones, D12).

import ai.saarthi.app.geometry.Box
import ai.saarthi.app.geometry.LabelledBox
import kotlin.math.hypot

/** One tracked object as seen by the fast detector. Boxes are normalised to 0..1 of the frame. */
data class Track(
    val id: Int,
    val label: String,
    val box: Box,
    /** Exponential moving average of the raw detector score, updated only when seen. */
    val score: Float,
    val hits: Int,
    val firstSeenMs: Long,
    val lastSeenMs: Long,
    val confirmed: Boolean,
    /** Sightings within the recent window. */
    val recentHits: Int = hits,
    /** Detector runs within the recent window since this track was born. */
    val recentRuns: Int = hits,
    /** Mean raw score of the recent sightings. */
    val recentMeanScore: Float = score,
) {
    /** Fraction of recent detector runs that saw this object (1 = every run). */
    val presence: Float get() = if (recentRuns == 0) 0f else recentHits.toFloat() / recentRuns
}

/**
 * Keeps one track per physical object across detector runs, so a single-frame false positive is
 * never treated as an object and a real object that flickers keeps its identity. Not thread-safe:
 * call [update] from one thread (the detector's).
 */
class ObjectTracker(
    private val minIou: Float = 0.3f,
    private val centreGate: Float = 0.12f,
    private val scoreAlpha: Float = 0.5f,
    private val confirmHits: Int = 3,
    private val expireMs: Long = 1_500L,
    /** Window for [Track.presence] and [Track.recentMeanScore]. */
    private val windowMs: Long = 1_500L,
) {
    private class Mutable(
        val id: Int,
        val label: String,
        var box: Box,
        var score: Float,
        var hits: Int,
        val firstSeenMs: Long,
        var lastSeenMs: Long,
    ) {
        /** Recent sightings as (time, raw score), oldest first. */
        val recent = ArrayDeque<Pair<Long, Float>>()
    }

    private val tracks = ArrayList<Mutable>()
    private val runTimes = ArrayDeque<Long>()
    private var nextId = 1

    /** Feeds one detector run taken at [nowMs]; returns every live track (seen or recently seen). */
    fun update(detections: List<LabelledBox>, nowMs: Long): List<Track> {
        runTimes.addLast(nowMs)
        while (runTimes.isNotEmpty() && nowMs - runTimes.first() > windowMs) runTimes.removeFirst()

        val trackOf = arrayOfNulls<Mutable>(detections.size)
        val used = BooleanArray(tracks.size)

        // Candidate pairs: IoU pairs first (best IoU first), then centre-distance fallback pairs.
        data class Pair(val d: Int, val t: Int, val rank: Float)
        val pairs = ArrayList<Pair>()
        for ((di, d) in detections.withIndex()) for ((ti, t) in tracks.withIndex()) {
            if (t.label != d.label) continue
            val iou = d.box.iou(t.box)
            if (iou >= minIou) {
                pairs += Pair(di, ti, 1f + iou)
            } else {
                val dist = centreDistance(d.box, t.box)
                if (dist < centreGate) pairs += Pair(di, ti, 1f - dist / centreGate)
            }
        }
        pairs.sortByDescending { it.rank }
        for (p in pairs) {
            if (trackOf[p.d] != null || used[p.t]) continue
            used[p.t] = true
            trackOf[p.d] = tracks[p.t]
        }

        for ((di, d) in detections.withIndex()) {
            val t = trackOf[di] ?: Mutable(nextId++, d.label, d.box, d.score, 0, nowMs, nowMs).also {
                tracks += it
                it.score = d.score
            }
            if (t.hits > 0) t.score = scoreAlpha * d.score + (1f - scoreAlpha) * t.score
            t.box = d.box
            t.hits++
            t.lastSeenMs = nowMs
            t.recent.addLast(nowMs to d.score)
        }
        tracks.removeAll { nowMs - it.lastSeenMs > expireMs }
        for (t in tracks) while (t.recent.isNotEmpty() && nowMs - t.recent.first().first > windowMs) t.recent.removeFirst()
        return tracks.map { it.snapshot() }
    }

    fun reset() {
        tracks.clear()
        runTimes.clear()
    }

    private fun Mutable.snapshot(): Track {
        val runs = runTimes.count { it >= firstSeenMs }
        val mean = if (recent.isEmpty()) 0f else recent.sumOf { it.second.toDouble() }.toFloat() / recent.size
        return Track(
            id, label, box, score, hits, firstSeenMs, lastSeenMs, confirmed = hits >= confirmHits,
            recentHits = recent.size, recentRuns = runs, recentMeanScore = mean,
        )
    }

    private fun centreDistance(a: Box, b: Box): Float =
        hypot(((a.left + a.right) - (b.left + b.right)) / 2f, ((a.top + a.bottom) - (b.top + b.bottom)) / 2f)
}
