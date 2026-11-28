package ai.saarthi.app.bench

import ai.saarthi.app.perf.LatencyStats
import android.content.Context
import android.graphics.Bitmap
import android.os.SystemClock
import org.json.JSONArray
import org.json.JSONObject
import org.tensorflow.lite.DataType
import org.tensorflow.lite.Interpreter
import org.tensorflow.lite.nnapi.NnApiDelegate
import java.io.FileInputStream
import java.nio.ByteBuffer
import java.nio.ByteOrder
import java.nio.MappedByteBuffer
import java.nio.channels.FileChannel
import kotlin.math.abs

/**
 * Does the phone's APU (through NNAPI) give the same answers as the CPU, and is it faster?
 *
 * For each model, two raw TFLite interpreters run on the same input: CPU (4 threads, XNNPACK) and
 * NNAPI with the NNAPI CPU fallback disabled, so only real accelerators are used (SecondSense saw
 * NNAPI's reference CPU path take about 2.5 s per frame). The detector's post-processed outputs
 * (boxes, classes, scores, count) are compared: top scores, top-1 class, detection count, and the
 * fraction of saturated scores (≥ 0.99).
 */
class NnapiCheck(private val context: Context, private val frames: Int = 30, private val warmup: Int = 3) {

    private class Pair(val name: String, val asset: String) {
        var cpu: Interpreter? = null
        var nnapi: Interpreter? = null
        var delegate: NnApiDelegate? = null
        var error: String? = null
        val cpuMs = ArrayList<Double>()
        val nnapiMs = ArrayList<Double>()
        val topScoreDiffs = ArrayList<Double>()
        var top1ClassAgree = 0
        var countAgree = 0
        var compared = 0
        var nnapiSaturated = 0
        var nnapiScores = 0
        var shapes = JSONArray()
    }

    private val pairs = listOf(
        Pair("int8", DetectorBench.INT8),
        Pair("fp32", DetectorBench.FP32),
    )

    fun open(): JSONObject {
        val init = JSONObject()
        for (p in pairs) {
            try {
                val model = map(p.asset)
                p.cpu = Interpreter(model, Interpreter.Options().setNumThreads(4))
                val t0 = SystemClock.elapsedRealtime()
                p.delegate = NnApiDelegate(NnApiDelegate.Options().setUseNnapiCpu(false))
                p.nnapi = Interpreter(model, Interpreter.Options().addDelegate(p.delegate))
                val cpu = p.cpu!!
                for (i in 0 until cpu.outputTensorCount) {
                    val t = cpu.getOutputTensor(i)
                    p.shapes.put("${t.name()} ${t.shape().contentToString()} ${t.dataType()}")
                }
                init.put(p.name, JSONObject()
                    .put("nnapiInitMs", SystemClock.elapsedRealtime() - t0)
                    .put("input", cpu.getInputTensor(0).let { "${it.shape().contentToString()} ${it.dataType()}" })
                    .put("outputs", p.shapes))
            } catch (e: Throwable) {
                p.error = "${e.javaClass.simpleName}: ${e.message}"
                init.put(p.name, JSONObject().put("error", p.error))
            }
        }
        return init
    }

    fun onFrame(frame: FrameLoop.Frame): Boolean {
        for (p in pairs) {
            val cpu = p.cpu ?: continue
            val nn = p.nnapi ?: continue
            val input = input(cpu, frame.bitmap)
            val (cpuOut, cpuMs) = run(cpu, input)
            input.rewind()
            val (nnOut, nnMs) = try { run(nn, input) } catch (e: Throwable) { p.error = e.message; continue }
            if (frame.index < warmup) continue
            p.cpuMs += cpuMs
            p.nnapiMs += nnMs
            compare(p, cpuOut, nnOut)
        }
        return frame.index + 1 < frames + warmup
    }

    /** Outputs as float arrays, in the standard order: boxes, classes, scores, count. */
    private fun compare(p: Pair, cpu: List<FloatArray>, nn: List<FloatArray>) {
        if (cpu.size != 4 || nn.size != 4) return
        p.compared++
        val cpuScores = cpu[2].sortedDescending()
        val nnScores = nn[2].sortedDescending()
        for (k in 0 until minOf(5, cpuScores.size)) p.topScoreDiffs += abs(cpuScores[k] - nnScores[k]).toDouble()
        val cpuTop = cpu[2].indices.maxByOrNull { cpu[2][it] }
        val nnTop = nn[2].indices.maxByOrNull { nn[2][it] }
        if (cpuTop != null && nnTop != null && cpu[1][cpuTop] == nn[1][nnTop]) p.top1ClassAgree++
        if (cpu[3].firstOrNull() == nn[3].firstOrNull()) p.countAgree++
        for (s in nn[2]) if (s > 0.05f) { p.nnapiScores++; if (s >= 0.99f) p.nnapiSaturated++ }
    }

