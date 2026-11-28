"""Tests for the local-only Metasploit RPC client (read-only calls)."""

import base64
import http.client
import json
import urllib.request
from typing import Any

import pytest

from ghostsight.integrations import metasploit_rpc as rpc

GOOD_URL = "http://127.0.0.1:55553/api/v1/json-rpc"
PASSWORD = "pw-secret-123"


class FakeReply:
    def __init__(self, body: bytes, status: int = 200) -> None:
        self.status = status
        self._body = body

    def __enter__(self) -> "FakeReply":
        return self

    def __exit__(self, *args: object) -> None:
        return None

    def read(self, limit: int = -1) -> bytes:
        return self._body if limit < 0 else self._body[:limit]


class Recorder:
    """A stand-in for the network: records requests, returns or raises."""

    def __init__(self, reply: FakeReply | Exception) -> None:
        self.reply = reply
        self.requests: list[urllib.request.Request] = []
        self.timeouts: list[float] = []

    def __call__(self, request: urllib.request.Request, timeout: float) -> Any:
        self.requests.append(request)
        self.timeouts.append(timeout)
        if isinstance(self.reply, Exception):
            raise self.reply
        return self.reply


def make_settings(url: str = GOOD_URL) -> rpc.RpcSettings:
    return rpc.RpcSettings(user="msf", password=PASSWORD, url=url)


def good_body(result: Any = None, request_id: int = 1) -> bytes:
    body = {"jsonrpc": "2.0", "result": result, "id": request_id}
    return json.dumps(body).encode("utf-8")


def ok(result: Any = None) -> Recorder:
    return Recorder(FakeReply(good_body(result)))


def test_settings_defaults() -> None:
    settings = rpc.load_settings({rpc.PASSWORD_ENV: PASSWORD})
    assert settings.user == "msf"
    assert settings.password == PASSWORD
    assert settings.url == GOOD_URL


def test_settings_user_from_environment() -> None:
    env = {rpc.PASSWORD_ENV: PASSWORD, rpc.USER_ENV: "alice"}
    assert rpc.load_settings(env).user == "alice"


@pytest.mark.parametrize(
    "env",
    [{}, {rpc.PASSWORD_ENV: ""}, {rpc.PASSWORD_ENV: "   "}],
)
def test_settings_refuse_missing_password(env: dict[str, str]) -> None:
    with pytest.raises(rpc.RpcError) as caught:
        rpc.load_settings(env)
    assert str(caught.value) == rpc.PASSWORD_MESSAGE


@pytest.mark.parametrize("user", ["", "  ", "a:b"])
def test_settings_refuse_bad_user(user: str) -> None:
    env = {rpc.PASSWORD_ENV: PASSWORD, rpc.USER_ENV: user}
    with pytest.raises(rpc.RpcError) as caught:
        rpc.load_settings(env)
    assert str(caught.value) == rpc.USER_MESSAGE


def test_settings_read_the_real_environment(monkeypatch: pytest.MonkeyPatch) -> None:
    monkeypatch.setenv(rpc.PASSWORD_ENV, PASSWORD)
    monkeypatch.delenv(rpc.USER_ENV, raising=False)
    assert rpc.load_settings().password == PASSWORD


def test_settings_repr_hides_password() -> None:
    assert PASSWORD not in repr(make_settings())


def test_call_returns_the_result() -> None:
    recorder = ok({"version": "6.4.126-dev-"})
    result = rpc.call_rpc(make_settings(), "core.version", open_url=recorder)
    assert result == {"version": "6.4.126-dev-"}


def test_call_builds_the_expected_request() -> None:
    recorder = ok({})
    rpc.call_rpc(make_settings(), "core.version", open_url=recorder)
    request = recorder.requests[0]
    token = base64.b64encode(f"msf:{PASSWORD}".encode()).decode()
    assert request.full_url == GOOD_URL
    assert request.get_method() == "POST"
    assert request.get_header("Content-type") == "application/json"
    assert request.get_header("Authorization") == f"Basic {token}"
    body = json.loads(request.data)
    assert body["jsonrpc"] == "2.0"
    assert body["method"] == "core.version"
    assert body["id"] == 1


@pytest.mark.parametrize(
    ("params", "expected"),
    [(None, []), (["ms17_010"], ["ms17_010"])],
)
def test_call_sends_params(params: list[str] | None, expected: list[str]) -> None:
    recorder = ok({})
    rpc.call_rpc(make_settings(), "module.search", params=params, open_url=recorder)
    assert json.loads(recorder.requests[0].data)["params"] == expected


def test_call_uses_the_timeout_setting() -> None:
    recorder = ok({})
    rpc.call_rpc(make_settings(), "core.version", open_url=recorder)
    assert recorder.timeouts == [rpc.REQUEST_TIMEOUT_SECONDS]


