"""Test that a policy refusal reads cleanly on screen."""

from typer.testing import CliRunner

from ghostsight import main as cli
from ghostsight.main import app
from ghostsight.security.scope_manager import default_scope_path

runner = CliRunner()


def test_policy_refusal_message_does_not_repeat_itself(monkeypatch) -> None:
    path = default_scope_path()
    path.parent.mkdir(parents=True, exist_ok=True)
    path.write_text('[scope]\nallowed = ["192.168.0.0/16"]\n', encoding="utf-8")
    monkeypatch.setattr(cli, "_start_scan", lambda *args, **kwargs: None)
    result = runner.invoke(app, ["scan", "--target", "192.168.0.0/21"])
    assert result.exit_code == 1
    assert result.output.lower().count("refused by policy") == 1
