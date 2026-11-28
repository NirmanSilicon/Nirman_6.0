import re
import httpx

from app.scanners.base import ScannerResult, make_finding, safe_get
from app.schemas import FindingSchema, ModuleSummary, Severity
from app.security.ssrf_guard import SSRFError, ValidatedTarget

MIN_HSTS_MAX_AGE = 15552000  # 180 days minimum recommended


async def scan_headers(target: ValidatedTarget) -> ScannerResult:
    findings: list[FindingSchema] = []
    checks_passed = 0
    checks_failed = 0

    try:
        response = await safe_get(target.normalized_url, verify_ssl=False)
    except (httpx.HTTPError, SSRFError) as exc:
        return ScannerResult(
            module="headers",
            summary=ModuleSummary(
                status="error",
                checks_passed=0,
                checks_failed=0,
                error_message=f"HTTP request failed: {exc}",
            ),
            findings=[],
        )

    headers = response.headers  # httpx.Headers is case-insensitive
    final_is_https = str(response.url).startswith("https://")

    # 1. Final URL must be served over HTTPS
    if not final_is_https:
        checks_failed += 1
        findings.append(
            make_finding(
                module="headers",
                code="NO_HTTPS_REDIRECT",
                cwe_id="CWE-319",
                owasp_category="A02:2021-Cryptographic Failures",
                severity=Severity.HIGH,
                title="Website Does Not Enforce HTTPS",
                technical_detail=f"Final resolved URL remained unencrypted HTTP: {response.url}",
                business_impact=(
                    "Customers typing your domain name stay on unencrypted HTTP, allowing network attackers "
                    "to read or tamper with pages in transit."
                ),
                general_fix="Configure a permanent 301 redirect from HTTP (port 80) to HTTPS (port 443).",
            )
        )
    else:
        checks_passed += 1

    # 2. Strict-Transport-Security (HSTS)
    hsts = headers.get("strict-transport-security")
    if not hsts:
        checks_failed += 1
        findings.append(
            make_finding(
                module="headers",
                code="MISSING_HSTS",
                cwe_id="CWE-523",
                owasp_category="A05:2021-Security Misconfiguration",
                severity=Severity.HIGH,
                title="Missing HSTS (Strict-Transport-Security) Header",
                technical_detail="Response did not include a Strict-Transport-Security header.",
                business_impact=(
                    "Browsers aren't instructed to force HTTPS automatically, leaving users vulnerable to "
                    "SSL-stripping downgrade attacks on public Wi-Fi."
                ),
                general_fix="Add 'Strict-Transport-Security: max-age=31536000; includeSubDomains' to HTTPS responses.",
            )
        )
    else:
        match = re.search(r"max-age=(\d+)", hsts, re.IGNORECASE)
        max_age = int(match.group(1)) if match else 0
        if max_age < MIN_HSTS_MAX_AGE:
            checks_failed += 1
            findings.append(
                make_finding(
                    module="headers",
                    code="WEAK_HSTS",
                    cwe_id="CWE-523",
                    owasp_category="A05:2021-Security Misconfiguration",
                    severity=Severity.LOW,
                    title="Weak HSTS max-age Value",
                    technical_detail=f"HSTS header '{hsts}' has max-age={max_age}s (recommended >= 31536000s).",
                    business_impact="Browsers forget the HTTPS-only rule too quickly between customer visits.",
                    general_fix="Increase HSTS max-age to at least 31536000 (1 year).",
                )
            )
        else:
            checks_passed += 1

    # 3. Content-Security-Policy (CSP)
    csp = headers.get("content-security-policy")
    if not csp:
        checks_failed += 1
        findings.append(
            make_finding(
                module="headers",
                code="MISSING_CSP",
                cwe_id="CWE-693",
                owasp_category="A05:2021-Security Misconfiguration",
                severity=Severity.MEDIUM,
                title="Missing Content-Security-Policy (CSP) Header",
                technical_detail="No Content-Security-Policy header found in HTTP response.",
                business_impact=(
                    "Without CSP, if a single script injection bug (XSS) occurs, attackers can freely load "
                    "malicious payment skimmers or steal customer session tokens."
                ),
                general_fix="Define a Content-Security-Policy restricting scripts, styles, and frames to trusted origins.",
            )
        )
    else:
        checks_passed += 1

    # 4. Clickjacking protection (X-Frame-Options OR CSP frame-ancestors)
    xfo = headers.get("x-frame-options")
    has_frame_ancestors = bool(csp and "frame-ancestors" in csp.lower())
    if not xfo and not has_frame_ancestors:
        checks_failed += 1
        findings.append(
            make_finding(
                module="headers",
                code="MISSING_X_FRAME_OPTIONS",
                cwe_id="CWE-1021",
                owasp_category="A05:2021-Security Misconfiguration",
                severity=Severity.MEDIUM,
                title="Missing Clickjacking Protection (X-Frame-Options)",
                technical_detail="Neither X-Frame-Options nor CSP frame-ancestors directive was present.",
                business_impact=(
                    "Attackers can embed your website inside an invisible iframe on a fake page and trick "
                    "users into clicking buttons or submitting forms unknowingly."
                ),
                general_fix="Set 'X-Frame-Options: DENY' (or 'SAMEORIGIN') and CSP 'frame-ancestors' directive.",
            )
        )
    else:
        checks_passed += 1

    # 5. X-Content-Type-Options (MIME sniffing defense)
    xcto = headers.get("x-content-type-options", "").lower()
    if "nosniff" not in xcto:
        checks_failed += 1
        findings.append(
            make_finding(
                module="headers",
                code="MISSING_X_CONTENT_TYPE_OPTIONS",
                cwe_id="CWE-693",
                owasp_category="A05:2021-Security Misconfiguration",
                severity=Severity.LOW,
                title="Missing X-Content-Type-Options: nosniff Header",
                technical_detail=f"Observed X-Content-Type-Options value: '{xcto or 'none'}'.",
                business_impact=(
                    "Browsers may try to guess file types and execute uploaded images or text files as JavaScript."
                ),
                general_fix="Add 'X-Content-Type-Options: nosniff' to all HTTP responses.",
            )
        )
    else:
        checks_passed += 1

    # 6. Referrer-Policy
    if not headers.get("referrer-policy"):
        checks_failed += 1
        findings.append(
            make_finding(
                module="headers",
                code="MISSING_REFERRER_POLICY",
                cwe_id="CWE-200",
                owasp_category="A05:2021-Security Misconfiguration",
                severity=Severity.LOW,
                title="Missing Referrer-Policy Header",
                technical_detail="No Referrer-Policy header present in HTTP response.",
                business_impact=(
                    "Internal URL paths or reset tokens in query strings can leak to external sites when users click outbound links."
                ),
                general_fix="Add 'Referrer-Policy: strict-origin-when-cross-origin' to HTTP responses.",
            )
        )
    else:
        checks_passed += 1

    # 7. Cookie security attributes (Secure, HttpOnly, SameSite)
    raw_cookies = headers.get_list("set-cookie")
    if raw_cookies:
        weak_cookies: list[str] = []
        for raw in raw_cookies:
            cookie_name = raw.split("=", 1)[0].strip()
            lowered = raw.lower()
            missing_flags = []
            if "httponly" not in lowered:
                missing_flags.append("HttpOnly")
            if final_is_https and "secure" not in lowered:
                missing_flags.append("Secure")
            if "samesite" not in lowered:
                missing_flags.append("SameSite")
            if missing_flags:
                weak_cookies.append(f"{cookie_name} (missing {', '.join(missing_flags)})")

        if weak_cookies:
            checks_failed += 1
            findings.append(
                make_finding(
                    module="headers",
                    code="INSECURE_COOKIE",
                    cwe_id="CWE-614",
                    owasp_category="A05:2021-Security Misconfiguration",
                    severity=Severity.MEDIUM,
                    title="Cookies Missing Security Flags",
                    technical_detail="Insecure Set-Cookie headers detected: " + "; ".join(weak_cookies[:5]),
                    business_impact=(
                        "Session cookies without HttpOnly, Secure, and SameSite flags are easier for attackers "
                        "to steal via JavaScript or hijack via Cross-Site Request Forgery (CSRF)."
                    ),
                    general_fix="Mark all session cookies with 'Secure; HttpOnly; SameSite=Lax' (or Strict).",
                )
            )
        else:
            checks_passed += 1

    status = "ok" if checks_failed == 0 else "warning"
    return ScannerResult(
        module="headers",
        summary=ModuleSummary(
            status=status,
            checks_passed=checks_passed,
            checks_failed=checks_failed,
        ),
        findings=findings,
    )