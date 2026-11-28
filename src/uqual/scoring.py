"""Local scoring, with explicit abstention outside the training population."""

from __future__ import annotations

import hashlib
import json
from pathlib import Path

import joblib
import numpy as np
import pandas as pd

from .features import FEATURE_VERSION, build_features
from .model import calibrated, clean_json, explain
from .profile import cashflow_profile
from .behaviour import financial_behaviour
from . import features_v2


def _read_artifact(path: Path) -> dict:
    # joblib uses pickle. Load only locally trained artifacts, never user-uploaded files.
    required = ["metrics.json", "MODEL_CARD.md", "explanations.json", "test_predictions.csv",
                "split_assignments.csv", "candidate_results.json"]
    if any(not (path.parent / filename).is_file() for filename in required):
        raise ValueError("Training run is incomplete; a full model card and evaluation outputs are required")
    report = json.loads((path.parent / "metrics.json").read_text())
    if hashlib.sha256(path.read_bytes()).hexdigest() != report["artifact_sha256"]:
        raise ValueError("Artifact checksum differs from the completed training report")
    return joblib.load(path)


def load_bundle(path: Path) -> dict:
    bundle = _read_artifact(path)
    if bundle.get("dataset") not in {"berka", "custom", "synthetic_india"} or bundle.get("feature_version") not in {FEATURE_VERSION, features_v2.FEATURE_VERSION}:
        raise ValueError("Statement scoring requires a cashflow artifact with the matching feature contract")
    return bundle


def score_statement(bundle: dict, transactions: pd.DataFrame, assessment: dict,
                    allow_out_of_domain: bool = False, synthetic_demo: bool = False) -> dict:
    synthetic = bundle.get("dataset") == "synthetic_india"
    if synthetic and not synthetic_demo:
        raise ValueError("Synthetic artifact requires explicit score-synthetic mode; it is not a validated credit model")
    if synthetic_demo and not synthetic:
        raise ValueError("score-synthetic requires a synthetic_india artifact")
    v2 = bundle.get("feature_version") == features_v2.FEATURE_VERSION
    builder = features_v2.build_features if v2 else build_features
    frame = builder(transactions, pd.DataFrame([assessment]))
    row = frame.iloc[0]
    notices = ["Research model; not an official credit score or validated UQUAL Financial Behaviour Index",
               "Known income excludes unknown credits; unidentified transfers/refunds can still affect gross cashflow",
               "SHAP associations do not establish that changing a feature will improve repayment outcomes"]
    notices.extend(bundle.get("validation_warnings", []))
    result = {"assessment_id": assessment["assessment_id"], "status": "insufficient_data",
              "risk_probability": None, "research_risk_index": None, "reasons": [],
              "model_name": bundle["model_name"], "training_country": bundle["country"],
              "feature_version": bundle.get("feature_version", FEATURE_VERSION), "notices": notices}
    result["approved_for_lending"] = False
    result["data_origin"] = "synthetic" if synthetic else "source_dataset"
    if synthetic:
        result.update(synthetic_risk_index=None, simulated_stress_probability=None,
                      score_meaning="100 × (1 − model probability of simulator-defined repayment stress); not real-world creditworthiness")
        notices.insert(0, "SYNTHETIC DEMO: learned assumptions from simulated data, not real Indian repayment outcomes")
    result["cashflow_profile"] = cashflow_profile(transactions, assessment)
    result["financial_behaviour"] = financial_behaviour(transactions, assessment)
    if not row.eligible:
        result["reasons"] = row.exclusion_reasons.split("; ")
        return result
    country = str(assessment.get("country", ""))
    currency = str(assessment.get("currency", ""))
    mismatch = country != bundle["country"] or currency != bundle["currency"]
    outside = [name for name, bounds in bundle.get("feature_bounds", {}).items()
               if name in row and pd.notna(row[name]) and (row[name] < bounds[0] or row[name] > bounds[1])]
    result["outside_training_range_features"] = outside
    result["applicability_policy"] = "Country/currency must match; abstain when >20% and >=3 predictors exceed observed training bounds"
    if mismatch:
        notices.append("Input population/currency differs from training data; Indian accuracy is unknown")
        result["status"] = "out_of_domain"
        result["reasons"] = ["No validated model for the supplied country/currency; cashflow indicators are available"]
        if allow_out_of_domain:
            notices.append("Research override now supplies diagnostics only; it cannot bypass unsupported-population abstention")
        return clean_json(result)
    missing = set(bundle["features"]) - set(frame)
    if missing:
        raise ValueError(f"Feature contract mismatch: {sorted(missing)}")
    if len(outside) >= 3 and len(outside) / len(bundle["features"]) > .2:
        result["status"] = "unsupported_feature_distribution"
        result["reasons"] = ["Too many predictors exceed the training population's observed ranges"]
        notices.append("Applicability threshold is a conservative engineering policy, not a validated accuracy boundary")
        return clean_json(result)
    p = float(calibrated(bundle, frame)[0])
    result.update(status="research_only_out_of_domain" if mismatch else "research_only",
                  risk_probability=p, research_risk_index=round(100 * (1 - p), 2),
                  target=bundle["target"], threshold=bundle["threshold"],
                  research_risk_flag=bool(p >= bundle["threshold"]),
                  reasons=explain(bundle, frame, top=6)[0],
                  evidence={k: clean_json(row[k]) for k in
                            (list(features_v2.RISK_DIRECTIONS) if v2 else ["history_days", "transaction_count",
                            "complete_month_count", "unknown_credit_share", "net_surplus_ratio"])})
    if outside:
        notices.append("Some features are outside the observed training range; probability reliability is uncertain")
    if synthetic:
        result.update(status="synthetic_demo_only", risk_probability=None, research_risk_index=None,
                      synthetic_risk_index=round(100 * (1 - p), 2), simulated_stress_probability=p,
                      synthetic_stress_flag=result.pop("research_risk_flag"))
    tx = transactions.copy()
    tx["date"] = pd.to_datetime(tx.date)
    tx = tx[(tx.date < pd.Timestamp(assessment["as_of"])) &
            (tx.date >= pd.Timestamp(assessment["as_of"]) - pd.Timedelta(days=365))]
    examples = []
    for category in ["salary", "loan_payment", "rent", "utility", "groceries", "refund", "unknown"]:
        rows = tx[tx.category.eq(category)].tail(2)
        for _, item in rows.iterrows():
            examples.append({"transaction_id": str(item.transaction_id), "date": str(item.date.date()),
                             "category": category, "direction": str(item.direction), "amount": float(item.amount),
                             "description": str(item.get("description", ""))[:100]})
    result["score_explanation"] = {"method": "SHAP on raw synthetic model output; not additive points on the 0-100 display",
        "risk_increasing_features": [x for x in result["reasons"] if x["shap_contribution"] > 0],
        "risk_decreasing_features": [x for x in result["reasons"] if x["shap_contribution"] < 0],
        "supporting_transactions": examples,
        "evidence_note": "Transactions are category examples behind aggregate features, not causal attributions to individual payments."}
    return clean_json(result)


