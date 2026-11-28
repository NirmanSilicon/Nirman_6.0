package ai.saarthi.app.intent

import ai.saarthi.app.perception.SpokenNames

/**
 * Spoken object words and the detector class each one means. Kit objects (D15) map to their COCO
 * class; a few everyday objects people will ask about map to null, so Saarthi can say honestly that
 * it cannot recognise them yet instead of mishearing them as something it can.
 */
object ObjectWords {

    private val toCoco = mapOf(
        "bottle" to "bottle", "water bottle" to "bottle", "flask" to "bottle",
        "cup" to "cup", "mug" to "cup", "coffee" to "cup", "tea" to "cup", "glass" to "cup", "tumbler" to "cup",
        "apple" to "apple", "banana" to "banana",
        "laptop" to "laptop", "computer" to "laptop", "notebook computer" to "laptop",
        "mouse" to "mouse",
        "book" to "book", "books" to "book",
        "phone" to "cell phone", "mobile" to "cell phone", "cell phone" to "cell phone", "cellphone" to "cell phone", "smartphone" to "cell phone",
        "table" to "dining table", "desk" to "dining table",
    )

    /** Objects people ask about that the phone's detector cannot name (not in the demo kit). */
    private val unknownToDetector = setOf(
        "watch", "pen", "pencil", "keys", "key", "wallet", "glasses", "goggles", "spectacles", "charger",
        "earphones", "headphones", "bag", "notebook", "paper", "id card", "card", "remote", "scissors", "keyboard",
    )

    /** The detector class for a spoken word, or null if Saarthi cannot recognise it (yet). */
    fun cocoClass(word: String): String? = toCoco[word]?.takeIf { SpokenNames.isInKit(it) }

    /** The last object word in [text] (two-word names first), or null. */
    fun lastObjectWord(text: String): String? {
        val w = text.split(' ').filter { it.isNotBlank() }
        for (i in w.indices.reversed()) {
            if (i > 0) {
                val two = "${w[i - 1]} ${w[i]}"
                if (two in toCoco || two in unknownToDetector) return two
            }
            if (w[i] in toCoco || w[i] in unknownToDetector) return w[i]
        }
        return null
    }
}
