package ai.saarthi.app.app

import ai.saarthi.app.capture.Frame
import ai.saarthi.app.orientation.Pose
import android.graphics.Bitmap
import android.os.SystemClock
import java.io.File
import java.io.FileOutputStream
import java.text.SimpleDateFormat
import java.util.Date
import java.util.Locale
import java.util.concurrent.Executors
import java.util.concurrent.atomic.AtomicBoolean

/**
 * Dev build only: saves a short labelled clip of camera frames (JPEG, up to [fps]) with the
 * phone's pose at each frame, for developing and fitting System 2's cues offline (D34: a developer
 * flag, never with people in view, PRD rule 7.6). The demo build has no such class.
 *
 *   adb shell am broadcast -a ai.saarthi.dev.CAPTURE --es label laptop_picture --ei seconds 15
 *
 * Output: files/captures/<label>_<time>/<frameNs>.jpg and poses.jsonl. A frame arriving while the
 * last one is still being written is skipped, so capture never queues work on the camera thread.
 */
class FrameCapture(
    private val dir: File,
    private val label: String,
    private val seconds: Int,
    private val poseAt: (Long) -> Pose?,
    private val fps: Int = 15,
) {
    private val exec = Executors.newSingleThreadExecutor { r -> Thread(r, "saarthi-capture") }
    private val busy = AtomicBoolean(false)
    private val endMs = SystemClock.elapsedRealtime() + seconds * 1000L
    private var lastNs = 0L
    val out = File(dir, "${label}_${SimpleDateFormat("yyyyMMdd_HHmmss", Locale.US).format(Date())}").apply { mkdirs() }
    private val poses = File(out, "poses.jsonl")
    @Volatile var saved = 0; private set

    val done: Boolean get() = SystemClock.elapsedRealtime() > endMs

    /** Camera thread. */
    fun offer(frame: Frame) {
        if (done || frame.timestampNs - lastNs < 1_000_000_000L / fps || !busy.compareAndSet(false, true)) return
        lastNs = frame.timestampNs
        val copy = frame.bitmap.copy(Bitmap.Config.ARGB_8888, false)
        val ns = frame.timestampNs
        exec.execute {
            try {
                FileOutputStream(File(out, "$ns.jpg")).use { copy.compress(Bitmap.CompressFormat.JPEG, 90, it) }
                val p = poseAt(ns)
                val line = if (p == null) "{\"frameNs\":$ns,\"pose\":null}"
                else "{\"frameNs\":$ns,\"poseNs\":${p.timestampNs},\"tiltDeg\":${p.tiltDeg},\"rollDeg\":${p.rollDeg},\"yawDeg\":${p.yawDeg},\"rotationDegS\":${p.rotationDegS}}"
                poses.appendText(line + "\n")
                saved++
            } finally {
                copy.recycle()
                busy.set(false)
            }
        }
    }

    fun close() = exec.shutdown()
}
