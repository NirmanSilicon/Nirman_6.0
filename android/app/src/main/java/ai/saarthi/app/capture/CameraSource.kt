package ai.saarthi.app.capture

// Adapted from SightBuddy core/CameraXManager.kt (MIT, Copyright (c) 2026 Drophouse Ltd, commit
// 578771d): bind/stop/shutdown structure, keep-only-latest backpressure, frame counters. Changed:
// no preview surface or throttle (not needed at a table); no coroutine channel (the detector
// takes frames with a busy flag instead, as measured in Phase 0, D7); RGBA frames rotated upright
// (from Saarthi's Phase 0 FrameLoop); auto-exposure pinned to 30..30 fps (Phase 0 CameraCheck);
// the torch, with exposure and white balance locked around it, only for System 2's torch test (D38).
// Phase 5 (D59): two images reused for every frame instead of two new ones (~72 MB a second at 30 fps,
// the cause of most garbage collection), and only [preparedFps] of the sensor's frames prepared.

import android.content.Context
import android.graphics.Bitmap
import android.graphics.Canvas
import android.graphics.Matrix
import android.graphics.RectF
import android.hardware.camera2.CaptureRequest
import android.os.SystemClock
import android.util.Log
import android.util.Range
import android.util.Size
import androidx.camera.camera2.interop.Camera2CameraControl
import androidx.camera.camera2.interop.Camera2Interop
import androidx.camera.camera2.interop.CaptureRequestOptions
import androidx.camera.camera2.interop.ExperimentalCamera2Interop
import androidx.camera.core.Camera
import androidx.camera.core.CameraSelector
import androidx.camera.core.ImageAnalysis
import androidx.camera.core.ImageProxy
import androidx.camera.core.Preview
import androidx.camera.core.resolutionselector.AspectRatioStrategy
import androidx.camera.core.resolutionselector.ResolutionSelector
import androidx.camera.core.resolutionselector.ResolutionStrategy
import androidx.camera.lifecycle.ProcessCameraProvider
import androidx.core.content.ContextCompat
import androidx.lifecycle.LifecycleOwner
import java.util.concurrent.ExecutorService
import java.util.concurrent.Executors

/**
 * The back camera as a stream of upright frames, about 640 × 480 (480 × 640 in portrait).
 *
 * [onFrame] runs on the camera thread, one frame at a time; frames arriving while it runs are
 * dropped by CameraX (keep-only-latest), so a slow consumer never builds a queue. The frame's
 * bitmap is reused for the next frame once [onFrame] returns: a consumer on another thread must copy it.
 * Frames are never stored here. [Frame.index] counts camera frames, prepared or not.
 */
