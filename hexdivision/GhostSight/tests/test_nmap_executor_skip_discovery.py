"""Tests that the executor passes skip_discovery on. Nmap is never started here."""

import subprocess

import pytest

from ghostsight.integrations import nmap_executor
from ghostsight.integrations.nmap_executor import NmapRunError, run_nmap
from ghostsight.integrations.nmap_runner import ScanProfile, build_nmap_command

NMAP_PATH = "/usr/bin/nmap"

SAMPLE_XML = """<?xml version="1.0"?>
<nmaprun scanner="nmap" version="7.94SVN">
<host>
<status state="up" reason="user-set"/>
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
    """Stands in for subprocess.run and records the commands it was given."""

    def __init__(self) -> None:
        self.commands: list[list[str]] = []

    def __call__(self, command: list[str], **kwargs) -> subprocess.CompletedProcess:
        self.commands.append(command)
        return subprocess.CompletedProcess(command, 0, SAMPLE_XML, "")


@pytest.fixture(autouse=True)
def nmap_is_installed(monkeypatch: pytest.MonkeyPatch) -> None:
    monkeypatch.setattr(nmap_executor.shutil, "which", lambda name: NMAP_PATH)


@pytest.fixture
def fake(monkeypatch: pytest.MonkeyPatch) -> FakeRun:
    recorder = FakeRun()
    monkeypatch.setattr(nmap_executor.subprocess, "run", recorder)
    return recorder


def test_skip_discovery_is_passed_to_the_command(fake: FakeRun) -> None:
    run_nmap("127.0.0.1", ScanProfile.LOW_NOISE, skip_discovery=True)
    expected = build_nmap_command(
        "127.0.0.1",
        ScanProfile.LOW_NOISE,
        executable=NMAP_PATH,
        skip_discovery=True,
    )
    assert fake.commands == [expected]
    assert "-Pn" in fake.commands[0]


def test_discovery_is_not_skipped_by_default(fake: FakeRun) -> None:
    run_nmap("127.0.0.1", ScanProfile.LOW_NOISE)
    assert "-Pn" not in fake.commands[0]


def test_skipping_discovery_for_a_range_is_refused(fake: FakeRun) -> None:
    with pytest.raises(NmapRunError, match="only allowed for one address"):
        run_nmap("10.0.0.0/24", ScanProfile.LOW_NOISE, skip_discovery=True)
    assert fake.commands == []
