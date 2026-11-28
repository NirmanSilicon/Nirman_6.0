package ai.saarthi.app.reach

import ai.saarthi.app.perception.SpokenNames
import ai.saarthi.app.table.Direction

/**
 * What Saarthi says when a reach is heading to a false belief (D46). Every sentence is short, true and
 * pre-recorded at start-up (like the guidance phrasebook, D30), so it starts within milliseconds: the
 * hand is still on its way. A test checks [ALL] covers every sentence [moved] and [gone] can produce.
 */
object StopPhrases {
    private val objects = SpokenNames.DEMO_KIT - setOf("person", "dining table")
    private val directions = listOf(0f, -20f, 20f, -60f, 60f)

    fun moved(label: String, bearingDeg: Float): String =
        "Wait, your ${SpokenNames.of(label)} moved; it's now ${Direction.phrase(bearingDeg)}."

    fun gone(label: String): String = "Wait, your ${SpokenNames.of(label)} isn't there any more."

    val ALL: List<String> = objects.flatMap { o -> directions.map { moved(o, it) } + gone(o) }
}
