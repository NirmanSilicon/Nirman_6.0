package ai.saarthi.app.brief

import ai.saarthi.app.geometry.Box
import ai.saarthi.app.perception.Track
import org.junit.Assert.assertEquals
import org.junit.Assert.assertTrue
import org.junit.Test

class BriefComposerTest {

    private var nextId = 1
    private fun track(
        label: String, cx: Float, size: Float = 0.1f, score: Float = 0.7f,
        confirmed: Boolean = true, lastSeenMs: Long = 1_000,
        recentHits: Int = 5, recentRuns: Int = 10, cy: Float = 0.5f,
    ) = Track(
        nextId++, label, Box(cx - size / 2, cy - size / 2, cx + size / 2, cy + size / 2),
        score, if (confirmed) 5 else 1, 0, lastSeenMs, confirmed,
        recentHits = recentHits, recentRuns = recentRuns, recentMeanScore = score,
    )

    private val composer = BriefComposer()

    @Test
    fun `a table with three objects and a person`() {
        val b = composer.compose(
            listOf(
                track("dining table", 0.5f, size = 0.9f),
                track("laptop", 0.5f, size = 0.4f),
                track("bottle", 0.85f, size = 0.15f),
                track("book", 0.15f, size = 0.2f),
                // Across the table: above the laptop in a chest-mounted view, not inside its box.
                track("person", 0.5f, size = 0.3f, cy = 0.2f),
            ),
            nowMs = 1_000,
        )
        assertEquals(
            "You're at a table. A laptop in front of you, a book on your left, a bottle on your right, one person in front of you.",
            b.text,
        )
    }

    @Test
    fun `unconfirmed, low-score and stale tracks are never said, and each has a reason`() {
        val b = composer.compose(
            listOf(
                track("cup", 0.5f, confirmed = false),
                track("microwave", 0.5f, score = 0.32f),
                track("bottle", 0.5f, lastSeenMs = 0),
            ),
            nowMs = 1_500,
        )
        assertEquals(BriefComposer.NOTHING, b.text)
        assertEquals(3, b.leftOut.size)
        assertTrue(b.leftOut.any { it.label == "microwave" && it.reason.startsWith("weak: score 0.32") })
    }

    @Test
    fun `a consistently seen object with a modest score is said`() {
        // The book in the Phase 1 milestone session: score about 0.4, but seen in most runs.
        val b = composer.compose(listOf(track("book", 0.15f, score = 0.42f, recentHits = 8, recentRuns = 10)), 1_000)
        assertEquals("A book on your left.", b.text)
    }

    @Test
    fun `a modest score seen only now and then is not said`() {
        val b = composer.compose(listOf(track("cat", 0.5f, score = 0.45f, recentHits = 4, recentRuns = 10)), 1_000)
        assertEquals(BriefComposer.NOTHING, b.text)
        assertTrue(b.leftOut.single().reason.startsWith("weak"))
    }

    @Test
    fun `the five showcase objects are sure from the detector's floor`() {
        // Team, 31 Oct (D38): an apple at 0.4, seen now and then, is green; any other class is not.
        val apple = track("apple", 0.5f, score = 0.38f, recentHits = 3, recentRuns = 10)
        val book = track("book", 0.2f, score = 0.38f, recentHits = 3, recentRuns = 10)
        val b = composer.compose(listOf(apple, book), 1_000)
        assertEquals("An apple in front of you.", b.text)
        assertEquals(setOf(apple.id), b.sureTracks)
        // Below the floor (a mean of lower sightings) it is still weak.
        val faint = track("cup", 0.5f, score = 0.28f, recentHits = 3, recentRuns = 10)
        assertTrue(composer.compose(listOf(faint), 1_000).leftOut.single().reason.startsWith("weak"))
    }

    @Test
    fun `a small person box at the frame edge may be a hand and is not said`() {
        val finger = Track(1, "person", Box(0f, 0.4f, 0.1f, 0.7f), 0.8f, 5, 0, 1_000, true)
        val b = composer.compose(listOf(finger), 1_000)
        assertEquals(BriefComposer.NOTHING, b.text)
        assertEquals("small and at the frame edge: may be a hand", b.leftOut.single().reason)
    }

    @Test
    fun `a person across the table, partly out of frame, is still counted`() {
        val person = Track(1, "person", Box(0.6f, 0.0f, 1.0f, 0.5f), 0.8f, 5, 0, 1_000, true)
        assertEquals("One person on your right.", composer.compose(listOf(person), 1_000).text)
    }

    @Test
    fun `only demo-kit classes are spoken`() {
        val b = composer.compose(listOf(track("refrigerator", 0.5f, score = 0.9f), track("bed", 0.2f, score = 0.9f)), 1_000)
        assertEquals(BriefComposer.NOTHING, b.text)
        assertEquals(2, b.leftOut.count { it.reason == BriefComposer.NOT_IN_KIT })
    }

