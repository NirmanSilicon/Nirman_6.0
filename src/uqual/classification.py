"""Conservative, reviewable narration rules; never infer verified income."""

from __future__ import annotations

import re

import pandas as pd

from .features import validate_transactions
from .model import clean_json


# Order matters: specific obligation/refund patterns precede generic transfer hints.
RULES = [
    ("loan_payment", "debit", r"\b(?:loan\s+(?:recovery|emi|repayment)|emi\s+(?:debit|payment)|nach\s+loan)\b", .96),
    ("rent", "debit", r"\b(?:house\s+rent|rent\s+payment|monthly\s+rent)\b", .94),
    ("utility", "debit", r"\b(?:electricity|water\s+bill|gas\s+bill|broadband|mobile\s+recharge|utility)\b", .91),
    ("insurance", "debit", r"\b(?:insurance\s+premium|lic\s+premium)\b", .94),
    ("groceries", "debit", r"\b(?:grocery|groceries|supermarket|bigbasket|blinkit|zepto)\b", .90),
    ("transport", "debit", r"\b(?:metro\s+card|fuel\s+station|petrol\s+pump|uber\s+trip|ola\s+ride)\b", .88),
    ("salary", "credit", r"\b(?:salary\s+(?:credit|payment)|payroll\s+credit|monthly\s+salary)\b", .93),
    ("refund", "credit", r"\b(?:refund|reversal|chargeback)\b", .90),
    ("own_transfer", "credit", r"\b(?:self\s+transfer|own\s+account\s+transfer)\b", .92),
    ("own_transfer", "debit", r"\b(?:self\s+transfer|own\s+account\s+transfer)\b", .92),
]
ALLOWED = {"unknown", "salary", "pension", "freelance_income", "business_income", "own_transfer",
           "refund", "loan_disbursement", "reversal", "loan_payment", "rent", "insurance", "utility",
           "household", "groceries", "transport", "shopping", "bank_fee", "penalty", "other"}


def classify(tx: pd.DataFrame) -> pd.DataFrame:
    out = validate_transactions(tx)
    for name, default in [("suggested_category", ""), ("classification_status", ""),
                          ("classification_confidence", 0.0), ("classification_basis", ""),
                          ("possible_duplicate", False), ("possible_refund", False)]:
        if name not in out:
            out[name] = default
    for i, row in out.iterrows():
        if row["classification_status"] in {"user_confirmed", "auto_applied"}:
            continue
        source = str(row["category"]).strip().lower()
        if source != "unknown":
            out.at[i, "classification_status"] = "source_label"
            out.at[i, "classification_confidence"] = 1.0
            out.at[i, "classification_basis"] = "Label supplied in source statement"
            continue
        description = str(row.get("description", ""))[:1000]
        for category, direction, expression, confidence in RULES:
            if row["direction"] == direction and re.search(expression, description, re.I):
                out.at[i, "suggested_category"] = category
                out.at[i, "classification_confidence"] = confidence
                out.at[i, "classification_basis"] = "Narration keyword rule; review before relying on it"
                # Income and transfer/refund labels affect denominator or exclusions; user must confirm.
                if category in {"salary", "refund", "own_transfer"}:
                    out.at[i, "classification_status"] = "suggested_review"
                else:
                    out.at[i, "category"] = category
                    out.at[i, "classification_status"] = "auto_applied"
                break
        if not out.at[i, "classification_status"]:
            out.at[i, "classification_status"] = "unclassified"
    # Flag near-duplicate content without deleting legitimate repeated transfers.
    descriptions = out.get("description", pd.Series("", index=out.index)).astype(str).str.lower().str.replace(r"\s+", " ", regex=True).str.strip()
    keys = pd.DataFrame({"date": out.date, "amount": out.amount, "direction": out.direction, "description": descriptions})
    out["possible_duplicate"] = keys.duplicated(keep=False)
    refund = out.direction.eq("credit") & (out.category.eq("refund") | out.suggested_category.eq("refund"))
    out["possible_refund"] = refund
    return out


def classification_summary(tx: pd.DataFrame) -> dict:
    frame = classify(tx)
    return clean_json({"total": len(frame),
                       "auto_applied": int(frame.classification_status.eq("auto_applied").sum()),
                       "needs_review": int(frame.classification_status.isin(["suggested_review", "unclassified"]).sum()),
                       "possible_duplicates": int(frame.possible_duplicate.sum()),
                       "possible_refunds": int(frame.possible_refund.sum()),
                       "method": "Conservative narration rules; salary and transfer/refund suggestions require confirmation"})
