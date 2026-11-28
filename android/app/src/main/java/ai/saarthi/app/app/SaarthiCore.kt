package ai.saarthi.app.app

import ai.saarthi.app.BuildConfig
import ai.saarthi.app.beliefmap.BeliefMap
import ai.saarthi.app.beliefmap.ChangeDetector
import ai.saarthi.app.brief.BriefComposer
import ai.saarthi.app.capture.CameraSource
import ai.saarthi.app.capture.Frame
import ai.saarthi.app.feedback.Earcon
import ai.saarthi.app.feedback.EarconPlayer
import ai.saarthi.app.health.CameraHealth
import ai.saarthi.app.health.CameraHealthMonitor
import ai.saarthi.app.health.ThermalWatch
import ai.saarthi.app.perf.WorkPolicy
import ai.saarthi.app.intent.Answerer
import ai.saarthi.app.intent.Intent
import ai.saarthi.app.intent.NearMiss
import ai.saarthi.app.intent.IntentInterpreter
import ai.saarthi.app.speech.VoiceInput
import java.io.File
import ai.saarthi.app.link.FeedLink
import ai.saarthi.app.ocr.TextReader
import android.graphics.Bitmap
import android.util.Base64
import ai.saarthi.app.online.CloudCheck
import java.util.concurrent.Executors
import ai.saarthi.app.link.FeedMessages
import ai.saarthi.app.geometry.Box
import ai.saarthi.app.geometry.Vec2
import ai.saarthi.app.hands.HandTracker
import ai.saarthi.app.feedback.Haptics
import ai.saarthi.app.guidance.Guidance
import ai.saarthi.app.guidance.Step
import ai.saarthi.app.worldmap.Seen
import ai.saarthi.app.orientation.Orientation
import ai.saarthi.app.orientation.Pose
import ai.saarthi.app.system2.Cue
import ai.saarthi.app.system2.Gray
import ai.saarthi.app.system2.RealitySpeech
import ai.saarthi.app.system2.TorchCheck
import ai.saarthi.app.system2.Verdict
import ai.saarthi.app.perception.FastDetector
import ai.saarthi.app.perception.Perception
import ai.saarthi.app.perception.SpokenNames
import ai.saarthi.app.personal.Embedder
import ai.saarthi.app.personal.PersonalController
import ai.saarthi.app.personal.TouchAsk
import ai.saarthi.app.safety.Sos
import ai.saarthi.app.perf.LatencyStats
import ai.saarthi.app.record.SessionRecorder
import ai.saarthi.app.speech.Speaker
import ai.saarthi.app.speech.SttAssets
import ai.saarthi.app.table.CameraModel
import ai.saarthi.app.table.TableGeometry
import ai.saarthi.app.table.TableHeight
import ai.saarthi.app.worldmap.Relations
import ai.saarthi.app.worldmap.WorldObject
import android.content.Context
import android.os.Build
import android.os.Handler
import android.os.Looper
import android.os.SystemClock
import androidx.camera.core.Preview
import androidx.lifecycle.LifecycleOwner
import org.json.JSONObject
import java.util.concurrent.ConcurrentHashMap

/**
 * Wires the phone tiers together: camera → perception → brief → speech, and publishes every event
 * once to the session file and the laptop link (feed v1, `shared/feed/v1/`). Owns no logic of its
 * own beyond wiring; each feature lives in its own package. Created by [MainActivity].
 */
class SaarthiCore(private val context: Context, private val detectorModel: String = FastDetector.MODEL) {

    val recorder = SessionRecorder(context, BuildConfig.FLAVOR)
    private val camera = CameraSource(context)
    private val composer = BriefComposer()
    private val orientation = Orientation(context)
    private val cameraModel = CameraModel.fromCamera2(context)
    private val hands = HandTracker(context)
    private val perception = Perception(
        context, detectorModel, orientation.takeIf { it.available }, cameraModel, composer::whyNotStatable, ::recentHandBoxes,
    )
    private val main = Handler(Looper.getMainLooper())
    private val earcons = EarconPlayer()
    private val speaker = Speaker(context)
    private val link = FeedLink()
    private val tapToSpeak = ConcurrentHashMap<String, Double>()
    private val answerer = Answerer(composer)
    private val sttDir = File(context.getExternalFilesDir(null), "stt")
    private val voice = VoiceInput(sttDir, SPEECH_MODEL) { SttAssets.install(context, sttDir, SPEECH_MODEL) }
    @Volatile private var lastSaid: String? = null

    // The belief map is told on the main thread and checked on the detector thread.
    private val beliefLock = Any()
    private val beliefs = BeliefMap()
    private val changes = ChangeDetector()
    /** My watch, and "what's this?" (Phase 4.5 item 3, D49). */
    private val embedder = Embedder(context)
    private val personal = PersonalController(
        File(context.getExternalFilesDir(null), "personal_objects.txt"), embedder,
        say = { text -> main.post { speakLine(text) } },
        publish = { m -> publish(FeedMessages.message("personal").also { out -> m.keys().forEach { k -> out.put(k, m.get(k)) } }) },
    )

    /** Stop the wrong reach (Phase 4.5, D46): hand thread only. */
    private val reachWatch = ai.saarthi.app.reach.ReachWatch(cameraModel)
    /** Something is watched (a stale or contradicted believed spot): hands run at full rate. */
    @Volatile private var watching = false

    // Detector run latencies for the current stats window; touched only on the detector thread
    // and swapped out under the lock by the stats tick.
    private val detLock = Any()
    private var detMs = ArrayList<Double>()
    private var handMs = ArrayList<Double>()
    private var s2Ms = ArrayList<Double>()
    private var grayMs = ArrayList<Double>()

    /** Called on the main thread with a short status for the screen. */
    var onStatus: (String) -> Unit = {}

    /** Called on the main thread with the text of each brief as it is spoken. */
    var onBrief: (String) -> Unit = {}

    /** Safety SOS screen (D47), main thread: null = normal; else the big line, the small line and the button's label. */
    var onSos: (SosScreen?) -> Unit = {}

    class SosScreen(val title: String, val detail: String, val button: String)

    init {
        publish(hello())
        perception.error?.let { recorder.record("error", JSONObject().put("detector", it)) }
        speaker.onTiming = { t ->
            val tapToSpeakMs = tapToSpeak.remove(t.id)
            publish(FeedMessages.message("speech")
                .put("utterance", t.id)
                .put("path", t.path.name)
                .put("speakToFirstAudioMs", t.toFirstAudioMs?.let { FeedMessages.round(it, 1) } ?: JSONObject.NULL)
                // Tap → first synthesised audio chunk: the PRD's decision → speech budget (300 ms).
                .put("tapToFirstAudioMs", if (tapToSpeakMs != null && t.toFirstAudioMs != null) FeedMessages.round(tapToSpeakMs + t.toFirstAudioMs, 1) else JSONObject.NULL)
                .put("interrupted", t.interrupted)
                .put("speakerInitMs", speaker.initMs))
        }
        perception.onSnapshot = { snap ->
            val run = snap.run!!
            val brief = composer.compose(snap.scene(), snap.atMs, knownIds(snap, snap.atMs))
            prepareBrief(brief.text, snap.atMs)
            synchronized(detLock) { detMs += run.latencyMs; s2Ms += snap.system2Ms; if (snap.grayMs > 0) grayMs += snap.grayMs }
            val msg = FeedMessages.perception(snap, brief, cameraModel)
            checkBeliefs(snap)?.let { msg.put("belief", it) }
            publish(msg)
            // System 2's evidence, every run while anything is assessed, and once more when that ends.
            checkReality(snap)
            val plane = perception.lastPlane
            if (snap.reality.isNotEmpty() || plane != null || system2Shown) publish(FeedMessages.system2(snap, perception.ledger, plane))
            system2Shown = snap.reality.isNotEmpty() || plane != null
        }
        hands.onResult = ::onHands
        link.helloMessage = { hello().toString() }
        link.onState = ::onLinkState
        link.onMessage = ::onLaptopMessage
    }

    private var system2Shown = false  // detector thread only

    private fun hello() = FeedMessages.hello(Build.MODEL, BuildConfig.FLAVOR, detectorModel, SpokenNames.DEMO_KIT, cameraModel)

    /** One event, written once to the session file and sent once over the link (never blocks). */
    private fun publish(msg: JSONObject) {
        val line = msg.toString()
        recorder.writeLine(line)
        link.send(line)
    }

