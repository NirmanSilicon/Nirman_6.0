package ai.saarthi.app.speech

import android.media.AudioAttributes
import android.media.AudioFormat
import android.media.AudioTrack
import android.os.SystemClock
import android.util.Log
import java.util.concurrent.Executors
import java.util.concurrent.atomic.AtomicInteger

/**
 * Plays a prepared speech clip (16-bit mono PCM) through a streaming audio track, in short chunks
 * so [stop] takes effect within about 20 ms. One clip at a time; a new [play] stops the old one.
 */
class ClipPlayer {

    private val exec = Executors.newSingleThreadExecutor { r -> Thread(r, "saarthi-clip") }
    private val generation = AtomicInteger(0)
    private var track: AudioTrack? = null
    private var trackRate = 0

    /**
     * Plays [clip]. [onFirstAudio] gets ms from this call to the first chunk handed to the audio
     * system; [onEnd] whether it was interrupted. Both run on the player thread.
     */
    fun play(clip: WavClip, onFirstAudio: (Double) -> Unit, onEnd: (interrupted: Boolean) -> Unit) {
        val gen = generation.incrementAndGet()
        val at = SystemClock.elapsedRealtimeNanos()
        exec.execute {
            if (gen != generation.get()) { onEnd(true); return@execute }
            val t = trackFor(clip.sampleRate) ?: run { onEnd(true); return@execute }
            t.play()
            var pos = 0
            val chunk = clip.sampleRate / 50 // 20 ms
            var first = true
            while (pos < clip.samples.size) {
                if (gen != generation.get()) {
                    t.pause(); t.flush()
                    onEnd(true)
                    return@execute
                }
                val n = minOf(chunk, clip.samples.size - pos)
                if (first) { onFirstAudio((SystemClock.elapsedRealtimeNanos() - at) / 1e6); first = false }
                t.write(clip.samples, pos, n)
                pos += n
            }
            onEnd(false)
        }
    }

    /** Stops the clip being played, if any. */
    fun stop() {
        generation.incrementAndGet()
    }

    private fun trackFor(rate: Int): AudioTrack? {
        if (track != null && trackRate == rate) return track
        track?.release()
        track = try {
            AudioTrack.Builder()
                .setAudioAttributes(
                    AudioAttributes.Builder()
                        .setUsage(AudioAttributes.USAGE_MEDIA)
                        .setContentType(AudioAttributes.CONTENT_TYPE_SPEECH)
                        .build()
                )
                .setAudioFormat(
                    AudioFormat.Builder().setSampleRate(rate)
                        .setChannelMask(AudioFormat.CHANNEL_OUT_MONO)
                        .setEncoding(AudioFormat.ENCODING_PCM_16BIT).build()
                )
                .setBufferSizeInBytes(AudioTrack.getMinBufferSize(rate, AudioFormat.CHANNEL_OUT_MONO, AudioFormat.ENCODING_PCM_16BIT))
                .setTransferMode(AudioTrack.MODE_STREAM)
                .setPerformanceMode(AudioTrack.PERFORMANCE_MODE_LOW_LATENCY)
                .build()
        } catch (e: Exception) {
            Log.e(TAG, "clip audio track failed", e)
            null
        }
        trackRate = rate
        return track
    }

    fun close() {
        stop()
        exec.execute { track?.release(); track = null }
        exec.shutdown()
    }

    private companion object {
        const val TAG = "Saarthi/clip"
    }
}
