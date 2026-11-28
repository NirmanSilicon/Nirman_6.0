"""Versioned cashflow features with explicit risk directions and ledger checks."""

from __future__ import annotations

import json
from pathlib import Path

import numpy as np
import pandas as pd

from .features import NON_FEATURES, validate_transactions

FEATURE_VERSION = "cashflow-monotone-v2"
# Direction of increasing RAW adverse-outcome probability, not a fairness claim.
RISK_DIRECTIONS = {
    "external_outflow_ratio": 1,
    "mean_liquidity_ratio": -1,
    "minimum_liquidity_ratio": -1,
    "ending_liquidity_ratio": -1,
    "negative_balance_share": 1,
    "low_liquidity_share": 1,
    "deficit_month_share": 1,
    "low_surplus_month_share": 1,
    "external_inflow_cv": 1,
    "obligations_ratio": 1,
}


def extract_one(tx: pd.DataFrame, as_of) -> tuple[dict, list[str]]:
    cutoff = pd.Timestamp(as_of)
    if cutoff.tzinfo is not None:
        cutoff = cutoff.tz_convert("UTC").tz_localize(None)
    cutoff = cutoff.normalize()
    h = tx[(tx.date < cutoff) & (tx.date >= cutoff - pd.Timedelta(days=365))].copy()
    if h.empty:
        return {}, ["No transactions before the assessment date"]
    signed = h.amount.where(h.direction.eq("credit"), -h.amount)
    residual = h.balance.diff().iloc[1:] - signed.iloc[1:]
    if residual.abs().gt(.011).any():
        raise ValueError("Running balances do not reconcile; check ordering, missing or conflicting transactions")
    start = h.date.min()
    days = (cutoff - start).days
    credit, debit = h.direction.eq("credit"), h.direction.eq("debit")
    own = h.category.eq("own_transfer")
    refund = h.category.isin(["refund", "reversal"])
    excluded = own | refund | h.category.eq("loan_disbursement")
    h["external_credit"] = h.amount.where(credit & ~excluded, 0.0)
    h["external_debit"] = h.amount.where(debit & ~own & ~refund, 0.0)
    h["refund"] = h.amount.where(credit & refund, 0.0)
    total = float(h.external_credit.sum())
    reasons = []
    if days < 90:
        reasons.append("Fewer than 90 days of observed history")
    if len(h) < 20:
        reasons.append("Fewer than 20 transactions")
    if not credit.any() or not debit.any():
        reasons.append("Both credits and debits are required")
    if total <= 0:
        return {}, reasons + ["No external credits remain after identified transfers, refunds and borrowing"]
    monthly = h.groupby(h.date.dt.to_period("M"))[["external_credit", "external_debit", "refund"]].sum()
    index = pd.period_range(start.to_period("M"), (cutoff - pd.Timedelta(days=1)).to_period("M"))
    monthly = monthly.reindex(index, fill_value=0)
    monthly["net_expense"] = (monthly.external_debit - monthly.refund).clip(lower=0)
    complete = monthly[(monthly.index.start_time >= start) & ((monthly.index + 1).start_time <= cutoff)]
    if len(complete) < 2:
        reasons.append("At least two complete calendar months are required")
    daily = h.groupby("date", sort=True).balance.last().reindex(
        pd.date_range(start, cutoff - pd.Timedelta(days=1)), method="ffill")
    scale = total / max(days, 1) * 30
    net_outflow = max(float(h.external_debit.sum() - h.refund.sum()), 0)
    obligations = h.loc[debit & h.category.isin(["loan_payment", "rent", "insurance", "utility", "household"]), "amount"].sum()
    means = complete.external_credit.mean() if len(complete) else np.nan
    values = {
        "external_outflow_ratio": net_outflow / total,
        "mean_liquidity_ratio": daily.mean() / scale,
        "minimum_liquidity_ratio": daily.min() / scale,
        "ending_liquidity_ratio": daily.iloc[-1] / scale,
        "negative_balance_share": daily.lt(0).mean(),
        "low_liquidity_share": daily.lt(.1 * scale).mean(),
        "deficit_month_share": (complete.net_expense > complete.external_credit).mean(),
        "low_surplus_month_share": (complete.net_expense > .85 * complete.external_credit).mean(),
        "external_inflow_cv": complete.external_credit.std(ddof=0) / means if means > 0 else np.nan,
        "obligations_ratio": float(obligations) / total,
    }
    return {key: float(value) for key, value in values.items()}, reasons


def build_features(transactions: pd.DataFrame, assessments: pd.DataFrame) -> pd.DataFrame:
    tx = validate_transactions(transactions)
    required = {"assessment_id", "customer_id", "account_id", "as_of"}
    if not required.issubset(assessments) or assessments.assessment_id.duplicated().any():
        raise ValueError("Unique assessment IDs and complete ownership/date fields are required")
    groups = {k: g for k, g in tx.groupby(["customer_id", "account_id"], sort=False)}
    rows = []
    for record in assessments.to_dict("records"):
        record = {k: v for k, v in record.items() if k in NON_FEATURES}
        h = groups.get((str(record["customer_id"]), str(record["account_id"])))
        if h is None:
            values, reasons = {}, ["No account history"]
        else:
            for key in ["country", "currency"]:
                if h[key].nunique() != 1 or (key in record and record[key] != h[key].iloc[0]):
                    raise ValueError(f"Assessment {key} differs from transactions")
            values, reasons = extract_one(h, record["as_of"])
        rows.append({**record, **values, "eligible": not reasons, "exclusion_reasons": "; ".join(reasons)})
    return pd.DataFrame(rows)


def prepare_synthetic(source: Path) -> dict:
    """Re-extract all saved source ledgers, preserving v1 features and labels."""
    assessments = pd.read_parquet(source / "assessments.parquet").set_index("customer_id")
    rows = []
    for path in sorted((source / "transactions").glob("*.parquet")):
        tx = validate_transactions(pd.read_parquet(path))
        for customer, history in tx.groupby("customer_id", sort=False):
            record = assessments.loc[customer].to_dict()
            record["customer_id"] = customer
            values, reasons = extract_one(history, record["as_of"])
            rows.append({**record, **values, "eligible": not reasons, "exclusion_reasons": "; ".join(reasons)})
        print(f"{FEATURE_VERSION}: extracted {len(rows):,} profiles", flush=True)
    frame = pd.DataFrame(rows)
    if len(frame) != len(assessments) or frame.customer_id.duplicated().any():
        raise ValueError("Feature extraction did not cover each source borrower exactly once")
    frame.to_parquet(source / "features_monotone_v2.parquet", index=False)
    summary = {"feature_version": FEATURE_VERSION, "rows": len(frame),
               "eligible": int(frame.eligible.sum()), "excluded": int((~frame.eligible).sum())}
    (source / "feature_manifest_v2.json").write_text(json.dumps(summary, indent=2))
    return summary