    fun start(owner: LifecycleOwner, preview: Preview.SurfaceProvider? = null) {
        orientation.start()
        speaker.preload(SOS_LINES + listOf(ONLINE_FAILED) + ai.saarthi.app.guidance.Phrases.ALL + ai.saarthi.app.reach.StopPhrases.ALL)
        startSos()
        camera.start(owner, preview, ::onFrame)
        link.start()
        thermal.onTier = ::onThermal
        thermal.start()
        voice.load()
        main.postDelayed(statsTick, STATS_PERIOD_MS)
        main.post(statusTick)
    }

    // ---- Link ----

    @Volatile private var lastLossSpokenMs = 0L

    /**
     * PRD 4: if the laptop link drops, say so once and carry on with the phone. Said only when an
     * established link is lost (not when no laptop was ever there), and at most once a minute, so
     * a flaky cable cannot make Saarthi chatter.
     */
    private fun onLinkState(state: FeedLink.State) {
        linkUp = state == FeedLink.State.CONNECTED
        var spoken = false
        if (state == FeedLink.State.LOST) {
            val now = SystemClock.elapsedRealtime()
            if (now - lastLossSpokenMs > LOSS_REPEAT_MS) {
                lastLossSpokenMs = now
                main.post { speaker.speak(LINK_LOST) }
                spoken = true
            }
        }
        publish(FeedMessages.link(state.name.lowercase(), spoken))
    }

    // ---- Hands ----

    @Volatile private var handsShown = false  // hand thread only

    /** The boxes of hands seen within the last [HAND_FRESH_MS] (for the "a hand is not a person" rule). */
    private fun recentHandBoxes(): List<Box> {
        val r = hands.latest ?: return emptyList()
        val ageMs = (SystemClock.elapsedRealtimeNanos() - r.frameTimestampNs) / 1_000_000
        return if (ageMs <= HAND_FRESH_MS) r.hands.map { it.box } else emptyList()
    }

    /** Hand thread: guide the hand if a guidance session is on; publish runs with hands. */
    private fun onHands(r: HandTracker.Result) {
        synchronized(detLock) { handMs += r.latencyMs }
        if (r.hands.isNotEmpty()) lastHandSeen = r
        guide(r)
        watchReach(r)
        if (r.hands.isEmpty() && !handsShown) return
        handsShown = r.hands.isNotEmpty()
        val pose = orientation.at(r.frameTimestampNs)
        val height = perception.latest.table?.heightM
        // The index fingertip, assumed to be at table height (true when touching the table).
        val tips: List<Vec2?> = r.hands.map { h ->
            if (pose == null || height == null) null
            else TableGeometry.onTable(cameraModel, pose, height, h.indexTip.first, h.indexTip.second)
                ?.let { TableGeometry.worldToBody(TableGeometry.cameraToWorld(it, pose), pose.forwardYawDeg) }
        }
        publish(FeedMessages.hands(r, tips))
    }

    // ---- Belief map and divergence (PRD 5.1) ----

    /**
     * Detector thread: compares what the user was told with the world map; speaks at most one alert
     * ("Heads up, your bottle was moved…", "I can't see your bottle any more."). Returns the belief
     * map with each belief's standing, for the feed.
     */
    private fun checkBeliefs(snap: Perception.Snapshot): org.json.JSONArray? {
        val pose = snap.pose ?: return null
        val heightM = snap.table?.heightM ?: TableHeight.DEFAULT_M
        val occluders = snap.hands + snap.tracks.filter { it.label == "person" && snap.atMs - it.lastSeenMs <= 500 }.map { it.box }
        // Online mode is the user's conversation with the cloud: nothing else speaks unasked (team, D53).
        val canSpeak = !speaker.busy && holdNs == 0L && !perception.paused && !online
        // D61: the Phase 4 change detector (D25-D28, D45) speaks again; D58's still-camera watch misnamed moved
        // objects and missed moves and removals on the team's 12 Nov tests with the phone in a stand.
        val (alert, statuses) = synchronized(beliefLock) {
            changes.update(beliefs, snap.world, occluders, snap.atMs, pose.fastRotation, canSpeak, heightM,
                ChangeDetector.Camera(pose.yawDeg, pose.tiltDeg, pose.rotationDegS)) { o -> describe(o, snap.world, pose.forwardYawDeg) }
        }
        lastStatuses = statuses
        watching = REACH_STOP && reachWatch.watching(synchronized(beliefLock) { beliefs.staleSpots(snap.atMs) }, statuses)
        if (alert != null) {
            val mind = FeedMessages.alertMind(alert, pose.forwardYawDeg, heightM)
            main.post { speakAlert(alert, mind) }
        }
        val list = synchronized(beliefLock) { beliefs.snapshot() }
        return FeedMessages.belief(list, statuses, pose.forwardYawDeg, heightM)
    }

    @Volatile private var lastStatuses: List<ChangeDetector.Status> = emptyList()

    // ---- Stop the wrong reach before it lands (PRD 5.0.1 item 2, D46) ----

    /**
     * Hand thread: is the user's hand heading to where they may still believe an object is? Then say
     * at once (a pre-recorded clip) where it really is, before the hand arrives. Not during guidance
     * (the guide steers the hand already) or while the user is talking.
     */
    private fun watchReach(r: HandTracker.Result) {
        if (!REACH_STOP || !watching || online || synchronized(guideLock) { guidance.active }) { reachWatch.reset(); return }
        // The user's reaching hand: the one nearest the bottom of the frame (theirs come from their side).
        val h = r.hands.maxByOrNull { it.landmarks[0].second } ?: run { reachWatch.reset(); return }
        val pose = orientation.at(r.frameTimestampNs) ?: return
        val snap = perception.latest
        val height = snap.table?.heightM ?: return
        val now = SystemClock.elapsedRealtime()
        val (list, stale) = synchronized(beliefLock) { beliefs.snapshot() to beliefs.staleSpots(now) }
        val k = listOf(5, 9, 13, 17).map { h.landmarks[it] }
        val knuckles = k.map { it.first }.average().toFloat() to k.map { it.second }.average().toFloat()
        val stop = reachWatch.onHand(knuckles, h.indexTip, h.landmarks[0], now, pose, height, snap.world, list, stale, lastStatuses) { o ->
            o.bodyBearingDeg(pose.forwardYawDeg)
        } ?: return
        if (holdNs != 0L) return
        val fwd = pose.forwardYawDeg
        // The user is told now: what they believed is corrected, and the spot is no longer watched.
        synchronized(beliefLock) {
            stop.staleId?.let { beliefs.clearStale(it) }
            val b = stop.believedWorldId?.let { beliefs.of(it) }
            val to = stop.nowWorldId?.let { id -> snap.world.firstOrNull { it.id == id } }
            if (b != null) {
                if (to?.world != null) beliefs.relocate(b, to.id, to.world, height, now) else beliefs.markLostSaid(b, now)
            }
            beliefs.clearStale(stop.label, stop.believedUnit)
        }
        val believedBody = TableGeometry.worldToBody(stop.believedUnit * height, fwd)
        val nowBody = stop.nowWorldId?.let { id -> snap.world.firstOrNull { it.id == id } }?.world?.let { TableGeometry.worldToBody(it, fwd) }
        val p = stop.prediction
        val msg = FeedMessages.message("alert").put("kind", "stopped").put("label", stop.label).put("text", stop.text)
            .put("cause", "hand heading to where the user believed the ${SpokenNames.of(stop.label)} was: %.2f of the frame away, %.0f° off its course, about %d ms from it".format(
                p.distance, p.angleDeg, p.etaMs))
            .put("from", stop.believedWorldId ?: JSONObject.NULL).put("to", stop.nowWorldId ?: JSONObject.NULL)
            .put("evidenceMs", 0)
            .put("believed", JSONObject().put("pos", FeedMessages.xyOf(believedBody)).put("direction", FeedMessages.directionOf(believedBody))
                .put("toldMs", stop.toldMs ?: JSONObject.NULL))
            .put("now", nowBody?.let { JSONObject().put("pos", FeedMessages.xyOf(it)).put("direction", FeedMessages.directionOf(it)) } ?: JSONObject.NULL)
            .put("reach", JSONObject().put("watched", stop.kind).put("distance", FeedMessages.round(p.distance.toDouble(), 3))
                .put("angleDeg", FeedMessages.round(p.angleDeg.toDouble(), 1)).put("etaMs", p.etaMs)
                .put("speed", FeedMessages.round(p.speed.toDouble(), 2)))
        main.post {
            val id = speaker.speak(stop.text)
            lastSaid = stop.text
            onBrief(stop.text)
            publish(msg.put("utterance", id ?: JSONObject.NULL))
        }
    }

