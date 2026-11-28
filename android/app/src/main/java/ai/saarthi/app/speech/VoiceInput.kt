package ai.saarthi.app.speech

import android.os.SystemClock
import java.io.File
import java.util.concurrent.Executors

/**
 * Press-and-hold speech input: loads the Whisper model once in the background, records while the
 * finger is down, and transcribes on its own thread when it lifts. Audio never leaves the phone and
 * is never stored.
 */
class VoiceInput(private val modelDir: File, private val modelName: String, private val install: () -> String = { "" }) {

    /** One recognised utterance. [text] is empty if nothing was heard. */
    class Heard(val text: String, val audioS: Double, val transcribeMs: Double, val model: String)

    private val worker = Executors.newSingleThreadExecutor { r -> Thread(r, "saarthi-stt") }
    private val mic = PushToTalk()
    @Volatile private var engine: WhisperEngine? = null
    @Volatile var loadError: String? = null
        private set
    @Volatile var loadMs: Long = -1
        private set

    val ready: Boolean get() = engine != null

    /** What installing the model did on this launch (demo build: copied from the APK once). */
    @Volatile var installNote: String = ""
        private set

    fun load() = worker.execute {
        installNote = try { install() } catch (t: Throwable) { "install failed: ${t.message}" }
        val e = WhisperEngine.load(modelDir, modelName)
        if (e == null) { loadError = "speech model $modelName not found or failed to load"; return@execute }
        // Warm-up: the first decode after loading is slow; pay it now, on one second of silence.
        e.transcribe(FloatArray(WhisperEngine.SAMPLE_RATE))
        loadMs = e.loadMs
        engine = e
    }

    /** Opens the microphone. False if the model is not ready or the microphone failed. */
    fun begin(): Boolean = ready && mic.start()

    /** Closes the microphone and transcribes on the speech thread; [onHeard] runs there. */
    fun end(onTranscribing: (Boolean) -> Unit = {}, onHeard: (Heard) -> Unit) {
        val audio = mic.stop()
        val eng = engine ?: return
        worker.execute {
            val t0 = SystemClock.elapsedRealtimeNanos()
            onTranscribing(true)
            val text = try {
                if (audio.size < WhisperEngine.SAMPLE_RATE / 5) "" else speechOnly(eng.transcribe(audio))
            } finally {
                onTranscribing(false)
            }
            onHeard(Heard(text, audio.size / WhisperEngine.SAMPLE_RATE.toDouble(), (SystemClock.elapsedRealtimeNanos() - t0) / 1e6, modelName))
        }
    }

    companion object {
        /**
         * Whisper writes sounds it hears but cannot transcribe as tags ("[buzzer]", "(music)",
         * "[BLANK_AUDIO]"); on the Vivo it wrote "[buzzer]" for a silent hold. Those are not words.
         */
        fun speechOnly(text: String): String =
            text.replace(Regex("\\[[^]]*]|\\([^)]*\\)|\\*[^*]*\\*"), " ").replace(Regex("[\\[\\]()*]"), " ")
                .replace(Regex("\\s+"), " ").trim()
    }

    fun close() {
        if (mic.isRecording) mic.stop()
        worker.execute { engine?.release(); engine = null }
        worker.shutdown()
    }
}
