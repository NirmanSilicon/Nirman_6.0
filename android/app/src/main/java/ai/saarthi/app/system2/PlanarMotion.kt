package ai.saarthi.app.system2

// Lucas-Kanade tracking and the least-squares affine fit are adapted from SecondSense
// inference/decode/OpticalFlow.kt and GroundFlowConsistency.kt (owners' permission, commit
// cc122ea). Changed: a two-level pyramid (frames ~200 ms apart move further than the single-scale
// window follows); windows without texture are rejected by their smallest gradient eigenvalue;
// the affine fit drops outliers and refits; the test compares an object's points with the ring
// around it (is it flat with its surroundings?) instead of a floor band with the floor.

import ai.saarthi.app.geometry.Box
import android.graphics.Bitmap
import kotlin.math.abs
import kotlin.math.floor
import kotlin.math.hypot
import kotlin.math.sqrt

/** A small grey image, 0..255, row-major. */
class Gray(val w: Int, val h: Int, val px: FloatArray) {

    operator fun get(x: Int, y: Int) = px[y * w + x]

    /** The pyramid's upper level, made once per frame (the previous run's frame is reused). */
    val halfLevel: Gray by lazy { half() }

    /** Central-difference gradients, made once per frame (Lucas-Kanade needs the earlier frame's). */
    val gx: FloatArray by lazy { FloatArray(w * h).also { g -> for (y in 0 until h) for (x in 1 until w - 1) g[y * w + x] = (px[y * w + x + 1] - px[y * w + x - 1]) / 2f } }
    val gy: FloatArray by lazy { FloatArray(w * h).also { g -> for (y in 1 until h - 1) for (x in 0 until w) g[y * w + x] = (px[(y + 1) * w + x] - px[(y - 1) * w + x]) / 2f } }

    /** Half size, by 2 x 2 averaging (the pyramid's upper level). */
    fun half(): Gray {
        val hw = w / 2
        val hh = h / 2
        val out = FloatArray(hw * hh)
        for (y in 0 until hh) for (x in 0 until hw) {
            val i = 2 * y * w + 2 * x
            out[y * hw + x] = (px[i] + px[i + 1] + px[i + w] + px[i + w + 1]) / 4f
        }
        return Gray(hw, hh, out)
    }

    /** Mean of the pixels inside [b] (pixel box) and not inside any of [holes]. */
    fun mean(b: FloatArray, holes: List<FloatArray> = emptyList()): Float? {
        var sum = 0.0
        var n = 0
        for (y in b[1].toInt().coerceAtLeast(0) until b[3].toInt().coerceAtMost(h)) {
            for (x in b[0].toInt().coerceAtLeast(0) until b[2].toInt().coerceAtMost(w)) {
                if (holes.any { x >= it[0] && x <= it[2] && y >= it[1] && y <= it[3] }) continue
                sum += px[y * w + x]; n++
            }
        }
        return if (n == 0) null else (sum / n).toFloat()
    }

    /** Median brightness of the whole image (by histogram). */
    fun median(): Float {
        val hist = IntArray(256)
        for (v in px) hist[v.toInt().coerceIn(0, 255)]++
        var acc = 0
        for (i in 0..255) { acc += hist[i]; if (acc * 2 >= px.size) return i.toFloat() }
        return 255f
    }

    companion object {
        /** Scales [bitmap] to [w] x [h] and converts it to grey (Rec. 601 luma). */
        fun of(bitmap: Bitmap, w: Int = W, h: Int = H): Gray {
            val scaled = Bitmap.createScaledBitmap(bitmap, w, h, true)
            val pixels = IntArray(w * h)
            scaled.getPixels(pixels, 0, w, 0, 0, w, h)
            if (scaled !== bitmap) scaled.recycle()
            val out = FloatArray(w * h)
            for (i in pixels.indices) {
                val p = pixels[i]
                out[i] = 0.299f * ((p shr 16) and 0xFF) + 0.587f * ((p shr 8) and 0xFF) + 0.114f * (p and 0xFF)
            }
            return Gray(w, h, out)
        }

        /** Half the app's 480 x 640 frame. */
        const val W = 240
        const val H = 320
    }
}

