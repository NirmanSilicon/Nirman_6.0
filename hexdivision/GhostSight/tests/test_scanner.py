"""Tests for the scan workflow. Nmap itself is never started here."""

import pytest

from ghostsight import scanner
from ghostsight.integrations.nmap_executor import NmapRunError
from ghostsight.integrations.nmap_parser import ParsedScan
from ghostsight.integrations.nmap_runner import DEFAULT_PROFILE, ScanProfile
from ghostsight.reporting.models import Service
from ghostsight.scanner import perform_scan
from ghostsight.security.scope_manager import ScopeDecision


def approved(target: str = "127.0.0.1") -> ScopeDecision:
    return ScopeDecision(
        target=target, allowed=True, reason="Inside scope.", normalised=target
    )


def make_parsed(
    services: list[Service] | None = None,
    hosts_up: int = 1,
    completed: bool = True,
) -> ParsedScan:
    if services is None:
        services = [
            Service(
                host="127.0.0.1",
                port=22,
                protocol="tcp",
                name="ssh",
                version="OpenSSH 9.6p1",
                extra_info="",
            )
        ]
    return ParsedScan(
        services=services,
        hosts_up=hosts_up,
        hosts_total=1,
        elapsed_seconds=1.5,
        nmap_version="7.94SVN",
        completed=completed,
    )


def install_fake_nmap(
    monkeypatch: pytest.MonkeyPatch,
    parsed: ParsedScan | None = None,
    error: Exception | None = None,
) -> list[tuple[str, ScanProfile]]:
    calls: list[tuple[str, ScanProfile]] = []
    result = parsed if parsed is not None else make_parsed()

    def fake_run(target: str, profile: ScanProfile = DEFAULT_PROFILE) -> ParsedScan:
        calls.append((target, profile))
        if error is not None:
            raise error
        return result

    monkeypatch.setattr(scanner, "run_nmap", fake_run)
    return calls


def test_authorised_comes_from_the_scope_decision(
    monkeypatch: pytest.MonkeyPatch,
) -> None:
    install_fake_nmap(monkeypatch)
    assert perform_scan(approved()).authorised is True


@pytest.mark.parametrize(
    "decision",
    [
        ScopeDecision(target="8.8.8.8", allowed=False, reason="Outside scope."),
        ScopeDecision(
            target="127.0.0.1", allowed=True, reason="odd", normalised=None
        ),
    ],
)
def test_unapproved_decision_is_refused_before_nmap_runs(
    monkeypatch: pytest.MonkeyPatch, decision: ScopeDecision
) -> None:
    calls = install_fake_nmap(monkeypatch)
    with pytest.raises(ValueError, match="not approved"):
        perform_scan(decision)
    assert calls == []


def test_target_and_profile_are_passed_to_nmap(
    monkeypatch: pytest.MonkeyPatch,
) -> None:
    calls = install_fake_nmap(monkeypatch)
    perform_scan(approved("192.168.56.10"), ScanProfile.NORMAL)
    assert calls == [("192.168.56.10", ScanProfile.NORMAL)]


def test_services_are_copied_and_findings_are_empty(
    monkeypatch: pytest.MonkeyPatch,
) -> None:
    install_fake_nmap(monkeypatch)
    result = perform_scan(approved())
    assert [service.port for service in result.services] == [22]
    assert result.findings == []
    assert result.profile == "low-noise"


def test_scanner_name_includes_nmap_version(monkeypatch: pytest.MonkeyPatch) -> None:
    install_fake_nmap(monkeypatch)
    assert perform_scan(approved()).scanner == "nmap 7.94SVN"


def test_notes_state_which_ports_were_checked(
    monkeypatch: pytest.MonkeyPatch,
) -> None:
    install_fake_nmap(monkeypatch)
    notes = " ".join(perform_scan(approved()).notes)
    assert "100 most common TCP ports" in notes


def test_notes_say_no_vulnerability_analysis_was_done(
    monkeypatch: pytest.MonkeyPatch,
) -> None:
    install_fake_nmap(monkeypatch)
    notes = " ".join(perform_scan(approved()).notes)
    assert "No vulnerability analysis" in notes


def test_incomplete_scan_gets_a_warning(monkeypatch: pytest.MonkeyPatch) -> None:
    install_fake_nmap(monkeypatch, make_parsed(completed=False))
    notes = " ".join(perform_scan(approved()).notes)
    assert "clean finish" in notes


def test_host_down_is_not_reported_as_secure(
    monkeypatch: pytest.MonkeyPatch,
) -> None:
    install_fake_nmap(monkeypatch, make_parsed(services=[], hosts_up=0))
    notes = " ".join(perform_scan(approved()).notes)
    assert "No host answered" in notes
    assert "does not show that it is secure" in notes


def test_host_up_with_no_services_is_explained(
    monkeypatch: pytest.MonkeyPatch,
) -> None:
    install_fake_nmap(monkeypatch, make_parsed(services=[]))
    notes = " ".join(perform_scan(approved()).notes)
    assert "no open services" in notes


def test_clean_scan_has_no_warning_notes(monkeypatch: pytest.MonkeyPatch) -> None:
    install_fake_nmap(monkeypatch)
    notes = perform_scan(approved()).notes
    assert not any(note.startswith("WARNING") for note in notes)
    assert not any("No host answered" in note for note in notes)


def test_run_error_is_not_swallowed(monkeypatch: pytest.MonkeyPatch) -> None:
    install_fake_nmap(monkeypatch, error=NmapRunError("boom"))
    with pytest.raises(NmapRunError):
        perform_scan(approved())