    // ---- System 2 (Phase 4): settling an open "is it real?" and correcting what was told ----

    /** Objects whose verdict the user asked about and is still open, and until when to wait (main and detector threads). */
    private data class PendingReal(val ids: Set<Int>, val untilMs: Long)
    private val pendingReal = java.util.concurrent.atomic.AtomicReference<PendingReal?>(null)
    /** Objects already corrected out loud (detector thread). */
    private val corrected = HashSet<Int>()

    /**
     * Detector thread. (1) A pending "is it real?" settles: say the verdict once; at the deadline, say
     * it is still unclear. Nothing about real or picture is said unasked (D42).
     */
    private fun checkReality(snap: Perception.Snapshot) {
        torchAnswer.get()?.let { ta ->
            val ready = snap.evidenceSeq >= ta.seq && !speaker.busy
            if ((ready || snap.atMs > ta.untilMs) && torchAnswer.compareAndSet(ta, null)) {
                val scene = snap.scene()
                val a = RealitySpeech.answer(ta.cls, scene, snap.atMs) { o -> composer.where(listOf(o), scene.forwardYawDeg) }
                // The answer itself says "picture": no separate "Correction: …" after it (team test, 31 Oct).
                for (o in RealitySpeech.candidates(ta.cls, scene, snap.atMs)) {
                    if (snap.reality[o.id]?.verdict == Verdict.PICTURE) {
                        corrected += o.id
                        synchronized(beliefLock) { beliefs.forget(o.id) }
                    }
                }
                main.post { answerReal(a) }
            }
        }
        pendingReal.get()?.let { p ->
            val settled = p.ids.mapNotNull { id ->
                val a = snap.reality[id] ?: return@mapNotNull null
                val o = snap.world.firstOrNull { it.id == id } ?: return@mapNotNull null
                RealitySpeech.settled(o, a)?.let { id to it }
            }
            val left = p.ids - settled.map { it.first }.toSet()
            when {
                settled.isNotEmpty() -> {
                    pendingReal.compareAndSet(p, if (left.isEmpty()) null else p.copy(ids = left))
                    main.post { speakSystem2("settled", settled.first().second, settled.first().first) }
                }
                snap.atMs > p.untilMs -> if (pendingReal.compareAndSet(p, null)) main.post { speakSystem2("unsure", RealitySpeech.STILL_UNSURE, null) }
            }
        }
        // No unasked corrections (D42): real or picture is spoken only in answer to "is it real?".
    }

    // ---- System 2: the torch test (D38) ----

    /** One torch test in progress; the torch-off frame and the view at that moment are set on the camera thread. */
    private class TorchRun(val cls: String?, val ids: List<Int>, val startMs: Long) {
        @Volatile var off: Gray? = null
        @Volatile var offSnap: Perception.Snapshot? = null
    }
    private var torchRun: TorchRun? = null  // main thread
    /** The camera thread hands its next frame, in grey, to this once. */
    @Volatile private var torchGrab: ((Gray) -> Unit)? = null
    /** "Is it real?" to answer once the torch evidence numbered [seq] is in the assessments (or at [untilMs]). */
    private data class TorchAnswer(val cls: String?, val seq: Int, val untilMs: Long)
    private val torchAnswer = java.util.concurrent.atomic.AtomicReference<TorchAnswer?>(null)

    /**
     * Main thread. Exposure locked → a frame with the torch off → torch on → a frame with it on →
     * torch off, exposure released (about a second). Motion and light-around-it readings pause
     * meanwhile: the light changes between frames on purpose.
     */
    private fun startTorch(cls: String?, ids: List<Int>) {
        val run = TorchRun(cls, ids, SystemClock.elapsedRealtime())
        torchRun = run
        perception.pixelHold = true
        camera.lockExposure(true)
        main.postDelayed({
            if (torchRun !== run) return@postDelayed
            torchGrab = { off ->
                run.off = off
                run.offSnap = perception.latest
                main.post {
                    if (torchRun === run) {
                        camera.torch(true)
                        main.postDelayed({
                            if (torchRun === run) torchGrab = { on -> val onSnap = perception.latest; main.post { finishTorch(run, on, onSnap) } }
                        }, TORCH_ON_MS)
                    }
                }
            }
        }, TORCH_LOCK_MS)
        main.postDelayed({ if (torchRun === run) finishTorch(run, null, null) }, TORCH_TIMEOUT_MS)
    }

    /** Main thread: torch off, measure each object asked about, hand the evidence to System 2, answer once it counts. */
    private fun finishTorch(run: TorchRun, on: Gray?, onSnap: Perception.Snapshot?) {
        if (torchRun !== run) return
        torchRun = null
        torchGrab = null
        camera.torch(false)
        camera.lockExposure(false)
        main.postDelayed({ if (torchRun == null) perception.pixelHold = false }, TORCH_SETTLE_MS)
        val off = run.off
        val offSnap = run.offSnap
        var seq = 0
        val results = ArrayList<FeedMessages.TorchReading>()
        if (on != null && onSnap != null && off != null && offSnap != null) {
            val fresh = onSnap.tracks.filter { it.confirmed && onSnap.atMs - it.lastSeenMs <= TORCH_FRESH_MS }
            val table = fresh.firstOrNull { it.label == "dining table" }?.box
            val holes = fresh.filter { it.label != "dining table" }.map { it.box }
            for (id in run.ids) {
                val b0 = offSnap.world.firstOrNull { it.id == id }?.track?.box ?: continue
                val o1 = onSnap.world.firstOrNull { it.id == id } ?: continue
                val b1 = o1.track?.box ?: continue
                val r = TorchCheck.measure(off, on, b0, b1, table, holes) ?: continue
                if (r.llr != 0f) seq = perception.addEvidence(id, Cue.TORCH, r.llr, r.detail)
                results += FeedMessages.TorchReading(id, o1.label, r)
            }
        }
        publish(FeedMessages.torch(SystemClock.elapsedRealtime() - run.startMs, on != null, results))
        torchAnswer.set(TorchAnswer(run.cls, seq, SystemClock.elapsedRealtime() + TORCH_ANSWER_MS))
    }

    /** Main thread: the answer to "is it real?" after the torch test; still unsure → keep checking as the phone moves. */
    private fun answerReal(a: RealitySpeech.Answer) {
        speakSystem2("torch", a.text, null)
        pendingReal.set(if (a.pending.isEmpty()) null else PendingReal(a.pending.toSet(), SystemClock.elapsedRealtime() + REAL_CHECK_MS))
    }

    private fun speakSystem2(kind: String, text: String, worldId: Int?) {
        val id = speaker.speak(text)
        lastSaid = text
        onBrief(text)
        publish(FeedMessages.message("alert").put("kind", kind).put("label", JSONObject.NULL).put("text", text)
            .put("cause", "System 2 verdict").put("from", worldId ?: JSONObject.NULL).put("to", JSONObject.NULL)
            .put("utterance", id ?: JSONObject.NULL))
    }

    /**
     * Objects the user already knows that have not changed: told within [KNOWN_FOR_MS], and the change
     * detector last found them where the user believes (salience, PRD 5.2). A repeated tap leaves them out.
     */
    private fun knownIds(snap: Perception.Snapshot, nowMs: Long): Set<Int> {
        val ok = lastStatuses.filter { it.state == ChangeDetector.State.OK }.map { it.worldId }.toSet()
        return synchronized(beliefLock) { beliefs.snapshot() }
            .filter { it.worldId in ok && nowMs - it.sinceMs <= KNOWN_FOR_MS && snap.world.any { o -> o.id == it.worldId } }
            .map { it.worldId }.toSet()
    }

    /** Where an object is, for an alert: by a landmark if one is close ("behind the laptop"), else direction and reach. */
    private fun describe(o: WorldObject, world: List<WorldObject>, fwd: Float): String =
        Relations.of(o, world.filter { it.statable }, fwd)?.let { "${it.rel.phrase} the ${SpokenNames.of(it.anchorLabel)}" }
            ?: composer.where(listOf(o), fwd)

    private fun speakAlert(a: ChangeDetector.Alert, mind: org.json.JSONObject) {
        // The tone is instant; the sentence follows when the voice is ready (0.2-1.1 s on the Vivo).
        earcons.play(Earcon.CHANGED)
        val id = speaker.speak(a.text)
        lastSaid = a.text
        onBrief(a.text)
        publish(FeedMessages.message("alert").put("kind", a.kind.name.lowercase()).put("label", a.label)
            .put("text", a.text).put("cause", a.cause).put("from", a.fromWorldId).put("to", a.toWorldId ?: JSONObject.NULL)
            .put("utterance", id ?: JSONObject.NULL)
            .put("evidenceMs", mind.get("evidenceMs")).put("believed", mind.opt("believed") ?: JSONObject.NULL).put("now", mind.get("now")))
    }

