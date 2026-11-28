package ai.saarthi.app.perception

import org.junit.Assert.assertEquals
import org.junit.Test

class SpokenNamesTest {

    @Test
    fun `the detector's dining table is always a table, spoken and shown`() {
        assertEquals("table", SpokenNames.of("dining table"))
        assertEquals("table", SpokenNames.display("dining table"))
    }

    @Test
    fun `other screen labels stay as the detector reported them`() {
        assertEquals("cell phone", SpokenNames.display("cell phone"))
        assertEquals("phone", SpokenNames.of("cell phone"))
    }
}
