package ai.saarthi.app.ocr

// Structure-first reading (PRD 5.7, a BONUS item brought forward at the team's request, 30 Oct): the
// heading is found as the tallest line of text, then the rest is read top to bottom on request.
// ML Kit text recognition (Latin and Devanagari, bundled models, offline) as measured in Phase 0
// (DEVICE_REPORT: book cover, ~160 characters per frame at 1280 × 960). Idea of "biggest line =
// title" from the Phase 0 OcrBench; SightBuddy's PageTracker/TextAimGuide are the fuller references.

import android.graphics.Bitmap
import android.os.SystemClock
import com.google.android.gms.tasks.Tasks
import com.google.mlkit.vision.common.InputImage
import com.google.mlkit.vision.text.Text
import com.google.mlkit.vision.text.TextRecognition
import com.google.mlkit.vision.text.devanagari.DevanagariTextRecognizerOptions
import com.google.mlkit.vision.text.latin.TextRecognizerOptions

/**
 * Reads the text in one camera frame and splits it into a heading and the rest. Blocking: call
 * [read] on a worker thread. The text is only spoken; it is never stored (PRD rule 7.6).
 */
class TextReader {

    /** One line of text: its words, its height in pixels (a proxy for font size), its top edge. */
    data class Line(val text: String, val height: Int, val top: Int, val left: Int)

    data class Page(val heading: String?, val rest: List<String>, val ms: Double, val chars: Int, val script: String)

    private val latin = TextRecognition.getClient(TextRecognizerOptions.DEFAULT_OPTIONS)
    private val devanagari = TextRecognition.getClient(DevanagariTextRecognizerOptions.Builder().build())

    fun read(bitmap: Bitmap): Page {
        val t0 = SystemClock.elapsedRealtimeNanos()
        val image = InputImage.fromBitmap(bitmap, 0)
        val l = Tasks.await(latin.process(image))
        // Devanagari only when Latin found little: it costs a second run (Phase 0: ~195 ms).
        val d = if (letters(l.text) < 8) Tasks.await(devanagari.process(image)) else null
        val (best, script) = if (d != null && letters(d.text) > letters(l.text)) d to "devanagari" else l to "latin"
        val ms = (SystemClock.elapsedRealtimeNanos() - t0) / 1e6
        return structure(lines(best), ms, script)
    }

    fun close() {
        latin.close()
        devanagari.close()
    }

    companion object {
        /** A heading's lines are at least this much taller than the page's typical line. */
        const val HEADING_RATIO = 1.3f

        private fun letters(s: String) = s.count { it.isLetter() }

        fun lines(t: Text): List<Line> = t.textBlocks.flatMap { b -> b.lines }.mapNotNull { line ->
            val box = line.boundingBox ?: return@mapNotNull null
            if (letters(line.text) < 2) null else Line(line.text.trim(), box.height(), box.top, box.left)
        }

        /**
         * The heading = the tallest line, plus any line nearly as tall right beside it (a title over two
         * lines), if it stands out from the typical line; the rest top to bottom. Pure, tested.
         */
        fun structure(lines: List<Line>, ms: Double = 0.0, script: String = "latin"): Page {
            if (lines.isEmpty()) return Page(null, emptyList(), ms, 0, script)
            val chars = lines.sumOf { it.text.length }
            val ordered = lines.sortedWith(compareBy({ it.top }, { it.left }))
            val tallest = lines.maxOf { it.height }
            val typical = lines.map { it.height }.sorted()[lines.size / 2]
            val stands = lines.size == 1 || tallest >= HEADING_RATIO * typical
            if (!stands) return Page(null, ordered.map { it.text }, ms, chars, script)
            val headingLines = ordered.filter { it.height >= 0.8f * tallest }
            val first = ordered.indexOf(headingLines.first())
            // Keep only the contiguous run of tall lines starting at the first one.
            val run = ordered.drop(first).takeWhile { it.height >= 0.8f * tallest }
            val rest = ordered.filter { it !in run }
            return Page(run.joinToString(" ") { it.text }, rest.map { it.text }, ms, chars, script)
        }
    }
}
