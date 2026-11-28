from dataclasses import dataclass
import ipaddress
import socket
from urllib.parse import urlparse


class SSRFError(ValueError):
    """Raised when a submitted target URL is malformed, unresolvable, or points to a non-public IP."""


@dataclass(frozen=True)
class ValidatedTarget:
    normalized_url: str
    scheme: str
    hostname: str
    port: int
    resolved_ip: str


def _assert_public_ip(ip_str: str) -> None:
    """Reject loopback, RFC 1918 private LAN, link-local (cloud metadata), multicast, and reserved IPs."""
    ip_obj = ipaddress.ip_address(ip_str)

    # Defend against IPv4-mapped IPv6 bypasses like ::ffff:127.0.0.1
    if isinstance(ip_obj, ipaddress.IPv6Address) and ip_obj.ipv4_mapped is not None:
        ip_obj = ip_obj.ipv4_mapped

    if not ip_obj.is_global or ip_obj.is_multicast:
        raise SSRFError(
            f"Target resolves to non-public IP ({ip_obj}). Scanning private or internal networks is blocked."
        )


def validate_target_url(raw_url: str) -> ValidatedTarget:
    """Sanitize, parse, resolve, and verify a target URL before any scanner touches the network."""
    cleaned = raw_url.strip()
    if not cleaned:
        raise SSRFError("URL cannot be empty.")

    # Auto-prepend https:// only if no scheme is present (e.g., "example.com")
    if "://" not in cleaned:
        cleaned = f"https://{cleaned}"

    parsed = urlparse(cleaned)

    # 1. Strict scheme allowlist
    if parsed.scheme.lower() not in ("http", "https"):
        raise SSRFError(f"Unsupported URL scheme '{parsed.scheme}'. Only http and https are allowed.")

    # 2. Reject embedded credentials like https://user:pass@example.com
    if parsed.username or parsed.password:
        raise SSRFError("URLs containing embedded credentials are not permitted.")

    hostname = parsed.hostname
    if not hostname:
        raise SSRFError("Could not extract a valid hostname from the URL.")

    hostname = hostname.rstrip(".").lower()
    if hostname in ("localhost", "localhost.localdomain"):
        raise SSRFError("Scanning localhost is blocked.")

    try:
        port = parsed.port or (443 if parsed.scheme.lower() == "https" else 80)
    except ValueError as exc:
        raise SSRFError("Invalid port specified in URL.") from exc

    # 3. Resolve all A / AAAA records and validate EVERY returned IP
    try:
        addr_info = socket.getaddrinfo(hostname, port, type=socket.SOCK_STREAM)
    except socket.gaierror as exc:
        raise SSRFError(f"Domain '{hostname}' could not be resolved via DNS.") from exc

    if not addr_info:
        raise SSRFError(f"No IP addresses found for '{hostname}'.")

    seen_ips: list[str] = []
    for entry in addr_info:
        ip_str = entry[4][0]
        if ip_str not in seen_ips:
            _assert_public_ip(ip_str)
            seen_ips.append(ip_str)

    # Reconstruct a clean normalized URL (preserves non-default port if given)
    default_port = 443 if parsed.scheme.lower() == "https" else 80
    netloc = hostname if port == default_port else f"{hostname}:{port}"
    path = parsed.path or ""
    normalized_url = f"{parsed.scheme.lower()}://{netloc}{path}"

    return ValidatedTarget(
        normalized_url=normalized_url,
        scheme=parsed.scheme.lower(),
        hostname=hostname,
        port=port,
        resolved_ip=seen_ips[0],
    )