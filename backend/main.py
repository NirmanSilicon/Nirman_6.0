import sys
from pathlib import Path

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel

BASE_DIR = Path(__file__).resolve().parent.parent
for folder in ("threat-intelligence", "voice-guidance", "database"):
    folder_path = str(BASE_DIR / folder)
    if folder_path not in sys.path:
        sys.path.append(folder_path)

from mysql_config import get_mysql_status
from guidance import get_guidance_for_language
from text_scanner import scan_message_text
from url_scanner import scan_text as scan_urls_in_text

app = FastAPI(title="SATARK-SETU API", version="2.1.0")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


class CheckRequest(BaseModel):
    text: str
    language: str = "en"


@app.get("/")
def health_check():
    return {
        "status": "online",
        "service": "SATARK-SETU Fraud Detector (Text + URL + Multilingual Guidance)",
        "database": get_mysql_status(),
        "guidance_languages": ["en", "hi", "or"],
    }


@app.get("/api/guidance/{language}")
def guidance_endpoint(language: str, category: str | None = None):
    return {
        "language": language if language in ("en", "hi", "or") else "en",
        "guidance": get_guidance_for_language(language, category),
    }


@app.post("/check")
def check_message_or_url(req: CheckRequest):
    text_result = scan_message_text(req.text)
    url_result = scan_urls_in_text(req.text)

    url_verdicts = [r["verdict"] for r in url_result["results"]]
    url_probs = [r["phishing_prob"] for r in url_result["results"]]

    all_urls_safe = url_result["found_urls"] and all(v == "SAFE" for v in url_verdicts)
    has_text_red_flags = len(text_result["red_flags"]) > 0

    if all_urls_safe and not has_text_red_flags:
        overall_verdict = "SAFE"
        overall_risk_score = 0.0
    elif text_result["verdict"] == "SCAM" or "PHISHING" in url_verdicts:
        overall_verdict = "DANGER"
        overall_risk_score = max([text_result["scam_prob"]] + url_probs)
    elif text_result["verdict"] == "SUSPICIOUS" or "SUSPICIOUS" in url_verdicts:
        overall_verdict = "SUSPICIOUS"
        overall_risk_score = max([text_result["scam_prob"]] + url_probs)
    else:
        overall_verdict = "SAFE"
        overall_risk_score = max([text_result["scam_prob"]] + url_probs)

    return {
        "overall_verdict": overall_verdict,
        "overall_risk_score": overall_risk_score,
        "text_analysis": text_result,
        "url_analysis": url_result,
        "guidance": get_guidance_for_language(
            req.language,
            "PHISHING_URL" if "PHISHING" in url_verdicts else ("SCAM_SMS" if overall_verdict == "DANGER" else "OFFICIAL_DOMAIN"),
        ),
    }