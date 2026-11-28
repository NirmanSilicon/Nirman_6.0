import ipaddress
import re
import unicodedata
from typing import Dict, List, Optional, Tuple
from urllib.parse import urlparse
import asyncio
from datetime import datetime, timezone
import socket
import ssl
from urllib.parse import urljoin
import dns.resolver
import httpx

from app.schemas import LiveLinkTelemetry
from app.security.ssrf_guard import SSRFError, validate_target_url
from app.schemas import CharacterDiff, LinkCheckResponse, LinkSignal

# Curated registry of high-target Indian banking/gov/UPI and global brands
TRUSTED_BRANDS: List[Dict[str, object]] = [
    {
        "name": "State Bank of India (SBI)",
        "category": "indian_bank",
        "tokens": ["onlinesbi", "sbi", "yonosbi"],
        "official_domains": ["onlinesbi.sbi", "sbi.co.in", "sbi.bank.in", "yonobusiness.sbi"],
    },
    {
        "name": "HDFC Bank",
        "category": "indian_bank",
        "tokens": ["hdfcbank", "hdfc"],
        "official_domains": ["hdfcbank.com", "hdfcbank.bank.in"],
    },
    {
        "name": "ICICI Bank",
        "category": "indian_bank",
        "tokens": ["icicibank", "icici"],
        "official_domains": ["icicibank.com", "icicibank.bank.in"],
    },
    {
        "name": "Axis Bank",
        "category": "indian_bank",
        "tokens": ["axisbank"],
        "official_domains": ["axisbank.com", "axisbank.bank.in"],
    },
    {
        "name": "Punjab National Bank (PNB)",
        "category": "indian_bank",
        "tokens": ["pnbindia", "netpnb"],
        "official_domains": ["pnbindia.in", "pnbindia.bank.in", "netpnb.com"],
    },
    {
        "name": "Reserve Bank of India (RBI)",
        "category": "indian_bank",
        "tokens": ["rbi"],
        "official_domains": ["rbi.org.in"],
    },
    {
        "name": "NPCI / UPI",
        "category": "payments",
        "tokens": ["npci", "bhimupi"],
        "official_domains": ["npci.org.in", "bhimupi.org.in"],
    },
    {
        "name": "UIDAI (Aadhaar)",
        "category": "gov",
        "tokens": ["uidai", "myaadhaar"],
        "official_domains": ["uidai.gov.in", "myaadhaar.uidai.gov.in"],
    },
    {
        "name": "Income Tax India",
        "category": "gov",
        "tokens": ["incometax"],
        "official_domains": ["incometax.gov.in", "incometaxindia.gov.in"],
    },
    {
        "name": "IRCTC",
        "category": "gov",
        "tokens": ["irctc"],
        "official_domains": ["irctc.co.in"],
    },
    {
        "name": "PhonePe",
        "category": "payments",
        "tokens": ["phonepe"],
        "official_domains": ["phonepe.com"],
    },
    {
        "name": "Paytm",
        "category": "payments",
        "tokens": ["paytm"],
        "official_domains": ["paytm.com"],
    },
    {
        "name": "PayPal",
        "category": "payments",
        "tokens": ["paypal"],
        "official_domains": ["paypal.com"],
    },
    {
        "name": "Google",
        "category": "tech",
        "tokens": ["google"],
        "official_domains": ["google.com", "google.co.in", "accounts.google.com"],
    },
    {
        "name": "Amazon",
        "category": "ecommerce",
        "tokens": ["amazon"],
        "official_domains": ["amazon.in", "amazon.com"],
    },
    {
        "name": "Flipkart",
        "category": "ecommerce",
        "tokens": ["flipkart"],
        "official_domains": ["flipkart.com"],
    },
    {
        "name": "Apple",
        "category": "tech",
        "tokens": ["apple", "icloud"],
        "official_domains": ["apple.com", "icloud.com"],
    },
    {
        "name": "Microsoft",
        "category": "tech",
        "tokens": ["microsoft"],
        "official_domains": ["microsoft.com", "login.microsoftonline.com"],
    },
]

