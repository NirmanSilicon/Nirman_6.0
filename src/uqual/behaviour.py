"""Transparent, descriptive statement indicators. Not a default predictor."""

from __future__ import annotations

import statistics

import pandas as pd

from .features import KNOWN_INCOME, validate_transactions
from .model import clean_json


OBLIGATIONS = {"loan_payment", "rent", "insurance", "utility"}


def financial_behaviour(transactions: pd.DataFrame, assessment: dict) -> dict:
    tx = validate_transactions(transactions)
    if tx.customer_id.nunique() != 1 or tx.account_id.nunique() != 1:
        raise ValueError("Behaviour analysis requires one customer and account")
    if not tx.customer_id.eq(str(assessment["customer_id"])).all() or not tx.account_id.eq(str(assessment["account_id"])).all():
        raise ValueError("Behaviour analysis account does not match assessment")
    end = pd.Timestamp(assessment["as_of"]).normalize() - pd.Timedelta(days=1)
    tx = tx[(tx.date <= end) & (tx.date >= end - pd.Timedelta(days=364))].copy()
    if tx.empty:
        return {"status": "insufficient_data", "index": None, "factors": [], "coach": []}
    start = tx.date.min()
    periods = pd.period_range(start.to_period("M"), end.to_period("M"))
    full = [p for p in periods if p.start_time >= start and p.end_time.normalize() <= end]
    tx = tx[tx.date.dt.to_period("M").isin(full)]
    if len(full) < 3 or tx.empty:
        return {"status": "insufficient_data", "index": None, "factors": [], "coach": [],
                "reason": "At least three complete calendar months are needed for a behaviour index",
                "complete_months": len(full)}
    credit, debit = tx.direction.eq("credit"), tx.direction.eq("debit")
    known_income = tx.loc[credit & tx.category.isin(KNOWN_INCOME)].groupby(tx.date.dt.to_period("M")).amount.sum().reindex(full, fill_value=0)
    spending = tx.loc[debit & ~tx.category.isin({'own_transfer', 'reversal'})].groupby(tx.date.dt.to_period("M")).amount.sum().reindex(full, fill_value=0)
    obligations = tx.loc[debit & tx.category.isin(OBLIGATIONS)].groupby(tx.date.dt.to_period("M")).amount.sum().reindex(full, fill_value=0)
    unknown_credits = float(tx.loc[credit & tx.category.eq("unknown"), "amount"].sum())
    unknown_debits = float(tx.loc[debit & tx.category.eq("unknown"), "amount"].sum())
    total_credits = float(tx.loc[credit, "amount"].sum())
    total_debits = float(tx.loc[debit, "amount"].sum())
    mean_income = float(known_income.mean())
    if mean_income <= 0 or unknown_credits / max(total_credits, 1) > .2 or unknown_debits / max(total_debits, 1) > .2:
        return clean_json({"status": "insufficient_data", "index": None, "factors": [], "coach": [],
                           "complete_months": len(full), "known_income": round(float(known_income.sum()), 2),
                           "unidentified_credits": round(unknown_credits, 2), "unclassified_debits": round(unknown_debits, 2),
                           "reason": "Identify income and spending categories first; more than 20% of credits or debits are unclassified, or no confirmed income was supplied"})
    income_cv = statistics.pstdev(known_income.tolist()) / mean_income
    spend_ratio = float(spending.sum()) / float(known_income.sum())
    savings_ratio = float((known_income - spending).sum()) / float(known_income.sum())
    obligation_ratio = float(obligations.sum()) / float(known_income.sum())
    deficit_share = float((spending > known_income).mean())
    # Fixed, published descriptive rubric. It is not fitted to repayment labels.
    specs = [
        ("income", "Income consistency", .20, income_cv, "Monthly categorized-income variation", max(0, 100 * (1 - min(income_cv, 1))), "lower"),
        ("spending", "Spending control", .20, spend_ratio, "Monthly debits excluding labelled own transfers and reversals / categorized income", max(0, min(100, 100 * (1.25 - spend_ratio) / .75)), "lower"),
        ("savings", "Savings capacity", .20, savings_ratio, "(Categorized income - external debits) / categorized income", max(0, min(100, 100 * savings_ratio / .25)), "higher"),
        ("obligations", "Recurring obligations", .15, obligation_ratio, "Tagged loan, rent, insurance and utility debits / categorized income", max(0, min(100, 100 * (1 - obligation_ratio / .6))), "lower"),
        ("cashflow", "Cashflow stability", .25, deficit_share, "Share of complete months where debits exceed categorized income", 100 * (1 - deficit_share), "lower"),
    ]
    factors = [{"key": key, "label": label, "weight": weight, "observed_ratio": round(value, 4),
                "measure": measure, "factor_score": round(score, 1), "contribution": round(weight * score, 1),
                "better_direction": direction} for key, label, weight, value, measure, score, direction in specs]
    index = round(sum(f["contribution"] for f in factors), 1)
    coach = []
    advice = {
        "income": "Check whether income arrives regularly; tag genuine income and avoid treating transfers as earnings.",
        "spending": "Review the largest debits and plan recurring expenses against confirmed monthly income.",
        "savings": "Consider a small buffer after essentials if your budget allows it.",
        "obligations": "List recurring dues and their dates so they fit within expected income.",
        "cashflow": "Look at deficit months and plan for predictable bills before optional spending.",
    }
    for factor in sorted(factors, key=lambda f: f["factor_score"]):
        if factor["factor_score"] < 70:
            coach.append({"factor": factor["key"], "observed_ratio": factor["observed_ratio"],
                          "message": advice[factor["key"]]})
        if len(coach) == 3:
            break
    monthly = [{"month": str(period), "confirmed_income": round(float(known_income.loc[period]), 2),
                "spending": round(float(spending.loc[period]), 2),
                "obligations": round(float(obligations.loc[period]), 2),
                "surplus": round(float(known_income.loc[period] - spending.loc[period]), 2)} for period in full]
    return clean_json({"status": "descriptive_only", "index": index, "scale": "0-100", "rubric_version": "fbi-v1",
                       "complete_months": len(full), "period": {"start": str(full[0].start_time.date()), "end": str(full[-1].end_time.date())},
                       "confirmed_income": round(float(known_income.sum()), 2), "total_debits": round(total_debits, 2),
                       "unidentified_credits": round(unknown_credits, 2), "unclassified_debits": round(unknown_debits, 2),
                       "factors": factors, "coach": coach, "monthly": monthly,
                       "meaning": "Descriptive cashflow habits from this statement; not a credit score, default probability, or lending decision.",
                       "limits": ["Categories supplied or confirmed by a user are not independently bank-verified; transfers are not income.",
                                  "Obligations are identified by category, not verified against loan contracts or due dates.",
                                  "The rubric and thresholds are engineering choices, not outcome-validated for Indian borrowers."]})


