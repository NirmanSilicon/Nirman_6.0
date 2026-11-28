"""Text formatters for GhostSight reports.

Each function takes data and returns a string. They do not write
files, which keeps them easy to test and easy to reuse.
"""

from ghostsight.reporting.models import FindingStatus, ScanResult, Service

LINE_WIDTH = 78
SEPARATOR = "=" * LINE_WIDTH
THIN_SEPARATOR = "-" * LINE_WIDTH

UNKNOWN_VALUES = ("unknown", "", "n/a", "not detected")
CPE_CONTINUATION = " " * 16


def _single_line(value: str) -> str:
    """Collapse all whitespace, including line breaks, into single spaces.

    Text from a scanned host must never be able to start a new report line.
    """
    return " ".join(value.split())


def _clean(value: str) -> str:
    """Return a readable placeholder for missing values, on a single line."""
    if value is None:
        return "Not available"
    if value.strip().lower() in UNKNOWN_VALUES:
        return "Not detected"
    return _single_line(value)


def _confidence_text(confidence: float) -> str:
    """Show a confidence as a percentage, or "not rated" for exactly 0.0.

    0.0 means nobody rated the finding. Printing "0%" would wrongly read
    as "almost certainly not real".
    """
    if confidence == 0.0:
        return "not rated"
    return f"{confidence:.0%}"


def _authorisation_label(scan: ScanResult) -> str:
    """Return how authorisation is shown in the report header.

    GhostSight only says "Yes" when the scan data records it, and even
    then it says what that means: the target is inside the user's own
    scope file. Anything else is shown as not confirmed.
    """
    if scan.authorised:
        return "Yes (inside your scope file)"
    return "Not confirmed"


def _not_analysed(scan: ScanResult) -> bool:
    """Return True when no analysis ran and there is nothing to show.

    An empty findings list then means "nobody looked", not "nothing found".
    """
    return not scan.analysis_performed and not scan.findings


def _header(title: str, scan: ScanResult) -> list[str]:
    """Return the common header block shared by every report."""
    return [
        SEPARATOR,
        f"  {title.upper()}",
        SEPARATOR,
        f"Target      : {_clean(scan.target)}",
        f"Reference   : {_clean(scan.scan_id)}",
        f"Profile     : {_clean(scan.profile)}",
        f"Started     : {_clean(scan.started_at)}",
        f"Finished    : {_clean(scan.finished_at)}",
        f"Duration    : {scan.duration_seconds:.2f} seconds",
        f"Scanner     : {_clean(scan.scanner)}",
        f"Authorised  : {_authorisation_label(scan)}",
        SEPARATOR,
        "",
    ]


def format_scan_results(scan: ScanResult) -> str:
    """Render the summary of ports and services discovered."""
    lines = _header("Scan Results", scan)
    lines.append("DISCOVERED SERVICES")
    lines.append(THIN_SEPARATOR)

    if not scan.services:
        lines.append("No services were recorded for this scan.")
    else:
        lines.append(f"{'PORT':<8}{'PROTO':<8}{'STATE':<10}{'SERVICE':<24}VERSION")
        for service in scan.services:
            protocol = _single_line(service.protocol)
            state = _single_line(service.state)
            name = _single_line(service.name)
            lines.append(
                f"{service.port:<8}{protocol:<8}{state:<10}"
                f"{name:<24}{_clean(service.version)}"
            )

    lines.append("")
    lines.append("NOTES")
    lines.append(THIN_SEPARATOR)
    if scan.notes:
        lines.extend(f"- {note}" for note in scan.notes)
    else:
        lines.append("No additional notes.")
    lines.append("")
    return "\n".join(lines)


def _cpe_lines(service: Service) -> list[str]:
    """Return the CPE lines of one service, one name per line.

    Whitespace is collapsed so that a name can never start a new report line.
    """
    names = [_clean(name) for name in service.cpe]
    if not names:
        return ["  CPE         : Not detected"]
    lines = [f"  CPE         : {names[0]}"]
    lines.extend(f"{CPE_CONTINUATION}{name}" for name in names[1:])
    return lines


