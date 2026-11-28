"""Transient statement ingestion for the personal Android prototype."""
from __future__ import annotations

import io
import uuid

import pandas as pd

from .features import REQUIRED, validate_transactions
from .model import clean_json
from .scoring import score_statement
from .statements import import_csv
from .synthetic import simulate_borrower

MAX_UPLOAD_BYTES = 10 * 1024 * 1024


def analyze_csv(bundle, payload: bytes, date_format: str, statement_end=None) -> dict:
    if date_format not in {"%Y-%m-%d", "%d/%m/%Y", "%d-%m-%Y"}:
        raise ValueError("Choose a supported date format")
    if not payload or len(payload) > MAX_UPLOAD_BYTES:
        raise ValueError("Choose a nonempty CSV smaller than 10 MB")
    try:
        text = payload.decode("utf-8-sig")
    except UnicodeDecodeError as exc:
        raise ValueError("Export the CSV using UTF-8 encoding") from exc
    frame = pd.read_csv(io.StringIO(text), dtype=str, nrows=50_001)
    if len(frame) > 50_000:
        raise ValueError("A statement may contain at most 50,000 transactions")
    if REQUIRED.issubset(frame.columns):
        tx = validate_transactions(frame)
        if tx.customer_id.nunique() != 1 or tx.account_id.nunique() != 1:
            raise ValueError("Upload one account and customer per analysis")
        if not tx.country.eq("IN").all() or not tx.currency.eq("INR").all():
            raise ValueError("This app currently supports INR statements from India")
    else:
        tx = import_csv(io.StringIO(text), "uploaded-account", "uploaded-customer", "IN", "INR",
                        date_format=date_format)
    end = pd.Timestamp(statement_end) if statement_end is not None else tx.date.max()
    if pd.isna(end) or end < tx.date.max() or end != end.normalize():
        raise ValueError("Statement end must be a date on or after the last transaction")
    assessment = {"assessment_id": uuid.uuid4().hex, "account_id": str(tx.account_id.iloc[0]),
                  "customer_id": str(tx.customer_id.iloc[0]), "country": "IN", "currency": "INR",
                  "as_of": str((end + pd.Timedelta(days=1)).date())}
    result = score_statement(bundle, tx, assessment, synthetic_demo=True)
    result["statement_source"] = "user_upload"
    result["statement_period"] = {"start": str(tx.date.min().date()), "end": str(end.date())}
    result["processing"] = "Processed transiently; this API does not retain your statement"
    return clean_json(result)


def analyze_sample(bundle) -> dict:
    tx, assessment, _, _ = simulate_borrower(136, 20261112)
    result = score_statement(bundle, tx, assessment, synthetic_demo=True)
    result["statement_source"] = "generated_sample"
    end = pd.Timestamp(assessment["as_of"]) - pd.Timedelta(days=1)
    result["statement_period"] = {"start": str(tx.date.min().date()), "end": str(end.date())}
    result["processing"] = "Generated example; not your financial data"
    return clean_json(result)
