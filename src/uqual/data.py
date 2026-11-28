"""Download public data with provenance and explicit, inspectable label definitions."""

from __future__ import annotations

import hashlib
import json
import shutil
import urllib.request
import zipfile
from pathlib import Path

import numpy as np
import pandas as pd

BERKA_URL = "https://www.kaggle.com/api/v1/datasets/download/marceloventura/the-berka-dataset"
GMSC_URL = "https://www.kaggle.com/api/v1/datasets/download/brycecf/give-me-some-credit-dataset"


def digest(path: Path) -> str:
    h = hashlib.sha256()
    with path.open("rb") as f:
        for block in iter(lambda: f.read(1024 * 1024), b""):
            h.update(block)
    return h.hexdigest()


def download(url: str, path: Path) -> None:
    path.parent.mkdir(parents=True, exist_ok=True)
    if path.exists():
        return
    request = urllib.request.Request(url, headers={"User-Agent": "UQUAL-ML/0.1"})
    partial = path.with_suffix(path.suffix + ".partial")
    try:
        with urllib.request.urlopen(request, timeout=120) as response, partial.open("wb") as out:
            shutil.copyfileobj(response, out)
        partial.replace(path)
    finally:
        partial.unlink(missing_ok=True)


def fetch(root: Path, dataset: str) -> Path:
    destination = root / "raw" / dataset
    destination.mkdir(parents=True, exist_ok=True)
    if dataset == "berka":
        archive = destination / "berka.zip"
        download(BERKA_URL, archive)
        # Copy only expected regular CSV files; never extract arbitrary archive paths.
        expected = {"account.csv", "card.csv", "client.csv", "disp.csv", "district.csv",
                    "loan.csv", "order.csv", "trans.csv"}
        with zipfile.ZipFile(archive) as z:
            for info in z.infolist():
                name = Path(info.filename).name
                if name in expected and not info.is_dir():
                    if info.file_size > 2_000_000_000:
                        raise ValueError("Unexpectedly large archive member")
                    with z.open(info) as source, (destination / name).open("wb") as target:
                        shutil.copyfileobj(source, target)
        if not all((destination / name).exists() for name in expected):
            raise ValueError("Berka archive lacks expected CSV files")
        url = BERKA_URL
    elif dataset == "gmsc":
        archive = destination / "gmsc.zip"
        download(GMSC_URL, archive)
        with zipfile.ZipFile(archive) as z:
            for info in z.infolist():
                if Path(info.filename).name == "cs-training.csv" and not info.is_dir():
                    with z.open(info) as source, (destination / "cs-training.csv").open("wb") as target:
                        shutil.copyfileobj(source, target)
        if not (destination / "cs-training.csv").exists():
            raise ValueError("GMSC archive lacks cs-training.csv")
        url = GMSC_URL
    else:
        raise ValueError("Automatic downloads support berka or gmsc only")
    manifest = {"dataset": dataset, "source_url": url,
                "files": {p.name: {"sha256": digest(p), "bytes": p.stat().st_size}
                          for p in destination.iterdir() if p.suffix in {".csv", ".zip", ".parquet"}},
                "verified_at_utc": pd.Timestamp.now(tz="UTC").isoformat()}
    (destination / "manifest.json").write_text(json.dumps(manifest, indent=2))
    return destination


def read_berka(path: Path) -> pd.DataFrame:
    return _read_csv(path)


def _read_csv(path: Path) -> pd.DataFrame:
    # Kaggle versions vary between semicolon and comma delimiters.
    with path.open() as stream:
        first = stream.readline()
    return pd.read_csv(path, sep=";" if first.count(";") > first.count(",") else ",",
                       low_memory=False)


def berka_date(values: pd.Series) -> pd.Series:
    return pd.to_datetime(values.astype(str).str.replace(r"\.0$", "", regex=True),
                          format="%y%m%d", errors="raise")


