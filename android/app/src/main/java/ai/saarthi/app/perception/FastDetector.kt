package ai.saarthi.app.perception

import ai.saarthi.app.geometry.Box
import ai.saarthi.app.geometry.LabelledBox
import android.content.Context
import android.graphics.Bitmap
import android.os.SystemClock
import android.util.Log
import com.google.mediapipe.framework.image.BitmapImageBuilder
import com.google.mediapipe.tasks.core.BaseOptions
import com.google.mediapipe.tasks.core.Delegate
import com.google.mediapipe.tasks.vision.core.RunningMode
import com.google.mediapipe.tasks.vision.objectdetector.ObjectDetector
import java.util.concurrent.Executors
import java.util.concurrent.TimeUnit
import java.util.concurrent.atomic.AtomicBoolean

/**
 * The fast-tier object detector (PRD 6): EfficientDet-Lite0 int8 (COCO) on the CPU, on its own
 * thread, always on the newest frame it can take (D7). While it is busy, frames are skipped by the
 * detector only; nothing queues. Raw scores and boxes are kept (System 2 needs them).
 *
 * If the model cannot load, the detector says so in [error] and produces nothing: there is no mock
 * fallback (PRD 3.1, rule 7.1).
 */
class FastDetector(context: Context, val model: String = MODEL) {

    /**
     * One detector run. Boxes are normalised to 0..1 of the frame. [frame] is the frame the detector
     * ran on, valid **only during the callback** (System 2 takes a small grey copy when it needs one).
     */
    class Result(val frameTimestampNs: Long, val detections: List<LabelledBox>, val latencyMs: Double, val frame: Bitmap? = null)

    private val executor = Executors.newSingleThreadExecutor { r -> Thread(r, "saarthi-detector") }
    private val busy = AtomicBoolean(false)
    @Volatile private var lastStartMs = 0L

    /** At least this long between runs; raised when the phone is hot (ThermalWatch). 0 = run whenever free. */
    @Volatile var minIntervalMs = 0L
    private val detector: ObjectDetector?
    val error: String?

    init {
        var d: ObjectDetector? = null
        var e: String? = null
        try {
            d = ObjectDetector.createFromOptions(
                context,
                ObjectDetector.ObjectDetectorOptions.builder()
                    .setBaseOptions(BaseOptions.builder().setModelAssetPath(model).setDelegate(Delegate.CPU).build())
                    .setRunningMode(RunningMode.IMAGE)
                    .setScoreThreshold(SCORE_THRESHOLD)
                    .setMaxResults(MAX_RESULTS)
                    .build()
            )
        } catch (t: Throwable) {
            e = "${t.javaClass.simpleName}: ${t.message}"
            Log.e(TAG, "detector failed to load: $e")
        }
        detector = d
        error = e
    }

    /**
     * Offers a frame. If the detector is free, it copies the bitmap and runs on its own thread,
     * then calls [onResult] there; otherwise the frame is skipped. Returns whether it was taken.
     */
    fun offer(frame: Bitmap, timestampNs: Long, onResult: (Result) -> Unit): Boolean {
        val det = detector ?: return false
        if (minIntervalMs > 0 && SystemClock.elapsedRealtime() - lastStartMs < minIntervalMs) return false
        if (!busy.compareAndSet(false, true)) return false
        lastStartMs = SystemClock.elapsedRealtime()
        val copy = frame.copy(Bitmap.Config.ARGB_8888, false)
        executor.execute {
            try {
                val t0 = SystemClock.elapsedRealtimeNanos()
                val out = det.detect(BitmapImageBuilder(copy).build())
                val ms = (SystemClock.elapsedRealtimeNanos() - t0) / 1e6
                val w = copy.width.toFloat()
                val h = copy.height.toFloat()
                val list = out.detections().mapNotNull { d ->
                    val c = d.categories().firstOrNull() ?: return@mapNotNull null
                    val b = d.boundingBox()
                    LabelledBox(
                        c.categoryName(),
                        c.score(),
                        Box((b.left / w).coerceIn(0f, 1f), (b.top / h).coerceIn(0f, 1f), (b.right / w).coerceIn(0f, 1f), (b.bottom / h).coerceIn(0f, 1f)),
                    )
                }
                onResult(Result(timestampNs, list, ms, copy))
            } catch (t: Throwable) {
                Log.e(TAG, "detector run failed", t)
            } finally {
                copy.recycle()
                busy.set(false)
            }
        }
        return true
    }

    fun close() {
        executor.shutdown()
        executor.awaitTermination(2, TimeUnit.SECONDS)
        detector?.close()
    }

    companion object {
        const val MODEL = "models/efficientdet_lite0_int8.tflite"
        /** Larger sibling: 448 px input instead of 320 (trial, D15). */
        const val MODEL_LITE2 = "models/efficientdet_lite2_int8.tflite"
        /** Raw proposals above this go to the tracker; speaking needs far more (see the brief). */
        const val SCORE_THRESHOLD = 0.3f
        const val MAX_RESULTS = 10
        private const val TAG = "Saarthi/detector"
    }
}
