package ai.saarthi.app.bench

import ai.saarthi.app.geometry.Box
import ai.saarthi.app.geometry.BoxMatcher
import ai.saarthi.app.geometry.LabelledBox
import ai.saarthi.app.perf.LatencyStats
import android.content.Context
import android.graphics.Bitmap
import android.os.SystemClock
import com.google.mediapipe.framework.image.BitmapImageBuilder
import com.google.mediapipe.tasks.core.BaseOptions
import com.google.mediapipe.tasks.core.Delegate
import com.google.mediapipe.tasks.vision.core.RunningMode
import com.google.mediapipe.tasks.vision.objectdetector.ObjectDetector
import org.json.JSONArray
import org.json.JSONObject
import kotlin.math.abs

/**
 * Object detector benchmark on live frames (EfficientDet-Lite0, COCO).
 *
 * 1. Speed: MediaPipe ObjectDetector with each model (int8, float32) on CPU and GPU.
 * 2. Agreement: for each model, the GPU result is compared with the CPU result on the same frame
 *    (same label, IoU ≥ 0.5; score differences). A different model is never compared, so
 *    quantisation differences are not mistaken for accelerator errors.
 * 3. Saturation: the fraction of scores ≥ 0.99, the signature of the MediaTek NNAPI bug
 *    SecondSense found (every score exactly 1.00).
 * The NNAPI (APU) path is checked separately by [NnapiCheck].
 */
class DetectorBench(private val context: Context, private val frames: Int = 40, private val warmup: Int = 3) {

    private class Config(val name: String, val model: String, val delegate: Delegate) {
        var detector: ObjectDetector? = null
        var error: String? = null
        val latencies = ArrayList<Double>()
        var detections = 0
        var saturated = 0
        var scores = 0
        // agreement with the same model on CPU
        var matched = 0
        var refOnly = 0
        var candOnly = 0
        val scoreDiffs = ArrayList<Double>()
    }

    private val configs = listOf(
        Config("int8_cpu", INT8, Delegate.CPU),
        Config("int8_gpu", INT8, Delegate.GPU),
        Config("fp32_cpu", FP32, Delegate.CPU),
        Config("fp32_gpu", FP32, Delegate.GPU),
    )
    private val seenLabels = HashMap<String, Int>()

    fun open(): JSONObject {
        val init = JSONObject()
        for (c in configs) {
            val t0 = SystemClock.elapsedRealtime()
            try {
                c.detector = ObjectDetector.createFromOptions(
                    context,
                    ObjectDetector.ObjectDetectorOptions.builder()
                        .setBaseOptions(BaseOptions.builder().setModelAssetPath(c.model).setDelegate(c.delegate).build())
                        .setRunningMode(RunningMode.IMAGE)
                        .setScoreThreshold(SCORE_THRESHOLD)
                        .setMaxResults(10)
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

    /** Runs every configuration on one frame. Returns false when enough frames were measured. */
    fun onFrame(frame: FrameLoop.Frame): Boolean {
        val image = BitmapImageBuilder(frame.bitmap).build()
        val results = HashMap<String, List<LabelledBox>>()
        for (c in configs) {
            val det = c.detector ?: continue
            val t0 = SystemClock.elapsedRealtimeNanos()
            val out = try { det.detect(image) } catch (e: Throwable) { c.error = e.message; null } ?: continue
            val ms = (SystemClock.elapsedRealtimeNanos() - t0) / 1e6
            val boxes = out.detections().mapNotNull { d ->
                val top = d.categories().maxByOrNull { it.score() } ?: return@mapNotNull null
                val r = d.boundingBox()
                LabelledBox(top.categoryName(), top.score(), norm(r.left, r.top, r.right, r.bottom, frame.bitmap))
            }
            results[c.name] = boxes
            if (frame.index < warmup) continue
            c.latencies += ms
            c.detections += boxes.size
            for (b in boxes) {
                c.scores++
                if (b.score >= 0.99f) c.saturated++
            }
        }
        if (frame.index >= warmup) {
            results["fp32_cpu"]?.forEach { seenLabels[it.label] = (seenLabels[it.label] ?: 0) + 1 }
            compare("int8_gpu", "int8_cpu", results)
            compare("fp32_gpu", "fp32_cpu", results)
        }
        return frame.index + 1 < frames + warmup
    }

    private fun compare(candName: String, refName: String, results: Map<String, List<LabelledBox>>) {
        val cand = results[candName] ?: return
        val ref = results[refName] ?: return
        val c = configs.first { it.name == candName }
        val m = BoxMatcher.match(ref, cand)
        c.matched += m.matches.size
        c.refOnly += m.unmatchedReference.size
        c.candOnly += m.unmatchedCandidate.size
        m.matches.forEach { c.scoreDiffs += abs(it.reference.score - it.candidate.score).toDouble() }
    }

    fun report(): JSONObject {
        val out = JSONObject()
        out.put("scoreThreshold", SCORE_THRESHOLD)
        out.put("framesMeasured", frames)
        out.put("labelsSeenByFp32Cpu", JSONObject(seenLabels as Map<*, *>))
        val arr = JSONArray()
        for (c in configs) {
            val o = JSONObject().put("config", c.name)
            if (c.error != null) o.put("error", c.error)
            o.put("latencyMs", BenchReport.toJson(LatencyStats.summarize(c.latencies)))
            o.put("detectionsPerFrame", if (c.latencies.isEmpty()) 0 else BenchReport.round(c.detections.toDouble() / c.latencies.size))
            o.put("saturatedScoreFraction", if (c.scores == 0) 0 else BenchReport.round(c.saturated.toDouble() / c.scores))
            if (c.delegate == Delegate.GPU) o.put("agreementWithCpuSameModel", JSONObject().apply {
                put("matched", c.matched)
                put("cpuOnly", c.refOnly)
                put("gpuOnly", c.candOnly)
                put("scoreAbsDiff", BenchReport.toJson(LatencyStats.summarize(c.scoreDiffs)))
            })
            arr.put(o)
        }
        out.put("configs", arr)
        return out
    }

    fun close() = configs.forEach { it.detector?.close() }

    private fun norm(l: Float, t: Float, r: Float, b: Float, bmp: Bitmap) =
        Box(l / bmp.width, t / bmp.height, r / bmp.width, b / bmp.height)

    companion object {
        const val INT8 = "models/efficientdet_lite0_int8.tflite"
        const val FP32 = "models/efficientdet_lite0_fp32.tflite"
        const val SCORE_THRESHOLD = 0.3f
    }
}
