package ai.saarthi.app.app

import ai.saarthi.app.BuildConfig
import android.annotation.SuppressLint
import ai.saarthi.app.perception.FastDetector
import android.Manifest
import android.content.pm.PackageManager
import android.graphics.Color
import android.os.Bundle
import android.os.Handler
import android.os.Looper
import android.view.Gravity
import android.view.MotionEvent
import android.view.View
import android.view.WindowManager
import android.widget.Button
import android.widget.FrameLayout
import android.widget.LinearLayout
import android.widget.TextView
import androidx.activity.ComponentActivity
import androidx.activity.result.contract.ActivityResultContracts
import androidx.camera.view.PreviewView
import androidx.core.content.ContextCompat

/**
 * The phone screen: one full-screen control (PRD 11), large high-contrast text, TalkBack-labelled.
 * The dev build also shows the camera view with detection boxes, so the team can see what is in
 * frame (D13). All behaviour lives in [SaarthiCore]; this class only handles the screen,
 * permissions and the activity lifecycle.
 */
class MainActivity : ComponentActivity() {

    private lateinit var core: SaarthiCore
    private lateinit var control: TextView
    private lateinit var status: TextView
    private var preview: PreviewView? = null
    private var boxes: TrackOverlayView? = null
    private lateinit var sosView: LinearLayout
    private lateinit var onlineMark: TextView
    private lateinit var sosTitle: TextView
    private lateinit var sosDetail: TextView
    private lateinit var sosButton: Button
    private val main = Handler(Looper.getMainLooper())

    private val askPermissions =
        registerForActivityResult(ActivityResultContracts.RequestMultiplePermissions()) { granted ->
            if (granted[Manifest.permission.CAMERA] == true || hasPermission(Manifest.permission.CAMERA)) startCore()
            else control.text = "Saarthi needs the camera.\nAllow it in Settings."
        }

    private fun hasPermission(p: String) = ContextCompat.checkSelfPermission(this, p) == PackageManager.PERMISSION_GRANTED

    // Tap = brief; hold = talk (PRD 11: one obvious control).
    private var holding = false
    private val startHold = Runnable { holding = true; core.onHoldStart() }

    @SuppressLint("ClickableViewAccessibility")
    private fun onTouch(v: View, e: MotionEvent): Boolean {
        when (e.actionMasked) {
            MotionEvent.ACTION_DOWN -> {
                holding = false
                main.postDelayed(startHold, HOLD_MS)
            }
            MotionEvent.ACTION_UP -> {
                main.removeCallbacks(startHold)
                if (holding) core.onHoldEnd() else v.performClick()
                holding = false
            }
            MotionEvent.ACTION_CANCEL -> {
                main.removeCallbacks(startHold)
                if (holding) core.onHoldEnd()
                holding = false
            }
        }
        return true
    }

