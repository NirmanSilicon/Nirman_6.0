"""Tests for how a finding's confidence is shown in the reports.

A confidence of exactly 0.0 means "not rated": nobody measured how likely
the finding is. Printing it as "0%" would wrongly read as "almost
certainly not real". Any other value is printed as a percentage.
"""

import pytest

from ghostsight.reporting.formatters import (
    format_final_report,
    format_vulnerabilities,
)
from ghostsight.reporting.models import Finding, FindingStatus, ScanResult


def scan_with(confidence: float) -> ScanResult:
    finding = Finding(
        title="Example finding",
        severity="low",
        confidence=confidence,
        status=FindingStatus.POTENTIAL,
    )
    return ScanResult(
        target="127.0.0.1",
        scan_id="t-1",
        findings=[finding],
        analysis_performed=True,
    )


# --- the vulnerabilities section -------------------------------------------


def test_vulnerabilities_unrated_says_not_rated() -> None:
    text = format_vulnerabilities(scan_with(0.0))
    assert "Confidence   : not rated" in text


def test_vulnerabilities_unrated_never_prints_zero_percent() -> None:
    text = format_vulnerabilities(scan_with(0.0))
    assert "Confidence   : 0%" not in text


@pytest.mark.parametrize(
    "confidence, shown", [(0.85, "85%"), (0.5, "50%"), (1.0, "100%")]
)
def test_vulnerabilities_rated_prints_a_percentage(
    confidence: float, shown: str
) -> None:
    text = format_vulnerabilities(scan_with(confidence))
    assert f"Confidence   : {shown}" in text


# --- the final report summary ----------------------------------------------


def test_final_report_unrated_says_not_rated() -> None:
    text = format_final_report(scan_with(0.0))
    assert "confidence not rated" in text


def test_final_report_unrated_never_prints_zero_percent() -> None:
    text = format_final_report(scan_with(0.0))
    assert "confidence 0%" not in text
    assert "0% confidence" not in text


@pytest.mark.parametrize(
    "confidence, shown", [(0.85, "85%"), (0.5, "50%"), (1.0, "100%")]
)
def test_final_report_rated_prints_a_percentage(
    confidence: float, shown: str
) -> None:
    text = format_final_report(scan_with(confidence))
    assert f"confidence {shown}" in text
