package ai.saarthi.app.table

import ai.saarthi.app.geometry.Box
import ai.saarthi.app.geometry.Vec2
import ai.saarthi.app.geometry.Vec3
import ai.saarthi.app.orientation.Orientation
import ai.saarthi.app.orientation.Pose
import org.junit.Assert.assertEquals
import org.junit.Assert.assertNotNull
import org.junit.Assert.assertNull
import org.junit.Test
import kotlin.math.cos
import kotlin.math.sin

/** Synthetic geometry: scenes built from known positions, checked against the maths (no device data). */
class TableGeometryTest {

    private val cam = CameraModel.VIVO_480x640

    /** A camera tilted [tiltDeg] below the horizon, no roll. */
    private fun tilted(tiltDeg: Double, yaw: Float = 0f, forward: Float = yaw): Pose {
        val a = Math.toRadians(tiltDeg)
        return Orientation.pose(Vec3(0f, cos(a).toFloat(), sin(a).toFloat()), yaw, forward)
    }

    @Test
    fun `gravity from the sensor becomes the camera's down vector`() {
        // Upright portrait: gravity sensor reads +Y. Flat, screen up: +Z. Screen up and tipped 45°.
        assertEquals(0f, Pose(Pose.downFromGravity(0f, 9.81f, 0f), 0f, 0f, 0f, 0L).tiltDeg, 0.01f)
        assertEquals(90f, Pose(Pose.downFromGravity(0f, 0f, 9.81f), 0f, 0f, 0f, 0L).tiltDeg, 0.01f)
        assertEquals(45f, Pose(Pose.downFromGravity(0f, 6.94f, 6.94f), 0f, 0f, 0f, 0L).tiltDeg, 0.01f)
        // Phone turned on its side to the left (top of the screen pointing left): gravity along +X.
        assertEquals(-90f, Pose(Pose.downFromGravity(9.81f, 0f, 0f), 0f, 0f, 0f, 0L).rollDeg, 0.01f)
    }

    @Test
    fun `the image centre at 45 degrees lands as far ahead as the camera is high`() {
        val p = TableGeometry.onTable(cam, tilted(45.0), 0.4f, 0.5f, 0.5f)!!
        assertEquals(0f, p.x, 1e-4f)
        assertEquals(0.4f, p.y, 1e-4f)
    }

    @Test
    fun `right of the image is right on the table, lower is nearer, above the horizon is nowhere`() {
        val pose = tilted(30.0)
        val centre = TableGeometry.onTable(cam, pose, 0.4f, 0.5f, 0.5f)!!
        val right = TableGeometry.onTable(cam, pose, 0.4f, 0.9f, 0.5f)!!
        val lower = TableGeometry.onTable(cam, pose, 0.4f, 0.5f, 0.9f)!!
        assert(right.x > 0.1f)
        assert(lower.y < centre.y)
        assertNull(TableGeometry.onTable(cam, tilted(5.0), 0.4f, 0.5f, 0.05f))
    }

    @Test
    fun `a table point projects back to the pixel it came from, also after the camera turns`() {
        val pose = tilted(50.0, yaw = 25f)
        val world = TableGeometry.cameraToWorld(TableGeometry.onTable(cam, pose, 0.35f, 0.3f, 0.7f)!!, pose)
        val (u, v) = TableGeometry.projectWorld(cam, pose, 0.35f, world)!!
        assertEquals(0.3f, u, 1e-4f)
        assertEquals(0.7f, v, 1e-4f)
    }

    @Test
    fun `an object stays put in the world frame when the camera turns`() {
        // Object straight ahead of a camera at yaw 0; the camera turns 20° right: the same object is
        // now left of the image centre, and its world position does not change.
        val before = tilted(45.0, yaw = 0f)
        val world = TableGeometry.cameraToWorld(TableGeometry.onTable(cam, before, 0.4f, 0.5f, 0.5f)!!, before)
        val after = tilted(45.0, yaw = 20f)
        val (u, v) = TableGeometry.projectWorld(cam, after, 0.4f, world)!!
        assert(u < 0.5f)
        val again = TableGeometry.cameraToWorld(TableGeometry.onTable(cam, after, 0.4f, u, v)!!, after)
        assertEquals(world.x, again.x, 1e-4f)
        assertEquals(world.y, again.y, 1e-4f)
    }