def score_tabular(model_path: Path, frame: pd.DataFrame) -> pd.DataFrame:
    bundle = _read_artifact(model_path)
    if bundle.get("dataset") not in {"gmsc", "homecredit"}:
        raise ValueError("Tabular scoring requires a tabular benchmark artifact, not statement features")
    missing = set(bundle["features"]) - set(frame)
    if missing:
        raise ValueError(f"Use the model's original tabular columns; missing: {sorted(missing)}")
    numeric = frame[bundle["features"]].apply(pd.to_numeric, errors="raise")
    if np.isinf(numeric.to_numpy()).any():
        raise ValueError("Infinite features are invalid")
    p = calibrated(bundle, numeric)
    return pd.DataFrame({"row": np.arange(len(frame)), "research_risk_probability": p,
                         "research_risk_index": 100 * (1 - p), "dataset": bundle["dataset"],
                         "approved_for_lending": False})


def simulate(amount: float, annual_rate: float, months: int, monthly_income: float,
             monthly_expenses: float, existing_emi: float = 0) -> dict:
    numbers = [amount, annual_rate, monthly_income, monthly_expenses, existing_emi]
    if not all(np.isfinite(numbers)) or amount <= 0 or not 1 <= months <= 600:
        raise ValueError("Finite values, positive principal, and 1–600 months are required")
    if min(annual_rate, monthly_income, monthly_expenses, existing_emi) < 0:
        raise ValueError("Rates, income and expenses cannot be negative")
    rate = annual_rate / 1200
    emi = amount / months if rate == 0 else amount * rate / (1 - (1 + rate) ** -months)
    scenarios = [{"income_reduction": reduction, "expense_increase": expense,
                  "monthly_surplus_after_emi": round(monthly_income * (1 - reduction) -
                                                     monthly_expenses * (1 + expense) - existing_emi - emi, 2)}
                 for reduction in [0, .1, .2, .3] for expense in [0, .1]]
    return {"monthly_emi": round(emi, 2), "total_repayment_excluding_fees": round(emi * months, 2),
            "scenarios": scenarios, "scope": "Arithmetic stress scenarios; no prediction of approval or credit-score change"}