# Unicode Cyrillic/Greek -> Latin confusables + classic ASCII visual lookalikes
CONFUSABLE_CHAR_MAP = str.maketrans({
    # Cyrillic lowercase & uppercase lookalikes
    "\u0430": "a", "\u0410": "a",
    "\u0435": "e", "\u0415": "e",
    "\u043e": "o", "\u041e": "o",
    "\u0440": "p", "\u0420": "p",
    "\u0441": "c", "\u0421": "c",
    "\u0445": "x", "\u0425": "x",
    "\u0443": "y", "\u0423": "y",
    "\u0456": "i", "\u0406": "i",
    "\u0455": "s", "\u0405": "s",
    "\u04cf": "i",
    # Greek lookalikes
    "\u03bf": "o", "\u039f": "o",
    "\u03b1": "a", "\u0391": "a",
    "\u03b5": "e", "\u0395": "e",
    "\u03c1": "p", "\u03a1": "p",
    # ASCII lookalike digits & letters
    "0": "o",
    "1": "i",
    "l": "i",
    "5": "s",
    "3": "e",
    "@": "a",
})

DANGEROUS_SCHEMES = {"javascript", "data", "vbscript", "file", "ftp", "gopher", "blob"}
HIGH_RISK_TLDS = {"xyz", "top", "click", "tk", "ml", "ga", "cf", "gq", "buzz", "loan", "work", "vip", "cfd", "sbs"}
PHISHING_KEYWORDS = {
    "kyc", "verify", "verification", "suspend", "suspended", "unlock",
    "update-pan", "pan-update", "otp", "refund", "reward", "claim", "urgent",
    "secure-login", "signin", "blocked", "reactivate",
}
MULTI_PART_TLDS = {"co.in", "gov.in", "org.in", "net.in", "ac.in", "bank.in", "co.uk", "com.au"}


def _to_skeleton(text: str) -> str:
    """Collapse visually confusable characters into a canonical comparison skeleton."""
    s = text.lower().translate(CONFUSABLE_CHAR_MAP)
    s = s.replace("rn", "m").replace("vv", "w")
    return s


def _levenshtein(a: str, b: str) -> int:
    if a == b:
        return 0
    if not a:
        return len(b)
    if not b:
        return len(a)
    prev = list(range(len(b) + 1))
    for i, ca in enumerate(a, start=1):
        curr = [i]
        for j, cb in enumerate(b, start=1):
            cost = 0 if ca == cb else 1
            curr.append(min(curr[-1] + 1, prev[j] + 1, prev[j - 1] + cost))
        prev = curr
    return prev[-1]


def _extract_registrable_parts(hostname: str) -> Tuple[str, str, List[str]]:
    """Return (registrable_domain, primary_label, subdomains) without external PSL libs."""
    parts = [p for p in hostname.strip(".").split(".") if p]
    if len(parts) <= 1:
        return hostname, hostname, []
    last_two = ".".join(parts[-2:])
    if last_two in MULTI_PART_TLDS and len(parts) >= 3:
        reg_domain = ".".join(parts[-3:])
        primary_label = parts[-3]
        subdomains = parts[:-3]
    else:
        reg_domain = last_two
        primary_label = parts[-2]
        subdomains = parts[:-2]
    return reg_domain, primary_label, subdomains


def _decode_idna_hostname(hostname: str) -> Tuple[str, bool, List[str]]:
    """Decode xn-- Punycode labels and detect non-ASCII Unicode scripts."""
    decoded_labels: List[str] = []
    has_punycode = False
    non_latin_scripts: set[str] = set()

    for label in hostname.split("."):
        decoded = label
        if label.lower().startswith("xn--"):
            has_punycode = True
            try:
                decoded = label.encode("ascii").decode("idna")
            except UnicodeError:
                decoded = label
        for ch in decoded:
            if ord(ch) > 127:
                name = unicodedata.name(ch, "NON-ASCII")
                script = name.split()[0]
                non_latin_scripts.add(script)
        decoded_labels.append(decoded)

    return ".".join(decoded_labels), has_punycode, sorted(non_latin_scripts)


def _compute_char_diffs(suspicious_token: str, official_token: str) -> List[CharacterDiff]:
    """Highlight exact character substitutions (e.g., 'l' vs 'i' or Cyrillic 'а' vs Latin 'a')."""
    diffs: List[CharacterDiff] = []
    if len(suspicious_token) == len(official_token):
        for idx, (s_ch, o_ch) in enumerate(zip(suspicious_token, official_token)):
            if s_ch.lower() != o_ch.lower():
                if ord(s_ch) > 127:
                    note = f"{unicodedata.name(s_ch, 'Non-ASCII')} (U+{ord(s_ch):04X}) mimics Latin '{o_ch}'"
                elif s_ch == "l" and o_ch == "i":
                    note = "Lowercase 'l' (L) used to impersonate 'i'/'I'"
                elif s_ch == "1" and o_ch == "i":
                    note = "Digit '1' used to impersonate letter 'i'/'I'"
                elif s_ch == "0" and o_ch == "o":
                    note = "Digit '0' used to impersonate letter 'o'"
                else:
                    note = f"Typed '{s_ch}' instead of official '{o_ch}'"
                diffs.append(
                    CharacterDiff(
                        position=idx,
                        typed_char=s_ch,
                        expected_char=o_ch,
                        explanation=note,
                    )
                )
    return diffs