    @Test
    fun `a screen on a laptop is the laptop's own screen, said once`() {
        val laptop = track("laptop", 0.5f, size = 0.5f)
        val tv = track("tv", 0.5f, size = 0.3f, cy = 0.4f)
        val b = composer.compose(listOf(laptop, tv), 1_000)
        assertEquals("A laptop in front of you.", b.text)
        // "tv" is outside the demo kit (D15), so it is dropped before the screen rule is reached.
        assertEquals("tv", b.leftOut.single().label)
    }

    @Test
    fun `an apple inside a tv's box may be a picture, even though tv is not in the kit`() {
        val tv = track("tv", 0.5f, size = 0.6f)
        val apple = track("apple", 0.5f, size = 0.1f, score = 0.8f)
        val b = composer.compose(listOf(tv, apple), 1_000)
        assertEquals(BriefComposer.NOTHING, b.text)
        assertTrue(b.leftOut.first { it.label == "apple" }.reason.contains("may be a picture"))
    }

    @Test
    fun `an apple inside a laptop's box may be a picture and is not stated`() {
        val laptop = track("laptop", 0.5f, size = 0.5f)
        val apple = track("apple", 0.5f, size = 0.1f, score = 0.8f, cy = 0.4f)
        val b = composer.compose(listOf(laptop, apple), 1_000)
        assertEquals("A laptop in front of you.", b.text)
        assertTrue(b.leftOut.single().reason.contains("may be a picture"))
    }

    @Test
    fun `an apple beside a laptop is stated`() {
        val laptop = track("laptop", 0.5f, size = 0.4f)
        val apple = track("apple", 0.85f, size = 0.1f, score = 0.8f)
        val b = composer.compose(listOf(laptop, apple), 1_000)
        assertEquals("A laptop in front of you, an apple on your right.", b.text)
    }

    @Test
    fun `one object boxed twice by the detector is said once`() {
        // Vivo, 29 Oct (RECORDED values): laptop boxes [0.542,0.188,0.99,0.619] and [0.56,0.472,0.983,0.65].
        val big = Track(1, "laptop", Box(0.542f, 0.188f, 0.99f, 0.619f), 0.35f, 9, 0, 1_000, true, recentHits = 8, recentRuns = 10, recentMeanScore = 0.4f)
        val part = Track(2, "laptop", Box(0.56f, 0.472f, 0.983f, 0.65f), 0.39f, 9, 0, 1_000, true, recentHits = 9, recentRuns = 10, recentMeanScore = 0.4f)
        val b = composer.compose(listOf(big, part), 1_000)
        assertEquals("A laptop on your right.", b.text)
        assertTrue(b.leftOut.single().reason.contains("the same object seen twice"))
    }

    @Test
    fun `a class outside the demo kit is left out even when confident`() {
        val b = composer.compose(listOf(track("airplane", 0.5f, score = 0.9f)), 1_000)
        assertEquals(BriefComposer.NOTHING, b.text)
        assertEquals(BriefComposer.NOT_IN_KIT, b.leftOut.single().reason)
    }

    @Test
    fun `same-class objects are grouped and their zones joined`() {
        val b = composer.compose(listOf(track("cup", 0.1f), track("cup", 0.9f)), 1_000)
        assertEquals("Two cups spread left and right.", b.text)
    }

    @Test
    fun `people are counted, not described`() {
        val b = composer.compose(listOf(track("person", 0.1f), track("person", 0.2f), track("person", 0.5f)), 1_000)
        assertEquals("Three people spread left and in front.", b.text)
    }

    @Test
    fun `at most five items, the people line kept`() {
        val labels = listOf("book", "cup", "bottle", "apple", "mouse", "banana")
        val tracks = labels.mapIndexed { i, l -> track(l, 0.5f, size = 0.5f - i * 0.05f) } + track("person", 0.5f)
        val b = composer.compose(tracks, 1_000)
        assertEquals(5, b.items.size)
        assertTrue(b.items.last().phrase.startsWith("one person"))
        assertEquals(setOf("mouse", "banana"), b.leftOut.map { it.label }.toSet())
    }

    @Test
    fun `a table with nothing named on it says so`() {
        val b = composer.compose(listOf(track("dining table", 0.5f, size = 0.9f)), 1_000)
        assertEquals("You're at a table. I don't see anything on it I can name yet.", b.text)
    }

    @Test
    fun `spoken names and articles`() {
        val b = composer.compose(listOf(track("cell phone", 0.5f), track("apple", 0.1f, size = 0.05f)), 1_000)
        assertEquals("A phone in front of you, an apple on your left.", b.text)
        assertEquals("pairs of scissors", BriefComposer.plural("scissors"))
        assertEquals("glasses", BriefComposer.plural("glass"))
    }
}
