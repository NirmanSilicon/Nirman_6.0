"""Put AI text into a copy of a scan.

Pure: no files, no network. Only `ai_analysis` changes. Findings,
notes, statuses, scores and confidence are never touched.
"""

import dataclasses

from ghostsight.intelligence.analysis_apply import SaveRefusedError, is_demo_scan
from ghostsight.reporting.models import ScanResult

DEMO_MESSAGE = (
    "this is demonstration data, not a real scan, so no AI text is stored."
)
EMPTY_MESSAGE = "there is no AI text to store."


def apply_ai_text(scan: ScanResult, text: str) -> ScanResult:
    """Return a copy of `scan` with `ai_analysis` set to `text`."""
    if is_demo_scan(scan):
        raise SaveRefusedError(DEMO_MESSAGE)
    if not isinstance(text, str) or not text.strip():
        raise SaveRefusedError(EMPTY_MESSAGE)
    return dataclasses.replace(scan, ai_analysis=text)
