package ai.saarthi.app.bench

import ai.saarthi.app.perf.LatencyStats
import android.content.Context
import android.os.Handler
import android.os.Looper
import android.os.SystemClock
import android.speech.tts.TextToSpeech
import android.speech.tts.UtteranceProgressListener
import org.json.JSONObject
import java.util.Locale

/**
 * Warm speech latency: after the engine has started, speak short phrases one after another and
 * measure speak() → first audio for each. This is the number the PRD's 300 ms decision → speech
 * budget is about; the first, cold utterance is reported separately.
 */
class TtsWarmBench(private val context: Context) {

    private val main = Handler(Looper.getMainLooper())
    private var tts: TextToSpeech? = null
    // Plainly test sentences. They must never sound like observations of the scene: a listener
    // could believe them (they are measured for timing only, and say so).
    private val phrases = listOf(
        "Speech timing test, phrase one.",
        "Phrase two.",
        "Phrase three, a slightly longer test sentence.",
        "Phrase four.",
        "Phrase five.",
        "Phrase six, end of the speech test.",
    )

    fun run(onDone: (JSONObject) -> Unit) {
        val out = JSONObject()
        val firstAudio = ArrayList<Double>()
        var i = 0
        var speakAt = 0L
        val t0 = SystemClock.elapsedRealtime()

        fun speakNext() {
            if (i >= phrases.size) {
                out.put("coldFirstUtteranceMs", firstAudio.firstOrNull() ?: JSONObject.NULL)
                out.put("warmSpeakToFirstAudioMs", BenchReport.toJson(LatencyStats.summarize(firstAudio.drop(1))))
                out.put("allMs", firstAudio.map { BenchReport.round(it) })
                main.post { onDone(out) }
                return
            }
            speakAt = SystemClock.elapsedRealtimeNanos()
            tts?.speak(phrases[i], TextToSpeech.QUEUE_FLUSH, null, "p$i")
        }

        tts = TextToSpeech(context) { status ->
            out.put("initMs", SystemClock.elapsedRealtime() - t0)
            if (status != TextToSpeech.SUCCESS) { out.put("error", "init $status"); main.post { onDone(out) }; return@TextToSpeech }
            tts!!.setLanguage(Locale("en", "IN"))
            tts!!.setOnUtteranceProgressListener(object : UtteranceProgressListener() {
                override fun onStart(id: String?) {
                    firstAudio += (SystemClock.elapsedRealtimeNanos() - speakAt) / 1e6
                }
                override fun onDone(id: String?) {
                    i++
                    main.postDelayed({ speakNext() }, 300)
                }
                @Deprecated("Deprecated in Java")
                override fun onError(id: String?) {
                    out.put("error", "utterance $id failed")
                    i++
                    main.post { speakNext() }
                }
            })
            speakNext()
        }
    }

    fun close() {
        tts?.shutdown()
        tts = null
    }
}
