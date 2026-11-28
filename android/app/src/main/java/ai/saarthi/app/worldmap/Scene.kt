package ai.saarthi.app.worldmap

import ai.saarthi.app.geometry.Box
import ai.saarthi.app.perception.Track
import ai.saarthi.app.system2.Assessment

/**
 * Everything one sentence is judged from, as of one moment: the tracker's tracks, the world map,
 * the user's forward direction (null without the IMU), the hands in view (their boxes) and System 2's
 * real-vs-picture assessments by world id.
 */
data class Scene(
    val tracks: List<Track>,
    val world: List<WorldObject>,
    val forwardYawDeg: Float?,
    val hands: List<Box> = emptyList(),
    val reality: Map<Int, Assessment> = emptyMap(),
) {
    /** The assessments by live track id. */
    val realityByTrack: Map<Int, Assessment> get() = reality.values.filter { it.trackId != null }.associateBy { it.trackId!! }

    companion object {
        /**
         * A scene without a world map (no IMU, or a Phase 1 recording): every confirmed track is an
         * object in view, with no table position, so directions fall back to the frame's thirds.
         */
        fun of(tracks: List<Track>, hands: List<Box> = emptyList()) = Scene(
            tracks,
            tracks.filter { it.confirmed }.map {
                WorldObject(
                    it.id, it.label, Seen.IN_VIEW, it, null, null, null, null, null, it.firstSeenMs, it.lastSeenMs,
                    null, resting = false, moving = false, baseCutOff = false, lastBox = it.box,
                )
            },
            null,
            hands,
        )
    }
}
