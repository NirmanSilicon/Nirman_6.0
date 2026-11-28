"""Scope manager: the only place that decides whether a target may be scanned.

Rules:
- Deny by default. No scope file means nothing is allowed.
- Only IP addresses and CIDR ranges are accepted. Hostnames are denied.
- A target is allowed only if it lies entirely inside an allowed range.
- An allowed decision carries a normalised target. Scanners must use that
  value, never the raw text, so what was approved is what gets executed.
"""

import ipaddress
import tomllib
from dataclasses import dataclass
from pathlib import Path

from ghostsight.paths import get_home_dir

Network = ipaddress.IPv4Network | ipaddress.IPv6Network


class ScopeError(Exception):
    """Raised when the scope file exists but cannot be used."""


@dataclass(frozen=True)
class ScopeDecision:
    """The answer to 'may this target be scanned?', with a reason.

    `target` is the raw text that was asked about. `normalised` is the
    canonical form to scan, and is None whenever the target is denied.
    """

    target: str
    allowed: bool
    reason: str
    normalised: str | None = None


@dataclass(frozen=True)
class Scope:
    """The set of networks that may be scanned."""

    networks: tuple[Network, ...]

    def check(self, target: str) -> ScopeDecision:
        """Decide whether a target is inside the allowed scope."""
        try:
            network = parse_network(target)
        except ValueError:
            return ScopeDecision(
                target,
                False,
                "Not a plain IP address or CIDR range. Hostnames are not supported yet.",
            )

        if not self.networks:
            return ScopeDecision(target, False, "No scope is configured. Nothing is allowed by default.")

        for allowed in self.networks:
            if network.version == allowed.version and network.subnet_of(allowed):
                return ScopeDecision(
                    target,
                    True,
                    f"Inside allowed range {allowed}.",
                    normalise_network(network),
                )

        return ScopeDecision(target, False, "Outside every allowed range.")


def parse_network(text: str) -> Network:
    """Parse an IP address or CIDR range strictly. Raises ValueError if invalid."""
    return ipaddress.ip_network(text.strip(), strict=True)


def normalise_network(network: Network) -> str:
    """Return the canonical text for a network: a single host as a plain address."""
    if network.prefixlen == network.max_prefixlen:
        return str(network.network_address)
    return str(network)


def default_scope_path() -> Path:
    """Where the local scope file lives."""
    return get_home_dir() / "config" / "scope.local.toml"


def load_scope(path: Path | None = None) -> Scope:
    """Load the scope file. A missing file gives an empty scope (deny everything)."""
    scope_path = path if path is not None else default_scope_path()
    if not scope_path.exists():
        return Scope(networks=())

    try:
        data = tomllib.loads(scope_path.read_text(encoding="utf-8"))
    except (OSError, UnicodeDecodeError, tomllib.TOMLDecodeError) as error:
        raise ScopeError(f"Cannot read scope file {scope_path}: {error}") from error

    section = data.get("scope", {})
    entries = section.get("allowed", []) if isinstance(section, dict) else None
    if not isinstance(entries, list):
        raise ScopeError(f"{scope_path}: [scope] allowed must be a list of strings.")

    networks: list[Network] = []
    for entry in entries:
        if not isinstance(entry, str):
            raise ScopeError(f"{scope_path}: scope entry {entry!r} is not a string.")
        try:
            networks.append(parse_network(entry))
        except ValueError as error:
            raise ScopeError(f"{scope_path}: invalid scope entry {entry!r}: {error}") from error

    return Scope(networks=tuple(networks))
