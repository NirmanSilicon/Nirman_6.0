package ai.saarthi.app.health

import org.junit.Assert.assertEquals
import org.junit.Test

class CameraHealthMonitorTest {

    private val scene = FloatArray(400) { (it * 37 % 200).toFloat() + 30f }   // textured, bright
    private val covered = FloatArray(400) { 90f + (it % 3) }                  // flat, any brightness
    private val dim = FloatArray(400) { (it * 13 % 40).toFloat() + 10f }     // dark but textured

    @Test
    fun `a covered lens is reported only after it lasts 1_5 s`() {
        val m = CameraHealthMonitor()
        assertEquals(CameraHealth.OK, m.update(covered, 0))
        assertEquals(CameraHealth.OK, m.update(covered, 1_000))
        assertEquals(CameraHealth.BLOCKED, m.update(covered, 1_600))
    }

    @Test
    fun `a hand passing the lens briefly raises nothing`() {
        val m = CameraHealthMonitor()
        m.update(covered, 0)
        m.update(covered, 800)
        assertEquals(CameraHealth.OK, m.update(scene, 900))
        assertEquals(CameraHealth.OK, m.update(scene, 3_000))
    }

    @Test
    fun `a dim but textured scene is dim, not covered`() {
        val m = CameraHealthMonitor()
        m.update(dim, 0)
        assertEquals(CameraHealth.DIM, m.update(dim, 1_600))
    }

    @Test
    fun `recovery clears after 0_9 s of a good view`() {
        val m = CameraHealthMonitor()
        m.update(covered, 0)
        m.update(covered, 1_600)
        assertEquals(CameraHealth.BLOCKED, m.update(scene, 1_700))
        assertEquals(CameraHealth.OK, m.update(scene, 2_700))
    }
}
