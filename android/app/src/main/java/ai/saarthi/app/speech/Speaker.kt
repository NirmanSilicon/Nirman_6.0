package ai.saarthi.app.speech

// Adapted from SightBuddy core/TTSService.kt (MIT, Copyright (c) 2026 Drophouse Ltd, commit
// 578771d): engine started once at launch, language with an English fallback, an utterance
// progress listener, interruptible speech (QUEUE_FLUSH), blank text never spoken. Changed: no
// coroutine flows, cooldowns, mute or microphone floor (those come with push-to-talk); Indian
// English first; a warm-up synthesis after start-up; prepared clips (below); each utterance's
// delay to its first audio is measured and reported.

import android.content.Context
import android.os.SystemClock
import android.speech.tts.TextToSpeech
import android.speech.tts.UtteranceProgressListener
import android.util.Log
import java.io.File
import java.util.Locale
import java.util.concurrent.ConcurrentHashMap
import java.util.concurrent.atomic.AtomicLong
import java.util.concurrent.atomic.AtomicReference

/**
 * Saarthi's voice: the system text-to-speech engine. A new utterance interrupts the current one,
 * because a stale sentence about the table is worse than none.
 *
 * **Prepared clips (latency fix).** Live synthesis takes about 350 ms before the first sound
 * (Phase 0), over the 300 ms budget. A caller that knows what it will probably say next (the
 * brief, computed from the live scene) calls [prepare]; the text is synthesised in the background
 * to a WAV file. If [speak] is later called with exactly that text, the clip plays at once;
 * otherwise speech is synthesised live. The words are always the caller's current words: a clip is
 * only used when its text matches exactly.
 */
class Speaker(context: Context) {

    enum class Path { CLIP, LIVE }

    /** Timing for one utterance, in ms from [speak]. Null when not reported. */
    class Timing(val id: String, val path: Path, val toFirstAudioMs: Double?, val interrupted: Boolean)

    @Volatile var ready = false
        private set
    @Volatile var error: String? = null
        private set
    @Volatile var initMs: Long = -1
        private set

    /** Called on a background thread when an utterance finishes or is interrupted. */
    var onTiming: (Timing) -> Unit = {}

    private class Pending(val atNs: Long) {
        @Volatile var firstAudioMs: Double? = null
    }

    private class Clip(val text: String, val wav: WavClip)

    private val pending = ConcurrentHashMap<String, Pending>()
    private val nextId = AtomicLong(1)
    private val clipDir = File(context.cacheDir, "speech").apply { mkdirs() }
    private val clips = ClipPlayer()
    private val prepared = AtomicReference<Clip?>(null)
    private val lock = Any()
    private var preparing: String? = null   // guarded by lock
    private var wanted: String? = null      // guarded by lock
    private val prepText = ConcurrentHashMap<String, String>()  // prepare utterance id → text
    /** A fixed phrasebook (guidance cues) synthesised once at start-up, played instantly (D30). */
    private val fixed = ConcurrentHashMap<String, WavClip>()
    private val fixedText = ConcurrentHashMap<String, String>()  // synthesis id → text
    @Volatile private var fixedWanted: List<String> = emptyList()
    private val createdAt = SystemClock.elapsedRealtime()
    private val tts: TextToSpeech = TextToSpeech(context.applicationContext) { status -> onInit(status) }

    private fun onInit(status: Int) {
        initMs = SystemClock.elapsedRealtime() - createdAt
        if (status != TextToSpeech.SUCCESS) {
            fail("text-to-speech failed to start (status $status)"); return
        }
        var result = tts.setLanguage(Locale("en", "IN"))
        if (result == TextToSpeech.LANG_MISSING_DATA || result == TextToSpeech.LANG_NOT_SUPPORTED) {
            result = tts.setLanguage(Locale.US)
        }
        if (result == TextToSpeech.LANG_MISSING_DATA || result == TextToSpeech.LANG_NOT_SUPPORTED) {
            fail("no English voice installed"); return
        }
        tts.setOnUtteranceProgressListener(object : UtteranceProgressListener() {
            override fun onStart(id: String) {}

            override fun onAudioAvailable(id: String, audio: ByteArray) {
                pending[id]?.let { if (it.firstAudioMs == null) it.firstAudioMs = sinceMs(it.atNs) }
            }

            override fun onDone(id: String) {
                if (id.startsWith(FIX)) onFixed(id, ok = true) else if (id.startsWith(PREP)) onPrepared(id, ok = true) else finishLive(id, interrupted = false)
            }

            override fun onStop(id: String, interrupted: Boolean) {
                if (id.startsWith(FIX)) onFixed(id, ok = false) else if (id.startsWith(PREP)) onPrepared(id, ok = false) else finishLive(id, interrupted = true)
            }

            @Deprecated("Deprecated in Java")
            override fun onError(id: String) {
                if (id.startsWith(FIX)) onFixed(id, ok = false) else if (id.startsWith(PREP)) onPrepared(id, ok = false) else finishLive(id, interrupted = true)
            }
        })
        ready = true
        startFixed()
        // Warm-up: the first synthesis after start-up is slow (Phase 0: 1.7 s); pay it now, silently.
        prepare("Ready.")
    }

