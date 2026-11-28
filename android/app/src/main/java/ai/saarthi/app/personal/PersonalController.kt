package ai.saarthi.app.personal

import ai.saarthi.app.hands.HandTracker
import android.graphics.Bitmap
import android.util.Log
import org.json.JSONObject
import java.io.File

/**
 * Runs the personal-object features on the phone (PRD 5.0.1 item 3, D49):
 * - **teach**: "this is my watch" / "this is the other watch" → for [TEACH_MS] the region around the
 *   hand is embedded every [EVERY_MS] (the user turns it: many views), then kept as vectors;
 * - **ask**: "is this my watch?" → a few views now, judged by the gap ([PersonalObjects]);
 * - **what's this**: the region under the fingertip; if it is a taught object, say so; else the
 *   caller's touch-and-point answer;
 * - **wrong pick-up**: once both are taught, while a hand is in view (not during guidance), a view every
 *   [WATCH_EVERY_MS]; the look-alike on [WRONG_IN_A_ROW] views in a row → "That's not your watch." once
 *   per [WRONG_GAP_MS]. Nothing is said for the right one unless asked (team input).
 * Frames arrive on the camera thread; embeddings return on the embedder's thread.
 */
class PersonalController(
    private val store: File,
    private val embedder: Embedder,
    private val say: (String) -> Unit,
    private val publish: (JSONObject) -> Unit,
) {
    val objects = PersonalObjects()
    private val lock = Any()

    private enum class Mode { IDLE, TEACH, ASK, WHAT }

    private var mode = Mode.IDLE
    private var name = "object"
    private var mine = true
    private var untilMs = 0L
    private var lastOfferMs = 0L
    private val views = ArrayList<FloatArray>()
    private val judged = ArrayList<PersonalObjects.Judgement>()
    private var fallback: (() -> String)? = null
    private var wrongStreak = 0
    private var lastWrongSaidMs = Long.MIN_VALUE / 2
    private var embedMs = 0.0

    init {
        try { if (store.isFile) objects.load(store.readText()) } catch (t: Throwable) { Log.e(TAG, "could not read ${store.name}", t) }
    }

    /** A request in progress: hands should run at full rate. */
    val active: Boolean get() = synchronized(lock) { mode != Mode.IDLE }

    fun teach(spoken: String, isMine: Boolean, nowMs: Long) = synchronized(lock) {
        mode = Mode.TEACH; name = spoken; mine = isMine; untilMs = nowMs + TEACH_MS + START_MS; views.clear()
        say("Turn it slowly in your hand.")
    }

    fun ask(spoken: String, nowMs: Long) = synchronized(lock) {
        val n = objects.names.firstOrNull() ?: spoken
        when {
            !objects.has(true) -> { say("I haven't learned your $spoken yet. Hold it and say: this is my $spoken."); return }
            !objects.has(false) -> { say("I need to see the other $n too. Hold it and say: this is the other $n."); return }
        }
        mode = Mode.ASK; name = n; untilMs = nowMs + ASK_MS; judged.clear()
    }

    /** "What's this?": a taught object under the finger, else [touchAnswer] (computed by the caller). */
    fun whatIsThis(nowMs: Long, touchAnswer: () -> String) = synchronized(lock) {
        if (!objects.has(true) && !objects.has(false)) { say(touchAnswer()); return }
        mode = Mode.WHAT; untilMs = nowMs + WHAT_MS; judged.clear(); fallback = touchAnswer
        name = objects.names.firstOrNull() ?: "object"
    }

    /** Camera thread, every frame: [hand] = the user's hand from a hand run at most ~200 ms old, or null. */
    fun onFrame(frame: Bitmap, hand: HandTracker.Hand?, nowMs: Long, guiding: Boolean) {
        synchronized(lock) {
            if (mode != Mode.IDLE && nowMs > untilMs) { finish(); return }
            if (hand == null) {
                wrongStreak = 0
                return
            }
            val every = if (mode == Mode.IDLE) WATCH_EVERY_MS else EVERY_MS
            if (nowMs - lastOfferMs < every) return
            when (mode) {
                Mode.IDLE -> if (!objects.ready || guiding) return
                Mode.TEACH -> if (nowMs < untilMs - TEACH_MS) return   // give the user a moment to start turning it
                else -> {}
            }
            val region = if (mode == Mode.WHAT) HandRegion.underFinger(hand.landmarks) else HandRegion.held(hand.landmarks)
            val m = mode
            if (embedder.offer(frame, region) { r -> onVector(m, r) }) lastOfferMs = nowMs
        }
    }

    private fun onVector(m: Mode, r: Embedder.Result) = synchronized(lock) {
        embedMs = r.ms
        if (m != mode) return
        when (mode) {
            Mode.TEACH -> views += r.vector
            Mode.ASK -> { judged += objects.judge(r.vector); if (judged.size >= ASK_VIEWS) finish() }
            Mode.WHAT -> { judged += objects.judge(r.vector); finish() }
            Mode.IDLE -> watch(objects.judge(r.vector))
        }
    }

    /** Wrong pick-up: the look-alike in the hand on several views in a row. */
    private fun watch(j: PersonalObjects.Judgement) {
        wrongStreak = if (j.decision == PersonalObjects.Decision.NOT_MINE) wrongStreak + 1 else 0
        val now = android.os.SystemClock.elapsedRealtime()
        if (wrongStreak >= WRONG_IN_A_ROW && now - lastWrongSaidMs >= WRONG_GAP_MS) {
            wrongStreak = 0
            lastWrongSaidMs = now
            val text = "That's not your ${j.name ?: "object"}."
            say(text)
            publish(msg("wrong_pickup", j).put("said", text))
        }
    }

    private fun finish() {
        val m = mode
        mode = Mode.IDLE
        when (m) {
            Mode.TEACH -> {
                if (views.size < MIN_TEACH_VIEWS) {
                    say("I couldn't see it in your hand. Hold it up in front of the camera and try again.")
                    publish(JSONObject().put("event", "teach").put("name", name).put("mine", mine).put("views", views.size).put("ok", false))
                    return
                }
                objects.teach(name, mine, views.toList())
                try { store.writeText(objects.toText()) } catch (t: Throwable) { Log.e(TAG, "could not save", t) }
                val next = when {
                    mine && !objects.has(false) -> " Now hold the other $name and say: this is the other $name."
                    !mine && !objects.has(true) -> " Now hold yours and say: this is my $name."
                    else -> ""
                }
                say((if (mine) "Got it: that's your $name." else "Got it: that one is not yours.") + next)
                publish(JSONObject().put("event", "teach").put("name", name).put("mine", mine).put("views", views.size).put("ok", true)
                    .put("embedMs", round(embedMs)))
            }
            Mode.ASK -> {
                val j = summary(judged)
                val text = when (j?.decision) {
                    null -> "I can't see your hand. Hold it in front of the camera."
                    PersonalObjects.Decision.MINE -> "Yes, that's your $name."
                    PersonalObjects.Decision.NOT_MINE -> "No, that's not your $name."
                    PersonalObjects.Decision.UNSURE -> "I'm not sure. Turn it a little and ask again."
                    PersonalObjects.Decision.NONE -> "I can't see a $name in your hand."
                }
                say(text)
                publish((if (j != null) msg("ask", j) else JSONObject().put("event", "ask")).put("views", judged.size).put("said", text))
            }
            Mode.WHAT -> {
                val j = summary(judged)
                val text = when (j?.decision) {
                    PersonalObjects.Decision.MINE -> "That's your $name."
                    PersonalObjects.Decision.NOT_MINE -> "That's not your $name; it's the other one."
                    else -> fallback?.invoke() ?: "I can't tell what you're touching."
                }
                fallback = null
                say(text)
                publish((if (j != null) msg("what", j) else JSONObject().put("event", "what")).put("said", text))
            }
            Mode.IDLE -> {}
        }
    }

    /** Several views: the mean margin decides, with the same gap. */
    private fun summary(js: List<PersonalObjects.Judgement>): PersonalObjects.Judgement? {
        if (js.isEmpty()) return null
        if (js.all { it.decision == PersonalObjects.Decision.NONE }) return js.last()
        val m = js.map { it.mine }.average().toFloat()
        val o = js.map { it.other }.average().toFloat()
        val d = when {
            m - o >= objects.gap -> PersonalObjects.Decision.MINE
            o - m >= objects.gap -> PersonalObjects.Decision.NOT_MINE
            else -> PersonalObjects.Decision.UNSURE
        }
        return PersonalObjects.Judgement(d, m, o, js.last().name)
    }

    private fun msg(event: String, j: PersonalObjects.Judgement) = JSONObject().put("event", event).put("name", j.name)
        .put("decision", j.decision.name.lowercase()).put("mine", round(j.mine.toDouble())).put("other", round(j.other.toDouble()))
        .put("margin", round(j.margin.toDouble())).put("gap", round(objects.gap.toDouble())).put("embedMs", round(embedMs))

    private fun round(v: Double) = Math.round(v * 1000) / 1000.0

    companion object {
        private const val TAG = "Saarthi/personal"
        /** Turning it in the hand (team input: about 3 s). */
        const val TEACH_MS = 3_000L
        /** After "Turn it slowly in your hand.", before the first view. */
        const val START_MS = 1_200L
        const val EVERY_MS = 150L
        const val MIN_TEACH_VIEWS = 6
        const val ASK_MS = 2_000L
        const val ASK_VIEWS = 3
        const val WHAT_MS = 1_500L
        const val WATCH_EVERY_MS = 500L
        const val WRONG_IN_A_ROW = 3
        const val WRONG_GAP_MS = 30_000L
    }
}
