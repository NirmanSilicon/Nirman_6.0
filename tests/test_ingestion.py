import io
from datetime import datetime
import subprocess

import pandas as pd
import pytest
from openpyxl import Workbook

from uqual.ingestion import IngestionError, parse_statement
from uqual.processing import parse_isolated

CSV = b"Date,Description,Debit,Credit,Balance,TransactionID\n2026-01-01,Incoming,0,1000,1300,one\n2026-01-02,Spending,50,0,1250,two\n"


def test_csv_and_xlsx_normalize_to_same_ledger():
    csv = parse_statement("statement.csv", CSV)
    book = Workbook()
    book.active.append(["Date", "Description", "Debit", "Credit", "Balance", "TransactionID"])
    book.active.append([datetime(2026, 1, 1), "Incoming", 0, 1000, 1300, "one"])
    book.active.append([datetime(2026, 1, 2), "Spending", 50, 0, 1250, "two"])
    stream = io.BytesIO()
    book.save(stream)
    book.close()
    excel = parse_statement("statement.xlsx", stream.getvalue())
    pd.testing.assert_frame_equal(csv.transactions, excel.transactions)
    assert csv.report["balance_checks"] == 1
    assert not csv.report["authenticity_verified"]


def test_paged_csv_headers_and_unassigned_narration_are_explicit():
    payload = b"My Bank\nDate,Particulars,Withdrawal,Deposit,Balance\n2026-01-01,First,,1000,1300\n,unassigned text,,,\n,,,1,2\nDate,Description,Debit,Credit,Balance\n2026-01-02,Second,50,,1250\n"
    # An ambiguous monetary row is not silently skipped as pagination.
    with pytest.raises(IngestionError):
        parse_statement("bank.csv", payload)
    payload = payload.replace(b",,,1,2\n", b"\n")
    parsed = parse_statement("bank.csv", payload)
    assert len(parsed.transactions) == 2
    assert parsed.transactions.description.iloc[0] == "First"
    assert parsed.report["skipped_nontransaction_rows"] == 1


def test_reconciliation_amount_direction_and_dates_fail_closed():
    for payload in [
        CSV.replace(b"1250", b"1240"),
        CSV.replace(b"50,0", b"50,20"),
        CSV.replace(b"2026-01-02", b"not-a-date"),
    ]:
        with pytest.raises(IngestionError):
            parse_statement("bad.csv", payload)
    reverse = b"\n".join([CSV.splitlines()[0], *CSV.splitlines()[1:][::-1]])
    parsed = parse_statement("reverse.csv", reverse)
    assert parsed.transactions.date.is_monotonic_increasing
    assert parsed.transactions.transaction_id.tolist() == ["one", "two"]


def test_xlsx_formula_and_multiple_visible_sheets_rejected():
    book = Workbook()
    book.active.append(["Date", "Description", "Debit", "Credit", "Balance"])
    book.active.append(["2026-01-01", "formula", 0, "=1000", 1300])
    stream = io.BytesIO()
    book.save(stream)
    with pytest.raises(IngestionError, match="formula"):
        parse_statement("book.xlsx", stream.getvalue())
    book.create_sheet("Another account")
    stream = io.BytesIO()
    book.save(stream)
    book.close()
    with pytest.raises(IngestionError, match="exactly one"):
        parse_statement("book.xlsx", stream.getvalue())


def test_isolated_csv_parser_matches_direct_parser():
    isolated = parse_isolated("statement.csv", CSV, "%Y-%m-%d")
    direct = parse_statement("statement.csv", CSV)
    pd.testing.assert_frame_equal(isolated.transactions, direct.transactions)


def test_parser_timeout_is_actionable(monkeypatch):
    def timeout(*args, **kwargs):
        raise subprocess.TimeoutExpired("parser", 45)

    monkeypatch.setattr("uqual.processing.subprocess.run", timeout)
    with pytest.raises(IngestionError, match="45 seconds") as caught:
        parse_isolated("statement.csv", CSV, "%Y-%m-%d")
    assert caught.value.code == "processing_timeout"


class FakePage:
    def __init__(self, text, tables=None):
        self.text, self.tables = text, tables or []

    def extract_text(self, **kwargs):
        return self.text

    def extract_tables(self):
        return self.tables


class FakePDF:
    def __init__(self, pages):
        self.pages = pages

    def close(self):
        pass


def test_union_pdf_explicit_dr_cr_and_printed_period(monkeypatch):
    text = "Statement Period 01-01-2026 to 31-01-2026\nDate Transaction Id Remarks Amount Balance\n01-01-2026 ONE Received 1000.00(Cr) 1300.00(Cr)\n02-01-2026 TWO Loan Recovery 50.00(Dr) 1250.00(Cr)\nPage 1 of 1"
    monkeypatch.setattr("pdfplumber.open", lambda _: FakePDF([FakePage(text)]))
    result = parse_statement("bank.pdf", b"%PDF-example")
    assert result.declared_end == "2026-01-31"
    assert result.transactions.direction.tolist() == ["credit", "debit"]
    assert result.transactions.category.tolist() == ["unknown", "loan_payment"]
    assert result.report["adapter"] == "union-text-drcr-v1"


