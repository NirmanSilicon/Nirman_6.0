"""Run a scan for an approved target and package the results for reporting.

The only thing that marks a scan as authorised is the scope decision passed
in here. There is no flag or argument that can override it.
"""

import logging
from datetime import datetime, timezone

from ghostsight.integrations.nmap_executor import run_nmap
from ghostsight.integrations.nmap_parser import ParsedScan
from ghostsight.integrations.nmap_runner import (
    DEFAULT_PROFILE,
    ScanProfile,
    build_nmap_command,
)
from ghostsight.reporting.models import ScanResult
from ghostsight.reporting.notes import NOT_ANALYSED_NOTE
from ghostsight.security.scope_manager import ScopeDecision

logger = logging.getLogger(__name__)

SKIPPED_DISCOVERY_NOTE = (
    "Host discovery was skipped at your request (Nmap option -Pn), so Nmap "
    "tried the ports without first checking that the host was up. This "
    "does not hide the scan from anyone watching."
)


def _approved_target(decision: ScopeDecision) -> str:
    """Return the normalised target, or refuse if the scope did not approve it."""
    if not decision.allowed or decision.normalised is None:
        raise ValueError(
            "Refusing to scan: the target was not approved by the scope manager."
        )
    return decision.normalised


def describe_port_coverage(target: str, profile: ScanProfile) -> str:
    """Describe which ports a profile checks, read from the real command."""
    command = build_nmap_command(target, profile)
    if "--top-ports" in command:
        count = command[command.index("--top-ports") + 1]
        return f"the {count} most common TCP ports"
    if "-p-" in command:
        return "all 65535 TCP ports"
    return "an unknown set of ports"


def build_notes(
    profile: ScanProfile,
    coverage: str,
    parsed: ParsedScan,
    skip_discovery: bool = False,
) -> list[str]:
    """Write plain-language notes that stop the report from overclaiming."""
    notes = [
        f"Profile {profile.value}: checked {coverage}. "
        "Ports outside this set were not checked.",
        "Only open TCP ports are listed. Names and versions are what the "
        "target reported and may be wrong or hidden.",
        NOT_ANALYSED_NOTE,
    ]
    if not parsed.completed:
        notes.append(
            "WARNING: Nmap did not report a clean finish, "
            "so these results may be incomplete."
        )
    if skip_discovery:
        notes.append(SKIPPED_DISCOVERY_NOTE)
        if not parsed.services:
            notes.append(
                "No open services were found in the checked ports. "
                "Host discovery was skipped, so this does not show that the "
                "host was online, and it does not show that it is secure."
            )
        return notes
    if parsed.hosts_up == 0:
        notes.append(
            "No host answered as up. The target may be offline or blocking "
            "probes, so this result does not show that it is secure."
        )
    elif not parsed.services:
        notes.append(
            "The host answered, but no open services were found "
            "in the checked ports."
        )
    return notes


def build_scan_result(
    decision: ScopeDecision,
    profile: ScanProfile,
    parsed: ParsedScan,
    started: datetime,
    finished: datetime,
    skip_discovery: bool = False,
) -> ScanResult:
    """Turn parsed Nmap output into a ScanResult for the report generator."""
    target = _approved_target(decision)
    coverage = describe_port_coverage(target, profile)
    nmap_version = parsed.nmap_version or "unknown version"
    return ScanResult(
        target=target,
        scan_id=f"scan-{started:%Y%m%d-%H%M%S}",
        profile=profile.value,
        started_at=started.isoformat(),
        finished_at=finished.isoformat(),
        duration_seconds=round((finished - started).total_seconds(), 2),
        scanner=f"nmap {nmap_version}",
        authorised=decision.allowed,
        notes=build_notes(profile, coverage, parsed, skip_discovery),
        services=list(parsed.services),
        findings=[],
        ai_analysis="",
        validation_notes=[],
    )


def perform_scan(
    decision: ScopeDecision,
    profile: ScanProfile = DEFAULT_PROFILE,
    skip_discovery: bool = False,
) -> ScanResult:
    """Scan a target the scope manager approved and return the result.

    Raises ValueError if the decision is not an approval, before anything
    is run. Raises NmapRunError if the scan fails.
    """
    target = _approved_target(decision)
    started = datetime.now(timezone.utc)
    logger.info("Starting scan: target=%r profile=%s", target, profile.value)
    if skip_discovery:
        parsed = run_nmap(target, profile, skip_discovery=True)
    else:
        parsed = run_nmap(target, profile)
    finished = datetime.now(timezone.utc)
    logger.info("Scan finished: target=%r services=%d", target, len(parsed.services))
    return build_scan_result(
        decision, profile, parsed, started, finished, skip_discovery
    )