@androidx.annotation.OptIn(markerClass = [ExperimentalCamera2Interop::class])
class CameraSource(
    private val context: Context,
    private val targetSize: Size = Size(640, 480),
    private val fixedFps: Int? = 30,
) {
    private val executor: ExecutorService = Executors.newSingleThreadExecutor { r -> Thread(r, "saarthi-camera") }
    private var provider: ProcessCameraProvider? = null
    @Volatile private var camera: Camera? = null

    /** Whether the bound camera has a torch (false until the camera is bound). */
    val hasTorch: Boolean get() = camera?.cameraInfo?.hasFlashUnit() == true

    /** Torch on or off; main thread. Does nothing before the camera is bound. */
    fun torch(on: Boolean) {
        camera?.cameraControl?.enableTorch(on)
    }

    /**
     * Holds (or releases) auto-exposure and white balance where they are, so a change of light shows
     * as a change of brightness instead of being corrected away (the torch test). Main thread.
     */
    fun lockExposure(lock: Boolean) {
        val c = camera ?: return
        Camera2CameraControl.from(c.cameraControl).addCaptureRequestOptions(
            CaptureRequestOptions.Builder()
                .setCaptureRequestOption(CaptureRequest.CONTROL_AE_LOCK, lock)
                .setCaptureRequestOption(CaptureRequest.CONTROL_AWB_LOCK, lock)
                .build(),
        )
    }

    /** Frame gaps and counts of the frames passed on; read from any thread. */
    val stats = FrameStats()

    /**
     * How many frames a second are prepared and passed on, spread evenly over the sensor's [fixedFps] (at
     * or above it = all). The sensor keeps its rate (short exposures); the others are closed unread, which
     * costs almost nothing.
     */
    @Volatile var preparedFps = Int.MAX_VALUE
    private var credit = 0

    // Camera thread only: the two images reused for every frame.
    private var raw: Bitmap? = null
    private var upright: Bitmap? = null
    private val canvas = Canvas()
    private val turn = Matrix()
    private val bounds = RectF()

    /**
     * Starts the camera. With [preview], the same camera also feeds an on-screen view; both use
     * the full 4:3 sensor area, so what the screen shows is what perception analyses.
     */
    fun start(owner: LifecycleOwner, preview: Preview.SurfaceProvider? = null, onFrame: (Frame) -> Unit) {
        val future = ProcessCameraProvider.getInstance(context)
        future.addListener({
            val p = future.get()
            provider = p
            val selector = ResolutionSelector.Builder()
                .setAspectRatioStrategy(AspectRatioStrategy.RATIO_4_3_FALLBACK_AUTO_STRATEGY)
                .setResolutionStrategy(ResolutionStrategy(targetSize, ResolutionStrategy.FALLBACK_RULE_CLOSEST_HIGHER_THEN_LOWER))
                .build()
            val builder = ImageAnalysis.Builder()
            if (fixedFps != null) {
                Camera2Interop.Extender(builder)
                    .setCaptureRequestOption(CaptureRequest.CONTROL_AE_TARGET_FPS_RANGE, Range(fixedFps, fixedFps))
            }
            val analysis = builder
                .setResolutionSelector(selector)
                .setBackpressureStrategy(ImageAnalysis.STRATEGY_KEEP_ONLY_LATEST)
                .setOutputImageFormat(ImageAnalysis.OUTPUT_IMAGE_FORMAT_RGBA_8888)
                .build()

            var index = 0L
            analysis.setAnalyzer(executor) { image ->
                val i = index++
                val sensorFps = fixedFps ?: 30
                credit += minOf(preparedFps, sensorFps)
                if (credit < sensorFps) { image.close(); return@setAnalyzer }
                credit -= sensorFps
                val tNs = SystemClock.elapsedRealtimeNanos()
                val frame = try {
                    prepare(image)
                } finally {
                    image.close()
                }
                stats.onFrame(tNs)
                try {
                    onFrame(Frame(frame, i, tNs))
                } catch (e: Throwable) {
                    Log.e(TAG, "frame consumer failed on frame $i", e)
                }
            }
            try {
                p.unbindAll()
                if (preview != null) {
                    val view = Preview.Builder().setResolutionSelector(selector).build().also { it.setSurfaceProvider(preview) }
                    camera = p.bindToLifecycle(owner, CameraSelector.DEFAULT_BACK_CAMERA, view, analysis)
                } else {
                    camera = p.bindToLifecycle(owner, CameraSelector.DEFAULT_BACK_CAMERA, analysis)
                }
            } catch (e: Exception) {
                Log.e(TAG, "camera bind failed", e)
            }
        }, ContextCompat.getMainExecutor(context))
    }

    /** The image, upright, in the reused bitmaps. Pixels as `ImageProxy.toBitmap()` and a rotation without filtering. */
    private fun prepare(image: ImageProxy): Bitmap {
        val w = image.width
        val h = image.height
        val src = raw?.takeIf { it.width == w && it.height == h } ?: Bitmap.createBitmap(w, h, Bitmap.Config.ARGB_8888).also { raw = it }
        val plane = image.planes[0]
        if (plane.pixelStride == 4 && plane.rowStride == w * 4) {
            plane.buffer.rewind()
            src.copyPixelsFromBuffer(plane.buffer)
        } else {
            // Padded rows (not seen on the Vivo): CameraX's own conversion, then copied in.
            val tmp = image.toBitmap()
            canvas.setBitmap(src)
            canvas.drawBitmap(tmp, 0f, 0f, null)
            tmp.recycle()
        }
        val rotation = image.imageInfo.rotationDegrees
        if (rotation == 0) return src
        val (ow, oh) = if (rotation % 180 == 0) w to h else h to w
        val out = upright?.takeIf { it.width == ow && it.height == oh } ?: Bitmap.createBitmap(ow, oh, Bitmap.Config.ARGB_8888).also { upright = it }
        turn.reset()
        turn.postRotate(rotation.toFloat())
        bounds.set(0f, 0f, w.toFloat(), h.toFloat())
        turn.mapRect(bounds)
        turn.postTranslate(-bounds.left, -bounds.top)
        canvas.setBitmap(out)
        canvas.drawBitmap(src, turn, null)
        canvas.setBitmap(null)
        return out
    }

    fun stop() {
        camera = null
        provider?.unbindAll()
    }

    fun shutdown() {
        stop()
        executor.shutdown()
    }

    private companion object {
        const val TAG = "Saarthi/capture"
    }
}
