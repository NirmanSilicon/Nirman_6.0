"""Tests for the three read-only Metasploit queries."""

import json
import urllib.request
from typing import Any

import pytest

from ghostsight.integrations import metasploit_queries as queries
from ghostsight.integrations import metasploit_rpc as rpc

PASSWORD = "pw-secret-123"
VERSION = {
    "version": "6.4.126-dev-",
    "ruby": "3.4.4 x86_64-linux 2025-05-14",
    "api": "1.0",
}
STATS = {
    "exploits": 2635,
    "auxiliary": 1329,
    "post": 431,
    "encoders": 49,
    "nops": 14,
    "payloads": 2146,
    "evasions": 12,
}
MATCH = {
    "type": "exploit",
    "name": "MS17-010 EternalBlue SMB Remote Windows Kernel Pool Corruption",
    "fullname": "exploit/windows/smb/ms17_010_eternalblue",
    "rank": "average",
    "disclosuredate": "2017-03-14",
}


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
    """A stand-in for the network: records requests, returns one reply."""

    def __init__(self, reply: FakeReply) -> None:
        self.reply = reply
        self.requests: list[urllib.request.Request] = []

    def __call__(self, request: urllib.request.Request, timeout: float) -> Any:
        self.requests.append(request)
        return self.reply


def make_settings() -> rpc.RpcSettings:
    return rpc.RpcSettings(user="msf", password=PASSWORD)


def ok(result: Any) -> Recorder:
    body = {"jsonrpc": "2.0", "result": result, "id": 1}
    return Recorder(FakeReply(json.dumps(body).encode("utf-8")))


def sent(recorder: Recorder) -> dict[str, Any]:
    return json.loads(recorder.requests[0].data)


def test_get_version_returns_the_fields() -> None:
    recorder = ok(VERSION)
    result = queries.get_version(make_settings(), open_url=recorder)
    assert result == queries.MsfVersion(
        version="6.4.126-dev-",
        ruby="3.4.4 x86_64-linux 2025-05-14",
        api="1.0",
    )
    assert sent(recorder)["method"] == "core.version"


@pytest.mark.parametrize(
    "result",
    [
        [],
        "text",
        {},
        {"version": "1", "ruby": "r"},
        {**VERSION, "version": 1},
        {**VERSION, "version": ""},
        {**VERSION, "version": "x\x1b[31m"},
        {**VERSION, "ruby": "x" * 500},
    ],
)
def test_get_version_refuses_bad_shapes(result: Any) -> None:
    with pytest.raises(rpc.RpcError) as caught:
        queries.get_version(make_settings(), open_url=ok(result))
    assert str(caught.value) == rpc.UNUSABLE_MESSAGE


def test_get_module_stats_returns_the_counts() -> None:
    recorder = ok(STATS)
    result = queries.get_module_stats(make_settings(), open_url=recorder)
    assert result == STATS
    assert sent(recorder)["method"] == "core.module_stats"


@pytest.mark.parametrize(
    "result",
    [
        [],
        {},
        {"exploits": "many"},
        {"exploits": True},
        {"exploits": -1},
        {"exploits": 1.5},
    ],
)
def test_get_module_stats_refuses_bad_shapes(result: Any) -> None:
    with pytest.raises(rpc.RpcError) as caught:
        queries.get_module_stats(make_settings(), open_url=ok(result))
    assert str(caught.value) == rpc.UNUSABLE_MESSAGE


def test_search_returns_the_matches() -> None:
    recorder = ok([MATCH])
    result = queries.search_modules(
        make_settings(), "ms17_010_eternalblue", open_url=recorder
    )
    assert result.total == 1
    assert result.truncated is False
    match = result.matches[0]
    assert match.module_type == "exploit"
    assert match.fullname == "exploit/windows/smb/ms17_010_eternalblue"
    assert match.rank == "average"
    assert match.disclosure_date == "2017-03-14"
    assert sent(recorder)["method"] == "module.search"
    assert sent(recorder)["params"] == ["ms17_010_eternalblue"]


def test_search_strips_the_query() -> None:
    recorder = ok([])
    queries.search_modules(make_settings(), "  ms17  ", open_url=recorder)
    assert sent(recorder)["params"] == ["ms17"]


def test_search_with_no_matches() -> None:
    result = queries.search_modules(make_settings(), "nothing", open_url=ok([]))
    assert result.matches == ()
    assert result.total == 0
    assert result.truncated is False


def test_search_accepts_a_missing_disclosure_date() -> None:
    item = {key: value for key, value in MATCH.items() if key != "disclosuredate"}
    result = queries.search_modules(make_settings(), "x", open_url=ok([item]))
    assert result.matches[0].disclosure_date is None


def test_search_cuts_a_long_list_and_says_so() -> None:
    count = queries.MAX_MATCHES + 5
    result = queries.search_modules(make_settings(), "x", open_url=ok([MATCH] * count))
    assert len(result.matches) == queries.MAX_MATCHES
    assert result.total == count
    assert result.truncated is True


@pytest.mark.parametrize(
    "query",
    ["", "   ", "a" * 201, "bad\nquery", "x\x00y", 123],
)
def test_search_refuses_bad_queries(query: Any) -> None:
    recorder = ok([])
    with pytest.raises(rpc.RpcError) as caught:
        queries.search_modules(make_settings(), query, open_url=recorder)
    assert str(caught.value) == queries.QUERY_MESSAGE
    assert recorder.requests == []


@pytest.mark.parametrize(
    "result",
    [
        {},
        "text",
        [1],
        [{"type": "exploit"}],
        [{**MATCH, "rank": 5}],
        [{**MATCH, "fullname": "exploit/x\x1b"}],
    ],
)
def test_search_refuses_bad_result_shapes(result: Any) -> None:
    with pytest.raises(rpc.RpcError) as caught:
        queries.search_modules(make_settings(), "x", open_url=ok(result))
    assert str(caught.value) == rpc.UNUSABLE_MESSAGE


def test_a_server_error_gives_the_fixed_message() -> None:
    error = {"code": -32601, "message": "secret detail"}
    body = json.dumps({"jsonrpc": "2.0", "error": error, "id": 1}).encode()
    with pytest.raises(rpc.RpcError) as caught:
        queries.get_version(make_settings(), open_url=Recorder(FakeReply(body)))
    assert str(caught.value) == rpc.SERVER_ERROR_MESSAGE
