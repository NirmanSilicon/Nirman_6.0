package ai.saarthi.app.personal

import kotlin.math.sqrt

/**
 * "My watch" among look-alikes (PRD 5.0.1 item 3, D49). Each taught object is a handful of views
 * (embedding vectors of the region around the hand, ~15 per 3 s of turning it), never an image. A view
 * in the hand is judged by the **gap** between its best match among the user's views and its best match
 * among the look-alikes' (team input: a gap, not a fixed "98%" score): clearly closer to the user's =
 * theirs, clearly closer to a look-alike = not theirs, in between = not sure. A view far from every
 * taught object is "not a taught object at all". A handful of vectors: a plain scan, no index (no Faiss).
 *
 * Limit, said openly: look-alikes must differ visibly; two identical models cannot be told apart.
 * Pure logic, no Android: tested off-device.
 */
class PersonalObjects(
    /**
     * The gap (cosine) needed to call it one or the other. Team photos, every photo held back once (D50):
     * no wrong answer at any gap from 0 to 0.15; at 0.05, 77 of 78 right and 1 "not sure".
     */
    var gap: Float = 0.05f,
    /** Below this best similarity, the hand holds none of the taught objects (the weakest held-back photo: 0.53, D50). */
    var minSimilarity: Float = 0.45f,
) {
    enum class Decision { MINE, NOT_MINE, UNSURE, NONE }

    data class Judgement(val decision: Decision, val mine: Float, val other: Float, val name: String?) {
        val margin: Float get() = mine - other
    }

    private class Taught(val name: String, val mine: Boolean, val views: MutableList<FloatArray>)

    private val taught = ArrayList<Taught>()

    fun has(mine: Boolean): Boolean = taught.any { it.mine == mine && it.views.isNotEmpty() }

    /** Both sides taught: the user's object and at least one look-alike. */
    val ready: Boolean get() = has(true) && has(false)

    val names: List<String> get() = taught.map { it.name }.distinct()

    /**
     * Adds [views] of [name]. The user's own object replaces its earlier views (re-teaching it); a look-alike
     * is **added** to the ones already taught, since there may be several (team, 1 Nov: two other watches).
     */
    fun teach(name: String, mine: Boolean, views: List<FloatArray>) {
        if (mine) taught.removeAll { it.name == name && it.mine }
        taught += Taught(name, mine, views.map { normalised(it) }.toMutableList())
    }

    fun forget() = taught.clear()

    fun judge(view: FloatArray): Judgement {
        val v = normalised(view)
        val mine = taught.filter { it.mine }
        val other = taught.filter { !it.mine }
        val m = mine.flatMap { it.views }.maxOfOrNull { dot(v, it) } ?: -1f
        val o = other.flatMap { it.views }.maxOfOrNull { dot(v, it) } ?: -1f
        val name = (mine + other).firstOrNull()?.name
        val d = when {
            maxOf(m, o) < minSimilarity -> Decision.NONE
            // One side only: there is no gap to judge by (team input), so never "yours" or "not yours".
            mine.isEmpty() || other.isEmpty() -> Decision.UNSURE
            m - o >= gap -> Decision.MINE
            o - m >= gap -> Decision.NOT_MINE
            else -> Decision.UNSURE
        }
        return Judgement(d, m, o, name)
    }

    // ---- Kept on the phone between launches (vectors only, never images) ----

    /** One line per taught object: `name<TAB>mine|other<TAB>v,v,…;v,v,…` (views separated by `;`). */
    fun toText(): String = taught.joinToString("\n") { t ->
        "${t.name}\t${if (t.mine) "mine" else "other"}\t" + t.views.joinToString(";") { v -> v.joinToString(",") }
    }

    fun load(text: String) {
        taught.clear()
        for (line in text.lines()) {
            val parts = line.split('\t')
            if (parts.size != 3) continue
            val views = parts[2].split(';').filter { it.isNotBlank() }.map { v -> v.split(',').map { it.toFloat() }.toFloatArray() }
            taught += Taught(parts[0], parts[1] == "mine", views.toMutableList())
        }
    }

    companion object {
        fun normalised(v: FloatArray): FloatArray {
            var n = 0.0
            for (x in v) n += x * x
            val s = if (n > 0) (1.0 / sqrt(n)).toFloat() else 0f
            return FloatArray(v.size) { v[it] * s }
        }

        fun dot(a: FloatArray, b: FloatArray): Float {
            var s = 0f
            for (i in 0 until minOf(a.size, b.size)) s += a[i] * b[i]
            return s
        }
    }
}
