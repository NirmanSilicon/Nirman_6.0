"""One feature contract for training and scoring. Assessment-day transactions are excluded."""

from __future__ import annotations

import numpy as np
import pandas as pd

FEATURE_VERSION = "cashflow-v1"
EXCLUDED_CREDITS = {"own_transfer", "refund", "loan_disbursement", "reversal"}
KNOWN_INCOME = {"salary", "pension", "freelance_income", "business_income"}
REQUIRED = {"transaction_id", "account_id", "customer_id", "date", "amount", "direction",
            "balance", "category", "currency", "country"}
NON_FEATURES = {"assessment_id", "customer_id", "account_id", "as_of", "target", "country",
                "currency", "loan_duration_months", "eligible", "exclusion_reasons"}


def validate_transactions(df: pd.DataFrame) -> pd.DataFrame:
    missing = REQUIRED - set(df)
    if missing:
        raise ValueError(f"Missing transaction columns: {sorted(missing)}")
    if df.empty:
        raise ValueError("No transactions supplied")
    out = df.copy()
    for key in ["transaction_id", "account_id", "customer_id", "currency", "country"]:
        if out[key].isna().any():
            raise ValueError(f"Null {key}")
        out[key] = out[key].astype(str)
        if out[key].str.strip().eq("").any():
            raise ValueError(f"Empty {key}")
    out["date"] = pd.to_datetime(out["date"], errors="raise", utc=True).dt.tz_localize(None)
    if not out["date"].eq(out["date"].dt.normalize()).all():
        raise ValueError("Use date-only transaction dates (YYYY-MM-DD)")
    for key in ["amount", "balance"]:
        out[key] = pd.to_numeric(out[key], errors="raise")
        if not np.isfinite(out[key]).all():
            raise ValueError(f"Non-finite {key}; statement balance is required")
    if out.amount.lt(0).any():
        raise ValueError("amount must be unsigned; use direction for debit/credit")
    if not out.direction.isin(["credit", "debit"]).all():
        raise ValueError("direction must be credit or debit")
    out["category"] = out.category.fillna("unknown").astype(str).str.lower().str.strip()
    keys = ["customer_id", "account_id", "transaction_id"]
    if out.duplicated(keys).any():
        # Re-uploading exactly the same row is idempotent; contradictory IDs are errors.
        out = out.drop_duplicates()
        if out.duplicated(keys).any():
            raise ValueError("Conflicting rows have the same transaction ID")
    if out.groupby("account_id").customer_id.nunique().gt(1).any():
        raise ValueError("An account cannot have multiple customer owners in this contract")
    return out.sort_values(["customer_id", "account_id", "date"], kind="stable").reset_index(drop=True)


def _ratio(numerator: float, denominator: float) -> float:
    return float(numerator / denominator) if abs(denominator) > 1e-9 else np.nan


def _cv(values: pd.Series) -> float:
    return _ratio(float(values.std(ddof=0)), abs(float(values.mean())))