    /** The user has just heard about [ids]: they now believe what was said. */
    private fun told(ids: Collection<Int>, snap: Perception.Snapshot, nowMs: Long) {
        if (ids.isEmpty()) return
        synchronized(beliefLock) { beliefs.told(snap.world.filter { it.id in ids }, snap.table?.heightM ?: TableHeight.DEFAULT_M, nowMs) }
    }

    @Volatile private var lastHandsOfferMs = 0L
    /** The last hand-tracker run that saw a hand (for "what's this?", D53). */
    @Volatile private var lastHandSeen: HandTracker.Result? = null

    // ---- Reach guidance (PRD 5.3): one event stream for speech, vibration and the feed ----

    private val guidance = Guidance()
    private val guideLock = Any()
    private val haptics = Haptics(context)

    fun startGuidance(worldId: Int, label: String, nowMs: Long) =
        synchronized(guideLock) { guidance.start(Guidance.Target(worldId, label, SpokenNames.of(label)), nowMs) }

    private fun stopGuidance() = synchronized(guideLock) { guidance.stop() }

    /** Hand thread, every hand run (about 10/s): the reflex tier of guidance. */
    private fun guide(r: HandTracker.Result) {
        val target = synchronized(guideLock) { guidance.target } ?: return
        val snap = perception.latest
        val pose = snap.pose
        // The entry may have been re-found under a new id (moved, merged): fall back to the nearest of its class.
        val entry = snap.world.firstOrNull { it.id == target.worldId } ?: snap.world.filter { it.label == target.label && it.statable }
            .minByOrNull { o -> pose?.let { p -> o.placement(p.forwardYawDeg)?.distM } ?: 9f }
        val box = entry?.track?.box ?: entry?.lastBox
        val tip = box?.let { b ->
            val cx = (b.left + b.right) / 2f; val cy = (b.top + b.bottom) / 2f
            r.hands.minByOrNull { h -> kotlin.math.hypot(h.indexTip.first - cx, h.indexTip.second - cy) }?.indexTip
        } ?: r.hands.firstOrNull()?.indexTip
        val fwd = pose?.forwardYawDeg
        val view = Guidance.View(
            tip, box, entry?.seen == Seen.IN_VIEW,
            fwd?.let { f -> entry?.placement(f)?.reach?.phrase },
            fwd?.let { f -> entry?.bodyBearingDeg(f) },
            pose?.let { TableGeometry.wrap(it.yawDeg - it.forwardYawDeg) },
        )
        val now = SystemClock.elapsedRealtime()
        val step = synchronized(guideLock) { guidance.onRun(view, now) } ?: return
        main.post { emitGuidance(step, target) }
    }

    private fun emitGuidance(step: Step, target: Guidance.Target) {
        val id = step.phrase?.let { speaker.speak(it) }
        step.phrase?.let { onBrief(it) }
        haptics.play(step.cue, step.correction)
        publish(FeedMessages.message("guidance")
            .put("event", step.cue.event).put("mode", step.mode.name.lowercase())
            .put("intensity", FeedMessages.round(step.intensity.toDouble(), 2)).put("target", target.worldId)
            .put("label", target.label).put("correction", step.correction)
            .put("phrase", step.phrase ?: JSONObject.NULL).put("utterance", id ?: JSONObject.NULL)
            .put("bias", synchronized(guideLock) { guidance.bias.estimate() }.let { b ->
                JSONObject().put("x", FeedMessages.round(b.x.toDouble(), 3)).put("y", FeedMessages.round(b.y.toDouble(), 3))
                    .put("reaches", b.n).put("confident", b.confident)
                    .put("meanX", FeedMessages.round(b.meanX.toDouble(), 3)).put("meanY", FeedMessages.round(b.meanY.toDouble(), 3))
                    .put("seX", FeedMessages.round(b.seX.toDouble(), 3)).put("seY", FeedMessages.round(b.seY.toDouble(), 3))
            })
            .put("vector", step.vector?.let { org.json.JSONArray().put(FeedMessages.round(it.first.toDouble(), 3)).put(FeedMessages.round(it.second.toDouble(), 3)) } ?: JSONObject.NULL))
    }

    // ---- Brief ----

    // Detector thread only.
    private var candidateText: String? = null
    private var candidateSinceMs = 0L

    /**
     * Keeps the probable next brief synthesised in the background, so a tap can play it at once.
     * Only text that has held steady for [PREPARE_STABLE_MS] is prepared, so a flickering scene
     * does not keep the speech engine busy. A tap always re-composes the brief; the clip is used
     * only if its text is exactly what the tap composes.
     */
    private fun prepareBrief(text: String, atMs: Long) {
        if (text != candidateText) {
            candidateText = text
            candidateSinceMs = atMs
        } else if (atMs - candidateSinceMs >= PREPARE_STABLE_MS) {
            speaker.prepare(text)
        }
    }

    /**
     * The user tapped the screen: acknowledge at once with an earcon, then speak a brief of what
     * the detector is confident about. If objects appeared in the last [SETTLE_MS] (the phone was
     * just moved), wait until [SETTLE_MS] after the tap so they can gather evidence first (D12);
     * otherwise speak at once.
     */
    fun onTap() {
        if (sos.state != Sos.State.IDLE) { sos.cancel(); return }
        // Three quick taps toggle online mode (team, D54); the first tap's brief is cut by the second.
        val now = SystemClock.elapsedRealtime()
        tapTimes.addLast(now)
        while (tapTimes.isNotEmpty() && now - tapTimes.first() > MULTI_TAP_MS) tapTimes.removeFirst()
        if (tapTimes.size >= 3) { tapTimes.clear(); toggleOnline(!online); return }
        if (tapTimes.size == 2) { pendingBrief?.let { main.removeCallbacks(it) }; pendingBrief = null; speaker.stop(); return }
        if (online) { earcons.play(Earcon.HEARD); askOnline(ONLINE_TAP_QUESTION); return }
        val tapNs = SystemClock.elapsedRealtimeNanos()
        val tapMs = SystemClock.elapsedRealtime()
        earcons.play(Earcon.HEARD) { ms -> recorder.record("earcon", JSONObject().put("name", "HEARD").put("tapToStartMs", FeedMessages.round(ms, 1))) }
        // A newer tap replaces a brief still waiting to settle: one tap, one answer.
        pendingBrief?.let { main.removeCallbacks(it) }
        pendingBrief = null
        val unsettled = perception.latest.tracks.any { tapMs - it.firstSeenMs < SETTLE_MS && composer.evidenceGap(it, tapMs) != null }
        if (unsettled) {
            val r = Runnable { pendingBrief = null; speakBrief(tapNs, settled = true) }
            pendingBrief = r
            main.postDelayed(r, SETTLE_MS)
        } else {
            speakBrief(tapNs, settled = false)
        }
    }

    private var pendingBrief: Runnable? = null  // main thread only
    private val tapTimes = ArrayDeque<Long>()  // main thread only

    /** Online mode on or off: a tone, a vibration and the screen's marker; no words about the cloud (D54). */
    private fun toggleOnline(on: Boolean) {
        speaker.stop()
        if (on) stopGuidance()
        online = on
        earcons.play(if (on) Earcon.ONLINE_ON else Earcon.ONLINE_OFF)
        haptics.pattern(if (on) longArrayOf(0, 60, 60, 60, 60, 60) else longArrayOf(0, 250))
        onOnline(on)
        publish(FeedMessages.message("online").put("event", if (on) "on" else "off"))
    }

    /** Main thread: online mode changed (the screen shows a marker while on). */
    var onOnline: (Boolean) -> Unit = {}

    /** Speaks the brief for [snap] judged at [nowMs] (default: the latest view, now). */
    private fun speakBrief(
        tapNs: Long, settled: Boolean,
        snap: Perception.Snapshot = perception.latest, nowMs: Long = SystemClock.elapsedRealtime(),
        /** A spoken "what's around me" asks for everything; a tap gets only what changed. */
        full: Boolean = false,
    ) {
        val brief = composer.compose(snap.scene(), nowMs, if (full) emptySet() else knownIds(snap, nowMs))
        val text = when {
            perception.error != null -> "My object detector didn't start, so I can't describe the table."
            snap.atMs == 0L -> "I'm still starting up. Tap again in a moment."
            else -> brief.text
        }
        val clipReady = speaker.preparedText == text
        val speakCallNs = SystemClock.elapsedRealtimeNanos()
        val id = speaker.speak(text)
        val decisionMs = (speakCallNs - tapNs) / 1e6
        if (id != null) tapToSpeak[id] = decisionMs
        publish(FeedMessages.brief(id, text, brief, settled, decisionMs, clipReady))
        if (id != null) told(brief.items.flatMap { it.worldIds } + brief.unchanged, snap, nowMs)
        lastSaid = text
        onBrief(text)
    }

