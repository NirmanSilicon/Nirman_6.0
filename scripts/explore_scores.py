"""Generate comparison statements and find examples near 80 using a frozen demo model."""

from __future__ import annotations

import argparse
import hashlib
from pathlib import Path

import numpy as np
import pandas as pd

from uqual.features import extract_one as extract_v1
from uqual.features_v2 import FEATURE_VERSION as V2_VERSION, extract_one as extract_v2
from uqual.model import calibrated, write_json
from uqual.scoring import load_bundle, score_statement
from uqual.synthetic import simulate_borrower


def controlled_statement(name, income=30000, expense_ratio=.8, reserve_ratio=.25,
                         irregular=False, gig=False, transfers=False, seed=400):
    rng = np.random.default_rng(seed)
    events = []
    factors = [1, 1, 1, 1, 1, 1] if not irregular else [.45, 1.5, .6, 1.4, .5, 1.55]
    for month, factor in enumerate(factors):
        origin = pd.Timestamp("2026-05-01") + pd.DateOffset(months=month)
        splits = 20 if gig else 1
        amounts = np.full(splits, income * factor / splits)
        for j, amount in enumerate(amounts):
            day = int(j * 26 / splits)
            events.append((origin + pd.Timedelta(days=day), "credit", round(float(amount), 2),
                           "freelance_income" if gig else "salary", "employer" if not gig else f"client-{j}"))
        # Fixed spending across irregular-income months isolates income timing/variation.
        weights = rng.dirichlet(np.ones(35))
        cents = np.floor(income * expense_ratio * weights * 100).astype(int)
        cents[-1] += int(round(income * expense_ratio * 100)) - int(cents.sum())
        for j, amount in enumerate(cents):
            events.append((origin + pd.Timedelta(days=int(j * 27 / 35)), "debit", amount / 100,
                           "utility" if j % 10 == 0 else "groceries", f"merchant-{j % 12}"))
        if transfers:
            # Matched transfers add turnover but do not create net money.
            for j in range(10):
                day = origin + pd.Timedelta(days=j * 2 + 1)
                events.append((day, "credit", income * .1, "own_transfer", "own-account"))
                events.append((day, "debit", income * .1, "own_transfer", "own-account"))
    events.sort(key=lambda e: (e[0], e[1] != "credit"))
    balance = int(round(income * reserve_ratio * 100))
    rows = []
    for date, direction, amount, category, party in events:
        cents = int(round(amount * 100))
        if cents == 0:
            continue
        balance += cents if direction == "credit" else -cents
        rows.append({"transaction_id": f"{name}-{len(rows)}", "account_id": name, "customer_id": name,
                     "date": date, "direction": direction, "amount": cents / 100, "balance": balance / 100,
                     "category": category, "counterparty": party, "country": "IN", "currency": "INR"})
    assessment = {"assessment_id": name, "customer_id": name, "account_id": name,
                  "as_of": "2026-11-01", "country": "IN", "currency": "INR"}
    return pd.DataFrame(rows), assessment


def save_case(root, name, tx, assessment, result):
    path = root / "statements" / name
    path.mkdir(parents=True)
    tx.to_csv(path / "transactions.csv", index=False)
    display = pd.DataFrame({"Date": pd.to_datetime(tx.date).dt.strftime("%Y-%m-%d"),
                            "Description": "SYNTHETIC " + tx.category,
                            "Debit": tx.amount.where(tx.direction.eq("debit"), 0),
                            "Credit": tx.amount.where(tx.direction.eq("credit"), 0),
                            "Balance": tx.balance, "TransactionID": tx.transaction_id,
                            "Category": tx.category})
    display.to_csv(path / "statement.csv", index=False)
    write_json(path / "assessment.json", assessment)
    write_json(path / "score.json", result)


