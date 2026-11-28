"""One ingestion/scoring service shared by synchronous uploads and durable jobs."""

from __future__ import annotations

import io
import json
import os
from pathlib import Path
import subprocess
import sys
import uuid

import pandas as pd

from .ingestion import IngestionError, Parsed
from .model import clean_json
from .scoring import score_statement
from .classification import classify, classification_summary


def parse_isolated(filename: str, payload: bytes, date_format: str) -> Parsed:
    environment = {**os.environ, "OMP_NUM_THREADS": "1", "OPENBLAS_NUM_THREADS": "1", "MKL_NUM_THREADS": "1"}
    try:
        result = subprocess.run(
            [sys.executable, "-m", "uqual.parse_worker", Path(filename).name[:255], date_format],
            input=payload,
            capture_output=True,
            timeout=45,
            env=environment,
        )
    except subprocess.TimeoutExpired as exc:
        raise IngestionError(
            "processing_timeout", "Parsing exceeded 45 seconds. Export a simpler CSV/XLSX statement."
        ) from exc
    if result.returncode != 0 or len(result.stdout) > 64 * 1024 * 1024:
        raise IngestionError(
            "parser_resource_limit", "Parsing stopped at a resource limit. Export a simpler statement."
        )
    try:
        data = json.loads(result.stdout)
    except (ValueError, UnicodeError) as exc:
        raise IngestionError("parser_failure", "The statement parser did not return a valid result") from exc
    if "error" in data:
        raise IngestionError(data["error"]["code"], data["error"]["message"])
    frame = pd.DataFrame(data["records"])
    frame["date"] = pd.to_datetime(frame.date, format="%Y-%m-%d")
    return Parsed(frame, data["report"], data["declared_end"])


def process_statement(bundle, filename, payload, date_format, statement_end):
    parsed = parse_isolated(filename, payload, date_format)
    tx = classify(parsed.transactions)
    end = (
        pd.Timestamp(statement_end)
        if statement_end
        else pd.Timestamp(parsed.declared_end)
        if parsed.declared_end
        else None
    )
    if end is None:
        raise IngestionError(
            "missing_period", "Enter the statement end date, including days without transactions"
        )
    if pd.isna(end) or end != end.normalize() or end < tx.date.max():
        raise IngestionError(
            "invalid_period", "Statement end must be a date on or after the last transaction"
        )
    if parsed.declared_end and end != pd.Timestamp(parsed.declared_end):
        raise IngestionError(
            "period_mismatch", "The selected end date differs from the period printed on the statement"
        )
    assessment = {
        "assessment_id": uuid.uuid4().hex,
        "account_id": str(tx.account_id.iloc[0]),
        "customer_id": str(tx.customer_id.iloc[0]),
        "country": "IN",
        "currency": "INR",
        "as_of": str((end + pd.Timedelta(days=1)).date()),
    }
    analysis = score_statement(bundle, tx, assessment, synthetic_demo=True)
    analysis.update(
        statement_source="user_upload",
        statement_period={"start": str(tx.date.min().date()), "end": str(end.date())},
        import_report=parsed.report,
        processing="Saved encrypted in your private account with your consent",
        classification=classification_summary(tx),
    )
    # Canonical source export; spreadsheet formula prefixes in text fields are escaped.
    export = tx.copy()
    for column in export.select_dtypes(include="object").columns:
        export[column] = export[column].map(
            lambda v: "'" + v if isinstance(v, str) and v.startswith(("=", "+", "-", "@")) else v
        )
    buffer = io.StringIO()
    export.to_csv(buffer, index=False, date_format="%Y-%m-%d")
    return clean_json(analysis), buffer.getvalue().encode("utf-8")
