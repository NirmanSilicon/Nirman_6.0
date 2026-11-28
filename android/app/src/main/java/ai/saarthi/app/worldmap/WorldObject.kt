package ai.saarthi.app.worldmap

import ai.saarthi.app.geometry.Box
import ai.saarthi.app.geometry.Vec2
import ai.saarthi.app.perception.Track
import ai.saarthi.app.table.Placement
import ai.saarthi.app.table.Reach
import ai.saarthi.app.table.TableGeometry

/** Whether the camera sees an object now. */
enum class Seen {
    /** Detected recently (its track is alive). */
    IN_VIEW,
    /** The camera has turned away from where it was: not seen, and not expected to be. */
    OUT_OF_VIEW,
    /** Where it was is in view, but the detector does not see it (hidden, moved, or missed: Phase 3 decides). */
    NOT_SEEN,
}

/**
 * One physical object or person in Saarthi's world map (PRD 5.1), as of one detector run.
 * Immutable: the world map publishes a fresh list after every run, readable from any thread.
 */
data class WorldObject(
    val id: Int,
    /** COCO class name ("dining table", "cell phone"); speech and screens rename it. */
    val label: String,
    val seen: Seen,
    /** The tracker's live track while in view, else null. */
    val track: Track?,
    /** Where its base meets the table, world frame (metres); null for people and without the IMU. */
    val world: Vec2?,
    /** Its base's left and right ends on the table, world frame; for relations ("behind the laptop"). */
    val worldLeft: Vec2?,
    val worldRight: Vec2?,
    /** Horizontal direction from the camera, world frame, degrees right of yaw 0; null without the IMU. */
    val worldBearingDeg: Float?,
    /** Reach zone, kept with hysteresis; null for people and without a table position. */
    val reach: Reach?,
    val firstSeenMs: Long,
    val lastSeenMs: Long,
    /** At its last sighting it passed every speaking rule (evidence, kit, screens, hands), else why not. */
    val notStatable: String?,
    /** Still on the table over the last half second or more (adapted from SS RestingStateVerifier). */
    val resting: Boolean,
    /** Its table position changed by more than [WorldMap.MOVING_M] within the last second. */
    val moving: Boolean,
    /** Its base was at the frame's bottom edge: the true base is nearer than [world]. */
    val baseCutOff: Boolean,
    val lastBox: Box,
) {
    val statable: Boolean get() = notStatable == null
    val isPerson: Boolean get() = label == "person"

    /** Where it is relative to the user's body, facing [forwardYawDeg]; null without a table position. */
    fun placement(forwardYawDeg: Float): Placement? =
        world?.let { Placement(TableGeometry.worldToBody(it, forwardYawDeg), reach ?: Reach.of(TableGeometry.worldToBody(it, forwardYawDeg).length)) }

    /** Direction from the user's forward, degrees, positive right; null without the IMU. */
    fun bodyBearingDeg(forwardYawDeg: Float): Float? =
        placement(forwardYawDeg)?.bearingDeg ?: worldBearingDeg?.let { TableGeometry.bodyBearing(it, forwardYawDeg) }
}
