package ai.saarthi.app.intent

import ai.saarthi.app.geometry.Box
import ai.saarthi.app.perception.Track
import org.junit.Assert.assertEquals
import org.junit.Test

class AnswererTest {

    private var id = 1
    private fun track(label: String, cx: Float, score: Float = 0.8f, cy: Float = 0.6f, size: Float = 0.1f, recentHits: Int = 8) =
        Track(id++, label, Box(cx - size / 2, cy - size / 2, cx + size / 2, cy + size / 2), score, 8, 0, 1_000, true,
            recentHits = recentHits, recentRuns = 10, recentMeanScore = score)

    private val a = Answerer()
    private fun ask(text: String, tracks: List<Track>, last: String? = null) =
        a.answer(IntentInterpreter.interpret(text), tracks, 1_000, last).text

    @Test
    fun `where is my bottle, answered from the world map`() {
        assertEquals("The bottle is on your left.", ask("where is my bottle", listOf(track("bottle", 0.1f))))
    }

    @Test
    fun `answers are judged at the moment of asking, not after transcription`() {
        // Phase 1 exit check: judged 1.3 s later (detector paused while transcribing), a bottle in
        // plain view read "not seen for 1299 ms" and the answer was "I can't see a bottle".
        val bottle = listOf(track("bottle", 0.1f))   // last seen at t = 1000
        val q = IntentInterpreter.interpret("where is my bottle")
        assertEquals("The bottle is on your left.", a.answer(q, bottle, 1_000, null).text)
        assertEquals("I can't see a bottle right now.", a.answer(q, bottle, 2_300, null).text)
    }

    @Test
    fun `a book with weak evidence gets a look-again, not a fact`() {
        // A book, not a bottle: since D38 a bottle seen this often at 0.4 is stated (showcase object).
        assertEquals("I might see a book in front of you; hold still a second.",
            ask("where is my book", listOf(track("book", 0.5f, score = 0.4f, recentHits = 3))))
    }

    @Test
    fun `nothing seen is said plainly`() {
        assertEquals("I can't see a cup right now.", ask("where did my mug go", emptyList()))
    }

    @Test
    fun `an object the phone cannot name is never guessed`() {
        assertEquals("I can't recognise a watch yet.", ask("where is my watch", listOf(track("cup", 0.5f))))
    }

    @Test
    fun `people by side`() {
        val people = listOf(track("person", 0.9f, cy = 0.2f), track("person", 0.8f, cy = 0.2f), track("person", 0.1f, cy = 0.2f))
        assertEquals("Two people on your right.", ask("who is on my right", people))
        assertEquals("One person on your left.", ask("who is on my left", people))
        assertEquals("Three people: one on your left, two on your right.", ask("how many people are here", people))
    }

    @Test
    fun `features not built yet say so`() {
        // Real or picture is built since Phase 4 (RealitySpeechTest); with no apple in view it says so.
        assertEquals("I can't see an apple right now.", ask("is the apple real", emptyList()))
        // "Is this my watch?" is answered by the core from the hand and the camera since D49 (PersonalTest).
        assertEquals(null, ask("is this my watch", emptyList()))
    }

    @Test
    fun `repeat says the last thing again`() {
        assertEquals("A cup on your left.", ask("say that again", emptyList(), last = "A cup on your left."))
    }

    @Test
    fun `stop says nothing and stops`() {
        val r = a.answer(IntentInterpreter.interpret("stop"), emptyList(), 1_000, null)
        assertEquals(null, r.text)
        assertEquals(true, r.stop)
    }
}
