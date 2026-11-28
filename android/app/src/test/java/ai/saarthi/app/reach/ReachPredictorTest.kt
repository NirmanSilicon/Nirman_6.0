package ai.saarthi.app.reach

import ai.saarthi.app.beliefmap.BeliefMap
import ai.saarthi.app.geometry.Vec2
import ai.saarthi.app.worldmap.Seen
import ai.saarthi.app.worldmap.WorldObject
import org.junit.Assert.assertEquals
import org.junit.Assert.assertNotNull
import org.junit.Assert.assertNull
import org.junit.Assert.assertTrue
import org.junit.Test
import kotlin.random.Random

/** Synthetic hand paths (labelled: built by hand, not device data) at the full hand rate, 10 per second. */
class ReachPredictorTest {

    private val oldSpot = ReachPredictor.Spot(1, 0.30f, 0.45f, 0.06f, watched = true)
    private val cup = ReachPredictor.Spot(2, 0.70f, 0.45f, 0.06f, watched = false)

    /** A hand from the bottom of the frame moving straight to (tx, ty) over [ms]; wrist below the fingertip. */
    private fun reach(p: ReachPredictor, tx: Float, ty: Float, spots: List<ReachPredictor.Spot>, ms: Long = 1_000L,
                      from: Pair<Float, Float> = 0.5f to 0.95f, wristBelow: Boolean = true): Pair<ReachPredictor.Prediction?, Long> {
        for (t in 0L..ms step 100) {
            val f = t / ms.toFloat()
            val x = from.first + (tx - from.first) * f
            val y = from.second + (ty - from.second) * f
            val tip = x to y - 0.05f
            val wrist = if (wristBelow) x to y + 0.08f else x to y - 0.15f
            val r = p.onHand(x to y, tip, wrist, t, spots)
            if (r != null) return r to t
        }
        return null to -1
    }

    @Test
    fun `a straight reach to where the user wrongly believes the bottle is - predicted before it lands`() {
        val (r, at) = reach(ReachPredictor(), 0.30f, 0.50f, listOf(oldSpot, cup))
        assertNotNull(r)
        assertEquals(1, r!!.spot.key)
        // Predicted with the hand still on its way (it lands at 1000 ms).
        assertTrue("at $at ms, distance ${r.distance}", at <= 700 && r.distance >= 0.06f)
    }

    @Test
    fun `a reach to a real object is not a wrong reach`() {
        assertNull(reach(ReachPredictor(), 0.70f, 0.50f, listOf(oldSpot, cup)).first)
    }

    @Test
    fun `someone else's hand from across the table never triggers it`() {
        assertNull(reach(ReachPredictor(), 0.30f, 0.50f, listOf(oldSpot, cup), from = 0.3f to 0.0f, wristBelow = false).first)
    }

    @Test
    fun `a hand resting or trembling near the old spot says nothing`() {
        val p = ReachPredictor()
        val rnd = Random(3)
        for (t in 0L..5_000L step 100) {
            val x = 0.40f + rnd.nextFloat() * 0.02f
            val y = 0.60f + rnd.nextFloat() * 0.02f
            assertNull(p.onHand(x to y, x to y - 0.05f, x to y + 0.08f, t, listOf(oldSpot, cup)))
        }
    }

    @Test
    fun `a hand passing by the old spot sideways is not heading to it`() {
        // Moving left to right well below the spot: never closing in on it along its course.
        val p = ReachPredictor()
        for (t in 0L..1_000L step 100) {
            val x = 0.1f + 0.8f * t / 1_000f
            assertNull(p.onHand(x to 0.85f, x to 0.80f, x to 0.93f, t, listOf(oldSpot)))
        }
    }

    @Test
    fun `every stop sentence is pre-recorded`() {
        val labels = listOf("cup", "bottle", "apple", "banana", "laptop", "mouse", "book", "cell phone")
        for (l in labels) {
            assertTrue(StopPhrases.gone(l) in StopPhrases.ALL)
            for (b in -180..180 step 5) assertTrue(StopPhrases.moved(l, b.toFloat()), StopPhrases.moved(l, b.toFloat()) in StopPhrases.ALL)
        }
        assertEquals("Wait, your bottle moved; it's now on your left.", StopPhrases.moved("bottle", -70f))
    }

    private fun obj(id: Int, label: String, at: Vec2) =
        WorldObject(id, label, Seen.IN_VIEW, null, at, null, null, 0f, null, 0, 0, null, true, false, false,
            ai.saarthi.app.geometry.Box(0.4f, 0.4f, 0.5f, 0.6f))

    @Test
    fun `the belief map keeps the old spot after a move or a loss, until it is back or 90 s pass`() {
        val b = BeliefMap()
        b.told(listOf(obj(1, "bottle", Vec2(0.2f, 0.3f)), obj(2, "cup", Vec2(-0.2f, 0.3f))), 0.3f, 0)
        b.relocate(b.of(1)!!, 7, Vec2(-0.1f, 0.5f), 0.3f, 1_000)
        b.markLostSaid(b.of(2)!!, 2_000)
        val s = b.staleSpots(3_000)
        assertEquals(2, s.size)
        assertEquals(7, s.first { it.label == "bottle" }.nowWorldId)
        assertNull(s.first { it.label == "cup" }.nowWorldId)
        // The cup is back at its spot: its stale spot goes.
        b.found(b.of(2)!!, 2)
        assertEquals(listOf("bottle"), b.staleSpots(4_000).map { it.label })
        assertTrue(b.staleSpots(1_000 + BeliefMap.STALE_MS + 1).isEmpty())
    }
}
