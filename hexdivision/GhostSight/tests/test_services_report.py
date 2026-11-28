"""Tests for the CPE lines in the detailed services report."""

from ghostsight.reporting.formatters import format_services
from ghostsight.reporting.generator import generate_scan_reports
from ghostsight.reporting.models import ScanResult, Service

SSH_CPE = "cpe:/a:openbsd:openssh:9.6p1"
KERNEL_CPE = "cpe:/o:linux:linux_kernel"


def make_service(port: int, cpe: list[str]) -> Service:
    """Build a service. It never goes through the parser."""
    return Service(host="192.0.2.10", port=port, protocol="tcp", name="ssh", cpe=cpe)


def make_scan(*services: Service) -> ScanResult:
    """Build a scan holding the given services."""
    return ScanResult(target="192.0.2.10", scan_id="test-001", services=list(services))


def report_lines(*services: Service) -> list[str]:
    """Return the lines of the services report."""
    return format_services(make_scan(*services)).splitlines()


def test_single_cpe_is_shown_and_aligned_with_other_fields() -> None:
    lines = report_lines(make_service(22, [SSH_CPE]))
    cpe_line = f"  CPE         : {SSH_CPE}"
    assert cpe_line in lines
    host_line = next(line for line in lines if line.startswith("  Host"))
    assert host_line.index(":") == cpe_line.index(":")


def test_several_cpes_are_shown_one_per_line() -> None:
    lines = report_lines(make_service(22, [SSH_CPE, KERNEL_CPE]))
    first = lines.index(f"  CPE         : {SSH_CPE}")
    assert lines[first + 1] == " " * 16 + KERNEL_CPE


def test_service_without_cpe_shows_not_detected() -> None:
    lines = report_lines(make_service(22, []))
    assert "  CPE         : Not detected" in lines


def test_each_service_shows_its_own_cpe() -> None:
    lines = report_lines(make_service(22, [SSH_CPE]), make_service(80, []))
    assert lines.count(f"  CPE         : {SSH_CPE}") == 1
    assert lines.count("  CPE         : Not detected") == 1
    assert lines.index(f"  CPE         : {SSH_CPE}") < lines.index("SERVICE 2")


def test_cpe_text_cannot_forge_report_lines() -> None:
    hostile = ["cpe:/a:x\nAuthorised  : Yes\r\nForged line", "[bold]x[/bold]"]
    lines = report_lines(make_service(22, hostile))
    assert not any(line.startswith("Forged") for line in lines)
    assert lines.count("Authorised  : Not confirmed") == 1
    assert " " * 16 + "[bold]x[/bold]" in lines


def test_cpe_is_written_to_services_txt() -> None:
    paths = generate_scan_reports(make_scan(make_service(22, [SSH_CPE])))
    content = paths.services.read_text(encoding="utf-8")
    assert f"  CPE         : {SSH_CPE}" in content
