"""Tests for the shape of the AI's reply (decisions 47 and 49).

The reply is untrusted text. It is accepted only if it is a JSON object with
exactly two fields, within length limits, with no hidden reasoning markers and
no control characters. Anything else is refused with one fixed error.
"""
import json

import pytest

from ghostsight.intelligence.ai_explanation import (
    MAX_REPLY_CHARS,
    AiExplanation,
    AiOutputError,
    explanation_json_schema,
    parse_explanation,
)


def reply(summary: str = "All good.", next_steps: list | None = None, **extra: object) -> str:
    body: dict = {
        "summary": summary,
        "next_steps": [] if next_steps is None else next_steps,
    }
    body.update(extra)
    return json.dumps(body)


def assert_refused(text: str) -> AiOutputError:
    with pytest.raises(AiOutputError) as info:
        parse_explanation(text)
    return info.value


# --- accepted replies -------------------------------------------------------


def test_minimal_reply_is_accepted() -> None:
    result = parse_explanation(reply())
    assert isinstance(result, AiExplanation)
    assert result.summary == "All good."
    assert result.next_steps == []


def test_steps_keep_their_order() -> None:
    result = parse_explanation(reply(next_steps=["first", "second", "third"]))
    assert result.next_steps == ["first", "second", "third"]


def test_odd_whitespace_from_the_probe_parses() -> None:
    text = '{\n\n"summary" :\n"A label.",\n"next_steps" : [ ] }'
    assert parse_explanation(text).summary == "A label."


def test_newline_is_allowed_in_the_summary() -> None:
    assert parse_explanation(reply("One.\nTwo.")).summary == "One.\nTwo."


def test_non_ascii_letters_are_allowed() -> None:
    assert parse_explanation(reply("Caf\u00e9 check")).summary == "Caf\u00e9 check"


# --- not JSON, or not the right JSON ---------------------------------------


@pytest.mark.parametrize(
    "text",
    ["", "not json", "ready", '{"summary": "x"', "{'summary': 'x', 'next_steps': []}"],
)
def test_text_that_is_not_json_is_refused(text: str) -> None:
    assert_refused(text)


@pytest.mark.parametrize("text", ["[]", '"text"', "42", "null", "true"])
def test_json_that_is_not_an_object_is_refused(text: str) -> None:
    assert_refused(text)


@pytest.mark.parametrize(
    "text",
    ['{"next_steps": []}', '{"summary": "x"}', "{}"],
)
def test_missing_fields_are_refused(text: str) -> None:
    assert_refused(text)


@pytest.mark.parametrize(
    "key",
    ["status", "confidence", "severity", "cvss_score", "command", "thinking"],
)
def test_extra_keys_are_refused(key: str) -> None:
    assert_refused(reply(**{key: "x"}))


# --- summary and steps: length ----------------------------------------------


@pytest.mark.parametrize("length", [1, 1000])
def test_summary_length_limits_are_accepted(length: int) -> None:
    assert len(parse_explanation(reply("x" * length)).summary) == length


@pytest.mark.parametrize("summary", ["", "   ", "\n", "x" * 1001])
def test_bad_summary_lengths_are_refused(summary: str) -> None:
    assert_refused(reply(summary))


def test_eight_steps_are_accepted() -> None:
    assert len(parse_explanation(reply(next_steps=["s"] * 8)).next_steps) == 8


def test_nine_steps_are_refused() -> None:
    assert_refused(reply(next_steps=["s"] * 9))


@pytest.mark.parametrize("length", [1, 300])
def test_step_length_limits_are_accepted(length: int) -> None:
    result = parse_explanation(reply(next_steps=["x" * length]))
    assert len(result.next_steps[0]) == length


@pytest.mark.parametrize("step", ["", "  ", "x" * 301])
def test_bad_step_lengths_are_refused(step: str) -> None:
    assert_refused(reply(next_steps=[step]))


# --- types ------------------------------------------------------------------


@pytest.mark.parametrize(
    "body",
    [
        {"summary": 5, "next_steps": []},
        {"summary": None, "next_steps": []},
        {"summary": ["a"], "next_steps": []},
        {"summary": "ok", "next_steps": "do this"},
        {"summary": "ok", "next_steps": [1]},
        {"summary": "ok", "next_steps": None},
        {"summary": "ok", "next_steps": {"a": "b"}},
    ],
)
def test_wrong_types_are_refused(body: dict) -> None:
    assert_refused(json.dumps(body))


# --- hidden reasoning and control characters -------------------------------


@pytest.mark.parametrize(
    "marker",
    ["<think>", "</think>", "<THINK>", "x </Think> y", "<think"],
)
def test_reasoning_marker_in_the_summary_is_refused(marker: str) -> None:
    assert_refused(reply(f"before {marker} after"))


@pytest.mark.parametrize("marker", ["</think>", "<think>"])
def test_reasoning_marker_in_a_step_is_refused(marker: str) -> None:
    assert_refused(reply(next_steps=[f"do {marker} this"]))


@pytest.mark.parametrize(
    "bad",
    ["\x1b[31mred", "\x00", "\r", "\t", "\u202e", "\u200b", "\x7f"],
)
def test_control_characters_in_the_summary_are_refused(bad: str) -> None:
    assert_refused(reply(f"ab{bad}cd"))


def test_control_character_in_a_step_is_refused() -> None:
    assert_refused(reply(next_steps=["ab\x1b[0mcd"]))


# --- the error never echoes the reply ---------------------------------------


def test_error_does_not_echo_the_reply() -> None:
    error = assert_refused(reply("SECRET-TEXT", status="SECRET-EXTRA"))
    assert str(error)
    assert "SECRET" not in str(error)


def test_every_refusal_gives_the_same_message() -> None:
    messages = {
        str(assert_refused("")),
        str(assert_refused(reply(status="x"))),
        str(assert_refused(reply("x" * 1001))),
    }
    assert len(messages) == 1


# --- size and nesting -------------------------------------------------------


def test_reply_at_the_size_limit_is_accepted() -> None:
    text = reply()
    padded = text + " " * (MAX_REPLY_CHARS - len(text))
    assert len(padded) == MAX_REPLY_CHARS
    assert isinstance(parse_explanation(padded), AiExplanation)


def test_reply_over_the_size_limit_is_refused() -> None:
    text = reply()
    assert_refused(text + " " * (MAX_REPLY_CHARS + 1 - len(text)))


@pytest.mark.parametrize("text", ["[" * 5000, '{"summary": ' + "[" * 5000])
def test_deeply_nested_json_is_refused(text: str) -> None:
    assert_refused(text)


# --- the schema we send to Ollama -------------------------------------------


def test_schema_lists_exactly_the_two_fields() -> None:
    assert set(explanation_json_schema()["properties"]) == {"summary", "next_steps"}


def test_schema_requires_both_fields() -> None:
    assert set(explanation_json_schema()["required"]) == {"summary", "next_steps"}


def test_schema_forbids_extra_keys() -> None:
    assert explanation_json_schema()["additionalProperties"] is False


def test_schema_is_plain_json() -> None:
    json.dumps(explanation_json_schema())


def test_model_has_no_status_score_or_confidence_field() -> None:
    assert set(AiExplanation.model_fields) == {"summary", "next_steps"}
