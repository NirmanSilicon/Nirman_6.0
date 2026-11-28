"""Tests for scans that skip host discovery. Nmap itself is never started here."""

import pytest

from ghostsight import scanner
from ghostsight.integrations.nmap_parser import ParsedScan
from ghostsight.integrations.nmap_runner import DEFAULT_PROFILE, ScanProfile
from ghostsight.reporting.models import Service
from ghostsight.scanner import build_notes, perform_scan
from ghostsight.security.scope_manager import ScopeDecision

COVERAGE = "the 100 most common TCP ports"


def approved(target: str = "127.0.0.1") -> ScopeDecision:
    return ScopeDecision(
        target=target, allowed=True, reason="Inside scope.", normalised=target
    )


def make_parsed(has_service: bool = True, hosts_up: int = 1) -> ParsedScan:
    services = []
    if has_service:
        services.append(
            Service(
                host="127.0.0.1",
                port=22,
                protocol="tcp",
                name="ssh",
                version="OpenSSH 9.6p1",
                extra_info="",
            )
        )
    return ParsedScan(
        services=services,
        hosts_up=hosts_up,
        hosts_total=1,
        elapsed_seconds=1.5,
        nmap_version="7.94SVN",
        completed=True,
    )


def test_skip_discovery_is_passed_to_run_nmap(
    monkeypatch: pytest.MonkeyPatch,
) -> None:
    calls: list[bool] = []

    def fake_run(
        target: str,
        profile: ScanProfile = DEFAULT_PROFILE,
        skip_discovery: bool = False,
    ) -> ParsedScan:
        calls.append(skip_discovery)
        return make_parsed()

    monkeypatch.setattr(scanner, "run_nmap", fake_run)
    perform_scan(approved(), skip_discovery=True)
    assert calls == [True]


def test_a_normal_scan_does_not_pass_skip_discovery(
    monkeypatch: pytest.MonkeyPatch,
) -> None:
    # This fake has the old signature, so passing the new argument would fail.
    def old_fake_run(
        target: str, profile: ScanProfile = DEFAULT_PROFILE
    ) -> ParsedScan:
        return make_parsed()

    monkeypatch.setattr(scanner, "run_nmap", old_fake_run)
    result = perform_scan(approved())
    assert not any("discovery was skipped" in note for note in result.notes)


def test_skipped_discovery_is_noted_in_the_result(
    monkeypatch: pytest.MonkeyPatch,
) -> None:
    def fake_run(
        target: str,
        profile: ScanProfile = DEFAULT_PROFILE,
        skip_discovery: bool = False,
    ) -> ParsedScan:
        return make_parsed()

    monkeypatch.setattr(scanner, "run_nmap", fake_run)
    result = perform_scan(approved(), skip_discovery=True)
    assert any("Host discovery was skipped" in note for note in result.notes)


def test_default_notes_do_not_mention_skipped_discovery() -> None:
    notes = build_notes(DEFAULT_PROFILE, COVERAGE, make_parsed())
    assert not any("discovery was skipped" in note for note in notes)


@pytest.mark.parametrize("has_service", [True, False])
@pytest.mark.parametrize("hosts_up", [0, 1])
def test_skipped_discovery_never_claims_the_host_answered(
    has_service: bool, hosts_up: int
) -> None:
    parsed = make_parsed(has_service=has_service, hosts_up=hosts_up)
    notes = build_notes(DEFAULT_PROFILE, COVERAGE, parsed, skip_discovery=True)
    assert not any("answered" in note for note in notes)


def test_skipped_discovery_with_no_services_says_none_were_found() -> None:
    parsed = make_parsed(has_service=False)
    notes = build_notes(DEFAULT_PROFILE, COVERAGE, parsed, skip_discovery=True)
    assert any("No open services were found" in note for note in notes)
