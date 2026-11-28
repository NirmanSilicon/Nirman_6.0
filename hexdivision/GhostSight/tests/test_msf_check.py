"""Tests for running one Metasploit check over RPC (check-only, loopback)."""

import json
import urllib.request
from collections.abc import Callable
from typing import Any

import pytest

from ghostsight.integrations import metasploit_check as check
from ghostsight.integrations import metasploit_rpc as rpc
from ghostsight.validation.status_rules import CheckOutcome

PASSWORD = "pw-secret-123"
MODULE = "auxiliary/scanner/smb/smb_ms17_010"
TARGET = "10.0.0.5"
UUID = "ReDz4qSMUfjvmuPnhOq50SBF"
ERROR_REPLY = {
    "jsonrpc": "2.0",
    "id": 1,
    "error": {"code": -32000, "message": "Application server error"},
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


class FakeServer:
    """Replays prepared replies per method; the last one repeats."""

    def __init__(self, replies: dict[str, list[Any]]) -> None:
        self.replies = replies
        self.counts: dict[str, int] = {}
        self.calls: list[tuple[str, list[Any]]] = []

    def __call__(self, request: urllib.request.Request, timeout: float) -> Any:
        body = json.loads(request.data)
        method = body["method"]
        self.calls.append((method, body["params"]))
        queue = self.replies[method]
        seen = self.counts.get(method, 0)
        self.counts[method] = seen + 1
        return FakeReply(json.dumps(queue[min(seen, len(queue) - 1)]).encode())

    def methods(self) -> list[str]:
        return [method for method, _ in self.calls]


def reply(result: Any) -> dict[str, Any]:
    return {"jsonrpc": "2.0", "id": 1, "result": result}


def make_settings(url: str = rpc.DEFAULT_URL) -> rpc.RpcSettings:
    return rpc.RpcSettings(user="msf", password=PASSWORD, url=url)


def completed(code: Any) -> dict[str, Any]:
    return {
        "status": "completed",
        "result": {
            "code": code,
            "message": "m",
            "reason": None,
            "details": {},
            "vuln": {},
        },
    }


def make_server(outcome: Any, waits: int = 0) -> FakeServer:
    pending = reply({"waiting": [], "running": [UUID], "results": []})
    done = reply({"waiting": [], "running": [], "results": [UUID]})
    return FakeServer(
        {
            "module.check": [reply({"job_id": 0, "uuid": UUID})],
            "module.running_stats": [pending] * waits + [done],
            "module.results": [reply(outcome)],
        }
    )


def run(
    server: FakeServer,
    pauses: list[float] | None = None,
    max_polls: int = 5,
    poll_seconds: float = 0.0,
) -> CheckOutcome:
    seen = [] if pauses is None else pauses
    return check.run_check(
        make_settings(),
        MODULE,
        TARGET,
        open_url=server,
        sleep=seen.append,
        max_polls=max_polls,
        poll_seconds=poll_seconds,
    )


def message_of(call: Callable[[], Any]) -> str:
    with pytest.raises(rpc.RpcError) as caught:
        call()
    return str(caught.value)


# --- the method list ---------------------------------------------------------


def test_check_methods_are_exactly_these_four() -> None:
    assert check.CHECK_METHODS == frozenset(
        {"module.info", "module.check", "module.running_stats", "module.results"}
    )


def test_execute_is_not_on_any_list() -> None:
    assert "module.execute" not in check.CHECK_METHODS
    assert "module.execute" not in rpc.READ_ONLY_METHODS


@pytest.mark.parametrize(
    "method",
    [
        "module.execute",
        "module.search",
        "core.version",
        "module.check ",
        "MODULE.CHECK",
        "",
        None,
        5,
    ],
)
def test_other_methods_are_refused_and_nothing_is_sent(method: Any) -> None:
    server = FakeServer({})
    text = message_of(
        lambda: check.call_check_rpc(make_settings(), method, [], open_url=server)
    )
    assert text == rpc.METHOD_MESSAGE
    assert server.calls == []


@pytest.mark.parametrize("method", sorted(check.CHECK_METHODS))
def test_each_listed_method_is_sent_and_its_result_returned(method: str) -> None:
    server = FakeServer({method: [reply({"ok": True})]})
    result = check.call_check_rpc(make_settings(), method, ["a"], open_url=server)
    assert result == {"ok": True}
    assert server.calls == [(method, ["a"])]


def test_params_may_hold_a_dict() -> None:
    server = FakeServer({"module.check": [reply({"uuid": UUID})]})
    params = ["auxiliary", "x", {"RHOSTS": "10.0.0.5"}]
    check.call_check_rpc(make_settings(), "module.check", params, open_url=server)
    assert server.calls == [("module.check", params)]


@pytest.mark.parametrize(
    "url",
    [
        "http://192.168.1.5:55553/api/v1/json-rpc",
        "http://localhost:55553/api/v1/json-rpc",
        "https://127.0.0.1:55553/api/v1/json-rpc",
        "http://127.0.0.1:55553/other",
    ],
)
def test_a_non_loopback_url_is_refused_and_nothing_is_sent(url: str) -> None:
    server = FakeServer({})
    text = message_of(
        lambda: check.call_check_rpc(
            make_settings(url), "module.info", [], open_url=server
        )
    )
    assert text == rpc.ADDRESS_MESSAGE
    assert server.calls == []


def test_a_network_failure_gives_the_fixed_message() -> None:
    def broken(request: urllib.request.Request, timeout: float) -> Any:
        raise OSError("secret detail " + PASSWORD)

    text = message_of(
        lambda: check.call_check_rpc(
            make_settings(), "module.info", [], open_url=broken
        )
    )
    assert text == rpc.UNREACHABLE_MESSAGE
    assert PASSWORD not in text


# --- the module name ---------------------------------------------------------

BAD_MODULES = [
    "",
    "auxiliary",
    "auxiliary/",
    "exploit/windows/smb/ms17_010_eternalblue",
    "post/windows/gather/something",
    "payload/windows/shell/reverse_tcp",
    "auxiliary/../etc",
    "auxiliary//scanner",
    "auxiliary/scanner smb",
    "auxiliary/scanner\nsmb",
    "auxiliary/scanner/smb/smb_ms17_010\n",
    "auxiliary/Scanner/smb",
    "auxiliary/scanner;smb",
]


@pytest.mark.parametrize("module", BAD_MODULES)
def test_supports_check_refuses_a_bad_module_name(module: str) -> None:
    server = FakeServer({})
    text = message_of(
        lambda: check.module_supports_check(make_settings(), module, open_url=server)
    )
    assert text == check.MODULE_MESSAGE
    assert server.calls == []


@pytest.mark.parametrize("module", BAD_MODULES)
def test_run_check_refuses_a_bad_module_name(module: str) -> None:
    server = FakeServer({})
    text = message_of(
        lambda: check.run_check(
            make_settings(), module, TARGET, open_url=server, sleep=lambda s: None
        )
    )
    assert text == check.MODULE_MESSAGE
    assert server.calls == []


# --- the target --------------------------------------------------------------

BAD_TARGETS = [
    "",
    " 10.0.0.5",
    "10.0.0.5 ",
    "10.0.0.5\n",
    "10.0.0.0/24",
    "10.0.0.5/32",
    "10.0.0.5,10.0.0.6",
    "10.0.0.5 10.0.0.6",
    "file:/etc/hosts",
    "example.com",
    "localhost",
    "010.0.0.5",
    "10.0.0.5:445",
    "10.0.0.256",
]


@pytest.mark.parametrize("target", BAD_TARGETS)
def test_run_check_refuses_a_target_that_is_not_one_plain_address(
    target: str,
) -> None:
    server = FakeServer({})
    text = message_of(
        lambda: check.run_check(
            make_settings(), MODULE, target, open_url=server, sleep=lambda s: None
        )
    )
    assert text == check.TARGET_MESSAGE
    assert server.calls == []


# --- does the module have a check --------------------------------------------


def test_supports_check_asks_module_info_with_type_then_path() -> None:
    server = FakeServer({"module.info": [reply({"check": True})]})
    check.module_supports_check(make_settings(), MODULE, open_url=server)
    assert server.calls == [("module.info", ["auxiliary", "scanner/smb/smb_ms17_010"])]


def test_supports_check_is_true_only_for_the_value_true() -> None:
    server = FakeServer({"module.info": [reply({"check": True, "name": "n"})]})
    assert check.module_supports_check(make_settings(), MODULE, open_url=server)


@pytest.mark.parametrize(
    "info",
    [{"check": False}, {"name": "n"}, {"check": "yes"}, {"check": 1}, {"check": None}],
)
def test_supports_check_is_false_for_anything_else(info: dict[str, Any]) -> None:
    server = FakeServer({"module.info": [reply(info)]})
    assert not check.module_supports_check(make_settings(), MODULE, open_url=server)


@pytest.mark.parametrize("info", ["x", None, [], 5])
def test_supports_check_refuses_a_reply_that_is_not_a_dict(info: Any) -> None:
    server = FakeServer({"module.info": [reply(info)]})
    text = message_of(
        lambda: check.module_supports_check(make_settings(), MODULE, open_url=server)
    )
    assert text == rpc.UNUSABLE_MESSAGE


# --- running a check ---------------------------------------------------------


def test_run_check_sends_only_rhosts_and_fetches_the_result_once() -> None:
    server = make_server(completed("vulnerable"))
    assert run(server) is CheckOutcome.VULNERABLE
    assert server.calls[0] == (
        "module.check",
        ["auxiliary", "scanner/smb/smb_ms17_010", {"RHOSTS": TARGET}],
    )
    assert server.calls[-1] == ("module.results", [UUID])
    assert server.methods() == [
        "module.check",
        "module.running_stats",
        "module.results",
    ]


def test_run_check_waits_between_polls() -> None:
    server = make_server(completed("safe"), waits=2)
    pauses: list[float] = []
    assert run(server, pauses, poll_seconds=2.5) is CheckOutcome.NOT_VULNERABLE
    assert server.methods().count("module.running_stats") == 3
    assert pauses == [2.5, 2.5]


def test_run_check_does_not_wait_when_already_done() -> None:
    pauses: list[float] = []
    run(make_server(completed("safe")), pauses)
    assert pauses == []


def test_run_check_gives_up_without_fetching_a_result() -> None:
    server = make_server(completed("vulnerable"), waits=10)
    text = message_of(lambda: run(server, max_polls=3))
    assert text == check.TIMEOUT_MESSAGE
    assert server.methods().count("module.running_stats") == 3
    assert "module.results" not in server.methods()


def test_run_check_only_uses_listed_methods() -> None:
    server = make_server(completed("appears"), waits=1)
    run(server)
    assert set(server.methods()) <= check.CHECK_METHODS
    assert "module.execute" not in server.methods()


# --- turning the code into an outcome ----------------------------------------


@pytest.mark.parametrize(
    ("code", "expected"),
    [
        ("vulnerable", CheckOutcome.VULNERABLE),
        ("appears", CheckOutcome.APPEARS_VULNERABLE),
        ("detected", CheckOutcome.DETECTED),
        ("safe", CheckOutcome.NOT_VULNERABLE),
        ("unknown", CheckOutcome.CANNOT_TELL),
        ("unsupported", CheckOutcome.CANNOT_TELL),
    ],
)
def test_known_codes_map_to_outcomes(code: str, expected: CheckOutcome) -> None:
    assert run(make_server(completed(code))) is expected


@pytest.mark.parametrize(
    "code", ["strange", "VULNERABLE", "", None, 5, ["vulnerable"], {"a": 1}]
)
def test_any_other_code_means_cannot_tell(code: Any) -> None:
    assert run(make_server(completed(code))) is CheckOutcome.CANNOT_TELL


def test_a_missing_code_means_cannot_tell() -> None:
    outcome = {"status": "completed", "result": {}}
    assert run(make_server(outcome)) is CheckOutcome.CANNOT_TELL


# --- replies that cannot be used ---------------------------------------------


@pytest.mark.parametrize(
    "bad",
    [
        {},
        {"job_id": 0},
        {"uuid": 5},
        {"uuid": ""},
        {"uuid": "a b"},
        {"uuid": "x" * 65},
        "text",
        None,
        [],
    ],
)
def test_a_bad_check_reply_stops_after_the_first_call(bad: Any) -> None:
    server = FakeServer({"module.check": [reply(bad)]})
    assert message_of(lambda: run(server)) == rpc.UNUSABLE_MESSAGE
    assert server.methods() == ["module.check"]


@pytest.mark.parametrize(
    "bad", ["x", None, {}, {"results": "abc"}, {"results": None}]
)
def test_bad_running_stats_are_refused(bad: Any) -> None:
    server = FakeServer(
        {
            "module.check": [reply({"uuid": UUID})],
            "module.running_stats": [reply(bad)],
        }
    )
    assert message_of(lambda: run(server)) == rpc.UNUSABLE_MESSAGE
    assert server.methods() == ["module.check", "module.running_stats"]


@pytest.mark.parametrize(
    "bad",
    [
        "x",
        None,
        [],
        {},
        {"status": "completed"},
        {"status": "completed", "result": "x"},
        {"status": "completed", "result": None},
        {"status": "running", "result": {"code": "vulnerable"}},
        {"status": "errored", "result": {"code": "vulnerable"}},
    ],
)
def test_a_bad_final_result_is_refused(bad: Any) -> None:
    assert message_of(lambda: run(make_server(bad))) == rpc.UNUSABLE_MESSAGE


def test_a_server_error_from_module_check_gives_the_fixed_message() -> None:
    server = FakeServer({"module.check": [ERROR_REPLY]})
    with pytest.raises(rpc.RpcError) as caught:
        run(server)
    assert server.methods() == ["module.check"]
    assert str(caught.value) == rpc.SERVER_ERROR_MESSAGE
