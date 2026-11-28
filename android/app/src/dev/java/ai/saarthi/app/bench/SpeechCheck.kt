package ai.saarthi.app.bench

import android.content.Context
import android.os.Handler
import android.os.Looper
import android.os.SystemClock
import android.speech.tts.TextToSpeech
import android.speech.tts.UtteranceProgressListener
import org.json.JSONObject
import java.util.Locale
import java.util.concurrent.atomic.AtomicBoolean

/**
 * Speaks one sentence with the system text-to-speech engine and measures: engine start-up time,
 * time from speak() to the first audio (onStart), and to the end (onDone). The team confirms by
 * ear that the sentence was heard.
 */
class SpeechCheck(private val context: Context) {

    private val main = Handler(Looper.getMainLooper())
    private var tts: TextToSpeech? = null

    fun run(onDone: (JSONObject) -> Unit) {
        val out = JSONObject()
        val finished = AtomicBoolean(false)
        fun finish() {
            if (finished.compareAndSet(false, true)) main.post { onDone(out) }
        }
        // If the engine never reports completion (no engine, no audio route), give up honestly.
        main.postDelayed({ out.put("timedOut", !finished.get()); finish() }, TIMEOUT_MS)

        val t0 = SystemClock.elapsedRealtime()
        tts = TextToSpeech(context) { status ->
            out.put("initMs", SystemClock.elapsedRealtime() - t0)
            out.put("initOk", status == TextToSpeech.SUCCESS)
            val engine = tts ?: return@TextToSpeech finish()
            out.put("engine", engine.defaultEngine)
            if (status != TextToSpeech.SUCCESS) return@TextToSpeech finish()

            val locale = Locale("en", "IN")
            out.put("locale", locale.toLanguageTag())
            out.put("languageResult", engine.setLanguage(locale)) // >= 0 means available

            var speakAt = 0L
            engine.setOnUtteranceProgressListener(object : UtteranceProgressListener() {
                override fun onStart(utteranceId: String?) {
                    out.put("speakToFirstAudioMs", SystemClock.elapsedRealtime() - speakAt)
                }

                override fun onDone(utteranceId: String?) {
                    out.put("speakToDoneMs", SystemClock.elapsedRealtime() - speakAt)
                    finish()
                }

                @Deprecated("Deprecated in Java")
                override fun onError(utteranceId: String?) {
                    out.put("error", true)
                    finish()
                }
            })
            speakAt = SystemClock.elapsedRealtime()
            engine.speak(SENTENCE, TextToSpeech.QUEUE_FLUSH, null, "bench")
        }
    }

    fun close() {
        tts?.shutdown()
        tts = null
    }

    private companion object {
        const val SENTENCE = "Saarthi benchmark. If you hear this, speech works."
        const val TIMEOUT_MS = 15_000L
    }
}
