"""Plain facts about a scan, counted by code. No AI is involved.

Pure module: no files, no network. The `explain` command shows this
block above the AI text, so a wrong number in the AI text sits next to
the correct one.

Severity text comes from a file that may have been edited, so it is
printed only when it is one of the known words.
"""

from collections import Counter

from ghostsight.reporting.models import Finding, FindingStatus, ScanResult

HEADING = "Facts from the scan (computed by GhostSight, not AI):"
KNOWN_SEVERITIES = ("low", "medium", "high", "critical")


def _status_totals(findings: list[Finding]) -> str:
    """Count every finding by status."""
    counts = Counter(finding.status for finding in findings)
    parts = [
        f"{status.label} {counts[status]}"
        for status in FindingStatus
        if counts[status]
    ]
    return ", ".join(parts) or "none"


def _highest_score(findings: list[Finding]) -> str:
    """Return the highest score with its own severity word, or "none"."""
    scored = [
        finding
        for finding in findings
        if isinstance(finding.cvss_score, (int, float))
        and not isinstance(finding.cvss_score, bool)
    ]
    if not scored:
        return "none"
    best = max(scored, key=lambda finding: finding.cvss_score)
    text = f"{best.cvss_score:.1f}"
    severity = str(best.severity).lower()
    if severity in KNOWN_SEVERITIES:
        text += f" ({severity})"
    return text


def _unchecked_records(findings: list[Finding]) -> int:
    """Count the CVE records listed on unknown findings."""
    return sum(
        len(finding.cve_ids)
        for finding in findings
        if finding.status == FindingStatus.UNKNOWN
    )


def format_facts(scan: ScanResult) -> str:
    """Return the facts block as text, one fact per line."""
    analysis = "done" if scan.analysis_performed else "not done"
    lines = [
        HEADING,
        f"  Services found: {len(scan.services)}",
        f"  Vulnerability analysis: {analysis}",
        f"  Findings by status: {_status_totals(scan.findings)}",
        f"  Highest score: {_highest_score(scan.findings)}",
        "  CVE records that could not be checked: "
        f"{_unchecked_records(scan.findings)}",
    ]
    return "\n".join(lines)
