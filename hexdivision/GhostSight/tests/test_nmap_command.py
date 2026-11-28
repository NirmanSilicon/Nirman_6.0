"""Tests for the Nmap command builder. Nothing here runs Nmap or touches the network."""

import pytest

from ghostsight.integrations.nmap_runner import (
    DEFAULT_PROFILE,
    ScanProfile,
    build_nmap_command,
)

# Options GhostSight must never put in a command.
FORBIDDEN_OPTIONS = {
    "-sS", "-sU", "-O", "-A", "-sC", "--script",
    "-f", "-D", "-S", "-g", "--source-port", "--spoof-mac",
    "--mtu", "--data-length", "--badsum",
}


def test_low_noise_command_is_exact() -> None:
    assert build_nmap_command("127.0.0.1", ScanProfile.LOW_NOISE) == [
        "nmap", "-sT", "-sV", "-n", "--open",
        "-T2", "--top-ports", "100", "--max-retries", "1",
        "--host-timeout", "10m", "--version-light",
        "-oX", "-", "--", "127.0.0.1",
    ]


def test_target_is_last_and_follows_the_separator() -> None:
    command = build_nmap_command("192.168.56.0/24", ScanProfile.NORMAL)
    assert command[-2:] == ["--", "192.168.56.0/24"]


@pytest.mark.parametrize("profile", list(ScanProfile))
def test_every_profile_uses_the_unprivileged_connect_scan(profile: ScanProfile) -> None:
    command = build_nmap_command("127.0.0.1", profile)
    assert "-sT" in command
    assert "-sS" not in command


@pytest.mark.parametrize("profile", list(ScanProfile))
def test_no_profile_uses_scripts_or_evasion_options(profile: ScanProfile) -> None:
    command = build_nmap_command("127.0.0.1", profile)
    assert FORBIDDEN_OPTIONS.isdisjoint(command)


def test_deep_profile_scans_all_ports() -> None:
    command = build_nmap_command("127.0.0.1", ScanProfile.DEEP)
    assert "-p-" in command
    assert "--top-ports" not in command


def test_normal_profile_scans_top_thousand_ports() -> None:
    command = build_nmap_command("127.0.0.1", ScanProfile.NORMAL)
    assert command[command.index("--top-ports") + 1] == "1000"


def test_ipv6_target_adds_the_ipv6_flag_before_the_separator() -> None:
    command = build_nmap_command("::1")
    assert "-6" in command
    assert command.index("-6") < command.index("--")


def test_ipv4_target_does_not_add_the_ipv6_flag() -> None:
    assert "-6" not in build_nmap_command("127.0.0.1")


@pytest.mark.parametrize(
    "target",
    [
        "-sS",
        "127.0.0.1 -p-",
        " 127.0.0.1",
        "127.0.0.1/32",
        "localhost",
        "",
        "192.168.56.5/24",
        "10.0.0.0/8",
        "127.0.0.1; ls",
        "2001:db8::/64",
    ],
)
def test_unsafe_or_non_normalised_targets_are_rejected(target: str) -> None:
    with pytest.raises(ValueError):
        build_nmap_command(target)


def test_range_at_the_size_limit_is_accepted() -> None:
    assert build_nmap_command("192.168.0.0/22")[-1] == "192.168.0.0/22"


def test_range_over_the_size_limit_is_rejected() -> None:
    with pytest.raises(ValueError):
        build_nmap_command("10.0.0.0/8")


def test_unknown_profile_is_rejected() -> None:
    with pytest.raises(ValueError):
        build_nmap_command("127.0.0.1", "stealth")  # type: ignore[arg-type]


def test_custom_executable_is_used_as_first_item() -> None:
    assert build_nmap_command("127.0.0.1", executable="/usr/bin/nmap")[0] == "/usr/bin/nmap"


def test_default_profile_is_low_noise() -> None:
    assert DEFAULT_PROFILE is ScanProfile.LOW_NOISE
    assert build_nmap_command("127.0.0.1") == build_nmap_command("127.0.0.1", ScanProfile.LOW_NOISE)


def test_command_is_a_list_of_strings() -> None:
    for profile in ScanProfile:
        command = build_nmap_command("127.0.0.1", profile)
        assert isinstance(command, list)
        assert all(isinstance(part, str) for part in command)
