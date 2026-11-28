package ai.saarthi.app.feedback

import org.junit.Assert.assertEquals
import org.junit.Assert.assertTrue
import org.junit.Test
import kotlin.math.abs

class EarconsTest {

    @Test
    fun `rendered length is notes plus gaps`() {
        val notes = listOf(Earcons.Note(660.0, 45, 15), Earcons.Note(880.0, 55, 0))
        assertEquals((45 + 15 + 55) * 48, Earcons.render(notes, 48_000).size)
    }

    @Test
    fun `notes start and end at silence, so they never click`() {
        val buf = Earcons.render(listOf(Earcons.Note(880.0, 50, 0)), 48_000)
        assertEquals(0, buf.first().toInt())
        assertTrue(abs(buf.last().toInt()) < 200)
    }

    @Test
    fun `the gap between notes is silent`() {
        val buf = Earcons.render(listOf(Earcons.Note(660.0, 10, 10), Earcons.Note(880.0, 10, 0)), 48_000)
        for (i in 480 until 960) assertEquals(0, buf[i].toInt())
    }

    @Test
    fun `the tap earcon is short enough not to delay speech`() {
        val ms = Earcon.HEARD.notes.sumOf { it.ms + it.gapMs }
        assertTrue("HEARD is $ms ms", ms <= 150)
    }
}
