package ai.saarthi.app.perception

// Adapted from SecondSense inference/decode/CocoLabels.kt (owners' permission, commit cc122ea):
// the idea of mapping COCO's class names onto a smaller vocabulary. Changed: the vocabulary is
// spoken English for a table (not auditory icons), and only the demo kit may be spoken (D15).
// MediaPipe reports class names directly, so the index table is not needed.

/** How COCO class names are said aloud. Nothing here invents a class the detector didn't emit. */
object SpokenNames {

    /** The detector's class name as a person would say it ("cell phone" → "phone"). */
    fun of(cocoName: String): String = when (cocoName) {
        "cell phone" -> "phone"
        "dining table" -> "table"
        "tv" -> "screen"
        "wine glass" -> "glass"
        "potted plant" -> "plant"
        "sports ball" -> "ball"
        "hair drier" -> "hair dryer"
        else -> cocoName
    }

    /**
     * A detector class as shown on any screen (camera view, status line). Only the table is
     * renamed ("dining table" → "table", always: CLAUDE.md 5.0.1); other screen labels keep the
     * detector's own name so the team can see exactly what it reported.
     */
    fun display(cocoName: String): String = if (cocoName == "dining table") "table" else cocoName

    /**
     * The demo kit (D15, team decision): the only classes Saarthi names. They are the everyday
     * objects the phone's detector recognises reliably on the Vivo; anything else it reports is
     * far more likely a misreading (charger → "mouse"/"remote", pen → "knife", toy car →
     * "scissors", black bottle → "refrigerator") and stays silent. "dining table" only opens the
     * brief ("You're at a table"). A larger detector would widen this list.
     */
    val DEMO_KIT = setOf(
        "person", "cup", "bottle", "apple", "banana", "laptop", "mouse", "book", "cell phone",
        "dining table",
    )

    fun isInKit(cocoName: String): Boolean = cocoName in DEMO_KIT

    /**
     * Team decision (30 Oct, D28): the kit's only round fruit is a real apple, and on the Vivo the
     * detector called it "orange" or "donut" most of the time. On our table those classes *are* the
     * apple, so detections are relabelled before tracking (one track, not three flickering ones). The
     * raw detector output in the feed keeps the detector's own word, so the Mind view still shows
     * what it guessed. Cost: a real orange or doughnut would be called an apple; keep them off the table.
     */
    val KIT_ALIASES = mapOf("orange" to "apple", "donut" to "apple")

    fun kitLabel(cocoName: String): String = KIT_ALIASES[cocoName] ?: cocoName
}
