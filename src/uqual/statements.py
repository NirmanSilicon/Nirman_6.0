"""Strict CSV ingestion seam. PDF extraction is a separate quality-controlled component."""

from __future__ import annotations

import hashlib

import numpy as np
import pandas as pd

from .features import validate_transactions


def import_csv(path, account_id: str, customer_id: str, country: str, currency: str,
               date_format: str = "%Y-%m-%d", mapping: dict | None = None) -> pd.DataFrame:
    """Default header contract: Date, Description, Debit, Credit, Balance.

    mapping maps canonical date/description/debit/credit/balance/transaction_id/category
    names to the bank's actual headers. Non-empty invalid monetary values fail closed.
    """
    source = pd.read_csv(path, dtype=str).fillna("")
    names = {"date": "Date", "description": "Description", "debit": "Debit", "credit": "Credit",
             "balance": "Balance", "transaction_id": "TransactionID", "category": "Category"}
    names.update(mapping or {})
    for key in ["date", "description", "debit", "credit", "balance"]:
        if names[key] not in source:
            raise ValueError(f"Missing statement column: {names[key]}")

    def money(key, empty_allowed):
        text = source[names[key]].str.replace(",", "", regex=False).str.strip()
        if empty_allowed:
            text = text.replace({"": "0", "-": "0"})
        value = pd.to_numeric(text, errors="raise")
        if not np.isfinite(value).all():
            raise ValueError(f"Non-finite {key}")
        return value

    debit, credit, balance = money("debit", True), money("credit", True), money("balance", False)
    if (debit.lt(0) | credit.lt(0) | (debit.gt(0) & credit.gt(0)) | (debit.eq(0) & credit.eq(0))).any():
        raise ValueError("Every row needs exactly one positive debit or credit")
    dates = pd.to_datetime(source[names["date"]], format=date_format, errors="raise")
    categories = source[names["category"]] if names["category"] in source else pd.Series("unknown", index=source.index)
    # Preserve user-supplied categories; never infer salary merely from a credit entry.
    out = pd.DataFrame({"account_id": account_id, "customer_id": customer_id, "date": dates,
                        "description": source[names["description"]], "amount": debit + credit,
                        "direction": np.where(credit.gt(0), "credit", "debit"), "balance": balance,
                        "category": categories.replace("", "unknown"), "currency": currency, "country": country})
    if names["transaction_id"] in source:
        out["transaction_id"] = source[names["transaction_id"]]
    else:
        # Same transaction in overlapping uploads gets the same stable ID. Truly identical
        # same-day rows cannot be disambiguated without the bank's transaction reference.
        text = out.astype(str).agg("|".join, axis=1)
        out["transaction_id"] = text.map(lambda s: hashlib.sha256(s.encode()).hexdigest()[:24])
        if out.transaction_id.duplicated().any():
            raise ValueError("Identical rows need bank TransactionID values to distinguish genuine repeat transactions")
    return validate_transactions(out)
