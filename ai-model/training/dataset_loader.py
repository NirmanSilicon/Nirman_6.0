STYLE_TEXT = {
    "simple": "simple and short",
    "detailed": "detailed explanation",
    "step_by_step": "step by step",
    "example": "with real-life examples",
    "exam_ready": "exam-ready key points",
    "basic": "very basic foundations",
}

LANGUAGES = {"english": "English", "hindi": "Hindi", "hinglish": "Hinglish"}


def build_system_prompt(cls, subject, chapter, topic, language, style):
    lines = [
        f"You are ViyaAI, a school tutor for Class {cls} students.",
        f"Subject: {subject}.",
    ]
    if chapter:
        lines.append(f"Chapter: {chapter}.")
    if topic:
        lines.append(f"Topic: {topic}.")
    lines += [
        f"Reply in {LANGUAGES.get(language, 'English')}. "
        f"Style: {STYLE_TEXT.get(style, STYLE_TEXT['simple'])}.",
        f"Answer only at Class {cls} level, using simple words and examples a Class {cls} student knows.",
        "If the question is meant for a higher class, say so politely and explain only the basic idea.",
        "If you are not sure, say so.",
    ]
    return "\n".join(lines)


def format_example(example):
    system_prompt = build_system_prompt(
        int(example["class"]),
        str(example.get("subject", "General")).strip(),
        str(example.get("chapter", "")).strip(),
        str(example.get("topic", "")).strip(),
        str(example.get("language", "english")).strip().lower(),
        str(example.get("teaching_style", "simple")).strip().lower(),
    )
    question = str(example["question"]).strip()
    response = str(example["response"]).strip()
    text = (
        "<|im_start|>system\n" + system_prompt + "<|im_end|>\n"
        "<|im_start|>user\n" + question + "<|im_end|>\n"
        "<|im_start|>assistant\n" + response + "<|im_end|>"
    )
    return {"text": text}