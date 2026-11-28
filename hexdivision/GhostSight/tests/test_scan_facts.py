"""The facts block is plain counting by code, with no AI involved."""

from ghostsight.intelligence.scan_facts import format_facts
from ghostsight.reporting.models import (
    Finding,
    FindingStatus,
    ScanResult,
    Service,
)


def make_scan(
    findings: list[Finding],
    services: int = 2,
    analysed: bool = True,
) -> ScanResult:
    return ScanResult(
        target="192.0.2.10",
        scan_id="scan_001",
        scanner="nmap",
        services=[
            Service(host="192.0.2.10", port=1000 + n, protocol="tcp")
            for n in range(services)
        ],
        findings=findings,
        analysis_performed=analysed,
    )


def potential(score: float | None, severity: str) -> Finding:
    return Finding(
        title="A finding",
        status=FindingStatus.POTENTIAL,
        cvss_score=score,
        severity=severity,
    )


def unknown(cve_count: int) -> Finding:
    return Finding(
        title="Could not be checked",
        status=FindingStatus.UNKNOWN,
        cve_ids=[f"CVE-2000-{n:04d}" for n in range(cve_count)],
    )


def test_header_says_the_block_is_not_ai() -> None:
    text = format_facts(make_scan([]))
    assert text.splitlines()[0].startswith("Facts from the scan")
    assert "not AI" in text.splitlines()[0]


def test_counts_services() -> None:
    assert "Services found: 3" in format_facts(make_scan([], services=3))


def test_findings_by_status_counts_all_findings() -> None:
    findings = [potential(5.0, "medium"), potential(6.0, "medium"), unknown(1)]
    text = format_facts(make_scan(findings))
    assert "Findings by status: Potential vulnerability 2, Unknown 1" in text


def test_highest_score_comes_with_its_own_severity() -> None:
    findings = [potential(4.3, "medium"), potential(9.4, "critical")]
    assert "Highest score: 9.4 (critical)" in format_facts(make_scan(findings))


def test_unchecked_records_are_the_cve_ids_of_unknown_findings() -> None:
    text = format_facts(make_scan([potential(5.0, "medium"), unknown(37)]))
    assert "CVE records that could not be checked: 37" in text


def test_no_unknown_findings_gives_zero() -> None:
    text = format_facts(make_scan([potential(5.0, "medium")]))
    assert "CVE records that could not be checked: 0" in text


def test_analysis_not_done_is_stated() -> None:
    text = format_facts(make_scan([], analysed=False))
    assert "Vulnerability analysis: not done" in text


def test_no_scored_findings_gives_none() -> None:
    text = format_facts(make_scan([potential(None, "unknown")]))
    assert "Highest score: none" in text


def test_hostile_severity_is_not_printed() -> None:
    hostile = "\x1b[31mevil\nextra line"
    text = format_facts(make_scan([potential(9.0, hostile)]))
    assert "evil" not in text
    assert "\x1b" not in text
    assert len(text.splitlines()) == 6
