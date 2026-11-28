import pytest
from app.security.ssrf_guard import SSRFError, _assert_public_ip, validate_target_url


@pytest.mark.parametrize(
    "bad_ip",
    [
        "127.0.0.1",           # IPv4 loopback
        "10.0.0.1",            # RFC 1918 Class A private
        "172.16.5.4",          # RFC 1918 Class B private
        "192.168.1.1",         # RFC 1918 Class C private
        "169.254.169.254",     # Cloud metadata endpoint (AWS/GCP/Azure)
        "0.0.0.0",             # Unspecified address
        "::1",                 # IPv6 loopback
        "::ffff:127.0.0.1",    # IPv4-mapped IPv6 SSRF bypass attempt
        "fe80::1",             # IPv6 link-local
    ],
)
def test_blocks_non_public_ips(bad_ip):
    with pytest.raises(SSRFError):
        _assert_public_ip(bad_ip)


@pytest.mark.parametrize(
    "bad_url",
    [
        "",
        "file:///etc/passwd",
        "ftp://example.com",
        "http://localhost:8000",
        "https://admin:secret@example.com",
        "http://169.254.169.254/latest/meta-data/",
    ],
)
def test_blocks_malicious_or_invalid_urls(bad_url):
    with pytest.raises(SSRFError):
        validate_target_url(bad_url)


def test_accepts_public_domain_and_normalizes_scheme():
    target = validate_target_url("example.com")
    assert target.scheme == "https"
    assert target.hostname == "example.com"
    assert target.port == 443
    assert target.normalized_url == "https://example.com"