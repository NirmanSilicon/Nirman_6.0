"""The status table must not call Metasploit unused: validate uses it."""

import pytest

from ghostsight import system_check


def _only_found(monkeypatch: pytest.MonkeyPatch, found: set[str]) -> None:
    def fake_which(name: str) -> str | None:
        return f"/fake/{name}" if name in found else None

    monkeypatch.setattr(system_check.shutil, "which", fake_which)


@pytest.mark.parametrize(
    "found",
    [set(), {"msfconsole"}, {"msfconsole", "msfrpcd"}],
)
def test_the_purpose_does_not_say_unused(
    monkeypatch: pytest.MonkeyPatch, found: set[str]
) -> None:
    _only_found(monkeypatch, found)
    purpose = system_check.check_metasploit().purpose
    assert "not used" not in purpose.lower()
    assert "validation" in purpose.lower()
