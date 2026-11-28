package ai.saarthi.app.intent

import org.junit.Assert.assertEquals
import org.junit.Assert.assertTrue
import org.junit.Test

class IntentInterpreterTest {

    /** The same compact label the phrase files use. */
    private fun label(i: Intent): String = when (i) {
        Intent.Brief -> "Brief"
        is Intent.Find -> "Find:${i.cocoClass ?: "-"}"
        Intent.People -> "People"
        is Intent.WhoIsOn -> "WhoIsOn:${i.side}"
        is Intent.ObjectsOn -> "ObjectsOn:${i.side}"
        Intent.InReach -> "InReach"
        Intent.WhatChanged -> "WhatChanged"
        is Intent.IsMine -> "IsMine"
        is Intent.TeachMine -> "TeachMine"
        is Intent.TeachOther -> "TeachOther"
        Intent.WhatIsThis -> "WhatIsThis"
        is Intent.Online -> "Online:${i.on}"
        is Intent.Note -> "Note"
        Intent.ReadNotes -> "ReadNotes"
        is Intent.IsReal -> "IsReal"
        is Intent.Guide -> "Guide:${i.cocoClass ?: "-"}"
        Intent.Read -> "Read"
        Intent.ReadMore -> "ReadMore"
        Intent.Repeat -> "Repeat"
        Intent.Stop -> "Stop"
        Intent.Help -> "Help"
        is Intent.Unknown -> "Unknown"
    }

    private fun rows(file: String): List<List<String>> =
        javaClass.classLoader!!.getResourceAsStream("testdata/$file")!!.bufferedReader().readLines()
            .filter { it.isNotBlank() && !it.startsWith("#") }.map { it.split('\t') }

    @Test
    fun `development phrase set, at least 90 percent (PRD 5_9)`() {
        val rows = rows("intents_en_dev.tsv")
        val wrong = rows.filter { (expected, phrase) -> label(IntentInterpreter.interpret(phrase)) != expected }
        wrong.forEach { (e, p) -> println("DEV miss: '$p' expected $e got ${label(IntentInterpreter.interpret(p))}") }
        val acc = 1.0 - wrong.size.toDouble() / rows.size
        println("DEV intents: ${rows.size - wrong.size}/${rows.size} = ${"%.1f".format(acc * 100)}%")
        assertTrue("phrases: ${rows.size}", rows.size >= 100)
        assertTrue("accuracy $acc", acc >= 0.9)
    }

    @Test
    fun `RECORDED transcripts from the team's speech test`() {
        val rows = rows("RECORDED_intents_stt_20261028.tsv")
        for (model in listOf("tiny.en", "base.en")) {
            val mine = rows.filter { it[1] == model }
            val wrong = mine.filter { label(IntentInterpreter.interpret(it[3])) != it[0] }
            wrong.forEach { println("RECORDED $model miss: '${it[3]}' expected ${it[0]} got ${label(IntentInterpreter.interpret(it[3]))}") }
            println("RECORDED $model intents: ${mine.size - wrong.size}/${mine.size}")
            if (model == "base.en") assertEquals("base.en transcripts must all be understood", 0, wrong.size)
        }
    }

    @Test
    fun `recorded real-or-picture requests of 31 Oct are understood, including 'aerial apple'`() {
        val rows = rows("RECORDED_intents_stt_20261031.tsv")
        val wrong = rows.filter { label(IntentInterpreter.interpret(it[3])) != it[0] }
        wrong.forEach { println("RECORDED miss: '${it[3]}' expected ${it[0]} got ${label(IntentInterpreter.interpret(it[3]))}") }
        assertEquals(0, wrong.size)
        assertEquals("apple", (IntentInterpreter.interpret("Is this aerial apple?") as Intent.IsReal).spoken)
    }

    @Test
    fun `objects outside the kit are found as unknown, never misheard as kit objects`() {
        val i = IntentInterpreter.interpret("where is my watch") as Intent.Find
        assertEquals("watch", i.spoken)
        assertEquals(null, i.cocoClass)
    }

    @Test
    fun `a mug is the detector's cup`() {
        assertEquals("cup", (IntentInterpreter.interpret("where did my mug go") as Intent.Find).cocoClass)
    }
}