def extract_one(tx: pd.DataFrame, as_of: pd.Timestamp) -> tuple[dict, list[str]]:
    """Input is already restricted to one account; never join different currencies."""
    as_of = pd.Timestamp(as_of)
    if as_of.tzinfo is not None:
        as_of = as_of.tz_convert("UTC").tz_localize(None)
    as_of = as_of.normalize()
    history = tx[(tx.date < as_of) & (tx.date >= as_of - pd.Timedelta(days=365))].copy()
    if history.empty:
        return {}, ["No transactions before the assessment date"]
    start = history.date.min()
    days = max((as_of - start).days, 1)
    credit = history.direction.eq("credit")
    debit = history.direction.eq("debit")
    history["inflow"] = history.amount.where(credit, 0.0)
    history["outflow"] = history.amount.where(debit, 0.0)
    history["income"] = history.amount.where(credit & history.category.isin(KNOWN_INCOME), 0.0)
    history["usable_inflow"] = history.amount.where(credit & ~history.category.isin(EXCLUDED_CREDITS), 0.0)
    # Gross eligible credits are not called income: unknown deposits might be borrowing/transfers.
    history["net"] = history.inflow - history.outflow
    month_index = pd.period_range(start.to_period("M"), (as_of - pd.Timedelta(days=1)).to_period("M"))
    monthly = history.groupby(history.date.dt.to_period("M"))[
        ["inflow", "outflow", "income", "usable_inflow", "net"]].sum().reindex(month_index, fill_value=0)
    # First/last partial calendar months are excluded from stability statistics.
    complete = monthly[(monthly.index.start_time >= start) &
                       ((monthly.index + 1).start_time <= as_of)]
    stable = complete if len(complete) >= 2 else monthly.iloc[:0]
    inflow = float(history.inflow.sum())
    outflow = float(history.outflow.sum())
    monthly_scale = inflow / days * 30
    daily = history.groupby("date", sort=True).balance.last().reindex(
        pd.date_range(start, as_of - pd.Timedelta(days=1)), method="ffill")
    features = {
        "history_days": float(days), "transaction_count": float(len(history)),
        "active_day_share": history.date.nunique() / days,
        "credit_count_share": float(credit.mean()),
        "debit_to_credit_ratio": _ratio(outflow, inflow),
        "net_surplus_ratio": _ratio(inflow - outflow, inflow),
        "known_income_share": _ratio(history.income.sum(), inflow),
        "unknown_credit_share": _ratio(history.loc[credit & history.category.eq("unknown"), "amount"].sum(), inflow),
        "excluded_credit_share": _ratio(history.loc[credit & history.category.isin(EXCLUDED_CREDITS), "amount"].sum(), inflow),
        "complete_month_count": float(len(complete)),
        "inflow_cv": _cv(stable.inflow) if len(stable) >= 2 else np.nan,
        "outflow_cv": _cv(stable.outflow) if len(stable) >= 2 else np.nan,
        "negative_cashflow_month_share": float((stable.net < 0).mean()) if len(stable) else np.nan,
        "zero_credit_month_share": float(stable.inflow.eq(0).mean()) if len(stable) else np.nan,
        "mean_balance_to_monthly_credits": _ratio(daily.mean(), monthly_scale),
        "min_balance_to_monthly_credits": _ratio(daily.min(), monthly_scale),
        "balance_std_to_monthly_credits": _ratio(daily.std(ddof=0), monthly_scale),
        "negative_balance_day_share": float(daily.lt(0).mean()),
        "low_buffer_day_share": float(daily.lt(monthly_scale * 0.1).mean()) if inflow > 0 else np.nan,
        "balance_trend_normalized": _ratio(np.polyfit(np.arange(len(daily)), daily, 1)[0] * 30,
                                           monthly_scale) if len(daily) > 1 else np.nan,
        "largest_credit_share": _ratio(history.loc[credit, "amount"].max(), inflow),
        "largest_debit_share": _ratio(history.loc[debit, "amount"].max(), outflow),
    }
    for label, categories in {"obligation": {"loan_payment", "rent", "insurance", "utility", "household"},
                               "loan_payment": {"loan_payment"}, "penalty": {"penalty"},
                               "bank_fee": {"bank_fee"}}.items():
        amount = history.loc[debit & history.category.isin(categories), "amount"].sum()
        features[f"{label}_to_credits"] = _ratio(amount, inflow)
    amounts = history.loc[debit].groupby("category").amount.sum()
    proportions = amounts / amounts.sum() if amounts.sum() > 0 else pd.Series(dtype=float)
    features["spending_category_entropy"] = float(-(proportions * np.log(proportions)).sum())
    features["unknown_transaction_share"] = float(history.category.eq("unknown").mean())
    if "counterparty" in history:
        parties = history.loc[credit].groupby("counterparty", dropna=False).amount.sum()
        features["credit_counterparty_concentration"] = _ratio(parties.max(), inflow)
    else:
        features["credit_counterparty_concentration"] = np.nan
    for window in [30, 90, 180, 365]:
        recent = history[history.date >= as_of - pd.Timedelta(days=window)]
        ci, co = recent.inflow.sum(), recent.outflow.sum()
        features[f"surplus_ratio_{window}d"] = _ratio(ci - co, ci)
        features[f"credit_activity_{window}d"] = float(recent.inflow.gt(0).sum()) / min(days, window) * 30
        features[f"outflow_to_total_{window}d"] = _ratio(co, outflow)
    for name in ["inflow", "outflow"]:
        if len(complete) >= 4:
            half = len(complete) // 2
            features[f"{name}_recent_to_prior"] = _ratio(complete[name].iloc[-half:].mean(),
                                                          complete[name].iloc[:-half].mean())
        else:
            features[f"{name}_recent_to_prior"] = np.nan
    reasons = []
    if days < 90:
        reasons.append("Fewer than 90 days of observed history")
    if len(history) < 20:
        reasons.append("Fewer than 20 transactions")
    if not credit.any() or not debit.any():
        reasons.append("Both credits and debits are required")
    return {k: float(v) for k, v in features.items()}, reasons


def build_features(transactions: pd.DataFrame, assessments: pd.DataFrame) -> pd.DataFrame:
    tx = validate_transactions(transactions)
    required = {"assessment_id", "customer_id", "account_id", "as_of"}
    if not required.issubset(assessments):
        raise ValueError(f"Missing assessment fields: {sorted(required - set(assessments))}")
    if assessments.assessment_id.duplicated().any():
        raise ValueError("Duplicate assessment IDs")
    groups = {key: frame for key, frame in tx.groupby(["customer_id", "account_id"], sort=False)}
    rows = []
    for record in assessments.to_dict("records"):
        # Only known assessment metadata may survive: outcome-derived columns must not
        # accidentally become predictors in a custom training file.
        record = {k: v for k, v in record.items() if k in NON_FEATURES}
        key = str(record["customer_id"]), str(record["account_id"])
        group = groups.get(key)
        if group is None:
            values, reasons = {}, ["No account history"]
        else:
            if group.currency.nunique() != 1 or group.country.nunique() != 1:
                raise ValueError("Mixed currency or country within an account")
            for field in ["currency", "country"]:
                if field in record and record[field] != group[field].iloc[0]:
                    raise ValueError(f"Assessment {field} differs from transactions")
            values, reasons = extract_one(group, pd.Timestamp(record["as_of"]))
        rows.append({**record, **values, "eligible": not reasons,
                     "exclusion_reasons": "; ".join(reasons)})
    return pd.DataFrame(rows)


def feature_columns(frame: pd.DataFrame) -> list[str]:
    return [c for c in frame.columns if c not in NON_FEATURES]