def _is_official_match(hostname: str, official_domains: List[str]) -> bool:
    h = hostname.lower().rstrip(".")
    for official in official_domains:
        if h == official or h.endswith(f".{official}"):
            return True
    return False


def _blocked_response(raw_url: str, reason: str, code: str) -> LinkCheckResponse:
    return LinkCheckResponse(
        input_url=raw_url,
        normalized_host="",
        decoded_host="",
        verdict="BLOCKED",
        risk_score=100,
        summary="Input rejected by CyberGuard Self-Defense. Never click or execute untrusted internal or script links.",
        matched_brand=None,
        official_domain=None,
        character_diffs=[],
        signals=[
            LinkSignal(
                code=code,
                severity="CRITICAL",
                title="Malicious or Internal Target Rejected (Self-Defense Active)",
                detail=reason,
            )
        ],
    )


def analyze_citizen_link(raw_url: str) -> LinkCheckResponse:
    """Zero-touch static phishing & lookalike analyzer with built-in SSRF/XSS self-defense."""
    cleaned = raw_url.strip()
    if not cleaned or len(cleaned) > 2048:
        return _blocked_response(raw_url, "URL is empty or exceeds the safe 2048-character limit.", "INVALID_LENGTH")

    if any(ord(ch) < 32 for ch in cleaned):
        return _blocked_response(raw_url, "URL contains hidden control characters.", "CONTROL_CHAR_INJECTION")

    # Detect dangerous non-HTTP schemes before prepending https://
    scheme_match = re.match(r"^([a-zA-Z][a-zA-Z0-9+.-]*):", cleaned)
    if scheme_match:
        raw_scheme = scheme_match.group(1).lower()
        if raw_scheme in DANGEROUS_SCHEMES or raw_scheme not in {"http", "https"}:
            return _blocked_response(
                raw_url,
                f"Scheme '{raw_scheme}:' is blocked to prevent script execution (XSS) and local file access.",
                "DANGEROUS_SCHEME_BLOCKED",
            )
        candidate = cleaned
    else:
        candidate = f"https://{cleaned}"

    parsed = urlparse(candidate)
    if not parsed.hostname:
        return _blocked_response(raw_url, "Could not parse a valid domain name from this input.", "INVALID_URL")

    # Preserve original host casing before urlparse lowercases it (catches visual 'SBl' tricks)
    raw_netloc = parsed.netloc
    raw_host_display = raw_netloc.rsplit("@", 1)[-1].split(":", 1)[0].strip("[]")
    hostname_lower = parsed.hostname.lower().rstrip(".")

    # Self-defense: block localhost, internal hostnames, and private/cloud-metadata IPs
    if hostname_lower in {"localhost", "0.0.0.0"} or hostname_lower.endswith((".localhost", ".local", ".internal")):
        return _blocked_response(
            raw_url,
            f"Host '{hostname_lower}' targets a local/internal system and is rejected by CyberGuard's SSRF guard.",
            "SSRF_INTERNAL_HOST_BLOCKED",
        )

    is_raw_ip = False
    try:
        ip_obj = ipaddress.ip_address(hostname_lower)
        is_raw_ip = True
        if ip_obj.version == 6 and ip_obj.ipv4_mapped:
            ip_obj = ip_obj.ipv4_mapped
        if (
            ip_obj.is_private
            or ip_obj.is_loopback
            or ip_obj.is_link_local
            or ip_obj.is_multicast
            or ip_obj.is_reserved
            or ip_obj.is_unspecified
            or not ip_obj.is_global
        ):
            return _blocked_response(
                raw_url,
                f"IP address '{hostname_lower}' is a private, loopback, or cloud metadata address and is blocked.",
                "SSRF_PRIVATE_IP_BLOCKED",
            )
    except ValueError:
        pass

    # --- Static Phishing & Lookalike Inspection ---
    signals: List[LinkSignal] = []
    risk_score = 0
    matched_brand: Optional[str] = None
    official_domain: Optional[str] = None
    char_diffs: List[CharacterDiff] = []

    decoded_host, has_punycode, non_latin_scripts = _decode_idna_hostname(hostname_lower)
    reg_domain, primary_label, subdomains = _extract_registrable_parts(decoded_host)
    _, raw_primary_label, _ = _extract_registrable_parts(raw_host_display)
    tld = decoded_host.rsplit(".", 1)[-1] if "." in decoded_host else ""

    # 1. Check if this is an exact verified official domain (with no @ trick or Punycode spoof)
    if not parsed.username and not has_punycode and not non_latin_scripts and not is_raw_ip:
        for brand in TRUSTED_BRANDS:
            officials = brand["official_domains"]  # type: ignore[assignment]
            if _is_official_match(hostname_lower, officials):
                matched_brand = str(brand["name"])
                official_domain = officials[0]
                if parsed.scheme == "http":
                    signals.append(
                        LinkSignal(
                            code="INSECURE_HTTP_SCHEME",
                            severity="MEDIUM",
                            title="Link Uses Unencrypted HTTP",
                            detail="This domain matches an official brand, but the link starts with http:// instead of https://.",
                        )
                    )
                    return LinkCheckResponse(
                        input_url=raw_url,
                        normalized_host=hostname_lower,
                        decoded_host=decoded_host,
                        verdict="SUSPICIOUS",
                        risk_score=25,
                        summary=f"Domain matches {matched_brand}, but uses unencrypted http://. Always use https://{official_domain}.",
                        matched_brand=matched_brand,
                        official_domain=official_domain,
                        character_diffs=[],
                        signals=signals,
                    )
                return LinkCheckResponse(
                    input_url=raw_url,
                    normalized_host=hostname_lower,
                    decoded_host=decoded_host,
                    verdict="SAFE",
                    risk_score=0,
                    summary=f"Verified official domain for {matched_brand}. No phishing or lookalike indicators detected.",
                    matched_brand=matched_brand,
                    official_domain=official_domain,
                    character_diffs=[],
                    signals=[],
                )

    # 2. '@' Authority Spoofing Trick (e.g., https://onlinesbi.sbi@evil.xyz)
    if parsed.username or "@" in parsed.netloc:
        risk_score += 55
        signals.append(
            LinkSignal(
                code="AT_SYMBOL_DECEPTION",
                severity="CRITICAL",
                title="Deceptive '@' Credential Trick Detected",
                detail=f"Text before '@' is ignored by browsers; this link actually sends you to '{hostname_lower}'.",
            )
        )

    # 3. Punycode / IDN Homograph Attack
    if has_punycode or non_latin_scripts:
        risk_score += 55
        scripts_str = ", ".join(non_latin_scripts) if non_latin_scripts else "Punycode (xn--)"
        signals.append(
            LinkSignal(
                code="IDN_HOMOGRAPH_ATTACK",
                severity="CRITICAL",
                title="Punycode / Fake-Alphabet Lookalike Detected",
                detail=f"Hostname encodes non-Latin characters ({scripts_str}) rendered as '{decoded_host}' to mimic legitimate Latin letters.",
            )
        )

    # 4. Raw Public IP as Website Link
    if is_raw_ip:
        risk_score += 45
        signals.append(
            LinkSignal(
                code="RAW_IP_HOST",
                severity="HIGH",
                title="Direct IP Address Used Instead of Domain Name",
                detail="Legitimate banks and major businesses never ask customers to log in via a raw IP address.",
            )
        )

    # 5. Brand Lookalike, Homoglyph & Subdomain Impersonation Check
    primary_skeleton = _to_skeleton(primary_label)
    hyphen_parts = [p for p in re.split(r"[-_]", primary_label) if p]
    hyphen_skeletons = [_to_skeleton(p) for p in hyphen_parts]
    subdomain_text = ".".join(subdomains)
    subdomain_skeleton = _to_skeleton(subdomain_text)

    if not is_raw_ip:
        for brand in TRUSTED_BRANDS:
            officials = brand["official_domains"]  # type: ignore[assignment]
            if _is_official_match(decoded_host, officials):
                continue

            brand_name = str(brand["name"])
            tokens: List[str] = brand["tokens"]  # type: ignore[assignment]
            brand_matched_here = False

            for token in tokens:
                token_skeleton = _to_skeleton(token)

                # Case A: Exact skeleton collision (e.g., 'sbl' -> 'sbi', 'onlinesbl' -> 'onlinesbi', 'аpple' -> 'apple')
                if primary_skeleton == token_skeleton and primary_label != token:
                    brand_matched_here = True
                    risk_score += 65
                    matched_brand = brand_name
                    official_domain = officials[0]
                    char_diffs = _compute_char_diffs(raw_primary_label, token)
                    signals.append(
                        LinkSignal(
                            code="HOMOGLYPH_LOOKALIKE_SPOOF",
                            severity="CRITICAL",
                            title=f"Lookalike Domain Impersonating {brand_name}",
                            detail=(
                                f"'{raw_primary_label}' visually mimics '{token}', but '{reg_domain}' is NOT an official "
                                f"{brand_name} domain (official: {official_domain})."
                            ),
                        )
                    )
                    break

                # Case B: Exact brand token used on wrong TLD/domain (e.g., sbi.xyz, onlinesbi-kyc.com, sbl-verify.in)
                if token_skeleton in hyphen_skeletons or (len(token) >= 4 and token_skeleton in primary_skeleton):
                    brand_matched_here = True
                    risk_score += 55
                    matched_brand = brand_name
                    official_domain = officials[0]
                    # Check if one of the hyphen segments was a homoglyph like 'sbl' in 'sbl-kyc.xyz'
                    for raw_seg, seg_skel in zip(re.split(r"[-_]", raw_primary_label), hyphen_skeletons):
                        if seg_skel == token_skeleton and raw_seg.lower() != token:
                            char_diffs = _compute_char_diffs(raw_seg, token)
                            break
                    signals.append(
                        LinkSignal(
                            code="BRAND_DOMAIN_IMPERSONATION",
                            severity="CRITICAL",
                            title=f"Unauthorized Domain Using {brand_name} Name",
                            detail=(
                                f"'{reg_domain}' uses '{brand_name}' branding on an unverified domain. "
                                f"Official domain is '{official_domain}'."
                            ),
                        )
                    )
                    break

                # Case C: Close typosquatting (edit distance 1 on tokens of length >= 5, e.g. 'hdfcbnk', 'paypall')
                if len(token) >= 5 and _levenshtein(primary_skeleton, token_skeleton) == 1:
                    brand_matched_here = True
                    risk_score += 55
                    matched_brand = brand_name
                    official_domain = officials[0]
                    char_diffs = _compute_char_diffs(raw_primary_label, token)
                    signals.append(
                        LinkSignal(
                            code="TYPOSQUATTING_DETECTED",
                            severity="CRITICAL",
                            title=f"Typosquatting Link Targeting {brand_name}",
                            detail=(
                                f"'{reg_domain}' is 1 character away from '{token}'. "
                                f"Verify you meant '{official_domain}'."
                            ),
                        )
                    )
                    break

                # Case D: Brand hidden inside a fake subdomain (e.g., onlinesbi.sbi.kyc-update.xyz)
                if len(token) >= 3 and (token in subdomain_text.split(".") or token_skeleton in re.split(r"[.-]", subdomain_skeleton)):
                    brand_matched_here = True
                    risk_score += 55
                    matched_brand = brand_name
                    official_domain = officials[0]
                    signals.append(
                        LinkSignal(
                            code="SUBDOMAIN_BRAND_SPOOF",
                            severity="CRITICAL",
                            title=f"Fake Subdomain Impersonating {brand_name}",
                            detail=(
                                f"This link puts '{token}' in a subdomain, but the actual website controlling it is "
                                f"'{reg_domain}', not '{official_domain}'."
                            ),
                        )
                    )
                    break

            if brand_matched_here:
                if brand["category"] == "indian_bank" and not reg_domain.endswith(".bank.in"):
                    signals.append(
                        LinkSignal(
                            code="RBI_BANK_IN_MISMATCH",
                            severity="HIGH",
                            title="Not on an Official RBI '.bank.in' or Verified Bank Domain",
                            detail=(
                                "Under RBI's domain security mandate, authentic Indian banks operate on verified "
                                "'.bank.in' or officially published bank domains—never third-party lookalikes."
                            ),
                        )
                    )
                break

    # 6. High-abuse TLD check
    if tld in HIGH_RISK_TLDS:
        risk_score += 20
        signals.append(
            LinkSignal(
                code="HIGH_RISK_TLD",
                severity="MEDIUM",
                title=f"Suspicious Top-Level Domain (.{tld})",
                detail=f"The '.{tld}' extension is heavily abused in phishing and fake KYC campaigns.",
            )
        )

    # 7. Phishing urgency keywords in domain/path
    full_lower = f"{decoded_host}{parsed.path}".lower()
    hit_keywords = [kw for kw in PHISHING_KEYWORDS if kw in full_lower]
    if hit_keywords:
        risk_score += 15
        signals.append(
            LinkSignal(
                code="PHISHING_URGENCY_KEYWORDS",
                severity="MEDIUM",
                title="Urgent Account/KYC Lure Keywords Detected",
                detail=f"URL contains common scam lure terms: {', '.join(hit_keywords[:4])}.",
            )
        )

    # 8. Unencrypted HTTP scheme
    if parsed.scheme == "http":
        risk_score += 15
        signals.append(
            LinkSignal(
                code="UNENCRYPTED_HTTP",
                severity="MEDIUM",
                title="Link Does Not Use HTTPS Encryption",
                detail="Plain http:// links transmit entered passwords or OTPs without encryption.",
            )
        )

    # 9. Excessive subdomain nesting
    if len(subdomains) >= 3:
        risk_score += 15
        signals.append(
            LinkSignal(
                code="EXCESSIVE_SUBDOMAINS",
                severity="LOW",
                title="Unusually Deep Subdomain Structure",
                detail=f"URL nests {len(subdomains)} subdomains to obscure the true destination '{reg_domain}'.",
            )
        )

    risk_score = min(100, risk_score)
    if risk_score >= 55:
        verdict = "DANGEROUS"
        summary = (
            f"High-confidence phishing/scam link targeting {matched_brand}. Do NOT click or enter credentials."
            if matched_brand
            else "High-risk deceptive link detected. Do NOT open or enter sensitive information."
        )
    elif risk_score >= 20:
        verdict = "SUSPICIOUS"
        summary = "Suspicious indicators found. Verify the sender through an official phone number or app before opening."
    else:
        verdict = "SAFE"
        summary = "No phishing, homoglyph, or lookalike patterns detected in this URL structure."

    return LinkCheckResponse(
        input_url=raw_url,
        normalized_host=hostname_lower,
        decoded_host=decoded_host,
        verdict=verdict,
        risk_score=risk_score,
        summary=summary,
        matched_brand=matched_brand,
        official_domain=official_domain,
        character_diffs=char_diffs,
        signals=signals,
    )
