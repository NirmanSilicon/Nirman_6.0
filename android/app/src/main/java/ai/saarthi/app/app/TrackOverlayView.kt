package ai.saarthi.app.app

import ai.saarthi.app.geometry.Box
import android.content.Context
import android.graphics.Canvas
import android.graphics.Color
import android.graphics.Paint
import android.graphics.RectF
import android.view.View

/**
 * Draws the detector's confirmed tracks over the camera view, for the team (dev build, D13).
 * Green: Saarthi is sure of it (it may be said; already-known objects stay green). Amber: seen but
 * unsure, never said. Unconfirmed tracks are not drawn.
 * Boxes are in 0..1 of the analysed frame; the camera view shows the same frame scaled to fit
 * ([frameAspect] = width / height), so the drawing uses the same fitted rectangle.
 */
class TrackOverlayView(context: Context, private val frameAspect: Float = 3f / 4f) : View(context) {

    /** [distM]: estimated distance from the chest, shown on screen only (speech uses reach words). */
    class Item(val box: Box, val label: String, val score: Float, val said: Boolean, val distM: Float? = null)

    var items: List<Item> = emptyList()
        set(value) { field = value; invalidate() }

    private val said = stroke(Color.rgb(0, 200, 83))
    private val unsure = stroke(Color.rgb(255, 179, 0))
    private val text = Paint(Paint.ANTI_ALIAS_FLAG).apply { textSize = 34f; color = Color.BLACK }
    private val tag = Paint().apply { style = Paint.Style.FILL }
    private val frameEdge = stroke(Color.WHITE).apply { strokeWidth = 2f }

    private fun stroke(c: Int) = Paint(Paint.ANTI_ALIAS_FLAG).apply { style = Paint.Style.STROKE; strokeWidth = 6f; color = c }

    override fun onDraw(canvas: Canvas) {
        val fit = fittedRect()
        canvas.drawRect(fit, frameEdge)
        for (it in items) {
            val p = if (it.said) said else unsure
            val r = RectF(
                fit.left + it.box.left * fit.width(), fit.top + it.box.top * fit.height(),
                fit.left + it.box.right * fit.width(), fit.top + it.box.bottom * fit.height(),
            )
            canvas.drawRect(r, p)
            val label = "${it.label} %.2f".format(it.score) + (it.distM?.let { d -> " · %.2f m".format(d) } ?: "")
            val w = text.measureText(label) + 16f
            val top = (r.top - 44f).coerceAtLeast(fit.top)
            tag.color = p.color
            canvas.drawRect(r.left, top, r.left + w, top + 44f, tag)
            canvas.drawText(label, r.left + 8f, top + 34f, text)
        }
    }

    /** The rectangle the camera view occupies when the whole frame is scaled to fit this view. */
    private fun fittedRect(): RectF {
        val vw = width.toFloat()
        val vh = height.toFloat()
        return if (vw / vh > frameAspect) {
            val w = vh * frameAspect
            RectF((vw - w) / 2, 0f, (vw + w) / 2, vh)
        } else {
            val h = vw / frameAspect
            RectF(0f, (vh - h) / 2, vw, (vh + h) / 2)
        }
    }
}