    // ---- Press-and-hold speech (PRD 5.9) ----

    @Volatile private var holdNs = 0L  // written on the main thread; read by the belief check

    /** Finger down and held: open the microphone, with a short low tone. */
    fun onHoldStart() {
        if (sos.state != Sos.State.IDLE) { sos.cancel(); return }
        sos.micPaused = true
        pendingBrief?.let { main.removeCallbacks(it) }
        pendingBrief = null
        speaker.stop()
        if (!voice.ready) {
            speakLine(voice.loadError?.let { "Speech recognition isn't installed." } ?: "I'm still starting up.")
            return
        }
        // Tone first, then the microphone, so the mic does not record Saarthi's own tone.
        earcons.play(Earcon.LISTENING)
        main.postDelayed(beginMic, MIC_AFTER_TONE_MS)
    }

    private val beginMic = Runnable { if (voice.begin()) holdNs = SystemClock.elapsedRealtimeNanos() }

    /** Finger lifted: acknowledge, transcribe, understand, answer. */
    fun onHoldEnd() {
        main.removeCallbacks(beginMic)
        if (holdNs == 0L) { sos.micPaused = false; return }
        holdNs = 0L
        val releaseNs = SystemClock.elapsedRealtimeNanos()
        earcons.play(Earcon.HEARD)
        // The question is about the table as it was when the user asked, not as it is after the
        // ~1.3 s of transcription (during which the detector is paused and nothing is re-seen).
        // Judging the answer later made every object look "not seen for 1.3 s" (Phase 1 exit check).
        val asked = perception.latest
        val askedMs = SystemClock.elapsedRealtime()
        voice.end(onTranscribing = { perception.paused = it; hands.paused = it }) { heard ->
            sos.micPaused = false
            val intent = IntentInterpreter.interpret(heard.text)
            main.post { answer(intent, heard, releaseNs, asked, askedMs) }
        }
    }

    /**
     * A typed request through the same path as speech (dev builds only: DevHooks; labelled
     * SIMULATED). Like speech, it captures the view at "release" and pauses the detector for
     * [transcribeMs] before answering, so it reproduces real timing without a voice.
     */
    fun askText(text: String, transcribeMs: Long = 1_300L) {
        val releaseNs = SystemClock.elapsedRealtimeNanos()
        val asked = perception.latest
        val askedMs = SystemClock.elapsedRealtime()
        perception.paused = true
        hands.paused = true
        main.postDelayed({
            perception.paused = false
            hands.paused = false
            val heard = VoiceInput.Heard(text, 0.0, transcribeMs.toDouble(), "typed (SIMULATED)")
            answer(IntentInterpreter.interpret(text), heard, releaseNs, asked, askedMs)
        }, transcribeMs)
    }

    private fun answer(intent: Intent, heard: VoiceInput.Heard, releaseNs: Long, snap: Perception.Snapshot, askedMs: Long) {
        // Online mode (D51, D53): every request goes to the cloud until "go offline" ("stop" still stops speech).
        if (online && intent !is Intent.Online && intent != Intent.Stop && heard.text.isNotBlank()) {
            publish(FeedMessages.message("heard").put("text", heard.text).put("intent", intent.toString()).put("model", heard.model)
                .put("audioS", FeedMessages.round(heard.audioS, 2)).put("transcribeMs", FeedMessages.round(heard.transcribeMs, 1))
                .put("releaseToDecisionMs", FeedMessages.round((SystemClock.elapsedRealtimeNanos() - releaseNs) / 1e6, 1))
                .put("reply", "(asked online)"))
            askOnline(heard.text)
            return
        }
        // "Did you mean …?" (D58): the answer to Saarthi's last guess.
        pendingGuess?.let { (text, atMs) ->
            pendingGuess = null
            if (SystemClock.elapsedRealtime() - atMs <= GUESS_MS) {
                if (NearMiss.isYes(heard.text)) { answer(IntentInterpreter.interpret(text), VoiceInput.Heard(text, heard.audioS, heard.transcribeMs, heard.model), releaseNs, snap, askedMs); return }
                if (NearMiss.isNo(heard.text)) { speakLine("Okay."); return }
            }
        }
        // The diary (D56): a question Saarthi has no rule for, sharing words with a note, gets the note back.
        if (intent is Intent.Unknown && intent.transcript.isNotBlank()) {
            diary.find(intent.transcript)?.let { n ->
                speakLine("You noted at ${n.clock}: ${n.text}.")
                publish(FeedMessages.message("note").put("event", "recall").put("question", intent.transcript).put("text", n.text))
                return
            }
        }
        // A request heard almost right: ask instead of "Sorry, I didn't catch that" (team, D58).
        if (intent is Intent.Unknown && intent.transcript.isNotBlank()) {
            NearMiss.suggest(intent.transcript)?.let { (guess, sim) ->
                pendingGuess = guess to SystemClock.elapsedRealtime()
                val text = "Did you mean: $guess?"
                speakLine(text)
                publish(FeedMessages.message("heard").put("text", heard.text).put("intent", intent.toString()).put("model", heard.model)
                    .put("audioS", FeedMessages.round(heard.audioS, 2)).put("transcribeMs", FeedMessages.round(heard.transcribeMs, 1))
                    .put("releaseToDecisionMs", FeedMessages.round((SystemClock.elapsedRealtimeNanos() - releaseNs) / 1e6, 1))
                    .put("reply", text).put("guess", guess).put("similarity", FeedMessages.round(sim.toDouble(), 2)))
                return
            }
        }
        val reply = answerer.answer(intent, snap.scene(), askedMs, lastSaid)
        val decisionMs = (SystemClock.elapsedRealtimeNanos() - releaseNs) / 1e6
        publish(FeedMessages.message("heard")
            .put("text", heard.text)
            .put("intent", intent.toString())
            .put("model", heard.model)
            .put("audioS", FeedMessages.round(heard.audioS, 2))
            .put("transcribeMs", FeedMessages.round(heard.transcribeMs, 1))
            .put("releaseToDecisionMs", FeedMessages.round(decisionMs, 1))
            .put("reply", reply.text ?: JSONObject.NULL))
        when {
            reply.read -> readNextFrame(releaseNs)
            reply.readMore || (readingLeft.isNotEmpty() && heard.text.trim().lowercase().trimEnd('.', '!') in YES) -> readOn()
            reply.stop -> { stopGuidance(); haptics.cancel(); speaker.stop() }
            reply.personal != null -> onPersonal(reply.personal)
            reply.isBrief -> speakBrief(releaseNs, settled = false, snap, askedMs, full = true)
            reply.text != null -> {
                // "Is it real?" about something in view: the torch test first, the answer after it (D38).
                val torch = reply.torchIds.isNotEmpty() && camera.hasTorch && torchRun == null
                val text = if (torch) RealitySpeech.CHECKING else reply.text
                val id = speaker.speak(text)
                if (id != null) tapToSpeak[id] = decisionMs
                if (id != null) told(reply.about, snap, askedMs)
                reply.guideTo?.let { g -> snap.world.firstOrNull { it.id == g }?.let { startGuidance(g, it.label, SystemClock.elapsedRealtime()) } }
                if (torch) {
                    pendingReal.set(null)
                    startTorch(reply.torchClass, reply.torchIds)
                } else {
                    pendingReal.set(if (reply.checkReal.isEmpty()) null else PendingReal(reply.checkReal.toSet(), SystemClock.elapsedRealtime() + REAL_CHECK_MS))
                }
                lastSaid = text
                onBrief(text)
            }
        }
    }

    // ---- My watch, and "what's this?" (PRD 5.0.1 item 3, D49) ----

