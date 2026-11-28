"""The worst-case prompt, with notes, must still fit the character limit."""

from ghostsight.intelligence.ai_prompt import MAX_PROMPT_CHARS, build_prompt
from ghostsight.reporting.models import (
    Finding,
    FindingStatus,
    ScanResult,
    Service,
)


def test_worst_case_with_notes_fits_the_limit() -> None:
    huge = "A" * 100_000
    service = Service(
        host=huge,
        port=22,
        protocol=huge,
        name=huge,
        product=huge,
        product_version=huge,
    )
    finding = Finding(
        title=huge,
        severity=huge,
        cve_ids=[huge] * 100,
        status=FindingStatus.UNKNOWN,
        cvss_score=9.9,
    )
    scan = ScanResult(
        target=huge,
        scan_id="scan_001",
        services=[service] * 1000,
        findings=[finding] * 1000,
        notes=[huge] * 1000,
    )
    prompt = build_prompt(scan)
    assert "note 4:" in prompt
    assert "note 5:" not in prompt
    assert len(prompt) <= MAX_PROMPT_CHARS
