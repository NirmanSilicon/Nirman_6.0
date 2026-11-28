package ai.saarthi.app.bench

import ai.saarthi.app.perf.LatencyStats
import ai.saarthi.app.speech.PushToTalk
import ai.saarthi.app.speech.WhisperEngine
import ai.saarthi.app.speech.WordErrorRate
import android.Manifest
import android.annotation.SuppressLint
import android.content.Intent
import android.content.pm.PackageManager
import android.graphics.Color
import android.os.Bundle
import android.os.SystemClock
import android.speech.RecognitionListener
import android.speech.RecognizerIntent
import android.speech.SpeechRecognizer
import android.view.Gravity
import android.view.MotionEvent
import android.view.WindowManager
import android.widget.LinearLayout
import android.widget.TextView
import androidx.activity.ComponentActivity
import androidx.activity.result.contract.ActivityResultContracts
import androidx.core.content.ContextCompat
import org.json.JSONArray
import org.json.JSONObject
import java.io.File
import java.util.concurrent.Executors

/**
 * Dev-only speech-recognition test (D17): the team says 20 phrases (the last 8 over background
 * noise) by pressing and holding; the same audio goes to Whisper tiny.en and base.en, so the two are
 * compared on identical input. Then, if Android offers on-device recognition, up to 5 phrases are
 * tried with it live. Saves one JSON (word error rate, latency) and each utterance as a WAV
 * (developer flag: the team's own voice, kept on the phone and the laptop, never in git).
 *
 *   adb shell am start -n ai.saarthi.app.dev/ai.saarthi.app.bench.SttBenchActivity
 */
class SttBenchActivity : ComponentActivity() {

    private val phrases = listOf(
        "What's around me", "Where is my bottle", "Who is on my right", "Find the cup",
        "How many people are here", "Is this my watch", "What is in front of me", "Repeat that",
        "Stop", "Where did my mug go", "Is the apple real", "Guide my hand to the bottle",
        // 13–20 with background noise
        "What's around me", "Where is my phone", "Who is on my left", "Find the book",
        "Is this my watch", "Say that again", "Where is the laptop", "What changed on the table",
    )
    private val noisyFrom = 12

    private lateinit var prompt: TextView
    private lateinit var log: TextView
    private lateinit var hold: TextView
    private val worker = Executors.newSingleThreadExecutor()
    private val mic = PushToTalk(maxMs = 8_000)
    private var engines: List<WhisperEngine> = emptyList()
    private var index = 0
    private val results = JSONArray()
    private val report by lazy { BenchReport(this, "bench_stt") }
    private val dir by lazy { File(getExternalFilesDir(null), "stt") }
    private val wavDir by lazy { File(getExternalFilesDir(null), "stt_bench").apply { mkdirs() } }
    private var systemPhase = false
    private var systemIndex = 0
    private val systemResults = JSONArray()

