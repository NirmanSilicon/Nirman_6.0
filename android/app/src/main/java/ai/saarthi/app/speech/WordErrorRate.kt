package ai.saarthi.app.speech

/**
 * Word error rate: the fewest word substitutions, insertions and deletions that turn the
 * recognised text into the reference, divided by the number of reference words. Case and
 * punctuation are ignored, and common contractions are expanded ("what's" = "what is"), so a
 * recogniser is not marked wrong for writing the same words differently.
 */
object WordErrorRate {

    private val contractions = mapOf(
        "what's" to "what is", "where's" to "where is", "who's" to "who is", "it's" to "it is",
        "that's" to "that is", "there's" to "there is", "i'm" to "i am", "don't" to "do not",
        "can't" to "can not", "cannot" to "can not", "isn't" to "is not", "i've" to "i have",
    )

    fun words(text: String): List<String> =
        text.lowercase().replace("’", "'").split(Regex("\\s+"))
            .flatMap { w -> (contractions[w.trim(',', '.', '?', '!', ';', ':', '"')] ?: w).split(' ') }
            .joinToString(" ").replace("'", "").replace(Regex("[^a-z0-9 ]"), " ").split(' ').filter { it.isNotBlank() }

    /** Word edit distance between [reference] and [hypothesis]. */
    fun errors(reference: String, hypothesis: String): Int {
        val r = words(reference)
        val h = words(hypothesis)
        var prev = IntArray(h.size + 1) { it }
        for (i in 1..r.size) {
            val cur = IntArray(h.size + 1)
            cur[0] = i
            for (j in 1..h.size) {
                val sub = prev[j - 1] + if (r[i - 1] == h[j - 1]) 0 else 1
                cur[j] = minOf(sub, prev[j] + 1, cur[j - 1] + 1)
            }
            prev = cur
        }
        return prev[h.size]
    }

    fun rate(reference: String, hypothesis: String): Double {
        val n = words(reference).size
        return if (n == 0) 0.0 else errors(reference, hypothesis).toDouble() / n
    }
}