    private fun onPersonal(intent: Intent) {
        val now = SystemClock.elapsedRealtime()
        when (intent) {
            is Intent.Online -> {
                toggleOnline(intent.on)
                if (intent.on && intent.then != null) askOnline(intent.then)
            }
            is Intent.Note -> {
                val n = diary.add(intent.text, now, clock())
                speakLine("Noted.")
                publish(FeedMessages.message("note").put("event", "add").put("text", n.text).put("clock", n.clock))
            }
            Intent.ReadNotes -> {
                val all = diary.all
                speakLine(if (all.isEmpty()) "You have no notes yet. Say: note, and then what to remember."
                else "You have ${all.size} note${if (all.size > 1) "s" else ""}. " + all.joinToString(" ") { "At ${it.clock}: ${it.text}." })
            }
            is Intent.TeachMine -> personal.teach(intent.spoken, true, now)
            is Intent.TeachOther -> personal.teach(intent.spoken, false, now)
            is Intent.IsMine -> personal.ask(intent.spoken, now)
            Intent.WhatIsThis -> personal.whatIsThis(now) { touchAnswer() }
            else -> {}
        }
    }

    /** "What's this?" by touch, then pointing (D49): the object under, or along, the user's index finger. */
    private fun touchAnswer(): String {
        // The last run that saw a hand: hands pause while speech is transcribed (~1.3 s), so the latest run may
        // be older, or empty after the hand left for a moment (team test, 1 Nov: "I can't see your hand").
        val r = lastHandSeen
        val fresh = r != null && (SystemClock.elapsedRealtimeNanos() - r.frameTimestampNs) / 1_000_000 <= TOUCH_HAND_MS
        val h = if (fresh) r!!.hands.maxByOrNull { it.landmarks[0].second } else null
        if (h == null) return "I can't see your hand. Touch it or point at it in front of the camera."
        val snap = perception.latest
        val things = snap.world.filter { it.seen == Seen.IN_VIEW && !it.isPerson && it.label != "dining table" && it.track != null && it.statable }
        val known = synchronized(beliefLock) { beliefs.snapshot().map { it.worldId }.toSet() }
        /** "your cup" for an object the user was told about; else "the cup" (pointing) or "a cup" (touching). */
        fun named(id: Int, touching: Boolean = false): String {
            val n = SpokenNames.of(things.first { it.id == id }.label)
            return when {
                id in known -> "your $n"
                touching -> "${BriefComposer.article(n)} $n"
                else -> "the $n"
            }
        }
        return when (val f = TouchAsk.find(h.landmarks, things.map { TouchAsk.Candidate(it.id, it.track!!.box) })) {
            is TouchAsk.Found.Touching -> "That's ${named(f.id, touching = true)}."
            is TouchAsk.Found.Pointing -> "You're pointing at ${named(f.ids[0])}" +
                (if (f.ids.size > 1) ", and beyond it ${named(f.ids[1])}." else ".")
            TouchAsk.Found.Nothing -> "I can't tell what you're touching or pointing at."
        }
    }

    // ---- The diary (D56) ----

    private val diary = ai.saarthi.app.diary.Diary()

    /** Saarthi's last "Did you mean …?" (the request text, when asked), main thread (D58). */
    private var pendingGuess: Pair<String, Long>? = null

    private fun clock(): String = java.text.SimpleDateFormat("HH:mm", java.util.Locale.US).format(java.util.Date())

    // ---- Optional online brain, checked before it speaks (PRD 5.0.1 item 6, D51) ----

    /** Off at every launch; "go online" turns it on (D43: offline by default). */
    @Volatile private var online = false
    @Volatile private var linkUp = false
    /** Open online questions: id → question (main thread). */
    private val onlineAsks = HashMap<String, String>()

    private fun askOnline(question: String) {
        if (!linkUp) { speakLine(ONLINE_FAILED); return }
        val id = "q${SystemClock.elapsedRealtime()}"
        onlineAsks[id] = question
        grabFrame = { bmp ->
            val jpeg = java.io.ByteArrayOutputStream()
            bmp.compress(Bitmap.CompressFormat.JPEG, 80, jpeg)
            bmp.recycle()
            val image = Base64.encodeToString(jpeg.toByteArray(), Base64.NO_WRAP)
            // The phone's own file keeps the question only; the frame goes over the cable, never to disk.
            recorder.writeLine(FeedMessages.message("ask").put("id", id).put("question", question).put("imageBytes", image.length).toString())
            link.send(FeedMessages.message("ask").put("id", id).put("question", question).put("notes", diary.context()).put("image", image).toString())
        }
        main.postDelayed({ if (onlineAsks.remove(id) != null) onlineFailed(id, question, "no answer within ${ONLINE_TIMEOUT_MS / 1000} s") }, ONLINE_TIMEOUT_MS)
    }

    /** Reader thread: a line from the laptop that is not an ack. */
    private fun onLaptopMessage(line: String) {
        val m = try { JSONObject(line) } catch (t: Throwable) { return }
        if (m.optString("type") != "answer") return
        main.post {
            val id = m.optString("id")
            val question = onlineAsks.remove(id) ?: return@post   // late, after "no answer"
            if (m.has("error") || m.optString("text").isBlank()) { onlineFailed(id, question, m.optString("error", "empty answer")); return@post }
            val snap = perception.latest
            val fwd = snap.pose?.forwardYawDeg
            // Everything Saarthi would itself name: in view or remembered, passing its speaking rules.
            val known = snap.world.filter { it.statable && it.label != "dining table" }
                .map { o -> CloudCheck.Known(o.label, fwd?.let { f -> o.bodyBearingDeg(f) }?.let { ai.saarthi.app.table.Direction.word(it) }) }
            val r = CloudCheck.check(m.getString("text"), known)
            speakLine(r.spoken)
            publish(FeedMessages.message("online").put("event", "answer").put("id", id).put("question", question)
                .put("answer", m.getString("text")).put("verdict", r.verdict.name.lowercase()).put("reason", r.reason ?: JSONObject.NULL)
                .put("model", m.optString("model")).put("cloudMs", m.optLong("ms")).put("said", r.spoken)
                .put("things", m.optJSONArray("things") ?: org.json.JSONArray()))
        }
    }

    private fun onlineFailed(id: String, question: String, why: String) {
        speakLine(ONLINE_FAILED)
        publish(FeedMessages.message("online").put("event", "failed").put("id", id).put("question", question).put("error", why))
    }

    // ---- Reading (PRD 5.7, brought forward by the team) ----

    private val reader = TextReader()
    private val readExec = Executors.newSingleThreadExecutor { r -> Thread(r, "saarthi-read") }
    /** Set by a "read this" request; the camera thread hands the next frame to it once. */
    @Volatile private var grabFrame: ((Bitmap) -> Unit)? = null
    /** Lines not yet read aloud (main thread only). */
    private var readingLeft: List<String> = emptyList()

    /** "Read this": the next camera frame is read; the heading first, the rest on "read on". */
    private fun readNextFrame(requestNs: Long) {
        readingLeft = emptyList()
        grabFrame = { bmp ->
            perception.paused = true
            hands.paused = true
            readExec.execute {
                val page = try { reader.read(bmp) } finally { bmp.recycle(); perception.paused = false; hands.paused = false }
                main.post { speakPage(page, requestNs) }
            }
        }
    }

    private fun speakPage(page: TextReader.Page, requestNs: Long) {
        val text = when {
            page.chars == 0 -> "I don't see any text. Hold the page about a forearm away, facing the camera."
            page.heading != null && page.rest.isNotEmpty() -> "The heading says: ${page.heading}. There's more below; say read on to hear it."
            page.heading != null -> "It says: ${page.heading}."
            else -> chunk(page.rest).let { (first, left) -> readingLeft = left; "It says: $first" + if (left.isNotEmpty()) " Say read on for more." else "" }
        }
        if (page.heading != null) readingLeft = page.rest
        speaker.speak(text)
        lastSaid = text
        onBrief(text)
        publish(FeedMessages.message("read").put("ms", FeedMessages.round(page.ms, 1)).put("chars", page.chars)
            .put("script", page.script).put("heading", page.heading != null).put("linesLeft", readingLeft.size)
            .put("requestToSpeechMs", FeedMessages.round((SystemClock.elapsedRealtimeNanos() - requestNs) / 1e6, 1)))
    }

    private fun readOn() {
        if (readingLeft.isEmpty()) { speakLine("There's nothing more to read."); return }
        val (part, left) = chunk(readingLeft)
        readingLeft = left
        speakLine(part + if (left.isEmpty()) " That's the end." else " Say read on for more.")
    }

    /** About [READ_CHUNK_CHARS] characters of whole lines, and what is left. */
    private fun chunk(lines: List<String>): Pair<String, List<String>> {
        var n = 0
        var used = 0
        for (l in lines) { if (used > 0 && n + l.length > READ_CHUNK_CHARS) break; n += l.length + 1; used++ }
        return lines.take(used).joinToString(" ") to lines.drop(used)
    }

