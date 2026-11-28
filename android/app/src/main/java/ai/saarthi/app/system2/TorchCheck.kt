package ai.saarthi.app.system2

import ai.saarthi.app.geometry.Box

/**
 * The torch test (D38; the idea of light-reflection liveness, "Face Flashing", Tang et al., NDSS
 * 2018, applied to objects): **a screen makes its own light; a real object only reflects it.**
 *
 * With the exposure locked, one frame is taken with the phone's torch off and one with it on. The
 * object's brightness gain (on ÷ off) is compared with the table's. A ratio of brightnesses cancels
 * each surface's colour (a dark mug brightens by the same factor as a white one at the same
 * distance), so a real object gains about as much as the table it stands on, while a picture on a
 * screen barely changes: its light comes from behind the glass. [share] = the object's extra light
 * as a share of the table's (1 ≈ real, 0 ≈ a screen).
 *
 * **Shape (D39).** The torch shines from beside the lens, so on a rounded object it adds most light
 * where the surface faces the camera and little where it turns away, while the room's light falls
 * from above: across a real apple the gain changes from middle to rim. A flat print faces one way
 * everywhere, so its gain is even. [unevenness] = the spread of the gain over the middle and four
 * rim zones of the object's ellipse, as a share of the typical gain. Uneven = a 3D object.
 *
 * Limits, stated openly: an even reading does not prove a print (a flat real object is even too),
 * so evenness is never evidence of a picture, only the absence of "3D"; an object much farther
 * from the torch than the table reads lower (light falls with distance squared), so only a clearly
 * low share counts as "emits"; in a very bright place the torch adds too little to measure.
 */
object TorchCheck {

    enum class Finding { REFLECTS, EMITS, UNCLEAR, NO_LIGHT }

    data class Result(
        val objectGain: Float,
        val refGain: Float,
        /** Which reference was used: "table" (the table outside every box) or "scene" (the whole frame outside every box). */
        val ref: String,
        val share: Float,
        /** Share of the object's pixels saturated with the torch on. */
        val saturated: Float,
        val finding: Finding,
        /** How unevenly the torch lit the object across its middle and rim (0 = even, flat); null if not measurable. */
        val unevenness: Float? = null,
    ) {
        /** Reflects the torch and is lit unevenly by it: a rounded, real object (D39). */
        val curved: Boolean get() = finding == Finding.REFLECTS && unevenness != null && unevenness >= CURVED_UNEVENNESS

        val llr: Float get() = when (finding) {
            Finding.EMITS -> EMITS_LLR
            Finding.REFLECTS -> REFLECTS_LLR + if (curved) CURVED_LLR else 0f
            else -> 0f
        }

        val detail: String get() = when (finding) {
            Finding.EMITS -> "gives off its own light: my torch barely changed it (%.2f of the table's gain)".format(share)
            Finding.REFLECTS -> "reflects my torch like the table does (%.2f of the table's gain)".format(share) +
                if (curved) ", unevenly across it: rounded (%.2f)".format(unevenness) else ", evenly (%.2f)".format(unevenness ?: 0f)
            Finding.UNCLEAR -> "the torch test was unclear (%.2f of the table's gain)".format(share)
            Finding.NO_LIGHT -> "too bright here for my torch to measure"
        }
    }

    /**
     * [off] and [on]: grey frames with the torch off and on. [offBox] and [onBox]: the object's box in
     * each. [table]: the table's box, if detected. [holes]: every other object's box (screens
     * included), left out of the reference. Null if a region has too few pixels.
     */
    fun measure(off: Gray, on: Gray, offBox: Box, onBox: Box, table: Box?, holes: List<Box>): Result? {
        val objOff = regionMedian(off, inner(offBox), emptyList()) ?: return null
        val objOn = regionMedian(on, inner(onBox), emptyList()) ?: return null
        val sat = saturatedShare(on, inner(onBox))
        val cut = (holes + offBox + onBox).map { grow(it, HOLE_GROW) }
        val tableRef = table?.let { t ->
            val a = regionMedian(off, t, cut)
            val b = regionMedian(on, t, cut)
            if (a != null && b != null) a to b else null
        }
        val (refOff, refOn) = tableRef ?: run {
            val whole = Box(0f, 0f, 1f, 1f)
            (regionMedian(off, whole, cut) ?: return null) to (regionMedian(on, whole, cut) ?: return null)
        }
        val objGain = (objOn + 1f) / (objOff + 1f)
        val refGain = (refOn + 1f) / (refOff + 1f)
        val lit = refGain - 1f
        val share = if (lit > 0f) (objGain - 1f) / lit else 0f
        val finding = when {
            lit < MIN_LIT -> Finding.NO_LIGHT
            sat > MAX_SATURATED -> Finding.UNCLEAR
            share <= EMITS_SHARE -> Finding.EMITS
            share >= REFLECTS_SHARE -> Finding.REFLECTS
            else -> Finding.UNCLEAR
        }
        return Result(objGain, refGain, if (tableRef != null) "table" else "scene", share, sat, finding, unevenness(off, on, offBox, onBox))
    }

    /**
     * The spread of the torch's gain over five zones of the object's inscribed ellipse (the middle;
     * the right, lower, left and upper rim), relative to their median gain. Each zone is placed in
     * each frame's own box, so a small shift of the phone between the frames moves the zones with it.
     */
    fun unevenness(off: Gray, on: Gray, offBox: Box, onBox: Box): Float? {
        val gains = ZONES.map { z ->
            val a = zoneMedian(off, offBox, z) ?: return null
            val b = zoneMedian(on, onBox, z) ?: return null
            (b + 1f) / (a + 1f) - 1f
        }
        val typical = gains.sorted()[gains.size / 2]
        if (typical <= 0f) return null
        return (gains.max() - gains.min()) / typical
    }

