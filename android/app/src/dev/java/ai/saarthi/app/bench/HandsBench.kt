package ai.saarthi.app.bench

import ai.saarthi.app.perf.LatencyStats
import android.content.Context
import android.os.SystemClock
import com.google.mediapipe.framework.image.BitmapImageBuilder
import com.google.mediapipe.tasks.core.BaseOptions
import com.google.mediapipe.tasks.core.Delegate
import com.google.mediapipe.tasks.vision.core.RunningMode
import com.google.mediapipe.tasks.vision.handlandmarker.HandLandmarker
import org.json.JSONArray
import org.json.JSONObject
import kotlin.math.abs

/**
 * MediaPipe Hand Landmarker on live frames, CPU and GPU on the same frame: latency, how often a
 * hand is found, and how closely the GPU landmarks agree with the CPU ones (mean absolute
 * difference of the 21 landmarks, in fractions of the image size). Needs a hand in view.
 */
class HandsBench(private val context: Context, private val frames: Int = 60, private val warmup: Int = 3) {

    private class Config(val name: String, val delegate: Delegate) {
        var landmarker: HandLandmarker? = null
        var error: String? = null
        val latencies = ArrayList<Double>()
        var framesWithHand = 0
        var measured = 0
    }

    private val configs = listOf(Config("cpu", Delegate.CPU), Config("gpu", Delegate.GPU))
    private val gpuVsCpu = ArrayList<Double>()

    fun open(): JSONObject {
        val init = JSONObject()
        for (c in configs) {
            val t0 = SystemClock.elapsedRealtime()
            try {
                c.landmarker = HandLandmarker.createFromOptions(
                    context,
                    HandLandmarker.HandLandmarkerOptions.builder()
                        .setBaseOptions(BaseOptions.builder().setModelAssetPath(MODEL).setDelegate(c.delegate).build())
                        .setRunningMode(RunningMode.IMAGE)
                        .setNumHands(2)
                        .build()
                )
                init.put(c.name, JSONObject().put("initMs", SystemClock.elapsedRealtime() - t0))
            } catch (e: Throwable) {
                c.error = "${e.javaClass.simpleName}: ${e.message}"
                init.put(c.name, JSONObject().put("error", c.error))
            }
        }
        return init
    }

    fun onFrame(frame: FrameLoop.Frame): Boolean {
        val image = BitmapImageBuilder(frame.bitmap).build()
        val firstHand = HashMap<String, List<Pair<Float, Float>>>()
        for (c in configs) {
            val lm = c.landmarker ?: continue
            val t0 = SystemClock.elapsedRealtimeNanos()
            val r = try { lm.detect(image) } catch (e: Throwable) { c.error = e.message; null } ?: continue
            val ms = (SystemClock.elapsedRealtimeNanos() - t0) / 1e6
            if (frame.index < warmup) continue
            c.latencies += ms
            c.measured++
            if (r.landmarks().isNotEmpty()) {
                c.framesWithHand++
                firstHand[c.name] = r.landmarks()[0].map { it.x() to it.y() }
            }
        }
        val a = firstHand["cpu"]
        val b = firstHand["gpu"]
        if (a != null && b != null && a.size == b.size) {
            gpuVsCpu += a.indices.map { (abs(a[it].first - b[it].first) + abs(a[it].second - b[it].second)) / 2.0 }.average()
        }
        return frame.index + 1 < frames + warmup
    }

    fun report(): JSONObject {
        val arr = JSONArray()
        for (c in configs) arr.put(JSONObject().apply {
            put("config", c.name)
            if (c.error != null) put("error", c.error)
            put("latencyMs", BenchReport.toJson(LatencyStats.summarize(c.latencies)))
            put("framesWithHandFraction", if (c.measured == 0) 0 else BenchReport.round(c.framesWithHand.toDouble() / c.measured))
        })
        return JSONObject()
            .put("configs", arr)
            .put("gpuVsCpuMeanLandmarkDiff", BenchReport.toJson(LatencyStats.summarize(gpuVsCpu)))
            .put("note", "landmark difference is in fractions of image width/height; reported with the latency summary fields")
    }

    fun close() = configs.forEach { it.landmarker?.close() }

    companion object {
        const val MODEL = "models/hand_landmarker.task"
    }
}