    fun report(): JSONObject {
        val arr = JSONArray()
        for (p in pairs) {
            arr.put(JSONObject().apply {
                put("model", p.name)
                if (p.error != null) put("error", p.error)
                put("nnapiErrno", p.delegate?.nnapiErrno ?: JSONObject.NULL)
                put("cpuMs", BenchReport.toJson(LatencyStats.summarize(p.cpuMs)))
                put("nnapiMs", BenchReport.toJson(LatencyStats.summarize(p.nnapiMs)))
                put("framesCompared", p.compared)
                put("top5ScoreAbsDiff", BenchReport.toJson(LatencyStats.summarize(p.topScoreDiffs)))
                put("top1ClassAgreement", if (p.compared == 0) JSONObject.NULL else BenchReport.round(p.top1ClassAgree.toDouble() / p.compared))
                put("countAgreement", if (p.compared == 0) JSONObject.NULL else BenchReport.round(p.countAgree.toDouble() / p.compared))
                put("nnapiSaturatedScoreFraction", if (p.nnapiScores == 0) 0 else BenchReport.round(p.nnapiSaturated.toDouble() / p.nnapiScores))
            })
        }
        return JSONObject().put("pairs", arr).put("note", "score columns use tensor order boxes, classes, scores, count; shapes listed in init")
    }

    fun close() = pairs.forEach { it.cpu?.close(); it.nnapi?.close(); it.delegate?.close() }

    private fun run(interp: Interpreter, input: ByteBuffer): kotlin.Pair<List<FloatArray>, Double> {
        val outs = HashMap<Int, Any>()
        for (i in 0 until interp.outputTensorCount) {
            outs[i] = ByteBuffer.allocateDirect(interp.getOutputTensor(i).numBytes()).order(ByteOrder.nativeOrder())
        }
        val t0 = SystemClock.elapsedRealtimeNanos()
        interp.runForMultipleInputsOutputs(arrayOf(input), outs)
        val ms = (SystemClock.elapsedRealtimeNanos() - t0) / 1e6
        val floats = (0 until interp.outputTensorCount).map { i ->
            val t = interp.getOutputTensor(i)
            val buf = (outs[i] as ByteBuffer).apply { rewind() }
            when (t.dataType()) {
                DataType.FLOAT32 -> FloatArray(t.numElements()).also { buf.asFloatBuffer().get(it) }
                DataType.UINT8 -> {
                    val q = t.quantizationParams()
                    FloatArray(t.numElements()) { ((buf.get().toInt() and 0xFF) - q.zeroPoint) * q.scale }
                }
                else -> FloatArray(0)
            }
        }
        return floats to ms
    }

    private fun input(interp: Interpreter, bmp: Bitmap): ByteBuffer {
        val t = interp.getInputTensor(0)
        val h = t.shape()[1]
        val w = t.shape()[2]
        val scaled = Bitmap.createScaledBitmap(bmp, w, h, true)
        val px = IntArray(w * h).also { scaled.getPixels(it, 0, w, 0, 0, w, h) }
        if (scaled !== bmp) scaled.recycle()
        val buf = ByteBuffer.allocateDirect(t.numBytes()).order(ByteOrder.nativeOrder())
        for (c in px) {
            val r = (c shr 16) and 0xFF
            val g = (c shr 8) and 0xFF
            val b = c and 0xFF
            if (t.dataType() == DataType.FLOAT32) {
                // EfficientDet-Lite normalisation used by MediaPipe: (v - 127.5) / 127.5
                buf.putFloat((r - 127.5f) / 127.5f); buf.putFloat((g - 127.5f) / 127.5f); buf.putFloat((b - 127.5f) / 127.5f)
            } else {
                buf.put(r.toByte()); buf.put(g.toByte()); buf.put(b.toByte())
            }
        }
        buf.rewind()
        return buf
    }

    private fun map(asset: String): MappedByteBuffer {
        val fd = context.assets.openFd(asset)
        FileInputStream(fd.fileDescriptor).use { s ->
            return s.channel.map(FileChannel.MapMode.READ_ONLY, fd.startOffset, fd.declaredLength)
        }
    }
}