/**
 * "Moves as one plane" (docs/SYSTEM2.md 4.2): when the view moves, every point of a flat picture
 * moves with its surroundings (one affine motion fits them all), while a real object standing in
 * front of its surroundings moves differently (parallax). Tracks a grid of points in a ring around
 * the object's box, fits the ring's affine motion, and measures how far the object's own points
 * stray from it, relative to how far the view moved.
 *
 * Starting values from the team's clips of 31 Oct (tools/system2_cue_study.py, development data):
 * ratio ≤ 0.15 in 72-83% of picture views and 4-7% of real-apple views; ≥ 0.30 in 64-85% of real
 * views and about 10% of picture views (OpenCV study). The phone version on 25 recorded pairs (a
 * sweep, D36): real apples 6/12 stand out (≥ 0.45), 0 read flat; pictures 5/8 flat, 1 stands out;
 * the rest can't tell. Only for objects that stand up (a real book lies flat).
 */
object PlanarMotion {

    /** One measurement: [ratio] = median stray of the object's points / median motion of the ring. */
    data class Result(val ratio: Float, val motionPx: Float, val ringPoints: Int, val boxPoints: Int)

    /** Tuning: texture needed to follow a point, and how many ring points make a reading trustworthy. */
    data class Params(val minEig: Double = MIN_EIG, val minRing: Int = MIN_RING)

    /**
     * [box] and [others] are normalised boxes; [others] (other objects) are cut out of the ring.
     * [rot] = the motion the phone's turning alone causes (from the gyro); it is subtracted from every
     * tracked point, so only the motion from the phone shifting is judged (turning gives no parallax).
     * Null when the phone hardly shifted or there is too little texture to tell.
     */
    fun measure(prev: Gray, cur: Gray, box: Box, others: List<Box>, p: Params = Params(), rot: RotationFlow? = null): Result? {
        val w = cur.w.toFloat()
        val h = cur.h.toFloat()
        val b = floatArrayOf(box.left * w, box.top * h, box.right * w, box.bottom * h)
        val cx = (b[0] + b[2]) / 2f
        val cy = (b[1] + b[3]) / 2f
        val bw = b[2] - b[0]
        val bh = b[3] - b[1]
        if (bw < 6f || bh < 6f) return null
        val holes = others.map { floatArrayOf(it.left * w - 2, it.top * h - 2, it.right * w + 2, it.bottom * h + 2) } +
            listOf(floatArrayOf(b[0] - 2, b[1] - 2, b[2] + 2, b[3] + 2))
        val r = floatArrayOf((cx - bw * RING / 2).coerceAtLeast(0f), (cy - bh * RING / 2).coerceAtLeast(0f),
            (cx + bw * RING / 2).coerceAtMost(w - 1), (cy + bh * RING / 2).coerceAtMost(h - 1))

        val pyrPrev = listOf(prev, prev.halfLevel)
        val pyrCur = listOf(cur, cur.halfLevel)
        val ring = ArrayList<FloatArray>()  // x, y, dx, dy
        grid(r[0], r[1], r[2], r[3], RING_GRID) { x, y ->
            if (holes.none { x >= it[0] && x <= it[2] && y >= it[1] && y <= it[3] }) track(pyrPrev, pyrCur, x, y, p.minEig)?.let { val (rx, ry) = rot?.at(x, y) ?: (0f to 0f); ring += floatArrayOf(x, y, it.first - rx, it.second - ry) }
        }
        if (ring.size < p.minRing) return null
        val motion = median(ring.map { hypot(it[2], it[3]) })
        if (motion < (if (rot != null) MIN_SHIFT_PX else MIN_MOTION_PX)) return null
        val ax = fitRobust(ring, 2) ?: return null
        val ay = fitRobust(ring, 3) ?: return null

        val stray = ArrayList<Float>()
        grid(cx - bw * INNER / 2, cy - bh * INNER / 2, cx + bw * INNER / 2, cy + bh * INNER / 2, BOX_GRID) { x, y ->
            track(pyrPrev, pyrCur, x, y, p.minEig)?.let { (fx, fy) ->
                val (rx, ry) = rot?.at(x, y) ?: (0f to 0f)
                val dx = fx - rx
                val dy = fy - ry
                stray += hypot(dx - (ax[0] * x + ax[1] * y + ax[2]), dy - (ay[0] * x + ay[1] * y + ay[2]))
            }
        }
        if (stray.size < MIN_BOX) return null
        return Result(median(stray) / maxOf(motion, 0.5f), motion, ring.size, stray.size)
    }

