"""Observable statement facts, independent of loan history or an unvalidated score."""

from __future__ import annotations

import pandas as pd

from .features import KNOWN_INCOME, validate_transactions
from .model import clean_json


def cashflow_profile(transactions: pd.DataFrame, assessment: dict) -> dict:
    tx = validate_transactions(transactions)
    if not tx.customer_id.eq(str(assessment["customer_id"])).all() or not tx.account_id.eq(str(assessment["account_id"])).all():
        raise ValueError("Profile transactions must belong to the assessed customer and account")
    if tx.currency.nunique() != 1 or tx.country.nunique() != 1:
        raise ValueError("Profile requires one currency and country")
    cutoff = pd.Timestamp(assessment["as_of"])
    if cutoff.tzinfo is not None:
        cutoff = cutoff.tz_convert("UTC").tz_localize(None)
    cutoff = cutoff.normalize()
    tx = tx[(tx.date < cutoff) & (tx.date >= cutoff - pd.Timedelta(days=365))].copy()
    if tx.empty:
        return {"status": "no_history", "score": None}
    credit = tx.direction.eq("credit")
    debit = tx.direction.eq("debit")
    tx["credits"] = tx.amount.where(credit, 0.0)
    tx["debits"] = tx.amount.where(debit, 0.0)
    monthly = tx.groupby(tx.date.dt.to_period("M"))[["credits", "debits"]].sum()
    monthly["net_cashflow"] = monthly.credits - monthly.debits
    known = tx.loc[credit & tx.category.isin(KNOWN_INCOME), "amount"].sum()
    unknown = tx.loc[credit & tx.category.eq("unknown"), "amount"].sum()
    daily = tx.groupby("date").balance.last().reindex(
        pd.date_range(tx.date.min(), cutoff - pd.Timedelta(days=1)), method="ffill")
    # Do not manufacture zeros for missing source statement months.
    return clean_json({
        "status": "observed_cashflow_only", "score": None, "currency": tx.currency.iloc[0],
        "transaction_count": len(tx), "observed_history_days": (cutoff - tx.date.min()).days,
        "total_credits": round(float(tx.credits.sum()), 2),
        "total_debits": round(float(tx.debits.sum()), 2),
        "net_cashflow": round(float(tx.credits.sum() - tx.debits.sum()), 2),
        "closing_balance": float(tx.balance.iloc[-1]),
        "observed_daily_mean_balance": round(float(daily.mean()), 2),
        "days_with_negative_balance": int(daily.lt(0).sum()),
        "confirmed_income_from_supplied_categories": round(float(known), 2),
        "unidentified_credits": round(float(unknown), 2),
        "monthly": {str(k): v for k, v in monthly.round(2).to_dict("index").items()},
        "limitations": ["Credits are not automatically income; transfers and borrowing need identification",
                        "Daily balances assume the supplied statement period is complete",
                        "Loan repayment timeliness cannot be determined without due dates",
                        "Any separate Financial Behaviour Index is descriptive and not validated against repayment outcomes"],
    })
