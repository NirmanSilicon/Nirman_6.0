"""Frozen, same-simulator independent-seed evaluation and behavioural regressions.

Never uses this cohort to fit models, calibration, thresholds or feature ranges.
Run from the repository root with .venv/bin/python scripts/evaluate_v2.py.
"""
from __future__ import annotations

import hashlib
import json
from pathlib import Path

import numpy as np
import pandas as pd

from explore_scores import controlled_statement
from uqual.features import extract_one as extract_v1
from uqual.features_v2 import RISK_DIRECTIONS, extract_one as extract_v2
from uqual.model import bootstrap_ci, calibrated, metrics, write_json
from uqual.scoring import load_bundle


def applicability(bundle, frame):
    outside = pd.DataFrame({k: (frame[k] < v[0]) | (frame[k] > v[1])
                            for k, v in bundle["feature_bounds"].items()}).sum(axis=1)
    return ~((outside >= 3) & (outside / len(bundle["features"]) > .2))


def behaviour(bundles, out):
    rows = []
    frames = {name: [] for name in bundles}
    for mode in ["stable", "gig", "irregular"]:
        for reserve in [.05, .25, 1.0]:
            for expense in np.round(np.arange(.6, 1.151, .01), 2):
                tx, a = controlled_statement("sweep", expense_ratio=float(expense), reserve_ratio=reserve,
                                             gig=mode == "gig", irregular=mode == "irregular")
                rows.append({"mode": mode, "reserve": reserve, "expense_ratio": expense})
                for name, extractor in [("v1", extract_v1), ("v2", extract_v2)]:
                    values, reasons = extractor(tx, a["as_of"])
                    assert not reasons
                    frames[name].append(values)
    table = pd.DataFrame(rows)
    report = {"controlled_profiles": len(table), "models": {}}
    for name, bundle in bundles.items():
        f = pd.DataFrame(frames[name])
        table[name + "_score"] = 100 * (1 - calibrated(bundle, f))
        table[name + "_applicable"] = applicability(bundle, f)
        violations, comparisons = 0, 0
        for _, group in table.groupby(["mode", "reserve"]):
            difference = np.diff(group.sort_values("expense_ratio")[name + "_score"])
            violations += int((difference > 1e-6).sum())
            comparisons += len(difference)
        reserve_violations, reserve_comparisons = 0, 0
        for _, group in table.groupby(["mode", "expense_ratio"]):
            difference = np.diff(group.sort_values("reserve")[name + "_score"])
            reserve_violations += int((difference < -1e-6).sum())
            reserve_comparisons += len(difference)
        report["models"][name] = {"expense_comparisons": comparisons, "expense_violations": violations,
                                   "reserve_comparisons": reserve_comparisons,
                                   "reserve_violations": reserve_violations,
                                   "applicable_profiles": int(table[name + "_applicable"].sum())}
    # Assert feature-level guarantees too, rather than masking problems via tree saturation.
    v2 = pd.DataFrame(frames["v2"]).assign(**table[["mode", "reserve", "expense_ratio"]])
    for _, group in v2.groupby(["mode", "reserve"]):
        delta = group.sort_values("expense_ratio")[list(RISK_DIRECTIONS)].diff().iloc[1:]
        assert (delta.mul(pd.Series(RISK_DIRECTIONS)) >= -1e-8).all().all()
    invariant = {}
    for name, extractor in [("v1", extract_v1), ("v2", extract_v2)]:
        features = []
        for own in [False, True]:
            tx, a = controlled_statement("invariance", transfers=own)
            features.append(extractor(tx, a["as_of"])[0])
        pair = pd.DataFrame(features)
        scores = 100 * (1 - calibrated(bundles[name], pair))
        invariant[name] = {"base_score": scores[0], "matched_transfer_score": scores[1],
                           "absolute_score_change": abs(scores[1] - scores[0])}
        if name == "v2":
            np.testing.assert_allclose(pair.iloc[0], pair.iloc[1], atol=1e-10)
            assert abs(scores[1] - scores[0]) < 1e-8
        tx[["amount", "balance"]] *= 10
        scaled = extractor(tx, a["as_of"])[0]
        if name == "v2":
            np.testing.assert_allclose(pair.iloc[1], pd.Series(scaled), atol=1e-10)
            assert abs(calibrated(bundles[name], pd.DataFrame([scaled]))[0] - (1 - scores[1]/100)) < 1e-8
    report["matched_transfer_invariance"] = invariant
    assert report["models"]["v2"]["expense_violations"] == 0
    assert report["models"]["v2"]["reserve_violations"] == 0
    table.to_csv(out / "controlled_sweep.csv", index=False)
    report["previous_failure_cases"] = table[(table["mode"] == "stable") & (table.reserve == .05)
                                             & table.expense_ratio.isin([1.0, 1.01, 1.02, 1.03, 1.05])].to_dict("records")
    return report


