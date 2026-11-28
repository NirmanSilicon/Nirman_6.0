package ai.saarthi.app.bench

import ai.saarthi.app.perf.LatencyStats
import ai.saarthi.app.speech.Speaker
import android.content.Context
import android.os.Handler
import android.os.Looper
import org.json.JSONArray
import org.json.JSONObject

/**
 * Saarthi's own [Speaker], measured on *different* sentences (the engine caches audio for a
 * sentence it has said before, so repeating one sentence measures the cache, not synthesis):
 *   1. live: each sentence spoken for the first time, synthesised on demand;
 *   2. clip: each sentence prepared in the background first, then spoken.
 * Measures speak() → first audio. The sentences are plainly test sentences, never scene-like.
 */
class SpeakerBench(private val context: Context, private val progress: (String) -> Unit = {}) {

    private val main = Handler(Looper.getMainLooper())
    private lateinit var speaker: Speaker

    private val liveSentences = (1..8).map { "Speech test, live sentence $it of eight, number ${it * 13}." }
    private val clipSentences = (1..8).map { "Speech test, prepared sentence $it of eight, number ${it * 17}." }

    fun run(onDone: (JSONObject) -> Unit) {
        val out = JSONObject()
        val live = ArrayList<Double>()
        val clip = ArrayList<Double>()
        val paths = JSONArray()
        speaker = Speaker(context)
        var phase = 0  // 0 live, 1 clip
        var i = 0

        fun finish() {
            out.put("speakerInitMs", speaker.initMs)
            out.put("liveSpeakToFirstAudioMs", BenchReport.toJson(LatencyStats.summarize(live)))
            out.put("clipSpeakToFirstAudioMs", BenchReport.toJson(LatencyStats.summarize(clip)))
            out.put("liveAllMs", JSONArray(live.map { BenchReport.round(it) }))
            out.put("clipAllMs", JSONArray(clip.map { BenchReport.round(it) }))
            out.put("paths", paths)
            onDone(out)
        }

        lateinit var next: () -> Unit
        speaker.onTiming = { t ->
            paths.put(t.path.name)
            progress("${t.id} ${t.path} first audio ${t.toFirstAudioMs} ms, interrupted=${t.interrupted}")
            t.toFirstAudioMs?.let { if (phase == 0) live += it else clip += it }
            main.postDelayed({ next() }, 400)
        }
        next = {
            if (phase == 0 && i >= liveSentences.size) { phase = 1; i = 0 }
            if (phase == 1 && i >= clipSentences.size) {
                finish()
            } else if (phase == 0) {
                speaker.speak(liveSentences[i++])
            } else {
                val s = clipSentences[i++]
                speaker.prepare(s)
                fun waitThenSpeak(tries: Int) {
                    if (speaker.preparedText == s || tries > 100) speaker.speak(s)
                    else main.postDelayed({ waitThenSpeak(tries + 1) }, 50)
                }
                waitThenSpeak(0)
            }
        }
        // Wait for start-up and the warm-up synthesis, as the app does before a first tap.
        fun waitReady(tries: Int) {
            if (speaker.ready && speaker.preparedText != null || tries > 200) {
                progress("ready=${speaker.ready} init=${speaker.initMs} ms warm-up clip=${speaker.preparedText} error=${speaker.error}")
                main.postDelayed({ next() }, 500)
            }
            else main.postDelayed({ waitReady(tries + 1) }, 50)
        }
        waitReady(0)
    }

    fun close() {
        if (::speaker.isInitialized) speaker.shutdown()
    }
}
