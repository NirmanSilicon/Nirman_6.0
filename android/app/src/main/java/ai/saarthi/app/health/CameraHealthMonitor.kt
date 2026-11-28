package ai.saarthi.app.health

// Adapted from SecondSense inference/decode/CameraHealthMonitor.kt (owners' permission, commit
// cc122ea): a covered lens reads as a textureless frame (very low brightness spread, whatever the
// brightness), or dark and flat; a merely dim scene is dark but keeps structure; both are debounced
// (bad must last 1.5 s to be reported, good must hold 0.9 s to clear). Same thresholds. Changed:
// the mount-angle check is left out until the IMU joins in Phase 2; the input is a small grid of
// luma samples from the upright frame. SightBuddy's LightLevelAnalyzer is the same mean-brightness
// idea and is covered by the DIM state.

import kotlin.math.sqrt

enum class CameraHealth { OK, DIM, BLOCKED }

class CameraHealthMonitor(
    private val darkMeanMax: Float = 20f,
    private val uniformStdMax: Float = 7f,
    private val flatStdMax: Float = 4.5f,
    private val dimMeanMax: Float = 42f,
    private val sustainMs: Long = 1_500L,
    private val clearMs: Long = 900L,
) {
    private var stable = CameraHealth.OK
    private var pending = CameraHealth.OK
    private var pendingSinceMs = 0L

    /** [luma] are brightness samples 0..255 across the frame. Returns the debounced state. */
    fun update(luma: FloatArray, nowMs: Long): CameraHealth {
        if (luma.isEmpty()) return stable
        val mean = luma.average().toFloat()
        var sq = 0.0
        for (v in luma) { val d = v - mean; sq += d * d }
        val std = sqrt(sq / luma.size).toFloat()

        val instant = when {
            std < flatStdMax || (mean < darkMeanMax && std < uniformStdMax) -> CameraHealth.BLOCKED
            mean < dimMeanMax -> CameraHealth.DIM
            else -> CameraHealth.OK
        }
        if (instant != pending) { pending = instant; pendingSinceMs = nowMs }
        val needed = if (instant == CameraHealth.OK) clearMs else sustainMs
        if (pending != stable && nowMs - pendingSinceMs >= needed) stable = pending
        return stable
    }
}
