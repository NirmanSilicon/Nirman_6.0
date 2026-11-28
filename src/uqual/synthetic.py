"""Explicitly synthetic transaction histories and future repayment-stress simulation.

No real borrower records or observed Indian outcomes are represented. Labels result
from a forward cash-budget simulation, not a claim about Indian default rates.
"""

from __future__ import annotations

import hashlib
import json
from collections import Counter
from pathlib import Path

import numpy as np
import pandas as pd

from .data import digest
from .features import extract_one, validate_transactions
from .model import write_json

GENERATOR_VERSION = "india-simulation-v1"
PERSONAS = ["salaried", "freelancer", "gig_worker", "student", "merchant", "pensioner"]


def _parts(rng, total: float, count: int) -> np.ndarray:
    weights = rng.dirichlet(np.ones(count))
    amounts = np.floor(total * weights * 100) / 100
    amounts[-1] = round(total - amounts[:-1].sum(), 2)
    return amounts


def simulate_borrower(index: int, seed: int, future_stress: float = 1.0):
    rng = np.random.default_rng(np.random.SeedSequence([seed, index]))
    persona = str(rng.choice(PERSONAS))
    base = float(np.clip(rng.lognormal(np.log(26000), .8), 2000, 250000))
    if persona == "student":
        base *= .35
    volatility = {"salaried": .12, "pensioner": .07, "student": .3,
                  "freelancer": .5, "gig_worker": .4, "merchant": .35}[persona]
    cost_ratio = float(rng.uniform(.4, 1.2))
    buffer = round(base * rng.choice([.02, .15, .5, 1.0, 3.0, 6.0]), 2)
    first_time = bool(rng.random() < .65)
    prior_emi = 0.0 if first_time else base * rng.uniform(.02, .25)
    months = int(rng.choice([3, 6, 9, 12], p=[.25, .3, .25, .2]))
    as_of = pd.Timestamp("2022-01-01") + pd.DateOffset(months=int(rng.integers(0, 48)))
    start = as_of - pd.DateOffset(months=months)
    unknown_share = float(rng.choice([0.0, .25, .6, 1.0], p=[.1, .2, .2, .5]))
    transfer_rate = float(rng.uniform(0, .5))
    activity = int(rng.integers(15, 100))
    events = []
    state = 0.0
    for month in range(months):
        origin = start + pd.DateOffset(months=month)
        state = .5 * state + rng.normal(0, volatility)
        income = base * np.exp(state - volatility ** 2 / 2)
        if rng.random() < .06:
            income *= rng.uniform(.05, .4)
        n_income = (1 if persona in {"salaried", "pensioner"} else
                    int(rng.integers(3, 18)) if persona in {"student", "freelancer"} else
                    int(rng.integers(15, 65)))
        category = {"salaried": "salary", "pensioner": "pension", "student": "unknown",
                    "freelancer": "freelance_income", "gig_worker": "freelance_income",
                    "merchant": "business_income"}[persona]
        for j, amount in enumerate(_parts(rng, income, n_income)):
            day = 0 if j == 0 else int(rng.integers(0, 28))
            events.append((origin + pd.Timedelta(days=day), "credit", float(amount), category,
                           "income-stream" if n_income == 1 else f"payer-{j % 20}"))
        budget = base * cost_ratio * np.exp(rng.normal(0, .15))
        for j, amount in enumerate(_parts(rng, budget, activity)):
            tag = str(rng.choice(["food", "groceries", "transport", "shopping", "utility", "rent"],
                                 p=[.2, .25, .2, .15, .1, .1]))
            events.append((origin + pd.Timedelta(days=int(rng.integers(0, 28))), "debit",
                           float(amount), tag, f"merchant-{int(rng.integers(0, 60))}"))
        if prior_emi:
            events.append((origin + pd.Timedelta(days=9), "debit", float(prior_emi), "loan_payment", "prior-lender"))
        # Own-account and wallet pass-through flows add activity without earned income.
        for _ in range(int(rng.poisson(transfer_rate * 10))):
            amount = float(round(base * rng.uniform(.02, .8), 2))
            date = origin + pd.Timedelta(days=int(rng.integers(0, 28)))
            events.append((date, "credit", amount, "own_transfer", "own-account"))
            events.append((date, "debit", amount, "own_transfer", "own-account"))
        if rng.random() < .25:
            events.append((origin + pd.Timedelta(days=18), "credit", float(round(base * .03, 2)), "refund", "merchant-refund"))
    events.sort(key=lambda e: (e[0], e[1] != "credit"))
    rows = []
    customer = f"syn-{seed}-{index:07d}"
    opening = buffer
    for date, direction, planned, category, party in events:
        amount = round(planned, 2)
        if direction == "debit":
            # Limited simulated overdraft; unaffordable outgoing spend is not magically paid.
            amount = min(amount, max(round(buffer + base * .1, 2), 0))
        if amount <= 0:
            continue
        buffer = round(buffer + (amount if direction == "credit" else -amount), 2)
        visible = "unknown" if rng.random() < unknown_share else category
        if category == "loan_payment" and rng.random() < .8:
            visible = category
        rows.append({"transaction_id": f"{customer}-{len(rows)}", "account_id": customer,
                     "customer_id": customer, "date": date, "amount": amount, "direction": direction,
                     "balance": buffer, "category": visible, "counterparty": party,
                     "country": "IN", "currency": "INR"})
    # Future random shocks and obligations are never exposed as predictors. A new
    # hypothetical EMI is fixed at 15% of latent baseline monthly income for this simulation.
    future = []
    missed_streak = 0
    target = 0
    for month in range(6):
        state = .5 * state + rng.normal(0, volatility * future_stress)
        income = base * np.exp(state - volatility ** 2 / 2)
        shock = bool(rng.random() < .08 * min(future_stress, 3))
        if shock:
            income *= rng.uniform(.05, .4)
        essential = base * cost_ratio * .8 * np.exp(rng.normal(0, .15)) + prior_emi
        available = max(buffer + income - essential, 0)
        emi = base * .15
        paid = min(available, emi)
        missed = paid < emi * .95
        missed_streak = missed_streak + 1 if missed else 0
        target = max(target, int(missed_streak >= 3))
        discretionary = base * cost_ratio * .2
        buffer = max(available - paid - discretionary, 0)
        future.append({"customer_id": customer, "month": month + 1, "simulated_income": income,
                       "simulated_due": emi, "simulated_paid": paid, "simulated_missed": bool(missed)})
    assessment = {"assessment_id": customer, "customer_id": customer, "account_id": customer,
                  "as_of": as_of, "country": "IN", "currency": "INR", "target": target}
    latent = {"customer_id": customer, "persona": persona, "first_time_borrower": first_time,
              "base_income": base, "opening_balance": opening, "history_months": months}
    return pd.DataFrame(rows), assessment, future, latent


