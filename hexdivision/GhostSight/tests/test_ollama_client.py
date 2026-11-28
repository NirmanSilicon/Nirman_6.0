"""Tests for the Ollama client. No real network: a fake opener is injected."""

import http.client
import json
import urllib.error
import urllib.request

import pytest

from ghostsight.intelligence.ai_explanation import (
    AiExplanation,
    AiOutputError,
    explanation_json_schema,
)
from ghostsight.intelligence.ollama_client import (
    GENERATE_URL,
    NUM_CTX,
    NUM_PREDICT,
    REQUEST_TIMEOUT_SECONDS,
    NoRedirect,
    OllamaError,
    generate_explanation,
)

MISSING = object()
GOOD_TEXT = json.dumps(
    {"summary": "Port 22 is open.", "next_steps": ["Check the login settings."]}
)


class FakeResponse:
    """Stands in for the object urllib returns."""

    def __init__(self, body: bytes, status: int = 200) -> None:
        self.status = status
        self._body = body

    def read(self, size: int = -1) -> bytes:
        return self._body if size < 0 else self._body[:size]

    def __enter__(self) -> "FakeResponse":
        return self

    def __exit__(self, *exc_info: object) -> bool:
        return False


def ollama_body(**changes: object) -> bytes:
    """A good Ollama reply; a value of MISSING removes that key."""
    data: dict[str, object] = {
        "model": "qwen3:4b",
        "response": GOOD_TEXT,
        "done": True,
        "done_reason": "stop",
    }
    data.update(changes)
    kept = {key: value for key, value in data.items() if value is not MISSING}
    return json.dumps(kept).encode()


class Opener:
    """A fake open function that records every call."""

    def __init__(self, reply: FakeResponse | None = None, error: Exception | None = None):
        self.reply = reply if reply is not None else FakeResponse(ollama_body())
        self.error = error
        self.calls: list[tuple[urllib.request.Request, float]] = []

    def __call__(self, request: urllib.request.Request, timeout: float) -> FakeResponse:
        self.calls.append((request, timeout))
        if self.error is not None:
            raise self.error
        return self.reply


def replying(body: bytes, status: int = 200) -> Opener:
    return Opener(reply=FakeResponse(body, status))


def ask(opener: Opener, **options: object) -> AiExplanation:
    return generate_explanation(
        "Explain port 22.", "qwen3:4b", open_url=opener, **options
    )


def test_good_reply_returns_an_explanation() -> None:
    result = ask(Opener())
    assert isinstance(result, AiExplanation)
    assert result.summary == "Port 22 is open."
    assert result.next_steps == ["Check the login settings."]


def test_request_is_a_json_post_to_the_generate_url() -> None:
    opener = Opener()
    ask(opener)
    request = opener.calls[0][0]
    assert request.full_url == GENERATE_URL
    assert request.get_method() == "POST"
    assert request.get_header("Content-type") == "application/json"


def test_request_body_fields() -> None:
    opener = Opener()
    ask(opener)
    body = json.loads(opener.calls[0][0].data)
    assert body["model"] == "qwen3:4b"
    assert body["prompt"] == "Explain port 22."
    assert body["stream"] is False
    assert body["think"] is False
    assert body["format"] == explanation_json_schema()
    assert body["options"] == {"num_predict": NUM_PREDICT, "num_ctx": NUM_CTX}


def test_timeout_is_passed_to_the_opener() -> None:
    opener = Opener()
    ask(opener)
    assert opener.calls[0][1] == REQUEST_TIMEOUT_SECONDS
    assert REQUEST_TIMEOUT_SECONDS > 0


@pytest.mark.parametrize(
    "url",
    [
        "https://127.0.0.1:11434/api/generate",
        "http://localhost:11434/api/generate",
        "http://127.0.0.1.evil.example/api/generate",
        "http://127.0.0.1@evil.example/api/generate",
        "http://[::1]:11434/api/generate",
        "http://192.168.1.5:11434/api/generate",
        "ftp://127.0.0.1/api/generate",
        "file:///etc/passwd",
        "http://127.0.0.1:notaport/api/generate",
        "http://127.0.0.1:11434/api/delete",
    ],
)
def test_other_addresses_are_refused_before_any_call(url: str) -> None:
    opener = Opener()
    with pytest.raises(OllamaError) as error:
        ask(opener, url=url)
    assert opener.calls == []
    assert url not in str(error.value)


