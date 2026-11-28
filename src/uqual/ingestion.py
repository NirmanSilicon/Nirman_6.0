"""Bounded, explicit statement adapters. Reconciliation is required, never repaired."""

from __future__ import annotations

import csv
from dataclasses import dataclass
from datetime import datetime
from decimal import Decimal, InvalidOperation
import hashlib
import io
from pathlib import Path
import re
import zipfile

import pandas as pd

from .features import REQUIRED, validate_transactions

MAX_BYTES = 10 * 1024 * 1024
MAX_ROWS = 50_000
DATE_FORMATS = {"%Y-%m-%d", "%d/%m/%Y", "%d-%m-%Y"}
MIME = {
    "csv": "text/csv",
    "pdf": "application/pdf",
    "xlsx": "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
}
ALIASES = {
    "date": {"date", "transactiondate", "trandate", "txndate", "postingdate"},
    "description": {"description", "remarks", "narration", "particulars", "transactiondescription"},
    "debit": {"debit", "withdrawal", "withdrawals", "withdrawalamount", "debitamount", "dramount"},
    "credit": {"credit", "deposit", "deposits", "depositamount", "creditamount", "cramount"},
    "balance": {"balance", "closingbalance", "runningbalance", "availablebalance"},
    "transaction_id": {
        "transactionid",
        "tranid",
        "txnid",
        "reference",
        "referenceno",
        "transactionreference",
    },
    "category": {"category"},
}


class IngestionError(ValueError):
    def __init__(self, code, message):
        self.code = code
        super().__init__(message)


@dataclass
class Parsed:
    transactions: pd.DataFrame
    report: dict
    declared_end: str | None = None


def kind(filename, payload):
    extension = Path(filename).suffix.lower().lstrip(".")
    if extension not in MIME:
        raise IngestionError(
            "unsupported_format",
            "Upload a .csv, text-based .pdf or .xlsx statement. Legacy .xls is not supported.",
        )
    if not payload or len(payload) > MAX_BYTES:
        raise IngestionError("size_limit", "Choose a nonempty statement no larger than 10 MB")
    if extension == "pdf" and not payload.startswith(b"%PDF-"):
        raise IngestionError("invalid_file", "The file is not a valid PDF")
    if extension == "xlsx" and not payload.startswith(b"PK"):
        raise IngestionError("invalid_file", "The file is not an XLSX workbook")
    return extension


def money(value, *, empty=False, balance=False):
    text = str(value if value is not None else "").strip()
    if empty and text in {"", "-", "—"}:
        return 0.0
    text = re.sub(r"^(?:INR|Rs\.?|₹)\s*", "", text, flags=re.I)
    suffix = re.search(r"\s*\(?(Cr|Dr)\)?\s*$", text, re.I)
    negative = False
    if suffix:
        negative = suffix[1].lower() == "dr"
        if not balance:
            raise IngestionError(
                "ambiguous_amount", "Separate debit/credit columns must not include Dr/Cr suffixes"
            )
        text = text[: suffix.start()].strip()
    if text.startswith("(") and text.endswith(")"):
        negative, text = True, text[1:-1]
    if not re.fullmatch(r"[+-]?(?:\d+|\d{1,3}(?:,\d{3})+|\d{1,3}(?:,\d{2})*,\d{3})(?:\.\d+)?", text):
        raise IngestionError("invalid_amount", "A statement contains an invalid monetary value")
    try:
        value = Decimal(text.replace(",", ""))
    except InvalidOperation as exc:
        raise IngestionError("invalid_amount", "A monetary value could not be read") from exc
    if not value.is_finite() or abs(value) > Decimal("1000000000000"):
        raise IngestionError("invalid_amount", "A monetary value exceeds the supported range")
    rounded = value.quantize(Decimal(".01"))
    if abs(value - rounded) > Decimal(".0000001"):
        raise IngestionError("invalid_amount", "Currency values need at most two decimal places")
    if negative:
        rounded = -abs(rounded)
    if not balance and rounded < 0:
        raise IngestionError("ambiguous_amount", "Use positive values in separate debit and credit columns")
    return float(rounded)


def header(row):
    result = {}
    for i, cell in enumerate(row):
        key = re.sub("[^a-z0-9]", "", str(cell or "").casefold())
        for field, aliases in ALIASES.items():
            if key in aliases:
                if field in result:
                    raise IngestionError(
                        "ambiguous_columns", "Multiple statement columns have the same meaning"
                    )
                result[field] = i
    return result if {"date", "description", "debit", "credit", "balance"} <= result.keys() else None


