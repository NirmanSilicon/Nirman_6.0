package ai.saarthi.app.personal

import ai.saarthi.app.geometry.Box
import kotlin.math.hypot

/**
 * Where to look for the object in the user's hand or under their finger (D49), from the 21 hand
 * landmarks in 0..1 of the frame (MediaPipe's order: 0 wrist, 4 thumb tip, 5 index knuckle, 8 index tip,
 * 9 middle knuckle). The detector has no "watch" class, so the region around the hand is what is
 * compared (team input).
 */
object HandRegion {

    /**
     * A square around the grip: centred between the thumb tip and the index tip, pushed a little past
     * them (an object held is in front of the fingers), sized from the hand's own size so it scales with
     * distance. The frame is 480 × 640: the square is square in pixels.
     */
    fun held(landmarks: List<Pair<Float, Float>>, aspect: Float = 480f / 640f): Box {
        val (tx, ty) = landmarks[4]
        val (ix, iy) = landmarks[8]
        val (wx, wy) = landmarks[0]
        val (mx, my) = landmarks[9]
        val handPx = hypot((mx - wx) * aspect, my - wy)     // palm length, in frame heights
        val cx0 = (tx + ix) / 2f
        val cy0 = (ty + iy) / 2f
        // From the wrist towards the grip, a little further.
        val cx = cx0 + (cx0 - wx) * 0.25f
        val cy = cy0 + (cy0 - wy) * 0.25f
        val half = (handPx * 1.1f).coerceIn(0.06f, 0.3f)
        return square(cx, cy, half, aspect)
    }

    /** A square around the index fingertip, for "what's this?" by touch on a small object (the watch). */
    fun underFinger(landmarks: List<Pair<Float, Float>>, aspect: Float = 480f / 640f): Box {
        val (wx, wy) = landmarks[0]
        val (mx, my) = landmarks[9]
        val handPx = hypot((mx - wx) * aspect, my - wy)
        val (x, y) = landmarks[8]
        return square(x, y, (handPx * 0.9f).coerceIn(0.05f, 0.25f), aspect)
    }

    /** A box [half] frame-heights from the centre each way, square in pixels, clipped to the frame. */
    private fun square(cx: Float, cy: Float, half: Float, aspect: Float): Box {
        val hx = half / aspect
        return Box((cx - hx).coerceIn(0f, 1f), (cy - half).coerceIn(0f, 1f), (cx + hx).coerceIn(0f, 1f), (cy + half).coerceIn(0f, 1f))
    }
}