def _build_recommendations(
    verdict: str,
    matched_brand: Optional[str],
    official_domain: Optional[str],
    telemetry: Optional[LiveLinkTelemetry],
) -> List[str]:
    recs: List[str] = []
    if verdict == "BLOCKED":
        return [
            "Do not open, copy, or run this link — it targets a local/internal system or contains an executable script scheme.",
            "Report the message as malicious if it arrived via email, SMS, or WhatsApp.",
        ]

    if verdict == "DANGEROUS":
        recs.append("Do NOT click this link, enter passwords, or share any OTP/KYC details.")
        if matched_brand and official_domain:
            recs.append(
                f"To access {matched_brand} safely, close this message and type https://{official_domain} manually in your browser."
            )
        if telemetry and telemetry.domain_age_days is not None and telemetry.domain_age_days < 30:
            recs.append(
                f"This domain was registered only {telemetry.domain_age_days} day(s) ago — a strong indicator of a throwaway scam site."
            )
        recs.append("Block the sender and report suspected Indian cyber fraud at cybercrime.gov.in or helpline 1930.")
    elif verdict == "SUSPICIOUS":
        recs.append("Avoid signing in or entering financial details until you independently confirm the sender.")
        if official_domain:
            recs.append(f"Prefer navigating directly to https://{official_domain} instead of following emailed links.")
        if telemetry and telemetry.tls_valid is False:
            recs.append("The site failed HTTPS certificate validation — never transmit sensitive data over an untrusted connection.")
    else:
        recs.append("No phishing, homoglyph, or high-risk domain indicators were detected.")
        recs.append("Still verify the browser address bar shows HTTPS and the exact domain before entering credentials.")
    return recs


