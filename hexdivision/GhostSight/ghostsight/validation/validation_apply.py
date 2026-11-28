"""Record the results of check-only modules in a copy of a scan.

Pure module: no files, no network. The caller decides whether to write the
returned scan to disk.

Rules:
- The scan passed in is never changed. A new scan is returned.
- Demonstration scans are refused. Their data is not real.
- A scan that already has validation notes is refused. Those notes are the
  marker that a scan was validated, and they also stop a new analysis from
  erasing the results.
- An empty list of results, or a result for a finding that does not exist,
  is refused before anything is changed.
- Every result adds one evidence line to its finding and one validation note,
  even when the status does not change. The status comes from decide_status.
- A conflict (a validated finding that a check calls not vulnerable) keeps the
  status and is stated in the evidence line and in the note.
- Saving clears the AI explanation text, because it no longer matches the
  findings.
"""

from collections.abc import Sequence
from dataclasses import dataclass, replace

from ghostsight.intelligence.analysis_apply import SaveRefusedError, is_demo_scan
from ghostsight.reporting.models import Finding, ScanResult
from ghostsight.validation.status_rules import CheckOutcome, decide_status

CONFLICT_EVIDENCE = (
    "CONFLICT: this finding was already validated, so its status was kept. "
    "A person should look at it."
)
CONFLICT_NOTE = "Conflict: the finding was already validated, so its status was kept."


@dataclass(frozen=True)
class CheckResult:
    """What one check-only module said about one finding."""

    finding_index: int
    module: str
    outcome: CheckOutcome


def _refuse_bad_request(scan: ScanResult, results: Sequence[CheckResult]) -> None:
    if is_demo_scan(scan):
        raise SaveRefusedError(
            "This is a demonstration scan, so validation results "
            "are not saved into it."
        )
    if scan.validation_notes:
        raise SaveRefusedError(
            "This scan already has validation results, so it cannot "
            "be validated again."
        )
    if not results:
        raise SaveRefusedError("There are no check results to save.")
    for item in results:
        if not 0 <= item.finding_index < len(scan.findings):
            raise SaveRefusedError(
                f"Finding {item.finding_index} does not exist in this scan."
            )


def _apply_one(
    finding: Finding, target: str, item: CheckResult
) -> tuple[Finding, str]:
    """Return the updated finding and the note for one check result."""
    decision = decide_status(finding.status, item.outcome)
    line = (
        f"Metasploit check {item.module} on {target}: "
        f"result {item.outcome.value}. Status: {decision.status.value}."
    )
    note = (
        f"Checked {target}: {item.module} result {item.outcome.value}. "
        f"Finding {item.finding_index + 1}: status {decision.status.value}."
    )
    if decision.conflict:
        line = f"{line} {CONFLICT_EVIDENCE}"
        note = f"{note} {CONFLICT_NOTE}"
    updated = replace(
        finding,
        status=decision.status,
        cve_ids=list(finding.cve_ids),
        evidence=[*finding.evidence, line],
    )
    return updated, note


def apply_validation(scan: ScanResult, results: Sequence[CheckResult]) -> ScanResult:
    """Return a new scan holding the check results as evidence and notes."""
    _refuse_bad_request(scan, results)
    findings = list(scan.findings)
    notes: list[str] = []
    for item in results:
        findings[item.finding_index], note = _apply_one(
            findings[item.finding_index], scan.target, item
        )
        notes.append(note)
    return replace(
        scan,
        findings=findings,
        validation_notes=notes,
        ai_analysis="",
    )
