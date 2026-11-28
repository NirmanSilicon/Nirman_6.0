package ai.saarthi.app.intent

/**
 * "Did you mean …?" (team choice, D58): the speech model sometimes mishears a request ("is this apple
 * Korean?", "is this apollaryal?" for "is this apple real?"); instead of "Sorry, I didn't catch that",
 * Saarthi finds the closest request it knows and asks; the user says "yes". Closeness = 1 − edit distance
 * ÷ length, over the normalised words. Pure logic.
 */
object NearMiss {

    private val objects = listOf("apple", "cup", "bottle", "laptop", "mouse", "book", "phone")

    /** Requests Saarthi knows, as a person would say them. */
    val TEMPLATES: List<String> = objects.flatMap { o ->
        listOf("is this $o real", "is the $o real", "where is my $o", "guide my hand to the $o", "find my $o")
    } + listOf(
        "is it real", "is this real", "is this my watch", "what is around me", "read this", "what is this",
        "read my notes", "who is on my right", "who is on my left", "what can i reach", "what changed", "go online", "go offline",
    )

    /** The closest known request to [heard] and how close (0..1), or null when nothing is close enough. */
    fun suggest(heard: String, minSimilarity: Float = 0.62f): Pair<String, Float>? {
        val t = IntentInterpreter.normalise(heard)
        if (t.split(' ').size < 2) return null
        return TEMPLATES.map { it to similarity(t, it) }.maxByOrNull { it.second }?.takeIf { it.second >= minSimilarity }
    }

    private val yes = setOf("yes", "yeah", "yes please", "yep", "correct", "right", "that's right", "that is right", "haan", "ha", "sure", "exactly", "yes yes")
    private val no = setOf("no", "nope", "no no", "not that", "wrong", "nahi")

    fun isYes(heard: String) = IntentInterpreter.normalise(heard).trim().removeSuffix(" please") in yes
    fun isNo(heard: String) = IntentInterpreter.normalise(heard).trim() in no

    fun similarity(a: String, b: String): Float {
        if (a == b) return 1f
        val d = Array(a.length + 1) { IntArray(b.length + 1) }
        for (i in 0..a.length) d[i][0] = i
        for (j in 0..b.length) d[0][j] = j
        for (i in 1..a.length) for (j in 1..b.length) {
            d[i][j] = minOf(d[i - 1][j] + 1, d[i][j - 1] + 1, d[i - 1][j - 1] + if (a[i - 1] == b[j - 1]) 0 else 1)
        }
        return 1f - d[a.length][b.length].toFloat() / maxOf(a.length, b.length)
    }
}
