package ai.saarthi.app.diary

/**
 * The blind user's diary (team idea, 1 Nov, D56): "Note: the first door is closed" is kept for this
 * session, with the time, and given back when asked ("read my notes"), or when a later question shares
 * its words ("which door is closed?" → "You noted at 18:12: the first door is closed."). In online mode
 * the notes also go to the cloud as context. Text only, on the phone, for the app run. Pure logic.
 */
class Diary {

    data class Note(val atMs: Long, val clock: String, val text: String)

    private val notes = ArrayList<Note>()

    val all: List<Note> get() = notes.toList()

    fun add(text: String, atMs: Long, clock: String): Note = Note(atMs, clock, text.trim().trimEnd('.')).also { notes += it }

    /** The note sharing the most meaningful words with [question] (at least one), newest first on a tie; or null. */
    fun find(question: String): Note? {
        val q = words(question)
        if (q.isEmpty()) return null
        return notes.asReversed().map { it to (words(it.text) intersect q).size }.filter { it.second > 0 }.maxByOrNull { it.second }?.first
    }

    /** Notes as session context for the cloud, oldest first. */
    fun context(): String = notes.joinToString("\n") { "- ${it.clock}: the user noted \"${it.text}\"" }

    private fun words(t: String): Set<String> = t.lowercase().split(Regex("[^a-z0-9]+"))
        .filter { it.length > 2 && it !in STOP }.map { it.removeSuffix("s") }.toSet()

    private companion object {
        val STOP = setOf(
            "the", "and", "are", "was", "were", "this", "that", "what", "where", "which", "who", "how", "when", "did",
            "does", "have", "has", "had", "you", "your", "for", "with", "from", "into", "about", "there", "here",
            "note", "notes", "tell", "please", "can", "could", "would", "should", "will", "now", "then", "they", "them",
        )
    }
}
