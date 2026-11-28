import asyncio
import dns.exception
import dns.resolver

from app.scanners.base import ScannerResult, make_finding
from app.schemas import FindingSchema, ModuleSummary, Severity
from app.security.ssrf_guard import ValidatedTarget

DNS_TIMEOUT = 3.0
DNS_LIFETIME = 5.0


def _apex_for_email_checks(hostname: str) -> str:
    """Strip leading 'www.' so email/CAA checks query the domain where records are normally published."""
    if hostname.startswith("www.") and hostname.count(".") >= 2:
        return hostname[4:]
    return hostname


def _query_txt_records(resolver: dns.resolver.Resolver, name: str) -> list[str]:
    """Return all TXT records for a DNS name as joined strings, or [] if none exist."""
    try:
        answers = resolver.resolve(name, "TXT")
        records: list[str] = []
        for rdata in answers:
            # Long TXT records are split into quoted chunks; join them cleanly
            joined = "".join(
                chunk.decode("utf-8", errors="ignore") if isinstance(chunk, bytes) else str(chunk)
                for chunk in rdata.strings
            )
            records.append(joined)
        return records
    except (dns.resolver.NXDOMAIN, dns.resolver.NoAnswer):
        return []


def _sync_scan_dns(target: ValidatedTarget) -> ScannerResult:
    findings: list[FindingSchema] = []
    checks_passed = 0
    checks_failed = 0

    resolver = dns.resolver.Resolver(configure=False)
    resolver.nameservers = ["1.1.1.1", "8.8.8.8"]
    resolver.timeout = DNS_TIMEOUT
    resolver.lifetime = DNS_LIFETIME

    domain = _apex_for_email_checks(target.hostname)

    try:
        # 1. SPF Record Check (Sender Policy Framework)
        txt_records = _query_txt_records(resolver, domain)
        spf_records = [r for r in txt_records if r.lower().startswith("v=spf1")]

        if not spf_records:
            checks_failed += 1
            findings.append(
                make_finding(
                    module="dns",
                    code="MISSING_SPF",
                    cwe_id="CWE-290",
                    owasp_category="A05:2021-Security Misconfiguration",
                    severity=Severity.HIGH,
                    title="Missing SPF Email Authentication Record",
                    technical_detail=f"No TXT record starting with 'v=spf1' found on {domain}.",
                    business_impact=(
                        "Anyone on the internet can forge emails claiming to come from your business domain "
                        "(e.g., fake GST invoices or payment-link scams sent to your customers)."
                    ),
                    general_fix=f"Publish a DNS TXT record on {domain} listing authorized mail servers ending with '~all' or '-all'.",
                )
            )
        elif any("+all" in r.lower() for r in spf_records):
            checks_failed += 1
            findings.append(
                make_finding(
                    module="dns",
                    code="PERMISSIVE_SPF",
                    cwe_id="CWE-290",
                    owasp_category="A05:2021-Security Misconfiguration",
                    severity=Severity.HIGH,
                    title="Overly Permissive SPF Record (+all)",
                    technical_detail=f"SPF record on {domain} uses '+all': {spf_records[0]}",
                    business_impact=(
                        "Using '+all' authorizes every mail server in the world to send email as your company, "
                        "completely defeating email spoofing protection."
                    ),
                    general_fix="Replace '+all' with '-all' (hard fail) or '~all' (soft fail) in your SPF TXT record.",
                )
            )
        else:
            checks_passed += 1

        # 2. DMARC Record Check (_dmarc.<domain>)
        dmarc_records = _query_txt_records(resolver, f"_dmarc.{domain}")
        dmarc_valid = [r for r in dmarc_records if r.lower().startswith("v=dmarc1")]

        if not dmarc_valid:
            checks_failed += 1
            findings.append(
                make_finding(
                    module="dns",
                    code="MISSING_DMARC",
                    cwe_id="CWE-290",
                    owasp_category="A05:2021-Security Misconfiguration",
                    severity=Severity.HIGH,
                    title="Missing DMARC Email Policy Record",
                    technical_detail=f"No DMARC TXT record found at _dmarc.{domain}.",
                    business_impact=(
                        "Receiving mail providers (Gmail, Outlook) have no instructions to block or quarantine "
                        "spoofed phishing emails impersonating your business."
                    ),
                    general_fix=f"Add a DNS TXT record at _dmarc.{domain} starting with 'v=DMARC1; p=quarantine;'.",
                )
            )
        elif "p=none" in dmarc_valid[0].lower().replace(" ", ""):
            checks_failed += 1
            findings.append(
                make_finding(
                    module="dns",
                    code="WEAK_DMARC_POLICY",
                    cwe_id="CWE-290",
                    owasp_category="A05:2021-Security Misconfiguration",
                    severity=Severity.MEDIUM,
                    title="DMARC Policy Set to Monitor-Only (p=none)",
                    technical_detail=f"DMARC record at _dmarc.{domain} uses 'p=none': {dmarc_valid[0]}",
                    business_impact=(
                        "Spoofed emails still land in customer inboxes because DMARC is only logging failures "
                        "without quarantining or rejecting them."
                    ),
                    general_fix="Upgrade your DMARC policy from 'p=none' to 'p=quarantine' or 'p=reject' once legitimate senders are verified.",
                )
            )
        else:
            checks_passed += 1

        # 3. CAA Record Check (Certification Authority Authorization)
        try:
            caa_answers = resolver.resolve(domain, "CAA")
            has_caa = len(caa_answers) > 0
        except (dns.resolver.NXDOMAIN, dns.resolver.NoAnswer):
            has_caa = False

        if not has_caa:
            checks_failed += 1
            findings.append(
                make_finding(
                    module="dns",
                    code="MISSING_CAA",
                    cwe_id="CWE-295",
                    owasp_category="A05:2021-Security Misconfiguration",
                    severity=Severity.LOW,
                    title="Missing DNS CAA Record",
                    technical_detail=f"No CAA record published for {domain}.",
                    business_impact=(
                        "Any public Certificate Authority worldwide is permitted to issue SSL certificates for your domain, "
                        "increasing risk if an unrelated CA is compromised."
                    ),
                    general_fix="Publish a DNS CAA record restricting SSL issuance to your chosen provider (e.g., letsencrypt.org).",
                )
            )
        else:
            checks_passed += 1

    except (dns.exception.Timeout, dns.resolver.NoNameservers) as exc:
        return ScannerResult(
            module="dns",
            summary=ModuleSummary(
                status="error",
                checks_passed=checks_passed,
                checks_failed=checks_failed,
                error_message=f"DNS resolution failed or timed out: {type(exc).__name__}",
            ),
            findings=findings,
        )

    status = "ok" if checks_failed == 0 else "warning"
    return ScannerResult(
        module="dns",
        summary=ModuleSummary(
            status=status,
            checks_passed=checks_passed,
            checks_failed=checks_failed,
        ),
        findings=findings,
    )


async def scan_dns(target: ValidatedTarget) -> ScannerResult:
    """Async wrapper offloading blocking dnspython UDP/TCP queries off the event loop."""
    return await asyncio.to_thread(_sync_scan_dns, target)