def period(text):
    match = re.search(
        r"(?:statement\s+period|period\s+of\s+statement|statement\s+from)[^\d]{0,30}(\d{2}[-/]\d{2}[-/]\d{4})\s*(?:to|[-–])\s*(\d{2}[-/]\d{2}[-/]\d{4})",
        text,
        re.I,
    )
    if not match:
        return None
    fmt = "%d/%m/%Y" if "/" in match[2] else "%d-%m-%Y"
    try:
        return datetime.strptime(match[2], fmt).date().isoformat()
    except ValueError as exc:
        raise IngestionError("invalid_period", "The printed statement period is invalid") from exc


def reconcile(tx):
    if tx.empty:
        raise IngestionError("no_transactions", "No supported transaction rows were found")
    if len(tx) > MAX_ROWS:
        raise IngestionError("row_limit", "A statement may contain at most 50,000 transactions")
    if tx.transaction_id.duplicated().any():
        raise IngestionError(
            "duplicate_reference",
            "Transaction IDs repeat inside the statement; provide unique bank references",
        )
    if tx.amount.le(0).any():
        raise IngestionError("invalid_amount", "Every transaction must have a positive amount")
    if not tx.date.is_monotonic_increasing:
        if not tx.date.is_monotonic_decreasing:
            raise IngestionError(
                "ambiguous_order",
                "Transaction dates are interleaved. Export a statement in bank ledger order.",
            )
        options = [
            tx.iloc[::-1].reset_index(drop=True),
            tx.sort_values("date", kind="stable").reset_index(drop=True),
        ]
        good = [frame for frame in options if _residual(frame) <= 0.011]
        if not good or (len(good) == 2 and not good[0].transaction_id.equals(good[1].transaction_id)):
            raise IngestionError(
                "ambiguous_order", "Newest-first rows have ambiguous or inconsistent same-day ordering"
            )
        tx = good[0]
    if _residual(tx) > 0.011:
        raise IngestionError(
            "reconciliation_failed",
            "Running balances do not reconcile. Check missing rows, debit/credit columns and same-day bank order.",
        )
    return validate_transactions(tx)


def _residual(tx):
    signed = tx.amount.where(tx.direction.eq("credit"), -tx.amount)
    values = (tx.balance.diff().iloc[1:] - signed.iloc[1:]).abs()
    return float(values.max()) if len(values) else 0.0


def with_next(rows):
    iterator = iter(rows)
    current = next(iterator, None)
    if current is None:
        return
    for following in iterator:
        yield current, following
        current = following
    yield current, None


def table_rows(rows, date_format, source_tag):
    fields, output, declared, skipped, footer, opening = None, [], None, 0, False, None
    for ordinal, (row, following) in enumerate(with_next(rows)):
        if ordinal > MAX_ROWS + 2000:
            raise IngestionError("row_limit", "The statement has too many rows")
        if len(row) > 100:
            raise IngestionError("column_limit", "The statement has too many columns")
        cells = [str(v).strip() if v is not None else "" for v in row]
        text = " ".join(cells).strip()
        if not text.strip():
            continue
        declared = period(text) or declared
        found = header(cells)
        if found:
            fields, footer = found, False
            continue
        if fields is None:
            if ordinal > 1000:
                raise IngestionError("missing_header", "No supported transaction header was found")
            continue

        def get(k):
            return cells[fields[k]] if k in fields and fields[k] < len(cells) else ""

        date_text = get("date")
        if (
            not date_text
            and not get("debit")
            and not get("credit")
            and following is not None
            and header(following)
        ):
            skipped += 1
            continue
        if not output and re.search(r"\bOpening\s+Balance\b", text, re.I) and get("balance"):
            opening = money(get("balance"), balance=True)
            continue
        if re.match(r"^(?:page\s+\d|total\b|closing\s+balance\b|end\s+of\s+statement\b)", text, re.I):
            skipped += 1
            footer = True
            continue
        try:
            date = datetime.strptime(date_text, date_format)
        except ValueError as exc:
            # Unassigned narration fragments are counted, never attached to a guessed transaction.
            if not date_text and not any(get(k) for k in ["debit", "credit", "balance"]) and not footer:
                skipped += 1
                continue
            if footer and not re.match(r"^\d{2}[-/]\d{2}[-/]\d{4}", date_text):
                skipped += 1
                continue
            raise IngestionError(
                "invalid_date", f"Transaction row {ordinal + 1} has no date matching the selected format"
            ) from exc
        if footer:
            raise IngestionError(
                "ambiguous_rows", "Transactions appear after a statement footer without a repeated header"
            )
        debit, credit = money(get("debit"), empty=True), money(get("credit"), empty=True)
        if (debit > 0) == (credit > 0):
            raise IngestionError(
                "ambiguous_amount", f"Row {ordinal + 1} needs exactly one positive debit or credit"
            )
        reference = (
            get("transaction_id") or hashlib.sha256(f"{source_tag}:{ordinal}".encode()).hexdigest()[:24]
        )
        output.append(
            {
                "transaction_id": reference,
                "account_id": "uploaded-account",
                "customer_id": "uploaded-customer",
                "date": date,
                "description": get("description"),
                "amount": debit + credit,
                "direction": "credit" if credit else "debit",
                "balance": money(get("balance"), balance=True),
                "category": get("category") or "unknown",
                "country": "IN",
                "currency": "INR",
            }
        )
        if len(output) > MAX_ROWS:
            raise IngestionError("row_limit", "More than 50,000 transactions")
    if fields is None:
        raise IngestionError(
            "missing_header",
            "Supported headers: Date, Description/Narration, Debit/Withdrawal, Credit/Deposit, Balance",
        )
    frame = pd.DataFrame(output)
    frame.attrs["declared_opening_balance"] = opening
    return frame, declared, skipped