    // ---- Safety SOS (PRD 5.0.1 item 5, D47) ----

    private val sos = Sos(context)

    private fun startSos() {
        sos.ownVoice = { speaker.busy }
        sos.onAlert = { situation, fall, spike, simulated ->
            // Everything else sleeps until the user answers (team, 1 Nov): no detection, hands, guidance or alerts.
            pendingBrief?.let { main.removeCallbacks(it) }
            pendingBrief = null
            stopGuidance()
            perception.paused = true
            hands.paused = true
            speakLine(SOS_ASK)
            onSos(SosScreen("Are you OK?", "Tap anywhere to cancel.\nSending help in ${Sos.COUNTDOWN_S} s.", "I'M OK · CANCEL"))
            publish(FeedMessages.message("sos").put("state", "alert").put("situation", situation).put("simulated", simulated)
                .put("fall", JSONObject().put("freeFallMs", fall.freeFallMs).put("impactG", FeedMessages.round(fall.impactG.toDouble(), 1)))
                .put("spike", spike?.let { JSONObject().put("aboveRoomDb", FeedMessages.round(it.aboveRoomDb.toDouble(), 1)).put("msBeforeFall", fall.atMs - it.atMs) } ?: JSONObject.NULL))
        }
        sos.onTick = { left ->
            when (left) {
                10 -> speakLine(SOS_10)
                5 -> speakLine(SOS_5)
                0 -> speakLine(SOS_NOW)
            }
            if (left > 0) onSos(SosScreen("Are you OK?", "Tap anywhere to cancel.\nSending help in $left s.", "I'M OK · CANCEL"))
        }
        sos.onSent = { ok, detail, hasPlace, still ->
            speakLine(if (ok) SOS_SENT else SOS_FAILED)
            onSos(SosScreen(if (ok) "SOS sent" else "SOS not sent", detail, "RETURN TO NORMAL"))
            publish(FeedMessages.message("sos").put("state", if (ok) "sent" else "failed").put("detail", detail)
                .put("location", hasPlace).put("stillSince", still))
        }
        sos.onCancelled = { wasSent ->
            perception.paused = false
            hands.paused = false
            speakLine(SOS_BACK)
            onSos(null)
            publish(FeedMessages.message("sos").put("state", if (wasSent) "closed" else "cancelled"))
        }
        sos.start()
    }

    /** Dev builds only: as if the phone had fallen (labelled SIMULATED in the feed, "[TEST]" in the SMS). */
    fun simulateFall() = main.post { sos.simulateFall() }

    /** The dedicated button on the SOS screen. */
    fun cancelSos() = sos.cancel()

    private fun speakLine(text: String) {
        speaker.speak(text)
        onBrief(text)
    }

    // ---- Screen ----

    /** Confirmed tracks for the on-screen camera view, marked by whether Saarthi is sure of them. */
    fun overlayItems(): List<TrackOverlayView.Item> {
        val snap = perception.latest
        val nowMs = SystemClock.elapsedRealtime()
        val saidIds = composer.compose(snap.scene(), nowMs).sureTracks
        return snap.tracks.filter { it.confirmed && nowMs - it.lastSeenMs <= 1_000 }
            .map { t ->
                val dist = snap.pose?.let { p -> snap.world.firstOrNull { it.track?.id == t.id }?.placement(p.forwardYawDeg)?.distM }
                TrackOverlayView.Item(t.box, SpokenNames.display(t.label), t.score, t.id in saidIds, dist)
            }
    }

    private var ratesLine = "starting…"  // main thread only
    private val modelTag = detectorModel.substringAfterLast("/").substringBefore("_int8").removePrefix("efficientdet_")

    /** The screen's status refreshes often, so "Would say" follows the scene without lag. */
    private val statusTick = object : Runnable {
        override fun run() {
            onStatus("$ratesLine\n${statusText()}")
            main.postDelayed(this, STATUS_PERIOD_MS)
        }
    }

    /**
     * For the screen (the team and sighted judges, not the user): exactly the brief Saarthi would
     * say now, and separately what it is unsure about, with scores. The two can never disagree,
     * because both come from the same composer call.
     */
    private fun statusText(): String {
        val snap = perception.latest
        val nowMs = SystemClock.elapsedRealtime()
        val brief = composer.compose(snap.scene(), nowMs)
        val unsure = brief.leftOut.mapNotNull { l ->
            val t = snap.tracks.firstOrNull { it.id == l.trackId } ?: return@mapNotNull null
            if (!t.confirmed) null else "${SpokenNames.display(l.label)} %.2f".format(t.score)
        }.distinct()
        return "Would say: ${brief.text}" + if (unsure.isEmpty()) "" else "\nUnsure, not said: ${unsure.joinToString(", ")}"
    }

    // ---- Degradation states (PRD 10): spoken once per change, shown in the feed ----

    private val cameraHealth = CameraHealthMonitor()
    private val thermal = ThermalWatch(context)
    @Volatile private var health = CameraHealth.OK

    /** Every 5th frame (camera thread): is the lens covered, or the scene too dark? */
    private fun checkCamera(frame: Frame) {
        if (frame.index % 5 != 0L) return
        // The first frames after the camera opens are dark while exposure settles: on the Vivo every
        // launch said "My camera seems covered." then "I can see again." (29 Oct). Not judged.
        if (frame.index < SETTLE_FRAMES) return
        val b = frame.bitmap
        val luma = FloatArray(LUMA_GRID * LUMA_GRID)
        for (y in 0 until LUMA_GRID) for (x in 0 until LUMA_GRID) {
            val px = ((x + 0.5f) * b.width / LUMA_GRID).toInt().coerceAtMost(b.width - 1)
            val py = ((y + 0.5f) * b.height / LUMA_GRID).toInt().coerceAtMost(b.height - 1)
            val p = b.getPixel(px, py)
            luma[y * LUMA_GRID + x] = 0.299f * ((p shr 16) and 0xFF) + 0.587f * ((p shr 8) and 0xFF) + 0.114f * (p and 0xFF)
        }
        val now = cameraHealth.update(luma, SystemClock.elapsedRealtime())
        if (now == health) return
        val before = health
        health = now
        val line = when {
            now == CameraHealth.BLOCKED -> "My camera seems covered."
            now == CameraHealth.DIM -> "It's quite dark; I may miss things."
            before == CameraHealth.BLOCKED -> "I can see again."
            else -> null
        }
        main.post { line?.let(::speakLine); publish(FeedMessages.message("health").put("camera", now.name).put("thermal", thermal.tier.name).put("spoken", line ?: JSONObject.NULL)) }
    }

    private fun onThermal(tier: WorkPolicy.HeatTier, s: WorkPolicy.HeatSignals) {
        // The detector's floor; hand and frame rates follow the tier per frame (WorkPolicy, D59).
        perception.detectorMinIntervalMs = tier.detectorMinIntervalMs
        // Logged for the team (feed, Mind view, heat report), never said or shown to the user (team, D62).
        publish(FeedMessages.message("health").put("camera", health.name).put("thermal", tier.name)
            .put("thermalStatus", s.status).put("heat", heatJson(s)).put("spoken", JSONObject.NULL))
    }

    private fun heatJson(s: WorkPolicy.HeatSignals) = JSONObject()
        .put("tier", thermal.tier.name)
        .put("status", s.status)
        .put("headroom", s.headroom?.let { FeedMessages.round(it.toDouble()) } ?: JSONObject.NULL)
        .put("batteryC", s.batteryC?.let { FeedMessages.round(it.toDouble(), 1) } ?: JSONObject.NULL)
        .put("bigCapMHz", s.bigCapMHz ?: JSONObject.NULL)

    /** Dev builds only: a developer tool that sees each frame (FrameCapture, D34). Always null in the demo build. */
    @Volatile var frameTap: ((Frame) -> Unit)? = null

    /** The phone's pose at a frame's time, if the sensors have one near it. */
    fun poseAt(timestampNs: Long): Pose? = orientation.at(timestampNs)

