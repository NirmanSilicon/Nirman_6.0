package ai.saarthi.app.system2

import ai.saarthi.app.geometry.Box
import ai.saarthi.app.orientation.Pose
import ai.saarthi.app.table.CameraModel

/**
 * Physical plausibility, size (docs/SYSTEM2.md 4.3; D41): an object standing on the table has a real
 * width, from its box and the table geometry already built (the camera's height above the table and
 * its tilt). A detection whose width does not fit its class (a 2 cm "mouse", a 30 cm "apple") is a
 * misreading or a picture, and is not stated as that object.
 *
 * Only with the table height measured from rulers (never the default guess), the box fully in view
 * and its base below the horizon. Only a clear misfit counts (1.5 times outside the typical range):
 * an object held up from the table, lying down or half boxed measures too wide, and a wrong
 * "implausible" silences a real object. On three recorded sessions (30–31 Oct) this held back 0–1.5%
 * of kit sightings (a 2 cm "mouse", a 3 cm and a 34 cm "cup", 20–25 cm "apples", likely pictures on
 * the laptop). The laptop and phone are not checked: their boxes often cover only part of them (the
 * laptop measured 13–22 cm in 40–49% of readings). Support (does it rest on the table?) is not
 * checked: from one camera a floating object and a farther one look the same.
 */
object SizeCheck {

    /** Typical widths (m) a kit object's box shows, any way it is turned (D41). */
    val WIDTH_M: Map<String, ClosedFloatingPointRange<Float>> = mapOf(
        "apple" to 0.045f..0.13f,
        "cup" to 0.05f..0.17f,
        "bottle" to 0.04f..0.13f,
        "mouse" to 0.035f..0.14f,
        "banana" to 0.03f..0.25f,
        "book" to 0.10f..0.45f,
    )

    /** The width of the object in [box] (m), standing on a table [heightM] below the camera; null if not measurable. */
    fun widthM(box: Box, cam: CameraModel, pose: Pose, heightM: Float): Float? {
        if (box.left <= EDGE || box.right >= 1f - EDGE || box.bottom >= 1f - EDGE) return null
        val ray = cam.ray((box.left + box.right) / 2f, box.bottom)
        val downward = ray dot pose.down
        if (downward <= MIN_DOWNWARD) return null
        // The ray's z is 1, so the base point's depth along the lens is the distance along it.
        val depth = heightM / downward
        return box.width * cam.w * depth / cam.fx
    }

    /** Whether a median width fits [label]; null for classes without a range. */
    fun plausible(label: String, widthM: Float): Boolean? =
        WIDTH_M[label]?.let { widthM >= it.start / MARGIN && widthM <= it.endInclusive * MARGIN }

    /** How far outside the typical range a width must be to count as a misfit. */
    const val MARGIN = 1.5f

    private const val EDGE = 0.01f
    /** Base rays nearer the horizon than this give unstable distances. */
    private const val MIN_DOWNWARD = 0.08f
    /** Readings kept per object, and needed before judging. */
    const val KEEP = 9
    const val NEEDED = 5
}