async def _unshorten_safely(start_url: str, max_hops: int = 4) -> Tuple[str, List[str], Optional[str]]:
    """Follow HEAD redirects safely while checking every hop with ssrf_guard."""
    chain: List[str] = [start_url]
    current = start_url

    async with httpx.AsyncClient(
        follow_redirects=False,
        timeout=httpx.Timeout(3.5, connect=2.5),
        headers={"User-Agent": "CyberGuard-LinkShield/1.0"},
    ) as client:
        for _ in range(max_hops):
            try:
                await asyncio.to_thread(validate_target_url, current)
            except SSRFError as exc:
                return current, chain, str(exc)

            try:
                resp = await client.head(current)
            except httpx.HTTPError:
                break

            if resp.status_code in {301, 302, 303, 307, 308} and "location" in resp.headers:
                next_url = urljoin(current, resp.headers["location"].strip())
                try:
                    await asyncio.to_thread(validate_target_url, next_url)
                except SSRFError as exc:
                    chain.append(next_url)
                    return next_url, chain, f"Redirect attempted to pivot to a blocked target: {exc}"
                chain.append(next_url)
                current = next_url
            else:
                break

    return current, chain, None


def _sync_dns_check(hostname: str) -> bool:
    resolver = dns.resolver.Resolver()
    resolver.lifetime = 2.5
    resolver.timeout = 2.0
    for rtype in ("A", "AAAA"):
        try:
            answers = resolver.resolve(hostname, rtype)
            if answers:
                return True
        except Exception:
            continue
    return False


