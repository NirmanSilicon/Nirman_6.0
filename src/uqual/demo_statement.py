"""Deterministic, clearly labelled synthetic statement for the full app walkthrough."""

from __future__ import annotations

import csv
import io
from datetime import date


def generated_statement() -> bytes:
    output = io.StringIO()
    writer = csv.writer(output)
    writer.writerow(["Date", "Description", "Debit", "Credit", "Balance", "TransactionID", "Category"])
    balance = 12000
    for month in range(1, 7):
        entries = [(2, "DEMO MONTHLY SALARY CREDIT", 0, 50000, "salary"),
                   (4, "DEMO HOUSE RENT", 12000, 0, "rent"),
                   (8, "DEMO GROCERIES", 7500, 0, "groceries"),
                   (12, "DEMO ELECTRICITY BILL", 2000, 0, "utility"),
                   (18, "DEMO LOAN PAYMENT", 4000, 0, "loan_payment"),
                   (23, "DEMO TRANSPORT", 3500, 0, "transport"),
                   (27, "DEMO SHOPPING", 6000, 0, "shopping")]
        for day, description, debit, credit, category in entries:
            balance += credit - debit
            writer.writerow([date(2026, month, day).isoformat(), description,
                             debit or "", credit or "", balance, f"demo-{month:02d}-{day:02d}", category])
    # One start-of-period row makes January a complete calendar month.
    rows = output.getvalue().splitlines()
    rows.insert(1, "2026-01-01,DEMO OPENING TRANSFER,,1,12001,demo-01-01,own_transfer")
    # Running balances after the injected opening transfer need the same +1 adjustment.
    normalized = [rows[0], rows[1]]
    for row in rows[2:]:
        columns = next(csv.reader([row]))
        columns[4] = str(int(columns[4]) + 1)
        line = io.StringIO()
        csv.writer(line).writerow(columns)
        normalized.append(line.getvalue().strip())
    return ("\n".join(normalized) + "\n").encode()
