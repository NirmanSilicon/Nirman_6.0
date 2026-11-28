package ai.saarthi.app.intent

import org.junit.Assert.assertEquals
import org.junit.Assert.assertNull
import org.junit.Assert.assertTrue
import org.junit.Test

/** RECORDED mishearings from the team's test of 1 Nov (session_20261101_223826), and synthetic others. */
class NearMissTest {

    @Test
    fun `the 1 Nov mishearings of 'is this apple real' are recognised`() {
        for (heard in listOf("Is this apple Korean?", "Is this apan Hireen?", "Is this apollaryal?")) {
            val s = NearMiss.suggest(heard)
            assertEquals(heard, "is this apple real", s?.first)
        }
    }

    @Test
    fun `unrelated talk is not guessed at, and yes or no is understood`() {
        assertNull(NearMiss.suggest("buzzer"))
        assertNull(NearMiss.suggest("the weather is nice today"))
        assertTrue(NearMiss.isYes("Yes."))
        assertTrue(NearMiss.isYes("yeah"))
        assertTrue(NearMiss.isNo("No."))
        // A suggestion is a request the interpreter understands.
        for (t in NearMiss.TEMPLATES) assertTrue(t, IntentInterpreter.interpret(t) !is Intent.Unknown)
    }
}
