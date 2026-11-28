import ipaddress
import math
from collections import Counter
from urllib.parse import urlparse

ACTION_KEYWORDS = [
    "login", "verify", "kyc", "update", "secure", "account",
    "banking", "refund", "pan", "aadhaar", "signin", "confirm"
]

PROTECTED_BRANDS = {
    "sbi": ("onlinesbi.sbi", "sbi.co.in", "sbi.co"),
    "hdfc": ("hdfcbank.com", "hdfc.com"),
    "icici": ("icicibank.com",),
    "paytm": ("paytm.com",),
    "upi": ("npci.org.in",),
}

SUSPICIOUS_TLDS = (
    ".xyz", ".top", ".click", ".tk", ".ml", ".gq", ".buzz", ".work", ".info"
)


def shannon_entropy(text: str) -> float:
    if not text:
        return 0.0
    counts = Counter(text)
    length = len(text)
    return -sum((c / length) * math.log2(c / length) for c in counts.values())


def has_valid_ip(hostname: str) -> int:
    try:
        ipaddress.ip_address(hostname)
        return 1
    except ValueError:
        return 0


def is_brand_spoof(lower_url: str, hostname: str) -> int:
    for brand, official_domains in PROTECTED_BRANDS.items():
        if brand in lower_url:
            if not any(hostname == d or hostname.endswith("." + d) for d in official_domains):
                return 1
    return 0


def extract_features(url: str) -> dict:
    url = str(url).strip()
    url_for_parse = url if url.startswith(("http://", "https://")) else "http://" + url

    hostname, path, has_port = "", "", 0
    try:
        parsed = urlparse(url_for_parse)
        hostname = (parsed.hostname or "").lower()
        path = parsed.path or ""
        try:
            has_port = int(parsed.port is not None)
        except ValueError:
            has_port = 0
    except ValueError:
        parts = url.split("/", 1)
        hostname = parts[0].lower()
        path = "/" + parts[1] if len(parts) > 1 else ""

    lower_url = url.lower()

    return {
        "url_length": len(url),
        "hostname_length": len(hostname),
        "path_length": len(path),
        "hostname_dots": hostname.count("."),
        "hostname_hyphens": hostname.count("-"),
        "url_digits": sum(c.isdigit() for c in url),
        "hostname_digits": sum(c.isdigit() for c in hostname),
        "has_at_symbol": int("@" in url),
        "has_ip": has_valid_ip(hostname),
        "has_port": has_port,
        "action_keyword_count": sum(kw in lower_url for kw in ACTION_KEYWORDS),
        "brand_spoof": is_brand_spoof(lower_url, hostname),
        "hostname_entropy": shannon_entropy(hostname),
        "has_suspicious_tld": int(hostname.endswith(SUSPICIOUS_TLDS)),
    }