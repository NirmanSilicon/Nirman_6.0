package ai.saarthi.app.table

import ai.saarthi.app.geometry.Vec3
import android.content.Context
import android.hardware.camera2.CameraCharacteristics
import android.hardware.camera2.CameraManager
import android.util.Log
import kotlin.math.atan

/**
 * The pinhole model of the upright camera frame ([w] × [h] pixels): which ray each pixel sees, and
 * where a 3D point appears. Image coordinates are 0..1 of the frame, as in every feed box.
 */
data class CameraModel(val w: Int, val h: Int, val fx: Float, val fy: Float, val cx: Float = w / 2f, val cy: Float = h / 2f) {

    /** The ray through image point ([u], [v]) in camera coordinates, scaled so its z is 1. */
    fun ray(u: Float, v: Float) = Vec3((u * w - cx) / fx, (v * h - cy) / fy, 1f)

    /** Where camera-space point [p] appears, in 0..1 of the frame (may be outside 0..1); null if behind the lens. */
    fun project(p: Vec3): Pair<Float, Float>? =
        if (p.z <= 0.01f) null else Pair((fx * p.x / p.z + cx) / w, (fy * p.y / p.z + cy) / h)

    val horizontalFovDeg: Float get() = Math.toDegrees(2 * atan(w / 2.0 / fx)).toFloat()

    companion object {
        private const val TAG = "Saarthi/camera"

        /**
         * The Vivo V21e's main camera at 480 × 640 upright: 4.74 mm lens on a 6.40 × 4.80 mm
         * sensor (Camera2, DEVICE_REPORT.md) gives 474 px. Used only if Camera2 cannot be read.
         */
        val VIVO_480x640 = CameraModel(480, 640, 474f, 474f)

        /**
         * The back camera's focal length in pixels of the upright [w] × [h] frame, from Camera2's
         * lens focal length and physical sensor size. The sensor is landscape; the upright frame's
         * width spans the sensor's short side.
         */
        fun fromCamera2(context: Context, w: Int = 480, h: Int = 640): CameraModel {
            try {
                val manager = context.getSystemService(Context.CAMERA_SERVICE) as CameraManager
                for (id in manager.cameraIdList) {
                    val c = manager.getCameraCharacteristics(id)
                    if (c.get(CameraCharacteristics.LENS_FACING) != CameraCharacteristics.LENS_FACING_BACK) continue
                    val focal = c.get(CameraCharacteristics.LENS_INFO_AVAILABLE_FOCAL_LENGTHS)?.firstOrNull() ?: continue
                    val size = c.get(CameraCharacteristics.SENSOR_INFO_PHYSICAL_SIZE) ?: continue
                    val shortMm = minOf(size.width, size.height)
                    val longMm = maxOf(size.width, size.height)
                    return CameraModel(w, h, focal / shortMm * w, focal / longMm * h)
                }
            } catch (t: Throwable) {
                Log.e(TAG, "Camera2 characteristics unreadable; using the measured Vivo model", t)
            }
            Log.e(TAG, "no back camera characteristics; using the measured Vivo model")
            return VIVO_480x640
        }
    }
}
