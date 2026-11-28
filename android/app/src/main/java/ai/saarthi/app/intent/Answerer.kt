package ai.saarthi.app.intent

import ai.saarthi.app.brief.BriefComposer
import ai.saarthi.app.perception.SpokenNames
import ai.saarthi.app.perception.Track
import ai.saarthi.app.table.Direction
import ai.saarthi.app.system2.RealitySpeech
import ai.saarthi.app.table.Reach
import ai.saarthi.app.worldmap.Relations
import ai.saarthi.app.worldmap.Scene
import ai.saarthi.app.worldmap.Seen
import ai.saarthi.app.worldmap.WorldObject

/**
 * Turns a recognised intent and the world map into one short, true sentence (PRD 5.9).
 * It only answers from what the phone has evidence for; intents whose features are not built yet
 * get an honest "I can't … yet", never an invented answer.
 */
class Answerer(private val composer: BriefComposer = BriefComposer()) {

    /**
     * [text] to speak (null = say nothing, e.g. "stop"); [isBrief] = speak it as a brief; [about] =
     * the world-map entries the answer places, which the user then knows (belief map).
     */
    data class Reply(
        val text: String?, val isBrief: Boolean = false, val stop: Boolean = false, val about: List<Int> = emptyList(),
        /** Read the text in view (the core does it on a camera frame), or continue reading. */
        val read: Boolean = false, val readMore: Boolean = false,
        /** Start guiding the hand to this world-map entry (PRD 5.3). */
        val guideTo: Int? = null,
        /** World-map entries whose real-or-picture verdict is still open: re-check while the user moves the phone. */
        val checkReal: List<Int> = emptyList(),
        /**
         * "Is it real?" about objects in view: the core may run the torch test on [torchIds] first and
         * answer after it (D38), instead of saying [text] now. [torchClass] = the class asked about, or null.
         */
        val torchIds: List<Int> = emptyList(),
        val torchClass: String? = null,
        /**
         * A request about the user's own hand: teach a personal object, "is this mine?", or "what's this?"
         * (D49). The core answers it from the hand and the camera, not from the world map alone.
         */
        val personal: Intent? = null,
    )

    fun answer(intent: Intent, tracks: List<Track>, nowMs: Long, lastSaid: String?): Reply =
        answer(intent, Scene.of(tracks), nowMs, lastSaid)

    fun answer(intent: Intent, scene: Scene, nowMs: Long, lastSaid: String?): Reply {
        val brief = composer.compose(scene, nowMs)
        val said = brief.items.flatMap { it.worldIds }.toSet()
        val stated = scene.world.filter { it.id in said }
        val fwd = scene.forwardYawDeg
        return when (intent) {
            Intent.Brief -> Reply(brief.text, isBrief = true)
            is Intent.Find -> Reply(find(intent, scene, stated, nowMs), about = stated.filter { it.label == intent.cocoClass }.map { it.id })
            Intent.People -> Reply(people(stated.filter { it.isPerson }, fwd, atTable(stated)))
            is Intent.WhoIsOn -> Reply(whoIsOn(intent.side, stated.filter { it.isPerson }, fwd, atTable(stated)))
            is Intent.ObjectsOn -> Reply(objectsOn(intent.side, stated, fwd), about = sideObjects(intent.side, stated, fwd).map { it.id })
            Intent.InReach -> Reply(inReach(stated, fwd), about = fwd?.let { f -> things(stated).filter { it.placement(f)?.reach == Reach.WITHIN }.map { it.id } } ?: emptyList())
            Intent.WhatChanged -> Reply("I can't keep track of changes yet.")
            is Intent.IsMine, is Intent.TeachMine, is Intent.TeachOther, Intent.WhatIsThis, is Intent.Online, is Intent.Note, Intent.ReadNotes -> Reply(null, personal = intent)
            is Intent.IsReal -> isReal(intent, scene, nowMs)
            is Intent.Guide -> guide(intent, stated, fwd)
            Intent.Read -> Reply(null, read = true)
            Intent.ReadMore -> Reply(null, readMore = true)
            Intent.Repeat -> Reply(lastSaid ?: "I haven't said anything yet.")
            Intent.Stop -> Reply(null, stop = true)
            Intent.Help -> Reply("You can ask what's around you, where something is, what's within reach, who is on your right, or say read this.")
            is Intent.Unknown -> Reply(if (intent.transcript.isBlank()) "I didn't hear anything." else "Sorry, I didn't catch that.")
        }
    }