def scenario(transactions: pd.DataFrame, assessment: dict, discretionary_cut_pct: float) -> dict:
    if not 0 <= discretionary_cut_pct <= 30:
        raise ValueError("Choose a discretionary spending reduction from 0% to 30%")
    original = financial_behaviour(transactions, assessment)
    if original["index"] is None:
        return {"baseline": original, "projected": None, "reason": original.get("reason", "Insufficient data")}
    tx = validate_transactions(transactions).copy()
    eligible = tx.direction.eq("debit") & ~tx.category.isin(OBLIGATIONS | {"loan_payment", "unknown", "own_transfer", "bank_fee", "penalty"})
    if not eligible.any():
        return {"baseline": original, "projected": original, "delta": 0,
                "scope": "No classified discretionary debits were found; nothing was changed"}
    tx.loc[eligible, "amount"] *= 1 - discretionary_cut_pct / 100
    projected = financial_behaviour(tx, assessment)
    return clean_json({"baseline": original, "projected": projected, "delta": round(projected["index"] - original["index"], 1),
                       "changed_transaction_count": int(eligible.sum()), "discretionary_cut_pct": discretionary_cut_pct,
                       "scope": "Arithmetic what-if on selected debits only; balances and future behaviour are not predicted, and the synthetic credit model is unchanged"})