    /**
     * The dev camera view (D13); the demo build has none. Dev heat runs comparable with the demo build:
     * `am start ... --ez view false` (D59).
     */
    private val cameraView by lazy { BuildConfig.CAMERA_VIEW && intent.getBooleanExtra("view", true) }

    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)
        window.addFlags(WindowManager.LayoutParams.FLAG_KEEP_SCREEN_ON)
        // Dev comparisons: `am start ... -e detector lite2` (D15).
        val model = if (intent.getStringExtra("detector") == "lite2") FastDetector.MODEL_LITE2 else FastDetector.MODEL
        core = SaarthiCore(applicationContext, model)
        setContentView(layout())
        core.onStatus = { status.text = it }
        core.onBrief = { control.text = if (cameraView) "Said: $it" else it }
        core.onSos = ::showSos
        core.onOnline = { on -> onlineMark.visibility = if (on) View.VISIBLE else View.GONE }
        DevHooks.install(this, core)
        // SMS and location serve only the safety SOS (D47); Saarthi starts without them.
        val needed = listOf(
            Manifest.permission.CAMERA, Manifest.permission.RECORD_AUDIO, Manifest.permission.SEND_SMS,
            Manifest.permission.ACCESS_FINE_LOCATION, Manifest.permission.ACCESS_COARSE_LOCATION,
        ).filterNot(::hasPermission)
        if (needed.isEmpty()) startCore() else askPermissions.launch(needed.toTypedArray())
    }

    private fun startCore() {
        core.start(this, preview?.surfaceProvider)
        if (boxes != null) main.post(overlayTick)
    }

    private val overlayTick = object : Runnable {
        override fun run() {
            boxes?.items = core.overlayItems()
            main.postDelayed(this, OVERLAY_PERIOD_MS)
        }
    }

    override fun onDestroy() {
        main.removeCallbacks(overlayTick)
        DevHooks.uninstall(this)
        core.shutdown()
        super.onDestroy()
    }

    /** The SOS screen (D47): everything else hidden, one big line, one big button. Null = back to normal. */
    private fun showSos(s: SaarthiCore.SosScreen?) {
        if (s == null) { sosView.visibility = View.GONE; return }
        sosTitle.text = s.title
        sosDetail.text = s.detail
        sosButton.text = s.button
        sosView.contentDescription = "${s.title}. ${s.detail}"
        sosView.visibility = View.VISIBLE
    }

    private fun layout() = FrameLayout(this).apply {
        addView(normalLayout(), FrameLayout.LayoutParams(FrameLayout.LayoutParams.MATCH_PARENT, FrameLayout.LayoutParams.MATCH_PARENT))
        sosView = LinearLayout(context).apply {
            orientation = LinearLayout.VERTICAL
            setBackgroundColor(Color.rgb(176, 0, 32))
            gravity = Gravity.CENTER
            visibility = View.GONE
            isClickable = true
            setPadding(48, 48, 48, 48)
            setOnClickListener { core.cancelSos() }
            sosTitle = TextView(context).apply { textSize = 44f; setTextColor(Color.WHITE); gravity = Gravity.CENTER }
            sosDetail = TextView(context).apply { textSize = 22f; setTextColor(Color.WHITE); gravity = Gravity.CENTER; setPadding(0, 24, 0, 48) }
            sosButton = Button(context).apply {
                textSize = 28f
                setTextColor(Color.rgb(176, 0, 32))
                setBackgroundColor(Color.WHITE)
                setOnClickListener { core.cancelSos() }
            }
            addView(sosTitle)
            addView(sosDetail)
            addView(sosButton, LinearLayout.LayoutParams(LinearLayout.LayoutParams.MATCH_PARENT, 360))
        }
        // Online mode (D54): a quiet marker for the presenter; the user hears a tone and feels a vibration.
        onlineMark = TextView(context).apply {
            text = "ONLINE"
            textSize = 16f
            setTextColor(Color.BLACK)
            setBackgroundColor(Color.rgb(0, 200, 170))
            setPadding(24, 8, 24, 8)
            visibility = View.GONE
            importantForAccessibility = View.IMPORTANT_FOR_ACCESSIBILITY_NO
        }
        addView(onlineMark, FrameLayout.LayoutParams(FrameLayout.LayoutParams.WRAP_CONTENT, FrameLayout.LayoutParams.WRAP_CONTENT, Gravity.TOP or Gravity.END))
        addView(sosView, FrameLayout.LayoutParams(FrameLayout.LayoutParams.MATCH_PARENT, FrameLayout.LayoutParams.MATCH_PARENT))
    }

    private fun normalLayout() = LinearLayout(this).apply {
        orientation = LinearLayout.VERTICAL
        setBackgroundColor(Color.BLACK)
        isClickable = true
        contentDescription = "Saarthi. Tap for a brief of the table. Hold to ask a question."
        setOnClickListener { core.onTap() }
        setOnTouchListener(::onTouch)
        if (cameraView) {
            val box = FrameLayout(context).apply { importantForAccessibility = View.IMPORTANT_FOR_ACCESSIBILITY_NO }
            val previewView = PreviewView(context).apply { scaleType = PreviewView.ScaleType.FIT_CENTER }
            val trackBoxes = TrackOverlayView(context)
            preview = previewView
            boxes = trackBoxes
            box.addView(previewView, FrameLayout.LayoutParams(FrameLayout.LayoutParams.MATCH_PARENT, FrameLayout.LayoutParams.MATCH_PARENT))
            box.addView(trackBoxes, FrameLayout.LayoutParams(FrameLayout.LayoutParams.MATCH_PARENT, FrameLayout.LayoutParams.MATCH_PARENT))
            // The camera view takes the same tap and hold.
            box.setOnClickListener { core.onTap() }
            box.setOnTouchListener(::onTouch)
            addView(box, LinearLayout.LayoutParams(LinearLayout.LayoutParams.MATCH_PARENT, 0, 3f))
        }
        control = TextView(context).apply {
            text = "Saarthi\n\nTap for a brief · hold to ask"
            textSize = if (cameraView) 22f else 30f
            setTextColor(Color.WHITE)
            gravity = Gravity.CENTER
            setPadding(48, 24, 48, 24)
            importantForAccessibility = View.IMPORTANT_FOR_ACCESSIBILITY_NO
        }
        status = TextView(context).apply {
            textSize = 14f
            setTextColor(Color.LTGRAY)
            gravity = Gravity.CENTER
            setPadding(24, 0, 24, 32)
            importantForAccessibility = View.IMPORTANT_FOR_ACCESSIBILITY_NO
        }
        addView(control, LinearLayout.LayoutParams(LinearLayout.LayoutParams.MATCH_PARENT, 0, if (cameraView) 1f else 3f))
        addView(status, LinearLayout.LayoutParams(LinearLayout.LayoutParams.MATCH_PARENT, LinearLayout.LayoutParams.WRAP_CONTENT))
    }

    private companion object {
        const val OVERLAY_PERIOD_MS = 100L
        const val HOLD_MS = 350L
    }
}
