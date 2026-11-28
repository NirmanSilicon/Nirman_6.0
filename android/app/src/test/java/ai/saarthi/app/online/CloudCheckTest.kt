package ai.saarthi.app.online

import ai.saarthi.app.intent.Intent
import ai.saarthi.app.intent.IntentInterpreter
import org.junit.Assert.assertEquals
import org.junit.Assert.assertTrue
import org.junit.Test

/** Synthetic answers (labelled: written by hand, not from the cloud). */
class CloudCheckTest {

    private val table = listOf(CloudCheck.Known("bottle", "slightly right"), CloudCheck.Known("cup", "left"), CloudCheck.Known("laptop", "ahead"))

    @Test
    fun `an answer that matches the world map is said as matching`() {
        val r = CloudCheck.check("The bottle is on your right, next to the laptop.", table)
        assertEquals(CloudCheck.Verdict.AGREES, r.verdict)
        assertEquals("The bottle is on your right, next to the laptop.", r.spoken)
    }

    @Test
    fun `the wrong side is caught`() {
        val r = CloudCheck.check("Your mug is on your right.", table)
        assertEquals(CloudCheck.Verdict.CONTRADICTS, r.verdict)
        assertEquals("Your mug is on your right. But I see the cup on your left, so I'm not sure.", r.spoken)
    }

    @Test
    fun `an object Saarthi never saw is doubted, and a denied object it sees is too`() {
        assertEquals("I don't see an apple", CloudCheck.check("There is a red apple in front of you", table).reason)
        assertEquals("I see a bottle", CloudCheck.check("I don't see any bottle on the table.", table).reason)
    }

    @Test
    fun `nothing Saarthi can check is said as unchecked`() {
        val r = CloudCheck.check("The wall behind the table is white", table)
        assertEquals(CloudCheck.Verdict.UNCHECKED, r.verdict)
        assertEquals("The wall behind the table is white.", r.spoken)
    }

    @Test
    fun `online on and off by voice`() {
        assertEquals(Intent.Online(true), IntentInterpreter.interpret("go online"))
        assertEquals(Intent.Online(true), IntentInterpreter.interpret("Turn on online answers."))
        assertEquals(Intent.Online(false), IntentInterpreter.interpret("go offline"))
        assertEquals(Intent.Online(false), IntentInterpreter.interpret("turn off online"))
        assertEquals(Intent.Online(true, "tell me what is this"), IntentInterpreter.interpret("Go online and tell me what is this."))
        assertEquals(Intent.Online(false), IntentInterpreter.interpret("Go offline please"))
        assertEquals(Intent.WhatIsThis, IntentInterpreter.interpret("Tell me where I am pointing at."))
        assertEquals(Intent.WhatIsThis, IntentInterpreter.interpret("what I'm pointing at"))
    }
}
