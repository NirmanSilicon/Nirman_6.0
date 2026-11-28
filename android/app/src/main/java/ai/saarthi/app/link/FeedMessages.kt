package ai.saarthi.app.link

import ai.saarthi.app.beliefmap.BeliefMap
import ai.saarthi.app.beliefmap.ChangeDetector
import ai.saarthi.app.brief.BriefComposer
import ai.saarthi.app.geometry.Box
import ai.saarthi.app.geometry.Vec2
import ai.saarthi.app.hands.HandTracker
import ai.saarthi.app.orientation.Pose
import ai.saarthi.app.perception.Perception
import ai.saarthi.app.system2.Ledger
import ai.saarthi.app.system2.PlanarMotion
import ai.saarthi.app.system2.TorchCheck
import ai.saarthi.app.table.CameraModel
import ai.saarthi.app.table.Clock
import ai.saarthi.app.table.Direction
import ai.saarthi.app.table.TableGeometry
import ai.saarthi.app.worldmap.Relations
import android.os.SystemClock
import org.json.JSONArray
import org.json.JSONObject

/**
 * Builds the messages of the published feed, version 1 (`shared/feed/v1/README.md`). The same
 * messages go to the session file and over the link, so a recording is a replay of the feed.
 */
object FeedMessages {

    const val VERSION = 1

    fun message(type: String, t: Long = SystemClock.elapsedRealtime()): JSONObject =
        JSONObject().put("v", VERSION).put("type", type).put("t", t)

    fun hello(device: String, flavour: String, detectorModel: String, kit: Set<String>, cam: CameraModel?): JSONObject =
        message("hello")
            .put("device", device).put("flavour", flavour).put("detectorModel", detectorModel)
            .put("frame", JSONObject().put("w", 480).put("h", 640))
            .put("kit", JSONArray(kit.sorted()))
            .put("intrinsics", cam?.let { JSONObject().put("fx", round(it.fx, 1)).put("fy", round(it.fy, 1)).put("cx", round(it.cx, 1)).put("cy", round(it.cy, 1)) } ?: JSONObject.NULL)

    /** One detector run with the world map; [brief] says which objects would be named, and why not. */
    fun perception(snap: Perception.Snapshot, brief: BriefComposer.Brief, cam: CameraModel): JSONObject {
        val run = snap.run!!
        val saidTracks = brief.items.flatMap { it.trackIds }.toSet()
        val saidWorld = brief.items.flatMap { it.worldIds }.toSet()
        val trackReasons = brief.leftOut.filter { it.trackId != null }.associate { it.trackId!! to it.reason }
        val worldReasons = brief.leftOut.filter { it.worldId != null }.associate { it.worldId!! to it.reason }
        val msg = message("perception", snap.atMs)
            .put("frameNs", run.frameTimestampNs)
            .put("detectorMs", round(run.latencyMs, 1))
            .put("raw", JSONArray().apply {
                for (d in run.detections) put(JSONObject().put("label", d.label).put("score", round(d.score)).put("box", box(d.box)))
            })
            .put("tracks", JSONArray().apply {
                for (t in snap.tracks) put(
                    JSONObject()
                        .put("id", t.id).put("label", t.label).put("score", round(t.score)).put("box", box(t.box))
                        .put("hits", t.hits).put("confirmed", t.confirmed).put("presence", round(t.presence, 2))
                        .put("said", t.id in saidTracks).put("sure", t.id in brief.sureTracks)
                        .put("reason", trackReasons[t.id] ?: JSONObject.NULL)
                )
            })
        val pose = snap.pose ?: return msg.put("pose", JSONObject.NULL)
        val fwd = pose.forwardYawDeg
        val table = snap.table
        msg.put("pose", pose(pose))
        msg.put("table", table?.let { JSONObject().put("heightM", round(it.heightM, 3)).put("source", it.source.name.lowercase()).put("rulers", it.rulersNow) } ?: JSONObject.NULL)
        msg.put("view", if (table == null) JSONObject.NULL else JSONArray().apply {
            for (p in TableGeometry.footprint(cam, pose, table.heightM)) put(p?.let(::xy) ?: JSONObject.NULL)
        })
        val statable = snap.world.filter { it.statable }
        msg.put("world", JSONArray().apply {
            for (o in snap.world) {
                val pl = o.placement(fwd)
                val rel = Relations.of(o, statable, fwd)
                put(JSONObject()
                    .put("id", o.id).put("label", o.label).put("seen", o.seen.name.lowercase())
                    .put("track", o.track?.id ?: JSONObject.NULL)
                    .put("pos", pl?.let { xy(it.body) } ?: JSONObject.NULL)
                    .put("bearingDeg", o.bodyBearingDeg(fwd)?.let { round(it, 1) } ?: JSONObject.NULL)
                    .put("distM", pl?.let { round(it.distM, 2) } ?: JSONObject.NULL)
                    .put("reach", pl?.reach?.name?.lowercase() ?: JSONObject.NULL)
                    .put("clock", o.bodyBearingDeg(fwd)?.let { Clock.hour(it) } ?: JSONObject.NULL)
                    .put("direction", o.bodyBearingDeg(fwd)?.let { Direction.word(it) } ?: JSONObject.NULL)
                    .put("relation", rel?.let { JSONObject().put("rel", it.rel.phrase).put("to", it.anchorId) } ?: JSONObject.NULL)
                    .put("resting", o.resting).put("moving", o.moving).put("baseCutOff", o.baseCutOff)
                    .put("ageMs", snap.atMs - o.lastSeenMs)
                    .put("said", o.id in saidWorld).put("sure", o.statable)
                    .put("reason", worldReasons[o.id] ?: o.notStatable ?: JSONObject.NULL))
            }
        })
        return msg
    }

