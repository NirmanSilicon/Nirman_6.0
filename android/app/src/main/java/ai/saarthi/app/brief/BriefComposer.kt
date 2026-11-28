package ai.saarthi.app.brief

// Adapted from SecondSense voice/SceneNarrator.kt and memory/MemoryPhrase.kt (owners' permission,
// commit cc122ea): assemble one short sentence from the current detections, with coarse buckets
// for direction (never numbers), no language model. Changed: table scale instead of walking (no
// drop-offs, no steps); only confirmed, confident tracks are spoken; same-class objects are
// grouped ("two cups"); people are counted, never described; every left-out track keeps a reason
// so the session log (and later the blueprint) can show why it was not said; screen rules (D12);
// Phase 2: objects come from the world map, placed by clock direction and reach zone (D20).

import ai.saarthi.app.geometry.Box
import ai.saarthi.app.perception.SpokenNames
import ai.saarthi.app.perception.Track
import ai.saarthi.app.system2.Assessment
import ai.saarthi.app.system2.RealitySpeech
import ai.saarthi.app.system2.Verdict
import ai.saarthi.app.table.Direction
import ai.saarthi.app.worldmap.Scene
import ai.saarthi.app.worldmap.Seen
import ai.saarthi.app.worldmap.WorldObject

/**
 * The brief (PRD 5.2, before salience): what Saarthi is confident about, in a few short phrases,
 * each placed relative to the user: a clock direction and a reach zone when the phone knows its
 * orientation, else the frame's left / front / right. Not yet salience-ranked or belief-aware
 * (Phase 3).
 */
