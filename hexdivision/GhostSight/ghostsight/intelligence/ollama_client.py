"""Ask the local Ollama server for an explanation.

This is the only code that talks to Ollama. It only ever contacts
127.0.0.1, ignores proxy settings, does not follow redirects, limits the
size of the reply, and turns every problem into a fixed message.
The model's "thinking" field is never read.
"""

import http.client
import json
import urllib.request
from collections.abc import Callable
from typing import Any
from urllib.parse import urlsplit

from ghostsight.intelligence.ai_explanation import (
    AiExplanation,
    explanation_json_schema,
    parse_explanation,
)

ALLOWED_HOST = "127.0.0.1"
GENERATE_PATH = "/api/generate"
GENERATE_URL = f"http://{ALLOWED_HOST}:11434{GENERATE_PATH}"
# Guesses: to be set from a real run on real prompts.
REQUEST_TIMEOUT_SECONDS = 300.0
MAX_REPLY_BYTES = 1024 * 1024
NUM_CTX = 8192
NUM_PREDICT = 1500

ADDRESS_MESSAGE = "Refused: GhostSight only talks to Ollama at http://127.0.0.1."
INPUT_MESSAGE = "Refused: the prompt and the model name must not be empty."
UNREACHABLE_MESSAGE = (
    "Could not get a reply from Ollama. Check that it is running "
    "and that the model is installed (ollama list)."
)
UNUSABLE_MESSAGE = "Ollama gave a reply that could not be used and it was discarded."

OpenUrl = Callable[[urllib.request.Request, float], Any]


class OllamaError(Exception):
    """Raised with a fixed message when Ollama gives no usable reply."""


class NoRedirect(urllib.request.HTTPRedirectHandler):
    """Refuse to follow redirects."""

    def redirect_request(self, req, fp, code, msg, headers, newurl):  # type: ignore[no-untyped-def]
        return None


# ProxyHandler({}) means "no proxies", so environment settings are ignored.
def _build_opener() -> urllib.request.OpenerDirector:
    return urllib.request.build_opener(urllib.request.ProxyHandler({}), NoRedirect)


_OPENER = _build_opener()


def _open_directly(request: urllib.request.Request, timeout: float) -> Any:
    return _OPENER.open(request, timeout=timeout)


def _check_url(url: str) -> None:
    try:
        parts = urlsplit(url)
        _ = parts.port  # raises ValueError for a bad port
    except ValueError:
        raise OllamaError(ADDRESS_MESSAGE) from None
    allowed = (
        parts.scheme == "http"
        and parts.hostname == ALLOWED_HOST
        and parts.path == GENERATE_PATH
    )
    if not allowed:
        raise OllamaError(ADDRESS_MESSAGE)


def _check_text(value: object) -> None:
    if not isinstance(value, str) or not value.strip():
        raise OllamaError(INPUT_MESSAGE)


def _build_request(url: str, prompt: str, model: str) -> urllib.request.Request:
    body = {
        "model": model,
        "prompt": prompt,
        "stream": False,
        "think": False,
        "format": explanation_json_schema(),
        "options": {"num_predict": NUM_PREDICT, "num_ctx": NUM_CTX},
    }
    return urllib.request.Request(
        url,
        data=json.dumps(body).encode("utf-8"),
        headers={"Content-Type": "application/json"},
        method="POST",
    )


def _read_body(
    request: urllib.request.Request,
    open_url: OpenUrl,
    timeout: float,
    max_bytes: int,
) -> bytes:
    try:
        with open_url(request, timeout) as reply:
            status = reply.status
            data = reply.read(max_bytes + 1)
    except (OSError, http.client.HTTPException, ValueError):
        raise OllamaError(UNREACHABLE_MESSAGE) from None
    if status != 200 or len(data) > max_bytes:
        raise OllamaError(UNUSABLE_MESSAGE)
    return data


def _response_text(data: bytes) -> str:
    try:
        reply = json.loads(data)
    except (ValueError, RecursionError):
        raise OllamaError(UNUSABLE_MESSAGE) from None
    if not isinstance(reply, dict) or reply.get("done_reason") != "stop":
        raise OllamaError(UNUSABLE_MESSAGE)
    text = reply.get("response")
    if not isinstance(text, str) or not text.strip():
        raise OllamaError(UNUSABLE_MESSAGE)
    return text


def generate_explanation(
    prompt: str,
    model: str,
    open_url: OpenUrl = _open_directly,
    url: str = GENERATE_URL,
    timeout: float = REQUEST_TIMEOUT_SECONDS,
    max_bytes: int = MAX_REPLY_BYTES,
) -> AiExplanation:
    """Send the prompt and return a validated explanation.

    Raises OllamaError for address, transport or protocol problems, and
    AiOutputError when the reply text fails validation.
    """
    _check_url(url)
    _check_text(prompt)
    _check_text(model)
    request = _build_request(url, prompt, model)
    data = _read_body(request, open_url, timeout, max_bytes)
    return parse_explanation(_response_text(data))
