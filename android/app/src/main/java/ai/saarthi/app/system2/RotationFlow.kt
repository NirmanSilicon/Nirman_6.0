package ai.saarthi.app.system2

import ai.saarthi.app.geometry.Vec3
import ai.saarthi.app.orientation.Pose
import ai.saarthi.app.table.CameraModel
import kotlin.math.cos
import kotlin.math.sin
import kotlin.math.sqrt

/**
 * The image motion the phone's **turning** alone causes between two frames, from the gyro and
 * gravity (no translation). Turning moves near and far points alike, so it gives no parallax: a real
 * object and the wall behind it then move together, exactly like a picture (team test, 31 Oct: a
 * real cup called a picture). [PlanarMotion] subtracts this flow and judges only what is left, the
 * motion from the phone **shifting**, which is where parallax lives.
 *
 * Each pose gives the camera's axes against a heading frame (right and forward on the horizontal,
 * up = −down); the frames differ by the change of yaw about the vertical:
 * camera₀ → camera₁ = A₁ · Rz(Δyaw) · A₀ᵀ.
 */
class RotationFlow private constructor(private val r: Array<FloatArray>, private val fx: Float, private val fy: Float, private val cx: Float, private val cy: Float) {

    /** Where the point (x, y) of the first frame (grey pixels) moves to in the second, from turning alone: (dx, dy). */
    fun at(x: Float, y: Float): Pair<Float, Float> {
        val rx = (x - cx) / fx
        val ry = (y - cy) / fy
        val qx = r[0][0] * rx + r[0][1] * ry + r[0][2]
        val qy = r[1][0] * rx + r[1][1] * ry + r[1][2]
        val qz = r[2][0] * rx + r[2][1] * ry + r[2][2]
        if (qz <= 0.05f) return 0f to 0f
        return (fx * qx / qz + cx - x) to (fy * qy / qz + cy - y)
    }

    companion object {
        /** For two poses and the camera, at a grey image of [w] x [h]; null if a pose is degenerate. */
        fun between(p0: Pose, p1: Pose, cam: CameraModel, w: Int, h: Int): RotationFlow? {
            val a0 = heading(p0.down) ?: return null
            val a1 = heading(p1.down) ?: return null
            val t = Math.toRadians((p1.yawDeg - p0.yawDeg).toDouble())
            val c = cos(t).toFloat()
            val s = sin(t).toFloat()
            val rz = arrayOf(floatArrayOf(c, -s, 0f), floatArrayOf(s, c, 0f), floatArrayOf(0f, 0f, 1f))
            val m = mul(mul(a1, rz), transpose(a0))
            val sx = w.toFloat() / cam.w
            val sy = h.toFloat() / cam.h
            return RotationFlow(m, cam.fx * sx, cam.fy * sy, cam.cx * sx, cam.cy * sy)
        }

        /** Columns: the heading frame's right, forward and up, in camera coordinates (x right, y down, z along the lens). */
        private fun heading(down: Vec3): Array<FloatArray>? {
            val ux = -down.x; val uy = -down.y; val uz = -down.z
            // The camera's right, made horizontal.
            val d = ux  // (1,0,0) · up
            var rx = 1f - d * ux; var ry = -d * uy; var rz = -d * uz
            val n = sqrt(rx * rx + ry * ry + rz * rz)
            if (n < 0.2f) return null  // the camera's right points almost straight up or down
            rx /= n; ry /= n; rz /= n
            // forward = up × right
            val fx = uy * rz - uz * ry
            val fy = uz * rx - ux * rz
            val fz = ux * ry - uy * rx
            return arrayOf(floatArrayOf(rx, fx, ux), floatArrayOf(ry, fy, uy), floatArrayOf(rz, fz, uz))
        }

        private fun mul(a: Array<FloatArray>, b: Array<FloatArray>) =
            Array(3) { i -> FloatArray(3) { j -> a[i][0] * b[0][j] + a[i][1] * b[1][j] + a[i][2] * b[2][j] } }

        private fun transpose(a: Array<FloatArray>) = Array(3) { i -> FloatArray(3) { j -> a[j][i] } }
    }
}
