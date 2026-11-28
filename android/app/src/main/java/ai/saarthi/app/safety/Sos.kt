package ai.saarthi.app.safety

import android.Manifest
import android.annotation.SuppressLint
import android.app.PendingIntent
import android.content.BroadcastReceiver
import android.content.Context
import android.content.Intent
import android.content.IntentFilter
import android.content.pm.PackageManager
import android.hardware.Sensor
import android.hardware.SensorEvent
import android.hardware.SensorEventListener
import android.hardware.SensorManager
import android.location.Location
import android.location.LocationManager
import android.media.AudioFormat
import android.media.AudioManager
import android.media.AudioRecord
import android.media.MediaRecorder
import android.os.CancellationSignal
import android.os.Handler
import android.os.HandlerThread
import android.os.Looper
import android.os.SystemClock
import android.os.VibrationEffect
import android.os.Vibrator
import android.telephony.SmsManager
import android.util.Log
import java.io.File
import java.text.SimpleDateFormat
import java.util.Date
import java.util.Locale
import kotlin.math.abs
import kotlin.math.log10
import kotlin.math.sqrt

/**
 * Safety SOS (PRD 5.0.1 item 5, D47): a real fall of the phone starts a loud "Are you OK?" with
 * strong vibration and a [COUNTDOWN_S] countdown; unless cancelled, an SMS goes to the trusted contact
 * with the most probable situation and the approximate location. SMS and GPS need no internet.
 *
 * Always listening, cheaply: the accelerometer at 100 Hz ([FallDetector]) and the microphone's loudness,
 * one number per 50 ms ([LoudSpike]; no audio is kept). The microphone is released while the user
 * holds to talk ([micPaused]). The trusted contact lives only on the phone, in
 * `files/sos_contact.txt` (first line the number, optional second line the user's name), never in git
 * or in the feed. Callbacks run on the main thread.
 */
class Sos(private val context: Context) : SensorEventListener {

    enum class State { IDLE, COUNTDOWN, SENT }

    /** What happened, for the core (speech, screen, feed). */
    var onAlert: (situation: String, fall: FallDetector.Fall, spike: LoudSpike.Spike?, simulated: Boolean) -> Unit = { _, _, _, _ -> }
    var onTick: (secondsLeft: Int) -> Unit = {}
    var onSent: (ok: Boolean, detail: String, hasPlace: Boolean, still: Boolean) -> Unit = { _, _, _, _ -> }
    var onCancelled: (wasSent: Boolean) -> Unit = {}
    /** Is Saarthi speaking now? Its own voice is not a loud sound. */
    var ownVoice: () -> Boolean = { false }

    @Volatile var state = State.IDLE
        private set
    /** Released while the user holds to talk; reopened after. */
    @Volatile var micPaused = false

    private val main = Handler(Looper.getMainLooper())
    private val sensors = context.getSystemService(SensorManager::class.java)
    private val sensorThread = HandlerThread("saarthi-sos-imu").apply { start() }
    private val falls = FallDetector()
    private val loud = LoudSpike()
    @Volatile private var running = false
    private var micThread: Thread? = null

    // The current alert (main thread).
    private var fall: FallDetector.Fall? = null
    private var situation = ""
    private var simulated = false
    private var left = 0
    @Volatile private var movedSince = false
    private var place: Location? = null
    private var locating: CancellationSignal? = null
    private var savedVolume = -1

    fun start() {
        if (running) return
        running = true
        sensors.getDefaultSensor(Sensor.TYPE_ACCELEROMETER)?.let {
            sensors.registerListener(this, it, SAMPLE_US, Handler(sensorThread.looper))
        } ?: Log.e(TAG, "no accelerometer: SOS fall detection off")
        micThread = Thread(::listen, "saarthi-sos-mic").apply { isDaemon = true; start() }
    }

    fun stop() {
        running = false
        sensors.unregisterListener(this)
        sensorThread.quitSafely()
        cancelAlert()
    }

    // ---- Sensing ----

    private var fallAtMs = 0L

    override fun onSensorChanged(e: SensorEvent) {
        val now = SystemClock.elapsedRealtime()
        if (state == State.COUNTDOWN && now - fallAtMs > SETTLE_MS) {
            // Any real movement after the fall settles: "no movement since" would be false.
            val g = sqrt(e.values[0] * e.values[0] + e.values[1] * e.values[1] + e.values[2] * e.values[2]) / 9.81f
            if (abs(g - 1f) > MOVED_G) movedSince = true
        }
        val f = falls.onSample(e.values[0], e.values[1], e.values[2], now) ?: return
        if (state == State.IDLE) main.post { trigger(f, simulatedFall = false) }
    }

