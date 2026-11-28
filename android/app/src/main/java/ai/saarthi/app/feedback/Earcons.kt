package ai.saarthi.app.feedback

// Adapted from SecondSense sonification/Earcons.kt and output/AudioOutput.kt playBlip (owners'
// permission, commit cc122ea): an earcon is a short list of sine notes with an attack/release
// envelope so they never click. Changed: SecondSense's walking-context sequences are not ported;
// Saarthi's vocabulary is defined here and kept small (PRD 11: no sound without meaning); notes
// are rendered once into a mono buffer (pure, tested) instead of on every play.

import kotlin.math.PI
import kotlin.math.sin

/** Saarthi's earcon vocabulary. Each one has one meaning; add a sound only with a meaning. */
enum class Earcon(val notes: List<Earcons.Note>) {
    /** "I heard your tap; the answer is coming." One short soft rising pair. */
    HEARD(listOf(Earcons.Note(660.0, 45, 15), Earcons.Note(880.0, 55, 0))),
    /** "The microphone is open: speak now." One short low note. */
    LISTENING(listOf(Earcons.Note(440.0, 70, 0))),
    /** "Something you know about changed; listen." A falling pair, played the instant an alert is decided (D26). */
    CHANGED(listOf(Earcons.Note(988.0, 60, 20), Earcons.Note(740.0, 80, 0))),
    /** "Online mode on" (triple tap, D54): a rising triad. */
    ONLINE_ON(listOf(Earcons.Note(523.0, 70, 15), Earcons.Note(659.0, 70, 15), Earcons.Note(784.0, 110, 0))),
    /** "Online mode off": the same triad, falling. */
    ONLINE_OFF(listOf(Earcons.Note(784.0, 70, 15), Earcons.Note(659.0, 70, 15), Earcons.Note(523.0, 110, 0))),
}

object Earcons {

    data class Note(val hz: Double, val ms: Int, val gapMs: Int = 40)

    /** Renders [notes] as mono 16-bit samples at [sampleRate], gaps as silence. */
    fun render(notes: List<Note>, sampleRate: Int, gain: Double = 0.5): ShortArray {
        val total = notes.sumOf { (it.ms + it.gapMs) * sampleRate / 1000 }
        val out = ShortArray(total)
        var at = 0
        for (n in notes) {
            val frames = n.ms * sampleRate / 1000
            for (i in 0 until frames) {
                val s = sin(2.0 * PI * n.hz * i / sampleRate) * envelope(i, frames) * gain
                out[at + i] = (s * Short.MAX_VALUE).toInt().toShort()
            }
            at += frames + n.gapMs * sampleRate / 1000
        }
        return out
    }

    /** 10% linear attack, 20% linear release, flat between: no clicks at either end. */
    fun envelope(i: Int, frames: Int): Double {
        val attack = frames * 0.1
        val release = frames * 0.2
        return when {
            i < attack -> i / attack
            i > frames - release -> ((frames - i) / release).coerceAtLeast(0.0)
            else -> 1.0
        }
    }
}
