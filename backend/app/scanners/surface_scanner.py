import re
from typing import Callable
from urllib.parse import urljoin
from bs4 import BeautifulSoup
import httpx

from app.scanners.base import USER_AGENT, ScannerResult, make_finding, safe_get
from app.schemas import FindingSchema, ModuleSummary, Severity
from app.security.ssrf_guard import SSRFError, ValidatedTarget

VERSION_PATTERN = re.compile(r"/\d+(\.\d+)*")
ENV_LINE_PATTERN = re.compile(r"^[A-Z][A-Z0-9_]{1,40}\s*=", re.MULTILINE)
PROBE_MAX_BYTES = 1024
PROBE_TIMEOUT = 4.0


async def _probe_sensitive_path(
    client: httpx.AsyncClient,
    base_url: str,
    path: str,
    signature_check: Callable[[str], bool],
) -> bool:
    """Safely stream up to 1 KB from a sensitive path and confirm a real file signature (no soft-404s)."""
    probe_url = urljoin(base_url, path)
    try:
        async with client.stream("GET", probe_url) as resp:
            if resp.status_code != 200:
                return False

            content_type = resp.headers.get("content-type", "").lower()
            if "text/html" in content_type:
                return False

            collected = bytearray()
            async for chunk in resp.aiter_bytes():
                collected.extend(chunk)
                if len(collected) >= PROBE_MAX_BYTES:
                    break

            snippet = collected[:PROBE_MAX_BYTES].decode("utf-8", errors="ignore")
            if "<html" in snippet.lower() or "<!doctype" in snippet.lower():
                return False

            return signature_check(snippet)
    except httpx.HTTPError:
        return False