    private fun atTable(stated: List<WorldObject>) = stated.any { it.label == "dining table" }

    /** "Is the apple real?" (System 2, docs/SYSTEM2.md): from the evidence ledger, never from the detector's score. */
    private fun isReal(intent: Intent.IsReal, scene: Scene, nowMs: Long): Reply {
        val word = intent.spoken
        val cls = word?.let { ObjectWords.cocoClass(it) }
        if (word != null && cls == null && word != "it" && word != "this" && word != "that") return Reply("I can't recognise ${BriefComposer.article(word)} $word yet.")
        val a = RealitySpeech.answer(cls, scene, nowMs) { o -> composer.where(listOf(o), scene.forwardYawDeg) }
        return Reply(a.text, checkReal = a.pending, torchIds = RealitySpeech.candidates(cls, scene, nowMs).map { it.id }, torchClass = cls)
    }

    private fun find(intent: Intent.Find, scene: Scene, stated: List<WorldObject>, nowMs: Long): String {
        val cls = intent.cocoClass ?: return "I can't recognise a ${intent.spoken} yet."
        val name = SpokenNames.of(cls)
        val fwd = scene.forwardYawDeg
        val found = stated.filter { it.label == cls }
        if (found.size == 1) {
            val o = found.single()
            val where = composer.where(found, fwd)
            val rel = fwd?.let { Relations.of(o, stated, it) }?.let { ", ${it.rel.phrase} the ${SpokenNames.of(it.anchorLabel)}" } ?: ""
            // The spatial decay curve (D56): a place seen long ago, for a kind of object that moves often, is said
            // as a probability: "…, but it may have been moved since."
            val maybe = if (ai.saarthi.app.insight.SpatialDecay.stillThere(o.label, nowMs - o.lastSeenMs) < ai.saarthi.app.insight.SpatialDecay.SAY_MAYBE)
                ", but it may have been moved since" else ""
            return if (o.seen == Seen.OUT_OF_VIEW) "The $name was $where$rel, ${ago(nowMs - o.lastSeenMs)}$maybe."
            else "The $name is $where$rel."
        }
        if (found.size > 1) {
            val sorted = fwd?.let { f -> found.sortedBy { it.bodyBearingDeg(f) ?: 0f } } ?: found.sortedBy { it.lastBox.left }
            val wheres = sorted.map { composer.where(listOf(it), fwd) }
            val sep = if (wheres.any { ',' in it }) "; " else " and "
            return "${BriefComposer.count(found.size).replaceFirstChar { it.uppercase() }} ${BriefComposer.plural(name)}: " +
                wheres.joinToString(sep) { if (fwd != null) "one $it" else it } + "."
        }
        // Where it was is in view, but it is not seen now (Phase 3 decides moved or hidden).
        val lost = scene.world.filter { it.label == cls && it.seen == Seen.NOT_SEEN && it.statable }.maxByOrNull { it.lastSeenMs }
        if (lost != null) return "I can't see the $name any more; it was ${composer.where(listOf(lost), fwd)}."
        // Seen, but not enough evidence to state it (PRD 5.10): say so and ask for a steadier look.
        val weak = scene.world.filter { o ->
            val t = o.track
            o.label == cls && t != null && t.confirmed && nowMs - t.lastSeenMs <= 1_000
        }.maxByOrNull { it.track!!.score }
        if (weak != null) return "I might see ${BriefComposer.article(name)} $name ${composer.where(listOf(weak), fwd)}; hold still a second."
        return "I can't see ${BriefComposer.article(name)} $name right now."
    }

    /** "Guide my hand to the bottle": the nearest stated one, said with where it is, then guidance starts. */
    private fun guide(intent: Intent.Guide, stated: List<WorldObject>, fwd: Float?): Reply {
        val cls = intent.cocoClass ?: return Reply("I can't recognise a ${intent.spoken} yet.")
        val name = SpokenNames.of(cls)
        val target = stated.filter { it.label == cls }
            .minByOrNull { o -> fwd?.let { o.placement(it)?.distM } ?: (1f - o.lastBox.area) }
            ?: return Reply("I can't see ${BriefComposer.article(name)} $name right now.")
        return Reply("Guiding you to the $name, ${composer.where(listOf(target), fwd)}.", about = listOf(target.id), guideTo = target.id)
    }

