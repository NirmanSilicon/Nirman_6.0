from app.engine.remediator import enrich_and_generate_patches
from app.engine.scorer import calculate_score, sort_findings
from app.scanners.base import make_finding
from app.schemas import Severity


def _dummy_finding(code: str, severity: Severity, module: str = "headers"):
    return make_finding(
        module=module,
        code=code,
        cwe_id="CWE-693",
        owasp_category="A05:2021-Security Misconfiguration",
        severity=severity,
        title=f"Test {code}",
        technical_detail="Observed in test",
        business_impact="Test impact",
        general_fix="General fix",
    )


def test_perfect_score_when_no_findings():
    score, grade = calculate_score([])
    assert score == 100
    assert grade == "A"


def test_weighted_scoring_and_zero_floor():
    findings = [
        _dummy_finding("SSL_CERT_INVALID", Severity.CRITICAL, "tls"),  # -25
        _dummy_finding("MISSING_HSTS", Severity.HIGH),                 # -15
        _dummy_finding("MISSING_CSP", Severity.MEDIUM),                # -8
        _dummy_finding("MISSING_CAA", Severity.LOW, "dns"),            # -3
    ]
    score, grade = calculate_score(findings)
    assert score == 49  # 100 - (25 + 15 + 8 + 3)
    assert grade == "F"

    # Ensure extreme penalties clamp at 0, never negative
    many_criticals = [_dummy_finding("SSL_CERT_INVALID", Severity.CRITICAL)] * 6
    low_score, low_grade = calculate_score(many_criticals)
    assert low_score == 0
    assert low_grade == "F"


def test_sort_findings_orders_critical_first():
    findings = [
        _dummy_finding("MISSING_CAA", Severity.LOW, "dns"),
        _dummy_finding("SSL_CERT_INVALID", Severity.CRITICAL, "tls"),
        _dummy_finding("MISSING_HSTS", Severity.HIGH),
    ]
    ordered = sort_findings(findings)
    assert [f.severity for f in ordered] == [Severity.CRITICAL, Severity.HIGH, Severity.LOW]


def test_remediator_renders_only_needed_directives():
    findings = [
        _dummy_finding("MISSING_HSTS", Severity.HIGH, "headers"),
        _dummy_finding("MISSING_DMARC", Severity.HIGH, "dns"),
    ]
    enriched, bundle = enrich_and_generate_patches("www.myshop.in", findings)

    # Per-finding snippets populated
    assert "Strict-Transport-Security" in (enriched[0].remediation.nginx or "")
    assert "security@myshop.in" in (enriched[1].remediation.dns or "")

    # Jinja2 bundles include failed checks and EXCLUDE unrelated checks
    assert "Strict-Transport-Security" in bundle.nginx
    assert "deny all;" not in bundle.nginx  # EXPOSED_SENSITIVE_FILE was NOT in findings!
    assert "v=DMARC1; p=quarantine" in bundle.dns
    assert "myshop.in" in bundle.dns