def parse_csv(payload, date_format):
    try:
        text = payload.decode("utf-8-sig")
    except UnicodeDecodeError as exc:
        raise IngestionError("encoding", "Export CSV using UTF-8 encoding") from exc
    from .sbi_statement import fingerprint, parse_rows

    rows = list(csv.reader(io.StringIO(text), strict=True))
    if split_grid_header(rows) is not None:
        return parse_split_grid(rows, hashlib.sha256(payload).hexdigest())

    if fingerprint(text):
        # Converted bank CSVs can have rasterized/missing header text. Use the
        # matching printed summary, never a headerless generic fallback.
        summary_at = next((i for i, row in enumerate(rows) if any("Statement Summary" in str(c) for c in row)), None)
        if summary_at is not None:
            summary_text = "\n".join(" ".join(row) for row in rows)
            return parse_rows(rows[:summary_at], summary_text, hashlib.sha256(payload).hexdigest())
    reader = iter(rows)
    first = next(reader, [])
    if REQUIRED <= set(first):
        frame = pd.read_csv(io.StringIO(text), dtype=str, nrows=MAX_ROWS + 1)
        for col in ["amount", "balance"]:
            frame[col] = pd.to_numeric(frame[col], errors="raise")
        frame["date"] = pd.to_datetime(frame.date, format="%Y-%m-%d", errors="raise")
        return frame, None, {"adapter": "canonical-csv-v1", "skipped_nontransaction_rows": 0}
    frame, declared, skipped = table_rows(
        iter([first, *reader]), date_format, hashlib.sha256(payload).hexdigest()
    )
    return frame, declared, {"adapter": "bank-csv-v1", "skipped_nontransaction_rows": skipped}


def split_grid_header(rows):
    """Recognize the 11-column, three-line transaction grid in converted bank CSVs."""
    for i in range(min(len(rows) - 2, 1000)):
        a, b, c = rows[i:i + 3]
        if not all(len(row) == 11 for row in (a, b, c)):
            continue
        if (a[1].strip().casefold() == "transaction"
                and a[3].strip().casefold() == "debit"
                and a[5].strip().casefold() == "credit"
                and b[0].strip().casefold() == "date"
                and b[2].strip().casefold() == "remarks"
                and b[7].strip().casefold().startswith("balance(")
                and c[1].strip().casefold() == "id"
                and c[3].strip().casefold().startswith("amount(")
                and c[5].strip().casefold().startswith("amount(")):
            return i
    return None


