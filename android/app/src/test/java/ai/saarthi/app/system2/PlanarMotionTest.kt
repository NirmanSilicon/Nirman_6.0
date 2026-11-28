package ai.saarthi.app.system2

import ai.saarthi.app.geometry.Box
import org.junit.Assert.assertNotNull
import org.junit.Assert.assertNull
import org.junit.Assert.assertTrue
import org.junit.Test
import java.io.DataInputStream
import java.nio.ByteBuffer
import java.nio.ByteOrder
import java.util.zip.GZIPInputStream
import kotlin.math.sin

class PlanarMotionTest {

    /** A smooth random-looking texture, so every window has something to follow. */
    private fun texture(x: Float, y: Float, seed: Float = 0f) =
        128f + 50f * sin(0.37f * x + seed) * sin(0.29f * y) + 40f * sin(0.11f * x + 0.23f * y + seed) + 25f * sin(0.71f * y - 0.53f * x)

    private fun image(w: Int, h: Int, f: (Float, Float) -> Float) =
        Gray(w, h, FloatArray(w * h) { i -> f((i % w).toFloat(), (i / w).toFloat()) })

    private val box = Box(0.4f, 0.4f, 0.6f, 0.6f)

    @Test
    fun `a picture moving with its surroundings is flat`() {
        val prev = image(240, 320) { x, y -> texture(x, y) }
        val cur = image(240, 320) { x, y -> texture(x - 3f, y - 2f) }   // everything shifted together
        val r = PlanarMotion.measure(prev, cur, box, emptyList())
        assertNotNull(r)
        assertTrue("ratio ${r!!.ratio}", r.ratio <= PlanarMotion.FLAT_RATIO)
    }

    @Test
    fun `an object moving differently from its surroundings stands out`() {
        fun scene(dx: Float, ox: Float) = image(240, 320) { x, y ->
            val inObject = x in 96f + ox..144f + ox && y in 128f..192f
            if (inObject) texture(x - ox, y, seed = 1.7f) else texture(x - dx, y)
        }
        // Background moves 3 px, the object 6 px (parallax: nearer the camera).
        val r = PlanarMotion.measure(scene(0f, 0f), scene(3f, 6f), box, emptyList())
        assertNotNull(r)
        assertTrue("ratio ${r!!.ratio}", r.ratio >= PlanarMotion.STANDS_OUT_RATIO)
    }

    private val cam = ai.saarthi.app.table.CameraModel.VIVO_480x640
    private val level = ai.saarthi.app.geometry.Vec3(0f, 1f, 0f)  // gravity along the image's down: a level camera

    @Test
    fun `turning right moves the view left, by the focal length times the angle`() {
        val p0 = ai.saarthi.app.orientation.Orientation.pose(level, yawDeg = 0f)
        val p1 = ai.saarthi.app.orientation.Orientation.pose(level, yawDeg = 2f)
        val (dx, dy) = RotationFlow.between(p0, p1, cam, 240, 320)!!.at(120f, 160f)
        assertTrue("dx $dx", kotlin.math.abs(dx + 237f * kotlin.math.tan(Math.toRadians(2.0)).toFloat()) < 0.3f)
        assertTrue("dy $dy", kotlin.math.abs(dy) < 0.3f)
    }

    @Test
    fun `pure turning gives no reading, though everything moved together`() {
        // Team test, 31 Oct: turning the phone made a real cup and the wall behind it move as one.
        val p0 = ai.saarthi.app.orientation.Orientation.pose(level, yawDeg = 0f)
        val p1 = ai.saarthi.app.orientation.Orientation.pose(level, yawDeg = 1f)
        val rot = RotationFlow.between(p0, p1, cam, 240, 320)!!
        val shift = -rot.at(120f, 160f).first
        val prev = image(240, 320) { x, y -> texture(x, y) }
        val cur = image(240, 320) { x, y -> texture(x + shift, y) }
        assertNotNull("without the gyro it looks like motion", PlanarMotion.measure(prev, cur, box, emptyList()))
        assertNull("with the turning subtracted, nothing is left to judge", PlanarMotion.measure(prev, cur, box, emptyList(), rot = rot))
    }

    @Test
    fun `a still view tells nothing`() {
        val g = image(240, 320) { x, y -> texture(x, y) }
        assertNull(PlanarMotion.measure(g, g, box, emptyList()))
    }

    @Test
    fun `a blank screen has nothing to follow`() {
        val blank = image(240, 320) { _, _ -> 200f }
        assertNull(PlanarMotion.measure(blank, blank, box, emptyList()))
    }

    private class Pair2(val real: Boolean, val box: Box, val others: List<Box>, val prev: Gray, val cur: Gray)

    private fun fixture(): List<Pair2> {
        val raw = javaClass.classLoader!!.getResourceAsStream("testdata/RECORDED_plane_pairs_20261031.bin.gz")!!
        val bytes = GZIPInputStream(raw).readBytes()
        val b = ByteBuffer.wrap(bytes).order(ByteOrder.LITTLE_ENDIAN)
        val magic = ByteArray(4).also { b.get(it) }
        check(String(magic) == "PLN1")
        return List(b.int) {
            val real = b.get().toInt() == 1
            val w = b.short.toInt()
            val h = b.short.toInt()
            val box = Box(b.float, b.float, b.float, b.float)
            val others = List(b.get().toInt()) { Box(b.float, b.float, b.float, b.float) }
            fun img() = Gray(w, h, FloatArray(w * h) { (b.get().toInt() and 0xFF).toFloat() })
            val prev = img()
            Pair2(real, box, others, prev, img())
        }
    }

    /**
     * RECORDED: 25 frame pairs from the team's clips of 31 Oct (real apple; apple pictures on the
     * laptop and on a phone; real apple in front of the laptop picture), with the phone detector's
     * boxes. Development data (the cue's thresholds were chosen on these clips), so this checks the
     * Kotlin port reproduces the study, not how well the cue generalises.
     */
    @Test
    fun `recorded pairs - pictures read flat and real apples stand out, mostly`() {
        val pairs = fixture()
        var realOk = 0; var realWrong = 0; var realN = 0
        var picOk = 0; var picWrong = 0; var picN = 0
        val lines = ArrayList<String>()
        for (p in pairs) {
            val r = PlanarMotion.measure(p.prev, p.cur, p.box, p.others) ?: continue
            lines += "%s ratio %.3f motion %.2f".format(if (p.real) "real   " else "picture", r.ratio, r.motionPx)
            if (p.real) { realN++; if (r.ratio >= PlanarMotion.STANDS_OUT_RATIO) realOk++; if (r.ratio <= PlanarMotion.FLAT_RATIO) realWrong++ }
            else { picN++; if (r.ratio <= PlanarMotion.FLAT_RATIO) picOk++; if (r.ratio >= PlanarMotion.STANDS_OUT_RATIO) picWrong++ }
        }
        println(lines.joinToString("\n"))
        println("real: $realOk/$realN stand out, $realWrong read flat; pictures: $picOk/$picN flat, $picWrong stand out")
        assertTrue("measured too few pairs: $realN real, $picN pictures", realN >= 8 && picN >= 8)
        // Each wrong-way reading costs one view of evidence; the ledger needs several views to decide.
        assertTrue("real apples read flat too often", realWrong * 5 <= realN)
        assertTrue("pictures stand out too often", picWrong * 4 <= picN)
        assertTrue("real apples stand out too rarely", realOk * 2 >= realN)
        assertTrue("pictures read flat too rarely", picOk * 2 >= picN)
    }
}
