"""Tests for the Nmap executor. Nmap itself is never started here."""

import subprocess

import pytest

from ghostsight.integrations import nmap_executor
from ghostsight.integrations.nmap_executor import (
    PROFILE_TIMEOUT_SECONDS,
    NmapRunError,
    run_nmap,
)
from ghostsight.integrations.nmap_runner import ScanProfile, build_nmap_command

NMAP_PATH = "/usr/bin/nmap"

SAMPLE_XML = """<?xml version="1.0"?>
<nmaprun scanner="nmap" version="7.94SVN">
<host>
<status state="up" reason="syn-ack"/>
<address addr="127.0.0.1" addrtype="ipv4"/>
<ports>
<port protocol="tcp" portid="22">
<state state="open" reason="syn-ack"/>
<service name="ssh" product="OpenSSH" version="9.6p1" method="probed"/>
</port>
</ports>
</host>
<runstats>
<finished time="1" elapsed="1.50" exit="success"/>
<hosts up="1" down="0" total="1"/>
</runstats>
</nmaprun>
"""


class FakeRun:
    """Stands in for subprocess.run and records how it was called."""

    def __init__(
        self,
        stdout: str = SAMPLE_XML,
        stderr: str = "",
        returncode: int = 0,
        error: Exception | None = None,
    ) -> None:
        self.stdout = stdout
        self.stderr = stderr
        self.returncode = returncode
        self.error = error
        self.calls: list[tuple[list[str], dict]] = []

    def __call__(self, command: list[str], **kwargs) -> subprocess.CompletedProcess:
        self.calls.append((command, kwargs))
        if self.error is not None:
            raise self.error
        return subprocess.CompletedProcess(
            command, self.returncode, self.stdout, self.stderr
        )


@pytest.fixture(autouse=True)
def nmap_is_installed(monkeypatch: pytest.MonkeyPatch) -> None:
    monkeypatch.setattr(nmap_executor.shutil, "which", lambda name: NMAP_PATH)


def install_fake(monkeypatch: pytest.MonkeyPatch, fake: FakeRun) -> FakeRun:
    monkeypatch.setattr(nmap_executor.subprocess, "run", fake)
    return fake


def test_missing_nmap_is_reported(monkeypatch: pytest.MonkeyPatch) -> None:
    fake = install_fake(monkeypatch, FakeRun())
    monkeypatch.setattr(nmap_executor.shutil, "which", lambda name: None)
    with pytest.raises(NmapRunError, match="not found"):
        run_nmap("127.0.0.1")
    assert fake.calls == []


def test_runs_built_command_as_list_without_shell(
    monkeypatch: pytest.MonkeyPatch,
) -> None:
    fake = install_fake(monkeypatch, FakeRun())
    run_nmap("127.0.0.1", ScanProfile.NORMAL)
    command, kwargs = fake.calls[0]
    assert command == build_nmap_command(
        "127.0.0.1", ScanProfile.NORMAL, executable=NMAP_PATH
    )
    assert isinstance(command, list)
    assert not kwargs.get("shell", False)


@pytest.mark.parametrize("profile", list(ScanProfile))
def test_timeout_and_stdin_are_set(
    monkeypatch: pytest.MonkeyPatch, profile: ScanProfile
) -> None:
    fake = install_fake(monkeypatch, FakeRun())
    run_nmap("127.0.0.1", profile)
    _, kwargs = fake.calls[0]
    assert kwargs["timeout"] == PROFILE_TIMEOUT_SECONDS[profile]
    assert kwargs["stdin"] == subprocess.DEVNULL


def test_returns_parsed_services(monkeypatch: pytest.MonkeyPatch) -> None:
    install_fake(monkeypatch, FakeRun())
    result = run_nmap("127.0.0.1")
    assert result.completed is True
    assert len(result.services) == 1
    service = result.services[0]
    assert service.port == 22
    assert service.name == "ssh"
    assert service.version == "OpenSSH 9.6p1"


def test_refuses_target_that_is_not_normalised(
    monkeypatch: pytest.MonkeyPatch,
) -> None:
    fake = install_fake(monkeypatch, FakeRun())
    with pytest.raises(NmapRunError, match="Refusing to scan"):
        run_nmap("localhost")
    assert fake.calls == []


def test_nonzero_exit_is_an_error(monkeypatch: pytest.MonkeyPatch) -> None:
    install_fake(monkeypatch, FakeRun(returncode=1, stderr="QUITTING!"))
    with pytest.raises(NmapRunError, match="code 1: QUITTING!"):
        run_nmap("127.0.0.1")


def test_timeout_is_an_error(monkeypatch: pytest.MonkeyPatch) -> None:
    error = subprocess.TimeoutExpired(cmd="nmap", timeout=1)
    install_fake(monkeypatch, FakeRun(error=error))
    with pytest.raises(NmapRunError, match="did not finish"):
        run_nmap("127.0.0.1")


def test_start_failure_is_an_error(monkeypatch: pytest.MonkeyPatch) -> None:
    install_fake(monkeypatch, FakeRun(error=PermissionError("denied")))
    with pytest.raises(NmapRunError, match="Could not start Nmap"):
        run_nmap("127.0.0.1")


def test_unreadable_output_is_an_error(monkeypatch: pytest.MonkeyPatch) -> None:
    install_fake(monkeypatch, FakeRun(stdout="this is not xml"))
    with pytest.raises(NmapRunError, match="could not be read"):
        run_nmap("127.0.0.1")


@pytest.mark.parametrize("profile", list(ScanProfile))
def test_timeout_is_longer_than_host_timeout(profile: ScanProfile) -> None:
    command = build_nmap_command("127.0.0.1", profile)
    value = command[command.index("--host-timeout") + 1]
    assert value.endswith("m")
    assert PROFILE_TIMEOUT_SECONDS[profile] > int(value[:-1]) * 60


def test_every_profile_has_a_timeout() -> None:
    assert set(PROFILE_TIMEOUT_SECONDS) == set(ScanProfile)
