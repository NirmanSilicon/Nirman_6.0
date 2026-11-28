import asyncio
import certifi
from datetime import datetime, timezone
import socket
import ssl
from cryptography import x509

from app.scanners.base import ScannerResult, make_finding
from app.schemas import FindingSchema, ModuleSummary, Severity
from app.security.ssrf_guard import ValidatedTarget

DEPRECATED_PROTOCOLS = {"SSLv2", "SSLv3", "TLSv1", "TLSv1.1"}
EXPIRY_WARNING_DAYS = 30
TLS_TIMEOUT = 5.0


def _sync_scan_tls(target: ValidatedTarget) -> ScannerResult:
    findings: list[FindingSchema] = []
    checks_passed = 0
    checks_failed = 0

    # Always test TLS on port 443 if user entered http://, or on explicit HTTPS port
    tls_port = target.port if target.scheme == "https" else 443
    context =ssl.create_default_context(cafile=certifi.where())

    try:
        with socket.create_connection((target.hostname, tls_port), timeout=TLS_TIMEOUT) as raw_sock:
            with context.wrap_socket(raw_sock, server_hostname=target.hostname) as tls_sock:
                protocol_version = tls_sock.version() or "Unknown"
                der_cert = tls_sock.getpeercert(binary_form=True)

        # Check 1: Valid certificate chain & hostname verification succeeded
        checks_passed += 1

        # Check 2: TLS protocol version (must be TLS 1.2 or TLS 1.3)
        if protocol_version in DEPRECATED_PROTOCOLS:
            checks_failed += 1
            findings.append(
                make_finding(
                    module="tls",
                    code="DEPRECATED_TLS",
                    cwe_id="CWE-327",
                    owasp_category="A02:2021-Cryptographic Failures",
                    severity=Severity.HIGH,
                    title=f"Deprecated TLS Protocol Negotiated ({protocol_version})",
                    technical_detail=f"Server negotiated {protocol_version} on port {tls_port}.",
                    business_impact=(
                        "Outdated encryption protocols have known cryptographic weaknesses that "
                        "allow attackers on public Wi-Fi to intercept customer logins or payments."
                    ),
                    general_fix="Disable TLS 1.0/1.1 in your web server config and enforce TLS 1.2 and TLS 1.3 only.",
                )
            )
        else:
            checks_passed += 1

        # Check 3: Certificate expiration window
        if der_cert:
            cert = x509.load_der_x509_certificate(der_cert)
            now_utc = datetime.now(timezone.utc)
            days_left = (cert.not_valid_after_utc - now_utc).days

            if days_left <= 0:
                checks_failed += 1
                findings.append(
                    make_finding(
                        module="tls",
                        code="SSL_CERT_EXPIRED",
                        cwe_id="CWE-295",
                        owasp_category="A02:2021-Cryptographic Failures",
                        severity=Severity.CRITICAL,
                        title="SSL/TLS Certificate Has Expired",
                        technical_detail=f"Certificate expired on {cert.not_valid_after_utc.date().isoformat()}.",
                        business_impact=(
                            "Visitors see a full-screen browser security warning and abandon your website immediately."
                        ),
                        general_fix="Renew your SSL certificate immediately using Let's Encrypt (Certbot) or your hosting panel.",
                    )
                )
            elif days_left <= EXPIRY_WARNING_DAYS:
                checks_failed += 1
                findings.append(
                    make_finding(
                        module="tls",
                        code="SSL_CERT_EXPIRING_SOON",
                        cwe_id="CWE-295",
                        owasp_category="A02:2021-Cryptographic Failures",
                        severity=Severity.MEDIUM,
                        title=f"SSL/TLS Certificate Expires in {days_left} Days",
                        technical_detail=f"Certificate expires on {cert.not_valid_after_utc.date().isoformat()} ({days_left} days left).",
                        business_impact=(
                            "If auto-renewal fails, your site will go down with browser trust warnings within a month."
                        ),
                        general_fix="Enable automated certificate renewal (e.g., Certbot systemd timer or Cloudflare Universal SSL).",
                    )
                )
            else:
                checks_passed += 1

    except ssl.SSLCertVerificationError as exc:
        checks_failed += 1
        findings.append(
            make_finding(
                module="tls",
                code="SSL_CERT_INVALID",
                cwe_id="CWE-295",
                owasp_category="A02:2021-Cryptographic Failures",
                severity=Severity.CRITICAL,
                title="Invalid or Untrusted SSL/TLS Certificate",
                technical_detail=f"TLS certificate verification failed: {exc.verify_message or str(exc)}",
                business_impact=(
                    "Browsers cannot verify your website's identity (expired, self-signed, or wrong domain name), "
                    "exposing customers to man-in-the-middle impersonation."
                ),
                general_fix="Install a valid CA-signed certificate (e.g., Let's Encrypt) matching your exact domain name.",
            )
        )
    except (socket.timeout, TimeoutError, ConnectionRefusedError, OSError) as exc:
        checks_failed += 1
        findings.append(
            make_finding(
                module="tls",
                code="HTTPS_UNAVAILABLE",
                cwe_id="CWE-319",
                owasp_category="A02:2021-Cryptographic Failures",
                severity=Severity.CRITICAL,
                title="HTTPS / TLS Service Unreachable on Port 443",
                technical_detail=f"Could not complete TLS handshake on {target.hostname}:{tls_port} ({type(exc).__name__}).",
                business_impact=(
                    "Traffic between customers and your website cannot be encrypted, exposing passwords and form inputs."
                ),
                general_fix="Enable HTTPS on port 443 with a free Let's Encrypt certificate and redirect all HTTP traffic to HTTPS.",
            )
        )

    status = "ok" if checks_failed == 0 else "warning"
    return ScannerResult(
        module="tls",
        summary=ModuleSummary(
            status=status,
            checks_passed=checks_passed,
            checks_failed=checks_failed,
        ),
        findings=findings,
    )


async def scan_tls(target: ValidatedTarget) -> ScannerResult:
    """Async wrapper that offloads blocking TLS socket I/O to a background thread."""
    return await asyncio.to_thread(_sync_scan_tls, target)