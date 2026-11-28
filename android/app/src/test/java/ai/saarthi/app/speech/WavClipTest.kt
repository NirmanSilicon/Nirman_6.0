package ai.saarthi.app.speech

import org.junit.Assert.assertArrayEquals
import org.junit.Assert.assertEquals
import org.junit.Assert.assertNull
import org.junit.Test
import java.nio.ByteBuffer
import java.nio.ByteOrder

class WavClipTest {

    private fun wav(rate: Int, channels: Int, bits: Int, samples: ShortArray, dataSize: Int? = null, extraChunk: Boolean = false): ByteArray {
        val data = samples.size * 2
        val extra = if (extraChunk) 8 + 4 else 0
        val b = ByteBuffer.allocate(44 + extra + data).order(ByteOrder.LITTLE_ENDIAN)
        b.put("RIFF".toByteArray()).putInt(36 + extra + data).put("WAVE".toByteArray())
        b.put("fmt ".toByteArray()).putInt(16).putShort(1).putShort(channels.toShort()).putInt(rate)
            .putInt(rate * channels * bits / 8).putShort((channels * bits / 8).toShort()).putShort(bits.toShort())
        if (extraChunk) b.put("LIST".toByteArray()).putInt(4).putInt(0)
        b.put("data".toByteArray()).putInt(dataSize ?: data)
        for (s in samples) b.putShort(s)
        return b.array()
    }

    @Test
    fun `reads 16-bit mono PCM`() {
        val clip = WavClip.parse(wav(24_000, 1, 16, shortArrayOf(1, -2, 300)))!!
        assertEquals(24_000, clip.sampleRate)
        assertArrayEquals(shortArrayOf(1, -2, 300), clip.samples)
    }

    @Test
    fun `skips unknown chunks before the data`() {
        val clip = WavClip.parse(wav(16_000, 1, 16, shortArrayOf(5, 6), extraChunk = true))!!
        assertArrayEquals(shortArrayOf(5, 6), clip.samples)
    }

    @Test
    fun `a streaming placeholder size of zero uses the file length`() {
        val clip = WavClip.parse(wav(22_050, 1, 16, shortArrayOf(7, 8, 9), dataSize = 0))!!
        assertEquals(3, clip.samples.size)
    }

    @Test
    fun `stereo keeps the first channel`() {
        val clip = WavClip.parse(wav(24_000, 2, 16, shortArrayOf(1, 100, 2, 200)))!!
        assertArrayEquals(shortArrayOf(1, 2), clip.samples)
    }

    @Test
    fun `anything other than 16-bit PCM is refused, not guessed`() {
        assertNull(WavClip.parse(wav(24_000, 1, 8, shortArrayOf(1))))
        assertNull(WavClip.parse(ByteArray(4)))
    }
}