class BriefComposer(
    /** A confirmed track with a smoothed score this high may be stated (D12). */
    private val strongScore: Float = 0.6f,
    /** Or: seen in at least this share of recent detector runs (D12)… */
    private val minPresence: Float = 0.7f,
    /** …with at least this mean score over those sightings… */
    private val minPresenceScore: Float = 0.35f,
    /** …and at least this many recent sightings. */
    private val minRecentHits: Int = 3,
    /**
     * Team decision (31 Oct, D38): the showcase objects ([SHOWCASE]) may be stated once seen in at
     * least [minRecentHits] recent runs with this mean score, the detector's own floor, without the
     * presence share above. On the Vivo they often score 0.4-0.5 under awkward light, and the
     * stricter rule made the team aim the phone until they turned green.
     */
    private val showcaseScore: Float = 0.3f,
    /** A track not seen for longer than this is not described as present. */
    private val maxAgeMs: Long = 1_000L,
    /** At most this many phrases, people included (PRD 5.2: three to five items). */
    private val maxItems: Int = 5,
    /** A person box smaller than this share of the frame, touching its edge, may be a hand. */
    private val minPersonArea: Float = 0.08f,
    /** An object the camera has turned away from is still described for this long after it was last seen. */
    private val recallMs: Long = 20_000L,
    /**
     * …and only if it was seen for at least this long: a glimpse during a pan is not enough to
     * describe from memory (Vivo, 29 Oct replay: a 0.6 s "mouse" glimpse recalled as a third mouse).
     */
    private val minRecallSeenMs: Long = 1_500L,
) {
    enum class Zone(val phrase: String) { LEFT("on your left"), FRONT("in front of you"), RIGHT("on your right") }

    data class Item(val phrase: String, val trackIds: List<Int>, val worldIds: List<Int> = emptyList())
    data class LeftOut(val trackId: Int?, val label: String, val reason: String, val worldId: Int? = null)
    /**
     * [unchanged] = objects left out because the user already knows them and nothing changed (salience, PRD 5.2).
     * [sureTracks] = tracks that pass every speaking rule, whether or not this brief names them (green on screens).
     */
    data class Brief(
        val text: String, val opener: String?, val items: List<Item>, val leftOut: List<LeftOut>,
        val unchanged: List<Int> = emptyList(), val sureTracks: Set<Int> = emptySet(),
    )

    /** Whether the evidence for [t] is enough to state it as fact; null if so, else the reason. */
    fun evidenceGap(t: Track, nowMs: Long): String? = when {
        !t.confirmed -> "not yet confirmed (${t.hits} sightings)"
        nowMs - t.lastSeenMs > maxAgeMs -> "not seen for ${nowMs - t.lastSeenMs} ms"
        t.score >= strongScore -> null
        t.label in SHOWCASE && t.recentHits >= minRecentHits && t.recentMeanScore >= showcaseScore -> null
        t.recentHits >= minRecentHits && t.presence >= minPresence && t.recentMeanScore >= minPresenceScore -> null
        else -> "weak: score %.2f, seen in %d of %d recent runs".format(t.score, t.recentHits, t.recentRuns)
    }

    /**
     * Every speaking rule for one track, judged at [nowMs] among [all]: null if it may be said, else
     * why not. [reality] = System 2's assessments by track id (Phase 4).
     */
    fun whyNotStatable(
        t: Track, all: List<Track>, nowMs: Long, hands: List<Box> = emptyList(), reality: Map<Int, Assessment> = emptyMap(),
    ): String? {
        evidenceGap(t, nowMs)?.let { return it }
        // Screens outside the kit (a "tv") still count when deciding what may be a picture.
        if (!SpokenNames.isInKit(t.label)) return NOT_IN_KIT
        val evidenced = all.filter { evidenceGap(it, nowMs) == null }
        val checked = reality[t.id]
        return duplicateReason(t, evidenced) ?: screenReason(t, evidenced, checked) ?: checked?.doubt
            ?: handReason(t, hands) ?: edgePersonReason(t)
    }

    /**
     * The detector sometimes boxes one object twice, the second box a part of the first (Vivo,
     * 29 Oct: two "laptop" boxes, one 84% inside the other, said as two laptops). A box mostly
     * inside a bigger box of the same class is that same object.
     */
    private fun duplicateReason(t: Track, others: List<Track>): String? =
        if (others.any { it.id != t.id && it.label == t.label && it.box.area > t.box.area && containedFraction(t.box, it.box) >= 0.7f })
            "inside a bigger ${SpokenNames.of(t.label)} box: the same object seen twice" else null

    fun compose(tracks: List<Track>, nowMs: Long): Brief = compose(Scene.of(tracks), nowMs)

    /**
     * [known] = world entries the user already knows and that have not changed since (belief map).
     * With any, this is a repeated brief: it says only what is new or changed, and then "Nothing else
     * has changed", or "Same as before: …" when nothing did (PRD 5.2: repeated briefs mention only
     * changes). Without, the full brief.
     */
    fun compose(scene: Scene, nowMs: Long, known: Set<Int> = emptySet()): Brief {
        val leftOut = ArrayList<LeftOut>()
        val worldOf = scene.world.filter { it.track != null }.associateBy { it.track!!.id }
        val trackOk = HashSet<Int>()
        val reality = scene.realityByTrack
        for (t in scene.tracks) {
            val reason = whyNotStatable(t, scene.tracks, nowMs, scene.hands, reality)
            if (reason == null) trackOk += t.id else leftOut += LeftOut(t.id, t.label, reason, worldOf[t.id]?.id)
        }
        val usable = ArrayList<WorldObject>()
        // A same-class object in view may be the very object remembered out of view, re-found a
        // little elsewhere (handheld steps, gyro drift): never risk counting it twice.
        val inViewClasses = scene.world.filter { it.seen == Seen.IN_VIEW && it.track?.let { t -> t.id in trackOk } == true }.map { it.label }.toSet()
        for (o in scene.world) {
            when (o.seen) {
                Seen.IN_VIEW -> if (o.track != null && o.track.id in trackOk) usable += o
                Seen.OUT_OF_VIEW -> {
                    val age = nowMs - o.lastSeenMs
                    when {
                        !o.statable -> leftOut += LeftOut(null, o.label, "out of view; when last seen: ${o.notStatable}", o.id)
                        age > recallMs -> leftOut += LeftOut(null, o.label, "out of view for ${age / 1000} s", o.id)
                        o.label in inViewClasses -> leftOut += LeftOut(null, o.label, "out of view; may be the one in view", o.id)
                        o.lastSeenMs - o.firstSeenMs < minRecallSeenMs ->
                            leftOut += LeftOut(null, o.label, "out of view; only glimpsed (${o.lastSeenMs - o.firstSeenMs} ms)", o.id)
                        else -> usable += o
                    }
                }
                Seen.NOT_SEEN -> leftOut += LeftOut(null, o.label, "in view but not seen for ${(nowMs - o.lastSeenMs) / 100 / 10.0} s", o.id)
            }
        }

        val fwd = scene.forwardYawDeg
        val table = usable.filter { it.label == "dining table" }
        val people = usable.filter { it.isPerson }
        val allObjects = usable.filter { it.label != "dining table" && !it.isPerson }
        val unchanged = allObjects.filter { it.id in known }
        val objects = allObjects - unchanged.toSet()
        unchanged.forEach { leftOut += LeftOut(it.track?.id, it.label, "already known, unchanged since told", it.id) }
        val repeat = known.isNotEmpty()
        val opener = if (table.isNotEmpty() && !repeat) "You're at a table." else null

        // Nearest first when distances are known; otherwise biggest first (a proxy for nearest).
        val groups = objects.groupBy { it.label }.values.sortedBy { g ->
            val near = fwd?.let { f -> g.mapNotNull { it.placement(f)?.distM }.minOrNull() }
            near ?: (10f - g.maxOf { it.lastBox.area })
        }
        val items = ArrayList<Item>()
        val objectSlots = maxItems - if (people.isNotEmpty()) 1 else 0
        for ((i, g) in groups.withIndex()) {
            if (i >= objectSlots) {
                g.forEach { leftOut += LeftOut(it.track?.id, it.label, "brief already has $maxItems items", it.id) }
                continue
            }
            items += Item(objectPhrase(SpokenNames.of(g.first().label), g, fwd), g.mapNotNull { it.track?.id }, g.map { it.id })
        }
        if (people.isNotEmpty()) items += Item(peoplePhrase(people, fwd, table.isNotEmpty()), people.mapNotNull { it.track?.id }, people.map { it.id })
        // Pictures System 2 has settled: said as pictures, never as objects (no world ids: the user does not
        // come to believe in a real object). Only kit objects, only in view, within the item budget.
        val pictures = scene.world.filter { o ->
            o.seen == Seen.IN_VIEW && scene.reality[o.id]?.verdict == Verdict.PICTURE && SpokenNames.isInKit(o.label) && o.id !in unchanged.map { it.id }
        }
        for (g in pictures.groupBy { it.label }.values) {
            if (items.size >= maxItems) break
            val o = g.first()
            items += Item("${RealitySpeech.pictureOf(o.label, scene.reality[o.id])} ${where(listOf(o), fwd)}", g.mapNotNull { it.track?.id })
        }

        val text = when {
            repeat && items.isEmpty() && unchanged.isNotEmpty() -> "Same as before: ${namesOf(unchanged)}."
            repeat && unchanged.isNotEmpty() -> sentence(items.map { it.phrase }) + " Nothing else has changed."
            items.isEmpty() && opener == null -> NOTHING
            items.isEmpty() -> "$opener I don't see anything on it I can name yet."
            else -> listOfNotNull(opener, sentence(items.map { it.phrase })).joinToString(" ")
        }
        return Brief(text, opener, items, leftOut, unchanged.map { it.id }, trackOk)
    }

    /** "a cup, two bottles and a laptop": the objects by name only, nearest group first. */
    private fun namesOf(objects: List<WorldObject>): String = joinAnd(objects.groupBy { it.label }.values.map { g ->
        val name = SpokenNames.of(g.first().label)
        if (g.size > 1) "${count(g.size)} ${plural(name)}" else "${article(name)} $name"
    })

    /**
     * Screens. A "tv" box lying on a laptop is the laptop's own screen (said once, as the laptop).
     * Anything else whose box lies inside a screen's box may be a picture on that screen: it is left
     * out rather than stated as a real object, unless System 2's evidence has settled it as real
     * (a real apple in front of the laptop; Phase 4, replacing D12's fixed rule).
     */
    private fun screenReason(t: Track, others: List<Track>, checked: Assessment?): String? {
        if (checked?.verdict == Verdict.REAL) return null
        for (s in others) {
            if (s.id == t.id || s.label !in SCREENS) continue
            val inside = containedFraction(t.box, s.box)
            if (t.label == "tv" && s.label == "laptop" && inside >= 0.6f) return "the laptop's own screen"
            if (t.label !in SCREENS && t.box.area < s.box.area && inside >= 0.9f) {
                return "inside a ${SpokenNames.of(s.label)}'s box: may be a picture (System 2: checking)"
            }
        }
        return null
    }

    /**
     * The detector's "person" class fires on a hand in view. A "person" box mostly covered by a
     * tracked hand is that hand (Phase 2 hand tracking; D14's edge rule below stays as a fallback
     * for frames where the hand tracker misses).
     */
    private fun handReason(t: Track, hands: List<Box>): String? {
        if (t.label != "person") return null
        return if (hands.any { containedFraction(t.box, it) >= 0.5f }) "a tracked hand, not a person" else null
    }

    /**
     * A small person box touching the frame's edge is far more likely the user's own hand than
     * someone at the table (Vivo, 28 Oct: a little finger at the left edge became "one person on
     * your left"; D14).
     */
    private fun edgePersonReason(t: Track): String? {
        if (t.label != "person") return null
        val b = t.box
        val atEdge = b.left <= EDGE || b.right >= 1f - EDGE || b.bottom >= 1f - EDGE
        return if (atEdge && b.area < minPersonArea) "small and at the frame edge: may be a hand" else null
    }

    private fun containedFraction(inner: Box, outer: Box): Float {
        val iw = (minOf(inner.right, outer.right) - maxOf(inner.left, outer.left)).coerceAtLeast(0f)
        val ih = (minOf(inner.bottom, outer.bottom) - maxOf(inner.top, outer.top)).coerceAtLeast(0f)
        return if (inner.area <= 0f) 0f else iw * ih / inner.area
    }

    private fun objectPhrase(name: String, group: List<WorldObject>, fwd: Float?): String {
        val noun = when {
            group.size > 1 -> "${count(group.size)} ${plural(name)}"
            name == "scissors" -> "a pair of scissors"
            else -> "${article(name)} $name"
        }
        return "$noun ${where(group, fwd)}"
    }

    /** "slightly to your right, within reach"; for a group, "in front of you and on your right" (the reach only if shared). */
    fun where(group: List<WorldObject>, fwd: Float?): String {
        val bearings = fwd?.let { f -> group.map { it.bodyBearingDeg(f) } }
        if (bearings == null || bearings.any { it == null }) return zonesPhrase(group.map { zoneOf(it.lastBox) })
        val dir = joinAnd(bearings.filterNotNull().sorted().map { Direction.phrase(it) }.distinct())
        val reaches = group.map { it.placement(fwd)?.reach }.distinct()
        return if (reaches.size == 1 && reaches.single() != null) "$dir, ${reaches.single()!!.phrase}" else dir
    }

    private fun peoplePhrase(people: List<WorldObject>, fwd: Float?, atTable: Boolean): String {
        val noun = if (people.size == 1) "one person" else "${count(people.size)} people"
        val bearings = fwd?.let { f -> people.map { it.bodyBearingDeg(f) } }
        if (bearings == null || bearings.any { it == null }) return "$noun ${zonesPhrase(people.map { zoneOf(it.lastBox) })}"
        val sides = bearings.map { personSide(it!!, atTable) }
        val bySide = sides.groupingBy { it }.eachCount()
        if (bySide.size == 1) return "$noun ${bySide.keys.single()}"
        val order = listOf(ACROSS, AHEAD, LEFT_SIDE, RIGHT_SIDE)
        return "$noun: " + bySide.entries.sortedBy { order.indexOf(it.key) }.joinToString(", ") { (side, n) -> "${count(n)} $side" }
    }

    private fun sentence(phrases: List<String>): String {
        val s = phrases.joinToString(if (phrases.any { ',' in it }) "; " else ", ")
        return s.replaceFirstChar { it.uppercase() } + "."
    }

    companion object {
        const val NOTHING = "I don't see anything I can name yet."
        private val SCREENS = setOf("laptop", "tv", "cell phone")
        const val NOT_IN_KIT = "not in the demo kit"
        /**
         * The objects certain to be in the showcase (team, 31 Oct): a lower score bar (D38). The team
         * also named the mouse, but with this bar a recorded session (29 Oct) said "three mice": the
         * detector's most frequent misreading (a charger) passes it. The mouse keeps the stricter rule.
         */
        val SHOWCASE = setOf("apple", "laptop", "bottle", "cup")
        private const val EDGE = 0.02f
        /** People within this many degrees of straight ahead are "across the table". */
        const val PERSON_AHEAD_DEG = 20f
        private const val ACROSS = "across the table"
        private const val AHEAD = "in front of you"
        private const val LEFT_SIDE = "on your left"
        private const val RIGHT_SIDE = "on your right"

        fun personSide(bearingDeg: Float, atTable: Boolean): String = when {
            bearingDeg < -PERSON_AHEAD_DEG -> LEFT_SIDE
            bearingDeg > PERSON_AHEAD_DEG -> RIGHT_SIDE
            atTable -> ACROSS
            else -> AHEAD
        }

        /** Thirds of the frame. The camera sees about 54° across in portrait, so each third is about 18°. */
        fun zoneOf(t: Track): Zone = zoneOf(t.box)

        fun zoneOf(b: Box): Zone {
            val cx = (b.left + b.right) / 2f
            return when {
                cx < 1f / 3f -> Zone.LEFT
                cx > 2f / 3f -> Zone.RIGHT
                else -> Zone.FRONT
            }
        }

        /** "on your left", or "spread left and right" when a group spans zones (no IMU). */
        fun zonesPhrase(zones: List<Zone>): String {
            val distinct = zones.distinct().sortedBy { it.ordinal }
            if (distinct.size == 1) return distinct.single().phrase
            val words = distinct.map { if (it == Zone.FRONT) "in front" else it.name.lowercase() }
            return "spread " + joinAnd(words)
        }

        fun joinAnd(words: List<String>): String =
            if (words.size <= 1) words.joinToString() else words.dropLast(1).joinToString(", ") + " and " + words.last()

        fun article(name: String) = if (name.first().lowercaseChar() in "aeiou") "an" else "a"

        fun count(n: Int) = listOf("no", "one", "two", "three", "four", "five", "six").getOrElse(n) { n.toString() }

        fun plural(name: String): String = when {
            name == "scissors" -> "pairs of scissors"
            name == "mouse" -> "mice"
            name == "knife" -> "knives"
            name.endsWith("s") || name.endsWith("sh") || name.endsWith("ch") || name.endsWith("x") -> name + "es"
            else -> name + "s"
        }
    }
}