def main():
    parser = argparse.ArgumentParser()
    parser.add_argument("--model", type=Path, default=Path("artifacts/synthetic-india-v1/model.joblib"))
    parser.add_argument("--out", type=Path, default=Path("artifacts/score-exploration-v1"))
    parser.add_argument("--candidates", type=int, default=500)
    parser.add_argument("--seed", type=int, default=20261112)
    args = parser.parse_args()
    if args.out.exists():
        raise ValueError("Choose a new output directory")
    if args.candidates < 1:
        raise ValueError("Positive candidate count required")
    args.out.mkdir(parents=True)
    original_hash = hashlib.sha256(args.model.read_bytes()).hexdigest()
    bundle = load_bundle(args.model)
    extract_one = extract_v2 if bundle.get("feature_version") == V2_VERSION else extract_v1
    if bundle.get("dataset") != "synthetic_india":
        raise ValueError("This exploration requires the explicitly synthetic artifact")
    results = []
    cases = [
        ("stable_60pct_spending", dict(expense_ratio=.6, reserve_ratio=1)),
        ("stable_80pct_spending", dict(expense_ratio=.8, reserve_ratio=.25)),
        ("stable_95pct_spending", dict(expense_ratio=.95, reserve_ratio=.05)),
        ("stable_100pct_spending", dict(expense_ratio=1.00, reserve_ratio=.05)),
        ("stable_101pct_spending", dict(expense_ratio=1.01, reserve_ratio=.05)),
        ("stable_102pct_spending", dict(expense_ratio=1.02, reserve_ratio=.05)),
        ("stable_103pct_spending", dict(expense_ratio=1.03, reserve_ratio=.05)),
        ("spending_above_inflow", dict(expense_ratio=1.05, reserve_ratio=.05)),
        ("irregular_80pct_spending", dict(expense_ratio=.8, reserve_ratio=.25, irregular=True)),
        ("gig_80pct_spending", dict(expense_ratio=.8, reserve_ratio=.25, gig=True)),
        ("matched_own_transfers", dict(expense_ratio=.8, reserve_ratio=.25, transfers=True)),
    ]
    for name, parameters in cases:
        tx, assessment = controlled_statement(name, **parameters)
        result = score_statement(bundle, tx, assessment, synthetic_demo=True)
        save_case(args.out, name, tx, assessment, result)
        results.append({"case": name, "kind": "controlled", "parameters": parameters,
                        "status": result["status"], "score": result["synthetic_risk_index"],
                        "profile": result["cashflow_profile"], "evidence": result.get("evidence"),
                        "top_reasons": result["reasons"]})
        print(name, result["status"], result["synthetic_risk_index"], flush=True)

    # New seed: these are newly generated profiles, not selected training examples.
    candidates = []
    for i in range(args.candidates):
        tx, assessment, _, latent = simulate_borrower(i, args.seed)
        values, reasons = extract_one(tx, assessment["as_of"])
        row = {"candidate_index": i, "persona": latent["persona"], "eligible": not reasons,
               "history_months": latent["history_months"], "as_of": assessment["as_of"], **values}
        candidates.append(row)
        if (i + 1) % 100 == 0:
            print(f"Generated comparison candidates: {i + 1}/{args.candidates}", flush=True)
    candidate_frame = pd.DataFrame(candidates)
    eligible = candidate_frame[candidate_frame.eligible].copy()
    eligible["batch_score"] = 100 * (1 - calibrated(bundle, eligible))
    bounds = bundle["feature_bounds"]
    eligible["outside_count"] = [sum(pd.notna(row[c]) and (row[c] < b[0] or row[c] > b[1])
                                     for c, b in bounds.items()) for row in eligible.to_dict("records")]
    eligible["applicable"] = ~((eligible.outside_count >= 3) &
                                (eligible.outside_count / len(bundle["features"]) > .2))
    eligible["distance_to_80"] = (eligible.batch_score - 80).abs()
    columns = ["candidate_index", "batch_score", "outside_count", "applicable", "distance_to_80"]
    candidate_frame.merge(eligible[columns], on="candidate_index", how="left").to_csv(
        args.out / "candidate_scores.csv", index=False)
    chosen = eligible[eligible.applicable].sort_values("distance_to_80").head(6)
    near = []
    for _, row in chosen.iterrows():
        i = int(row.candidate_index)
        tx, assessment, _, latent = simulate_borrower(i, args.seed)
        result = score_statement(bundle, tx, assessment, synthetic_demo=True)
        assert result["status"] == "synthetic_demo_only"
        assert abs(result["synthetic_risk_index"] - row.batch_score) <= .005001
        name = f"near80_{latent['persona']}_{i:04d}"
        save_case(args.out, name, tx, assessment, result)
        entry = {"case": name, "kind": "selected_near_80", "candidate_index": i,
                 "status": result["status"], "score": result["synthetic_risk_index"],
                 "persona": latent["persona"], "profile": result["cashflow_profile"],
                 "evidence": result["evidence"], "top_reasons": result["reasons"]}
        near.append(entry)
        results.append(entry)
        print(name, result["synthetic_risk_index"], flush=True)
    assert hashlib.sha256(args.model.read_bytes()).hexdigest() == original_hash
    write_json(args.out / "results.json", {
        "scope": "Synthetic demonstration behavior exploration; targeted examples are not an accuracy benchmark",
        "model_sha256": original_hash, "model_modified": False, "new_seed": args.seed,
        "random_candidates": args.candidates, "eligible_candidates": len(eligible),
        "applicable_candidates": int(eligible.applicable.sum()),
        "near_80_band": "79.5 to 80.5 inclusive (rounds approximately to 80)",
        "near_80_count": int(((eligible.batch_score >= 79.5) & (eligible.batch_score <= 80.5) & eligible.applicable).sum()),
        "cases": results})
    lines = ["# Synthetic statement score exploration", "",
             "Frozen synthetic-trained model; no weights, thresholds or score rules changed. "
             "Examples near 80 were deliberately selected after scoring new generated candidates; "
             "they are not independent validation or guaranteed recipes for real users.", "",
             "| Statement | Score / 100 | Avg monthly credits | Avg monthly debits | Closing balance |",
             "|---|---:|---:|---:|---:|"]
    for entry in results:
        p = entry["profile"]
        months = len(p.get("monthly", {}))
        score = entry["score"]
        lines.append(f"| {entry['case']} | {score if score is not None else entry['status']} | "
                     f"{p['total_credits']/months:.2f} | {p['total_debits']/months:.2f} | {p['closing_balance']:.2f} |")
    lines.extend(["", "Credits can include own-account transfers and refunds; they are not automatically income.",
                  "All amounts are synthetic INR values. A score near 80 means approximately 0.20 model "
                  "probability of the simulator-defined stress event, not a real-world default probability.", "",
                  "Each case folder contains statement.csv, normalized transactions.csv, assessment.json and score.json.",
                  "Full candidate results, including unsupported inputs, are recorded in candidate_scores.csv. "
                  "Use results.json for exact counts, applicability, feature evidence and raw-model SHAP reasons."])
    (args.out / "REPORT.md").write_text("\n".join(lines) + "\n")


if __name__ == "__main__":
    main()