@pytest.mark.parametrize(
    "url",
    [
        "http://localhost:55553/api/v1/json-rpc",
        "http://192.168.1.5:55553/api/v1/json-rpc",
        "http://127.0.0.1.evil.example:55553/api/v1/json-rpc",
        "https://127.0.0.1:55553/api/v1/json-rpc",
        "http://127.0.0.1:55553/api/v1/other",
        "http://127.0.0.1:notaport/api/v1/json-rpc",
    ],
)
def test_call_refuses_other_addresses(url: str) -> None:
    recorder = ok({})
    with pytest.raises(rpc.RpcError) as caught:
        rpc.call_rpc(make_settings(url), "core.version", open_url=recorder)
    assert str(caught.value) == rpc.ADDRESS_MESSAGE
    assert recorder.requests == []


@pytest.mark.parametrize(
    "method",
    ["module.execute", "session.list", "", "core.version "],
)
def test_call_refuses_methods_outside_the_list(method: str) -> None:
    recorder = ok({})
    with pytest.raises(rpc.RpcError) as caught:
        rpc.call_rpc(make_settings(), method, open_url=recorder)
    assert str(caught.value) == rpc.METHOD_MESSAGE
    assert recorder.requests == []


def test_read_only_methods_are_exactly_these() -> None:
    expected = {"core.version", "core.module_stats", "module.search"}
    assert rpc.READ_ONLY_METHODS == frozenset(expected)


@pytest.mark.parametrize(
    "problem",
    [
        OSError(f"boom {PASSWORD}"),
        TimeoutError(f"slow {PASSWORD}"),
        http.client.HTTPException(f"bad {PASSWORD}"),
        ValueError(f"odd {PASSWORD}"),
    ],
)
def test_transport_problems_give_a_fixed_message(problem: Exception) -> None:
    with pytest.raises(rpc.RpcError) as caught:
        rpc.call_rpc(make_settings(), "core.version", open_url=Recorder(problem))
    assert str(caught.value) == rpc.UNREACHABLE_MESSAGE
    assert PASSWORD not in str(caught.value)


def test_non_200_status_is_unusable() -> None:
    recorder = Recorder(FakeReply(good_body({}), status=500))
    with pytest.raises(rpc.RpcError) as caught:
        rpc.call_rpc(make_settings(), "core.version", open_url=recorder)
    assert str(caught.value) == rpc.UNUSABLE_MESSAGE


def test_oversized_reply_is_unusable() -> None:
    recorder = ok({"padding": "x" * 100})
    with pytest.raises(rpc.RpcError) as caught:
        rpc.call_rpc(make_settings(), "core.version", open_url=recorder, max_bytes=10)
    assert str(caught.value) == rpc.UNUSABLE_MESSAGE


@pytest.mark.parametrize(
    "body",
    [
        b"not json",
        b"[1, 2]",
        json.dumps({"jsonrpc": "1.0", "result": {}, "id": 1}).encode(),
        json.dumps({"jsonrpc": "2.0", "id": 1}).encode(),
        good_body({}, request_id=2),
    ],
)
def test_malformed_replies_are_unusable(body: bytes) -> None:
    recorder = Recorder(FakeReply(body))
    with pytest.raises(rpc.RpcError) as caught:
        rpc.call_rpc(make_settings(), "core.version", open_url=recorder)
    assert str(caught.value) == rpc.UNUSABLE_MESSAGE


def test_server_error_gives_a_fixed_message() -> None:
    error = {"code": -32601, "message": "secret detail"}
    body = json.dumps({"jsonrpc": "2.0", "error": error, "id": 1}).encode()
    with pytest.raises(rpc.RpcError) as caught:
        rpc.call_rpc(make_settings(), "core.version", open_url=Recorder(FakeReply(body)))
    assert str(caught.value) == rpc.SERVER_ERROR_MESSAGE
    assert "secret detail" not in str(caught.value)


def test_redirects_are_refused() -> None:
    handler = rpc.NoRedirect()
    assert handler.redirect_request(None, None, 303, "x", {}, GOOD_URL) is None


def test_opener_ignores_proxy_settings(monkeypatch: pytest.MonkeyPatch) -> None:
    monkeypatch.setenv("http_proxy", "http://127.0.0.1:9")

    def active_proxies(opener: urllib.request.OpenerDirector) -> list[Any]:
        return [
            h
            for h in opener.handlers
            if isinstance(h, urllib.request.ProxyHandler) and h.proxies
        ]

    # Control: a default opener does pick the proxy up from the environment.
    assert active_proxies(urllib.request.build_opener())
    assert active_proxies(rpc._build_opener()) == []
