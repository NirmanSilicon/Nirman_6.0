"""Tests that reports say what was not done, and what 'authorised' means."""

import json

from ghostsight.reporting.formatters import (
    format_final_report,
    format_vulnerabilities,
)
from ghostsight.reporting.generator import generate_scan_reports
from ghostsight.reporting.models import (
    Finding,
    FindingStatus,
    ScanResult,
    Service,
)


def make_scan(
    authorised: bool = True,
    analysis_performed: bool = False,
    findings: list[Finding] | None = None,
) -> ScanResult:
    return ScanResult(
        target="192.0.2.10",
        scan_id="ref-123",
        authorised=authorised,
        analysis_performed=analysis_performed,
        findings=findings or [],
        services=[
            Service(
                host="192.0.2.10",
                port=22,
                protocol="tcp",
                name="ssh",
                version="OpenSSH 9.6p1",
            )
        ],
    )


def make_finding() -> Finding:
    return Finding(
        title="Example finding",
        severity="low",
        confidence=0.5,
        status=FindingStatus.POTENTIAL,
    )


def test_summary_says_not_analysed_instead_of_zero() -> None:
    content = format_final_report(make_scan())
    assert "Findings recorded : Not analysed yet" in content
    assert "Validated issues  : Not validated yet" in content
    assert "Findings recorded : 0" not in content


def test_attention_section_says_not_assessed() -> None:
    content = format_final_report(make_scan())
    assert "Not assessed yet" in content
    assert "No actionable findings were recorded" not in content


def test_next_steps_do_not_imply_all_clear() -> None:
    content = format_final_report(make_scan())
    assert "Continue monitoring" not in content
    assert "Vulnerability analysis is not available yet" in content


def test_limitations_say_empty_findings_do_not_mean_secure() -> None:
    content = format_final_report(make_scan())
    assert "does not mean the target is secure" in content


def test_analysed_with_no_findings_keeps_the_zero_wording() -> None:
    content = format_final_report(make_scan(analysis_performed=True))
    assert "Findings recorded : 0" in content
    assert "No actionable findings were recorded" in content
    assert "Not analysed yet" not in content


def test_existing_findings_are_counted_even_if_flag_is_false() -> None:
    content = format_final_report(make_scan(findings=[make_finding()]))
    assert "Findings recorded : 1" in content
    assert "Not analysed yet" not in content
    assert "Example finding" in content


def test_vulnerabilities_file_explains_analysis_was_not_run() -> None:
    content = format_vulnerabilities(make_scan())
    assert "has not been run" in content
    assert "not the same as finding nothing" in content


def test_vulnerabilities_file_after_analysis_keeps_plain_wording() -> None:
    content = format_vulnerabilities(make_scan(analysis_performed=True))
    assert "No findings were recorded for this scan." in content
    assert "has not been run" not in content


def test_header_uses_reference_not_scan_id() -> None:
    content = format_final_report(make_scan())
    assert "Reference   : ref-123" in content
    assert "Scan ID     :" not in content


def test_authorised_header_says_what_it_means() -> None:
    content = format_final_report(make_scan(authorised=True))
    assert "Authorised  : Yes (inside your scope file)" in content


def test_authorised_limitation_is_not_legal_permission() -> None:
    content = format_final_report(make_scan(authorised=True))
    assert "not proof of legal permission" in content


def test_unauthorised_report_makes_no_scope_file_claim() -> None:
    content = format_final_report(make_scan(authorised=False))
    assert "inside your scope file" not in content
    assert "inside your own scope file" not in content


def test_analysis_performed_defaults_to_false_in_data() -> None:
    assert make_scan().to_dict()["analysis_performed"] is False


def test_analysis_performed_reaches_scan_data_json(isolated_home) -> None:
    paths = generate_scan_reports(make_scan())
    data = json.loads(paths.scan_data.read_text(encoding="utf-8"))
    assert data["analysis_performed"] is False
