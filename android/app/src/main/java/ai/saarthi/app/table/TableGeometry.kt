package ai.saarthi.app.table

// The ray/ground-plane intersection is adapted from SecondSense inference/decode/MetricDepthScaler.kt
// (owners' permission, commit cc122ea): a pixel's ray meets a horizontal plane a known height below
// the camera, with the plane's normal from the IMU. Changed: the plane is the table, not the floor;
// there is no depth map on the phone, so the height comes from known-size objects (Rulers) instead
// of fitting depth; the normal is the gravity sensor's down vector, not pitch/roll angles.

import ai.saarthi.app.geometry.Vec2
import ai.saarthi.app.geometry.Vec3
import ai.saarthi.app.orientation.Pose
import kotlin.math.atan2
import kotlin.math.cos
import kotlin.math.sin

/**
 * Where things are on the table, from one camera view (phone-only: no ARCore, no depth; PRD 5.0.1).
 *
 * Frames used, all in metres on the table plane, x to the right and y forward:
 * - **camera frame**: forward is the lens direction flattened onto the table;
 * - **world frame**: the camera frame at yaw 0; stays put while the camera turns (the gyro's yaw);
 * - **body frame**: the world frame turned to the user's forward ([Pose.forwardYawDeg]), with its
 *   origin at the chest, [CHEST_TO_CAMERA_M] behind the camera. Clock directions and reach zones
 *   are measured here.
 */
object TableGeometry {

    /** The phone is held at chest level, about this far in front of the chest (handheld, SHOWCASE.md). */
    const val CHEST_TO_CAMERA_M = 0.10f

    /**
     * A ray must point at least this far below the horizon (sin 12°) to be placed on the table:
     * nearer the horizon a few pixels of box jitter move the point by tens of centimetres (Vivo,
     * 29 Oct replay: a near-level camera split one mouse into three entries). Beyond it, an object
     * keeps a direction but no distance. At 0.4 m height this is about 1.9 m away.
     */
    const val MIN_DOWN = 0.208f

    /** The camera's horizontal axes: (forward, right). Straight down, the image's top is forward. */
    fun axes(down: Vec3): Pair<Vec3, Vec3> {
        val lens = Vec3(0f, 0f, 1f)
        var f = lens - down * (lens dot down)
        if (f.length < 0.25f) {
            val imageUp = Vec3(0f, -1f, 0f)
            f = imageUp - down * (imageUp dot down)
        }
        f = f.normalized()
        return f to (down cross f)
    }

    /**
     * Where the ray through image point ([u], [v]) meets the table, [heightM] below the camera, in
     * the camera frame; null if the ray does not reach the table (at or above the horizon).
     */
    fun onTable(cam: CameraModel, pose: Pose, heightM: Float, u: Float, v: Float): Vec2? {
        val r = cam.ray(u, v)
        val downward = r dot pose.down
        if (downward < MIN_DOWN * r.length) return null
        val p = r * (heightM / downward)
        val (f, right) = axes(pose.down)
        return Vec2(p dot right, p dot f)
    }

    /** The horizontal direction of image point ([u], [v]) in the camera frame, degrees, positive right. */
    fun bearingInCamera(cam: CameraModel, pose: Pose, u: Float, v: Float): Float {
        val r = cam.ray(u, v)
        val (f, right) = axes(pose.down)
        return Math.toDegrees(atan2((r dot right).toDouble(), (r dot f).toDouble())).toFloat()
    }

    /** [p], given in a frame turned [deg] to the right, expressed in the unturned frame. */
    fun unturn(p: Vec2, deg: Float): Vec2 {
        val a = Math.toRadians(deg.toDouble())
        val c = cos(a).toFloat()
        val s = sin(a).toFloat()
        return Vec2(p.x * c + p.y * s, -p.x * s + p.y * c)
    }

    fun cameraToWorld(p: Vec2, pose: Pose): Vec2 = unturn(p, pose.yawDeg)

    /** A world point in the body frame (chest at the origin). */
    fun worldToBody(p: Vec2, forwardYawDeg: Float): Vec2 = unturn(p, -forwardYawDeg).let { Vec2(it.x, it.y + CHEST_TO_CAMERA_M) }

    /** A world bearing (degrees, positive right) as seen from the user's forward. */
    fun bodyBearing(worldBearingDeg: Float, forwardYawDeg: Float): Float = wrap(worldBearingDeg - forwardYawDeg)

    /** Where a world table point appears in the image now (0..1, may be outside the frame); null if behind. */
    fun projectWorld(cam: CameraModel, pose: Pose, heightM: Float, world: Vec2): Pair<Float, Float>? {
        val c = unturn(world, -pose.yawDeg)
        val (f, right) = axes(pose.down)
        return cam.project(right * c.x + f * c.y + pose.down * heightM)
    }

    /**
     * The part of the table the camera sees, as four corners in the body frame (bottom-left,
     * bottom-right, top-right, top-left of the image). A top corner above the horizon, or farther
     * than [maxM], is moved down its image edge until it is on the table within [maxM]; null if
     * that edge never reaches the table.
     */
    fun footprint(cam: CameraModel, pose: Pose, heightM: Float, maxM: Float = 2f): List<Vec2?> =
        listOf(0f to 1f, 1f to 1f, 1f to 0f, 0f to 0f).map { (u, v0) ->
            var v = v0
            var p: Vec2? = null
            while (v <= 1f) {
                p = onTable(cam, pose, heightM, u, v)?.takeIf { it.length <= maxM }
                if (p != null) break
                v += 0.02f
            }
            p?.let { worldToBody(cameraToWorld(it, pose), pose.forwardYawDeg) }
        }

    /** Degrees into −180..180. */
    fun wrap(deg: Float): Float {
        var d = deg % 360f
        if (d > 180f) d -= 360f
        if (d < -180f) d += 360f
        return d
    }
}
