package ai.saarthi.app.table

import ai.saarthi.app.geometry.Box
import ai.saarthi.app.orientation.Pose

/**
 * How high the camera is above the table: the one number that turns directions into distances
 * (PRD 5.0.1: phone-only reach zones; docs/SYSTEM2.md 4.3: reference objects as rulers).
 *
 * A kit object of known width at a known image width is at a known depth along the lens; its base
 * is then a known 3D point, and its height below the camera along gravity is the table's. Each
 * detector run takes the median over the rulers in view and moves the estimate a fifth of the way
 * there. Until a ruler has been seen, [DEFAULT_M] (a phone at chest level over a table, seated) is
 * used, and [source] says so. Not thread-safe: update from the detector thread.
 */
class TableHeight(private val defaultM: Float = DEFAULT_M) {

    enum class Source { DEFAULT, RULERS }

    data class Estimate(val heightM: Float, val source: Source, val rulersNow: Int)

    var current = Estimate(defaultM, Source.DEFAULT, 0)
        private set

    /** The latest single-ruler readings; the estimate is their median (D25). */
    private val readings = ArrayDeque<Float>()

    /** One detector run's sightings: (label, box) of confirmed objects. */
    fun update(objects: List<Pair<String, Box>>, cam: CameraModel, pose: Pose): Estimate {
        if (pose.fastRotation) return current.copy(rulersNow = 0).also { current = it }
        val heights = objects.mapNotNull { (label, box) -> fromRuler(label, box, cam, pose) }.sorted()
        if (heights.isEmpty()) return current.copy(rulersNow = 0).also { current = it }
        for (x in heights) {
            readings.addLast(x)
            if (readings.size > WINDOW) readings.removeFirst()
        }
        val sorted = readings.sorted()
        current = Estimate(sorted[sorted.size / 2], Source.RULERS, heights.size)
        return current
    }

    companion object {
        /** A phone at chest level, seated at a table: chest about 0.4 m above the table top (D20). */
        const val DEFAULT_M = 0.40f
        /** About 5 s of readings with two rulers in view: one bad box cannot swing the height (D25). */
        private const val WINDOW = 40
        private const val EDGE = 0.01f

        /**
         * Typical widths (m) of kit objects that are round or rigid enough to be rulers. Left out:
         * books and phones (sizes vary, often turned), the mouse (often turned sideways), the banana,
         * and the laptop: paper and notebooks are this detector's most common confident "laptop"
         * (D14; Vivo, 29 Oct: a notebook at 0.70 set the height), and a false ruler moves every
         * distance. The cup is a mug with its handle (D15 kit).
         */
        val WIDTH_M = mapOf(
            "bottle" to 0.070f, "cup" to 0.10f, "apple" to 0.075f, "orange" to 0.075f,
        )

        /** The camera's height above the surface [box]'s object stands on, if [label] is a ruler and fully in view. */
        fun fromRuler(label: String, box: Box, cam: CameraModel, pose: Pose): Float? {
            val widthM = WIDTH_M[label] ?: return null
            if (box.left <= EDGE || box.right >= 1f - EDGE || box.bottom >= 1f - EDGE) return null
            val widthPx = box.width * cam.w
            if (widthPx < 8f) return null
            val depth = cam.fx * widthM / widthPx
            val base = cam.ray((box.left + box.right) / 2f, box.bottom) * depth
            return (base dot pose.down).takeIf { it in 0.12f..1.0f }
        }
    }
}
