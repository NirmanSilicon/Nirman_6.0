"""Build Nmap command lines. This module never runs anything.

Safety rules:
- The target must already be in the normalised form produced by the scope manager.
- The target comes after '--', so Nmap can never read it as an option.
- The command is a list of arguments, never a shell string.
- Scans use the unprivileged TCP connect scan (-sT), so root is not needed.
- No NSE scripts, no OS detection and no evasion options.
"""

from dataclasses import dataclass
from enum import StrEnum

from ghostsight.security.policy import LARGEST_ALLOWED_LIMIT
from ghostsight.security.scope_manager import Network, normalise_network, parse_network

# Backstop only. The limit that applies is the policy's (ghostsight.security.policy).
MAX_TARGET_ADDRESSES = LARGEST_ALLOWED_LIMIT

# Used by every profile.
# -sT connect scan, -sV service versions, -n no DNS lookups, --open open ports only.
BASE_ARGS = ("-sT", "-sV", "-n", "--open")

# XML on standard output, for the parser added in the next step.
OUTPUT_ARGS = ("-oX", "-")


class ScanProfile(StrEnum):
    """How hard a scan works. Low-noise reduces load. It does not hide anything."""

    LOW_NOISE = "low-noise"
    NORMAL = "normal"
    DEEP = "deep"


DEFAULT_PROFILE = ScanProfile.LOW_NOISE


@dataclass(frozen=True)
class ProfileSettings:
    """The description and the Nmap arguments of one scan profile."""

    description: str
    args: tuple[str, ...]


PROFILES: dict[ScanProfile, ProfileSettings] = {
    ScanProfile.LOW_NOISE: ProfileSettings(
        description="Top 100 ports, slow timing, few retries. Lowest network load.",
        args=(
            "-T2",
            "--top-ports", "100",
            "--max-retries", "1",
            "--host-timeout", "10m",
            "--version-light",
        ),
    ),
    ScanProfile.NORMAL: ProfileSettings(
        description="Top 1000 ports at normal timing.",
        args=(
            "-T3",
            "--top-ports", "1000",
            "--max-retries", "2",
            "--host-timeout", "30m",
        ),
    ),
    ScanProfile.DEEP: ProfileSettings(
        description="All 65535 ports with the most thorough version probes. Slow.",
        args=(
            "-T3",
            "-p-",
            "--max-retries", "2",
            "--host-timeout", "60m",
            "--version-all",
        ),
    ),
}


def _checked_network(target: str) -> Network:
    """Return the parsed target, or raise ValueError if it is not safe to use."""
    try:
        network = parse_network(target)
    except ValueError as error:
        raise ValueError(f"Not a valid IP address or CIDR range: {target!r}") from error

    canonical = normalise_network(network)
    if canonical != target:
        raise ValueError(
            f"Target {target!r} is not in normalised form. Use {canonical!r}, "
            "the value returned by the scope manager."
        )
    if network.num_addresses > MAX_TARGET_ADDRESSES:
        raise ValueError(
            f"Target {target!r} covers {network.num_addresses} addresses. "
            f"The limit is {MAX_TARGET_ADDRESSES}."
        )
    return network


def build_nmap_command(
    target: str,
    profile: ScanProfile = DEFAULT_PROFILE,
    executable: str = "nmap",
    skip_discovery: bool = False,
) -> list[str]:
    """Return the Nmap command as a list of arguments.

    `target` must be the normalised value from a ScopeDecision.
    Raises ValueError for an unsafe target, an unknown profile, or
    skip_discovery with more than one address. skip_discovery adds -Pn,
    so Nmap tries the ports even if the host does not answer discovery.
    """
    network = _checked_network(target)
    if skip_discovery and network.num_addresses > 1:
        raise ValueError(
            "Skipping host discovery is only allowed for one address."
        )
    settings = PROFILES[ScanProfile(profile)]

    command = [executable, *BASE_ARGS, *settings.args]
    if skip_discovery:
        command.append("-Pn")
    if network.version == 6:
        command.append("-6")
    command += [*OUTPUT_ARGS, "--", target]
    return command
