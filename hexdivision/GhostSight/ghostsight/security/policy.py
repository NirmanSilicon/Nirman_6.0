"""Policy: the settings that limit what GhostSight may do, read from policy.local.toml.

Rules:
- A missing file means the built-in defaults, which are the strict ones.
- A file that exists but is broken raises PolicyError. It never becomes "allowed".
- Unknown sections and names are refused, so a typo cannot silently use a default.
- Plain deterministic code. Nothing here reads AI output.
"""

import tomllib
from dataclasses import dataclass
from pathlib import Path

from ghostsight.paths import get_home_dir
from ghostsight.security.scope_manager import Network, parse_network

DEFAULT_MAX_TARGET_ADDRESSES = 1024
LARGEST_ALLOWED_LIMIT = 65536

# The only sections and names the file may contain.
KNOWN_KEYS = {
    "policy": {"max_target_addresses"},
    "lab": {"allowed"},
}


class PolicyError(Exception):
    """Raised when the policy file exists but cannot be used."""


@dataclass(frozen=True)
class Policy:
    """The limits in force. Frozen, so nothing can raise a limit while a command runs."""

    max_target_addresses: int = DEFAULT_MAX_TARGET_ADDRESSES
    lab_allowed: tuple[Network, ...] = ()


def default_policy_path() -> Path:
    """Where the local policy file lives."""
    return get_home_dir() / "config" / "policy.local.toml"


def _section(data: dict, name: str, path: Path) -> dict:
    """Return one section of the file, refusing it if it is not a table or has unknown names."""
    section = data.get(name, {})
    if not isinstance(section, dict):
        raise PolicyError(f"{path}: [{name}] must be a table.")
    for key in section:
        if key not in KNOWN_KEYS[name]:
            raise PolicyError(f"{path}: unknown setting {key!r} in [{name}].")
    return section


def _read_limit(section: dict, path: Path) -> int:
    value = section.get("max_target_addresses", DEFAULT_MAX_TARGET_ADDRESSES)
    # True and False are ints in Python, so they need their own check.
    if isinstance(value, bool) or not isinstance(value, int):
        raise PolicyError(f"{path}: max_target_addresses must be a whole number.")
    if not 1 <= value <= LARGEST_ALLOWED_LIMIT:
        raise PolicyError(
            f"{path}: max_target_addresses must be between 1 and {LARGEST_ALLOWED_LIMIT}."
        )
    return value


def _read_lab(section: dict, path: Path) -> tuple[Network, ...]:
    entries = section.get("allowed", [])
    if not isinstance(entries, list):
        raise PolicyError(f"{path}: [lab] allowed must be a list of strings.")
    networks: list[Network] = []
    for entry in entries:
        if not isinstance(entry, str):
            raise PolicyError(f"{path}: lab entry {entry!r} is not a string.")
        try:
            networks.append(parse_network(entry))
        except ValueError as error:
            raise PolicyError(f"{path}: invalid lab entry {entry!r}: {error}") from error
    return tuple(networks)


def load_policy(path: Path | None = None) -> Policy:
    """Load the policy file. A missing file gives the defaults."""
    policy_path = path if path is not None else default_policy_path()
    if not policy_path.exists():
        return Policy()

    try:
        data = tomllib.loads(policy_path.read_text(encoding="utf-8"))
    except (OSError, UnicodeDecodeError, tomllib.TOMLDecodeError) as error:
        raise PolicyError(f"Cannot read policy file {policy_path}: {error}") from error

    for name in data:
        if name not in KNOWN_KEYS:
            raise PolicyError(f"{policy_path}: unknown section [{name}].")

    return Policy(
        max_target_addresses=_read_limit(_section(data, "policy", policy_path), policy_path),
        lab_allowed=_read_lab(_section(data, "lab", policy_path), policy_path),
    )


@dataclass(frozen=True)
class PolicyDecision:
    """The answer to one policy question: allowed or not, and a plain reason."""

    allowed: bool
    reason: str


def evaluate_scan(policy: Policy, network: Network) -> PolicyDecision:
    """Decide whether a range is small enough to scan. Only the policy and the target count."""
    size = network.num_addresses
    limit = policy.max_target_addresses
    if size > limit:
        return PolicyDecision(
            False,
            f"Refused by policy: the range covers {size} addresses and the limit is {limit}.",
        )
    return PolicyDecision(True, f"Within the policy limit of {limit} addresses.")


def evaluate_lab_target(policy: Policy, network: Network) -> PolicyDecision:
    """Decide whether one address may be a lab target. Only the policy and the target count."""
    if not policy.lab_allowed:
        return PolicyDecision(
            False,
            "Refused by policy: no lab targets are listed under [lab] allowed.",
        )
    if network.num_addresses != 1:
        return PolicyDecision(
            False,
            f"Refused by policy: a lab check needs one address, but {network} covers "
            f"{network.num_addresses}.",
        )
    address = network.network_address
    if not address.is_private:
        return PolicyDecision(False, f"Refused by policy: {address} is not a private address.")
    for allowed in policy.lab_allowed:
        # subnet_of raises on mixed IPv4 and IPv6, so compare the versions first.
        if network.version == allowed.version and network.subnet_of(allowed):
            return PolicyDecision(True, f"{address} is inside the lab range {allowed}.")
    return PolicyDecision(
        False, f"Refused by policy: {address} is not inside any range in [lab] allowed."
    )
