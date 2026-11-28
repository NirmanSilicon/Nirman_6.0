"""Tests for running the planned checks with a fake Metasploit server."""

import json
import urllib.request
from collections.abc import Callable
from typing import Any

from ghostsight.integrations import metasploit_check as check
from ghostsight.integrations import metasploit_rpc as rpc
from ghostsight.validation.check_plan import PlannedCheck
from ghostsight.validation.check_run import run_planned_checks
from ghostsight.validation.status_rules import CheckOutcome
from ghostsight.validation.validation_apply import CheckResult

TARGET = "10.0.0.5"
UUID = "ReDz4qSMUfjvmuPnhOq50SBF"
QUERY = "cve:2017-0144"
MODULE = "auxiliary/scanner/smb/smb_ms17_010"
OTHER = "auxiliary/scanner/smb/other_check"
EXPLOIT = "exploit/windows/smb/ms17_010_eternalblue"
PLAN = (PlannedCheck(0, (QUERY,)),)
ERROR_REPLY = {
    "jsonrpc": "2.0",
    "id": 1,
    "error": {"code": -32000, "message": "Application server error"},
}
STARTED = {"job_id": 0, "uuid": UUID}
LISTED_METHODS = {
    "module.search",
    "module.info",
    "module.check",
    "module.running_stats",
    "module.results",
}


class FakeReply:
    def __init__(self, body: bytes) -> None:
        self.status = 200
        self._body = body

    def __enter__(self) -> "FakeReply":
        return self

    def __exit__(self, *args: object) -> None:
        return None

    def read(self, limit: int = -1) -> bytes:
        return self._body if limit < 0 else self._body[:limit]


class FakeServer:
    """Answers each method with a handler and records every call."""

    def __init__(self, handlers: dict[str, Callable[[list[Any]], Any]]) -> None:
        self.handlers = handlers
        self.calls: list[tuple[str, list[Any]]] = []

    def __call__(self, request: urllib.request.Request, timeout: float) -> Any:
        body = json.loads(request.data)
        self.calls.append((body["method"], body["params"]))
        answer = self.handlers[body["method"]](body["params"])
        return FakeReply(json.dumps(answer).encode())

    def methods(self) -> list[str]:
        return [method for method, _ in self.calls]


def reply(result: Any) -> dict[str, Any]:
    return {"jsonrpc": "2.0", "id": 1, "result": result}


def sequence(items: list[Any]) -> Callable[[list[Any]], Any]:
    queue = list(items)

    def next_item(params: list[Any]) -> Any:
        return queue.pop(0) if len(queue) > 1 else queue[0]

    return next_item


def match(fullname: str, rank: str = "normal") -> dict[str, str]:
    return {
        "type": fullname.split("/")[0],
        "name": "Example module",
        "fullname": fullname,
        "rank": rank,
        "disclosuredate": "",
    }


def completed(code: str) -> dict[str, Any]:
    return {
        "status": "completed",
        "result": {"code": code, "message": "m", "details": {}, "vuln": {}},
    }


def make_server(
    searches: dict[str, list[dict[str, str]]],
    supports: dict[str, bool] | None = None,
    codes: tuple[str, ...] = ("vulnerable",),
    check_replies: list[Any] | None = None,
) -> FakeServer:
    flags = supports or {}
    started = check_replies or [reply(STARTED)]
    return FakeServer(
        {
            "module.search": lambda p: reply(searches.get(p[0], [])),
            "module.info": lambda p: reply({"check": flags.get(f"{p[0]}/{p[1]}", True)}),
            "module.check": sequence(started),
            "module.running_stats": lambda p: reply({"results": [UUID]}),
            "module.results": sequence([reply(completed(c)) for c in codes]),
        }
    )


def go(server: FakeServer, plan: tuple[PlannedCheck, ...] = PLAN, target: str = TARGET):
    settings = rpc.RpcSettings(user="msf", password="pw-secret-123")
    return run_planned_checks(
        settings, target, plan, open_url=server, sleep=lambda s: None
    )


def test_one_finding_is_checked_and_its_result_returned() -> None:
    server = make_server({QUERY: [match(MODULE)]})
    run = go(server)
    assert run.results == (CheckResult(0, MODULE, CheckOutcome.VULNERABLE),)
    assert run.skipped == ()
    assert server.methods() == [
        "module.search",
        "module.info",
        "module.check",
        "module.running_stats",
        "module.results",
    ]


