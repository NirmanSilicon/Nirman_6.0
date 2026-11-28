package ai.saarthi.app.guidance

/**
 * Every sentence [HandGuide] and [AimGuide] can say (the arrival line with a reach zone included). The
 * speaker synthesises them once at start-up so cues play instantly (D30); a test checks this list
 * covers every phrase the guides produce.
 */
object Phrases {
    private val directions = listOf(
        "left", "a little left", "right", "a little right", "forward", "a little forward", "back towards you", "a little back",
    )

    val ALL: List<String> =
        directions.map { it.replaceFirstChar { c -> c.uppercase() } + "." } +
            directions.map { "Other way: $it." } +
            listOf("You're touching it.", "Turn left.", "Turn right.", "It's straight ahead.") +
            listOf("within reach", "just beyond reach", "out of reach").map { "It's straight ahead, $it." }
}
