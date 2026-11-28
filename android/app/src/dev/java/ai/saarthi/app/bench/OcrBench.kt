package ai.saarthi.app.bench

import ai.saarthi.app.perf.LatencyStats
import android.os.SystemClock
import com.google.android.gms.tasks.Tasks
import com.google.mlkit.vision.common.InputImage
import com.google.mlkit.vision.text.TextRecognition
import com.google.mlkit.vision.text.devanagari.DevanagariTextRecognizerOptions
import com.google.mlkit.vision.text.latin.TextRecognizerOptions
import org.json.JSONObject

/**
 * ML Kit text recognition (bundled models, offline) on live frames: Latin and Devanagari
 * recognisers on the same frame. Records latency and how much text was found (block and character
 * counts only; the text itself is not saved, it could be private). The first line read is shown on
 * screen through [onText] so a person can check it, but never written to the result file. Needs a
 * page or screen in view.
 */
class OcrBench(
    private val onText: (String) -> Unit,
    private val frames: Int = 20,
    private val warmup: Int = 2,
) {

    private val latin = TextRecognition.getClient(TextRecognizerOptions.DEFAULT_OPTIONS)
    private val devanagari = TextRecognition.getClient(DevanagariTextRecognizerOptions.Builder().build())
    private val latinMs = ArrayList<Double>()
    private val devaMs = ArrayList<Double>()
    private var latinChars = 0
    private var devaChars = 0
    private var latinBlocks = 0

    fun onFrame(frame: FrameLoop.Frame): Boolean {
        val image = InputImage.fromBitmap(frame.bitmap, 0)
        var t0 = SystemClock.elapsedRealtimeNanos()
        val l = Tasks.await(latin.process(image))
        val lMs = (SystemClock.elapsedRealtimeNanos() - t0) / 1e6
        t0 = SystemClock.elapsedRealtimeNanos()
        val d = Tasks.await(devanagari.process(image))
        val dMs = (SystemClock.elapsedRealtimeNanos() - t0) / 1e6
        if (frame.index >= warmup) {
            latinMs += lMs
            devaMs += dMs
            latinChars += l.text.length
            latinBlocks += l.textBlocks.size
            devaChars += d.text.length
        }
        val firstLine = (l.textBlocks.maxByOrNull { it.boundingBox?.height() ?: 0 }?.lines?.firstOrNull()?.text
            ?: d.textBlocks.firstOrNull()?.lines?.firstOrNull()?.text)
        onText(if (firstLine.isNullOrBlank()) "frame ${frame.index}: no text" else "frame ${frame.index}: \"${firstLine.take(80)}\"")
        return frame.index + 1 < frames + warmup
    }

    fun report(): JSONObject = JSONObject()
        .put("latinMs", BenchReport.toJson(LatencyStats.summarize(latinMs)))
        .put("devanagariMs", BenchReport.toJson(LatencyStats.summarize(devaMs)))
        .put("latinCharsPerFrame", if (latinMs.isEmpty()) 0 else BenchReport.round(latinChars.toDouble() / latinMs.size))
        .put("latinBlocksPerFrame", if (latinMs.isEmpty()) 0 else BenchReport.round(latinBlocks.toDouble() / latinMs.size))
        .put("devanagariCharsPerFrame", if (devaMs.isEmpty()) 0 else BenchReport.round(devaChars.toDouble() / devaMs.size))

    fun close() {
        latin.close()
        devanagari.close()
    }
}
