package ai.saarthi.app.bench

import ai.saarthi.app.perf.LatencyStats
import android.content.Context
import android.graphics.Bitmap
import android.os.PowerManager
import android.os.SystemClock
import com.google.mediapipe.framework.image.BitmapImageBuilder
import com.google.mediapipe.tasks.core.BaseOptions
import com.google.mediapipe.tasks.core.Delegate
import com.google.mediapipe.tasks.vision.core.RunningMode
import com.google.mediapipe.tasks.vision.handlandmarker.HandLandmarker
import com.google.mediapipe.tasks.vision.objectdetector.ObjectDetector
import org.json.JSONArray
import org.json.JSONObject
import java.util.concurrent.Executors
import java.util.concurrent.TimeUnit
import java.util.concurrent.atomic.AtomicBoolean

/**
 * The fast tier's two models together, as the real pipeline will run them: object detector then
 * hand landmarker on every frame, for [minutes]. Every 30 s it records achieved frames per second,
 * per-model latency, thermal status and thermal headroom, so slowdown from heat shows up as a trend.
 * In VIDEO mode the hand landmarker follows a found hand from frame to frame instead of searching the
 * whole image for a palm every time, which is how reach guidance will run it.
 */
class PipelineBench(
    private val context: Context,
    private val minutes: Double,
    private val detectorModel: String,
    private val detectorDelegate: Delegate,
    private val handsDelegate: Delegate,
    private val handsVideoMode: Boolean,
    private val parallel: Boolean,
    private val report: BenchReport,
) {
    private lateinit var detector: ObjectDetector
    private lateinit var hands: HandLandmarker
    private val windows = JSONArray()
    private var windowStart = 0L
    private var runStart = 0L
    private var windowFrames = 0
    private val lock = Any()
    private val detMs = ArrayList<Double>()      // guarded by lock (written by the detector thread in parallel mode)
    private val allDet = ArrayList<Double>()     // guarded by lock
    private var windowDetRuns = 0                // guarded by lock
    private val handMs = ArrayList<Double>()
    private val allHand = ArrayList<Double>()
    private var totalFrames = 0
    private var framesWithHand = 0

    // Parallel mode: the detector runs on its own thread on a copy of the newest frame, whenever it
    // is free; frames arriving while it is busy are skipped by the detector (not by hands).
    private val detExecutor = Executors.newSingleThreadExecutor()
    private val detBusy = AtomicBoolean(false)

    fun open(): JSONObject {
        detector = ObjectDetector.createFromOptions(
            context,
            ObjectDetector.ObjectDetectorOptions.builder()
                .setBaseOptions(BaseOptions.builder().setModelAssetPath(detectorModel).setDelegate(detectorDelegate).build())
                .setRunningMode(RunningMode.IMAGE).setScoreThreshold(0.3f).setMaxResults(10).build()
        )
        hands = HandLandmarker.createFromOptions(
            context,
            HandLandmarker.HandLandmarkerOptions.builder()
                .setBaseOptions(BaseOptions.builder().setModelAssetPath(HandsBench.MODEL).setDelegate(handsDelegate).build())
                .setRunningMode(if (handsVideoMode) RunningMode.VIDEO else RunningMode.IMAGE).setNumHands(2).build()
        )
        return JSONObject()
            .put("minutes", minutes)
            .put("mode", if (parallel) "parallel: hands every frame on the camera thread, detector on its own thread on the newest frame" else "sequential: detector then hands on every frame")
            .put("detector", "$detectorModel on $detectorDelegate")
            .put("hands", "${HandsBench.MODEL} on $handsDelegate, ${if (handsVideoMode) "VIDEO (tracks between frames)" else "IMAGE (palm search every frame)"} mode")
    }

    fun onFrame(frame: FrameLoop.Frame): Boolean {
        val now = SystemClock.elapsedRealtime()
        if (runStart == 0L) { runStart = now; windowStart = now }
        val image = BitmapImageBuilder(frame.bitmap).build()
        if (parallel) {
            if (detBusy.compareAndSet(false, true)) {
                val copy = frame.bitmap.copy(Bitmap.Config.ARGB_8888, false)
                detExecutor.execute {
                    try {
                        val t = SystemClock.elapsedRealtimeNanos()
                        detector.detect(BitmapImageBuilder(copy).build())
                        recordDetector((SystemClock.elapsedRealtimeNanos() - t) / 1e6)
                    } finally {
                        copy.recycle()
                        detBusy.set(false)
                    }
                }
            }
        } else {
            val t = SystemClock.elapsedRealtimeNanos()
            detector.detect(image)
            recordDetector((SystemClock.elapsedRealtimeNanos() - t) / 1e6)
        }
        val t0 = SystemClock.elapsedRealtimeNanos()
        val handResult = if (handsVideoMode) hands.detectForVideo(image, now) else hands.detect(image)
        if (handResult.landmarks().isNotEmpty()) framesWithHand++
        val h = (SystemClock.elapsedRealtimeNanos() - t0) / 1e6
        handMs += h; allHand += h
        windowFrames++
        totalFrames++
        if (now - windowStart >= WINDOW_MS) closeWindow(now)
        return now - runStart < minutes * 60_000
    }

    private fun recordDetector(ms: Double) = synchronized(lock) {
        detMs += ms
        allDet += ms
        windowDetRuns++
    }

    private fun closeWindow(now: Long) {
        val pm = context.getSystemService(PowerManager::class.java)
        val seconds = (now - windowStart) / 1000.0
        val (detP50, detRuns) = synchronized(lock) {
            val r = (LatencyStats.summarize(detMs)?.p50Ms ?: 0.0) to windowDetRuns
            detMs.clear()
            windowDetRuns = 0
            r
        }
        windows.put(JSONObject().apply {
            put("atSeconds", (now - runStart) / 1000)
            put("fps", BenchReport.round(windowFrames / seconds))            // frames with hand tracking
            put("detectorRunsPerSecond", BenchReport.round(detRuns / seconds))
            put("detectorP50Ms", BenchReport.round(detP50))
            put("handsP50Ms", BenchReport.round(LatencyStats.summarize(handMs)?.p50Ms ?: 0.0))
            put("thermalStatus", pm.currentThermalStatus)
            put("thermalHeadroom", BenchReport.round(pm.getThermalHeadroom(0).toDouble()))
            put("batteryTempC", report.thermal().opt("batteryTempC"))
        })
        windowStart = now
        windowFrames = 0
        handMs.clear()
    }

    fun result(): JSONObject = JSONObject()
        .put("totalFrames", totalFrames)
        .put("framesWithHandFraction", if (totalFrames == 0) 0 else BenchReport.round(framesWithHand.toDouble() / totalFrames))
        .put("detectorRuns", synchronized(lock) { allDet.size })
        .put("detectorMs", BenchReport.toJson(synchronized(lock) { LatencyStats.summarize(allDet) }))
        .put("handsMs", BenchReport.toJson(LatencyStats.summarize(allHand)))
        .put("windows", windows)
        .put("note", "thermalHeadroom: 1.0 = throttling threshold; NaN if unsupported")

    fun close() {
        detExecutor.shutdown()
        detExecutor.awaitTermination(2, TimeUnit.SECONDS)
        if (::detector.isInitialized) detector.close()
        if (::hands.isInitialized) hands.close()
    }

    private companion object {
        const val WINDOW_MS = 30_000L
    }
}