async def _fetch_rdap_age(reg_domain: str) -> Tuple[Optional[int], Optional[str]]:
    """Query public RDAP bootstrap (RFC 9083) to compute live domain age in days."""
    try:
        ascii_domain = reg_domain.encode("idna").decode("ascii")
    except UnicodeError:
        return None, None

    url = f"https://rdap.org/domain/{ascii_domain}"
    try:
        async with httpx.AsyncClient(
            follow_redirects=True,
            timeout=httpx.Timeout(4.0, connect=2.5),
            headers={"Accept": "application/rdap+json", "User-Agent": "CyberGuard-LinkShield/1.0"},
        ) as client:
            resp = await client.get(url)
            if resp.status_code != 200:
                return None, None
            data = resp.json()
    except Exception:
        return None, None

    for event in data.get("events", []):
        if str(event.get("eventAction", "")).lower() == "registration":
            raw_date = str(event.get("eventDate", "")).strip()
            if not raw_date:
                continue
            try:
                dt = datetime.fromisoformat(raw_date.replace("Z", "+00:00"))
                if dt.tzinfo is None:
                    dt = dt.replace(tzinfo=timezone.utc)
                age_days = max(0, (datetime.now(timezone.utc) - dt).days)
                return age_days, dt.strftime("%Y-%m-%d")
            except ValueError:
                continue
    return None, None


