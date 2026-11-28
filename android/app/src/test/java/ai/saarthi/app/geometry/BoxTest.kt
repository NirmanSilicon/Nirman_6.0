package ai.saarthi.app.geometry

import org.junit.Assert.assertEquals
import org.junit.Assert.assertTrue
import org.junit.Test

class BoxTest {

    private fun b(l: Float, t: Float, r: Float, bo: Float) = Box(l, t, r, bo)

    @Test
    fun identicalBoxesHaveIouOne() {
        assertEquals(1f, b(0f, 0f, 10f, 10f).iou(b(0f, 0f, 10f, 10f)), 1e-6f)
    }

    @Test
    fun disjointBoxesHaveIouZero() {
        assertEquals(0f, b(0f, 0f, 10f, 10f).iou(b(20f, 20f, 30f, 30f)), 0f)
    }

    @Test
    fun touchingEdgesHaveIouZero() {
        assertEquals(0f, b(0f, 0f, 10f, 10f).iou(b(10f, 0f, 20f, 10f)), 0f)
    }

    @Test
    fun halfOverlapIsOneThird() {
        // Overlap 5x10 = 50; union 100 + 100 - 50 = 150.
        assertEquals(1f / 3f, b(0f, 0f, 10f, 10f).iou(b(5f, 0f, 15f, 10f)), 1e-6f)
    }

    @Test
    fun degenerateBoxDoesNotDivideByZero() {
        assertEquals(0f, b(0f, 0f, 0f, 0f).iou(b(0f, 0f, 0f, 0f)), 0f)
    }
}

class BoxMatcherTest {

    private fun d(label: String, l: Float, score: Float = 0.8f) =
        LabelledBox(label, score, Box(l, 0f, l + 10f, 10f))

    @Test
    fun matchesSameLabelOverlappingBoxes() {
        val r = BoxMatcher.match(listOf(d("cup", 0f)), listOf(d("cup", 1f)))
        assertEquals(1, r.matches.size)
        assertTrue(r.unmatchedReference.isEmpty() && r.unmatchedCandidate.isEmpty())
    }

    @Test
    fun differentLabelsNeverMatch() {
        val r = BoxMatcher.match(listOf(d("cup", 0f)), listOf(d("bottle", 0f)))
        assertEquals(0, r.matches.size)
        assertEquals(1, r.unmatchedReference.size)
        assertEquals(1, r.unmatchedCandidate.size)
    }

    @Test
    fun lowOverlapIsUnmatched() {
        // Overlap 2x10 = 20; union 180; IoU 0.11 < 0.5.
        val r = BoxMatcher.match(listOf(d("cup", 0f)), listOf(d("cup", 8f)))
        assertEquals(0, r.matches.size)
    }

    @Test
    fun eachCandidateIsUsedOnce() {
        // Two reference cups, one candidate: only one pairing, the better one.
        val r = BoxMatcher.match(listOf(d("cup", 0f), d("cup", 2f)), listOf(d("cup", 0f)))
        assertEquals(1, r.matches.size)
        assertEquals(0f, r.matches[0].reference.box.left, 0f)
        assertEquals(1, r.unmatchedReference.size)
    }

    @Test
    fun bestIouWinsWhenCompeting() {
        val r = BoxMatcher.match(listOf(d("cup", 0f)), listOf(d("cup", 3f), d("cup", 1f)))
        assertEquals(1f, r.matches.single().candidate.box.left, 0f)
    }
}