async def scan_surface(target: ValidatedTarget) -> ScannerResult:
    findings: list[FindingSchema] = []
    checks_passed = 0
    checks_failed = 0

    try:
        response = await safe_get(target.normalized_url, verify_ssl=False)
    except (httpx.HTTPError, SSRFError) as exc:
        return ScannerResult(
            module="surface",
            summary=ModuleSummary(
                status="error",
                checks_passed=0,
                checks_failed=0,
                error_message=f"Could not fetch target surface: {exc}",
            ),
            findings=[],
        )

    final_url = str(response.url)
    final_is_https = final_url.startswith("https://")
    headers = response.headers

    # 1. Server / Technology Version Banner Leakage
    leaked_banners: list[str] = []
    server_hdr = headers.get("server", "")
    if server_hdr and VERSION_PATTERN.search(server_hdr):
        leaked_banners.append(f"Server: {server_hdr}")

    powered_by = headers.get("x-powered-by", "")
    if powered_by:
        leaked_banners.append(f"X-Powered-By: {powered_by}")

    if leaked_banners:
        checks_failed += 1
        findings.append(
            make_finding(
                module="surface",
                code="SERVER_BANNER_LEAK",
                cwe_id="CWE-200",
                owasp_category="A05:2021-Security Misconfiguration",
                severity=Severity.LOW,
                title="Web Server / Runtime Version Exposed in HTTP Headers",
                technical_detail="Observed verbose headers: " + "; ".join(leaked_banners),
                business_impact=(
                    "Automated bots scan for exact server/PHP/framework version numbers to launch targeted "
                    "known-vulnerability (CVE) exploits against unpatched hosting setups."
                ),
                general_fix="Hide server version banners (e.g., 'server_tokens off;' in Nginx or 'ServerTokens Prod' in Apache).",
            )
        )
    else:
        checks_passed += 1

    # 2. HTML DOM Audit (Insecure Forms & Active Mixed Content)
    content_type = headers.get("content-type", "").lower()
    if "html" in content_type and response.text:
        soup = BeautifulSoup(response.text, "html.parser")

        # 2a. Forms submitting to plaintext http:// endpoints
        insecure_forms: list[str] = []
        for form in soup.find_all("form"):
            action = (form.get("action") or "").strip()
            if action.lower().startswith("http://"):
                insecure_forms.append(action)

        if insecure_forms:
            checks_failed += 1
            findings.append(
                make_finding(
                    module="surface",
                    code="INSECURE_FORM_ACTION",
                    cwe_id="CWE-319",
                    owasp_category="A02:2021-Cryptographic Failures",
                    severity=Severity.HIGH,
                    title="HTML Form Submits Data Over Unencrypted HTTP",
                    technical_detail=f"Found {len(insecure_forms)} form(s) targeting plaintext HTTP: {', '.join(insecure_forms[:3])}",
                    business_impact=(
                        "Even if the page itself uses HTTPS, passwords, contact inquiries, or order forms "
                        "submitted to an http:// endpoint travel in readable plain text."
                    ),
                    general_fix="Update all <form action='...'> URLs to use https:// or relative paths.",
                )
            )
        else:
            checks_passed += 1

        # 2b. Active mixed content (<script> or <iframe> loaded over http:// on an HTTPS page)
        mixed_assets: list[str] = []
        if final_is_https:
            for tag in soup.find_all(["script", "iframe"]):
                src = (tag.get("src") or "").strip()
                if src.lower().startswith("http://"):
                    mixed_assets.append(src)

        if mixed_assets:
            checks_failed += 1
            findings.append(
                make_finding(
                    module="surface",
                    code="MIXED_CONTENT_ACTIVE",
                    cwe_id="CWE-319",
                    owasp_category="A02:2021-Cryptographic Failures",
                    severity=Severity.MEDIUM,
                    title="Active Mixed Content Loaded Over HTTP",
                    technical_detail=f"HTTPS page loads {len(mixed_assets)} script/iframe resource(s) via HTTP: {', '.join(mixed_assets[:3])}",
                    business_impact=(
                        "An attacker on the network can tamper with unencrypted scripts and take full control "
                        "of your website inside the customer's browser."
                    ),
                    general_fix="Change all external <script> and <iframe> src URLs to https://.",
                )
            )
        else:
            checks_passed += 1

    # 3. Safe Sensitive File Exposure Probes (/.env and /.git/HEAD)
    origin_base = f"{response.url.scheme}://{response.url.netloc}/"
    exposed_paths: list[str] = []

    async with httpx.AsyncClient(
        follow_redirects=False,
        timeout=PROBE_TIMEOUT,
        verify=False,
        headers={"User-Agent": USER_AGENT},
    ) as probe_client:
        env_exposed = await _probe_sensitive_path(
            probe_client,
            origin_base,
            "/.env",
            lambda body: bool(ENV_LINE_PATTERN.search(body)),
        )
        if env_exposed:
            exposed_paths.append("/.env")

        git_exposed = await _probe_sensitive_path(
            probe_client,
            origin_base,
            "/.git/HEAD",
            lambda body: "ref: refs/" in body,
        )
        if git_exposed:
            exposed_paths.append("/.git/HEAD")

    if exposed_paths:
        checks_failed += 1
        findings.append(
            make_finding(
                module="surface",
                code="EXPOSED_SENSITIVE_FILE",
                cwe_id="CWE-538",
                owasp_category="A05:2021-Security Misconfiguration",
                severity=Severity.CRITICAL,
                title=f"Publicly Accessible Sensitive File(s): {', '.join(exposed_paths)}",
                technical_detail=f"Confirmed non-HTML signature exposure at: {', '.join(exposed_paths)}",
                business_impact=(
                    "Exposed .env or .git files leak database passwords, API keys, and full source code "
                    "to automated scanners within minutes of deployment."
                ),
                general_fix="Block public HTTP access to hidden dotfiles ('.env', '.git') at the web server level and rotate any exposed keys immediately.",
            )
        )
    else:
        checks_passed += 1

    status = "ok" if checks_failed == 0 else "warning"
    return ScannerResult(
        module="surface",
        summary=ModuleSummary(
            status=status,
            checks_passed=checks_passed,
            checks_failed=checks_failed,
        ),
        findings=findings,
    )