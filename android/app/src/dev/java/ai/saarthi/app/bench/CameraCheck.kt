package ai.saarthi.app.bench

import ai.saarthi.app.perf.LatencyStats
import android.hardware.camera2.CameraCharacteristics
import android.hardware.camera2.CaptureRequest
import android.os.Handler
import android.util.Range
import androidx.camera.camera2.interop.Camera2CameraInfo
import androidx.camera.camera2.interop.Camera2Interop
import androidx.camera.camera2.interop.ExperimentalCamera2Interop
import androidx.camera.core.ImageProxy
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
 * Opens the back camera with CameraX image analysis at about 640 × 480 and counts frames for
 * [durationMs]. The analyser does no work, so this measures what the camera alone delivers: the
 * ceiling for every perception benchmark that follows. No frame is stored or displayed.
 *
 * [fixedFps] pins the auto-exposure frame-rate range (e.g. 30..30); auto-exposure otherwise slows
 * the shutter in dim light. Mean luma (0–255, sampled from the Y plane) shows the cost in
 * brightness.
 */
@androidx.annotation.OptIn(markerClass = [ExperimentalCamera2Interop::class])
class CameraCheck(
    private val activity: ComponentActivity,
    private val durationMs: Long = 10_000L,
    private val fixedFps: Int? = null,
) {
    private val main = Handler(Looper.getMainLooper())
    private val executor = Executors.newSingleThreadExecutor()

    fun run(onDone: (JSONObject) -> Unit) {
        val out = JSONObject()
        val openedAt = SystemClock.elapsedRealtimeNanos()
        val future = ProcessCameraProvider.getInstance(activity)
        future.addListener({
            val provider = future.get()
            val builder = ImageAnalysis.Builder()
            if (fixedFps != null) {
                Camera2Interop.Extender(builder)
                    .setCaptureRequestOption(CaptureRequest.CONTROL_AE_TARGET_FPS_RANGE, Range(fixedFps, fixedFps))
                out.put("requestedFpsRange", "$fixedFps..$fixedFps")
            } else {
                out.put("requestedFpsRange", "camera default")
            }
            val analysis = builder
                .setResolutionSelector(
                    ResolutionSelector.Builder()
                        .setAspectRatioStrategy(AspectRatioStrategy.RATIO_4_3_FALLBACK_AUTO_STRATEGY)
                        .setResolutionStrategy(
                            ResolutionStrategy(
                                Size(640, 480),
                                ResolutionStrategy.FALLBACK_RULE_CLOSEST_HIGHER_THEN_LOWER,
                            )
                        )
                        .build()
                )
                .setBackpressureStrategy(ImageAnalysis.STRATEGY_KEEP_ONLY_LATEST)
                .build()

            val intervalsMs = ArrayList<Double>(400)
            val lumas = ArrayList<Double>(400)
            var firstNs = -1L
            var lastNs = -1L
            var frames = 0
            var done = false

            analysis.setAnalyzer(executor) { image ->
                val now = SystemClock.elapsedRealtimeNanos()
                if (firstNs < 0) {
                    firstNs = now
                    out.put("openToFirstFrameMs", (now - openedAt) / 1e6)
                    out.put("frameSize", "${image.width}x${image.height}")
                    out.put("rotationDegrees", image.imageInfo.rotationDegrees)
                } else {
                    intervalsMs += (now - lastNs) / 1e6
                }
                lastNs = now
                frames++
                lumas += meanLuma(image)
                image.close()
                if (!done && now - firstNs >= durationMs * 1_000_000L) {
                    done = true
                    val seconds = (now - firstNs) / 1e9
                    out.put("frames", frames)
                    out.put("seconds", BenchReport.round(seconds))
                    out.put("fps", BenchReport.round((frames - 1) / seconds))
                    out.put("frameIntervalMs", BenchReport.toJson(LatencyStats.summarize(intervalsMs)))
                    out.put("meanLuma", BenchReport.round(lumas.average()))
                    main.post {
                        provider.unbindAll()
                        onDone(out)
                    }
                }
            }
            try {
                provider.unbindAll()
                val camera = provider.bindToLifecycle(activity, CameraSelector.DEFAULT_BACK_CAMERA, analysis)
                val ranges = Camera2CameraInfo.from(camera.cameraInfo)
                    .getCameraCharacteristic(CameraCharacteristics.CONTROL_AE_AVAILABLE_TARGET_FPS_RANGES)
                out.put("availableFpsRanges", ranges?.joinToString { "${it.lower}..${it.upper}" } ?: "unknown")
            } catch (e: Exception) {
                out.put("error", "bind failed: ${e.message}")
                onDone(out)
                return@addListener
            }
            // No frames at all (camera busy, blocked by the OS): report it instead of hanging.
            main.postDelayed({
                if (firstNs < 0) {
                    out.put("error", "no frames within ${durationMs + 10_000} ms")
                    provider.unbindAll()
                    onDone(out)
                }
            }, durationMs + 10_000L)
        }, ContextCompat.getMainExecutor(activity))
    }

    fun close() = executor.shutdown()

    /** Mean of every 8th pixel in every 8th row of the Y (luma) plane. */
    private fun meanLuma(image: ImageProxy): Double {
        val plane = image.planes[0]
        val buf = plane.buffer
        var sum = 0L
        var n = 0
        var y = 0
        while (y < image.height) {
            var x = 0
            while (x < image.width) {
                sum += buf.get(y * plane.rowStride + x * plane.pixelStride).toInt() and 0xFF
                n++
                x += 8
            }
            y += 8
        }
        return if (n == 0) 0.0 else sum.toDouble() / n
    }
}
