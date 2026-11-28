"""Tests that untrusted text cannot forge extra lines in the text reports.

Banner text comes from the scanned host. A line break inside it must never
start a new report line, or a host could fake a field such as Authorised.
"""

import pytest

from ghostsight.reporting.formatters import (
    format_final_report,
    format_scan_results,
    format_services,
)
from ghostsight.reporting.models import ScanResult, Service

# Every character that str.splitlines() treats as the end of a line.
LINE_BREAKS = ["\n", "\r", "\r\n", "\v", "\f", "\x85", "\u2028"]
SERVICE_FIELDS = ["version", "extra_info", "name", "host", "protocol", "state"]


def hostile(line_break: str) -> str:
    """Return text that tries to start a new report line."""
    return f"x{line_break}Forged : Yes"


def scan_with_service_field(field: str, line_break: str) -> ScanResult:
    """Build a scan whose one service has hostile text in the given field."""
    service = Service(host="192.0.2.10", port=80, protocol="tcp", name="http")
    setattr(service, field, hostile(line_break))
    return ScanResult(target="192.0.2.10", scan_id="test-001", services=[service])


def has_forged_line(report: str) -> bool:
    """Return True if any line of the report starts with the forged text."""
    return any(line.startswith("Forged") for line in report.splitlines())


@pytest.mark.parametrize("field", SERVICE_FIELDS)
def test_services_report_cannot_be_forged_through_service_fields(field: str) -> None:
    report = format_services(scan_with_service_field(field, "\n"))
    assert not has_forged_line(report)


@pytest.mark.parametrize("line_break", LINE_BREAKS)
def test_services_report_ignores_every_kind_of_line_break(line_break: str) -> None:
    report = format_services(scan_with_service_field("extra_info", line_break))
    assert not has_forged_line(report)


@pytest.mark.parametrize("field", ["target", "scan_id"])
def test_report_header_cannot_be_forged(field: str) -> None:
    scan = ScanResult(target="192.0.2.10", scan_id="test-001")
    setattr(scan, field, hostile("\n"))
    assert not has_forged_line(format_services(scan))


@pytest.mark.parametrize("field", SERVICE_FIELDS)
def test_overview_table_cannot_be_forged_through_service_fields(field: str) -> None:
    report = format_scan_results(scan_with_service_field(field, "\n"))
    assert not has_forged_line(report)


@pytest.mark.parametrize("field", SERVICE_FIELDS)
def test_final_report_cannot_be_forged_through_service_fields(field: str) -> None:
    report = format_final_report(scan_with_service_field(field, "\n"))
    assert not has_forged_line(report)


def test_ordinary_banner_text_is_unchanged() -> None:
    service = Service(
        host="192.0.2.10",
        port=22,
        protocol="tcp",
        name="ssh",
        version="OpenSSH 9.6p1 Ubuntu 3ubuntu13.18",
        extra_info="Ubuntu Linux; protocol 2.0",
    )
    scan = ScanResult(target="192.0.2.10", scan_id="test-001", services=[service])
    report = format_services(scan)
    assert "  Version     : OpenSSH 9.6p1 Ubuntu 3ubuntu13.18" in report
    assert "  Extra info  : Ubuntu Linux; protocol 2.0" in report
