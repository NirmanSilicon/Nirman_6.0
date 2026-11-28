"""SBI value/post-date exports with rasterized column labels and printed totals.

Column positions are accepted only with the layout's summary fingerprint. Every
row, debit/credit count, aggregate, opening and closing balance must reconcile.
"""
from __future__ import annotations

import hashlib
import re
from datetime import datetime

import pandas as pd

from .ingestion import IngestionError, money, period

DATE = re.compile(r"\d{2}/\d{2}/\d{4}")
SUMMARY = re.compile(
    r"Brought\s+Forward.*?Dr\s+Count.*?Cr\s+Count.*?Total\s+Debits.*?Total\s+Credits.*?Closing\s+Balance",
    re.I | re.S,
)


def fingerprint(text):
    return bool(re.search(r"Statement\s+From\s*:?.*?\d{2}-\d{2}-\d{4}", text, re.I)
                and SUMMARY.search(text))


def summary_values(text):
    lines = text.splitlines()
    for index, line in enumerate(lines[:-1]):
        if SUMMARY.search(line):
            tokens = lines[index + 1].split()
            if len(tokens) != 6 or not all(re.fullmatch(r"\d+", x) for x in tokens[1:3]):
                break
            return (money(tokens[0], balance=True), int(tokens[1]), int(tokens[2]),
                    money(tokens[3]), money(tokens[4]), money(tokens[5], balance=True))
    raise IngestionError("invalid_summary", "The SBI statement summary could not be read completely")


def parse_rows(rows, summary_text, source_tag, *, pdf=False):
    opening, debits, credits, debit_total, credit_total, closing = summary_values(summary_text)
    declared = period(summary_text)
    if not declared:
        raise IngestionError("missing_period", "The SBI statement needs its printed statement period")
    output, skipped = [], 0
    for ordinal, row in enumerate(rows):
        cells = [str(v or "").strip() for v in row]
        if not any(cells):
            continue
        first = cells[0] if cells else ""
        if not DATE.fullmatch(first):
            # Only blank-date narration, headers, and pagination may be skipped.
            if re.match(r"^\d{1,4}[-/]\d", first):
                raise IngestionError("invalid_date", "An SBI transaction date could not be read")
            if output and any(re.fullmatch(r"[\d,]+\.\d{2}", x) for x in cells[3:]):
                raise IngestionError("ambiguous_rows", "An undated SBI row contains monetary values")
            skipped += 1
            continue
        if len(cells) < 7 or not DATE.fullmatch(cells[1]):
            raise IngestionError("invalid_date", "Each SBI transaction needs value and posting dates")
        try:
            datetime.strptime(first, "%d/%m/%Y")
            date = datetime.strptime(cells[1], "%d/%m/%Y")
        except ValueError as exc:
            raise IngestionError("invalid_date", "An SBI transaction has an invalid date") from exc
        if pdf and len(cells) != 7:
            raise IngestionError("ambiguous_columns", "The SBI PDF transaction grid has unexpected columns")
        # CSV converters insert empty padding columns; preserve '-' placeholders.
        tail = [x for x in cells[3:] if x]
        if len(tail) != 4:
            raise IngestionError("ambiguous_columns", "The SBI amount columns are incomplete or ambiguous")
        _, debit_text, credit_text, balance_text = tail
        debit, credit = money(debit_text, empty=True), money(credit_text, empty=True)
        if (debit > 0) == (credit > 0):
            raise IngestionError("ambiguous_amount", "Each SBI row needs exactly one debit or credit")
        output.append({
            "transaction_id": hashlib.sha256(f"{source_tag}:{ordinal}".encode()).hexdigest()[:24],
            "account_id": "uploaded-account", "customer_id": "uploaded-customer",
            "date": date, "description": cells[2], "amount": debit + credit,
            "direction": "credit" if credit else "debit", "balance": money(balance_text, balance=True),
            "category": "unknown", "country": "IN", "currency": "INR",
        })
    frame = pd.DataFrame(output)
    if frame.empty:
        raise IngestionError("no_transactions", "No SBI transactions were found")
    actual_debits = frame.direction.eq("debit")
    checks = [
        int(actual_debits.sum()) == debits,
        int((~actual_debits).sum()) == credits,
        abs(frame.loc[actual_debits, "amount"].sum() - debit_total) <= .011,
        abs(frame.loc[~actual_debits, "amount"].sum() - credit_total) <= .011,
        abs(frame.balance.iloc[-1] - closing) <= .011,
        abs(opening - debit_total + credit_total - closing) <= .011,
    ]
    if not all(checks):
        raise IngestionError("summary_mismatch", "SBI rows do not match the printed transaction counts, totals or closing balance")
    frame.attrs["declared_opening_balance"] = opening
    return frame, declared, {
        "adapter": "sbi-value-post-grid-v1" if pdf else "sbi-value-post-csv-v1",
        "summary_checked": True, "summary_debit_count": debits, "summary_credit_count": credits,
        "detected_date_format": "%d/%m/%Y", "skipped_nontransaction_rows": skipped,
        "warnings": ["SBI value/post-date layout with summary verification; extracted column labels are incomplete"],
    }
