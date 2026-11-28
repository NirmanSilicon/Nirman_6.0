package ai.saarthi.app.ocr

import org.junit.Assert.assertEquals
import org.junit.Assert.assertNull
import org.junit.Test

/** Synthetic lines (built by hand): the structure rule only, no OCR. */
class TextReaderTest {

    private fun line(t: String, h: Int, top: Int, left: Int = 10) = TextReader.Line(t, h, top, left)

    @Test
    fun `a tall two-line title is the heading, the rest follows top to bottom`() {
        val page = TextReader.structure(listOf(
            line("James Clear", 14, 300), line("Atomic", 60, 40), line("Habits", 58, 110),
            line("An Easy & Proven Way", 16, 200), line("to Build Good Habits", 16, 220),
        ))
        assertEquals("Atomic Habits", page.heading)
        assertEquals(listOf("An Easy & Proven Way", "to Build Good Habits", "James Clear"), page.rest)
    }

    @Test
    fun `lines of one size have no heading`() {
        val page = TextReader.structure(listOf(line("first line", 20, 10), line("second line", 21, 40)))
        assertNull(page.heading)
        assertEquals(listOf("first line", "second line"), page.rest)
    }

    @Test
    fun `no text is no page`() {
        assertEquals(0, TextReader.structure(emptyList()).chars)
    }
}