def test_another_loopback_port_is_allowed() -> None:
    opener = Opener()
    ask(opener, url="http://127.0.0.1:12345/api/generate")
    assert len(opener.calls) == 1


@pytest.mark.parametrize(
    "problem",
    [
        OSError("boom /secret/path"),
        TimeoutError("secret"),
        urllib.error.URLError("secret refused"),
        ConnectionRefusedError("secret"),
        http.client.IncompleteRead(b"secret"),
        ValueError("secret"),
    ],
)
def test_transport_problems_become_a_fixed_error(problem: Exception) -> None:
    with pytest.raises(OllamaError) as error:
        ask(Opener(error=problem))
    assert "secret" not in str(error.value)


def test_http_error_from_the_opener_becomes_a_fixed_error() -> None:
    problem = urllib.error.HTTPError(GENERATE_URL, 404, "secret", {}, None)
    with pytest.raises(OllamaError) as error:
        ask(Opener(error=problem))
    assert "secret" not in str(error.value)


@pytest.mark.parametrize("status", [201, 302, 404, 500])
def test_only_status_200_is_accepted(status: int) -> None:
    with pytest.raises(OllamaError):
        ask(replying(ollama_body(), status=status))


def test_reply_of_exactly_the_size_limit_is_accepted() -> None:
    body = ollama_body()
    assert isinstance(ask(replying(body), max_bytes=len(body)), AiExplanation)


def test_reply_one_byte_over_the_size_limit_is_refused() -> None:
    body = ollama_body()
    with pytest.raises(OllamaError):
        ask(replying(body), max_bytes=len(body) - 1)


@pytest.mark.parametrize(
    "body", [b"", b"not json", b"[]", b'"text"', b"[" * 5000]
)
def test_outer_reply_that_is_not_a_json_object_is_refused(body: bytes) -> None:
    with pytest.raises(OllamaError):
        ask(replying(body))


@pytest.mark.parametrize(
    "body",
    [
        ollama_body(done_reason="length"),
        ollama_body(done_reason="load"),
        ollama_body(done_reason=None),
        ollama_body(done_reason=MISSING),
    ],
)
def test_reply_that_did_not_stop_normally_is_refused(body: bytes) -> None:
    with pytest.raises(OllamaError):
        ask(replying(body))


@pytest.mark.parametrize(
    "body",
    [
        ollama_body(response=""),
        ollama_body(response=None),
        ollama_body(response=5),
        ollama_body(response=MISSING),
    ],
)
def test_empty_or_missing_response_is_refused(body: bytes) -> None:
    with pytest.raises(OllamaError):
        ask(replying(body))


@pytest.mark.parametrize(
    "text",
    [
        "not json",
        '{"summary": "x </think>", "next_steps": ["Do a thing."]}',
        '{"summary": "ok", "next_steps": ["Do a thing."], "status": "validated"}',
    ],
)
def test_bad_ai_text_is_refused_by_the_validator(text: str) -> None:
    with pytest.raises(AiOutputError):
        ask(replying(ollama_body(response=text)))


def test_thinking_field_is_ignored() -> None:
    result = ask(replying(ollama_body(thinking="secret reasoning")))
    assert "secret reasoning" not in repr(result)


@pytest.mark.parametrize("prompt", ["", "   ", None])
def test_empty_prompt_is_refused_before_any_call(prompt: object) -> None:
    opener = Opener()
    with pytest.raises(OllamaError):
        generate_explanation(prompt, "qwen3:4b", open_url=opener)  # type: ignore[arg-type]
    assert opener.calls == []


@pytest.mark.parametrize("model", ["", "   ", None])
def test_empty_model_name_is_refused_before_any_call(model: object) -> None:
    opener = Opener()
    with pytest.raises(OllamaError):
        generate_explanation("Explain port 22.", model, open_url=opener)  # type: ignore[arg-type]
    assert opener.calls == []


def test_redirects_are_not_followed() -> None:
    handler = NoRedirect()
    result = handler.redirect_request(
        None, None, 302, "Found", {}, "http://evil.example/"  # type: ignore[arg-type]
    )
    assert result is None