def parse_split_grid(rows, source_tag):
    start = split_grid_header(rows)
    if start is None:
        raise IngestionError("missing_header", "The split transaction grid header is incomplete")
    output, skipped = [], 0
    for ordinal, row in enumerate(rows[start + 3:], start + 3):
        if len(row) != 11:
            raise IngestionError("ambiguous_columns", "The split transaction grid changed column count")
        cells = [str(value or "").strip() for value in row]
        if not any(cells):
            continue
        if re.fullmatch(r"\d{2}-\d{2}-\d{4}", cells[0]):
            try:
                date = datetime.strptime(cells[0], "%d-%m-%Y")
            except ValueError as exc:
                raise IngestionError("invalid_date", f"Transaction row {ordinal + 1} has an invalid date") from exc
            if not cells[1] or (bool(cells[3]) == bool(cells[5])) or not cells[7]:
                raise IngestionError("ambiguous_amount", f"Transaction row {ordinal + 1} has incomplete amounts")
            amount_text = cells[3] or cells[5]
            match = re.search(r"\((Dr|Cr)\)$", amount_text, re.I)
            expected = "dr" if cells[3] else "cr"
            if not match or match[1].casefold() != expected:
                raise IngestionError("ambiguous_amount", f"Transaction row {ordinal + 1} has inconsistent Dr/Cr markers")
            amount = abs(money(amount_text, balance=True))
            if amount <= 0:
                raise IngestionError("invalid_amount", "Every transaction needs a positive amount")
            output.append({
                "transaction_id": cells[1], "account_id": "uploaded-account",
                "customer_id": "uploaded-customer", "date": date,
                "description": cells[2], "amount": amount,
                "direction": "debit" if cells[3] else "credit",
                "balance": money(cells[7], balance=True), "category": "unknown",
                "country": "IN", "currency": "INR",
            })
            if len(output) > MAX_ROWS:
                raise IngestionError("row_limit", "More than 50,000 transactions")
        elif split_grid_header(rows[ordinal:ordinal + 3]) == 0:
            skipped += 3
        elif output and cells[2] and not any(cells[j] for j in (0, 1, 3, 4, 5, 6, 7, 8, 9, 10)):
            output[-1]["description"] = (output[-1]["description"] + " " + cells[2]).strip()[:1000]
        elif any(re.fullmatch(r"[\d,]+(?:\.\d{2})?\s*\((?:Dr|Cr)\)", cell, re.I) for cell in cells):
            raise IngestionError("ambiguous_rows", "An undated row contains a monetary amount")
        elif cells[0] and re.match(r"^\d{1,2}[-/]\d{1,2}[-/]", cells[0]):
            raise IngestionError("invalid_date", "A transaction date could not be read")
        else:
            skipped += 1
    frame = pd.DataFrame(output)
    return frame, None, {
        "adapter": "split-bank-grid-csv-v1", "detected_date_format": "%d-%m-%Y",
        "skipped_nontransaction_rows": skipped, "warnings": [
            "Split bank grid parsed; narration continuation lines were joined only when unambiguous",
        ],
    }


def parse_xlsx(payload, date_format):
    from openpyxl import load_workbook

    try:
        with zipfile.ZipFile(io.BytesIO(payload)) as archive:
            members = archive.infolist()
            if len(members) > 2000 or sum(m.file_size for m in members) > 80 * 1024 * 1024:
                raise IngestionError("workbook_limit", "Workbook expands beyond the supported size")
            if any(
                "vbaproject" in m.filename.casefold() or "externallinks/" in m.filename.casefold()
                for m in members
            ):
                raise IngestionError(
                    "unsupported_workbook", "Macros and external workbook links are not supported"
                )
    except zipfile.BadZipFile as exc:
        raise IngestionError("invalid_file", "Invalid XLSX container") from exc
    workbook = load_workbook(io.BytesIO(payload), read_only=True, data_only=False, keep_links=False)
    try:
        sheets = [s for s in workbook.worksheets if s.sheet_state == "visible"]
        if len(sheets) != 1:
            raise IngestionError(
                "ambiguous_sheet", "Export a workbook with exactly one visible transaction sheet"
            )

        def rows():
            sheet = sheets[0]
            sheet.reset_dimensions()
            for index, row in enumerate(sheet.iter_rows()):
                if index > MAX_ROWS + 2000:
                    raise IngestionError("row_limit", "Workbook has too many rows")
                if len(row) > 100:
                    raise IngestionError("column_limit", "Workbook has too many columns")
                values = []
                for cell in row:
                    if cell.data_type == "f":
                        raise IngestionError(
                            "formula_cell", "Export values-only XLSX; formula cells are not evaluated"
                        )
                    v = cell.value
                    values.append(v.strftime(date_format) if isinstance(v, datetime) else v)
                yield values

        tx, declared, skipped = table_rows(rows(), date_format, hashlib.sha256(payload).hexdigest())
    finally:
        workbook.close()
    return tx, declared, {"adapter": "values-only-xlsx-v1", "skipped_nontransaction_rows": skipped}


