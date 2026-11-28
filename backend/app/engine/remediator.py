from pathlib import Path
from typing import Dict, List, Tuple
from jinja2 import Environment, FileSystemLoader

from app.schemas import FindingSchema, PatchBundle

TEMPLATES_DIR = Path(__file__).resolve().parent.parent / "templates"

_jinja_env = Environment(
    loader=FileSystemLoader(str(TEMPLATES_DIR)),
    autoescape=False,      # Generating server config text, not HTML
    trim_blocks=True,      # Remove trailing newline after {% ... %} tags
    lstrip_blocks=True,    # Strip leading spaces before {% ... %} tags
)

# Per-finding copyable fixes (mapped strictly by machine-readable finding.code)
PER_FINDING_SNIPPETS: Dict[str, Dict[str, str]] = {
    "MISSING_HSTS": {
        "nginx": 'add_header Strict-Transport-Security "max-age=31536000; includeSubDomains" always;',
        "apache": 'Header always set Strict-Transport-Security "max-age=31536000; includeSubDomains"',
    },
    "WEAK_HSTS": {
        "nginx": 'add_header Strict-Transport-Security "max-age=31536000; includeSubDomains" always;',
        "apache": 'Header always set Strict-Transport-Security "max-age=31536000; includeSubDomains"',
    },
    "MISSING_CSP": {
        "nginx": 'add_header Content-Security-Policy "default-src \'self\'; object-src \'none\'; frame-ancestors \'self\';" always;',
        "apache": 'Header always set Content-Security-Policy "default-src \'self\'; object-src \'none\'; frame-ancestors \'self\';"',
    },
    "MISSING_X_FRAME_OPTIONS": {
        "nginx": 'add_header X-Frame-Options "SAMEORIGIN" always;',
        "apache": 'Header always set X-Frame-Options "SAMEORIGIN"',
    },
    "MISSING_X_CONTENT_TYPE_OPTIONS": {
        "nginx": 'add_header X-Content-Type-Options "nosniff" always;',
        "apache": 'Header always set X-Content-Type-Options "nosniff"',
    },
    "MISSING_REFERRER_POLICY": {
        "nginx": 'add_header Referrer-Policy "strict-origin-when-cross-origin" always;',
        "apache": 'Header always set Referrer-Policy "strict-origin-when-cross-origin"',
    },
    "SERVER_BANNER_LEAK": {
        "nginx": "server_tokens off;",
        "apache": "ServerTokens Prod\nServerSignature Off\nHeader always unset X-Powered-By",
    },
    "EXPOSED_SENSITIVE_FILE": {
        "nginx": "location ~ /\\.(?!well-known).* {\n    deny all;\n    return 404;\n}",
        "apache": '<FilesMatch "^\\.(env|git)">\n    Require all denied\n</FilesMatch>',
    },
    "DEPRECATED_TLS": {
        "nginx": "ssl_protocols TLSv1.2 TLSv1.3;",
        "apache": "SSLProtocol all -SSLv3 -TLSv1 -TLSv1.1",
    },
    "NO_HTTPS_REDIRECT": {
        "nginx": "return 301 https://$host$request_uri;",
        "apache": "RewriteEngine On\nRewriteCond %{HTTPS} !=on\nRewriteRule ^ https://%{HTTP_HOST}%{REQUEST_URI} [L,R=301]",
    },
    "MISSING_SPF": {
        "dns": "TXT @  ->  v=spf1 include:_spf.google.com ~all",
    },
    "PERMISSIVE_SPF": {
        "dns": "TXT @  ->  v=spf1 include:_spf.google.com -all",
    },
    "MISSING_DMARC": {
        "dns": "TXT _dmarc  ->  v=DMARC1; p=quarantine; pct=100; rua=mailto:security@{domain}",
    },
    "WEAK_DMARC_POLICY": {
        "dns": "TXT _dmarc  ->  v=DMARC1; p=quarantine; pct=100; rua=mailto:security@{domain}",
    },
    "MISSING_CAA": {
        "dns": 'CAA @  ->  0 issue "letsencrypt.org"',
    },
}

NGINX_RELEVANT_CODES = {
    "SERVER_BANNER_LEAK", "MISSING_HSTS", "WEAK_HSTS", "MISSING_CSP",
    "MISSING_X_FRAME_OPTIONS", "MISSING_X_CONTENT_TYPE_OPTIONS",
    "MISSING_REFERRER_POLICY", "EXPOSED_SENSITIVE_FILE",
    "DEPRECATED_TLS", "NO_HTTPS_REDIRECT",
}
DNS_RELEVANT_CODES = {
    "MISSING_SPF", "PERMISSIVE_SPF", "MISSING_DMARC", "WEAK_DMARC_POLICY", "MISSING_CAA",
}


def enrich_and_generate_patches(
    domain: str,
    findings: List[FindingSchema],
) -> Tuple[List[FindingSchema], PatchBundle]:
    """Attach per-finding Nginx/Apache/DNS fixes and render complete Jinja2 hardening bundles."""
    clean_domain = domain[4:] if domain.startswith("www.") and domain.count(".") >= 2 else domain
    enriched: List[FindingSchema] = []
    codes = {f.code for f in findings}

    for finding in findings:
        snippet_map = PER_FINDING_SNIPPETS.get(finding.code, {})
        updated_remediation = finding.remediation.model_copy(
            update={
                "nginx": snippet_map.get("nginx"),
                "apache": snippet_map.get("apache"),
                "dns": (
                    snippet_map["dns"].format(domain=clean_domain)
                    if "dns" in snippet_map
                    else None
                ),
            }
        )
        enriched.append(finding.model_copy(update={"remediation": updated_remediation}))

    has_server_fixes = bool(codes & NGINX_RELEVANT_CODES)
    has_dns_fixes = bool(codes & DNS_RELEVANT_CODES)

    nginx_bundle = (
        _jinja_env.get_template("nginx.conf.j2").render(domain=clean_domain, codes=codes).strip()
        if has_server_fixes
        else f"# No Nginx configuration changes required for {clean_domain}."
    )
    apache_bundle = (
        _jinja_env.get_template("apache.htaccess.j2").render(domain=clean_domain, codes=codes).strip()
        if has_server_fixes
        else f"# No Apache .htaccess changes required for {clean_domain}."
    )
    dns_bundle = (
        _jinja_env.get_template("dns_records.txt.j2").render(domain=clean_domain, codes=codes).strip()
        if has_dns_fixes
        else f"# No DNS security record changes required for {clean_domain}."
    )

    return enriched, PatchBundle(nginx=nginx_bundle, apache=apache_bundle, dns=dns_bundle)