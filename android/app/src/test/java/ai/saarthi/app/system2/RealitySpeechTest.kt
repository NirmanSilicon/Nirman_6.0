package ai.saarthi.app.system2

import ai.saarthi.app.brief.BriefComposer
import ai.saarthi.app.geometry.Box
import ai.saarthi.app.intent.Answerer
import ai.saarthi.app.intent.IntentInterpreter
import ai.saarthi.app.perception.Track
import ai.saarthi.app.worldmap.Scene
import ai.saarthi.app.worldmap.Seen
import ai.saarthi.app.worldmap.WorldObject
import org.junit.Assert.assertEquals
import org.junit.Assert.assertFalse
import org.junit.Assert.assertTrue
import org.junit.Test

class RealitySpeechTest {

    private var nextId = 1
    private fun obj(label: String, cx: Float, size: Float = 0.12f): WorldObject {
        val box = Box(cx - size / 2, 0.45f, cx + size / 2, 0.45f + size)
        val t = Track(nextId++, label, box, 0.75f, 8, 0, 1_000, confirmed = true, recentHits = 8, recentRuns = 8, recentMeanScore = 0.75f)
        return WorldObject(t.id, label, Seen.IN_VIEW, t, null, null, null, null, null, 0, 1_000, null,
            resting = true, moving = false, baseCutOff = false, lastBox = box)
    }

    private fun verdict(o: WorldObject, v: Verdict, screen: String? = null): Assessment {
        val cues = when (v) {
            Verdict.REAL -> listOf(Ledger.CueSum(Cue.PLANE, 4f, 3, "stands out"))
            Verdict.PICTURE -> listOf(Ledger.CueSum(Cue.PLANE, -3.2f, 2, "moves as one flat plane"), Ledger.CueSum(Cue.SCREEN_LIGHT, -0.8f, 1, "light"))
            Verdict.UNSURE -> listOf(Ledger.CueSum(Cue.SCREEN_LIGHT, -0.8f, 1, "light"))
        }
        val llr = cues.sumOf { it.llr.toDouble() }.toFloat()
        return Assessment(o.id, o.label, o.track!!.id, 0.75f, llr, Ledger().probability(llr), v, cues, screen)
    }

    private val answerer = Answerer()
    private fun ask(text: String, scene: Scene) = answerer.answer(IntentInterpreter.interpret(text), scene, 1_000, null)

    @Test
    fun `a settled picture is named as a picture with one reason`() {
        val apple = obj("apple", 0.5f)
        val r = ask("is the apple real", Scene(listOf(apple.track!!), listOf(apple), null, reality = mapOf(apple.id to verdict(apple, Verdict.PICTURE, "cell phone"))))
        assertEquals("That's a picture of an apple on a phone: it moves flat with what's around it.", r.text)
        assertTrue(r.checkReal.isEmpty())
    }

    @Test
    fun `a settled real apple is said to look real`() {
        val apple = obj("apple", 0.5f)
        val r = ask("is the apple real", Scene(listOf(apple.track!!), listOf(apple), null, reality = mapOf(apple.id to verdict(apple, Verdict.REAL))))
        assertEquals("That apple looks real: it stands out from what's behind it when the view moves.", r.text)
    }

    @Test
    fun `no evidence yet asks the user to move the phone and keeps the question open`() {
        val apple = obj("apple", 0.5f)
        val r = ask("is the apple real", Scene(listOf(apple.track!!), listOf(apple), null))
        assertEquals(RealitySpeech.LOOK_AGAIN, r.text)
        assertEquals(listOf(apple.id), r.checkReal)
    }

    @Test
    fun `two apples, one real and one a picture`() {
        val real = obj("apple", 0.2f)
        val pic = obj("apple", 0.8f)
        val scene = Scene(listOf(real.track!!, pic.track!!), listOf(real, pic), null,
            reality = mapOf(real.id to verdict(real, Verdict.REAL), pic.id to verdict(pic, Verdict.PICTURE, "laptop")))
        assertEquals("The apple on your left is real; the apple on your right is a picture.", ask("is the apple real", scene).text)
    }

    @Test
    fun `nothing of that kind in view`() {
        assertEquals("I can't see an apple right now.", ask("is the apple real", Scene(emptyList(), emptyList(), null)).text)
    }

    @Test
    fun `the brief says a settled picture as a picture and never as an apple`() {
        val pic = obj("apple", 0.5f)
        val a = verdict(pic, Verdict.PICTURE, "laptop")
        val brief = BriefComposer().compose(Scene(listOf(pic.track!!), listOf(pic), null, reality = mapOf(pic.id to a)), 1_000)
        assertEquals("A picture of an apple on the laptop screen in front of you.", brief.text)
        assertTrue("a picture is not something the user comes to believe in", brief.items.all { it.worldIds.isEmpty() })
        assertFalse(brief.leftOut.none { it.reason.startsWith("a picture") })
    }

    @Test
    fun `a correction names the picture`() {
        val pic = obj("apple", 0.5f)
        assertEquals("Correction: the apple I mentioned is a picture of an apple on a phone, not a real one.",
            RealitySpeech.correction("apple", verdict(pic, Verdict.PICTURE, "cell phone")))
    }
}
