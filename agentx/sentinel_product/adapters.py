"""Ingestion adapters and redaction helpers for SENTINEL Product."""

from __future__ import annotations

import copy
import re
from typing import Any

SENSITIVE_PATTERNS: list[tuple[re.Pattern[str], str]] = [
    (re.compile(r"\bsk-[A-Za-z0-9_-]{12,}\b"), "[REDACTED_API_KEY]"),
    (re.compile(r"\bAIza[0-9A-Za-z_-]{20,}\b"), "[REDACTED_GOOGLE_KEY]"),
    (re.compile(r"\bBearer\s+[A-Za-z0-9._-]{12,}\b", re.IGNORECASE), "Bearer [REDACTED_TOKEN]"),
    (re.compile(r"\b\d{3}-\d{2}-\d{4}\b"), "[REDACTED_SSN]"),
]


def redact_text(value: str) -> str:
    """Redact common credential/PII patterns prior to persistence or export."""
    out = value
    for pattern, replacement in SENSITIVE_PATTERNS:
        out = pattern.sub(replacement, out)
    return out


def redact_value(obj: Any) -> Any:
    """Recursively redact sensitive strings inside dicts/lists."""
    if isinstance(obj, str):
        return redact_text(obj)
    if isinstance(obj, list):
        return [redact_value(v) for v in obj]
    if isinstance(obj, dict):
        return {k: redact_value(v) for k, v in obj.items()}
    return copy.deepcopy(obj)


def ingest_payload(
    *,
    carrier: str,
    source_ref: str,
    raw_record: dict[str, Any],
    trust: str = "UNTRUSTED",
    sensitivity: str = "INTERNAL",
) -> dict[str, Any]:
    """Normalize carrier-specific records (OCR image, PDF, webpage, email, file) into ingestion artifacts."""
    spans = copy.deepcopy(raw_record.get("spans", []))
    risk_signal = copy.deepcopy(raw_record.get("risk_signal", {"flagged": False, "score": 0.0}))

    if carrier == "pdf_document":
        visible_text = str(raw_record.get("visible_text", ""))
        hidden_text = str(raw_record.get("hidden_layer_text", ""))
        extracted_text = (
            f"{visible_text}\n[HIDDEN_LAYER] {hidden_text}".strip()
            if hidden_text
            else visible_text
        )
    elif carrier == "image_ocr":
        visible_text = str(raw_record.get("visible_text", raw_record.get("raw_preview_header", "")))
        ocr_only = str(raw_record.get("ocr_only_span", ""))
        extracted_text = f"{visible_text}\n[OCR_SPAN] {ocr_only}".strip() if ocr_only else visible_text
    elif carrier == "webpage":
        visible_text = str(raw_record.get("visible_text", ""))
        hidden_dom = str(raw_record.get("untrusted_comment", ""))
        extracted_text = f"{visible_text}\n[DOM_COMMENT] {hidden_dom}".strip() if hidden_dom else visible_text
    elif carrier == "email":
        visible_text = str(raw_record.get("subject", "")) + "\n" + str(raw_record.get("body_visible", ""))
        injected = str(raw_record.get("body_untrusted_span", ""))
        extracted_text = f"{visible_text}\n[EMAIL_BODY_SPAN] {injected}".strip() if injected else visible_text.strip()
    else:
        visible_text = str(raw_record.get("visible_text", raw_record.get("summary_text", "")))
        extracted_text = str(raw_record.get("extracted_text", visible_text))

    return {
        "carrier": carrier,
        "source_ref": source_ref,
        "trust": trust,
        "sensitivity": sensitivity,
        "visible_text": redact_text(visible_text),
        "extracted_text": redact_text(extracted_text),
        "visible_vs_extracted_diff": visible_text != extracted_text,
        "spans": redact_value(spans),
        "risk_signal": risk_signal,
    }