def prepare_berka(root: Path) -> dict:
    raw = root / "raw" / "berka"
    tx = read_berka(raw / "trans.csv")
    loans = read_berka(raw / "loan.csv")
    dispos = read_berka(raw / "disp.csv")
    owners = dispos[dispos["type"].eq("OWNER")].set_index("account_id")["client_id"]
    if owners.index.duplicated().any():
        raise ValueError("Ambiguous account ownership")
    tx["date"] = berka_date(tx["date"])
    loans["date"] = berka_date(loans["date"])
    types = {"PRIJEM": "credit", "VYDAJ": "debit", "VYBER": "debit"}
    direction = tx["type"].map(types)
    if direction.isna().any():
        raise ValueError(f"Unknown transaction types: {tx.loc[direction.isna(), 'type'].unique()}")
    # Explicit semantic tags. Unknown credits remain unknown, never automatically salary.
    symbols = tx["k_symbol"].fillna("").str.strip()
    categories = symbols.map({"DUCHOD": "pension", "UROK": "interest", "UVER": "loan_payment",
                              "SIPO": "household", "POJISTNE": "insurance",
                              "SLUZBY": "bank_fee", "SANKC. UROK": "penalty"}).fillna("unknown")
    normalized = pd.DataFrame({
        "transaction_id": tx["trans_id"].astype(str),
        "account_id": tx["account_id"].astype(str),
        "customer_id": tx["account_id"].map(owners).astype("Int64").astype(str),
        "date": tx["date"], "amount": pd.to_numeric(tx["amount"], errors="raise"),
        "direction": direction, "balance": pd.to_numeric(tx["balance"], errors="raise"),
        "category": categories, "currency": "CZK", "country": "CZ",
        "counterparty": tx["bank"].fillna("").astype(str) + ":" + tx["account"].fillna("").astype(str),
        "description": tx["operation"].fillna("").astype(str) + " " + symbols,
    })
    # Only completed loans have an observed final outcome. C/D are censored/ongoing,
    # not interchangeable with completed default/non-default outcomes.
    completed = loans[loans["status"].isin(["A", "B"])].copy()
    assessments = pd.DataFrame({
        "assessment_id": "berka-" + completed["loan_id"].astype(str),
        "customer_id": completed["account_id"].map(owners).astype("Int64").astype(str),
        "account_id": completed["account_id"].astype(str),
        "as_of": completed["date"], "target": completed["status"].eq("B").astype(int),
        "loan_duration_months": completed["duration"], "country": "CZ", "currency": "CZK",
    })
    if normalized["customer_id"].eq("<NA>").any() or assessments["customer_id"].eq("<NA>").any():
        raise ValueError("Unmapped account owner")
    processed = root / "processed"
    processed.mkdir(parents=True, exist_ok=True)
    normalized.to_parquet(processed / "berka_transactions.parquet", index=False)
    assessments.to_parquet(processed / "berka_assessments.parquet", index=False)
    summary = {"transactions": len(normalized), "accounts": normalized.account_id.nunique(),
               "all_loans": len(loans), "completed_loans": len(assessments),
               "completed_bad_loans": int(assessments.target.sum()),
               "excluded_ongoing_loans": len(loans) - len(assessments),
               "target": "Completed loan ended with unpaid debt (B) versus repaid (A)",
               "horizon": "Full original loan term; variable, not a fixed 12-month PD",
               "sampling": "None: all source transaction rows retained; censored outcomes excluded"}
    (processed / "berka_summary.json").write_text(json.dumps(summary, indent=2))
    return summary


def prepare_gmsc(root: Path) -> tuple[pd.DataFrame, dict]:
    df = pd.read_csv(root / "raw" / "gmsc" / "cs-training.csv")
    # Preserve raw tabular semantics. Never rename arrears to NACH bounces or invent transactions.
    target = "SeriousDlqin2yrs"
    df[target] = pd.to_numeric(df[target], errors="raise").astype(int)
    df = df.rename(columns={target: "target"})
    df["assessment_id"] = [f"gmsc-{i}" for i in range(len(df))]
    df["customer_id"] = df["assessment_id"]
    drop = [c for c in df if c.lower().startswith("unnamed") or c.lower() in {"id", "index"}]
    df = df.drop(columns=drop)
    summary = {"rows": len(df), "positive_outcomes": int(df.target.sum()),
               "target": "Serious delinquency within two years (source definition)",
               "sampling": "None", "statement_model": False,
               "limitation": "Borrower/credit-history table, not statement-derived cashflow validation"}
    return df, summary