    /** One object's torch test (D38). */
    data class TorchReading(val worldId: Int, val label: String, val r: TorchCheck.Result)

    /** A torch test: [complete] = both frames taken; each object's gains, share and finding. */
    fun torch(ms: Long, complete: Boolean, readings: List<TorchReading>): JSONObject = message("torch")
        .put("ms", ms).put("complete", complete)
        .put("objects", JSONArray().apply {
            for (t in readings) put(JSONObject().put("world", t.worldId).put("label", t.label)
                .put("objectGain", round(t.r.objectGain, 3)).put("refGain", round(t.r.refGain, 3)).put("ref", t.r.ref)
                .put("share", round(t.r.share, 3)).put("saturated", round(t.r.saturated, 3))
                .put("finding", t.r.finding.name.lowercase()).put("unevenness", t.r.unevenness?.let { round(it, 3) } ?: JSONObject.NULL)
                .put("curved", t.r.curved).put("llr", round(t.r.llr, 2)).put("detail", t.r.detail))
        })

    /** The belief map: each object the user knows, where they believe it is (body frame), and its standing against the world. */
    fun belief(beliefs: List<BeliefMap.Belief>, statuses: List<ChangeDetector.Status>, forwardYawDeg: Float, heightM: Float): JSONArray {
        val st = statuses.associateBy { it.worldId }
        return JSONArray().apply {
            for (b in beliefs) {
                val s = st[b.worldId]
                val body = TableGeometry.worldToBody(b.unit * heightM, forwardYawDeg)
                put(JSONObject().put("world", b.worldId).put("label", b.label)
                    .put("pos", xy(body)).put("direction", direction(body))
                    .put("state", s?.state?.name?.lowercase() ?: "ok").put("evidenceMs", s?.evidenceMs ?: 0)
                    .put("note", s?.note ?: "").put("lostSaid", b.lostSaid).put("sinceMs", b.sinceMs))
            }
        }
    }

    /**
     * The false belief behind an alert (theory-of-mind panel, D44): what the user believed and when they
     * were told, how long the evidence held, and where the object is now. Body frame, at the alert's pose.
     */
    fun alertMind(a: ChangeDetector.Alert, forwardYawDeg: Float, heightM: Float): JSONObject {
        val o = JSONObject().put("evidenceMs", a.evidenceMs)
        a.before?.let { b ->
            val body = TableGeometry.worldToBody(b.unit * heightM, forwardYawDeg)
            o.put("believed", JSONObject().put("pos", xy(body)).put("direction", direction(body)).put("toldMs", b.sinceMs))
        }
        o.put("now", a.toWorldM?.let { w ->
            val body = TableGeometry.worldToBody(w, forwardYawDeg)
            JSONObject().put("pos", xy(body)).put("direction", direction(body))
        } ?: JSONObject.NULL)
        return o
    }

    /** A body-frame spot as `[x, y]`, and in plain words (alerts built outside this file). */
    fun xyOf(p: Vec2): JSONArray = xy(p)
    fun directionOf(body: Vec2): String = direction(body)

    /** "ahead", "slightly right", "right" … for a body-frame spot, as the world map's `direction`. */
    private fun direction(body: Vec2): String =
        Direction.word(Math.toDegrees(kotlin.math.atan2(body.x.toDouble(), body.y.toDouble())).toFloat())

