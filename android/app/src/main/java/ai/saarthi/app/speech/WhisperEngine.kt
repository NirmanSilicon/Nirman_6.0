package ai.saarthi.app.speech

// Adapted from SightBuddy core/stt/WhisperEngine.kt (MIT, Copyright (c) 2026 Drophouse Ltd, commit
// 578771d): sherpa-onnx offline Whisper recogniser, English, transcribe a whole utterance. Changed:
// no voice-activity detector (press-and-hold marks the utterance), models loaded from a directory
// by name (tiny.en, base.en) so models can be compared (D17), load time measured.

import android.os.SystemClock
import android.util.Log
import com.k2fsa.sherpa.onnx.FeatureConfig
import com.k2fsa.sherpa.onnx.OfflineModelConfig
import com.k2fsa.sherpa.onnx.OfflineRecognizer
import com.k2fsa.sherpa.onnx.OfflineRecognizerConfig
import com.k2fsa.sherpa.onnx.OfflineWhisperModelConfig
import java.io.File

/**
 * Offline English speech-to-text: Whisper (int8) through sherpa-onnx, on the phone's CPU.
 * Heavy to load (seconds): call [load] on a background thread once and reuse. Not thread-safe.
 */
class WhisperEngine private constructor(private val recognizer: OfflineRecognizer, val name: String, val loadMs: Long) {

    /** Blocking transcription of one utterance of 16 kHz mono audio in -1..1. */
    fun transcribe(samples: FloatArray): String {
        val stream = recognizer.createStream()
        return try {
            stream.acceptWaveform(samples, SAMPLE_RATE)
            recognizer.decode(stream)
            recognizer.getResult(stream).text.trim()
        } finally {
            stream.release()
        }
    }

    fun release() = recognizer.release()

    companion object {
        private const val TAG = "Saarthi/whisper"
        const val SAMPLE_RATE = 16_000

        /** The model files for [name] (e.g. "tiny.en") inside [dir]/[name]/. */
        fun files(dir: File, name: String) = listOf(
            File(dir, "$name/$name-encoder.int8.onnx"),
            File(dir, "$name/$name-decoder.int8.onnx"),
            File(dir, "$name/$name-tokens.txt"),
        )

        /** Blocking load; null (and an error log) if the files are missing or fail to load. Never a fallback. */
        fun load(dir: File, name: String, threads: Int = 4): WhisperEngine? {
            val (encoder, decoder, tokens) = files(dir, name)
            if (!encoder.exists() || !decoder.exists() || !tokens.exists()) {
                Log.e(TAG, "model $name not found in $dir (run tools/push_stt_models.sh)")
                return null
            }
            val t0 = SystemClock.elapsedRealtime()
            return try {
                val recognizer = OfflineRecognizer(
                    config = OfflineRecognizerConfig(
                        featConfig = FeatureConfig(sampleRate = SAMPLE_RATE, featureDim = 80),
                        modelConfig = OfflineModelConfig(
                            whisper = OfflineWhisperModelConfig(
                                encoder = encoder.absolutePath,
                                decoder = decoder.absolutePath,
                                language = "en",
                                task = "transcribe",
                            ),
                            tokens = tokens.absolutePath,
                            modelType = "whisper",
                            numThreads = threads,
                            debug = false,
                        ),
                    ),
                )
                WhisperEngine(recognizer, name, SystemClock.elapsedRealtime() - t0)
            } catch (e: Throwable) {
                Log.e(TAG, "failed to load whisper $name", e)
                null
            }
        }
    }
}
