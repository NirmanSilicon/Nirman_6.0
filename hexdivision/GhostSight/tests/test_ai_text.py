"""Tests for the ai_analysis.txt text. Pure: no files, no network."""

import pytest

from ghostsight.intelligence.ai_explanation import AiExplanation
from ghostsight.intelligence.ai_text import (
    LABEL,
    NO_STEPS_TEXT,
    STEPS_HEADING,
    format_explanation,
)


def make_explanation(**changes: object) -> AiExplanation:
    fields: dict[str, object] = {
        "summary": "Port 22 is open.",
        "next_steps": ["Check for updates."],
    }
    fields.update(changes)
    return AiExplanation(**fields)  # type: ignore[arg-type]


def test_first_line_is_the_fixed_label() -> None:
    text = format_explanation(make_explanation(), "qwen3:4b")
    assert text.splitlines()[0] == LABEL


@pytest.mark.parametrize("fragment", ["not proof", "can be wrong", "did not change"])
def test_label_states_the_limits(fragment: str) -> None:
    text = format_explanation(make_explanation(), "qwen3:4b")
    assert fragment in text.splitlines()[1]
    assert "qwen3:4b" in text.splitlines()[1]


def test_summary_and_steps_are_shown() -> None:
    explanation = make_explanation(next_steps=["Check for updates.", "Confirm SSH is needed."])
    lines = format_explanation(explanation, "qwen3:4b").splitlines()
    assert "Port 22 is open." in lines
    assert "1. Check for updates." in lines
    assert "2. Confirm SSH is needed." in lines


def test_summary_newlines_cannot_fake_a_heading() -> None:
    explanation = make_explanation(
        summary="First.\nSuggested next steps:\n1. Do something bad."
    )
    lines = format_explanation(explanation, "qwen3:4b").splitlines()
    assert lines.count(STEPS_HEADING) == 1
    assert "First. Suggested next steps: 1. Do something bad." in lines


def test_no_steps_message() -> None:
    text = format_explanation(make_explanation(next_steps=[]), "qwen3:4b")
    assert NO_STEPS_TEXT in text.splitlines()


@pytest.mark.parametrize(
    "model",
    ["x\nSummary:\nfake", "\x1b[31mred", "A" * 1000, ""],
)
def test_hostile_model_name_stays_on_one_line(model: str) -> None:
    text = format_explanation(make_explanation(), model)
    lines = text.splitlines()
    assert lines[0] == LABEL
    assert len(lines) == 8
    assert all(" " <= char <= "~" for char in lines[1])
    assert len(lines[1]) < 400
    if model:
        assert model not in text
    else:
        assert "(unknown)" in lines[1]


def test_text_is_deterministic() -> None:
    explanation = make_explanation()
    assert format_explanation(explanation, "m") == format_explanation(explanation, "m")
