package ai.saarthi.app.capture

import ai.saarthi.app.perf.LatencyStats
import ai.saarthi.app.perf.LatencySummary

/**
 * Counts frames and the gaps between them, so the delivered frame rate is measured, not assumed.
 * [snapshotAndReset] returns the window since the last call. Thread-safe.
 */
class FrameStats {

    data class Window(val frames: Int, val seconds: Double, val gaps: LatencySummary?) {
        val fps: Double get() = if (seconds <= 0.0) 0.0 else frames / seconds
    }

    private val lock = Any()
    private var lastNs = -1L
    private var windowStartNs = -1L
    private var frames = 0
    private val gapsMs = ArrayList<Double>(512)

    fun onFrame(timestampNs: Long) = synchronized(lock) {
        if (windowStartNs < 0) windowStartNs = timestampNs
        if (lastNs >= 0) gapsMs += (timestampNs - lastNs) / 1e6
        lastNs = timestampNs
        frames++
    }

    fun snapshotAndReset(nowNs: Long): Window = synchronized(lock) {
        val seconds = if (windowStartNs < 0) 0.0 else (nowNs - windowStartNs) / 1e9
        val w = Window(frames, seconds, LatencyStats.summarize(gapsMs))
        frames = 0
        gapsMs.clear()
        windowStartNs = nowNs
        w
    }
}
