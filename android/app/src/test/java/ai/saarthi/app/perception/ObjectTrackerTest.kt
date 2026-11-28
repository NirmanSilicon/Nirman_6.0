package ai.saarthi.app.perception

import ai.saarthi.app.geometry.Box
import ai.saarthi.app.geometry.LabelledBox
import org.junit.Assert.assertEquals
import org.junit.Assert.assertFalse
import org.junit.Assert.assertNotEquals
import org.junit.Assert.assertTrue
import org.junit.Test

class ObjectTrackerTest {

    private fun det(label: String, l: Float, t: Float, r: Float, b: Float, score: Float = 0.6f) =
        LabelledBox(label, score, Box(l, t, r, b))

    @Test
    fun `an object is confirmed only after three sightings`() {
        val tracker = ObjectTracker()
        val cup = det("cup", 0.4f, 0.4f, 0.5f, 0.5f)
        assertFalse(tracker.update(listOf(cup), 0).single().confirmed)
        assertFalse(tracker.update(listOf(cup), 150).single().confirmed)
        assertTrue(tracker.update(listOf(cup), 300).single().confirmed)
    }

    @Test
    fun `a one-frame false positive expires and is never confirmed`() {
        val tracker = ObjectTracker(expireMs = 1_000)
        tracker.update(listOf(det("apple", 0.1f, 0.1f, 0.2f, 0.2f)), 0)
        assertTrue(tracker.update(emptyList(), 1_001).isEmpty())
    }

    @Test
    fun `a flickering object keeps its identity through short misses`() {
        val tracker = ObjectTracker(expireMs = 1_500)
        val book = det("book", 0.2f, 0.5f, 0.5f, 0.8f)
        val id = tracker.update(listOf(book), 0).single().id
        tracker.update(emptyList(), 500)
        tracker.update(emptyList(), 1_000)
        assertEquals(id, tracker.update(listOf(book), 1_400).single().id)
    }

    @Test
    fun `two cups side by side are two tracks and keep their own ids`() {
        val tracker = ObjectTracker()
        val left = det("cup", 0.10f, 0.4f, 0.20f, 0.5f)
        val right = det("cup", 0.70f, 0.4f, 0.80f, 0.5f)
        val first = tracker.update(listOf(left, right), 0).associateBy { it.box.left }
        // Next run lists them in the opposite order and slightly moved.
        val second = tracker.update(
            listOf(det("cup", 0.71f, 0.4f, 0.81f, 0.5f), det("cup", 0.11f, 0.4f, 0.21f, 0.5f)), 150,
        ).associateBy { it.box.left }
        assertEquals(first.getValue(0.10f).id, second.getValue(0.11f).id)
        assertEquals(first.getValue(0.70f).id, second.getValue(0.71f).id)
        assertNotEquals(second.getValue(0.11f).id, second.getValue(0.71f).id)
    }

    @Test
    fun `a small box that moved past zero IoU is still matched by its centre`() {
        val tracker = ObjectTracker(centreGate = 0.12f)
        val id = tracker.update(listOf(det("mouse", 0.50f, 0.50f, 0.54f, 0.54f)), 0).single().id
        val moved = tracker.update(listOf(det("mouse", 0.56f, 0.50f, 0.60f, 0.54f)), 150)
        assertEquals(1, moved.size)
        assertEquals(id, moved.single().id)
    }

    @Test
    fun `different labels never share a track`() {
        val tracker = ObjectTracker()
        tracker.update(listOf(det("cup", 0.4f, 0.4f, 0.5f, 0.5f)), 0)
        val out = tracker.update(listOf(det("bottle", 0.4f, 0.4f, 0.5f, 0.5f)), 150)
        assertEquals(2, out.size)
    }

    @Test
    fun `presence counts the share of recent runs that saw the object`() {
        val tracker = ObjectTracker(windowMs = 1_000)
        val book = det("book", 0.2f, 0.5f, 0.5f, 0.8f, score = 0.4f)
        val other = det("cup", 0.7f, 0.1f, 0.8f, 0.2f)
        // Ten runs, 100 ms apart; the book is seen in 7 of them.
        var last: Track? = null
        for (i in 0 until 10) {
            val dets = if (i in setOf(2, 5, 8)) listOf(other) else listOf(book, other)
            last = tracker.update(dets, i * 100L).first { it.label == "book" }
        }
        assertEquals(7, last!!.recentHits)
        assertEquals(10, last.recentRuns)
        assertEquals(0.7f, last.presence, 1e-6f)
        assertEquals(0.4f, last.recentMeanScore, 1e-6f)
    }

    @Test
    fun `presence only counts runs since the object first appeared`() {
        val tracker = ObjectTracker()
        val cup = det("cup", 0.4f, 0.4f, 0.5f, 0.5f)
        tracker.update(emptyList(), 0)
        tracker.update(emptyList(), 100)
        tracker.update(listOf(cup), 200)
        val t = tracker.update(listOf(cup), 300).single()
        assertEquals(2, t.recentRuns)
        assertEquals(1f, t.presence, 1e-6f)
    }

    @Test
    fun `old sightings leave the window`() {
        val tracker = ObjectTracker(windowMs = 500, expireMs = 2_000)
        val cup = det("cup", 0.4f, 0.4f, 0.5f, 0.5f)
        tracker.update(listOf(cup), 0)
        tracker.update(listOf(cup), 100)
        val t = tracker.update(emptyList(), 1_000).single()
        assertEquals(0, t.recentHits)
        assertEquals(0f, t.presence, 0f)
    }

    @Test
    fun `score is smoothed, not replaced`() {
        val tracker = ObjectTracker(scoreAlpha = 0.5f)
        tracker.update(listOf(det("cup", 0.4f, 0.4f, 0.5f, 0.5f, score = 0.8f)), 0)
        val s = tracker.update(listOf(det("cup", 0.4f, 0.4f, 0.5f, 0.5f, score = 0.4f)), 150).single().score
        assertEquals(0.6f, s, 1e-6f)
    }
}
