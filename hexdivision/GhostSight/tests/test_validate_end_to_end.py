"""End-to-end tests for `ghostsight validate`, with a fake local RPC server.

The real client code runs. Only the Metasploit server is fake: a small HTTP
server on 127.0.0.1 that answers by method name and records every call. The
reply shapes come from real probes, except the code "vulnerable", which is
from memory.
"""

import json
import threading
from collections.abc import Iterator
from http.server import BaseHTTPRequestHandler, ThreadingHTTPServer
from pathlib import Path
from typing import Any

import pytest
from typer.testing import CliRunner

import ghostsight.main as cli
from ghostsight.integrations import metasploit_rpc as rpc
from ghostsight.main import app
from ghostsight.reporting.generator import generate_scan_reports
from ghostsight.reporting.models import (
    Finding,
    FindingStatus,
    ScanResult,
    Service,
)
from ghostsight.reporting.scan_reader import read_scan_file
from ghostsight.security.audit_log import default_audit_path
from ghostsight.security.policy import default_policy_path
from ghostsight.security.scope_manager import default_scope_path
from ghostsight.validation.check_run import NO_CHECK_NOTE

runner = CliRunner()

TARGET = "10.0.0.5"
MODULE = "auxiliary/scanner/smb/smb_ms17_010"
EXPLOIT = "exploit/windows/smb/ms17_010_eternalblue"
JOB_ID = "ReDz4qSMUfjvmuPnhOq50SBF"

SEARCH_REPLY = [
    {
        "type": "auxiliary",
        "name": "MS17-010 SMB RCE Detection",
        "fullname": MODULE,
        "rank": "normal",
        "disclosuredate": "",
    },
    {
        "type": "exploit",
        "name": "MS17-010 EternalBlue SMB Remote Windows Kernel Pool Corruption",
        "fullname": EXPLOIT,
        "rank": "average",
        "disclosuredate": "2017-03-14",
    },
]


class Handler(BaseHTTPRequestHandler):
    """Reads a JSON-RPC request, records it, and sends the fake's answer."""

    def do_POST(self) -> None:
        length = int(self.headers.get("Content-Length", 0))
        body = json.loads(self.rfile.read(length))
        method = body.get("method")
        params = body.get("params", [])
        self.server.calls.append((method, params))
        data = json.dumps(self.server.answer(method, params)).encode("utf-8")
        self.send_response(200)
        self.send_header("Content-Length", str(len(data)))
        self.end_headers()
        self.wfile.write(data)

    def log_message(self, format: str, *args: object) -> None:
        """Keep the test output quiet."""


class FakeMsf(ThreadingHTTPServer):
    def __init__(self) -> None:
        super().__init__(("127.0.0.1", 0), Handler)
        self.calls: list[tuple[str, list[Any]]] = []
        self.code = "vulnerable"
        self.has_check = True
        self.fail_method: str | None = None

    def methods(self) -> list[str]:
        return [method for method, _ in self.calls]

    def answer(self, method: str, params: list[Any]) -> dict[str, Any]:
        if method == self.fail_method or method not in self.replies():
            return {
                "jsonrpc": "2.0",
                "error": {
                    "code": -32000,
                    "message": "Application server error: Invalid Module",
                    "data": {"code": 500},
                },
                "id": rpc.REQUEST_ID,
            }
        return {
            "jsonrpc": "2.0",
            "result": self.replies()[method],
            "id": rpc.REQUEST_ID,
        }

    def replies(self) -> dict[str, Any]:
        return {
            "module.search": SEARCH_REPLY,
            "module.info": {"type": "auxiliary", "check": self.has_check},
            "module.check": {"job_id": 0, "uuid": JOB_ID},
            "module.running_stats": {
                "waiting": [],
                "running": [],
                "results": [JOB_ID],
            },
            "module.results": {
                "status": "completed",
                "result": {
                    "code": self.code,
                    "message": "Fake result.",
                    "reason": None,
                    "details": {},
                    "vuln": {},
                },
            },
        }


@pytest.fixture
def msf(monkeypatch: pytest.MonkeyPatch) -> Iterator[FakeMsf]:
    """Start the fake server and point the CLI's settings at it."""
    running = FakeMsf()
    thread = threading.Thread(target=running.serve_forever, args=(0.01,), daemon=True)
    thread.start()
    url = f"http://127.0.0.1:{running.server_address[1]}{rpc.RPC_PATH}"
    settings = rpc.RpcSettings(user="msf", password="test-password", url=url)
    monkeypatch.setattr(cli, "load_settings", lambda: settings)
    yield running
    running.shutdown()
    running.server_close()
    thread.join(timeout=5)


