"""Tests for `ghostsight explain`. Ollama is faked: no network, no model."""

import json
from pathlib import Path

import pytest
from typer.testing import CliRunner

from ghostsight.intelligence.ai_explanation import AiExplanation, AiOutputError
from ghostsight.intelligence.ai_text import LABEL
from ghostsight.intelligence.ollama_client import OllamaError
from ghostsight.main import app
from ghostsight.reporting.generator import generate_scan_reports
from ghostsight.reporting.models import Finding, FindingStatus, ScanResult, Service
from ghostsight.reporting.scan_finder import SCAN_DATA_FILE, find_scan_dir

runner = CliRunner()

GOOD = AiExplanation(
    summary="Port 22 is open and worth checking.",
    next_steps=["Check for updates."],
)
DEMO_SCANNER = "none (demonstration data)"


class FakeAi:
    """Stands in for generate_explanation and records its calls."""

    def __init__(self, error: Exception | None = None) -> None:
        self.error = error
        self.calls: list[tuple[str, str]] = []

    def __call__(self, prompt: str, model: str) -> AiExplanation:
        self.calls.append((prompt, model))
        if self.error is not None:
            raise self.error
        return GOOD


def install(monkeypatch: pytest.MonkeyPatch, error: Exception | None = None) -> FakeAi:
    fake = FakeAi(error)
    monkeypatch.setattr("ghostsight.main.generate_explanation", fake)
    return fake


def store_scan(**changes: object) -> Path:
    """Write a real scan folder in the throwaway home and return it."""
    fields: dict[str, object] = {
        "target": "192.0.2.10",
        "scan_id": "scan_x",
        "scanner": "nmap",
        "services": [
            Service(
                host="192.0.2.10",
                port=22,
                protocol="tcp",
                name="ssh",
                product="OpenSSH",
                product_version="9.6p1",
            )
        ],
        "findings": [
            Finding(
                title="CVE-2024-6387: openbsd:openssh 9.6p1 may be affected",
                status=FindingStatus.POTENTIAL,
            )
        ],
        "notes": ["A note."],
        "analysis_performed": True,
    }
    fields.update(changes)
    generate_scan_reports(ScanResult(**fields))  # type: ignore[arg-type]
    return find_scan_dir(None)


def snapshot(directory: Path) -> dict[str, bytes]:
    return {path.name: path.read_bytes() for path in sorted(directory.iterdir())}


def stored_data(directory: Path) -> dict:
    return json.loads((directory / SCAN_DATA_FILE).read_text(encoding="utf-8"))


def test_preview_shows_the_text_and_changes_nothing(
    monkeypatch: pytest.MonkeyPatch,
) -> None:
    directory = store_scan()
    before = snapshot(directory)
    fake = install(monkeypatch)
    result = runner.invoke(app, ["explain"])
    assert result.exit_code == 0
    assert LABEL in result.output
    assert GOOD.summary in result.output
    assert "1. Check for updates." in result.output
    assert len(fake.calls) == 1
    assert snapshot(directory) == before


def test_ai_gets_the_prompt_and_the_model(monkeypatch: pytest.MonkeyPatch) -> None:
    store_scan()
    fake = install(monkeypatch)
    runner.invoke(app, ["explain"])
    prompt, model = fake.calls[0]
    assert model == "qwen3:4b"
    assert "BEGIN SCAN DATA" in prompt
    assert "OpenSSH" in prompt


def test_user_is_told_it_may_take_minutes(monkeypatch: pytest.MonkeyPatch) -> None:
    store_scan()
    install(monkeypatch)
    result = runner.invoke(app, ["explain"])
    assert "may take a few minutes" in result.output


def test_save_stores_the_text_in_data_and_report(
    monkeypatch: pytest.MonkeyPatch,
) -> None:
    directory = store_scan()
    install(monkeypatch)
    result = runner.invoke(app, ["explain", "--save"])
    assert result.exit_code == 0
    assert "Saved" in result.output
    assert LABEL in stored_data(directory)["ai_analysis"]
    assert LABEL in (directory / "ai_analysis.txt").read_text(encoding="utf-8")


def test_save_leaves_findings_and_services_alone(
    monkeypatch: pytest.MonkeyPatch,
) -> None:
    directory = store_scan()
    before = stored_data(directory)
    install(monkeypatch)
    result = runner.invoke(app, ["explain", "--save"])
    assert result.exit_code == 0
    after = stored_data(directory)
    for key in ("target", "scan_id", "findings", "services", "notes", "analysis_performed"):
        assert after[key] == before[key]


def test_save_replaces_older_ai_text(monkeypatch: pytest.MonkeyPatch) -> None:
    directory = store_scan(ai_analysis="old text")
    install(monkeypatch)
    runner.invoke(app, ["explain", "--save"])
    text = stored_data(directory)["ai_analysis"]
    assert "old text" not in text
    assert LABEL in text


@pytest.mark.parametrize("save", [False, True])
@pytest.mark.parametrize(
    "error",
    [OllamaError("Fixed message one."), AiOutputError("Fixed message two.")],
)
def test_ai_failure_exits_4_and_writes_nothing(
    monkeypatch: pytest.MonkeyPatch, error: Exception, save: bool
) -> None:
    directory = store_scan()
    before = snapshot(directory)
    install(monkeypatch, error=error)
    args = ["explain", "--save"] if save else ["explain"]
    result = runner.invoke(app, args)
    assert result.exit_code == 4
    assert "Cannot explain" in result.output
    assert str(error) in result.output
    assert snapshot(directory) == before


@pytest.mark.parametrize(
    "args", [[], ["--scan", "../etc"], ["--scan", "scan_999"]]
)
def test_missing_or_bad_scan_exits_2_without_calling_the_ai(
    monkeypatch: pytest.MonkeyPatch, args: list[str]
) -> None:
    fake = install(monkeypatch)
    result = runner.invoke(app, ["explain", *args])
    assert result.exit_code == 2
    assert "Cannot explain" in result.output
    assert fake.calls == []


@pytest.mark.parametrize("save", [False, True])
def test_demo_scan_is_refused_before_the_ai_call(
    monkeypatch: pytest.MonkeyPatch, save: bool
) -> None:
    directory = store_scan(scanner=DEMO_SCANNER)
    before = snapshot(directory)
    fake = install(monkeypatch)
    args = ["explain", "--save"] if save else ["explain"]
    result = runner.invoke(app, args)
    assert result.exit_code == 2
    assert "demonstration data" in result.output
    assert fake.calls == []
    assert snapshot(directory) == before


def test_unreadable_scan_file_exits_4_without_calling_the_ai(
    monkeypatch: pytest.MonkeyPatch,
) -> None:
    directory = store_scan()
    (directory / SCAN_DATA_FILE).write_text("not json", encoding="utf-8")
    fake = install(monkeypatch)
    result = runner.invoke(app, ["explain"])
    assert result.exit_code == 4
    assert "Cannot explain" in result.output
    assert fake.calls == []


def test_disk_failure_on_save_gives_a_fixed_message(
    monkeypatch: pytest.MonkeyPatch,
) -> None:
    store_scan()
    install(monkeypatch)

    def broken(*args: object, **kwargs: object) -> None:
        raise OSError("secret-path")

    monkeypatch.setattr("ghostsight.main.generate_scan_reports", broken)
    result = runner.invoke(app, ["explain", "--save"])
    assert result.exit_code == 4
    assert "could not be written" in result.output
    assert "secret-path" not in result.output
