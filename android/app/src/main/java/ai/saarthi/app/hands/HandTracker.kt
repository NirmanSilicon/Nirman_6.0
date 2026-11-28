package ai.saarthi.app.hands

import ai.saarthi.app.geometry.Box
import android.content.Context
import android.graphics.Bitmap
import android.os.SystemClock
import android.util.Log
import com.google.mediapipe.framework.image.BitmapImageBuilder
import com.google.mediapipe.tasks.core.BaseOptions
import com.google.mediapipe.tasks.core.Delegate
import com.google.mediapipe.tasks.vision.core.RunningMode
import com.google.mediapipe.tasks.vision.handlandmarker.HandLandmarker
import java.util.concurrent.Executors
import java.util.concurrent.TimeUnit
import java.util.concurrent.atomic.AtomicBoolean

/**
 * The user's hands in the camera view (PRD 6): MediaPipe Hand Landmarker on the GPU in video mode
 * (it tracks between frames), on its own thread, always on the newest frame it can take, in
 * parallel with the CPU object detector (D7: 14.9 hand runs/s and 6.8 detector runs/s together on
 * the Vivo for 15 min). While it is busy, frames are skipped by the hand tracker only.
 *
 * If the model or the GPU cannot load, [error] says so and no hands are reported (no fallback).
 */
class HandTracker(private val context: Context) {

    /** One hand: 21 landmarks in 0..1 of the upright frame (MediaPipe's order: 0 wrist, 8 index tip). */
    class Hand(val side: String, val score: Float, val landmarks: List<Pair<Float, Float>>, val box: Box) {
        val indexTip: Pair<Float, Float> get() = landmarks[INDEX_TIP]
    }

    class Result(val frameTimestampNs: Long, val hands: List<Hand>, val latencyMs: Double)

    private val executor = Executors.newSingleThreadExecutor { r -> Thread(r, "saarthi-hands") }
    private val busy = AtomicBoolean(false)
    private var landmarker: HandLandmarker? = null
    private var lastTimestampMs = -1L

    @Volatile var error: String? = null
        private set

    /** The newest result, readable from any thread; null until the first run. */
    @Volatile var latest: Result? = null
        private set

    /** When a run last found a hand (elapsedRealtime ms); 0 = never. Sets the idle hand rate (D59). */
    @Volatile var lastHandMs = 0L
        private set

    /** Called on the hand thread after every run. */
    var onResult: (Result) -> Unit = {}

    /** While true, frames are not taken (the CPU is needed for speech recognition, D17). */
    @Volatile var paused = false

    /** At least this long between runs (thermal policy). */
    @Volatile var minIntervalMs = 0L
    @Volatile private var lastStartMs = 0L

    init {
        // Created on its own thread: the GPU delegate's context belongs to the thread that runs it.
        executor.execute {
            try {
                landmarker = HandLandmarker.createFromOptions(
                    context,
                    HandLandmarker.HandLandmarkerOptions.builder()
                        .setBaseOptions(BaseOptions.builder().setModelAssetPath(MODEL).setDelegate(Delegate.GPU).build())
                        .setRunningMode(RunningMode.VIDEO)
                        .setNumHands(2)
                        .build()
                )
            } catch (t: Throwable) {
                error = "${t.javaClass.simpleName}: ${t.message}"
                Log.e(TAG, "hand landmarker failed to load: $error")
            }
        }
    }

    /** Offers a frame; copies it and runs on the hand thread if free. Returns whether it was taken. */
    fun offer(frame: Bitmap, timestampNs: Long): Boolean {
        if (paused || error != null) return false
        if (minIntervalMs > 0 && SystemClock.elapsedRealtime() - lastStartMs < minIntervalMs) return false
        if (!busy.compareAndSet(false, true)) return false
        lastStartMs = SystemClock.elapsedRealtime()
        val copy = frame.copy(Bitmap.Config.ARGB_8888, false)
        executor.execute {
            try {
                val lm = landmarker ?: return@execute
                // Video mode needs strictly increasing timestamps.
                val tMs = maxOf(timestampNs / 1_000_000, lastTimestampMs + 1)
                lastTimestampMs = tMs
                val t0 = SystemClock.elapsedRealtimeNanos()
                val out = lm.detectForVideo(BitmapImageBuilder(copy).build(), tMs)
                val ms = (SystemClock.elapsedRealtimeNanos() - t0) / 1e6
                val hands = out.landmarks().mapIndexed { i, marks ->
                    val pts = marks.map { it.x().coerceIn(0f, 1f) to it.y().coerceIn(0f, 1f) }
                    val cat = out.handedness().getOrNull(i)?.firstOrNull()
                    Hand(sideOf(cat?.categoryName()), cat?.score() ?: 0f, pts, boxOf(pts))
                }
                val r = Result(timestampNs, hands, ms)
                if (hands.isNotEmpty()) lastHandMs = SystemClock.elapsedRealtime()
                latest = r
                onResult(r)
            } catch (t: Throwable) {
                Log.e(TAG, "hand run failed", t)
            } finally {
                copy.recycle()
                busy.set(false)
            }
        }
        return true
    }

    fun close() {
        executor.execute { landmarker?.close() }
        executor.shutdown()
        executor.awaitTermination(2, TimeUnit.SECONDS)
    }

    companion object {
        const val MODEL = "models/hand_landmarker.task"
        const val INDEX_TIP = 8
        private const val TAG = "Saarthi/hands"
        private const val PAD = 0.1f

        /**
         * MediaPipe names handedness as if the image were a mirrored selfie; the back camera's image
         * is not mirrored, so its "Left" is the user's right hand.
         */
        fun sideOf(mediapipe: String?): String = when (mediapipe) {
            "Left" -> "right"
            "Right" -> "left"
            else -> "unknown"
        }

        /** The landmarks' bounding box, padded by a tenth of its size on each side. */
        fun boxOf(pts: List<Pair<Float, Float>>): Box {
            val l = pts.minOf { it.first }; val r = pts.maxOf { it.first }
            val t = pts.minOf { it.second }; val b = pts.maxOf { it.second }
            val px = (r - l) * PAD; val py = (b - t) * PAD
            return Box((l - px).coerceAtLeast(0f), (t - py).coerceAtLeast(0f), (r + px).coerceAtMost(1f), (b + py).coerceAtMost(1f))
        }
    }
}