    private val askMic = registerForActivityResult(ActivityResultContracts.RequestPermission()) { ok ->
        if (ok) loadEngines() else prompt.text = "Microphone permission refused."
    }

    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)
        window.addFlags(WindowManager.LayoutParams.FLAG_KEEP_SCREEN_ON)
        setContentView(layout())
        if (ContextCompat.checkSelfPermission(this, Manifest.permission.RECORD_AUDIO) == PackageManager.PERMISSION_GRANTED) loadEngines()
        else askMic.launch(Manifest.permission.RECORD_AUDIO)
    }

    private fun loadEngines() {
        prompt.text = "Loading Whisper tiny.en and base.en…"
        worker.execute {
            val loaded = listOfNotNull(WhisperEngine.load(dir, "tiny.en"), WhisperEngine.load(dir, "base.en"))
            engines = loaded
            report.put("engines", JSONObject().apply { loaded.forEach { put(it.name, JSONObject().put("loadMs", it.loadMs)) } })
            val onDevice = SpeechRecognizer.isOnDeviceRecognitionAvailable(this)
            report.put("systemRecognizer", JSONObject()
                .put("recognitionAvailable", SpeechRecognizer.isRecognitionAvailable(this))
                .put("onDeviceAvailable", onDevice))
            runOnUiThread {
                if (loaded.isEmpty()) prompt.text = "No Whisper model found in $dir.\nRun tools/push_stt_models.sh"
                else { append("Loaded: ${loaded.joinToString { "${it.name} in ${it.loadMs} ms" }}. On-device system recogniser: $onDevice"); showPrompt() }
            }
        }
    }

    private fun showPrompt() {
        if (index >= phrases.size) { startSystemPhase(); return }
        val noisy = index >= noisyFrom
        prompt.text = "${index + 1} / ${phrases.size}${if (noisy) "  ·  PLAY BACKGROUND NOISE NOW" else ""}\n\n“${phrases[index]}”"
        prompt.setTextColor(if (noisy) Color.rgb(255, 179, 0) else Color.WHITE)
        hold.text = "HOLD TO SPEAK"
    }

    @SuppressLint("ClickableViewAccessibility")
    private fun onHold(e: MotionEvent): Boolean {
        if (engines.isEmpty() || index >= phrases.size || systemPhase) {
            if (systemPhase && e.action == MotionEvent.ACTION_UP) listenSystem()
            return true
        }
        when (e.action) {
            MotionEvent.ACTION_DOWN -> if (mic.start()) { hold.text = "LISTENING… release when done"; hold.setBackgroundColor(Color.rgb(26, 127, 75)) }
            MotionEvent.ACTION_UP, MotionEvent.ACTION_CANCEL -> {
                hold.setBackgroundColor(Color.DKGRAY)
                val audio = mic.stop()
                val i = index
                index++
                hold.text = "transcribing…"
                worker.execute { transcribe(i, audio); runOnUiThread { showPrompt() } }
            }
        }
        return true
    }

    private fun transcribe(i: Int, audio: FloatArray) {
        val expected = phrases[i]
        val wav = File(wavDir, "phrase_%02d.wav".format(i + 1))
        Wav.write(wav, audio, WhisperEngine.SAMPLE_RATE)
        val row = JSONObject().put("n", i + 1).put("expected", expected).put("noisy", i >= noisyFrom)
            .put("audioS", BenchReport.round(audio.size / WhisperEngine.SAMPLE_RATE.toDouble())).put("wav", wav.name)
        val lines = StringBuilder("${i + 1}. “$expected”")
        for (eng in engines) {
            val t0 = SystemClock.elapsedRealtimeNanos()
            val text = eng.transcribe(audio)
            val ms = (SystemClock.elapsedRealtimeNanos() - t0) / 1e6
            val wer = WordErrorRate.rate(expected, text)
            row.put(eng.name, JSONObject().put("text", text).put("ms", BenchReport.round(ms)).put("wer", BenchReport.round(wer)))
            lines.append("\n   ${eng.name}: “$text”  ${ms.toInt()} ms  WER ${(wer * 100).toInt()}%")
        }
        results.put(row)
        runOnUiThread { append(lines.toString()) }
    }

    // ---- (b) the system's on-device recogniser, live, if the phone has one ----

    private var recognizer: SpeechRecognizer? = null
    private var systemStartNs = 0L

    private fun startSystemPhase() {
        systemPhase = true
        if (!SpeechRecognizer.isOnDeviceRecognitionAvailable(this) || systemIndex >= 5) { finishRun(); return }
        prompt.setTextColor(Color.WHITE)
        prompt.text = "System recogniser ${systemIndex + 1} / 5 (quiet)\nTap, then say:\n\n“${phrases[systemIndex]}”"
        hold.text = "TAP, THEN SPEAK"
    }

    private fun listenSystem() {
        val r = recognizer ?: SpeechRecognizer.createOnDeviceSpeechRecognizer(this).also { recognizer = it }
        r.setRecognitionListener(object : RecognitionListener {
            override fun onResults(b: Bundle) {
                val text = b.getStringArrayList(SpeechRecognizer.RESULTS_RECOGNITION)?.firstOrNull() ?: ""
                record(text, null)
            }
            override fun onError(error: Int) = record("", error)
            override fun onReadyForSpeech(p: Bundle?) { hold.text = "LISTENING…" }
            override fun onBeginningOfSpeech() {}
            override fun onRmsChanged(v: Float) {}
            override fun onBufferReceived(b: ByteArray?) {}
            override fun onEndOfSpeech() { systemStartNs = SystemClock.elapsedRealtimeNanos() }
            override fun onPartialResults(b: Bundle?) {}
            override fun onEvent(t: Int, b: Bundle?) {}
        })
        systemStartNs = 0L
        r.startListening(Intent(RecognizerIntent.ACTION_RECOGNIZE_SPEECH)
            .putExtra(RecognizerIntent.EXTRA_LANGUAGE_MODEL, RecognizerIntent.LANGUAGE_MODEL_FREE_FORM)
            .putExtra(RecognizerIntent.EXTRA_LANGUAGE, "en-IN"))
    }

    private fun record(text: String, error: Int?) {
        val expected = phrases[systemIndex]
        val afterSpeechMs = if (systemStartNs > 0) (SystemClock.elapsedRealtimeNanos() - systemStartNs) / 1e6 else null
        val wer = WordErrorRate.rate(expected, text)
        systemResults.put(JSONObject().put("expected", expected).put("text", text).put("error", error ?: JSONObject.NULL)
            .put("endOfSpeechToResultMs", afterSpeechMs?.let { BenchReport.round(it) } ?: JSONObject.NULL).put("wer", BenchReport.round(wer)))
        append("system: “$text” ${error?.let { "error $it" } ?: ""} WER ${(wer * 100).toInt()}%")
        systemIndex++
        startSystemPhase()
    }

    private fun finishRun() {
        fun summary(name: String, noisy: Boolean?): JSONObject {
            val rows = (0 until results.length()).map { results.getJSONObject(it) }
                .filter { noisy == null || it.getBoolean("noisy") == noisy }.filter { it.has(name) }
            val refWords = rows.sumOf { WordErrorRate.words(it.getString("expected")).size }
            val errors = rows.sumOf { WordErrorRate.errors(it.getString("expected"), it.getJSONObject(name).getString("text")) }
            val exact = rows.count { it.getJSONObject(name).getDouble("wer") == 0.0 }
            return JSONObject().put("phrases", rows.size).put("wer", if (refWords == 0) 0.0 else BenchReport.round(errors.toDouble() / refWords))
                .put("exactPhrases", exact)
                .put("ms", BenchReport.toJson(LatencyStats.summarize(rows.map { it.getJSONObject(name).getDouble("ms") })))
        }
        report.put("phrases", JSONObject().put("rows", results))
        report.put("summary", JSONObject().apply {
            for (e in engines) put(e.name, JSONObject().put("all", summary(e.name, null)).put("quiet", summary(e.name, false)).put("noisy", summary(e.name, true)))
        })
        report.put("systemOnDevice", JSONObject().put("rows", systemResults))
        val file = report.save()
        prompt.text = "DONE. Saved ${file.name}"
        hold.text = ""
        append(report.json.optJSONObject("summary")?.toString(2) ?: "")
    }

    private fun append(s: String) { log.append(s + "\n\n") }

    @SuppressLint("ClickableViewAccessibility")
    private fun layout() = LinearLayout(this).apply {
        orientation = LinearLayout.VERTICAL
        setBackgroundColor(Color.BLACK)
        addView(TextView(context).apply {
            text = "DEV · SPEECH TEST · not part of the demo build"
            setBackgroundColor(Color.YELLOW); setTextColor(Color.BLACK); gravity = Gravity.CENTER; setPadding(16, 16, 16, 16)
        })
        prompt = TextView(context).apply { textSize = 28f; setTextColor(Color.WHITE); gravity = Gravity.CENTER; setPadding(32, 32, 32, 32) }
        addView(prompt, LinearLayout.LayoutParams(-1, 0, 2f))
        log = TextView(context).apply { textSize = 12f; setTextColor(Color.LTGRAY); setPadding(24, 0, 24, 0) }
        addView(android.widget.ScrollView(context).apply { addView(log) }, LinearLayout.LayoutParams(-1, 0, 2f))
        hold = TextView(context).apply {
            textSize = 26f; setTextColor(Color.WHITE); setBackgroundColor(Color.DKGRAY); gravity = Gravity.CENTER
            setOnTouchListener { _, e -> onHold(e) }
        }
        addView(hold, LinearLayout.LayoutParams(-1, 0, 1.2f))
    }

    override fun onDestroy() {
        recognizer?.destroy()
        worker.execute { engines.forEach { it.release() } }
        worker.shutdown()
        super.onDestroy()
    }
}
