package ai.saarthi.app.bench

import android.Manifest
import android.content.pm.PackageManager
import android.graphics.Color
import android.os.Bundle
import android.util.Size
import android.view.Gravity
import android.view.WindowManager
import android.widget.LinearLayout
import android.widget.ScrollView
import android.widget.TextView
import androidx.activity.ComponentActivity
import androidx.activity.result.contract.ActivityResultContracts
import androidx.core.content.ContextCompat
import com.google.mediapipe.tasks.core.Delegate
import org.json.JSONObject

/**
 * Dev-only Phase 0 benchmark screen (never in the demo build). Pick a test with an intent extra:
 *
 *   adb shell am start -n ai.saarthi.app.dev/ai.saarthi.app.bench.BenchActivity -e test <name>
 *
 * Tests: step4 (default: speech, vibration, camera), camera (default vs fixed 30 fps), tts (warm
 * speech latency), detector (EfficientDet-Lite0 on CPU/GPU, and CPU vs APU via NNAPI), hands,
 * ocr, pipeline (detector + hands together; extras: minutes, det = int8_cpu|int8_gpu|fp32_cpu|
 * fp32_gpu, hands = cpu|gpu, handsMode = video|image, parallel = true|false). Each run saves one JSON file (see [BenchReport]).
 */
class BenchActivity : ComponentActivity() {

    private lateinit var body: TextView
    private lateinit var report: BenchReport
    private lateinit var test: String
    private val closers = ArrayList<() -> Unit>()

