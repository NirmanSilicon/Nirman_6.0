"""Tests for the optional skip-discovery flag. Nothing here runs Nmap."""

import pytest

from ghostsight.integrations.nmap_runner import ScanProfile, build_nmap_command

TARGET = "10.55.23.236"

# Options GhostSight must never put in a command.
FORBIDDEN_OPTIONS = {
    "-sS", "-sU", "-O", "-A", "-sC", "--script",
    "-f", "-D", "-S", "-g", "--source-port", "--spoof-mac",
    "--mtu", "--data-length", "--badsum",
}


def test_the_default_command_does_not_skip_discovery() -> None:
    assert "-Pn" not in build_nmap_command(TARGET)


@pytest.mark.parametrize("profile", list(ScanProfile))
def test_skipping_discovery_only_adds_pn(profile: ScanProfile) -> None:
    plain = build_nmap_command(TARGET, profile)
    skipping = build_nmap_command(TARGET, profile, skip_discovery=True)
    assert skipping.count("-Pn") == 1
    skipping.remove("-Pn")
    assert skipping == plain


def test_skipping_discovery_keeps_the_target_last() -> None:
    command = build_nmap_command(TARGET, skip_discovery=True)
    assert command[-2:] == ["--", TARGET]


def test_skipping_discovery_is_refused_for_a_range() -> None:
    with pytest.raises(ValueError, match="one address"):
        build_nmap_command("192.168.56.0/24", skip_discovery=True)


@pytest.mark.parametrize("profile", list(ScanProfile))
def test_skipping_discovery_adds_no_forbidden_option(profile: ScanProfile) -> None:
    command = build_nmap_command(TARGET, profile, skip_discovery=True)
    assert FORBIDDEN_OPTIONS.isdisjoint(command)