def format_services(scan: ScanResult) -> str:
    """Render detailed information about each detected service."""
    lines = _header("Detected Services", scan)
    if not scan.services:
        lines.append("No services were detected during this scan.")
        lines.append("")
        return "\n".join(lines)

    for index, service in enumerate(scan.services, start=1):
        lines.append(f"SERVICE {index}")
        lines.append(THIN_SEPARATOR)
        lines.append(f"  Host        : {_clean(service.host)}")
        lines.append(f"  Port        : {service.port}")
        lines.append(f"  Protocol    : {_clean(service.protocol)}")
        lines.append(f"  State       : {_clean(service.state)}")
        lines.append(f"  Name        : {_clean(service.name)}")
        lines.append(f"  Version     : {_clean(service.version)}")
        lines.append(f"  Extra info  : {_clean(service.extra_info)}")
        lines.extend(_cpe_lines(service))
        lines.append("")
    return "\n".join(lines)


def format_vulnerabilities(scan: ScanResult) -> str:
    """Render findings with their confidence, status and evidence."""
    lines = _header("Vulnerability Intelligence", scan)
    if not scan.findings:
        if _not_analysed(scan):
            lines.append("Vulnerability analysis has not been run for this scan.")
            lines.append(
                "No findings were assessed. This is not the same as finding nothing."
            )
        else:
            lines.append("No findings were recorded for this scan.")
        lines.append("")
        return "\n".join(lines)

    for index, finding in enumerate(scan.findings, start=1):
        lines.append(f"FINDING {index}")
        lines.append(THIN_SEPARATOR)
        lines.append(f"  Title        : {finding.title}")
        lines.append(f"  Status       : {finding.status.label}")
        lines.append(f"  Severity     : {_clean(finding.severity)}")
        lines.append(f"  Confidence   : {_confidence_text(finding.confidence)}")
        if finding.cvss_score is not None:
            lines.append(f"  CVSS score   : {finding.cvss_score:.1f}")
        if finding.cve_ids:
            lines.append(f"  CVE IDs      : {', '.join(finding.cve_ids)}")
        if finding.affected_service:
            lines.append(f"  Service      : {_clean(finding.affected_service)}")
        lines.append(f"  Description  : {_clean(finding.description)}")

        lines.append("  Evidence:")
        if finding.evidence:
            lines.extend(f"    - {item}" for item in finding.evidence)
        else:
            lines.append("    - No evidence recorded.")

        lines.append(f"  Remediation  : {_clean(finding.remediation)}")
        lines.append("")

    lines.append(THIN_SEPARATOR)
    lines.append(
        "A finding is not proof of a vulnerability. Confirm each item "
        "before acting."
    )
    lines.append("")
    return "\n".join(lines)


def format_ai_analysis(scan: ScanResult) -> str:
    """Render the AI interpretation section."""
    lines = _header("AI Analysis", scan)
    if scan.ai_analysis.strip():
        lines.append(scan.ai_analysis.strip())
    else:
        lines.append("AI analysis is not available for this scan.")
        lines.append("Run ghostsight explain with --save to add an AI explanation.")
    lines.append("")
    return "\n".join(lines)


RESULTS_EXPLANATION = (
    "Each check above sent real network traffic to the target.",
    "A check result is only what the Metasploit module reported.",
    "The only way a finding becomes validated is a check result of vulnerable.",
    "A check result of appears vulnerable makes a finding likely, not validated.",
    "A check result of not vulnerable does not prove the target is secure.",
    "Findings that could not be checked are not listed here.",
)
LAB_ONLY_SENTENCE = (
    "Validation is restricted to explicitly authorised, isolated "
    "lab environments."
)


def _validation_note(note: str) -> str:
    """Return one note on a single line, with control characters removed."""
    visible = "".join(char for char in note if char.isprintable() or char.isspace())
    return _single_line(visible)


def format_validation(scan: ScanResult) -> str:
    """Render the validation section."""
    lines = _header("Validation", scan)
    if scan.validation_notes:
        for note in scan.validation_notes:
            lines.append(f"- {_validation_note(note)}")
        lines.append("")
        lines.append("ABOUT THESE RESULTS")
        lines.append(THIN_SEPARATOR)
        for sentence in RESULTS_EXPLANATION:
            lines.append(f"  - {sentence}")
        lines.append("")
    else:
        lines.append("No validation activity was recorded for this scan.")
    lines.append(LAB_ONLY_SENTENCE)
    lines.append("")
    return "\n".join(lines)


