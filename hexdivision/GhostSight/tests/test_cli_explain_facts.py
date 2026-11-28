"""`explain` shows the facts block above the AI text and never saves it."""

import json

import pytest
from typer.testing import CliRunner

from ghostsight.intelligence.ai_explanation import AiExplanation
from ghostsight.intelligence.ai_text import LABEL
from ghostsight.intelligence.scan_facts import HEADING
from ghostsight.main import app
from ghostsight.reporting.generator import generate_scan_reports
from ghostsight.reporting.models import (
    Finding,
    FindingStatus,
    ScanResult,
    Service,
)
from ghostsight.reporting.scan_finder import SCAN_DATA_FILE, find_scan_dir

runner = CliRunner()

GOOD = AiExplanation(summary="Port 22 is open.", next_steps=["Check updates."])


def install_fake_ai(monkeypatch: pytest.MonkeyPatch) -> None:
    monkeypatch.setattr(
        "ghostsight.main.generate_explanation", lambda prompt, model: GOOD
    )


def store_scan() -> None:
    generate_scan_reports(
        ScanResult(
            target="192.0.2.10",
            scan_id="scan_x",
            scanner="nmap",
            services=[Service(host="192.0.2.10", port=22, protocol="tcp")],
            findings=[
                Finding(title="A finding", status=FindingStatus.POTENTIAL)
            ],
            analysis_performed=True,
        )
    )


def test_preview_shows_the_facts_above_the_ai_text(
    monkeypatch: pytest.MonkeyPatch,
) -> None:
    store_scan()
    install_fake_ai(monkeypatch)
    result = runner.invoke(app, ["explain"])
    assert result.exit_code == 0
    assert HEADING in result.output
    assert "Findings by status: Potential vulnerability 1" in result.output
    assert result.output.index(HEADING) < result.output.index(LABEL)


def test_the_facts_are_not_saved_with_the_ai_text(
    monkeypatch: pytest.MonkeyPatch,
) -> None:
    store_scan()
    install_fake_ai(monkeypatch)
    result = runner.invoke(app, ["explain", "--save"])
    assert result.exit_code == 0
    path = find_scan_dir(None) / SCAN_DATA_FILE
    saved = json.loads(path.read_text(encoding="utf-8"))["ai_analysis"]
    assert GOOD.summary in saved
    assert HEADING not in saved
