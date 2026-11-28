package ai.saarthi.app.speech

import android.content.Context
import android.util.Log
import java.io.File
import java.io.IOException

/**
 * The demo build carries the Whisper model inside the APK (team decision, 29 Oct: offline is a
 * rule, D17). sherpa-onnx loads models from files, so on the first launch the model is copied once
 * from the APK's assets (`stt/<name>/`) into the app's files dir, where [WhisperEngine] reads it.
 * The dev build has no bundled model and keeps using `tools/push_stt_models.sh`.
 */
object SttAssets {
    private const val TAG = "Saarthi/stt"

    /** Copies [name]'s files from assets into [dir]/[name] if missing; returns what it did, for the log. */
    fun install(context: Context, dir: File, name: String): String {
        val wanted = WhisperEngine.files(dir, name)
        if (wanted.all { it.isFile && it.length() > 0 }) return "already installed"
        val bundled = try { context.assets.list("stt/$name")?.toSet() ?: emptySet() } catch (e: IOException) { emptySet() }
        if (wanted.any { it.name !in bundled }) return "not bundled in this build"
        val t0 = System.currentTimeMillis()
        for (f in wanted) {
            f.parentFile?.mkdirs()
            val part = File(f.path + ".part")
            context.assets.open("stt/$name/${f.name}").use { input -> part.outputStream().use { input.copyTo(it, 1 shl 20) } }
            if (!part.renameTo(f)) Log.e(TAG, "could not move ${part.name} into place")
        }
        return "copied from the APK in ${System.currentTimeMillis() - t0} ms"
    }
}
