"""Turn a validated AI explanation into the text stored in ai_analysis.txt.

Pure: no files, no network. The text always starts with a fixed label.
The summary is flattened to one line so it cannot fake a heading.
"""

from ghostsight.intelligence.ai_explanation import AiExplanation

MODEL_NAME_CHARS = 60

LABEL = "AI-GENERATED TEXT - NOT PROOF"
SUMMARY_HEADING = "Summary:"
STEPS_HEADING = "Suggested next steps:"
NO_STEPS_TEXT = "The AI did not suggest any next steps."


def _model_name(model: object) -> str:
    """Cut to a short length and keep printable ASCII only."""
    text = str(model)[:MODEL_NAME_CHARS]
    cleaned = "".join(char if " " <= char <= "~" else "?" for char in text)
    return cleaned or "(unknown)"


def format_explanation(explanation: AiExplanation, model: str) -> str:
    """Return the report text for one validated explanation."""
    lines = [
        LABEL,
        f"Written by the local AI model {_model_name(model)}. "
        "This is not proof of anything and it can be wrong. "
        "It did not change any finding, status, score or confidence. "
        "Check each item before acting.",
        "",
        SUMMARY_HEADING,
        " ".join(explanation.summary.split()),
        "",
        STEPS_HEADING,
    ]
    if explanation.next_steps:
        lines.extend(
            f"{number}. {step}"
            for number, step in enumerate(explanation.next_steps, start=1)
        )
    else:
        lines.append(NO_STEPS_TEXT)
    return "\n".join(lines)