    /** A zone of a box's inscribed ellipse, in its coordinates (u, v from -1 to 1; v down). */
    private class Zone(val rMin: Float, val rMax: Float, val angleDeg: Float?)

    private val ZONES = listOf(Zone(0f, 0.35f, null)) + listOf(0f, 90f, 180f, 270f).map { Zone(0.55f, 0.9f, it) }

    private fun zoneMedian(g: Gray, b: Box, z: Zone): Float? {
        val hist = IntArray(256)
        var n = 0
        val x0 = (b.left * g.w).toInt().coerceIn(0, g.w)
        val x1 = (b.right * g.w).toInt().coerceIn(0, g.w)
        val y0 = (b.top * g.h).toInt().coerceIn(0, g.h)
        val y1 = (b.bottom * g.h).toInt().coerceIn(0, g.h)
        val cx = (b.left + b.right) / 2f
        val cy = (b.top + b.bottom) / 2f
        for (y in y0 until y1) for (x in x0 until x1) {
            val u = (((x + 0.5f) / g.w) - cx) / (b.width / 2f)
            val v = (((y + 0.5f) / g.h) - cy) / (b.height / 2f)
            val r = kotlin.math.sqrt(u * u + v * v)
            if (r < z.rMin || r > z.rMax) continue
            if (z.angleDeg != null) {
                val a = Math.toDegrees(kotlin.math.atan2(v, u).toDouble()).toFloat()
                var d = kotlin.math.abs(a - z.angleDeg) % 360f
                if (d > 180f) d = 360f - d
                if (d > 45f) continue
            }
            hist[g.px[y * g.w + x].toInt().coerceIn(0, 255)]++
            n++
        }
        if (n < MIN_ZONE_PIXELS) return null
        var acc = 0
        for (i in 0..255) { acc += hist[i]; if (acc * 2 >= n) return i.toFloat() }
        return 255f
    }

    /** The middle of a box (its edges often hold background). */
    private fun inner(b: Box): Box {
        val dx = b.width * (1f - INNER) / 2f
        val dy = b.height * (1f - INNER) / 2f
        return Box(b.left + dx, b.top + dy, b.right - dx, b.bottom - dy)
    }

    private fun grow(b: Box, f: Float): Box {
        val dx = b.width * (f - 1f) / 2f
        val dy = b.height * (f - 1f) / 2f
        return Box(b.left - dx, b.top - dy, b.right + dx, b.bottom + dy)
    }

    /** Median brightness inside [b] (0..1 of the frame) and outside every hole; null if fewer than [MIN_PIXELS]. */
    fun regionMedian(g: Gray, b: Box, holes: List<Box>): Float? {
        val hist = IntArray(256)
        var n = 0
        forEachPixel(g, b, holes) { v -> hist[v.toInt().coerceIn(0, 255)]++; n++ }
        if (n < MIN_PIXELS) return null
        var acc = 0
        for (i in 0..255) { acc += hist[i]; if (acc * 2 >= n) return i.toFloat() }
        return 255f
    }

    private fun saturatedShare(g: Gray, b: Box): Float {
        var n = 0
        var s = 0
        forEachPixel(g, b, emptyList()) { v -> n++; if (v >= SATURATED) s++ }
        return if (n == 0) 0f else s.toFloat() / n
    }

    private inline fun forEachPixel(g: Gray, b: Box, holes: List<Box>, f: (Float) -> Unit) {
        val x0 = (b.left * g.w).toInt().coerceIn(0, g.w)
        val x1 = (b.right * g.w).toInt().coerceIn(0, g.w)
        val y0 = (b.top * g.h).toInt().coerceIn(0, g.h)
        val y1 = (b.bottom * g.h).toInt().coerceIn(0, g.h)
        for (y in y0 until y1) {
            val fy = (y + 0.5f) / g.h
            for (x in x0 until x1) {
                val fx = (x + 0.5f) / g.w
                if (holes.any { fx >= it.left && fx <= it.right && fy >= it.top && fy <= it.bottom }) continue
                f(g.px[y * g.w + x])
            }
        }
    }

    /**
     * Starting values (D38), to be calibrated on the team's measurement (real apple, laptop picture,
     * phone picture). A screen's share should sit near 0, a real object's near 1.
     */
    const val EMITS_SHARE = 0.30f
    const val REFLECTS_SHARE = 0.60f
    /** The table must brighten by at least this much (10 %), or the torch made no measurable difference. */
    const val MIN_LIT = 0.10f
    /** "Emits light" decides alone (a screen proven by physics); "reflects" only supports "real" (a print reflects too). */
    const val EMITS_LLR = -4.5f
    const val REFLECTS_LLR = 2.0f
    /**
     * Uneven torch light = rounded (D39). Starting value, to calibrate on the team's next run with
     * real apples and a print; with "reflects" it reaches "real" (2.0 + 1.5 > 2.94).
     */
    const val CURVED_UNEVENNESS = 0.35f
    const val CURVED_LLR = 1.5f
    private const val MIN_ZONE_PIXELS = 12
    private const val INNER = 0.6f
    private const val HOLE_GROW = 1.15f
    private const val MIN_PIXELS = 40
    private const val SATURATED = 250f
    private const val MAX_SATURATED = 0.25f
}
