import re
import sys
import warnings
from pathlib import Path
from urllib.parse import urlparse

import joblib
import pandas as pd

warnings.filterwarnings("ignore", message="X does not have valid feature names")

BASE_DIR = Path(__file__).resolve().parent.parent
ML_DIR = BASE_DIR / "ml-model"
if str(ML_DIR) not in sys.path:
    sys.path.append(str(ML_DIR))

from features import PROTECTED_BRANDS, extract_features

MODEL_PATH = ML_DIR / "phishing_lgbm_pipeline.joblib"
pipeline = joblib.load(MODEL_PATH)

OFFICIAL_DOMAINS = {
    d for domains in PROTECTED_BRANDS.values() for d in domains
} | {"google.com", "github.com", "amazon.in", "flipkart.com", "uidai.gov.in"}

SHORTENER_DOMAINS = {
    "bit.ly", "tinyurl.com", "t.co", "goo.gl", "ow.ly",
    "is.gd", "buff.ly", "cutt.ly", "rb.gy", "shorturl.at"
}

# Domains in Tranco that scammers frequently abuse for free phishing pages/forms
UNTRUSTED_SHARED_HOSTS = SHORTENER_DOMAINS | {
    "forms.gle", "sites.google.com", "docs.google.com",
    "blogspot.com", "wordpress.com", "github.io", "firebaseapp.com", "web.app"
}

# Load Tranco top domains if available
TRANCO_PATH = Path(__file__).resolve().parent / "tranco_top.txt"
TRANCO_DOMAINS = set()
if TRANCO_PATH.exists():
    TRANCO_DOMAINS = {
        line.strip().lower()
        for line in TRANCO_PATH.read_text(encoding="utf-8").splitlines()
        if line.strip() and line.strip().lower() not in UNTRUSTED_SHARED_HOSTS
    }

URL_REGEX = re.compile(
    r"(?:https?://)?(?:www\.)?[a-zA-Z0-9-]+\.[a-zA-Z]{2,}(?:/[^\s]*)?"
)


def is_official_domain(hostname: str) -> bool:
    if hostname in UNTRUSTED_SHARED_HOSTS:
        return False
    if hostname.endswith((".gov.in", ".nic.in")):
        return True
    if any(hostname == d or hostname.endswith("." + d) for d in OFFICIAL_DOMAINS):
        return True
    # Match exact Tranco domain or its www. variant
    bare = hostname[4:] if hostname.startswith("www.") else hostname
    return bare in TRANCO_DOMAINS

def scan_url(url: str, threshold: float = 0.65) -> dict:
    raw = str(url).strip().rstrip(".,!?)")
    url_for_parse = raw if raw.startswith(("http://", "https://")) else "http://" + raw
    hostname = (urlparse(url_for_parse).hostname or "").lower()

    # Layer 1: Verified official / govt domain allowlist
    if is_official_domain(hostname):
        return {
            "url": raw,
            "verdict": "SAFE",
            "phishing_prob": 0.0,
            "red_flags": [],
        }

    # Layer 2: ML model on normalized URL
    cleaned = re.sub(r"^https?://", "", raw, flags=re.IGNORECASE)
    feats = extract_features(cleaned)
    row = pd.DataFrame([feats])
    row["URL"] = cleaned

    prob = float(pipeline.predict_proba(row)[0, 1])

    flags = []
    is_shortener = hostname in SHORTENER_DOMAINS
    if is_shortener:
        flags.append("Uses a URL shortener (destination hidden)")
    if feats["brand_spoof"]:
        flags.append("Impersonates a protected Indian brand")
    if feats["has_suspicious_tld"]:
        flags.append("Uses a high-risk TLD")
    if feats["has_ip"]:
        flags.append("Uses a raw IP address instead of a domain")
    if feats["action_keyword_count"] > 0:
        flags.append(f"Contains {feats['action_keyword_count']} urgent/action keyword(s)")
    if feats["has_at_symbol"]:
        flags.append("Contains '@' redirect trick")

    if prob >= threshold:
        verdict = "PHISHING"
    elif is_shortener:
        verdict = "SUSPICIOUS"
    else:
        verdict = "LEGITIMATE"

    return {
        "url": raw,
        "verdict": verdict,
        "phishing_prob": round(prob * 100, 2),
        "red_flags": flags,
    }


def scan_text(text: str) -> dict:
    """Extracts all URLs from a message or raw URL input and scans each one."""
    urls = URL_REGEX.findall(text)
    if not urls:
        return {
            "found_urls": False,
            "message": "No URL found in the text.",
            "results": [],
        }
    return {
        "found_urls": True,
        "results": [scan_url(u) for u in urls],
    }


if __name__ == "__main__":
    # Quick local sanity check
    print(scan_text("Your SBI KYC is pending, update now at https://sbi-kyc-verify.xyz/login"))