    private fun onFrame(frame: Frame) {
        frameTap?.invoke(frame)
        checkCamera(frame)
        grabFrame?.let { g -> grabFrame = null; g(frame.bitmap.copy(Bitmap.Config.ARGB_8888, false)) }
        torchGrab?.let { g -> torchGrab = null; g(Gray.of(frame.bitmap)) }
        perception.onFrame(frame)
        // Full rate only while guiding a hand, teaching or asking about a watch, or watching for a wrong reach
        // (D46); otherwise ~4/s while a hand is around (a hand covering an object, D32; own moves, D58) and
        // ~2/s when none was seen for 5 s. Every frame only while guiding; else 20 a second (D59, D60).
        val nowMs = SystemClock.elapsedRealtime()
        val guiding = synchronized(guideLock) { guidance.active }
        val tier = thermal.tier
        camera.preparedFps = WorkPolicy.framesPerSecond(guiding, tier)
        val handsEveryMs = WorkPolicy.handsIntervalMs(guiding || watching || personal.active, nowMs - hands.lastHandMs, tier)
        if (nowMs - lastHandsOfferMs >= handsEveryMs) {
            if (hands.offer(frame.bitmap, frame.timestampNs)) lastHandsOfferMs = nowMs
        }
        // My watch (D49): the region around the user's hand, from a hand run of about this moment.
        if (!perception.paused) {
            val r = hands.latest?.takeIf { (frame.timestampNs - it.frameTimestampNs) in 0..HAND_CROP_NS }
            personal.onFrame(frame.bitmap, r?.hands?.maxByOrNull { it.landmarks[0].second }, nowMs, online || synchronized(guideLock) { guidance.active })
        }
    }

    private val statsTick = object : Runnable {
        override fun run() {
            val w = camera.stats.snapshotAndReset(SystemClock.elapsedRealtimeNanos())
            val runs = synchronized(detLock) { detMs.also { detMs = ArrayList() } }
            val handRuns = synchronized(detLock) { handMs.also { handMs = ArrayList() } }
            val s2 = LatencyStats.summarize(synchronized(detLock) { s2Ms.also { s2Ms = ArrayList() } })
            val gray = LatencyStats.summarize(synchronized(detLock) { grayMs.also { grayMs = ArrayList() } })
            val hand = LatencyStats.summarize(handRuns)
            val handsPerS = if (w.seconds > 0) handRuns.size / w.seconds else 0.0
            val det = LatencyStats.summarize(runs)
            val runsPerS = if (w.seconds > 0) runs.size / w.seconds else 0.0
            publish(FeedMessages.message("rates")
                .put("cameraFps", FeedMessages.round(w.fps, 1))
                .put("gapP50Ms", w.gaps?.p50Ms?.let { FeedMessages.round(it, 1) } ?: JSONObject.NULL)
                .put("gapP90Ms", w.gaps?.p90Ms?.let { FeedMessages.round(it, 1) } ?: JSONObject.NULL)
                .put("detectorRunsPerS", FeedMessages.round(runsPerS, 1))
                .put("detectorP50Ms", det?.p50Ms?.let { FeedMessages.round(it, 1) } ?: JSONObject.NULL)
                .put("detectorP90Ms", det?.p90Ms?.let { FeedMessages.round(it, 1) } ?: JSONObject.NULL)
                .put("handsPerS", FeedMessages.round(handsPerS, 1))
                .put("handsP50Ms", hand?.p50Ms?.let { FeedMessages.round(it, 1) } ?: JSONObject.NULL)
                .put("system2P50Ms", s2?.p50Ms?.let { FeedMessages.round(it, 1) } ?: JSONObject.NULL)
                .put("system2P90Ms", s2?.p90Ms?.let { FeedMessages.round(it, 1) } ?: JSONObject.NULL)
                .put("grayP50Ms", gray?.p50Ms?.let { FeedMessages.round(it, 1) } ?: JSONObject.NULL)
                .put("pose", orientation.latest?.let(FeedMessages::pose) ?: JSONObject.NULL)
                .put("imuClockOffsetMs", FeedMessages.round(orientation.clockOffsetMs, 1))
                .put("phrasebookClips", speaker.fixedReady)
                .put("linkSent", link.sent.get())
                .put("linkDropped", link.dropped.get())
                .put("preparedFps", camera.preparedFps)
                .put("heat", heatJson(thermal.signals)))
            val error = perception.error?.let { "DETECTOR NOT LOADED\n" } ?: ""
            val linkTag = when (link.state) {
                FeedLink.State.CONNECTED -> "laptop ✓"
                FeedLink.State.LOST -> "laptop lost"
                FeedLink.State.CONNECTING -> "no laptop"
            }
            val handTag = if (hands.error != null) "hands off" else "hands %.0f/s".format(handsPerS)
            val tilt = orientation.latest?.let { " · tilt %.0f°".format(it.tiltDeg) } ?: ""
            ratesLine = "${error}camera %.0f fps · $modelTag %.1f/s · $handTag$tilt · $linkTag".format(w.fps, runsPerS)
            main.postDelayed(this, STATS_PERIOD_MS)
        }
    }

    fun stop() {
        main.removeCallbacks(statsTick)
        main.removeCallbacks(statusTick)
        pendingBrief?.let { main.removeCallbacks(it) }
        camera.stop()
    }

    fun shutdown() {
        sos.stop()
        embedder.close()
        stop()
        camera.shutdown()
        perception.close()
        hands.close()
        readExec.shutdown()
        reader.close()
        orientation.stop()
        link.close()
        thermal.stop()
        voice.close()
        speaker.shutdown()
        earcons.close()
        recorder.close()
    }

    private companion object {
        /** After "move the phone slightly", how long a pending real-or-picture question waits for a verdict. */
        const val REAL_CHECK_MS = 6_000L
        /** Torch test timing (D38): exposure lock settles; the torch's light reaches the frames; the whole test at most. */
        const val TORCH_LOCK_MS = 250L
        const val TORCH_ON_MS = 450L
        const val TORCH_TIMEOUT_MS = 2_500L
        /** Pixel cues resume this long after the torch goes off (the exposure readjusts). */
        const val TORCH_SETTLE_MS = 600L
        /** Boxes from detector runs this recent count; the answer waits at most this long for the evidence. */
        const val TORCH_FRESH_MS = 1_000L
        const val TORCH_ANSWER_MS = 3_000L
        const val STATS_PERIOD_MS = 2_000L
        const val STATUS_PERIOD_MS = 250L
        const val PREPARE_STABLE_MS = 400L
        const val SETTLE_MS = 700L
        const val LOSS_REPEAT_MS = 60_000L
        /** PRD 4, verbatim. */
        const val LINK_LOST = "I've lost my extra vision; I can still help with the basics."
        /** Whisper base.en: 20/20 intents on the team's recordings vs 16/20 for tiny.en (D17); shipped in the demo APK (team, 29 Oct). */
        const val SPEECH_MODEL = "base.en"
        const val MIC_AFTER_TONE_MS = 100L
        const val LUMA_GRID = 20
        const val HAND_FRESH_MS = 450L
        /** A "yes" to "Did you mean …?" counts within this. */
        const val GUESS_MS = 10_000L
        /** A hand run this close to the frame (ns) places the crop around the hand (D49). */
        const val HAND_CROP_NS = 200_000_000L
        /** "What's this?" uses a hand seen within this: transcription (~1.3 s) plus the look at the finger (1.5 s). */
        const val TOUCH_HAND_MS = 3_500L
        const val SOS_ASK = "Are you OK? Tap the screen to cancel."
        const val SOS_10 = "Sending help in 10 seconds. Tap the screen to cancel."
        const val SOS_5 = "Sending help in 5 seconds."
        const val SOS_NOW = "Sending an alert to your contact now."
        const val SOS_SENT = "Alert sent to your contact."
        const val SOS_FAILED = "I could not send the alert."
        const val SOS_BACK = "Cancelled. I'm back to normal."
        val SOS_LINES = listOf(SOS_ASK, SOS_10, SOS_5, SOS_NOW, SOS_SENT, SOS_FAILED, SOS_BACK)
        const val ONLINE_FAILED = "I couldn't find an answer this time."
        /** A single tap in online mode: a short description of what is in front of the camera (D54). */
        const val ONLINE_TAP_QUESTION = "Briefly, what is in front of me?"
        /** Three taps within this toggle online mode. */
        const val MULTI_TAP_MS = 900L
        /** Stopping a wrong reach is off (team, 1 Nov: low value after the move is announced; D54). Code kept. */
        const val REACH_STOP = false
        /** The cloud may take a few seconds; past this the phone gives up and says so (D51). */
        const val ONLINE_TIMEOUT_MS = 7_000L
        const val READ_CHUNK_CHARS = 220
        val YES = setOf("yes", "yeah", "yes please", "ok", "okay", "sure", "go ahead")
        /** After two minutes the user may have forgotten: a tap describes the object again. */
        const val KNOWN_FOR_MS = 120_000L
        /** About 2 s at 30 fps. */
        const val SETTLE_FRAMES = 60L
    }
}
