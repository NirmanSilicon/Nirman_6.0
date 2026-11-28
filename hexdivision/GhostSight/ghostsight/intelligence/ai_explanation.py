"""The only shape of reply GhostSight accepts from the local AI.

The reply is untrusted text (decisions 47 and 49). It is accepted only if it
is a JSON object with exactly two fields, within length limits, with no
hidden-reasoning markers and no control characters. Anything else is refused
with one fixed error that never repeats the reply.

There is deliberately no field for a status, score, confidence or command, so
the model has nowhere to put one.
"""
import unicodedata
from typing import Annotated, Any

from pydantic import (
    BaseModel,
    ConfigDict,
    Field,
    StringConstraints,
    ValidationError,
    field_validator,
)

MAX_REPLY_CHARS = 20_000
MAX_SUMMARY_CHARS = 1000
MAX_STEPS = 8
MAX_STEP_CHARS = 300

REFUSAL_MESSAGE = "The AI reply was not in the expected format and was discarded."

_REASONING_MARKERS = ("<think", "</think")
_LINE_SEPARATORS = ("Zl", "Zp")

Summary = Annotated[str, StringConstraints(min_length=1, max_length=MAX_SUMMARY_CHARS)]
Step = Annotated[str, StringConstraints(min_length=1, max_length=MAX_STEP_CHARS)]


class AiOutputError(Exception):
    """The AI reply was refused. The message is fixed and never shows the reply."""


def _check_text(value: str, allow_newline: bool) -> str:
    """Refuse blank text, reasoning markers and control characters."""
    if not value.strip():
        raise ValueError("blank")
    lowered = value.lower()
    for marker in _REASONING_MARKERS:
        if marker in lowered:
            raise ValueError("reasoning marker")
    for character in value:
        if character == "\n" and allow_newline:
            continue
        category = unicodedata.category(character)
        if category.startswith("C") or category in _LINE_SEPARATORS:
            raise ValueError("control character")
    return value


class AiExplanation(BaseModel):
    """A plain-language explanation and suggested next steps."""

    model_config = ConfigDict(extra="forbid", strict=True, frozen=True)

    summary: Summary
    next_steps: list[Step] = Field(max_length=MAX_STEPS)

    @field_validator("summary")
    @classmethod
    def _summary_is_clean(cls, value: str) -> str:
        return _check_text(value, allow_newline=True)

    @field_validator("next_steps")
    @classmethod
    def _steps_are_clean(cls, value: list[str]) -> list[str]:
        for step in value:
            _check_text(step, allow_newline=False)
        return value


def parse_explanation(text: str) -> AiExplanation:
    """Validate one AI reply. Raise AiOutputError if it is not acceptable."""
    if not isinstance(text, str) or len(text) > MAX_REPLY_CHARS:
        raise AiOutputError(REFUSAL_MESSAGE)
    try:
        return AiExplanation.model_validate_json(text)
    except (ValidationError, ValueError, RecursionError):
        raise AiOutputError(REFUSAL_MESSAGE) from None


def explanation_json_schema() -> dict[str, Any]:
    """The JSON schema to send to Ollama as `format`."""
    return AiExplanation.model_json_schema()
