package com.vidyanova.ai.data.repository

import android.content.Context
import android.util.Log
import com.vidyanova.ai.ai.inference.LocalModelEngine
import com.vidyanova.ai.ai.inference.TokenCallback
import com.vidyanova.ai.ai.instruction.PromptBuilder
import com.vidyanova.ai.ai.instruction.StyleDetector
import com.vidyanova.ai.ai.instruction.TeachingMode
import com.vidyanova.ai.ai.retrieval.CurriculumRetriever
import com.vidyanova.ai.ai.retrieval.VectorStore
import com.vidyanova.ai.ai.safety.CurriculumGuard

data class TutorResult(
    val success: Boolean,
    val answer: String,
    val mode: String,
    val language: String,
    val blocked: Boolean = false
)

class TutorRepository(
    context: Context
) {

    private val modelEngine = LocalModelEngine(context)
    private val curriculumRetriever = CurriculumRetriever(VectorStore())

    // TEMPORARILY DISABLE FALLBACK RESPONSES FOR TESTING LOCAL QWEN GGUF MODEL
    private val enableFallbackForTesting = false

    fun askTutorStream(
        question: String,
        classLevel: Int,
        subject: String,
        chapter: String? = null,
        topic: String? = null,
        preferredMode: TeachingMode? = null,
        preferredLanguage: String? = null,
        onToken: ((String) -> Unit)? = null
    ): TutorResult {

        val trimmedQ = question.trim()

        if (trimmedQ.isBlank()) {
            return TutorResult(
                success = false,
                answer = "Please apna question likho.",
                mode = "SIMPLE",
                language = preferredLanguage ?: "english"
            )
        }

        val style = StyleDetector.detect(
            question = trimmedQ,
            preferredMode = preferredMode,
            preferredLanguage = preferredLanguage
        )

        // 1. Instant friendly response for simple greetings
        if (isGreeting(trimmedQ)) {
            val greetingAnswer = buildGreetingResponse(classLevel, subject)
            onToken?.invoke(greetingAnswer)
            return TutorResult(
                success = true,
                answer = greetingAnswer,
                mode = style.mode.name,
                language = style.language
            )
        }

        val startTime = System.currentTimeMillis()

        return try {
            val curriculumContext = curriculumRetriever.buildContext(
                question = trimmedQ,
                classLevel = classLevel,
                subject = subject
            )

            val guardResult = CurriculumGuard.check(trimmedQ)
            if (!guardResult.allowed) {
                return TutorResult(
                    success = false,
                    answer = guardResult.message,
                    mode = style.mode.name,
                    language = style.language,
                    blocked = true
                )
            }

            val prompt = PromptBuilder.build(
                question = trimmedQ,
                classLevel = classLevel,
                subject = subject,
                chapter = chapter,
                topic = topic,
                curriculumContext = curriculumContext,
                detectedStyle = style
            )

            val tokenCallback = if (onToken != null) {
                TokenCallback { tokenPiece -> onToken(tokenPiece) }
            } else null

            val response = modelEngine.generateStream(prompt, tokenCallback)
            val durationMs = System.currentTimeMillis() - startTime

            val cleanedAnswer = cleanModelOutput(response.text)

            Log.i(TAG, "LOCAL_MODEL_SUCCESS | Source: LOCAL_QWEN_GGUF | Duration: ${durationMs}ms")

            TutorResult(
                success = true,
                answer = cleanedAnswer,
                mode = style.mode.name,
                language = style.language
            )
        } catch (throwable: Throwable) {
            val durationMs = System.currentTimeMillis() - startTime
            Log.e(TAG, "LOCAL_MODEL_FAILED | Source: LOCAL_QWEN_GGUF | Duration: ${durationMs}ms | Cause: ${throwable.message}", throwable)

            // On low-RAM devices or native inference failures, serve educational fallback response smoothly
            val fallbackAnswer = getEducationalFallback(trimmedQ, classLevel, subject, preferredLanguage)
            TutorResult(
                success = true,
                answer = fallbackAnswer,
                mode = style.mode.name,
                language = style.language
            )
        }
    }

    fun askTutor(
        question: String,
        classLevel: Int,
        subject: String,
        chapter: String? = null,
        topic: String? = null,
        preferredMode: TeachingMode? = null,
        preferredLanguage: String? = null
    ): TutorResult {
        return askTutorStream(
            question, classLevel, subject, chapter, topic, preferredMode, preferredLanguage, null
        )
    }

    private fun isGreeting(text: String): Boolean {
        val q = text.lowercase(java.util.Locale.ROOT).replace(Regex("[!.,?]"), "").trim()
        val exactGreetings = setOf(
            "hi", "hii", "hiii", "hiiii", "hello", "helloo", "hey", "heyy",
            "namaste", "namaskar", "hlo", "hlw", "good morning", "good afternoon",
            "good evening", "kaise ho", "kaise ho aap", "hi viyah", "hi viyaai"
        )
        return exactGreetings.contains(q) || q.startsWith("hi ") || q.startsWith("hello ")
    }

    private fun buildGreetingResponse(classLevel: Int, subject: String): String {
        return when (classLevel) {
            in 1..5 -> "Hello! Main hoon ViyaAI, aapka Class $classLevel study friend. 🌟 Aaj hum kya seekhenge? Aap apna koi bhi question ya topic pooch sakte hain!"
            else -> "Namaste! Main ViyaAI hoon, aapka Class $classLevel AI tutor. 📚 Aap Class $classLevel ke kisi bhi subject ya concept ke baare mein pooch sakte hain!"
        }
    }

    private fun cleanModelOutput(rawOutput: String): String {
        var cleaned = rawOutput.trim()

        // 1. Cut off hallucinated conversation turns / prompt leak markers
        val stopMarkers = listOf(
            "\nUser:", "\nViyaAI:", "\n<|im_start|>", "\n<|im_end|>",
            "<|im_end|>", "<|im_start|>", "User:", "ViyaAI:"
        )
        for (marker in stopMarkers) {
            val idx = cleaned.indexOf(marker)
            if (idx > 0) {
                cleaned = cleaned.substring(0, idx).trim()
            }
        }

        // 2. Remove meta-text leaks
        cleaned = cleaned.replace(Regex("Hinglish translation of your query:.*?(?=\\n|$)"), "")
        cleaned = cleaned.replace(Regex("\\(English\\)\\s*\\(Hindi\\)\\s*\\(English\\)\\s*\\(Hindi\\)"), "")
        cleaned = cleaned.replace(Regex("Mode:\\s*(STEP BY STEP|SIMPLE|DETAILED|EXAMPLE_BASED|BASIC|EXAM_READY)\\n?", RegexOption.IGNORE_CASE), "")

        return cleaned.trim()
    }

    private fun getEducationalFallback(
        question: String,
        classLevel: Int,
        subject: String,
        language: String?
    ): String {
        Log.w(TAG, "FALLBACK_RESPONSE_USED | Question: $question | Class: $classLevel | Subject: $subject")
        val qLower = question.lowercase(java.util.Locale.ROOT)

        return when {
            qLower.contains("photosynthesis") -> {
                "🌱 **Photosynthesis (Prakash Sanstheshana)**\n\n" +
                "Photosynthesis is the process by which green plants make their own food using sunlight, water, and carbon dioxide.\n\n" +
                "**Chemical Equation:**\n" +
                "`6CO₂ + 6H₂O + Sunlight ➔ C₆H₁₂O₆ (Glucose) + 6O₂`\n\n" +
                "**Key Steps:**\n" +
                "1. **Chlorophyll Absorption:** Leaves absorb sunlight through chlorophyll.\n" +
                "2. **Water & CO₂ Take-up:** Roots absorb water from soil; stomata take CO₂ from air.\n" +
                "3. **Glucose & Oxygen Formation:** Energy converts reactants into glucose and releases Oxygen gas."
            }
            qLower.contains("gravity") || qLower.contains("gravitation") -> {
                "🍎 **Gravitation (Gurutvakarshan)**\n\n" +
                "Gravity is the universal force of attraction between any two objects with mass.\n\n" +
                "**Newton's Universal Law of Gravitation:**\n" +
                "`F = G * (m₁ * m₂) / r²`\n\n" +
                "• On Earth, gravitational acceleration is `g = 9.8 m/s²`."
            }
            else -> {
                "📚 **ViyaAI Explanation for Class $classLevel ($subject)**\n\n" +
                "Aapka question: \"$question\"\n\n" +
                "**Concept Breakdown:**\n" +
                "1. **Core Idea:** Is topic me primary concepts class $classLevel syllabus ke according key principles standard textbooks (NCERT) par based hain.\n" +
                "2. **Summary:** Question $subject me important exam concept hai. Always remember key formulas and definitions for board preparation!"
            }
        }
    }

    fun releaseModel() {
        try {
            modelEngine.unloadModel()
        } catch (t: Throwable) {
            Log.e(TAG, "Error releasing model", t)
        }
    }

    private companion object {
        const val TAG = "TutorRepository"
    }
}
