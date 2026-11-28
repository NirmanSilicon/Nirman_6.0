package ai.saarthi.app.orientation

import ai.saarthi.app.geometry.Vec3
import kotlin.math.asin
import kotlin.math.atan2

/**
 * Which way the camera points at one instant. Pure data; [Orientation] produces it from the
 * phone's sensors.
 *
 * [down] is the unit direction of gravity in camera coordinates (x right and y down in the upright
 * portrait image, z along the lens). [yawDeg] is the camera's turn about the vertical, positive =
 * turned to the right, from an arbitrary zero (the gyro has no north), unwrapped (it can pass
 * 360). [forwardYawDeg] is a slow average of [yawDeg]: the direction the user's body is taken to
 * face, so that clock directions stay body-relative when the camera briefly pans (D19).
 */
data class Pose(
    val down: Vec3,
    val yawDeg: Float,
    val forwardYawDeg: Float,
    /** Total rotation rate, deg/s. */
    val rotationDegS: Float,
    /** `SystemClock.elapsedRealtimeNanos()` of the sensor sample. */
    val timestampNs: Long,
) {
    /** How far the lens points below the horizon (90 = straight down at the table, 0 = level). */
    val tiltDeg: Float get() = Math.toDegrees(asin(down.z.coerceIn(-1f, 1f).toDouble())).toFloat()

    /** Rotation about the lens: 0 when the image's "down" is the world's down; positive = image turned clockwise. */
    val rollDeg: Float get() = Math.toDegrees(atan2(down.x.toDouble(), down.y.toDouble())).toFloat()

    /** During fast turns, a fresh sighting's position is not trusted (SS ImuTracker's high-rotation gate). */
    val fastRotation: Boolean get() = rotationDegS > FAST_ROTATION_DEG_S

    companion object {
        const val FAST_ROTATION_DEG_S = 90f

        /**
         * Gravity as Android's gravity sensor reports it (device axes: X right and Y up along the
         * portrait screen, Z out of the screen; the vector points up, like an accelerometer at
         * rest) turned into the camera's [down]. The back camera looks along −Z, the upright
         * image's x is +X and its y is −Y, so down = (−gX, gY, gZ) / |g|.
         */
        fun downFromGravity(gx: Float, gy: Float, gz: Float): Vec3 = Vec3(-gx, gy, gz).normalized()
    }
}
