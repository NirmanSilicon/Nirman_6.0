package ai.saarthi.app.worldmap

import ai.saarthi.app.geometry.Vec2
import ai.saarthi.app.table.TableGeometry

/**
 * Simple spatial relations between objects on the table, from the user's point of view (PRD 5.0.1):
 * "behind the laptop", "in front of the book", "left of the bottle". Computed on table positions
 * in the body frame, never from image boxes alone.
 */
object Relations {

    enum class Rel(val phrase: String) { BEHIND("behind"), IN_FRONT_OF("in front of"), LEFT_OF("left of"), RIGHT_OF("right of") }

    data class Relation(val rel: Rel, val anchorId: Int, val anchorLabel: String)

    /** Big, flat things people use as landmarks first; then any other object close by. */
    private val ANCHORS = listOf("laptop", "book")

    /** An anchor must be this close (metres between bases or edges) to be worth naming. */
    const val NEAR_ANCHOR_M = 0.35f
    const val NEAR_OTHER_M = 0.25f
    /** A landmark wins over a nearer object only if it is at most this much farther. */
    const val PREFER_LANDMARK_M = 0.08f

    /** The most useful relation for [target] among [others], or null if nothing is close enough. */
    fun of(target: WorldObject, others: List<WorldObject>, forwardYawDeg: Float): Relation? {
        if (target.isPerson || target.label == "dining table") return null
        val t = target.world?.let { TableGeometry.worldToBody(it, forwardYawDeg) } ?: return null
        // Landmarks must be in view now: a remembered or unseen entry may be a stale ghost (Vivo,
        // 29 Oct: "in front of the bottle" against an old bottle entry while the real one was in front).
        val candidates = others.filter {
            it.id != target.id && it.label != target.label && it.statable && it.world != null && it.seen == Seen.IN_VIEW &&
                !it.isPerson && it.label != "dining table"
        }
        fun gap(a: WorldObject): Float = edges(a, forwardYawDeg).let { (l, r, base) ->
            val dx = when {
                t.x < l -> l - t.x
                t.x > r -> t.x - r
                else -> 0f
            }
            Vec2(dx, t.y - base.y).length
        }
        // A landmark is preferred only when it is about as close as the nearest object (D61: "right of the
        // laptop" was said for a bottle standing next to the cup, the laptop farther away).
        val landmark = candidates.filter { it.label in ANCHORS && gap(it) <= NEAR_ANCHOR_M }.minByOrNull(::gap)
        val nearest = candidates.filter { gap(it) <= NEAR_OTHER_M }.minByOrNull(::gap)
        val anchor = when {
            landmark == null -> nearest
            nearest == null -> landmark
            gap(nearest) + PREFER_LANDMARK_M < gap(landmark) -> nearest
            else -> landmark
        } ?: return null
        val (l, r, base) = edges(anchor, forwardYawDeg)
        val rel = when {
            t.x in (l - SIDE_SLACK_M)..(r + SIDE_SLACK_M) -> if (t.y > base.y) Rel.BEHIND else Rel.IN_FRONT_OF
            t.x < l -> Rel.LEFT_OF
            else -> Rel.RIGHT_OF
        }
        return Relation(rel, anchor.id, anchor.label)
    }

    private const val SIDE_SLACK_M = 0.03f

    /** An object's left and right extent (body x) and its base point (body frame). */
    private fun edges(o: WorldObject, forwardYawDeg: Float): Triple<Float, Float, Vec2> {
        val base = TableGeometry.worldToBody(o.world!!, forwardYawDeg)
        val l = o.worldLeft?.let { TableGeometry.worldToBody(it, forwardYawDeg).x } ?: base.x
        val r = o.worldRight?.let { TableGeometry.worldToBody(it, forwardYawDeg).x } ?: base.x
        return Triple(minOf(l, r), maxOf(l, r), base)
    }
}
