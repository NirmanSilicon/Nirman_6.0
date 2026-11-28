"""Put the result of a vulnerability analysis into a copy of a scan.

Pure module: no files, no network. The caller decides whether to write
the returned scan to disk.

Rules:
- The scan passed in is never changed. A new scan is returned.
- Demonstration scans are refused. Their data is not real.
- An analysis in which no service was really checked is refused.
  "Analysed, 0 findings" would be false if nothing was checked.
- Earlier findings are replaced, not merged. Running the analysis
  again gives the same result as running it once.
- Saving an analysis clears the AI explanation text. It was written
  for the old findings and would no longer match the new ones.
- Notes written by an analysis start with NOTE_PREFIX. On the next
  save, notes with that prefix are dropped and rebuilt. This is a
  convention: a scan's own note that happens to start with the prefix
  would also be dropped.
- The scan's own "No vulnerability analysis has been done yet" note
  is dropped too, because an analysis has now been done.
- A scan that already has validation notes is refused. Saving would
  replace every finding and erase the validation results. A new scan
  is needed to analyse again.
"""

from dataclasses import replace

from ghostsight.intelligence.analysis import Analysis
from ghostsight.reporting.models import ScanResult
from ghostsight.reporting.notes import NOT_ANALYSED_NOTE

NOTE_PREFIX = "Vulnerability analysis: "

DEMO_SCANNER_PREFIX = "none"


class SaveRefusedError(Exception):
    """Raised when an analysis must not be saved into a scan."""


def is_demo_scan(scan: ScanResult) -> bool:
    """True for demonstration data (scanner text starts with 'none')."""
    return scan.scanner.startswith(DEMO_SCANNER_PREFIX)


def apply_analysis(scan: ScanResult, analysis: Analysis) -> ScanResult:
    """Return a new scan holding the analysis findings and notes."""
    if is_demo_scan(scan):
        raise SaveRefusedError(
            "This is a demonstration scan, so analysis results "
            "are not saved into it."
        )
    if scan.validation_notes:
        raise SaveRefusedError(
            "This scan has validation results, and analysing it "
            "again would erase them. Run a new scan to analyse again."
        )
    if analysis.services_checked < 1:
        raise SaveRefusedError(
            "The analysis did not check any service, "
            "so there is nothing to save."
        )

    kept_notes = [
        note for note in scan.notes if not note.startswith(NOTE_PREFIX)
    ]
    new_notes = [NOTE_PREFIX + note for note in analysis.notes]

    return replace(
        scan,
        findings=list(analysis.findings),
        notes=[
            note for note in kept_notes if note != NOT_ANALYSED_NOTE
        ] + new_notes,
        analysis_performed=True,
        ai_analysis="",
    )