DATE_CELL = re.compile(r"\d{2}/\d{2}/\d{4}")


UNION_ROW = re.compile(
    r"^(\d{2}-\d{2}-\d{4})\s+(\S+)\s+(.*?)\s+([\d,]+\.\d{2})\s*\((Dr|Cr)\)\s+([\d,]+\.\d{2})\s*\((Dr|Cr)\)\s*$",
    re.I,
)


def parse_pdf(payload, date_format):
    import pdfplumber

    try:
        pdf = pdfplumber.open(io.BytesIO(payload))
    except Exception as exc:
        raise IngestionError(
            "locked_or_invalid_pdf", "Unlock the PDF before upload, or export an unencrypted CSV"
        ) from exc
    try:
        if not 1 <= len(pdf.pages) <= 100:
            raise IngestionError("page_limit", "PDFs must contain 1–100 pages")
        texts, total = [], 0
        for page in pdf.pages:
            text = page.extract_text(x_tolerance=2, y_tolerance=3) or ""
            total += len(text)
            if total > 3_000_000:
                raise IngestionError("pdf_limit", "PDF text exceeds the supported size")
            texts.append(text)
        if not any(t.strip() for t in texts):
            raise IngestionError(
                "needs_ocr",
                "Scanned/image-only PDFs need OCR review. Upload a text-based PDF, CSV or XLSX instead.",
            )
        from .sbi_statement import fingerprint, parse_rows

        all_text = "\n".join(texts)
        if "STATE BANK" in all_text.upper() and fingerprint(all_text):
            rows = []
            for page, text in zip(pdf.pages, texts):
                if re.search(r"Statement\s+Summary", text, re.I):
                    continue
                tables = [t for t in page.extract_tables() if t and len(t[0]) == 7
                          and any(str(c or "").strip() == "Balance" for c in t[0])]
                dated = sum(bool(re.match(r"^\d{2}/\d{2}/\d{4}\b", line)) for line in text.splitlines())
                if len(tables) != 1 or dated != sum(bool(DATE_CELL.fullmatch(str(row[0] or "").strip())) for row in tables[0]):
                    raise IngestionError("ambiguous_pdf_rows", "SBI PDF rows are missing or its transaction grid is incomplete")
                rows.extend(tables[0])
            frame, declared, report = parse_rows(rows, all_text, hashlib.sha256(payload).hexdigest(), pdf=True)
            report["pages"] = len(pdf.pages)
            return frame, declared, report
        union = any(re.search(r"Date\s+Transaction\s+Id\s+Remarks\s+Amount", t, re.I) for t in texts)
        if not union:
            combined = []
            for page, text in zip(pdf.pages, texts):
                matching = [table for table in page.extract_tables() if any(header(row) for row in table)]
                if len(matching) > 1:
                    raise IngestionError(
                        "ambiguous_pdf_table",
                        "Multiple transaction tables were found on one page; export one account as CSV/XLSX",
                    )
                if not matching and re.search(r"^\d{2}[-/]\d{2}[-/]\d{4}\b|^\d{4}-\d{2}-\d{2}\b", text, re.M):
                    raise IngestionError(
                        "unsupported_pdf_layout",
                        "A page has dated rows without a readable table; export CSV/XLSX",
                    )
                if matching:
                    combined.extend(matching[0])
            if not combined:
                raise IngestionError(
                    "unsupported_pdf_layout",
                    "This PDF layout is not supported; export CSV/XLSX. Directions are never guessed.",
                )
            frame, declared, skipped = table_rows(combined, date_format, hashlib.sha256(payload).hexdigest())
            dated_lines = sum(
                bool(re.match(r"^(?:\d{2}[-/]\d{2}[-/]\d{4}|\d{4}-\d{2}-\d{2})\b", line))
                for text in texts
                for line in text.splitlines()
            )
            if dated_lines > len(frame):
                raise IngestionError(
                    "ambiguous_pdf_rows", "Some dated PDF rows were not extracted; export CSV/XLSX"
                )
            return (
                frame,
                declared or period("\n".join(texts)),
                {"adapter": "grid-pdf-v1", "pages": len(pdf.pages), "skipped_nontransaction_rows": skipped},
            )

        output, pending, started = [], "", False
        declared = period("\n".join(texts))

        def flush():
            nonlocal pending
            if not pending:
                return
            match = UNION_ROW.fullmatch(pending)
            if not match:
                raise IngestionError(
                    "ambiguous_pdf_row",
                    "A dated PDF row could not be read completely. Export CSV/XLSX for this layout.",
                )
            date, reference, description, amount, direction, balance, balance_direction = match.groups()
            category = (
                "loan_payment"
                if direction.lower() == "dr" and re.search(r"\bLoan\s+Recovery\b", description, re.I)
                else "unknown"
            )
            output.append(
                {
                    "transaction_id": reference,
                    "account_id": "uploaded-account",
                    "customer_id": "uploaded-customer",
                    "date": datetime.strptime(date, "%d-%m-%Y"),
                    "description": description,
                    "amount": money(amount),
                    "direction": "credit" if direction.lower() == "cr" else "debit",
                    "balance": money(balance + f"({balance_direction})", balance=True),
                    "category": category,
                    "country": "IN",
                    "currency": "INR",
                }
            )
            pending = ""

        for text in texts:
            for raw in text.splitlines():
                line = raw.strip()
                if re.search(r"^Date\s+Transaction\s+Id", line, re.I):
                    started = True
                    continue
                if not started or not line or re.fullmatch(r"Page\s+\d+\s+of\s+\d+", line, re.I):
                    continue
                if re.match(r"^\d{2}-\d{2}-\d{4}\b", line):
                    flush()
                    pending = line
                elif pending and not UNION_ROW.fullmatch(pending):
                    pending += " " + line
                elif re.search(r"\([DC]r\)", line, re.I):
                    raise IngestionError(
                        "ambiguous_pdf_row", "An undated PDF monetary fragment was found; export CSV/XLSX"
                    )
                if len(output) > MAX_ROWS:
                    raise IngestionError("row_limit", "Too many PDF transactions")
        flush()
        return (
            pd.DataFrame(output),
            declared,
            {
                "adapter": "union-text-drcr-v1",
                "pages": len(pdf.pages),
                "warnings": [
                    "Text-based Union layout only; not universal PDF/OCR support",
                    "Categories default to unknown, except explicit debit Loan Recovery entries; no timeliness inference",
                ],
            },
        )
    finally:
        pdf.close()


