package ai.saarthi.app.speech

import org.junit.Assert.assertEquals
import org.junit.Test

class WordErrorRateTest {

    @Test
    fun `identical text has no errors, ignoring case and punctuation`() {
        assertEquals(0, WordErrorRate.errors("Where is my bottle", "where is my bottle?"))
    }

    @Test
    fun `a contraction and its expansion are the same words`() {
        // Phase 1 speech test: Whisper wrote "What is around me?" for "What's around me".
        assertEquals(0, WordErrorRate.errors("What's around me", "What is around me?"))
    }

    @Test
    fun `one substitution in four words is 25 percent`() {
        assertEquals(0.25, WordErrorRate.rate("where is my bottle", "where is my battle"), 1e-9)
    }

    @Test
    fun `insertions and deletions count`() {
        assertEquals(1, WordErrorRate.errors("find the cup", "find cup"))
        assertEquals(1, WordErrorRate.errors("find the cup", "find the red cup"))
    }

    @Test
    fun `empty hypothesis is every word wrong`() {
        assertEquals(1.0, WordErrorRate.rate("who is on my right", ""), 1e-9)
    }
}
