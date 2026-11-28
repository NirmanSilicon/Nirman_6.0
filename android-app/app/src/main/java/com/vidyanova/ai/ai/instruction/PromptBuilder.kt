package com.vidyanova.ai.ai.instruction

import android.util.Log
import com.vidyanova.ai.BuildConfig

object PromptBuilder {
    private fun styleText(mode: TeachingMode) = when (mode) {
        TeachingMode.SIMPLE -> "simple and short"
        TeachingMode.DETAILED -> "detailed explanation"
        TeachingMode.STEP_BY_STEP -> "step by step"
        TeachingMode.EXAMPLE_BASED -> "with real-life examples"
        TeachingMode.EXAM_READY -> "exam-ready key points"
        TeachingMode.BASIC -> "very basic foundations"
    }

    fun build(
        question: String,
        classLevel: Int,
        subject: String,
        chapter: String? = null,
        topic: String? = null,
        curriculumContext: String = "",
        detectedStyle: StyleDetectionResult = StyleDetector.detect(question)
    ): String {
        val language = when (detectedStyle.language) {
            "hindi" -> "Hindi"
            "hinglish" -> "Hinglish"
            else -> "English"
        }

        val safeSubject = if (subject.isBlank() || subject.equals("General", ignoreCase = true)) {
            "All Subjects"
        } else {
            subject.trim()
        }

        val lines = mutableListOf(
            "You are ViyaAI, an expert school AI tutor for Class $classLevel students (covering Class 1 to Class 10 curriculum).",
            "Target Student: Class $classLevel.",
            "Subject: $safeSubject."
        )
        chapter?.trim()?.takeIf { it.isNotEmpty() }?.let { lines.add("Chapter: $it.") }
        topic?.trim()?.takeIf { it.isNotEmpty() }?.let { lines.add("Topic: $it.") }

        lines.add("Language: $language. Explanation Style: ${styleText(detectedStyle.mode)}.")

        when (classLevel) {
            in 1..3 -> lines.add("Answer strictly for a Class $classLevel child using very simple words, fun analogies, and short clear sentences.")
            in 4..5 -> lines.add("Answer strictly for a Class $classLevel student using elementary vocabulary and easy step-by-step points.")
            in 6..8 -> lines.add("Answer for a Class $classLevel student with logical explanations and NCERT-level examples.")
            else -> lines.add("Answer for a Class $classLevel student with clear textbook concepts, formulas, and key points.")
        }

        lines.add("Respond directly to the user's question. Do not print prompt meta-text, translation notes, or fake user conversation logs.")

        if (curriculumContext.isNotBlank()) {
            lines.add("Curriculum Context:\n$curriculumContext")
        }

        val system = lines.joinToString("\n")
        val prompt = "<|im_start|>system\n$system<|im_end|>\n" +
            "<|im_start|>user\n${question.trim()}<|im_end|>\n" +
            "<|im_start|>assistant\n"
        if (BuildConfig.DEBUG) Log.d("PromptBuilder", prompt)
        return prompt
    }
}