package ai.saarthi.app.speech

// Recording loop adapted from SightBuddy core/stt/VoiceInputService.kt (MIT, Copyright (c) 2026
// Drophouse Ltd, commit 578771d): AudioRecord at 16 kHz mono, 16-bit samples converted to floats,
// a hard cap per utterance. Changed: plain threads instead of coroutines; no VAD, cloud or Gemma
// paths; press-and-hold only.

import android.annotation.SuppressLint
import android.media.AudioFormat
import android.media.AudioRecord
import android.media.MediaRecorder
import android.util.Log
import java.util.concurrent.atomic.AtomicBoolean

/**
 * Press-and-hold recording: [start] when the finger goes down, [stop] when it lifts; [stop] returns
 * the utterance as 16 kHz mono floats. Recording stops by itself after [maxMs].
 * Needs the RECORD_AUDIO permission. Audio is kept in memory only.
 */
class PushToTalk(private val maxMs: Int = 8_000) {

    private val rate = WhisperEngine.SAMPLE_RATE
    private val recording = AtomicBoolean(false)
    private var thread: Thread? = null
    private var buffer = FloatArray(0)
    private var length = 0

    val isRecording: Boolean get() = recording.get()

    @SuppressLint("MissingPermission") // the caller checks RECORD_AUDIO first
    fun start(): Boolean {
        if (!recording.compareAndSet(false, true)) return false
        val minBuf = AudioRecord.getMinBufferSize(rate, AudioFormat.CHANNEL_IN_MONO, AudioFormat.ENCODING_PCM_16BIT)
        val recorder = try {
            AudioRecord(MediaRecorder.AudioSource.VOICE_RECOGNITION, rate, AudioFormat.CHANNEL_IN_MONO, AudioFormat.ENCODING_PCM_16BIT, minBuf * 4)
        } catch (e: Exception) {
            Log.e(TAG, "microphone failed to open", e)
            recording.set(false)
            return false
        }
        if (recorder.state != AudioRecord.STATE_INITIALIZED) {
            Log.e(TAG, "microphone not initialised")
            recorder.release()
            recording.set(false)
            return false
        }
        buffer = FloatArray(rate * maxMs / 1000)
        length = 0
        thread = Thread({
            val chunk = ShortArray(minBuf / 2)
            recorder.startRecording()
            try {
                while (recording.get() && length < buffer.size) {
                    val n = recorder.read(chunk, 0, minOf(chunk.size, buffer.size - length))
                    if (n <= 0) break
                    for (i in 0 until n) buffer[length + i] = chunk[i] / 32768f
                    length += n
                }
            } finally {
                recorder.stop()
                recorder.release()
                recording.set(false)
            }
        }, "saarthi-mic").apply { start() }
        return true
    }

    /** Stops recording and returns what was heard (empty if nothing). Blocks until the mic is closed. */
    fun stop(): FloatArray {
        recording.set(false)
        thread?.join(1_000)
        thread = null
        return buffer.copyOf(length)
    }

    private companion object {
        const val TAG = "Saarthi/mic"
    }
}