    private inline fun grid(x0: Float, y0: Float, x1: Float, y1: Float, n: Int, f: (Float, Float) -> Unit) {
        for (j in 0 until n) for (i in 0 until n) f(x0 + (x1 - x0) * i / (n - 1), y0 + (y1 - y0) * j / (n - 1))
    }

    /** Pyramidal Lucas-Kanade: coarse level first, refined at full resolution. */
    fun track(prev: List<Gray>, cur: List<Gray>, x: Float, y: Float, minEig: Double = MIN_EIG): Pair<Float, Float>? {
        var u = 0f
        var v = 0f
        for (lvl in prev.indices.reversed()) {
            val s = (1 shl lvl).toFloat()
            u *= if (lvl == prev.lastIndex) 0f else 2f
            v *= if (lvl == prev.lastIndex) 0f else 2f
            val (du, dv) = trackLevel(prev[lvl], cur[lvl], x / s, y / s, u, v, minEig) ?: return null
            u = du; v = dv
        }
        return u to v
    }

    private fun trackLevel(p: Gray, c: Gray, x0: Float, y0: Float, u0: Float, v0: Float, minEigOk: Double): Pair<Float, Float>? {
        val w = p.w
        val xi = x0.toInt()
        val yi = y0.toInt()
        val x1 = (xi - WIN).coerceAtLeast(1)
        val x2 = (xi + WIN + 1).coerceAtMost(w - 1)
        val y1 = (yi - WIN).coerceAtLeast(1)
        val y2 = (yi + WIN + 1).coerceAtMost(p.h - 1)
        if (x2 - x1 < 5 || y2 - y1 < 5) return null
        val gx = p.gx
        val gy = p.gy
        val pp = p.px
        val cp = c.px
        var sxx = 0f; var sxy = 0f; var syy = 0f
        for (y in y1 until y2) {
            var i = y * w + x1
            for (x in x1 until x2) {
                val ix = gx[i]; val iy = gy[i]
                sxx += ix * ix; sxy += ix * iy; syy += iy * iy
                i++
            }
        }
        val n = ((x2 - x1) * (y2 - y1)).toFloat()
        // Smallest eigenvalue of the per-pixel gradient matrix: too small = no texture to follow.
        val a = sxx / n; val bxy = sxy / n; val d = syy / n
        val minEig = (a + d) / 2 - sqrt(((a - d) / 2) * ((a - d) / 2) + bxy * bxy)
        if (minEig < minEigOk) return null
        val det = sxx * syy - sxy * sxy
        var u = u0
        var v = v0
        for (iter in 0 until ITERS) {
            // A window moves by one translation, so its sub-pixel weights are the same for every pixel.
            val fxf = floor(u); val fyf = floor(v)
            val ox = fxf.toInt(); val oy = fyf.toInt()
            if (x1 + ox < 0 || y1 + oy < 0 || x2 + ox + 1 >= c.w || y2 + oy + 1 >= c.h) return null
            val fx = u - fxf; val fy = v - fyf
            val w00 = (1 - fx) * (1 - fy); val w01 = fx * (1 - fy); val w10 = (1 - fx) * fy; val w11 = fx * fy
            var sxt = 0f; var syt = 0f
            for (y in y1 until y2) {
                var i = y * w + x1
                var j = (y + oy) * c.w + x1 + ox
                for (x in x1 until x2) {
                    val warped = cp[j] * w00 + cp[j + 1] * w01 + cp[j + c.w] * w10 + cp[j + c.w + 1] * w11
                    val it = warped - pp[i]
                    sxt += gx[i] * it; syt += gy[i] * it
                    i++; j++
                }
            }
            val du = (syy * -sxt - sxy * -syt) / det
            val dv = (sxx * -syt - sxy * -sxt) / det
            u += du; v += dv
            if (abs(du) < EPS && abs(dv) < EPS) break
        }
        return u to v
    }

