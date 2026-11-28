package ai.saarthi.app.perf

import ai.saarthi.app.perf.WorkPolicy.HeatSignals
import ai.saarthi.app.perf.WorkPolicy.HeatTier
import org.junit.Assert.assertEquals
import org.junit.Assert.assertTrue
import org.junit.Test

class WorkPolicyTest {

    private fun signals(status: Int = 0, headroom: Float? = null, batteryC: Float? = null, cap: Int? = null) =
        HeatSignals(status, headroom, batteryC, cap)

    @Test fun coolPhoneIsNominal() {
        assertEquals(HeatTier.NOMINAL, WorkPolicy.tier(signals(0, 0.5f, 33f, 2203)))
    }

    @Test fun unreadableSignalsFallBackToAndroidsStatus() {
        assertEquals(HeatTier.NOMINAL, WorkPolicy.tier(signals()))
        assertEquals(HeatTier.HOT, WorkPolicy.tier(signals(status = 2)))
        assertEquals(HeatTier.NOMINAL, WorkPolicy.tier(signals(headroom = Float.NaN)))
    }

    @Test fun warmestSignalWinsWhileAndroidSaysNominal() {
        // The baseline: status 0 throughout, while the phone got hot.
        assertEquals(HeatTier.WARM, WorkPolicy.tier(signals(0, 0.6f, 39.5f, 1650)))
        assertEquals(HeatTier.HOT, WorkPolicy.tier(signals(0, 0.6f, 36f, 1000)))
        assertEquals(HeatTier.CRITICAL, WorkPolicy.tier(signals(0, 1.1f, 36f, 2203)))
    }

    @Test fun baselineCapAloneIsNotWarm() {
        // 1650 MHz by minute 7 of the baseline, detector still ~5 runs a second.
        assertEquals(HeatTier.NOMINAL, WorkPolicy.tier(signals(cap = 1650)))
    }

    @Test fun detectorNeverBelowThreeRunsASecond() {
        // D58: the still-camera watch needs >= 3 runs a second.
        for (t in HeatTier.values()) assertTrue(t.name, t.detectorMinIntervalMs <= 334)
    }

    @Test fun everyFrameWhileGuidingEvenWhenHot() {
        for (t in HeatTier.values()) assertEquals(30, WorkPolicy.framesPerSecond(guiding = true, tier = t))
        assertEquals(20, WorkPolicy.framesPerSecond(false, HeatTier.NOMINAL))
        assertEquals(20, WorkPolicy.framesPerSecond(false, HeatTier.WARM))
        assertEquals(15, WorkPolicy.framesPerSecond(false, HeatTier.HOT))
    }

    @Test fun handsSlowDownOnlyWhenNoHandWasSeenLately() {
        assertEquals(0L, WorkPolicy.handsIntervalMs(fullRate = true, sinceHandMs = 60_000, tier = HeatTier.NOMINAL))
        assertEquals(250L, WorkPolicy.handsIntervalMs(false, 1_000, HeatTier.NOMINAL))
        assertEquals(250L, WorkPolicy.handsIntervalMs(false, 5_000, HeatTier.NOMINAL))
        assertEquals(500L, WorkPolicy.handsIntervalMs(false, 5_001, HeatTier.NOMINAL))
        assertEquals(700L, WorkPolicy.handsIntervalMs(false, 60_000, HeatTier.WARM))
    }

    @Test fun handsStayFreshEnoughForTheCoverRuleWhenAHandIsAround() {
        // A hand covering an object: hand boxes stay fresh 450 ms (D32), so runs at most 450 ms apart.
        for (t in HeatTier.values()) assertTrue(t.name, WorkPolicy.handsIntervalMs(false, 0, t) <= 450)
    }
}
