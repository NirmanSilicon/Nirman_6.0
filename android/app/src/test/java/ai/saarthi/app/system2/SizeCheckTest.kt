package ai.saarthi.app.system2

import ai.saarthi.app.geometry.Box
import ai.saarthi.app.geometry.Vec3
import ai.saarthi.app.orientation.Pose
import ai.saarthi.app.table.CameraModel
import org.junit.Assert.assertEquals
import org.junit.Assert.assertNull
import org.junit.Test
import kotlin.math.sqrt

/** SIMULATED geometry: the camera 0.40 m above the table, tilted 45° down. */
class SizeCheckTest {

    private val cam = CameraModel.VIVO_480x640
    private val s = sqrt(0.5f)
    private val pose = Pose(Vec3(0f, s, s), 0f, 0f, 0f, 0L)

    /** The box of an object [widthM] wide whose base centre is on the table straight ahead, at depth [z] along the lens. */
    private fun boxAt(widthM: Float, z: Float): Box {
        val y = 0.40f / s - z                          // base point (0, y, z) satisfies (0, y, z) · down = 0.40
        val v = (y / z * cam.fy + cam.cy) / cam.h
        val half = widthM / 2f * cam.fx / z / cam.w
        return Box(0.5f - half, v - 0.1f, 0.5f + half, v)
    }

    @Test
    fun `the width of an object on the table comes back from its box`() {
        assertEquals(0.075f, SizeCheck.widthM(boxAt(0.075f, 0.40f), cam, pose, 0.40f)!!, 0.002f)
        assertEquals(0.10f, SizeCheck.widthM(boxAt(0.10f, 0.50f), cam, pose, 0.40f)!!, 0.002f)
    }

    @Test
    fun `a box cut by the frame edge is not measured`() {
        assertNull(SizeCheck.widthM(Box(0f, 0.4f, 0.2f, 0.6f), cam, pose, 0.40f))
    }

    @Test
    fun `only a clear misfit is implausible`() {
        assertEquals(true, SizeCheck.plausible("apple", 0.075f))
        assertEquals(true, SizeCheck.plausible("apple", 0.17f))     // a little wide (held up, loose box): not silenced
        assertEquals(false, SizeCheck.plausible("apple", 0.25f))
        assertEquals(false, SizeCheck.plausible("mouse", 0.02f))
        assertEquals(null, SizeCheck.plausible("laptop", 0.10f))    // not checked: its box often covers part of it
    }

    @Test
    fun `an implausible size holds a statement back, with the reason`() {
        val a = Assessment(1, "apple", 1, 0.6f, 0f, 0.8f, Verdict.UNSURE, emptyList(), null, size = Assessment.Size(0.25f, 9, false))
        assertEquals("its size does not fit an apple (25 cm wide)", a.doubt)
    }
}
