package ai.saarthi.app.perception

import ai.saarthi.app.capture.Frame
import ai.saarthi.app.geometry.Box
import ai.saarthi.app.orientation.Orientation
import ai.saarthi.app.orientation.Pose
import ai.saarthi.app.system2.Assessment
import ai.saarthi.app.system2.Cue
import ai.saarthi.app.system2.Gray
import ai.saarthi.app.system2.RealityCheck
import ai.saarthi.app.system2.View
import ai.saarthi.app.table.CameraModel
import ai.saarthi.app.table.TableHeight
import ai.saarthi.app.worldmap.Scene
import ai.saarthi.app.worldmap.WorldMap
import ai.saarthi.app.worldmap.WorldObject
import android.content.Context
import android.os.SystemClock
import java.util.concurrent.atomic.AtomicReference

/**
 * The phone's fast perception tier: detector → tracker → table height → world map. Frames go in
 * from the camera thread; the newest view is always readable from any thread through [latest],
 * without waiting. Each detector run is placed with the phone's pose at that frame's time, never a
 * later one.
 */
class Perception(
    context: Context,
    detectorModel: String = FastDetector.MODEL,
    private val orientation: Orientation? = null,
    val camera: CameraModel = CameraModel.VIVO_480x640,
    /**
     * The speaking rules for one track among all tracks, given the hands in view and System 2's
     * assessments by track id (BriefComposer).
     */
    private val whyNotStatable: (Track, List<Track>, Long, List<Box>, Map<Int, Assessment>) -> String? = { _, _, _, _, _ -> null },
    /** The hand boxes nearest in time to the detector's frame. */
    private val handBoxes: () -> List<Box> = { emptyList() },
) {

    /** The world as of one detector run. */
    class Snapshot(
        val frameTimestampNs: Long,
        val atMs: Long,
        val tracks: List<Track>,
        val run: FastDetector.Result?,
        val world: List<WorldObject> = emptyList(),
        val pose: Pose? = null,
        val table: TableHeight.Estimate? = null,
        val hands: List<Box> = emptyList(),
        /** System 2's real-vs-picture assessments, by world id (Phase 4). */
        val reality: Map<Int, Assessment> = emptyMap(),
        /** System 2's cost in this run: grey frame plus checks, ms. */
        val system2Ms: Double = 0.0,
        /** Of which making the grey frame (0 when none was made). */
        val grayMs: Double = 0.0,
        /** The last [addEvidence] number whose evidence this run's assessments include. */
        val evidenceSeq: Int = 0,
    ) {
        /** What a sentence about this moment is judged from. Without the IMU, no world map positions. */
        fun scene(): Scene = if (pose == null) Scene.of(tracks, hands) else Scene(tracks, world, pose.forwardYawDeg, hands, reality)
    }

    private val detector = FastDetector(context, detectorModel)
    private val tracker = ObjectTracker()
    private val tableHeight = TableHeight()
    private val worldMap = WorldMap(camera)
    private val reality = RealityCheck()

    /** System 2's ledger, for its bounds (read-only outside the detector thread). */
    val ledger get() = reality.ledger
    /** The last run's assessments by track id: this run's speaking rules judge with evidence up to the previous frame. */
    private var realityByTrack: Map<Int, Assessment> = emptyMap()
    /**
     * System 2's pixel work runs in bursts, not every run (the ledger counts a new view at most every
     * 0.7 s anyway): one run keeps a grey frame, the next run compares its own with it, then nothing
     * for [PIXEL_PERIOD_MS]. Only while a standing kit object is in view. Detector thread only.
     */
    private var prevGray: Gray? = null
    private var prevGrayNs = 0L
    private var prevPose: Pose? = null
    private var burstMs = 0L

    /** Evidence measured off the detector thread (the torch test, D38), applied on the next run with a pose. */
    private class Evidence(val seq: Int, val worldId: Int, val cue: Cue, val llr: Float, val detail: String)
    private val evidence = java.util.concurrent.ConcurrentLinkedQueue<Evidence>()
    private val evidenceCount = java.util.concurrent.atomic.AtomicInteger()
    private var evidenceApplied = 0  // detector thread

    /** Queues one reading for System 2's ledger (any thread); returns its number, see [Snapshot.evidenceSeq]. */
    fun addEvidence(worldId: Int, cue: Cue, llr: Float, detail: String): Int {
        val seq = evidenceCount.incrementAndGet()
        evidence.add(Evidence(seq, worldId, cue, llr, detail))
        return seq
    }

    /**
     * While true, no grey frames for the pixel cues: the torch test changes the light between frames,
     * which motion tracking and the light-around-it cue would misread.
     */
    @Volatile var pixelHold = false

    /** The last planar-motion measurement (world id, result), for the session log; detector thread. */
    val lastPlane get() = reality.lastPlane
    private val latestRef = AtomicReference(Snapshot(0L, 0L, emptyList(), null))

    val error: String? get() = detector.error

    /** Minimum time between detector runs (thermal policy). */
    var detectorMinIntervalMs: Long
        get() = detector.minIntervalMs
        set(v) { detector.minIntervalMs = v }

    /** Called on the detector thread after every run. */
    var onSnapshot: (Snapshot) -> Unit = {}

    val latest: Snapshot get() = latestRef.get()

    /**
     * While true, frames are not given to the detector (tracks are kept; they expire only after
     * 1.5 s unseen). Used for the under-a-second while a spoken request is transcribed, because the
     * phone's two fast CPU cores cannot run both at full speed (D17).
     */
    @Volatile var paused = false

    fun onFrame(frame: Frame) {
        if (paused) return
        detector.offer(frame.bitmap, frame.timestampNs) { result ->
            val now = SystemClock.elapsedRealtime()
            val tracks = tracker.update(result.detections.map { it.copy(label = SpokenNames.kitLabel(it.label)) }, now)
            // The pose of this frame's moment; none if the sensors have no sample near it.
            val pose = orientation?.at(result.frameTimestampNs)?.takeIf { kotlin.math.abs(it.timestampNs - result.frameTimestampNs) <= POSE_MATCH_NS }
            val hands = handBoxes()
            var table: TableHeight.Estimate? = null
            var world = emptyList<WorldObject>()
            var assessed = emptyMap<Int, Assessment>()
            var s2Ms = 0.0
            var grayMs = 0.0
            if (pose != null) {
                // Only objects that pass every speaking rule may serve as rulers: a false one (or a picture) moves every distance.
                val prior = realityByTrack
                val seen = tracks.filter { it.confirmed && it.lastSeenMs == now && whyNotStatable(it, tracks, now, hands, prior) == null }.map { it.label to it.box }
                table = tableHeight.update(seen, camera, pose)
                world = worldMap.update(tracks, pose, table.heightM, now) { t -> whyNotStatable(t, tracks, now, hands, prior) }
                while (true) {
                    val e = evidence.poll() ?: break
                    // Each torch test measures the object afresh (it may have been swapped for its picture): it replaces the last.
                    if (e.cue == Cue.TORCH) reality.ledger.clear(e.worldId, e.cue)
                    reality.ledger.observe(e.worldId, e.cue, e.llr, e.detail, now, View(pose.yawDeg, pose.tiltDeg))
                    evidenceApplied = e.seq
                }
                val s0 = SystemClock.elapsedRealtimeNanos()
                val standing = world.any { it.track?.lastSeenMs == now && it.label in RealityCheck.STANDING }
                if (pixelHold) prevGray = null
                val pairAgeMs = (result.frameTimestampNs - prevGrayNs) / 1_000_000
                val second = prevGray != null && pairAgeMs <= RealityCheck.PAIR_MAX_MS
                var cur: Gray? = null
                if (standing && result.frame != null && !pixelHold && (second || now - burstMs >= PIXEL_PERIOD_MS)) {
                    cur = Gray.of(result.frame)
                    grayMs = (SystemClock.elapsedRealtimeNanos() - s0) / 1e6
                }
                assessed = reality.update(world, tracks, pose, now, cur.takeIf { second }, prevGray.takeIf { second }, pairAgeMs, prevPose, camera,
                    table.heightM.takeIf { table.source == TableHeight.Source.RULERS })
                if (second || cur == null) prevGray = null
                if (cur != null && !second) { prevGray = cur; prevGrayNs = result.frameTimestampNs; prevPose = pose; burstMs = now }
                s2Ms = (SystemClock.elapsedRealtimeNanos() - s0) / 1e6
                realityByTrack = assessed.values.filter { it.trackId != null }.associateBy { it.trackId!! }
            }
            val snap = Snapshot(result.frameTimestampNs, now, tracks, result, world, pose, table, hands, assessed, s2Ms, grayMs, evidenceApplied)
            latestRef.set(snap)
            onSnapshot(snap)
        }
    }

    fun close() = detector.close()

    private companion object {
        const val POSE_MATCH_NS = 250_000_000L
        const val PIXEL_PERIOD_MS = 500L
    }
}
