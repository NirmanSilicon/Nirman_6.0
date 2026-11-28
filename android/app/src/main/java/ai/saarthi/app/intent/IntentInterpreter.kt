package ai.saarthi.app.intent

// Adapted from SecondSense voice/IntentInterpreter.kt and voice/VoicePipeline.kt TargetNoun (owners'
// permission, commit cc122ea): a deterministic, offline rule-and-synonym grammar that maps a
// transcript onto a closed intent set, checked in a fixed order, with Unknown as the fallback.
// Changed: Saarthi's table intents (PRD 5.9) instead of walking ones; no safety, timer, call,
// context or language intents; objects are resolved onto the demo kit (ObjectWords) instead of
// taking the last noun; sides (left/right) and "is this mine / is it real" added.

/** What the user asked for. Bounded on purpose (PRD 5.9). */
sealed interface Intent {
    /** "what's around me", "describe the table". */
    data object Brief : Intent
    /** "where is my bottle", "find the cup". [cocoClass] is null for an object Saarthi cannot recognise. */
    data class Find(val spoken: String, val cocoClass: String?) : Intent
    /** "how many people are here", "who is around me". */
    data object People : Intent
    /** "who is on my right". */
    data class WhoIsOn(val side: Side) : Intent
    /** "what is on my right" (objects on one side; Phase 2). */
    data class ObjectsOn(val side: Side) : Intent
    /** "what can I reach", "what is within reach" (Phase 2). */
    data object InReach : Intent
    /** "what changed on the table", "did anything move". */
    data object WhatChanged : Intent
    /** "is this my watch" (personal object, CLAUDE.md 5.0.1). */
    data class IsMine(val spoken: String) : Intent
    /** "this is my watch": learn the object in the user's hand as theirs (Phase 4.5 item 3, D49). */
    data class TeachMine(val spoken: String) : Intent
    /** "this is the other watch", "this is not my watch": learn a look-alike that is not theirs (D49). */
    data class TeachOther(val spoken: String) : Intent
    /** "what is this", "what am I touching", "what am I pointing at": the object under or along the finger (D49). */
    data object WhatIsThis : Intent
    /**
     * "go online" / "go offline": the optional online brain, off by default (D51). [then] = the rest of
     * "go online and tell me what this is", asked online at once (D53).
     */
    data class Online(val on: Boolean, val then: String? = null) : Intent
    /** "Note: the first door is closed": kept in the diary (D56). */
    data class Note(val text: String) : Intent
    /** "read my notes", "what did I note": the diary read back (D56). */
    data object ReadNotes : Intent
    /** "is the apple real" (System 2, Phase 4). */
    data class IsReal(val spoken: String?) : Intent
    /** "guide my hand to the bottle" (reach guidance, Phase 3). */
    data class Guide(val spoken: String, val cocoClass: String?) : Intent
    /** "read this" (BONUS 5.7). */
    data object Read : Intent
    /** "read on", "continue": the next part of what was being read. */
    data object ReadMore : Intent
    /** "repeat that", "say that again". */
    data object Repeat : Intent
    /** "stop", "be quiet". */
    data object Stop : Intent
    /** "what can I say". */
    data object Help : Intent
    /** Nothing matched. */
    data class Unknown(val transcript: String) : Intent

    enum class Side { LEFT, RIGHT }
}

object IntentInterpreter {