    /**
     * Speaks [text] now, interrupting anything being said. Returns the utterance id, or null if the
     * engine is not ready (nothing is queued for later).
     */
    fun speak(text: String): String? {
        if (!ready || text.isBlank()) return null
        val id = "u${nextId.getAndIncrement()}"
        val clip = prepared.get()?.takeIf { it.text == text } ?: fixed[text]?.let { Clip(text, it) }
        if (clip != null) {
            tts.stop()
            pending[id] = Pending(SystemClock.elapsedRealtimeNanos())
            clips.play(
                clip.wav,
                onFirstAudio = { ms -> pending[id]?.firstAudioMs = ms },
                onEnd = { interrupted -> finish(id, Path.CLIP, interrupted) },
            )
            return id
        }
        clips.stop()
        pending[id] = Pending(SystemClock.elapsedRealtimeNanos())
        if (tts.speak(text, TextToSpeech.QUEUE_FLUSH, null, id) == TextToSpeech.ERROR) {
            pending.remove(id)
            Log.e(TAG, "speak failed")
            return null
        }
        return id
    }

    /**
     * Synthesises [text] in the background so a later [speak] of the same text starts at once.
     * Only the newest request matters: older ones are dropped. Never makes a sound.
     */
    fun prepare(text: String) {
        if (!ready || text.isBlank()) return
        if (prepared.get()?.text == text) return
        synchronized(lock) {
            wanted = text
            if (preparing == null) startPrepare(text)
        }
    }

    /** True while an utterance is playing (proactive alerts wait for it). */
    val busy: Boolean get() = pending.isNotEmpty()

    /**
     * Synthesises [phrases] once in the background so [speak] plays them instantly (guidance cues: the
     * system voice takes 0.2-1 s to start a sentence, too slow to correct a reach within 1 s). Each clip
     * is the phone's own voice saying exactly that text; it plays only on an exact text match (D11, D30).
     */
    fun preload(phrases: List<String>) {
        fixedWanted = phrases
        if (ready) startFixed()
    }

    /** How many phrasebook clips are ready (for the status and logs). */
    val fixedReady: Int get() = fixed.size

    private fun startFixed() {
        for (text in fixedWanted) {
            if (fixed.containsKey(text) || fixedText.containsValue(text)) continue
            val id = FIX + nextId.getAndIncrement()
            fixedText[id] = text
            if (tts.synthesizeToFile(text, null, File(clipDir, "$id.wav"), id) == TextToSpeech.ERROR) fixedText.remove(id)
        }
    }

    private fun onFixed(id: String, ok: Boolean) {
        val text = fixedText.remove(id) ?: return
        val file = File(clipDir, "$id.wav")
        if (ok) runCatching { WavClip.parse(file.readBytes()) }.getOrNull()?.takeIf { it.samples.isNotEmpty() }?.let { fixed[text] = it }
        file.delete()
    }

    /** Text of the clip ready to play, if any (for logs and tests). */
    val preparedText: String? get() = prepared.get()?.text

    fun stop() {
        clips.stop()
        tts.stop()
    }

    fun shutdown() {
        stop()
        clips.close()
        tts.shutdown()
    }

    // Caller holds lock.
    private fun startPrepare(text: String) {
        preparing = text
        val id = PREP + nextId.getAndIncrement()
        prepText[id] = text
        val r = tts.synthesizeToFile(text, null, File(clipDir, "$id.wav"), id)
        if (r == TextToSpeech.ERROR) {
            prepText.remove(id)
            preparing = null
        }
    }

    private fun onPrepared(id: String, ok: Boolean) {
        val text = prepText.remove(id) ?: return
        val file = File(clipDir, "$id.wav")
        if (ok) {
            val wav = runCatching { WavClip.parse(file.readBytes()) }.getOrNull()
            if (wav != null && wav.samples.isNotEmpty()) prepared.set(Clip(text, wav))
            else Log.e(TAG, "prepared clip unreadable")
        }
        file.delete()
        synchronized(lock) {
            preparing = null
            val next = wanted
            if (next != null && next != text && prepared.get()?.text != next) startPrepare(next)
        }
    }

    private fun finishLive(id: String, interrupted: Boolean) = finish(id, Path.LIVE, interrupted)

    private fun finish(id: String, path: Path, interrupted: Boolean) {
        val p = pending.remove(id) ?: return
        onTiming(Timing(id, path, p.firstAudioMs, interrupted))
    }

    private fun fail(message: String) {
        error = message
        Log.e(TAG, message)
    }

    private fun sinceMs(atNs: Long) = (SystemClock.elapsedRealtimeNanos() - atNs) / 1e6

    private companion object {
        const val TAG = "Saarthi/speech"
        const val PREP = "prep"
        const val FIX = "fix-"
    }
}
