package ai.saarthi.app.bench

import android.graphics.Bitmap
import android.graphics.Matrix
import android.os.Handler
import android.os.Looper
import android.os.SystemClock
import android.util.Size
import androidx.activity.ComponentActivity
import androidx.camera.core.CameraSelector
import androidx.camera.core.ImageAnalysis
import androidx.camera.core.resolutionselector.AspectRatioStrategy
import androidx.camera.core.resolutionselector.ResolutionSelector
import androidx.camera.core.resolutionselector.ResolutionStrategy
import androidx.camera.lifecycle.ProcessCameraProvider
import androidx.core.content.ContextCompat
import org.json.JSONObject
import java.util.concurrent.Executors

/**
 * Live camera frames for the model benchmarks: back camera, about [targetSize] (default 640 × 480), converted to an
 * upright ARGB bitmap. [onFrame] runs on a background thread, one frame at a time (newer frames
 * are dropped while it works, as in the real pipeline); it returns false to stop. Frames are never
 * stored.
 */
class FrameLoop(private val activity: ComponentActivity, private val targetSize: Size = Size(640, 480)) {

    class Frame(val bitmap: Bitmap, val index: Int, val prepMs: Double)

    private val main = Handler(Looper.getMainLooper())
    private val executor = Executors.newSingleThreadExecutor()

    fun run(onFrame: (Frame) -> Boolean, onEnd: (JSONObject) -> Unit) {
        val stats = JSONObject()
        val future = ProcessCameraProvider.getInstance(activity)
        future.addListener({
            val provider = future.get()
            val analysis = ImageAnalysis.Builder()
                .setResolutionSelector(
                    ResolutionSelector.Builder()
                        .setAspectRatioStrategy(AspectRatioStrategy.RATIO_4_3_FALLBACK_AUTO_STRATEGY)
                        .setResolutionStrategy(
                            ResolutionStrategy(targetSize, ResolutionStrategy.FALLBACK_RULE_CLOSEST_HIGHER_THEN_LOWER)
                        )
                        .build()
                )
                .setBackpressureStrategy(ImageAnalysis.STRATEGY_KEEP_ONLY_LATEST)
                .setOutputImageFormat(ImageAnalysis.OUTPUT_IMAGE_FORMAT_RGBA_8888)
                .build()

            var index = 0
            var firstNs = -1L
            var stopped = false
            analysis.setAnalyzer(executor) { image ->
                if (stopped) { image.close(); return@setAnalyzer }
                val t0 = SystemClock.elapsedRealtimeNanos()
                if (firstNs < 0) firstNs = t0
                val raw = image.toBitmap()
                val rotation = image.imageInfo.rotationDegrees
                image.close()
                val upright = if (rotation == 0) raw else {
                    Bitmap.createBitmap(raw, 0, 0, raw.width, raw.height, Matrix().apply { postRotate(rotation.toFloat()) }, false)
                        .also { raw.recycle() }
                }
                val prepMs = (SystemClock.elapsedRealtimeNanos() - t0) / 1e6
                if (index == 0) stats.put("frameSize", "${upright.width}x${upright.height}")
                val keepGoing = onFrame(Frame(upright, index++, prepMs))
                upright.recycle()
                if (!keepGoing) {
                    stopped = true
                    val seconds = (SystemClock.elapsedRealtimeNanos() - firstNs) / 1e9
                    stats.put("framesProcessed", index)
                    stats.put("seconds", BenchReport.round(seconds))
                    stats.put("processedFps", BenchReport.round(index / seconds))
                    main.post { provider.unbindAll(); onEnd(stats) }
                }
            }
            provider.unbindAll()
            provider.bindToLifecycle(activity, CameraSelector.DEFAULT_BACK_CAMERA, analysis)
        }, ContextCompat.getMainExecutor(activity))
    }

    fun close() = executor.shutdown()
}