def _sync_tls_check(hostname: str) -> Tuple[Optional[bool], Optional[str]]:
    """Perform a zero-body TLS handshake on port 443 to inspect certificate trust."""
    ctx = ssl.create_default_context()
    try:
        with socket.create_connection((hostname, 443), timeout=3.0) as raw_sock:
            with ctx.wrap_socket(raw_sock, server_hostname=hostname) as tls_sock:
                cert = tls_sock.getpeercert() or {}
                issuer_parts = dict(x[0] for x in cert.get("issuer", []))
                issuer = issuer_parts.get("organizationName") or issuer_parts.get("commonName") or "Trusted CA"
                return True, str(issuer)
    except ssl.SSLCertVerificationError:
        return False, "Untrusted / Mismatched / Expired Certificate"
    except Exception:
        return None, None


async def analyze_citizen_link_live(raw_url: str) -> LinkCheckResponse:
    """Full dynamic link analysis: static + SSRF-safe redirects + RDAP age + live DNS + TLS."""
    base_result = analyze_citizen_link(raw_url)
    if base_result.verdict == "BLOCKED":
        return base_result.model_copy(
            update={"recommendations": _build_recommendations("BLOCKED", None, None, None)}
        )

    cleaned = raw_url.strip()
    start_url = cleaned if re.match(r"^https?://", cleaned, re.IGNORECASE) else f"https://{cleaned}"

    final_url, redirect_chain, redirect_block_err = await _unshorten_safely(start_url)
    if redirect_block_err:
        blocked = _blocked_response(raw_url, redirect_block_err, "REDIRECT_SSRF_BLOCKED")
        return blocked.model_copy(
            update={
                "live_telemetry": LiveLinkTelemetry(redirect_chain=redirect_chain, final_url=final_url),
                "recommendations": _build_recommendations("BLOCKED", None, None, None),
            }
        )

    # If redirected to a different destination, re-run static phishing analysis on the final URL too
    active_result = base_result
    signals = list(base_result.signals)
    risk_score = base_result.risk_score

    if len(redirect_chain) > 1 and final_url != start_url:
        final_static = analyze_citizen_link(final_url)
        if final_static.verdict == "BLOCKED":
            return final_static.model_copy(
                update={
                    "live_telemetry": LiveLinkTelemetry(redirect_chain=redirect_chain, final_url=final_url),
                    "recommendations": _build_recommendations("BLOCKED", None, None, None),
                }
            )
        final_host = urlparse(final_url).hostname or ""
        if final_host.lower() != base_result.normalized_host.lower():
            signals.append(
                LinkSignal(
                    code="CROSS_DOMAIN_REDIRECT",
                    severity="MEDIUM",
                    title="Link Redirects to a Different Domain",
                    detail=f"Original host '{base_result.normalized_host}' redirects through {len(redirect_chain) - 1} hop(s) to '{final_host}'.",
                )
            )
            risk_score += 15
        if final_static.risk_score > risk_score:
            active_result = final_static
            risk_score = max(risk_score, final_static.risk_score)
            existing_codes = {s.code for s in signals}
            for sig in final_static.signals:
                if sig.code not in existing_codes:
                    signals.append(sig)

    target_host = active_result.normalized_host
    reg_domain, _, _ = _extract_registrable_parts(target_host)

    # Run DNS, RDAP domain age, and TLS checks concurrently
    dns_resolved, (age_days, registered_on), (tls_valid, tls_issuer) = await asyncio.gather(
        asyncio.to_thread(_sync_dns_check, target_host),
        _fetch_rdap_age(reg_domain),
        asyncio.to_thread(_sync_tls_check, target_host),
    )

    # Score live threat signals (skip age penalty for already-verified official domains)
    is_verified_official = active_result.verdict == "SAFE" and active_result.matched_brand is not None

    if dns_resolved is False:
        signals.append(
            LinkSignal(
                code="DNS_UNRESOLVED",
                severity="MEDIUM",
                title="Domain Does Not Resolve in Live DNS",
                detail=f"'{target_host}' has no active A/AAAA DNS records (it may be fake, unregistered, or already taken down).",
            )
        )
        if not is_verified_official:
            risk_score += 20

    if age_days is not None and not is_verified_official:
        if age_days < 30:
            risk_score += 35
            signals.append(
                LinkSignal(
                    code="NEWLY_REGISTERED_DOMAIN",
                    severity="HIGH",
                    title=f"Newly Registered Domain ({age_days} Days Old)",
                    detail=f"RDAP registry records show '{reg_domain}' was created on {registered_on}. Most phishing campaigns use fresh domains under 30 days old.",
                )
            )
        elif age_days < 90:
            risk_score += 15
            signals.append(
                LinkSignal(
                    code="YOUNG_DOMAIN",
                    severity="MEDIUM",
                    title=f"Recently Registered Domain ({age_days} Days Old)",
                    detail=f"RDAP registry records show '{reg_domain}' was created on {registered_on}. Exercise caution before trusting unfamiliar sites.",
                )
            )

    if tls_valid is False:
        risk_score += 30
        signals.append(
            LinkSignal(
                code="INVALID_TLS_CERTIFICATE",
                severity="HIGH",
                title="HTTPS Certificate Failed Validation",
                detail="The destination server presented an expired, self-signed, or mismatched SSL/TLS certificate.",
            )
        )

    risk_score = min(100, risk_score)
    if risk_score >= 55:
        verdict = "DANGEROUS"
        summary = (
            f"High-confidence phishing/scam link targeting {active_result.matched_brand}. Do NOT click or enter credentials."
            if active_result.matched_brand
            else "High-risk deceptive link detected via lexical and live intelligence checks. Do NOT open."
        )
    elif risk_score >= 20:
        verdict = "SUSPICIOUS"
        summary = "Suspicious indicators detected during live verification. Confirm with the sender via an official channel before opening."
    else:
        verdict = "SAFE"
        summary = active_result.summary

    telemetry = LiveLinkTelemetry(
        dns_resolved=dns_resolved,
        domain_age_days=age_days,
        registered_on=registered_on,
        tls_valid=tls_valid,
        tls_issuer=tls_issuer,
        redirect_chain=redirect_chain if len(redirect_chain) > 1 else [],
        final_url=final_url if len(redirect_chain) > 1 else None,
    )

    return active_result.model_copy(
        update={
            "verdict": verdict,
            "risk_score": risk_score,
            "summary": summary,
            "signals": signals,
            "live_telemetry": telemetry,
            "recommendations": _build_recommendations(
                verdict, active_result.matched_brand, active_result.official_domain, telemetry
            ),
        }
    )