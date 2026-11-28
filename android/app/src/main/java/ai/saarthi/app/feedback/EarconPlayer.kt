package ai.saarthi.app.feedback

import android.media.AudioAttributes
import android.media.AudioFormat
import android.media.AudioTrack
import android.os.SystemClock
import android.util.Log
import java.util.concurrent.Executors

/**
 * Plays earcons with as little delay as the phone allows: every earcon is rendered once at start,
 * and one low-latency streaming track stays open, so playing is only a buffer write. An earcon
 * requested while another is playing is dropped, never queued (a late sound means nothing).
 */
class EarconPlayer {

    private val sampleRate = 48_000
    private val exec = Executors.newSingleThreadExecutor { r -> Thread(r, "saarthi-earcons") }
    private val buffers = Earcon.entries.associateWith { Earcons.render(it.notes, sampleRate) }
    @Volatile private var busy = false

    private val track: AudioTrack? = try {
        val minBuf = AudioTrack.getMinBufferSize(sampleRate, AudioFormat.CHANNEL_OUT_MONO, AudioFormat.ENCODING_PCM_16BIT)
        AudioTrack.Builder()
            .setAudioAttributes(
                AudioAttributes.Builder()
                    .setUsage(AudioAttributes.USAGE_MEDIA)
                    .setContentType(AudioAttributes.CONTENT_TYPE_SONIFICATION)
                    .build()
            )
            .setAudioFormat(
                AudioFormat.Builder()
                    .setSampleRate(sampleRate)
                    .setChannelMask(AudioFormat.CHANNEL_OUT_MONO)
                    .setEncoding(AudioFormat.ENCODING_PCM_16BIT)
                    .build()
            )
            .setBufferSizeInBytes(minBuf)
            .setTransferMode(AudioTrack.MODE_STREAM)
            .setPerformanceMode(AudioTrack.PERFORMANCE_MODE_LOW_LATENCY)
            .build()
            .also { it.play() }
    } catch (e: Exception) {
        Log.e(TAG, "earcon audio track failed", e)
        null
    }

    /**
     * Plays [earcon]. [onStarted] gets the ms from this call until the first samples were handed to
     * the audio system (the speaker's own output delay comes on top; Android does not report it
     * reliably).
     */
    fun play(earcon: Earcon, onStarted: (Double) -> Unit = {}) {
        val t = track ?: return
        if (busy) return
        busy = true
        val at = SystemClock.elapsedRealtimeNanos()
        exec.execute {
            try {
                val buf = buffers.getValue(earcon)
                onStarted((SystemClock.elapsedRealtimeNanos() - at) / 1e6)
                t.write(buf, 0, buf.size)
            } finally {
                busy = false
            }
        }
    }

    fun close() {
        exec.shutdown()
        track?.release()
    }

    private companion object {
        const val TAG = "Saarthi/earcons"
    }
}