def main():
    source = Path("data/synthetic/india-v2-evaluation")
    out = Path("artifacts/synthetic-india-v2-evaluation")
    out.mkdir(parents=True, exist_ok=True)
    development = json.loads(Path("data/synthetic/india-v1/manifest.json").read_text())
    manifest = json.loads((source / "manifest.json").read_text())
    assert manifest["seed"] != development["seed"]
    # Check all original cohort files, including outcome tables, before evaluating.
    for filename, expected in manifest["files"].items():
        assert hashlib.sha256((source / filename).read_bytes()).hexdigest() == expected, filename
    bundles = {name: load_bundle(Path(f"artifacts/synthetic-india-{name}/model.joblib")) for name in ["v1", "v2"]}
    frames = {"v1": pd.read_parquet(source / "features.parquet").set_index("assessment_id"),
              "v2": pd.read_parquet(source / "features_monotone_v2.parquet").set_index("assessment_id")}
    common = frames["v1"].index[frames["v1"].eligible & frames["v2"].eligible]
    np.testing.assert_array_equal(frames["v1"].loc[common].target, frames["v2"].loc[common].target)
    predictions = frames["v1"].loc[common, ["customer_id", "target"]].copy()
    predictions["cohort_seed"] = manifest["seed"]
    # IDs are generator-local; seed + ID identifies the independent simulated borrower.
    latent = pd.read_parquet(source / "latent_audit_DO_NOT_TRAIN.parquet").set_index("customer_id")
    report = {"scope": "Fresh seed, same synthetic generator; not real Indian validation",
              "development_seed": development["seed"], "evaluation_seed": manifest["seed"],
              "total_profiles": manifest["borrowers"], "transactions": manifest["transactions"],
              "common_eligible": len(common), "models": {}}
    for name, bundle in bundles.items():
        frame = frames[name].loc[common]
        p = calibrated(bundle, frame)
        keep = applicability(bundle, frame)
        predictions[name + "_probability"] = p
        predictions[name + "_applicable"] = keep
        result = {"model_sha256": hashlib.sha256(Path(f"artifacts/synthetic-india-{name}/model.joblib").read_bytes()).hexdigest(),
                  "eligible": int(frames[name].eligible.sum()),
                  "all_common_eligible": metrics(frame.target, p, bundle["threshold"]),
                  "all_common_eligible_ci": bootstrap_ci(frame.target, p, 500, 20261121),
                  "applicable": int(keep.sum()), "abstained": int((~keep).sum()),
                  "applicable_only": metrics(frame.target[keep], p[keep], bundle["threshold"]), "persona_slices": {}}
        personas = frame.customer_id.map(latent.persona)
        for persona in sorted(personas.unique()):
            mask = personas.eq(persona).to_numpy()
            result["persona_slices"][persona] = metrics(frame.target[mask], p[mask], bundle["threshold"])
        report["models"][name] = result
    report["behaviour"] = behaviour(bundles, out)
    predictions.to_csv(out / "predictions.csv")
    write_json(out / "report.json", report)
    print(json.dumps({"common_eligible": len(common), "models": {
        name: {key: report["models"][name]["all_common_eligible"][key]
               for key in ["roc_auc", "pr_auc", "brier", "precision", "recall"]} for name in bundles},
        "behaviour": report["behaviour"]}, indent=2, default=str))


if __name__ == "__main__":
    main()
