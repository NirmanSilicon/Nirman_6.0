package ai.saarthi.app.personal

import ai.saarthi.app.geometry.Box
import android.content.Context
import android.graphics.Bitmap
import android.os.SystemClock
import android.util.Log
import com.google.mediapipe.framework.image.BitmapImageBuilder
import com.google.mediapipe.tasks.core.BaseOptions
import com.google.mediapipe.tasks.core.Delegate
import com.google.mediapipe.tasks.vision.core.RunningMode
import com.google.mediapipe.tasks.vision.imageembedder.ImageEmbedder
import java.util.concurrent.Executors

/**
 * MediaPipe Image Embedder (MobileNet-V3 small, Apache-2.0; PRD 6) on the phone's CPU, on its own
 * thread: one vector per crop of the camera frame. Used only while a personal object is taught, asked
 * about, or a hand holds something once both are taught (D49), so it costs nothing otherwise.
 */
class Embedder(context: Context) {

    class Result(val vector: FloatArray, val ms: Double)

    private val exec = Executors.newSingleThreadExecutor { r -> Thread(r, "saarthi-embed") }
    private var embedder: ImageEmbedder? = null
    @Volatile var error: String? = null
        private set
    @Volatile var busy = false
        private set

    init {
        exec.execute {
            embedder = try {
                ImageEmbedder.createFromOptions(context, ImageEmbedder.ImageEmbedderOptions.builder()
                    .setBaseOptions(BaseOptions.builder().setModelAssetPath(MODEL).setDelegate(Delegate.CPU).build())
                    .setRunningMode(RunningMode.IMAGE).setL2Normalize(true).setQuantize(false).build())
            } catch (t: Throwable) {
                Log.e(TAG, "image embedder failed to load", t)
                error = "image embedder: ${t.message}"
                null
            }
        }
    }

    /**
     * Crops [region] (0..1) of [frame] now, on the caller's thread (the camera frame may be reused),
     * and embeds it on the embedder's thread; [onResult] runs there. False if busy or unavailable.
     */
    fun offer(frame: Bitmap, region: Box, onResult: (Result) -> Unit): Boolean {
        if (busy || error != null) return false
        val x = (region.left * frame.width).toInt().coerceIn(0, frame.width - 2)
        val y = (region.top * frame.height).toInt().coerceIn(0, frame.height - 2)
        val w = ((region.right - region.left) * frame.width).toInt().coerceIn(2, frame.width - x)
        val h = ((region.bottom - region.top) * frame.height).toInt().coerceIn(2, frame.height - y)
        val crop = try {
            Bitmap.createScaledBitmap(Bitmap.createBitmap(frame, x, y, w, h), SIZE, SIZE, true)
        } catch (t: Throwable) {
            Log.e(TAG, "crop failed", t)
            return false
        }
        busy = true
        exec.execute {
            try {
                val e = embedder ?: return@execute
                val t0 = SystemClock.elapsedRealtimeNanos()
                val r = e.embed(BitmapImageBuilder(crop).build())
                val v = r.embeddingResult().embeddings().firstOrNull()?.floatEmbedding() ?: return@execute
                onResult(Result(v, (SystemClock.elapsedRealtimeNanos() - t0) / 1e6))
            } catch (t: Throwable) {
                Log.e(TAG, "embedding failed", t)
            } finally {
                crop.recycle()
                busy = false
            }
        }
        return true
    }

    fun close() = exec.execute { embedder?.close(); embedder = null }

    companion object {
        private const val TAG = "Saarthi/embed"
        const val MODEL = "models/mobilenet_v3_small_embedder.tflite"
        const val SIZE = 224
    }
}
