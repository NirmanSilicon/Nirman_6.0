package ai.saarthi.app.capture

import android.graphics.Bitmap

/**
 * One upright camera frame. [timestampNs] is `SystemClock.elapsedRealtimeNanos()` when the frame
 * reached the app; everything computed from the frame carries it, so displays can draw results
 * against the frame they came from (PRD 10). [bitmap] is only valid during the callback.
 */
class Frame(val bitmap: Bitmap, val index: Long, val timestampNs: Long)