def test_scanned_and_partial_pdf_rows_do_not_receive_guessed_values(monkeypatch):
    monkeypatch.setattr("pdfplumber.open", lambda _: FakePDF([FakePage("")]))
    with pytest.raises(IngestionError) as caught:
        parse_statement("scan.pdf", b"%PDF-example")
    assert caught.value.code == "needs_ocr"
    text = "Date Transaction Id Remarks Amount Balance\n01-01-2026 ONE Incomplete 1000.00(Cr)"
    monkeypatch.setattr("pdfplumber.open", lambda _: FakePDF([FakePage(text)]))
    with pytest.raises(IngestionError, match="completely"):
        parse_statement("partial.pdf", b"%PDF-example")


def test_pdf_grid_adapter_and_unextracted_dated_rows(monkeypatch):
    rows = [
        ["Date", "Description", "Debit", "Credit", "Balance"],
        ["2026-01-01", "First", "0", "1000", "1300"],
        ["2026-01-02", "Second", "50", "0", "1250"],
    ]
    monkeypatch.setattr(
        "pdfplumber.open", lambda _: FakePDF([FakePage("2026-01-01 First\n2026-01-02 Second", [rows])])
    )
    assert parse_statement("grid.pdf", b"%PDF-example").report["adapter"] == "grid-pdf-v1"
    monkeypatch.setattr(
        "pdfplumber.open",
        lambda _: FakePDF([FakePage("2026-01-01 First\n2026-01-02 Second\n2026-01-03 Missing", [rows])]),
    )
    with pytest.raises(IngestionError, match="not extracted"):
        parse_statement("grid.pdf", b"%PDF-example")


SBI_SUMMARY = "Statement Summary : 01-08-2026 To 31-10-2026\nBrought Forward() Dr Count Cr Count Total Debits() Total Credits() Closing Balance()\n300.67CR 1 1 40.00 100.00 360.67CR"
SBI_CSV = ("State Bank\nStatement From,: 01-08-2026 to 31-10-2026\n,,,,,,,Balance,\n"
           "01/08/2026,01/08/2026,UPI/DR/test,,-,40,-,260.67,\n"
           ",,narration continuation,,,,,,\n"
           ",,,,,,Balance\n"
           "02/08/2026,02/08/2026,UPI/CR/test,-,-,100,360.67\n"
           "Statement Summary,: 01-08-2026 To 31-10-2026\n"
           "Brought Forward(),Dr Count,Cr Count,Total Debits(),Total Credits(),Closing Balance()\n"
           "300.67CR,1,1,40.00,100.00,360.67CR\n").encode()


def test_sbi_converted_csv_missing_headers_padding_and_summary():
    parsed = parse_statement("converted.csv", SBI_CSV)
    assert parsed.report["adapter"] == "sbi-value-post-csv-v1"
    assert parsed.declared_end == "2026-10-31"
    assert parsed.report["summary_checked"]
    assert parsed.report["opening_balance_checked"]
    assert parsed.transactions.amount.tolist() == [40, 100]
    assert parsed.transactions.direction.tolist() == ["debit", "credit"]
    assert parsed.report["maximum_balance_residual"] < .01


@pytest.mark.parametrize("old,new", [
    (b"300.67CR,1,1,40.00", b"301.67CR,1,1,40.00"),
    (b"300.67CR,1,1,40.00", b"300.67CR,2,1,40.00"),
    (b"40.00,100.00,360.67CR", b"40.00,101.00,360.67CR"),
    (b"-,40,-,260.67", b"-,-,40,260.67"),
    (b"02/08/2026,02/08/2026", b"invalid,02/08/2026"),
])
def test_sbi_summary_does_not_allow_corrupt_or_missing_rows(old, new):
    with pytest.raises(IngestionError):
        parse_statement("corrupt.csv", SBI_CSV.replace(old, new))


def test_sbi_pdf_grid_and_csv_have_equal_ledger(monkeypatch):
    rows = [[None, None, None, None, None, None, "Balance"],
            ["01/08/2026", "01/08/2026", "UPI/DR/test", "-", "40.00", "-", "260.67"],
            ["02/08/2026", "02/08/2026", "UPI/CR/test", "-", "-", "100.00", "360.67"]]
    text = "STATE BANK\nStatement From :01-08-2026 to 31-10-2026\nBalance\n01/08/2026 one\n02/08/2026 two"
    monkeypatch.setattr("pdfplumber.open", lambda _: FakePDF([
        FakePage(text, [rows]), FakePage(SBI_SUMMARY)]))
    pdf = parse_statement("statement.pdf", b"%PDF-example")
    csv = parse_statement("statement.csv", SBI_CSV)
    pd.testing.assert_frame_equal(pdf.transactions.drop(columns="transaction_id"),
                                  csv.transactions.drop(columns="transaction_id"))
    assert pdf.report["summary_checked"]
    monkeypatch.setattr("pdfplumber.open", lambda _: FakePDF([
        FakePage(text, [rows[:-1]]), FakePage(SBI_SUMMARY)]))
    with pytest.raises(IngestionError, match="missing"):
        parse_statement("missing.pdf", b"%PDF-example")


def test_headerless_unknown_csv_is_still_rejected():
    with pytest.raises(IngestionError, match="Supported headers"):
        parse_statement("unknown.csv", b"01/08/2026,01/08/2026,unknown,-,40,-,260.67\n")
