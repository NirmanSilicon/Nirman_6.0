package ai.saarthi.app.system2

import ai.saarthi.app.brief.BriefComposer
import ai.saarthi.app.perception.SpokenNames
import ai.saarthi.app.worldmap.Scene
import ai.saarthi.app.worldmap.Seen
import ai.saarthi.app.worldmap.WorldObject

/**
 * What System 2 says (docs/SYSTEM2.md 3, 4.9): answers to "is the apple real?", a picture's phrase
 * in a brief, and self-corrections. Short and plain (PRD 11): a verdict and one reason, never
 * numbers; the full trace is on the Mind view.
 */
object RealitySpeech {

    /** An answer: [text], and [pending] = objects still unsure, to be re-checked while the user moves the phone. */
    data class Answer(val text: String, val pending: List<Int> = emptyList())

    /** "Is the apple real?": every in-view object of [cocoClass] (or every assessed standing object when null). */
    fun answer(cocoClass: String?, scene: Scene, nowMs: Long, where: (WorldObject) -> String): Answer {
        val candidates = candidates(cocoClass, scene, nowMs)
        val name = cocoClass?.let { SpokenNames.of(it) } ?: "object"
        if (candidates.isEmpty()) return Answer("I can't see ${BriefComposer.article(name)} $name right now.")
        val verdicts = candidates.map { it to (scene.reality[it.id]?.verdict ?: Verdict.UNSURE) }
        val unsure = verdicts.filter { it.second == Verdict.UNSURE }.map { it.first.id }
        if (candidates.size == 1) {
            val (o, v) = verdicts.single()
            val a = scene.reality[o.id]
            val n = SpokenNames.of(o.label)
            return when (v) {
                Verdict.REAL -> Answer("That $n looks real: ${reason(a, real = true)}.")
                Verdict.PICTURE -> Answer("That's ${pictureOf(o.label, a)}: ${reason(a, real = false)}.")
                Verdict.UNSURE -> Answer(LOOK_AGAIN, unsure)
            }
        }
        val parts = verdicts.map { (o, v) ->
            val n = SpokenNames.of(o.label)
            when (v) {
                Verdict.REAL -> "the $n ${where(o)} is real"
                Verdict.PICTURE -> "the $n ${where(o)} is a picture"
                Verdict.UNSURE -> "I'm not sure yet about the $n ${where(o)}"
            }
        }
        val text = parts.joinToString("; ").replaceFirstChar { it.uppercase() } + "." +
            if (unsure.isNotEmpty()) " Move the phone slightly to the side." else ""
        return Answer(text, unsure)
    }

    /** The objects "is the apple real?" is about: every in-view object of [cocoClass], or every standing one when null. */
    fun candidates(cocoClass: String?, scene: Scene, nowMs: Long): List<WorldObject> = scene.world.filter { o ->
        o.seen == Seen.IN_VIEW && o.track != null && nowMs - o.lastSeenMs <= IN_VIEW_MS &&
            (if (cocoClass != null) o.label == cocoClass else o.label in RealityCheck.STANDING)
    }

    /** Said when a pending check settles after "move the phone slightly". */
    fun settled(o: WorldObject, a: Assessment): String? = when (a.verdict) {
        Verdict.REAL -> "Now I can tell: that ${SpokenNames.of(o.label)} is real."
        Verdict.PICTURE -> "Now I can tell: that's ${pictureOf(o.label, a)}."
        Verdict.UNSURE -> null
    }

    /** A told object turned out to be a picture (docs/SYSTEM2.md 4.4: reversal, said out loud). */
    fun correction(label: String, a: Assessment): String =
        "Correction: the ${SpokenNames.of(label)} I mentioned is ${pictureOf(label, a)}, not a real one."

    /** "a picture of an apple on the laptop screen" */
    fun pictureOf(label: String, a: Assessment?): String {
        val n = SpokenNames.of(label)
        val on = when (a?.screen) {
            "laptop", "tv" -> " on the laptop screen"
            "cell phone" -> " on a phone"
            else -> if (a?.cues?.any { it.cue == Cue.TORCH && it.llr < 0f } == true) " on a screen" else ""
        }
        return "a picture of ${BriefComposer.article(n)} $n$on"
    }

    /** The strongest cue for the verdict, in plain words. */
    private fun reason(a: Assessment?, real: Boolean): String {
        val c = a?.cues?.filter { if (real) it.llr > 0 else it.llr < 0 }?.maxByOrNull { kotlin.math.abs(it.llr) }
        return when (c?.cue) {
            Cue.PLANE -> if (real) "it stands out from what's behind it when the view moves" else "it moves flat with what's around it"
            Cue.SCREEN_LIGHT -> "it's on something that gives off light"
            Cue.IN_SCREEN -> "it's inside a screen"
            Cue.TORCH -> if (real) "it reflects my light like the table does" else "it gives off its own light, like a screen"
            null -> if (real) "nothing suggests a picture" else "it looks flat"
        }
    }

    /** Said while the torch test runs (D38). */
    const val CHECKING = "Let me check with my light."
    const val LOOK_AGAIN = "I'm not sure yet. Move the phone slightly to the side."
    const val STILL_UNSURE = "I still can't tell whether it's real."
    private const val IN_VIEW_MS = 1_000L
}