    private fun ago(ms: Long): String = when {
        ms < 2_000 -> "a moment ago"
        else -> "${ms / 1000} seconds ago"
    }

    private fun people(people: List<WorldObject>, fwd: Float?, atTable: Boolean): String {
        if (people.isEmpty()) return "I don't see anyone."
        val total = if (people.size == 1) "One person" else "${BriefComposer.count(people.size).replaceFirstChar { it.uppercase() }} people"
        val sides = sidesOf(people, fwd, atTable)
        val bySide = sides.groupingBy { it }.eachCount()
        if (bySide.size == 1) return "$total ${bySide.keys.single()}."
        return "$total: " + bySide.entries.sortedBy { SIDE_ORDER.indexOf(it.key) }.joinToString(", ") { (s, n) -> "${BriefComposer.count(n)} $s" } + "."
    }

    private fun whoIsOn(side: Intent.Side, people: List<WorldObject>, fwd: Float?, atTable: Boolean): String {
        val phrase = if (side == Intent.Side.LEFT) "on your left" else "on your right"
        val n = sidesOf(people, fwd, atTable).count { it == phrase }
        return when (n) {
            0 -> "I don't see anyone $phrase."
            1 -> "One person $phrase."
            else -> "${BriefComposer.count(n).replaceFirstChar { it.uppercase() }} people $phrase."
        }
    }

    /** Each person's side: by bearing from the user's forward when known, else by the frame's thirds. */
    private fun sidesOf(people: List<WorldObject>, fwd: Float?, atTable: Boolean): List<String> = people.map { p ->
        val b = fwd?.let { p.bodyBearingDeg(it) }
        if (b != null) BriefComposer.personSide(b, atTable) else BriefComposer.zoneOf(p.lastBox).phrase
    }

    private fun things(stated: List<WorldObject>) = stated.filter { !it.isPerson && it.label != "dining table" }

    private fun objectsOn(side: Intent.Side, stated: List<WorldObject>, fwd: Float?): String {
        val phrase = if (side == Intent.Side.LEFT) "on your left" else "on your right"
        val chosen = sideObjects(side, stated, fwd)
        if (chosen.isEmpty()) return "I don't see anything I can name $phrase."
        return "${phrase.replaceFirstChar { it.uppercase() }}: " + list(chosen, fwd, withWhere = fwd != null) + "."
    }

    private fun sideObjects(side: Intent.Side, stated: List<WorldObject>, fwd: Float?) = things(stated).filter { o ->
        val b = fwd?.let { o.bodyBearingDeg(it) }
        if (b != null) (if (side == Intent.Side.LEFT) b < -SIDE_DEG else b > SIDE_DEG)
        else BriefComposer.zoneOf(o.lastBox) == (if (side == Intent.Side.LEFT) BriefComposer.Zone.LEFT else BriefComposer.Zone.RIGHT)
    }

    private fun inReach(stated: List<WorldObject>, fwd: Float?): String {
        fwd ?: return "I can't judge distances without the phone's motion sensors."
        val near = things(stated).filter { it.placement(fwd)?.reach == Reach.WITHIN }
        if (near.isEmpty()) return "Nothing I can name is within reach."
        return "Within reach: " + list(near, fwd, withWhere = true, withReach = false) + "."
    }

    /** "a cup slightly to your right, within reach, and a bottle on your right, out of reach". */
    private fun list(objects: List<WorldObject>, fwd: Float?, withWhere: Boolean, withReach: Boolean = true): String {
        val parts = objects.sortedBy { o -> fwd?.let { o.bodyBearingDeg(it) } ?: 0f }.map { o ->
            val name = SpokenNames.of(o.label)
            val where = if (!withWhere) "" else if (withReach) " " + composer.where(listOf(o), fwd)
            else fwd?.let { f -> o.bodyBearingDeg(f)?.let { " " + Direction.phrase(it) } } ?: ""
            "${BriefComposer.article(name)} $name$where"
        }
        return BriefComposer.joinAnd(parts)
    }

    private companion object {
        /** An object beyond "in front of you" is on that side (D24). */
        const val SIDE_DEG = Direction.AHEAD_DEG
        val SIDE_ORDER = listOf("across the table", "in front of you", "on your left", "on your right")
    }
}