def generate(directory: Path, borrowers: int = 20000, seed: int = 20261108,
             chunk_borrowers: int = 500, future_stress: float = 1.0) -> dict:
    if borrowers < 100 or chunk_borrowers < 1:
        raise ValueError("Use >=100 borrowers and a positive chunk size")
    if directory.exists():
        raise ValueError("Use a new synthetic dataset directory; existing data are never overwritten")
    directory.mkdir(parents=True)
    (directory / "transactions").mkdir()
    features, assessments, futures, latents, buffer = [], [], [], [], []
    counts = Counter()
    total = 0
    files = []
    for index in range(borrowers):
        tx, assessment, future, latent = simulate_borrower(index, seed, future_stress)
        values, reasons = extract_one(tx, assessment["as_of"])
        features.append({**assessment, **values, "eligible": not reasons,
                         "exclusion_reasons": "; ".join(reasons)})
        assessments.append(assessment)
        futures.extend(future)
        latents.append(latent)
        counts[latent["persona"]] += 1
        total += len(tx)
        buffer.append(tx)
        if len(buffer) == chunk_borrowers or index == borrowers - 1:
            chunk = validate_transactions(pd.concat(buffer, ignore_index=True))
            name = f"transactions/part-{len(files):05d}.parquet"
            chunk.to_parquet(directory / name, index=False, compression="zstd")
            files.append(name)
            buffer.clear()
            print(f"Generated {index + 1:,}/{borrowers:,} borrowers; {total:,} transaction rows", flush=True)
    pd.DataFrame(features).to_parquet(directory / "features.parquet", index=False)
    pd.DataFrame(assessments).to_parquet(directory / "assessments.parquet", index=False)
    pd.DataFrame(futures).to_parquet(directory / "future_simulation.parquet", index=False)
    pd.DataFrame(latents).to_parquet(directory / "latent_audit_DO_NOT_TRAIN.parquet", index=False)
    meta = {"generator_version": GENERATOR_VERSION, "data_origin": "fully_synthetic",
            "borrowers": borrowers, "transactions": total, "seed": seed, "future_stress": future_stress,
            "personas": dict(counts), "simulated_adverse_outcomes": sum(x["target"] for x in assessments),
            "eligible_borrowers": sum(x["eligible"] for x in features),
            "target": "Simulated 3 consecutive missed hypothetical EMI payments within 6 future months",
            "target_assumption": "Hypothetical EMI equals 15% of generator baseline monthly income; not a proposed actual loan",
            "limitation": "Generator recovery only; not empirical Indian accuracy, actual PD, bureau score or lending approval",
            "source_code_sha256": hashlib.sha256(Path(__file__).read_bytes()).hexdigest(),
            "files": {name: digest(directory / name) for name in files +
                      ["features.parquet", "assessments.parquet", "future_simulation.parquet", "latent_audit_DO_NOT_TRAIN.parquet"]}}
    write_json(directory / "manifest.json", meta)
    (directory / "README.txt").write_text(json.dumps(meta, indent=2))
    return meta