    fun pose(p: Pose): JSONObject = JSONObject()
        .put("tiltDeg", round(p.tiltDeg, 1)).put("rollDeg", round(p.rollDeg, 1))
        .put("yawDeg", round(p.yawDeg, 1)).put("forwardYawDeg", round(p.forwardYawDeg, 1))
        .put("rotationDegS", round(p.rotationDegS, 1))

    /** One hand-tracker run; [tipsOnTable] = each hand's index fingertip on the table plane (body frame), if computable. */
    fun hands(r: HandTracker.Result, tipsOnTable: List<Vec2?>): JSONObject = message("hands")
        .put("frameNs", r.frameTimestampNs)
        .put("ms", round(r.latencyMs, 1))
        .put("hands", JSONArray().apply {
            r.hands.forEachIndexed { i, h ->
                put(JSONObject()
                    .put("side", h.side).put("score", round(h.score, 2)).put("box", box(h.box))
                    .put("landmarks", JSONArray().apply { for ((x, y) in h.landmarks) put(JSONArray().put(round(x)).put(round(y))) })
                    .put("tipOnTable", tipsOnTable.getOrNull(i)?.let(::xy) ?: JSONObject.NULL))
            }
        })

    fun brief(
        utterance: String?, text: String, brief: BriefComposer.Brief, settled: Boolean,
        tapToDecisionMs: Double, clipReady: Boolean,
    ): JSONObject = message("brief")
        .put("utterance", utterance ?: JSONObject.NULL)
        .put("text", text)
        .put("items", JSONArray().apply {
            for (i in brief.items) put(JSONObject().put("phrase", i.phrase).put("tracks", JSONArray(i.trackIds)).put("world", JSONArray(i.worldIds)))
        })
        .put("leftOut", JSONArray().apply {
            for (l in brief.leftOut) put(JSONObject().put("track", l.trackId ?: JSONObject.NULL).put("world", l.worldId ?: JSONObject.NULL)
                .put("label", l.label).put("reason", l.reason))
        })
        .put("waitedToSettle", settled)
        .put("tapToDecisionMs", round(tapToDecisionMs, 1))
        .put("clipReady", clipReady)

    /**
     * System 2 after one detector run (Phase 4): each assessed object's evidence and verdict, with the
     * ledger's bounds, so a display can draw the trace against the frame it came from.
     */
    fun system2(snap: Perception.Snapshot, ledger: Ledger, plane: Pair<Int, PlanarMotion.Result>?): JSONObject = message("system2")
        .put("frameNs", snap.frameTimestampNs)
        .put("plane", plane?.let { (id, r) ->
            JSONObject().put("world", id).put("ratio", round(r.ratio, 3)).put("motionPx", round(r.motionPx, 2))
                .put("ringPoints", r.ringPoints).put("boxPoints", r.boxPoints)
        } ?: JSONObject.NULL)
        .put("bounds", JSONObject().put("state", round(ledger.upper, 2)).put("reject", round(ledger.lower, 2)).put("priorReal", round(ledger.priorReal, 2)))
        .put("objects", JSONArray().apply {
            for (a in snap.reality.values.sortedBy { it.worldId }) {
                put(JSONObject()
                    .put("world", a.worldId).put("label", a.label).put("track", a.trackId ?: JSONObject.NULL)
                    .put("s1Score", a.s1Score?.let { round(it, 2) } ?: JSONObject.NULL)
                    .put("calibrated", JSONObject.NULL)
                    .put("llr", round(a.llr, 2)).put("pReal", round(a.pReal, 2))
                    .put("verdict", a.verdict.name.lowercase())
                    .put("doubt", a.doubt ?: JSONObject.NULL)
                    .put("screen", a.screen ?: JSONObject.NULL)
                    .put("size", a.size?.let { JSONObject().put("widthM", round(it.widthM, 3)).put("readings", it.readings).put("plausible", it.plausible) } ?: JSONObject.NULL)
                    .put("cues", JSONArray().apply {
                        for (c in a.cues) put(JSONObject().put("cue", c.cue.key).put("llr", round(c.llr, 2)).put("views", c.views).put("detail", c.detail)
                            .put("counted", c.cue !in a.uncounted))
                    }))
            }
        })

    fun link(state: String, spoken: Boolean): JSONObject = message("link").put("state", state).put("spoken", spoken)

    private fun box(b: Box) = JSONArray().put(round(b.left)).put(round(b.top)).put(round(b.right)).put(round(b.bottom))

    private fun xy(p: Vec2) = JSONArray().put(round(p.x)).put(round(p.y))

    fun round(x: Double, digits: Int = 3): Double {
        val f = Math.pow(10.0, digits.toDouble())
        return Math.round(x * f) / f
    }

    private fun round(x: Float, digits: Int = 3) = round(x.toDouble(), digits)
}