def write(path: Path, text: str) -> None:
    path.parent.mkdir(parents=True, exist_ok=True)
    path.write_text(text, encoding="utf-8")


def allow() -> None:
    """Write a scope file and a policy file into the isolated home."""
    write(default_scope_path(), f'[scope]\nallowed = ["{TARGET}"]\n')
    write(
        default_policy_path(),
        f'[policy]\nmax_target_addresses = 1024\n\n[lab]\nallowed = ["{TARGET}"]\n',
    )


def store_scan() -> Path:
    """Write a real scan folder with one potential finding."""
    finding = Finding(
        title="CVE-2017-0144: smb may be affected",
        status=FindingStatus.POTENTIAL,
        cve_ids=["CVE-2017-0144"],
        affected_service="port 445/tcp",
    )
    scan = ScanResult(
        target=TARGET,
        scan_id="e2e-001",
        scanner="nmap",
        services=[Service(host=TARGET, port=445, protocol="tcp", name="microsoft-ds")],
        findings=[finding],
    )
    return generate_scan_reports(scan).directory


def snapshot(directory: Path) -> dict[str, bytes]:
    return {item.name: item.read_bytes() for item in sorted(directory.iterdir())}


def saved_scan(directory: Path) -> ScanResult:
    return read_scan_file(directory / cli.SCAN_DATA_FILE)


def confirm() -> Any:
    return runner.invoke(app, ["validate", "--confirm"])


def one_line(text: str) -> str:
    return " ".join(text.split())


def test_a_vulnerable_reply_validates_and_saves(msf: FakeMsf) -> None:
    allow()
    directory = store_scan()
    result = confirm()
    assert result.exit_code == 0
    scan = saved_scan(directory)
    assert scan.findings[0].status == FindingStatus.VALIDATED
    assert len(scan.validation_notes) == 1
    report = (directory / "validation.txt").read_text(encoding="utf-8")
    assert "result vulnerable" in report
    assert "ABOUT THESE RESULTS" in report


def test_the_calls_on_the_wire_are_exactly_the_planned_ones(msf: FakeMsf) -> None:
    allow()
    store_scan()
    assert confirm().exit_code == 0
    assert any("2017-0144" in str(p) for m, p in msf.calls if m == "module.search")
    later = [call for call in msf.calls if call[0] != "module.search"]
    assert later == [
        ("module.info", ["auxiliary", "scanner/smb/smb_ms17_010"]),
        (
            "module.check",
            ["auxiliary", "scanner/smb/smb_ms17_010", {"RHOSTS": TARGET}],
        ),
        ("module.running_stats", []),
        ("module.results", [JOB_ID]),
    ]
    assert "module.execute" not in msf.methods()


def test_an_unknown_code_changes_no_status(msf: FakeMsf) -> None:
    msf.code = "unknown"
    allow()
    directory = store_scan()
    assert confirm().exit_code == 0
    scan = saved_scan(directory)
    assert scan.findings[0].status == FindingStatus.POTENTIAL
    assert len(scan.validation_notes) == 1
    assert MODULE in scan.validation_notes[0]


def test_a_module_without_a_check_is_never_checked(msf: FakeMsf) -> None:
    msf.has_check = False
    allow()
    directory = store_scan()
    before = snapshot(directory)
    result = confirm()
    assert result.exit_code == 0
    assert "module.check" not in msf.methods()
    assert NO_CHECK_NOTE in one_line(result.output)
    assert snapshot(directory) == before


def test_a_server_error_saves_nothing(msf: FakeMsf) -> None:
    msf.fail_method = "module.check"
    allow()
    directory = store_scan()
    before = snapshot(directory)
    result = confirm()
    assert result.exit_code == 0
    assert "nothing was saved" in one_line(result.output)
    assert snapshot(directory) == before


def test_the_dry_run_sends_no_check(msf: FakeMsf) -> None:
    allow()
    directory = store_scan()
    before = snapshot(directory)
    result = runner.invoke(app, ["validate"])
    assert result.exit_code == 0
    assert msf.calls
    assert set(msf.methods()) <= {"module.search", "module.info"}
    assert snapshot(directory) == before


def test_a_confirmed_run_leaves_an_audit_record(msf: FakeMsf) -> None:
    allow()
    store_scan()
    assert confirm().exit_code == 0
    text = default_audit_path().read_text(encoding="utf-8")
    assert "validate-check" in text
    assert TARGET in text
