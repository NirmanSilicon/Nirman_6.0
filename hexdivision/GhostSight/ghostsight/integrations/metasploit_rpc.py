"""Talk to a local Metasploit RPC server (msfrpcd) with read-only calls.

This is the only code that talks to Metasploit. It only ever contacts
127.0.0.1, ignores proxy settings, does not follow redirects, limits the
size of the reply, and turns every problem into a fixed message.
Only the methods in READ_ONLY_METHODS can be called. The password is read
from an environment variable and never appears in a message or in repr().
"""

import base64
import http.client
import json
import os
import urllib.request
from collections.abc import Callable, Mapping
from dataclasses import dataclass, field
from typing import Any
from urllib.parse import urlsplit

ALLOWED_HOST = "127.0.0.1"
RPC_PATH = "/api/v1/json-rpc"
DEFAULT_URL = f"http://{ALLOWED_HOST}:55553{RPC_PATH}"
PASSWORD_ENV = "GHOSTSIGHT_MSF_PASSWORD"
USER_ENV = "GHOSTSIGHT_MSF_USER"
DEFAULT_USER = "msf"
REQUEST_ID = 1
# Guesses: to be set from real use.
REQUEST_TIMEOUT_SECONDS = 30.0
MAX_REPLY_BYTES = 1024 * 1024

# Only these were probed against a real server. There is no "any method" call.
READ_ONLY_METHODS = frozenset({"core.version", "core.module_stats", "module.search"})

ADDRESS_MESSAGE = "Refused: GhostSight only talks to Metasploit at http://127.0.0.1."
METHOD_MESSAGE = "Refused: that Metasploit call is not on the read-only list."
PASSWORD_MESSAGE = (
    f"Refused: set the {PASSWORD_ENV} environment variable to the RPC password."
)
USER_MESSAGE = "Refused: the RPC user name must not be empty or contain a colon."
UNREACHABLE_MESSAGE = (
    "Could not reach the Metasploit RPC server. Check that msfrpcd is running "
    "on 127.0.0.1."
)
UNUSABLE_MESSAGE = "Metasploit gave a reply that could not be used and it was discarded."
SERVER_ERROR_MESSAGE = "Metasploit reported an error for that call."

OpenUrl = Callable[[urllib.request.Request, float], Any]


class RpcError(Exception):
    """Raised with a fixed message when a call is refused or fails."""


@dataclass(frozen=True)
class RpcSettings:
    user: str
    password: str = field(repr=False)
    url: str = DEFAULT_URL


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


def load_settings(env: Mapping[str, str] | None = None) -> RpcSettings:
    """Read the user and password from the environment (never from a file)."""
    values = os.environ if env is None else env
    password = values.get(PASSWORD_ENV, "")
    if not password.strip():
        raise RpcError(PASSWORD_MESSAGE)
    user = values.get(USER_ENV, DEFAULT_USER)
    if not user.strip() or ":" in user:
        raise RpcError(USER_MESSAGE)
    return RpcSettings(user=user, password=password)


def _check_url(url: str) -> None:
    try:
        parts = urlsplit(url)
        _ = parts.port  # raises ValueError for a bad port
    except ValueError:
        raise RpcError(ADDRESS_MESSAGE) from None
    allowed = (
        parts.scheme == "http"
        and parts.hostname == ALLOWED_HOST
        and parts.path == RPC_PATH
    )
    if not allowed:
        raise RpcError(ADDRESS_MESSAGE)


def _check_method(method: object) -> None:
    if not isinstance(method, str) or method not in READ_ONLY_METHODS:
        raise RpcError(METHOD_MESSAGE)


def _build_request(
    settings: RpcSettings, method: str, params: list[str] | None
) -> urllib.request.Request:
    body = {
        "jsonrpc": "2.0",
        "method": method,
        "params": list(params) if params else [],
        "id": REQUEST_ID,
    }
    login = f"{settings.user}:{settings.password}".encode("utf-8")
    token = base64.b64encode(login).decode("ascii")
    return urllib.request.Request(
        settings.url,
        data=json.dumps(body).encode("utf-8"),
        headers={
            "Content-Type": "application/json",
            "Authorization": f"Basic {token}",
        },
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
        raise RpcError(UNREACHABLE_MESSAGE) from None
    if status != 200 or len(data) > max_bytes:
        raise RpcError(UNUSABLE_MESSAGE)
    return data


def _result_of(data: bytes) -> Any:
    try:
        reply = json.loads(data)
    except (ValueError, RecursionError):
        raise RpcError(UNUSABLE_MESSAGE) from None
    if not isinstance(reply, dict) or reply.get("jsonrpc") != "2.0":
        raise RpcError(UNUSABLE_MESSAGE)
    reply_id = reply.get("id")
    if isinstance(reply_id, bool) or reply_id != REQUEST_ID:
        raise RpcError(UNUSABLE_MESSAGE)
    if "error" in reply:
        raise RpcError(SERVER_ERROR_MESSAGE)
    if "result" not in reply:
        raise RpcError(UNUSABLE_MESSAGE)
    return reply["result"]


def call_rpc(
    settings: RpcSettings,
    method: str,
    params: list[str] | None = None,
    open_url: OpenUrl = _open_directly,
    timeout: float = REQUEST_TIMEOUT_SECONDS,
    max_bytes: int = MAX_REPLY_BYTES,
) -> Any:
    """Make one read-only call and return its result.

    Raises RpcError with a fixed message for any refusal or failure.
    """
    _check_url(settings.url)
    _check_method(method)
    request = _build_request(settings, method, params)
    data = _read_body(request, open_url, timeout, max_bytes)
    return _result_of(data)
