package ai.saarthi.app.geometry

import kotlin.math.max
import kotlin.math.min

/** Axis-aligned box in any consistent unit (pixels or 0..1). left < right, top < bottom. */
data class Box(val left: Float, val top: Float, val right: Float, val bottom: Float) {

    val width: Float get() = max(0f, right - left)
    val height: Float get() = max(0f, bottom - top)
    val area: Float get() = width * height

    /** Intersection over union: 0 for disjoint boxes, 1 for identical ones. */
    fun iou(other: Box): Float {
        val iw = max(0f, min(right, other.right) - max(left, other.left))
        val ih = max(0f, min(bottom, other.bottom) - max(top, other.top))
        val inter = iw * ih
        val union = area + other.area - inter
        return if (union <= 0f) 0f else inter / union
    }
}

/** A labelled, scored box, as any detector reports it. */
data class LabelledBox(val label: String, val score: Float, val box: Box)

/** One pairing between a reference detection and a candidate detection. */
data class BoxMatch(val reference: LabelledBox, val candidate: LabelledBox, val iou: Float)

/**
 * Greedy one-to-one matching of two detection lists: same label, IoU at least [minIou], best IoU
 * first. Used to compare the same model on different accelerators, and later to track objects
 * from frame to frame.
 */
object BoxMatcher {

    data class Result(
        val matches: List<BoxMatch>,
        val unmatchedReference: List<LabelledBox>,
        val unmatchedCandidate: List<LabelledBox>,
    )

    fun match(reference: List<LabelledBox>, candidate: List<LabelledBox>, minIou: Float = 0.5f): Result {
        val pairs = ArrayList<Triple<Int, Int, Float>>()
        for (i in reference.indices) for (j in candidate.indices) {
            if (reference[i].label != candidate[j].label) continue
            val iou = reference[i].box.iou(candidate[j].box)
            if (iou >= minIou) pairs += Triple(i, j, iou)
        }
        pairs.sortByDescending { it.third }
        val usedRef = BooleanArray(reference.size)
        val usedCand = BooleanArray(candidate.size)
        val matches = ArrayList<BoxMatch>()
        for ((i, j, iou) in pairs) {
            if (usedRef[i] || usedCand[j]) continue
            usedRef[i] = true
            usedCand[j] = true
            matches += BoxMatch(reference[i], candidate[j], iou)
        }
        return Result(
            matches = matches,
            unmatchedReference = reference.filterIndexed { i, _ -> !usedRef[i] },
            unmatchedCandidate = candidate.filterIndexed { j, _ -> !usedCand[j] },
        )
    }
}
