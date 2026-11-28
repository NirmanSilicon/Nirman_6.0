package ai.saarthi.app.diary

import ai.saarthi.app.intent.Intent
import ai.saarthi.app.intent.IntentInterpreter
import org.junit.Assert.assertEquals
import org.junit.Assert.assertNull
import org.junit.Test

/** Synthetic notes (labelled: written by hand). */
class DiaryTest {

    @Test
    fun `a note comes back for a question that shares its words, and not for an unrelated one`() {
        val d = Diary()
        d.add("the first door is closed", 1_000, "18:12")
        d.add("my keys are in the left pocket of the bag", 2_000, "18:20")
        assertEquals("the first door is closed", d.find("which door is closed?")!!.text)
        assertEquals("my keys are in the left pocket of the bag", d.find("where are my keys")!!.text)
        assertNull(d.find("what time is it"))
    }

    @Test
    fun `note and read-notes requests`() {
        assertEquals(Intent.Note("the first door is closed"), IntentInterpreter.interpret("Note: the first door is closed."))
        assertEquals(Intent.Note("the meeting is in room 4"), IntentInterpreter.interpret("Take a note that the meeting is in room 4"))
        assertEquals(Intent.ReadNotes, IntentInterpreter.interpret("Read my notes."))
        assertEquals(Intent.ReadNotes, IntentInterpreter.interpret("What did I note?"))
        // Teaching still wins over a note.
        assertEquals(Intent.TeachMine("watch"), IntentInterpreter.interpret("remember that this is my watch"))
    }
}
