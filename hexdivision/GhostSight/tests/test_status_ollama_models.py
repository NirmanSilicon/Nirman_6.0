"""The Ollama status check is only OK when a model is installed."""

import io
import json

from ghostsight.system_check import CheckStatus, check_ollama_server


def fake_server(monkeypatch, reply: object) -> None:
    """Make the status check read `reply` instead of calling Ollama."""

    def fake_urlopen(url, timeout=None):
        return io.BytesIO(json.dumps(reply).encode())

    monkeypatch.setattr("urllib.request.urlopen", fake_urlopen)


def test_installed_model_is_ok(monkeypatch) -> None:
    fake_server(monkeypatch, {"models": [{"name": "qwen3:4b"}]})
    result = check_ollama_server()
    assert result.status is CheckStatus.OK
    assert "qwen3:4b" in result.detail


def test_no_models_is_not_ok(monkeypatch) -> None:
    fake_server(monkeypatch, {"models": []})
    result = check_ollama_server()
    assert result.status is CheckStatus.WARN


def test_no_models_says_how_to_install_one(monkeypatch) -> None:
    fake_server(monkeypatch, {"models": []})
    result = check_ollama_server()
    assert "ollama pull" in result.detail


def test_missing_model_list_is_not_ok(monkeypatch) -> None:
    fake_server(monkeypatch, {})
    result = check_ollama_server()
    assert result.status is CheckStatus.WARN