    @Test
    fun `body frame follows the user's forward, and the chest is behind the camera`() {
        val world = Vec2(sin(Math.toRadians(30.0)).toFloat(), cos(Math.toRadians(30.0)).toFloat())
        val body = TableGeometry.worldToBody(world, 30f)
        assertEquals(0f, body.x, 1e-4f)
        assertEquals(1f + TableGeometry.CHEST_TO_CAMERA_M, body.y, 1e-4f)
    }

    @Test
    fun `a looking-straight-down camera uses the image top as forward`() {
        val p = TableGeometry.onTable(cam, tilted(90.0), 0.4f, 0.5f, 0.2f)!!
        assert(p.y > 0.05f)
        assertEquals(0f, p.x, 1e-4f)
    }

    @Test
    fun `clock hours and reach words`() {
        assertEquals(12, Clock.hour(0f))
        assertEquals(12, Clock.hour(14f))
        assertEquals(1, Clock.hour(16f))
        assertEquals(3, Clock.hour(90f))
        assertEquals(10, Clock.hour(-50f))
        assertEquals(11, Clock.hour(-30f))
        assertEquals("in front of you", Clock.phrase(12))
        assertEquals("at 2 o'clock", Clock.phrase(2))
        assertEquals("in front of you", Direction.phrase(10f))
        assertEquals("slightly to your right", Direction.phrase(25f))
        assertEquals("on your left", Direction.phrase(-60f))
        assertEquals("slightly left", Direction.word(-20f))
        assertEquals("ahead", Direction.word(0f))
        assertEquals(Reach.WITHIN, Reach.of(0.3f))
        assertEquals(Reach.JUST_BEYOND, Reach.of(0.6f))
        assertEquals(Reach.OUT, Reach.of(1.2f))
        // Hysteresis: 0.52 m stays "within reach" if it was, becomes it otherwise only below 0.50.
        assertEquals(Reach.WITHIN, Reach.of(0.52f, previous = Reach.WITHIN))
        assertEquals(Reach.JUST_BEYOND, Reach.of(0.52f, previous = null))
        assertEquals(Reach.JUST_BEYOND, Reach.of(0.48f, previous = Reach.JUST_BEYOND))
    }

    @Test
    fun `a bottle of known width gives back the camera's height above the table`() {
        // Place a 7 cm bottle on a table 0.38 m below a camera tilted 40°, 0.45 m ahead: build the
        // box it would make in the image, then recover the height from it.
        val pose = tilted(40.0)
        val h = 0.38f
        val (f, right) = TableGeometry.axes(pose.down)
        val base = right * 0f + f * 0.45f + pose.down * h
        val (u, v) = cam.project(base)!!
        val halfWidthNorm = (cam.fx * 0.035f / base.z) / cam.w
        val box = Box(u - halfWidthNorm, v - 0.15f, u + halfWidthNorm, v)
        val est = TableHeight.fromRuler("bottle", box, cam, pose)
        assertNotNull(est)
        assertEquals(h, est!!, 0.01f)
        // Not a ruler; cut off by the frame edge: no estimate.
        assertNull(TableHeight.fromRuler("book", box, cam, pose))
        assertNull(TableHeight.fromRuler("bottle", box.copy(bottom = 1f), cam, pose))
    }

    @Test
    fun `the height estimate starts from the default and moves towards the rulers`() {
        val th = TableHeight()
        val pose = tilted(40.0)
        assertEquals(TableHeight.DEFAULT_M, th.current.heightM, 1e-6f)
        assertEquals(TableHeight.Source.DEFAULT, th.current.source)
        val (f, _) = TableGeometry.axes(pose.down)
        val base = f * 0.45f + pose.down * 0.30f
        val (u, v) = cam.project(base)!!
        val hw = (cam.fx * 0.035f / base.z) / cam.w
        val est = th.update(listOf("bottle" to Box(u - hw, v - 0.15f, u + hw, v)), cam, pose)
        assertEquals(TableHeight.Source.RULERS, est.source)
        assertEquals(0.30f, est.heightM, 0.01f)
    }
}
