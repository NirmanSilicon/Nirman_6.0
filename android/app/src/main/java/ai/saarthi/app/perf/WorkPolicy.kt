package ai.saarthi.app.perf

/**
 * How much work each part does, from what is going on and how warm the phone is (Phase 5, D59).
 * Pure functions, so every rule is unit-tested; the app shell applies them.
 *
 * Measured (baseline, 1 Nov): the app used ~2.2 of 8 cores; preparing all 30 camera frames a second cost
 * ~45% of a core although the detector uses ~5, and hands ~40% at ~4 runs a second. The vendor caps the
 * big cores from the first minute while Android's thermal status stays NOMINAL, so the heat tier also
 * reads the signals the app can see itself (headroom, battery temperature, the big cores' cap).
 */
object WorkPolicy {

    /**
     * Heat tiers. [detectorMinIntervalMs] never goes below 3 runs a second: D58's still-camera watch needs
     * them while the camera is still (CRITICAL was 600 ms = 1.7 runs a second before D59).
     */
    enum class HeatTier(val detectorMinIntervalMs: Long) { NOMINAL(0), WARM(0), HOT(250), CRITICAL(330) }

    /** What the app can read about heat; null = not readable on this phone. */
    data class HeatSignals(val status: Int, val headroom: Float?, val batteryC: Float?, val bigCapMHz: Int?)

    // Android's PowerManager.THERMAL_STATUS_* values (the constants are not available in JVM tests).
    private const val STATUS_LIGHT = 1
    private const val STATUS_MODERATE = 2
    private const val STATUS_SEVERE = 3

    /**
     * The tier from all signals: the warmest one wins. Starting values (D59), to be calibrated on the
     * Vivo from the next heat run, which logs every signal next to the real temperatures:
     * battery 39 / 42 / 45 °C (baseline: 32 → 37.4 °C in 11 min, skin then 46 °C); headroom 0.85 / 0.95 /
     * 1.05 (1.0 = Android's forecast of throttling); big-core cap at or below 1400 / 1100 MHz (stock
     * 2203; the baseline stepped to 1650 MHz by minute 7 with the detector still at ~5 runs a second).
     */
    fun tier(s: HeatSignals): HeatTier {
        val byStatus = when {
            s.status >= STATUS_SEVERE -> HeatTier.CRITICAL
            s.status >= STATUS_MODERATE -> HeatTier.HOT
            s.status >= STATUS_LIGHT -> HeatTier.WARM
            else -> HeatTier.NOMINAL
        }
        val byBattery = s.batteryC?.let {
            when { it >= 45f -> HeatTier.CRITICAL; it >= 42f -> HeatTier.HOT; it >= 39f -> HeatTier.WARM; else -> HeatTier.NOMINAL }
        } ?: HeatTier.NOMINAL
        val byHeadroom = s.headroom?.takeIf { !it.isNaN() }?.let {
            when { it >= 1.05f -> HeatTier.CRITICAL; it >= 0.95f -> HeatTier.HOT; it >= 0.85f -> HeatTier.WARM; else -> HeatTier.NOMINAL }
        } ?: HeatTier.NOMINAL
        val byCap = s.bigCapMHz?.let {
            when { it <= 1100 -> HeatTier.HOT; it <= 1400 -> HeatTier.WARM; else -> HeatTier.NOMINAL }
        } ?: HeatTier.NOMINAL
        return listOf(byStatus, byBattery, byHeadroom, byCap).maxBy { it.ordinal }
    }

    /**
     * How many of the sensor's 30 frames a second are prepared (the sensor keeps 30 fps, so exposures stay
     * short and sharp; skipped frames are closed unread). All while a hand is guided (the cue follows the
     * newest frame); else 20 (team, D60: 15 felt likely to miss things; the detector takes ~5 and hands at
     * most 4, so 20 gives every run a frame at most 50 ms old); 15 when hot.
     */
    fun framesPerSecond(guiding: Boolean, tier: HeatTier): Int = when {
        guiding -> 30
        tier.ordinal >= HeatTier.HOT.ordinal -> 15
        else -> 20
    }

    /** A hand seen this recently keeps hand runs at the idle rate; after that, the quiet rate. */
    const val HAND_RECENT_MS = 5_000L
    const val HANDS_IDLE_MS = 250L
    const val HANDS_QUIET_MS = 500L
    const val HANDS_QUIET_WARM_MS = 700L

    /**
     * Least time between hand runs. [fullRate] (guiding a hand, teaching or asking about a watch): as fast
     * as the tracker runs, slowed only when hot. Else ~4 a second while a hand was seen in the last 5 s
     * (enough for "a hand covers it", D32, and the own-hand rule, D58); else ~2 a second, so a hand coming
     * in is found within half a second and the rate goes back up.
     */
    fun handsIntervalMs(fullRate: Boolean, sinceHandMs: Long, tier: HeatTier): Long = when {
        fullRate -> tier.detectorMinIntervalMs / 2
        sinceHandMs <= HAND_RECENT_MS -> maxOf(HANDS_IDLE_MS, tier.detectorMinIntervalMs)
        tier == HeatTier.NOMINAL -> HANDS_QUIET_MS
        else -> HANDS_QUIET_WARM_MS
    }
}
