package ai.saarthi.app.speech

import org.junit.Assert.assertEquals
import org.junit.Test

class VoiceInputTest {

    @Test
    fun `whisper sound tags are not words`() {
        assertEquals("", VoiceInput.speechOnly("[buzzer]"))
        assertEquals("", VoiceInput.speechOnly(" (music) [BLANK_AUDIO] "))
        assertEquals("", VoiceInput.speechOnly("[ [ [ [ ["))
        assertEquals("where is my bottle", VoiceInput.speechOnly("[noise] where is my bottle"))
    }

    @Test
    fun `ordinary transcripts pass unchanged`() {
        assertEquals("Who is on my right?", VoiceInput.speechOnly("Who is on my right?"))
    }
}