    fun interpret(raw: String?): Intent {
        val t = normalise(raw)
        if (t.isBlank()) return Intent.Unknown("")
        fun has(vararg p: String) = p.any { Regex("\\b${Regex.escape(it)}\\b").containsMatchIn(t) }
        fun startsAny(vararg p: String) = p.any { t == it || t.startsWith("$it ") }

        // 1. Help first: "what can I say" is not a question about the table.
        if (has("what can i say", "what can you do", "list commands", "help me use") || t == "help") return Intent.Help

        // 2. Repeat.
        if (has("say that again", "say it again", "repeat that", "repeat it", "come again", "what did you say") ||
            t == "repeat" || t == "again" || t == "pardon"
        ) return Intent.Repeat

        // 3. Stop.
        if (t in setOf("stop", "stop it", "stop talking", "be quiet", "quiet", "silence", "shut up", "cancel", "never mind", "enough") ||
            has("stop talking", "be quiet", "never mind")
        ) return Intent.Stop

        // 4. Read. "read on" continues; "read this" starts.
        if (t in setOf("read on", "read more", "keep reading", "continue reading", "continue", "go on", "next") ||
            has("read on", "read more", "keep reading", "continue reading", "read the rest")
        ) return Intent.ReadMore
        if ((startsAny("read") && !has("notes", "my note")) || has("what does it say", "what does this say", "what is written")) return Intent.Read

        // 4b. The optional online brain, off by default (D51).
        Regex("^(please )?(go|switch|turn) online( and (.+))?$").find(t)?.let { m -> return Intent.Online(true, m.groupValues[4].ifBlank { null }) }
        if (Regex("\\b(turn|switch) on (the )?online\\b").containsMatchIn(t) ||
            Regex("\\buse the internet\\b").containsMatchIn(t) || t == "online mode on" || t == "online on"
        ) return Intent.Online(true)
        if (Regex("^(please )?(go|switch|turn) offline\\b").containsMatchIn(t) || Regex("\\b(turn|switch) off (the )?online\\b").containsMatchIn(t) ||
            Regex("\\bstop using the internet\\b").containsMatchIn(t) || t == "online mode off" || t == "online off" || t == "offline mode"
        ) return Intent.Online(false)

        // 5a. Teaching a personal object, and touch and ask (D49). "this is my watch" teaches; "is this my
        // watch" (5b) asks; "what is on my right" is about things (9), not this.
        if (Regex("^(remember |learn )?(this|that) is (not my|someone else'?s|the other|another|a different)\\b").containsMatchIn(t) ||
            Regex("^(this|that) (one )?is not mine\\b").containsMatchIn(t)
        ) return Intent.TeachOther(ObjectWords.lastObjectWord(t) ?: "object")
        if (Regex("^(remember (that )?|learn (that )?)?(this|that) is my\\b").containsMatchIn(t) || Regex("^(remember|learn) my\\b").containsMatchIn(t)) {
            return Intent.TeachMine(ObjectWords.lastObjectWord(t) ?: "object")
        }
        // 5c. The diary (D56), after teaching ("remember that this is my watch" teaches).
        Regex("^(note|take a note|make a note|remember that)( that)?[ :]+(.+)$").find(t)?.let { m -> return Intent.Note(m.groupValues[3]) }
        if (Regex("\\b(read|tell me|what are) (all )?my notes\\b").containsMatchIn(t) || Regex("\\bwhat did i note\\b").containsMatchIn(t) ||
            t == "my notes" || t == "notes" || Regex("\\bany notes\\b").containsMatchIn(t)
        ) return Intent.ReadNotes

        if (Regex("^(what is|whats) (this|that)( thing| one| object)?$").containsMatchIn(t) ||
            Regex("\\bwhat (am i|i am|i'm|im) (touching|holding|pointing (at|to))\\b").containsMatchIn(t) ||
            Regex("\\b(where|what) (am i|i am|i'm|im) pointing\\b").containsMatchIn(t) ||
            Regex("\\bwhat is (this|that) i am (touching|holding|pointing (at|to))\\b").containsMatchIn(t)
        ) return Intent.WhatIsThis

        // 5b. Personal object: "is this my watch", "did I pick my watch", "is that mine".
        // "where is my bottle" is a find, not this: the object must be "this/that/it", or picked up.
        if (Regex("\\bis (this|that|it) (my|mine)\\b").containsMatchIn(t) ||
            Regex("\\bdid i (pick|take|grab)( up)? (my|the right)\\b").containsMatchIn(t)
        ) return Intent.IsMine(ObjectWords.lastObjectWord(t) ?: "object")

        // 6. Real or picture.
        if (has("real", "fake", "a picture", "a photo", "is it a photo", "is that a picture")) {
            return Intent.IsReal(ObjectWords.lastObjectWord(t))
        }

        // 7. Change since last told.
        if (has("what changed", "what has changed", "anything changed", "did anything change", "did anything move",
                "has anything moved", "what moved", "anything new", "what is new")
        ) return Intent.WhatChanged

        // 8. People. A side first ("who is on my right"), then counts.
        val side = when {
            has("on my right", "to my right", "my right side", "right of me") -> Intent.Side.RIGHT
            has("on my left", "to my left", "my left side", "left of me") -> Intent.Side.LEFT
            else -> null
        }
        if (side != null && has("who", "anyone", "anybody", "someone", "somebody", "people", "person")) return Intent.WhoIsOn(side)
        // "what is on my right" asks about things; "is my bottle on my right" is a find (object word).
        if (side != null && ObjectWords.lastObjectWord(t) == null &&
            has("what", "anything", "something", "things", "objects", "stuff", "is there", "describe")
        ) return Intent.ObjectsOn(side)
        if (has("how many people", "how many persons", "who is around", "who's around", "who is here", "who's here",
                "anyone around", "anybody around", "anyone here", "anybody here", "people around", "is anyone", "is anybody")
        ) return Intent.People

        // 9. Guide the hand.
        if (startsAny("guide", "help me reach", "help me get", "take my hand", "lead my hand") || has("guide my hand", "guide me to")) {
            val word = ObjectWords.lastObjectWord(t) ?: return Intent.Unknown(t)
            return Intent.Guide(word, ObjectWords.cocoClass(word))
        }

        // 9b. Within reach, with no object named ("can I reach the bottle" is a find).
        if (ObjectWords.lastObjectWord(t) == null &&
            has("within reach", "within my reach", "in reach", "can i reach", "reachable", "near my hand", "near my hands", "close to my hand", "within arm")
        ) return Intent.InReach

        // 10. Brief.
        if (has("what's around", "what is around", "whats around", "what's in front", "what is in front",
                "what's on the table", "what is on the table", "what's here", "what is here", "describe",
                "what do you see", "what can you see", "look around", "tell me what", "what's near", "what is near")
        ) return Intent.Brief

        // 11. Find: a seek or where verb plus an object word.
        val seek = startsAny("find", "locate", "where", "where's", "wheres", "look for", "search for", "show me", "get me", "i need", "i want") ||
            has("where is", "where are", "where did", "did i leave", "did i put", "can you find", "help me find", "do you see",
                "can i reach", "how far", "within reach", "in reach", "near me")
        val word = ObjectWords.lastObjectWord(t)
        if (seek && word != null) return Intent.Find(word, ObjectWords.cocoClass(word))

        // 12. A bare object word ("bottle?") is a find.
        if (word != null && t.split(' ').size <= 3) return Intent.Find(word, ObjectWords.cocoClass(word))

        return Intent.Unknown(t)
    }

    /** Lower case, contractions expanded, punctuation removed, spaces collapsed. */
    fun normalise(raw: String?): String = (raw ?: "").lowercase().replace("’", "'")
        .replace("what's", "what is").replace("where's", "where is").replace("who's", "who is")
        .replace("it's", "it is").replace("that's", "that is")
        .replace(Regex("[^a-z0-9' ]"), " ").replace(Regex("\\s+"), " ").trim()
        // Whisper base.en hears "is this a real apple" as "is this aerial apple" (team test, 31 Oct: 8 of
        // 10 tries) or "is this area …": both mean "a real" here.
        .replace(Regex("\\b(aerial|areal|a reel)\\b"), "a real")
        .replace(Regex("^(is (this|that|it)) area\\b"), "$1 a real")
}
