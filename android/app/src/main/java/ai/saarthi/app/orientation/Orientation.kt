package ai.saarthi.app.orientation

// Adapted from SecondSense sensors/ImuTracker.kt (owners' permission, commit cc122ea): gyro yaw
// projected onto the gravity axis and integrated (mount-agnostic heading, no magnetometer), a
// fast-rotation gate, SENSOR_DELAY_GAME. Changed: tilt and roll come from Android's fused gravity
// sensor as the camera's down vector, instead of SecondSense's accelerometer pitch formula, which
// measured a sideways tilt for a portrait phone (its own comment flagged the axis as unverified);
// yaw is positive to the right and unwrapped; a slow average of yaw is the body's forward (D19);
// recent poses are kept so a detection is placed with the pose of the frame it came from.

import ai.saarthi.app.geometry.Vec3
import android.content.Context
import android.hardware.Sensor
import android.hardware.SensorEvent
import android.hardware.SensorEventListener
import android.hardware.SensorManager
import android.os.Handler
import android.os.HandlerThread
import android.os.SystemClock
import kotlin.math.exp
import kotlin.math.sqrt

/**
 * The phone's orientation from its gravity sensor and gyroscope (no ARCore, PRD 1). Readable from
 * any thread: [latest], or [at] a frame's timestamp. [available] is false if the phone lacks the
 * sensors; then nothing is placed on the table and Saarthi falls back to left/front/right.
 */
class Orientation(context: Context, private val forwardTimeConstantS: Float = FORWARD_TAU_S) : SensorEventListener {

    private val sensors = context.getSystemService(Context.SENSOR_SERVICE) as SensorManager
    private val gravitySensor = sensors.getDefaultSensor(Sensor.TYPE_GRAVITY)
    private val gyroSensor = sensors.getDefaultSensor(Sensor.TYPE_GYROSCOPE)
    private var thread: HandlerThread? = null

    val available: Boolean get() = gravitySensor != null && gyroSensor != null

    // Sensor thread only.
    private var gx = 0f
    private var gy = 9.81f
    private var gz = 0f
    private var haveGravity = false
    private var yaw = 0f
    private var forward = 0f
    private var lastGyroNs = 0L

    private val lock = Any()
    private val history = ArrayDeque<Pose>()

    /** Sensor clock minus `elapsedRealtimeNanos` on receipt, ms (should be a small negative number). */
    @Volatile var clockOffsetMs = 0.0
        private set

    @Volatile var latest: Pose? = null
        private set

    fun start() {
        if (!available || thread != null) return
        val t = HandlerThread("saarthi-imu").also { it.start() }
        thread = t
        val h = Handler(t.looper)
        sensors.registerListener(this, gravitySensor, SensorManager.SENSOR_DELAY_GAME, h)
        sensors.registerListener(this, gyroSensor, SensorManager.SENSOR_DELAY_GAME, h)
    }

    fun stop() {
        sensors.unregisterListener(this)
        thread?.quitSafely()
        thread = null
    }

    /** The pose closest to [timestampNs] (a frame's time), or the latest if none is that old. */
    fun at(timestampNs: Long): Pose? = synchronized(lock) {
        var best: Pose? = null
        for (p in history) {
            if (best == null || kotlin.math.abs(p.timestampNs - timestampNs) < kotlin.math.abs(best.timestampNs - timestampNs)) best = p
        }
        best
    }

    override fun onSensorChanged(e: SensorEvent) {
        when (e.sensor.type) {
            Sensor.TYPE_GRAVITY -> {
                gx = e.values[0]; gy = e.values[1]; gz = e.values[2]
                if (!haveGravity) clockOffsetMs = (e.timestamp - SystemClock.elapsedRealtimeNanos()) / 1e6
                haveGravity = true
            }
            Sensor.TYPE_GYROSCOPE -> {
                val wx = e.values[0]; val wy = e.values[1]; val wz = e.values[2]
                if (!haveGravity) return
                val g = sqrt(gx * gx + gy * gy + gz * gz)
                if (lastGyroNs == 0L) {
                    lastGyroNs = e.timestamp
                    forward = yaw
                    return
                }
                val dt = (e.timestamp - lastGyroNs) / 1e9f
                lastGyroNs = e.timestamp
                if (dt <= 0f || dt > 0.5f || g < 1f) return  // a sensor pause: skip, as SecondSense does
                // Rotation about "up" (gravity points up in the sensor's convention) is
                // counter-clockwise seen from above, i.e. a turn to the left. Yaw is positive right.
                val upRate = (wx * gx + wy * gy + wz * gz) / g
                yaw -= Math.toDegrees(upRate.toDouble()).toFloat() * dt
                forward += (yaw - forward) * (1f - exp(-dt / forwardTimeConstantS))
                val rate = Math.toDegrees(sqrt(wx * wx + wy * wy + wz * wz).toDouble()).toFloat()
                val pose = Pose(Pose.downFromGravity(gx, gy, gz), yaw, forward, rate, e.timestamp)
                latest = pose
                synchronized(lock) {
                    history.addLast(pose)
                    while (history.isNotEmpty() && e.timestamp - history.first().timestampNs > HISTORY_NS) history.removeFirst()
                }
            }
        }
    }

    override fun onAccuracyChanged(sensor: Sensor?, accuracy: Int) {}

    /** For tests and replays: a pose from a down vector and yaws. */
    companion object {
        /** About 10 s: a glance to the side does not move "forward"; turning the body does, slowly. */
        const val FORWARD_TAU_S = 10f
        const val HISTORY_NS = 2_000_000_000L
        fun pose(down: Vec3, yawDeg: Float = 0f, forwardYawDeg: Float = yawDeg) =
            Pose(down.normalized(), yawDeg, forwardYawDeg, 0f, 0L)
    }
}