def prepare_homecredit(directory: Path) -> tuple[pd.DataFrame, dict]:
    """Full application table plus chunked repayment aggregates strictly before application day."""
    application = pd.read_csv(directory / "application_train.csv")
    # No bureau score, demographics, employer IDs or geographic proxies in this baseline.
    selected = ["SK_ID_CURR", "TARGET", "AMT_INCOME_TOTAL", "AMT_CREDIT", "AMT_ANNUITY",
                "AMT_GOODS_PRICE", "DAYS_EMPLOYED", "DAYS_REGISTRATION", "DAYS_ID_PUBLISH"]
    out = application[selected].copy()
    out.loc[out.DAYS_EMPLOYED.eq(365243), "DAYS_EMPLOYED"] = np.nan
    out["annuity_to_income"] = out.AMT_ANNUITY / out.AMT_INCOME_TOTAL.replace(0, np.nan)
    out["credit_to_income"] = out.AMT_CREDIT / out.AMT_INCOME_TOTAL.replace(0, np.nan)
    aggregates = []
    count = 0
    for chunk in pd.read_csv(directory / "installments_payments.csv", chunksize=500_000):
        count += len(chunk)
        # A later payment must not reveal a missed payment at application time.
        eligible = chunk[chunk.DAYS_INSTALMENT.lt(0)].copy()
        observed = eligible.DAYS_ENTRY_PAYMENT.lt(0)
        eligible["paid_before"] = eligible.AMT_PAYMENT.where(observed, 0.0).fillna(0.0)
        eligible["last_observed_day"] = eligible.DAYS_ENTRY_PAYMENT.where(observed, np.nan)
        # Partial payments can have several rows per installment; aggregate before labelling lateness.
        aggregates.append(eligible.groupby(["SK_ID_CURR", "SK_ID_PREV", "NUM_INSTALMENT_VERSION",
                                           "NUM_INSTALMENT_NUMBER", "DAYS_INSTALMENT"], dropna=False)
                          .agg(due=("AMT_INSTALMENT", "max"), paid=("paid_before", "sum"),
                               last_day=("last_observed_day", "max")).reset_index())
    installments = pd.concat(aggregates, ignore_index=True)
    installments = installments.groupby(["SK_ID_CURR", "SK_ID_PREV", "NUM_INSTALMENT_VERSION",
                                         "NUM_INSTALMENT_NUMBER", "DAYS_INSTALMENT"], dropna=False).agg(
                                             due=("due", "max"), paid=("paid", "sum"),
                                             last_day=("last_day", "max")).reset_index()
    installments["unpaid_at_application"] = (installments.paid + 0.01 < installments.due).astype(int)
    installments["last_day"] = installments.last_day.where(installments.unpaid_at_application.eq(0), 0.0)
    installments["days_late"] = (installments.last_day - installments.DAYS_INSTALMENT).clip(lower=0)
    history = installments.groupby("SK_ID_CURR").agg(
        prior_installment_count=("due", "size"), prior_unpaid_share=("unpaid_at_application", "mean"),
        prior_days_late_mean=("days_late", "mean"), prior_days_late_max=("days_late", "max"))
    out = out.join(history, on="SK_ID_CURR")
    out = out.rename(columns={"TARGET": "target"})
    out["assessment_id"] = "hc-" + out.SK_ID_CURR.astype(str)
    out["customer_id"] = out["assessment_id"]
    out = out.drop(columns="SK_ID_CURR")
    return out, {"rows": len(out), "installment_source_rows": count, "sampling": "None",
                 "statement_model": False, "target": "Home Credit TARGET, see original data dictionary",
                 "limitation": "Historical lending population; no general bank statement transactions"}
