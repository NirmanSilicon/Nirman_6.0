import asyncio
from dataclasses import dataclass
from urllib.parse import urljoin
import httpx

from app.schemas import FindingSchema, ModuleSummary, RemediationSnippets, Severity
from app.security.ssrf_guard import SSRFError, ValidatedTarget, validate_target_url

USER_AGENT = "CyberGuard-MSME-Auditor/0.1 (Passive Security Health Check)"
DEFAULT_TIMEOUT = 8.0
MAX_REDIRECTS = 5


@dataclass
class ScannerResult:
    module: str
    summary: ModuleSummary
    findings: list[FindingSchema]


def make_finding(
    *,
    module: str,
    code: str,
    cwe_id: str,
    owasp_category: str,
    severity: Severity,
    title: str,
    technical_detail: str,
    business_impact: str,
    general_fix: str,
) -> FindingSchema:
    """Factory helper so every scanner produces a uniform FindingSchema without boilerplate."""
    return FindingSchema(
        module=module,
        code=code,
        cwe_id=cwe_id,
        owasp_category=owasp_category,
        severity=severity,
        title=title,
        technical_detail=technical_detail,
        business_impact=business_impact,
        remediation=RemediationSnippets(general=general_fix),
    )


async def safe_get(
    url: str,
    *,
    timeout: float = DEFAULT_TIMEOUT,
    verify_ssl: bool = False,
) -> httpx.Response:
    """Perform an HTTP GET while validating every redirect hop against SSRF."""
    current_url = url
    headers = {"User-Agent": USER_AGENT}

    async with httpx.AsyncClient(
        follow_redirects=False,
        timeout=timeout,
        verify=verify_ssl,
        headers=headers,
    ) as client:
        for _ in range(MAX_REDIRECTS + 1):
            response = await client.get(current_url)

            if response.is_redirect and "location" in response.headers:
                next_url = urljoin(str(response.url), response.headers["location"])
                # Re-validate every redirect target so 302s cannot pivot to internal IPs
                validated_next = await asyncio.to_thread(validate_target_url, next_url)
                current_url = validated_next.normalized_url
                continue

            return response

    raise SSRFError(f"Exceeded maximum redirect limit ({MAX_REDIRECTS}).")