    override fun onAccuracyChanged(sensor: Sensor?, accuracy: Int) {}

    /** The microphone's loudness, one level per 50 ms, while running and not paused. */
    @SuppressLint("MissingPermission")
    private fun listen() {
        var rec: AudioRecord? = null
        val buf = ShortArray(RATE / 20)
        while (running) {
            val wanted = !micPaused && state == State.IDLE && granted(Manifest.permission.RECORD_AUDIO)
            if (!wanted) {
                rec?.let { it.stop(); it.release() }
                rec = null
                Thread.sleep(100)
                continue
            }
            if (rec == null) {
                val min = AudioRecord.getMinBufferSize(RATE, AudioFormat.CHANNEL_IN_MONO, AudioFormat.ENCODING_PCM_16BIT)
                rec = try { AudioRecord(MediaRecorder.AudioSource.MIC, RATE, AudioFormat.CHANNEL_IN_MONO, AudioFormat.ENCODING_PCM_16BIT, min * 4) } catch (t: Throwable) { null }
                if (rec == null || rec.state != AudioRecord.STATE_INITIALIZED) {
                    rec?.release(); rec = null
                    Thread.sleep(1_000)
                    continue
                }
                rec.startRecording()
            }
            val n = rec.read(buf, 0, buf.size)
            if (n <= 0) continue
            var sum = 0.0
            for (i in 0 until n) sum += buf[i].toDouble() * buf[i]
            val rms = sqrt(sum / n)
            val db = (20 * log10((rms + 1e-3) / 32768.0)).toFloat()
            loud.onLevel(db, SystemClock.elapsedRealtime(), ownVoice())
        }
        rec?.let { it.stop(); it.release() }
    }

    // ---- The alert ----

    /** Dev builds only (labelled SIMULATED in the feed and "[TEST]" in the SMS): as if the phone had fallen now. */
    fun simulateFall() {
        if (state == State.IDLE) trigger(FallDetector.Fall(SystemClock.elapsedRealtime(), 0, 0f), simulatedFall = true)
    }

    private fun trigger(f: FallDetector.Fall, simulatedFall: Boolean) {
        if (state != State.IDLE) return
        state = State.COUNTDOWN
        fall = f
        fallAtMs = f.atMs
        simulated = simulatedFall
        movedSince = false
        val spike = loud.near(f.atMs)
        situation = SosMessage.situation(spike, f)
        locate()
        loudAndShaking(true)
        left = COUNTDOWN_S
        onAlert(situation, f, spike, simulated)
        main.postDelayed(tick, 1_000)
    }

    private val tick = object : Runnable {
        override fun run() {
            if (state != State.COUNTDOWN) return
            left--
            onTick(left)
            if (left > 0) main.postDelayed(this, 1_000) else send()
        }
    }

    /** The user's tap: cancel the countdown, or after sending, return to normal. */
    fun cancel() {
        val wasSent = state == State.SENT
        if (state == State.IDLE) return
        cancelAlert()
        onCancelled(wasSent)
    }

    private fun cancelAlert() {
        main.removeCallbacks(tick)
        locating?.cancel(); locating = null
        loudAndShaking(false)
        state = State.IDLE
        falls.reset()
    }