    private val askCamera =
        registerForActivityResult(ActivityResultContracts.RequestPermission()) { granted ->
            if (granted) dispatch() else {
                show("Camera permission refused.")
                report.put("error", JSONObject().put("camera", "permission refused"))
                finishRun()
            }
        }

    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)
        window.addFlags(WindowManager.LayoutParams.FLAG_KEEP_SCREEN_ON)
        setContentView(layout())
        test = intent.getStringExtra("test") ?: "step4"
        report = BenchReport(this, "bench_$test")
        show("Test: $test")
        if (ContextCompat.checkSelfPermission(this, Manifest.permission.CAMERA) ==
            PackageManager.PERMISSION_GRANTED
        ) dispatch() else askCamera.launch(Manifest.permission.CAMERA)
    }

    private fun dispatch() {
        when (test) {
            "step4" -> runStep4()
            "camera" -> runCamera()
            "tts" -> TtsWarmBench(this).also { b -> closers += { b.close() } }.run { done("tts", it) }
            "speaker" -> SpeakerBench(this) { show(it) }.also { b -> closers += { b.close() } }.run { done("speaker", it) }
            "detector" -> runDetector()
            "hands" -> HandsBench(this).let { b ->
                closers += { b.close() }
                frames("hands", b::open, b::onFrame, b::report)
            }
            "ocr" -> OcrBench(onText = { show(it) }).let { b ->
                closers += { b.close() }
                // Reading needs more pixels than detection: 1280 × 960 (largest heading = first line shown).
                frames("ocr", { JSONObject() }, b::onFrame, b::report, Size(1280, 960))
            }
            "pipeline" -> runPipeline()
            "link" -> runLink()
            else -> { show("Unknown test '$test'."); finishRun() }
        }
    }

    /** Phone → laptop round trips (extras: host, port, mode = rtt|pull). Needs link_server.py. */
    private fun runLink() {
        val host = intent.getStringExtra("host") ?: "127.0.0.1"
        val port = intent.getStringExtra("port")?.toIntOrNull() ?: 8765
        val mode = intent.getStringExtra("mode") ?: "rtt"
        show(if (mode == "pull") "Link: pinging $host:$port. Pull the USB cable within the next minute." else "Link: round trips to $host:$port…")
        Thread {
            val result = LinkBench(host, port, mode).run()
            runOnUiThread { done("link", result) }
        }.start()
    }

    private fun runStep4() {
        show("1/3 Speech: listen for one sentence…")
        val speech = SpeechCheck(this).also { closers += { it.close() } }
        speech.run { result ->
            report.put("speech", result)
            show("Speech: $result")
            show("2/3 Vibration: three short pulses now.")
            val vib = VibrationCheck(this).run()
            report.put("vibration", vib)
            show("Vibration: $vib")
            show("3/3 Camera: counting frames for 10 s…")
            CameraCheck(this).also { c -> closers += { c.close() } }.run { done("camera", it) }
        }
    }

    private fun runCamera() {
        show("Camera, default exposure, 10 s…")
        CameraCheck(this).also { c -> closers += { c.close() } }.run { first ->
            report.put("cameraDefault", first)
            show("Default: $first")
            show("Camera, fixed 30 fps exposure range, 10 s…")
            CameraCheck(this, fixedFps = 30).also { c -> closers += { c.close() } }.run { done("cameraFixed30", it) }
        }
    }

    private fun runDetector() {
        val det = DetectorBench(this)
        val nn = NnapiCheck(this)
        closers += { det.close(); nn.close() }
        var detMore = true
        var nnMore = true
        frames(
            "detector",
            open = { JSONObject().put("mediapipe", det.open()).put("nnapi", nn.open()) },
            step = { f ->
                if (detMore) detMore = det.onFrame(f)
                if (nnMore) nnMore = nn.onFrame(f)
                detMore || nnMore
            },
            finish = { JSONObject().put("mediapipe", det.report()).put("nnapi", nn.report()) },
        )
    }

    private fun runPipeline() {
        val minutes = intent.getStringExtra("minutes")?.toDoubleOrNull() ?: 1.0
        val detName = intent.getStringExtra("det") ?: "int8_cpu"
        val handsName = intent.getStringExtra("hands") ?: "cpu"
        val model = if (detName.startsWith("fp32")) DetectorBench.FP32 else DetectorBench.INT8
        val detDelegate = if (detName.endsWith("gpu")) Delegate.GPU else Delegate.CPU
        val handsDelegate = if (handsName == "gpu") Delegate.GPU else Delegate.CPU
        val video = (intent.getStringExtra("handsMode") ?: "video") == "video"
        val parallel = intent.getStringExtra("parallel") == "true"
        val b = PipelineBench(this, minutes, model, detDelegate, handsDelegate, video, parallel, report)
        closers += { b.close() }
        show("Pipeline for $minutes min: detector $detName + hands $handsName. Keep the phone on the table.")
        frames("pipeline", b::open, b::onFrame, b::result)
    }

    /** Runs a frame-based test: [open] on the camera thread at the first frame, then [step] per frame. */
    private fun frames(
        name: String,
        open: () -> JSONObject,
        step: (FrameLoop.Frame) -> Boolean,
        finish: () -> JSONObject,
        size: Size = Size(640, 480),
    ) {
        show("$name: starting camera and models…")
        val loop = FrameLoop(this, size).also { l -> closers += { l.close() } }
        var opened = false
        loop.run(
            onFrame = { f ->
                if (!opened) {
                    opened = true
                    val init = try { open() } catch (e: Throwable) { JSONObject().put("error", "${e.javaClass.simpleName}: ${e.message}") }
                    report.put("${name}Init", init)
                    runOnUiThread { show("Init: $init") }
                    !init.has("error")
                } else step(f)
            },
            onEnd = { stats ->
                report.put("frameLoop", stats)
                done(name, try { finish() } catch (e: Throwable) { JSONObject().put("error", e.message) })
            },
        )
    }

    private fun done(section: String, result: JSONObject) {
        report.put(section, result)
        show("$section: $result")
        finishRun()
    }

    private fun finishRun() {
        val file = report.save()
        show("\nDONE. Saved:\n${file.absolutePath}")
    }

    override fun onDestroy() {
        closers.forEach { runCatching(it) }
        super.onDestroy()
    }

    private fun show(line: String) {
        runOnUiThread { body.append(line + "\n\n") }
    }

    private fun layout(): ScrollView {
        val header = TextView(this).apply {
            text = "DEV · BENCHMARK\nnot part of the demo build"
            textSize = 22f
            setTextColor(Color.BLACK)
            setBackgroundColor(Color.YELLOW)
            gravity = Gravity.CENTER
            setPadding(24, 24, 24, 24)
        }
        body = TextView(this).apply {
            textSize = 14f
            setTextColor(Color.WHITE)
            setPadding(24, 24, 24, 24)
        }
        val column = LinearLayout(this).apply {
            orientation = LinearLayout.VERTICAL
            setBackgroundColor(Color.BLACK)
            addView(header)
            addView(body)
        }
        return ScrollView(this).apply { addView(column) }
    }
}