def _authorisation_limitation(scan: ScanResult) -> str:
    """Return the limitations line that describes authorisation."""
    if scan.authorised:
        return (
            "  - The scan data records this target as authorised, meaning it "
            "is inside your own scope file. That file is your own list, not "
            "proof of legal permission, so make sure you have that permission."
        )
    return (
        "  - Authorisation was NOT confirmed for this scan. Do not rely on "
        "this report as the result of an approved assessment."
    )


def format_final_report(scan: ScanResult) -> str:
    """Render the final human-readable summary report."""
    lines = _header("GhostSight Security Assessment Report", scan)

    validated = sum(
        1 for finding in scan.findings if finding.status is FindingStatus.VALIDATED
    )
    if _not_analysed(scan):
        findings_text = "Not analysed yet"
        validated_text = "Not validated yet"
    else:
        findings_text = str(len(scan.findings))
        validated_text = str(validated)

    lines.append("SUMMARY")
    lines.append(THIN_SEPARATOR)
    lines.append(f"  Target            : {_clean(scan.target)}")
    lines.append(f"  Services found    : {len(scan.services)}")
    lines.append(f"  Findings recorded : {findings_text}")
    lines.append(f"  Validated issues  : {validated_text}")
    lines.append("")

    if scan.notes:
        lines.append("NOTES")
        lines.append(THIN_SEPARATOR)
        lines.extend(f"  - {note}" for note in scan.notes)
        lines.append("")

    lines.append("WHAT WAS FOUND")
    lines.append(THIN_SEPARATOR)
    if scan.services:
        for service in scan.services:
            version = _clean(service.version)
            lines.append(
                f"  Port {service.port}/{_single_line(service.protocol)} - "
                f"{_single_line(service.name)} ({version})"
            )
    else:
        lines.append("  No services were detected during this scan.")
    lines.append("")

    lines.append("WHAT NEEDS ATTENTION")
    lines.append(THIN_SEPARATOR)
    actionable = [
        finding
        for finding in scan.findings
        if finding.status is not FindingStatus.FALSE_POSITIVE
    ]
    if actionable:
        for finding in actionable:
            lines.append(
                f"  [{_clean(finding.severity)}] {finding.title} "
                f"({finding.status.label}, confidence {_confidence_text(finding.confidence)})"
            )
    elif _not_analysed(scan):
        lines.append("  Not assessed yet. No vulnerability analysis has been run,")
        lines.append("  so this report cannot say whether anything needs attention.")
    else:
        lines.append("  No actionable findings were recorded.")
    lines.append("")

    lines.append("RECOMMENDED NEXT STEPS")
    lines.append(THIN_SEPARATOR)
    if actionable:
        for finding in actionable:
            if finding.remediation.strip():
                lines.append(f"  - {finding.remediation.strip()}")
        if not any(finding.remediation.strip() for finding in actionable):
            lines.append("  - Review the findings and confirm them before acting.")
    elif _not_analysed(scan):
        lines.append(
            "  - Review the listed services yourself. Vulnerability analysis "
            "is not available yet."
        )
        lines.append("  - Re-scan after any configuration changes.")
    else:
        lines.append(
            "  - Continue monitoring and re-scan after any configuration changes."
        )
    lines.append("")

    lines.append("LIMITATIONS AND UNCERTAINTY")
    lines.append(THIN_SEPARATOR)
    lines.append(
        "  - Detection is limited to the ports and services that were probed."
    )
    lines.append(
        "  - A service version match is a starting point, not proof of a "
        "vulnerability."
    )
    lines.append(
        "  - Findings marked as potential or likely have not been validated."
    )
    if _not_analysed(scan):
        lines.append(
            "  - Vulnerability analysis has not been run, so an empty list "
            "of findings does not mean the target is secure."
        )
    lines.append(_authorisation_limitation(scan))
    lines.append("")
    lines.append(SEPARATOR)
    lines.append("  END OF REPORT")
    lines.append(SEPARATOR)
    lines.append("")
    return "\n".join(lines)