    private fun send() {
        loudAndShaking(false, keepVolume = true)
        val contact = contact()
        val best = bestPlace()
        val still = !movedSince
        if (contact == null) {
            state = State.SENT
            onSent(false, "no trusted contact set (files/sos_contact.txt)", best != null, still)
            return
        }
        val clock = SimpleDateFormat("HH:mm", Locale.US).format(Date())
        val p = best?.let { SosMessage.Place(it.latitude, it.longitude, (System.currentTimeMillis() - it.time) / 60_000) }
        val text = (if (simulated) "[TEST] " else "") + SosMessage.text(contact.second, situation, still, COUNTDOWN_S, p, clock)
        state = State.SENT
        if (!granted(Manifest.permission.SEND_SMS)) {
            onSent(false, "SMS permission not granted", p != null, still)
            return
        }
        try {
            val sms = context.getSystemService(SmsManager::class.java)
            val parts = sms.divideMessage(text)
            val action = "ai.saarthi.SOS_SENT.${SystemClock.elapsedRealtime()}"
            var results = 0
            var ok = true
            val receiver = object : BroadcastReceiver() {
                override fun onReceive(c: Context, i: Intent) {
                    if (resultCode != android.app.Activity.RESULT_OK) ok = false
                    if (++results == parts.size) {
                        context.unregisterReceiver(this)
                        onSent(ok, if (ok) "sent in ${parts.size} part(s)" else "the phone could not send it (no signal or SIM?)", p != null, still)
                    }
                }
            }
            context.registerReceiver(receiver, IntentFilter(action), Context.RECEIVER_NOT_EXPORTED)
            val sent = ArrayList(parts.indices.map {
                PendingIntent.getBroadcast(context, it, Intent(action).setPackage(context.packageName), PendingIntent.FLAG_IMMUTABLE)
            })
            sms.sendMultipartTextMessage(contact.first, null, parts, sent, null)
        } catch (t: Throwable) {
            Log.e(TAG, "SMS failed", t)
            onSent(false, "SMS failed: ${t.message}", p != null, still)
        }
    }

    /** Number and (optional) name from `files/sos_contact.txt`, or null when not set. */
    private fun contact(): Pair<String, String?>? {
        val f = File(context.getExternalFilesDir(null), CONTACT_FILE)
        val lines = try { f.readLines().map { it.trim() }.filter { it.isNotEmpty() } } catch (t: Throwable) { return null }
        val number = lines.firstOrNull()?.takeIf { it.count(Char::isDigit) >= 6 } ?: return null
        return number to lines.getOrNull(1)
    }

    // ---- Location: a fresh fix if it comes in time, else the newest known one ----

    @SuppressLint("MissingPermission")
    private fun locate() {
        place = null
        if (!granted(Manifest.permission.ACCESS_FINE_LOCATION) && !granted(Manifest.permission.ACCESS_COARSE_LOCATION)) return
        val lm = context.getSystemService(LocationManager::class.java)
        val provider = listOf(LocationManager.GPS_PROVIDER, LocationManager.FUSED_PROVIDER, LocationManager.NETWORK_PROVIDER)
            .firstOrNull { it in lm.allProviders && lm.isProviderEnabled(it) } ?: return
        val signal = CancellationSignal()
        locating = signal
        try {
            lm.getCurrentLocation(provider, signal, context.mainExecutor) { loc -> if (loc != null) place = loc }
        } catch (t: Throwable) {
            Log.e(TAG, "location request failed", t)
        }
    }

    @SuppressLint("MissingPermission")
    private fun bestPlace(): Location? {
        val lm = context.getSystemService(LocationManager::class.java)
        val known = if (!granted(Manifest.permission.ACCESS_FINE_LOCATION) && !granted(Manifest.permission.ACCESS_COARSE_LOCATION)) emptyList()
        else lm.allProviders.mapNotNull { p -> try { lm.getLastKnownLocation(p) } catch (t: Throwable) { null } }
        return (listOfNotNull(place) + known).maxByOrNull { it.time }
    }

    // ---- Loud voice and strong vibration ----

    private fun loudAndShaking(on: Boolean, keepVolume: Boolean = false) {
        val audio = context.getSystemService(AudioManager::class.java)
        val vibrator = context.getSystemService(Vibrator::class.java)
        if (on) {
            if (savedVolume < 0) savedVolume = audio.getStreamVolume(AudioManager.STREAM_MUSIC)
            audio.setStreamVolume(AudioManager.STREAM_MUSIC, audio.getStreamMaxVolume(AudioManager.STREAM_MUSIC), 0)
            vibrator?.vibrate(VibrationEffect.createWaveform(longArrayOf(0, 700, 300), 0))
        } else {
            vibrator?.cancel()
            if (!keepVolume && savedVolume >= 0) {
                audio.setStreamVolume(AudioManager.STREAM_MUSIC, savedVolume, 0)
                savedVolume = -1
            }
        }
    }

    private fun granted(p: String) = context.checkSelfPermission(p) == PackageManager.PERMISSION_GRANTED

    companion object {
        private const val TAG = "Saarthi/sos"
        const val COUNTDOWN_S = 15
        const val CONTACT_FILE = "sos_contact.txt"
        private const val SAMPLE_US = 10_000
        private const val RATE = 16_000
        /** After the impact, give the phone this long to come to rest before watching for movement. */
        private const val SETTLE_MS = 1_500L
        private const val MOVED_G = 0.3f
    }
}