    /** Affine fit of one flow component (column [k] of the points), dropping points far off the fit, twice. */
    private fun fitRobust(pts: List<FloatArray>, k: Int): FloatArray? {
        var use = pts
        var c = fitAffine(use, k) ?: return null
        repeat(2) {
            val res = use.map { abs(it[k] - (c[0] * it[0] + c[1] * it[1] + c[2])) }
            val cut = maxOf(OUTLIER_PX, 2.5f * median(res))
            val kept = use.filterIndexed { i, _ -> res[i] <= cut }
            if (kept.size < 8) return c
            use = kept
            c = fitAffine(use, k) ?: return c
        }
        return c
    }

    /** Least-squares [c0, c1, c2] for value ≈ c0·x + c1·y + c2 (SecondSense GroundFlowConsistency.fitAffine). */
    private fun fitAffine(pts: List<FloatArray>, k: Int): FloatArray? {
        var sxx = 0.0; var sxy = 0.0; var sx = 0.0; var syy = 0.0; var sy = 0.0
        var sxv = 0.0; var syv = 0.0; var sv = 0.0
        for (p in pts) {
            val x = p[0].toDouble(); val y = p[1].toDouble(); val v = p[k].toDouble()
            sxx += x * x; sxy += x * y; sx += x; syy += y * y; sy += y
            sxv += x * v; syv += y * v; sv += v
        }
        val m = arrayOf(doubleArrayOf(sxx, sxy, sx, sxv), doubleArrayOf(sxy, syy, sy, syv), doubleArrayOf(sx, sy, pts.size.toDouble(), sv))
        for (col in 0..2) {
            var piv = col
            for (r in col + 1..2) if (abs(m[r][col]) > abs(m[piv][col])) piv = r
            if (abs(m[piv][col]) < 1e-9) return null
            val t = m[col]; m[col] = m[piv]; m[piv] = t
            for (r in 0..2) {
                if (r == col) continue
                val f = m[r][col] / m[col][col]
                for (q in col..3) m[r][q] -= f * m[col][q]
            }
        }
        return floatArrayOf((m[0][3] / m[0][0]).toFloat(), (m[1][3] / m[1][1]).toFloat(), (m[2][3] / m[2][2]).toFloat())
    }

    private fun median(v: List<Float>): Float = v.sorted()[v.size / 2]

    /** The ring spans this many box sizes (1.3 separated best on the clips; 1.5 caught the next object). */
    const val RING = 1.3f
    private const val INNER = 0.6f
    private const val RING_GRID = 12
    private const val BOX_GRID = 5
    /** Fewer ring points than this (a picture filling a plain screen) = can't tell: noisy points made pictures "stand out" (31 Oct sweep). */
    const val MIN_RING = 12
    private const val MIN_BOX = 5
    /** Below this ring motion (px at 240 x 320) the view did not move enough to tell. */
    const val MIN_MOTION_PX = 0.75f
    /**
     * With the turning subtracted, the phone must have **shifted** at least this much (px at 240 x 320)
     * for a reading: a real object barely shows parallax under a smaller shift, and would read flat.
     */
    const val MIN_SHIFT_PX = 1.0f
    private const val WIN = 7
    private const val ITERS = 5
    private const val EPS = 0.01f
    // Per-pixel grey-level² units; screens are smooth (picture pairs of 31 Oct: median 0.2-0.4 around the apple).
    const val MIN_EIG = 1.0
    private const val OUTLIER_PX = 1.0f

    /** Per-view weights (log-likelihood ratios, positive = real); conservative against the clip rates. */
    const val FLAT_RATIO = 0.15f
    const val STANDS_OUT_RATIO = 0.45f
    const val FLAT_LLR = -1.6f
    const val STANDS_OUT_LLR = 1.4f
}
