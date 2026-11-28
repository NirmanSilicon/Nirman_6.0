package ai.saarthi.app.bench

import java.io.File
import java.nio.ByteBuffer
import java.nio.ByteOrder

/** Writes mono float audio (-1..1) as a 16-bit PCM WAV file (dev tests only). */
object Wav {
    fun write(file: File, samples: FloatArray, rate: Int) {
        val data = samples.size * 2
        val b = ByteBuffer.allocate(44 + data).order(ByteOrder.LITTLE_ENDIAN)
        b.put("RIFF".toByteArray()).putInt(36 + data).put("WAVE".toByteArray())
        b.put("fmt ".toByteArray()).putInt(16).putShort(1).putShort(1).putInt(rate).putInt(rate * 2).putShort(2).putShort(16)
        b.put("data".toByteArray()).putInt(data)
        for (s in samples) b.putShort((s.coerceIn(-1f, 1f) * 32767).toInt().toShort())
        file.writeBytes(b.array())
    }
}
