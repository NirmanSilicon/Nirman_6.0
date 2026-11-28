package ai.saarthi.app.speech

import java.nio.ByteBuffer
import java.nio.ByteOrder

/** 16-bit mono PCM audio, as the text-to-speech engine writes it to a WAV file. */
class WavClip(val samples: ShortArray, val sampleRate: Int) {

    val durationMs: Double get() = samples.size * 1000.0 / sampleRate

    companion object {
        /**
         * Parses a RIFF/WAVE file holding 16-bit PCM. Multi-channel audio is reduced to its first
         * channel. Returns null for anything else rather than guessing.
         */
        fun parse(bytes: ByteArray): WavClip? {
            if (bytes.size < 12) return null
            val b = ByteBuffer.wrap(bytes).order(ByteOrder.LITTLE_ENDIAN)
            if (tag(bytes, 0) != "RIFF" || tag(bytes, 8) != "WAVE") return null
            var pos = 12
            var rate = -1
            var channels = -1
            var bits = -1
            var format = -1
            while (pos + 8 <= bytes.size) {
                val id = tag(bytes, pos)
                val size = b.getInt(pos + 4)
                val body = pos + 8
                if (size < 0) return null
                when (id) {
                    "fmt " -> {
                        format = b.getShort(body).toInt()
                        channels = b.getShort(body + 2).toInt()
                        rate = b.getInt(body + 4)
                        bits = b.getShort(body + 14).toInt()
                    }
                    "data" -> {
                        if (format != 1 || bits != 16 || channels < 1 || rate <= 0) return null
                        // Some engines write a placeholder size while streaming; trust the file length.
                        val end = if (size == 0 || body + size > bytes.size) bytes.size else body + size
                        val frames = (end - body) / (2 * channels)
                        val out = ShortArray(frames)
                        for (i in 0 until frames) out[i] = b.getShort(body + i * 2 * channels)
                        return WavClip(out, rate)
                    }
                }
                pos = body + size + (size and 1)
            }
            return null
        }

        private fun tag(bytes: ByteArray, at: Int) = String(bytes, at, 4, Charsets.US_ASCII)
    }
}