def test_the_check_sets_only_the_target() -> None:
    server = make_server({QUERY: [match(MODULE)]})
    go(server)
    sent = [params for method, params in server.calls if method == "module.check"]
    assert sent == [["auxiliary", "scanner/smb/smb_ms17_010", {"RHOSTS": TARGET}]]


def test_an_exploit_module_is_never_asked_about_or_checked() -> None:
    server = make_server({QUERY: [match(EXPLOIT, "great"), match(MODULE)]})
    go(server)
    used = [
        params
        for method, params in server.calls
        if method in ("module.info", "module.check")
    ]
    assert used
    assert all(params[0] == "auxiliary" for params in used)


def test_only_the_listed_methods_are_ever_used() -> None:
    server = make_server({QUERY: [match(MODULE)]})
    go(server)
    assert set(server.methods()) <= LISTED_METHODS
    assert "module.execute" not in server.methods()


def test_no_candidate_means_a_note_and_no_check() -> None:
    server = make_server({})
    run = go(server)
    assert run.results == ()
    assert run.skipped == (
        "Finding 1: no auxiliary check module was found for its CVE ids.",
    )
    assert server.methods() == ["module.search"]


def test_an_exploit_only_search_counts_as_no_candidate() -> None:
    server = make_server({QUERY: [match(EXPLOIT, "great")]})
    run = go(server)
    assert run.results == ()
    assert len(run.skipped) == 1
    assert server.methods() == ["module.search"]


def test_a_candidate_without_a_check_is_skipped_and_the_next_is_tried() -> None:
    server = make_server(
        {QUERY: [match(MODULE, "great"), match(OTHER, "normal")]},
        supports={MODULE: False, OTHER: True},
    )
    run = go(server)
    assert [item.module for item in run.results] == [OTHER]
    assert server.methods().count("module.info") == 2
    assert server.methods().count("module.check") == 1


def test_no_candidate_with_a_check_means_a_note() -> None:
    server = make_server(
        {QUERY: [match(MODULE), match(OTHER)]},
        supports={MODULE: False, OTHER: False},
    )
    run = go(server)
    assert run.results == ()
    assert run.skipped == ("Finding 1: no candidate module has a check.",)
    assert "module.check" not in server.methods()


def test_only_the_first_supported_candidate_is_run() -> None:
    server = make_server({QUERY: [match(OTHER, "normal"), match(MODULE, "great")]})
    run = go(server)
    assert [item.module for item in run.results] == [MODULE]
    assert server.methods().count("module.check") == 1


def test_every_query_of_a_finding_is_searched() -> None:
    plan = (PlannedCheck(0, ("cve:2017-0001", "cve:2017-0002")),)
    server = make_server({"cve:2017-0002": [match(MODULE)]})
    run = go(server, plan)
    assert server.methods().count("module.search") == 2
    assert [item.module for item in run.results] == [MODULE]


def test_one_failing_finding_does_not_stop_the_next() -> None:
    plan = (PlannedCheck(0, (QUERY,)), PlannedCheck(1, (QUERY,)))
    server = make_server(
        {QUERY: [match(MODULE)]},
        check_replies=[ERROR_REPLY, reply(STARTED)],
    )
    run = go(server, plan)
    assert [item.finding_index for item in run.results] == [1]
    assert run.skipped == (f"Finding 1: {rpc.SERVER_ERROR_MESSAGE}",)


def test_a_target_that_is_not_one_address_sends_no_check() -> None:
    server = make_server({QUERY: [match(MODULE)]})
    run = go(server, target="10.0.0.0/24")
    assert run.results == ()
    assert run.skipped == (f"Finding 1: {check.TARGET_MESSAGE}",)
    assert "module.check" not in server.methods()


def test_an_empty_plan_sends_nothing() -> None:
    server = make_server({})
    run = go(server, plan=())
    assert run.results == ()
    assert run.skipped == ()
    assert server.calls == []


def test_each_finding_gets_its_own_outcome() -> None:
    plan = (PlannedCheck(0, (QUERY,)), PlannedCheck(1, (QUERY,)))
    server = make_server({QUERY: [match(MODULE)]}, codes=("vulnerable", "safe"))
    run = go(server, plan)
    assert [(i.finding_index, i.outcome) for i in run.results] == [
        (0, CheckOutcome.VULNERABLE),
        (1, CheckOutcome.NOT_VULNERABLE),
    ]
