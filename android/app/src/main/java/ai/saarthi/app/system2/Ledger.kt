package ai.saarthi.app.system2

import kotlin.math.abs
import kotlin.math.exp
import kotlin.math.ln

/** One kind of evidence about whether an object is real or a picture (docs/SYSTEM2.md 4.2). */
enum class Cue(val key: String, val capLlr: Float) {
    /**
     * The object's box lies inside a laptop, tv or phone box. Capped below the reject bound: a real
     * apple standing in front of a laptop looks the same, so containment alone never decides.
     */
    IN_SCREEN("in_screen", 2.4f),
    /**
     * Moves as one plane with its surroundings when the view moves ([PlanarMotion]), or stands out
     * from them. The strongest cue: two consistent flat views reach "picture", three standing-out
     * views reach "real".
     */
    PLANE("moves_as_plane", 4.0f),
    /** The area around it is brighter than the scene: a screen emits light. Moderate; a white cloth does too. */
    SCREEN_LIGHT("screen_light", 1.6f),
    /**
     * The torch test ([TorchCheck], on "is it real?"): gave off its own light (a screen, decides
     * alone) or reflected the torch like the table (supports "real" only: a print reflects too).
     */
    TORCH("torch", 4.5f),
}

enum class Verdict { REAL, PICTURE, UNSURE }

/** The camera's direction when a piece of evidence was taken: a new view needs a turn or time. */
data class View(val yawDeg: Float, val tiltDeg: Float)

/**
 * The evidence ledger (docs/SYSTEM2.md 4.4): per world-map object, the summed log-likelihood
 * ratios of "real" against "picture" (positive = real), and Wald's sequential test on that sum.
 *
 * - **Views, not frames.** Ten near-identical frames are one observation: a cue counts again for an
 *   object only after [viewSpacingMs], or after the camera turned [viewTurnDeg] (and at least
 *   [minSpacingMs] passed).
 * - **No cue decides alone what it cannot decide once:** each cue's total is capped ([Cue.capLlr]).
 * - **Reversible:** evidence older than [windowMs] drops out, so a verdict can change and be corrected.
 * - **Bounds** from accepted error rates (Wald 1945): state REAL at ln((1-β)/α), PICTURE at
 *   ln(β/(1-α)); in between, look again or stay silent.
 *
 * The prior ([priorReal]) only turns the sum into a probability for screens; the test is on the
 * evidence alone. Not thread-safe: feed it from the detector thread.
 */
class Ledger(
    private val windowMs: Long = 20_000L,
    private val viewSpacingMs: Long = 700L,
    private val viewTurnDeg: Float = 4f,
    private val minSpacingMs: Long = 200L,
    alpha: Double = 0.05,
    beta: Double = 0.05,
    val priorReal: Float = 0.8f,
) {
    val upper: Float = ln((1 - beta) / alpha).toFloat()
    val lower: Float = ln(beta / (1 - alpha)).toFloat()

    private class Item(val atMs: Long, val llr: Float, val detail: String, val view: View?)

    private val items = HashMap<Int, HashMap<Cue, ArrayDeque<Item>>>()

    /** The evidence for one object, cue by cue. */
    data class CueSum(val cue: Cue, val llr: Float, val views: Int, val detail: String)

    data class Sums(val llr: Float, val pReal: Float, val verdict: Verdict, val cues: List<CueSum>)

    /** Offers one observation; returns whether it counted (a new view) or was a repeat of the last one. */
    fun observe(objectId: Int, cue: Cue, llr: Float, detail: String, nowMs: Long, view: View?): Boolean {
        val q = items.getOrPut(objectId) { HashMap() }.getOrPut(cue) { ArrayDeque() }
        val last = q.lastOrNull()
        if (last != null) {
            val dt = nowMs - last.atMs
            val turned = view != null && last.view != null &&
                (abs(view.yawDeg - last.view.yawDeg) >= viewTurnDeg || abs(view.tiltDeg - last.view.tiltDeg) >= viewTurnDeg)
            if (dt < minSpacingMs || (dt < viewSpacingMs && !turned)) return false
        }
        q.addLast(Item(nowMs, llr, detail, view))
        return true
    }

    fun assess(objectId: Int, nowMs: Long): Sums {
        val cues = ArrayList<CueSum>()
        items[objectId]?.forEach { (cue, q) ->
            while (q.isNotEmpty() && nowMs - q.first().atMs > windowMs) q.removeFirst()
            if (q.isEmpty()) return@forEach
            val sum = q.sumOf { it.llr.toDouble() }.toFloat().coerceIn(-cue.capLlr, cue.capLlr)
            cues += CueSum(cue, sum, q.size, q.last().detail)
        }
        val llr = cues.sumOf { it.llr.toDouble() }.toFloat()
        val verdict = when {
            llr >= upper -> Verdict.REAL
            llr <= lower -> Verdict.PICTURE
            else -> Verdict.UNSURE
        }
        return Sums(llr, probability(llr), verdict, cues)
    }

    /** P(real) after the evidence, from the prior: shown on screens, never used to decide. */
    fun probability(llr: Float): Float {
        val prior = ln(priorReal / (1f - priorReal))
        return (1.0 / (1.0 + exp(-(prior + llr).toDouble()))).toFloat()
    }

    /** Drops [cue]'s evidence about [objectId]: a fresh measurement supersedes the earlier ones (the torch, D42). */
    fun clear(objectId: Int, cue: Cue) {
        items[objectId]?.remove(cue)
    }

    /** Drops objects the world map no longer holds. */
    fun retain(objectIds: Set<Int>) {
        items.keys.retainAll(objectIds)
    }
}
