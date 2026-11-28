package ai.saarthi.app.app

import android.content.BroadcastReceiver
import android.content.Context
import android.content.Intent
import android.content.IntentFilter
import androidx.core.content.ContextCompat
import java.io.File

/**
 * Dev build only (the demo build has an empty DevHooks): lets the team or the agent send a typed
 * request into the same answer path as speech, to test answers without speaking:
 *
 *   adb shell am broadcast -a ai.saarthi.dev.ASK --es text "where is the laptop"
 *
 * Every such request is labelled SIMULATED in the feed (model "typed (SIMULATED)"), PRD rule 7.1.
 *
 * And saves a short labelled clip of frames for System 2's offline work ([FrameCapture], D34):
 *
 *   adb shell am broadcast -a ai.saarthi.dev.CAPTURE --es label laptop_picture --ei seconds 15
 *
 * And starts the safety SOS as if the phone had fallen (D47; SIMULATED in the feed, "[TEST]" in the SMS):
 *
 *   adb shell am broadcast -a ai.saarthi.dev.FALL
 */
object DevHooks {
    private val receivers = ArrayList<BroadcastReceiver>()

    fun install(context: Context, core: SaarthiCore) {
        register(context, "ai.saarthi.dev.ASK") { i -> i.getStringExtra("text")?.let(core::askText) }
        register(context, "ai.saarthi.dev.FALL") { core.simulateFall() }
        register(context, "ai.saarthi.dev.CAPTURE") { i ->
            val label = i.getStringExtra("label") ?: "clip"
            val seconds = i.getIntExtra("seconds", 15).coerceIn(1, 60)
            val cap = FrameCapture(File(context.getExternalFilesDir(null), "captures"), label, seconds, core::poseAt)
            core.frameTap = { f ->
                cap.offer(f)
                if (cap.done) { core.frameTap = null; cap.close() }
            }
        }
    }

    private fun register(context: Context, action: String, onReceive: (Intent) -> Unit) {
        val r = object : BroadcastReceiver() {
            override fun onReceive(c: Context, i: Intent) = onReceive(i)
        }
        ContextCompat.registerReceiver(context, r, IntentFilter(action), ContextCompat.RECEIVER_EXPORTED)
        receivers += r
    }

    fun uninstall(context: Context) {
        receivers.forEach { runCatching { context.unregisterReceiver(it) } }
        receivers.clear()
    }
}