def parse_statement(filename, payload, date_format="%Y-%m-%d"):
    extension = kind(filename, payload)
    if date_format not in DATE_FORMATS:
        raise IngestionError("date_format", "Choose YYYY-MM-DD, DD/MM/YYYY or DD-MM-YYYY")
    if extension == "csv":
        tx, declared, report = parse_csv(payload, date_format)
    elif extension == "xlsx":
        tx, declared, report = parse_xlsx(payload, date_format)
    else:
        tx, declared, report = parse_pdf(payload, date_format)
    if tx.empty:
        raise IngestionError("no_transactions", "No supported transaction rows were found")
    if tx.customer_id.nunique() != 1 or tx.account_id.nunique() != 1:
        raise IngestionError("mixed_accounts", "Upload one account and customer per statement")
    if not tx.country.eq("IN").all() or not tx.currency.eq("INR").all():
        raise IngestionError("unsupported_country", "This backend supports Indian INR statements only")
    opening = tx.attrs.get("declared_opening_balance")
    tx = reconcile(tx)
    if opening is not None:
        signed = tx.amount.iloc[0] * (1 if tx.direction.iloc[0] == "credit" else -1)
        if abs(tx.balance.iloc[0] - signed - opening) > 0.011:
            raise IngestionError(
                "reconciliation_failed", "First transaction differs from the printed opening balance"
            )
        report["opening_balance_checked"] = True
    allowed = [
        "transaction_id",
        "account_id",
        "customer_id",
        "date",
        "amount",
        "direction",
        "balance",
        "category",
        "country",
        "currency",
        "description",
        "counterparty",
    ]
    tx = tx[[col for col in allowed if col in tx]]
    report.setdefault("warnings", []).extend(
        [
            "Ledger continuity does not establish source authenticity or completeness",
            "Unassigned blank-date text rows are not attached to guessed transactions",
        ]
    )
    return Parsed(
        tx,
        {
            **report,
            "format": extension,
            "media_type": MIME[extension],
            "rows": len(tx),
            "balance_checks": max(len(tx) - 1, 0),
            "maximum_balance_residual": _residual(tx),
            "authenticity_verified": False,
        },
        declared,
    )
