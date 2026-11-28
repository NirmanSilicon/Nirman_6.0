package ai.saarthi.app.online

/**
 * Saarthi checks the cloud before the cloud speaks (PRD 5.0.1 item 6, D51, D54): blind users tend to
 * over-trust AI descriptions, so an online answer is compared with Saarthi's own world map first.
 * - an object the answer says is there, that Saarthi has never seen → "…but I don't see a bottle";
 * - an object it says is not there, that Saarthi sees → "…but I see a bottle";
 * - a side (left / right) opposite to where Saarthi has it → "…but I see the bottle on your right".
 * Only kit objects can be checked; anything else is said as the cloud's, unchecked. Pure logic.
 */
object CloudCheck {

    enum class Verdict { AGREES, CONTRADICTS, UNCHECKED }

    data class Result(val verdict: Verdict, val reason: String?, val spoken: String)

    /** What Saarthi knows of one object: its detector class and plain direction ("left", "slightly right", "ahead"…). */
    data class Known(val label: String, val direction: String?)

    /** Spoken words for each kit class (the detector's names, D15). */
    private val words = mapOf(
        "cup" to listOf("cup", "cups", "mug", "mugs"),
        "bottle" to listOf("bottle", "bottles"),
        "apple" to listOf("apple", "apples"),
        "banana" to listOf("banana", "bananas"),
        "laptop" to listOf("laptop", "laptops", "computer", "notebook computer"),
        "mouse" to listOf("mouse", "computer mouse"),
        "book" to listOf("book", "books"),
        "cell phone" to listOf("phone", "phones", "mobile", "smartphone"),
        "person" to listOf("person", "people", "man", "woman", "someone"),
    )
    private val negation = Regex("\\b(no|not|isn't|aren't|don't|doesn't|cannot|can't|without|nothing)\\b")

    fun check(answer: String, known: List<Known>): Result {
        val text = answer.trim()
        val sentences = text.lowercase().split(Regex("(?<=[.!?;])\\s+"))
        var checked = 0
        for ((label, ws) in words) {
            val mine = known.filter { it.label == label }
            for (s in sentences) {
                val at = ws.mapNotNull { w -> Regex("\\b${Regex.escape(w)}\\b").find(s)?.range?.first }.minOrNull() ?: continue
                checked++
                val name = name(label)
                val before = s.substring(maxOf(0, at - 30), at)
                if (negation.containsMatchIn(before)) {
                    if (mine.any { it.direction != null }) return contradicts(text, "I see ${article(name)} $name")
                    continue
                }
                if (mine.isEmpty()) return contradicts(text, "I don't see ${article(name)} $name")
                val saysLeft = Regex("\\bleft\\b").containsMatchIn(s)
                val saysRight = Regex("\\bright\\b").containsMatchIn(s)
                val sides = mine.mapNotNull { it.direction }.map { side(it) }.toSet()
                if (saysLeft != saysRight && sides.isNotEmpty() && null !in sides) {
                    val claimed = if (saysLeft) "left" else "right"
                    if (claimed !in sides) return contradicts(text, "I see the $name on your ${sides.first()}")
                }
            }
        }
        // The answer is said as Saarthi's own (team, D54: no trace of the cloud); only a contradiction adds a word.
        return Result(if (checked > 0) Verdict.AGREES else Verdict.UNCHECKED, null, sentence(text))
    }

    private fun contradicts(text: String, reason: String) =
        Result(Verdict.CONTRADICTS, reason, "${sentence(text)} But $reason, so I'm not sure.")

    /** "left" / "right" / null (ahead) for a plain direction. */
    private fun side(direction: String): String? = when {
        direction.contains("left") -> "left"
        direction.contains("right") -> "right"
        else -> null
    }

    private fun name(label: String) = if (label == "cell phone") "phone" else label
    private fun article(n: String) = if (n.first() in "aeiou") "an" else "a"
    private fun sentence(t: String) = if (t.endsWith('.') || t.endsWith('!') || t.endsWith('?')) t else "$t."
}
