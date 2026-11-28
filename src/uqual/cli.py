from __future__ import annotations

import argparse
import json
from datetime import datetime, timezone
from pathlib import Path

import pandas as pd

from .data import fetch, prepare_berka, prepare_gmsc, prepare_homecredit
from .features import FEATURE_VERSION, build_features, feature_columns
from .model import clean_json, train, write_json
from .scoring import load_bundle, score_statement, score_tabular, simulate
from .statements import import_csv
from .profile import cashflow_profile
from .synthetic import generate
from .features_v2 import prepare_synthetic, build_features as build_features_v2, FEATURE_VERSION as V2_VERSION


def read_table(path: Path) -> pd.DataFrame:
    if path.suffix == ".parquet":
        return pd.read_parquet(path)
    return pd.read_csv(path, dtype={"customer_id": str, "account_id": str, "transaction_id": str})


def main():
    parser = argparse.ArgumentParser(description="UQUAL auditable ML research pipeline")
    sub = parser.add_subparsers(dest="command", required=True)
    download = sub.add_parser("download")
    download.add_argument("dataset", choices=["berka", "gmsc"])
    download.add_argument("--data-dir", type=Path, default=Path("data"))
    synthetic = sub.add_parser("generate-synthetic")
    synthetic.add_argument("--out", type=Path, required=True)
    synthetic.add_argument("--borrowers", type=int, default=20000)
    synthetic.add_argument("--seed", type=int, default=20261108)
    synthetic.add_argument("--chunk-borrowers", type=int, default=500)
    synthetic.add_argument("--future-stress", type=float, default=1.0)
    prepare_v2 = sub.add_parser("prepare-features-v2")
    prepare_v2.add_argument("--source-dir", type=Path, required=True)
    example = sub.add_parser("example")
    example.add_argument("--run", type=Path, required=True)
    example.add_argument("--data-dir", type=Path, default=Path("data"))
    example.add_argument("--out", type=Path, default=Path("artifacts/example"))
    fit = sub.add_parser("train")
    fit.add_argument("dataset", choices=["berka", "gmsc", "homecredit", "custom", "synthetic_india"])
    fit.add_argument("--data-dir", type=Path, default=Path("data"))
    fit.add_argument("--source-dir", type=Path, help="Home Credit CSV directory")
    fit.add_argument("--transactions", type=Path, help="Custom normalized CSV/parquet")
    fit.add_argument("--assessments", type=Path, help="Custom real outcome CSV/parquet")
    fit.add_argument("--target-definition", help="Required for custom labelled data")
    fit.add_argument("--config", type=Path, default=Path("configs/standard.json"))
    fit.add_argument("--out", type=Path)
    fit.add_argument("--accept-data-terms", action="store_true", help="Confirm permissions for manually supplied data")
    normalize = sub.add_parser("import-csv")
    normalize.add_argument("source", type=Path)
    normalize.add_argument("--out", type=Path, required=True)
    for name in ["account-id", "customer-id", "country", "currency"]:
        normalize.add_argument(f"--{name}", required=True)
    normalize.add_argument("--date-format", default="%Y-%m-%d")
    normalize.add_argument("--mapping", type=Path)
    score = sub.add_parser("score")
    score.add_argument("--model", type=Path, required=True)
    score.add_argument("--transactions", type=Path, required=True)
    score.add_argument("--assessment", type=Path, required=True, help="One assessment JSON")
    score.add_argument("--allow-out-of-domain-research", action="store_true", help="Diagnostics only; cannot bypass population abstention")
    score.add_argument("--out", type=Path)
    demo = sub.add_parser("score-synthetic")
    demo.add_argument("--model", type=Path, required=True)
    demo.add_argument("--transactions", type=Path, required=True)
    demo.add_argument("--assessment", type=Path, required=True)
    demo.add_argument("--out", type=Path)
    tabular = sub.add_parser("score-tabular")
    tabular.add_argument("--model", type=Path, required=True)
    tabular.add_argument("--data", type=Path, required=True)
    tabular.add_argument("--out", type=Path, required=True)
    profile = sub.add_parser("profile")
    profile.add_argument("--transactions", type=Path, required=True)
    profile.add_argument("--assessment", type=Path, required=True)
    profile.add_argument("--out", type=Path)
    twin = sub.add_parser("simulate")
    for name in ["amount", "annual-rate", "monthly-income", "monthly-expenses"]:
        twin.add_argument(f"--{name}", type=float, required=True)
    twin.add_argument("--months", type=int, required=True)
    twin.add_argument("--existing-emi", type=float, default=0)
    args = parser.parse_args()
    try:
        if args.command == "download":
            result = {"path": str(fetch(args.data_dir, args.dataset))}
        elif args.command == "generate-synthetic":
            result = generate(args.out, args.borrowers, args.seed, args.chunk_borrowers, args.future_stress)
        elif args.command == "prepare-features-v2":
            result = prepare_synthetic(args.source_dir)
        elif args.command == "example":
            assignments = pd.read_csv(args.run / "split_assignments.csv", dtype=str)
            first = assignments[assignments.partition.eq("test")].iloc[0]
            assessments = pd.read_parquet(args.data_dir / "processed/berka_assessments.parquet")
            assessment = assessments[assessments.assessment_id.eq(first.assessment_id)].iloc[0]
            transactions = pd.read_parquet(args.data_dir / "processed/berka_transactions.parquet")
            subset = transactions[(transactions.customer_id.eq(str(assessment.customer_id))) &
                                  transactions.account_id.eq(str(assessment.account_id)) &
                                  (transactions.date < pd.Timestamp(assessment.as_of))]
            args.out.mkdir(parents=True, exist_ok=True)
            subset.to_csv(args.out / "transactions.csv", index=False)
            write_json(args.out / "assessment.json", {key: assessment[key] for key in
                       ["assessment_id", "customer_id", "account_id", "as_of", "country", "currency"]})
            result = {"out": str(args.out), "transactions": len(subset), "partition": "held-out test"}
        elif args.command == "import-csv":
            mapping = json.loads(args.mapping.read_text()) if args.mapping else None
            frame = import_csv(args.source, args.account_id, args.customer_id, args.country, args.currency,
                               args.date_format, mapping)
            args.out.parent.mkdir(parents=True, exist_ok=True)
            frame.to_parquet(args.out, index=False)
            result = {"transactions": len(frame), "out": str(args.out),
                      "notice": "No automatic income/category labels were invented"}
        elif args.command == "train":
            config = json.loads(args.config.read_text())
            if config.get("feature_version", FEATURE_VERSION) not in {FEATURE_VERSION, V2_VERSION}:
                raise ValueError("Unknown feature version")
            builder = build_features_v2 if config.get("feature_version") == V2_VERSION else build_features
            temporal = args.dataset in {"berka", "custom", "synthetic_india"}
            if args.dataset == "berka":
                summary = prepare_berka(args.data_dir)
                frame = builder(pd.read_parquet(args.data_dir / "processed/berka_transactions.parquet"),
                                       pd.read_parquet(args.data_dir / "processed/berka_assessments.parquet"))
                summary["feature_exclusions"] = int((~frame.eligible).sum())
                frame.to_parquet(args.data_dir / "processed/berka_features_all.parquet", index=False)
                frame = frame[frame.eligible].copy()
                columns = feature_columns(frame)
            elif args.dataset == "gmsc":
                frame, summary = prepare_gmsc(args.data_dir)
                columns = feature_columns(frame)
            elif args.dataset == "synthetic_india":
                if args.source_dir is None:
                    raise ValueError("Synthetic training needs --source-dir from generate-synthetic")
                summary = json.loads((args.source_dir / "manifest.json").read_text())
                if summary.get("data_origin") != "fully_synthetic":
                    raise ValueError("Dataset must be explicitly marked fully_synthetic")
                filename = "features_monotone_v2.parquet" if config.get("feature_version") == V2_VERSION else "features.parquet"
                frame = pd.read_parquet(args.source_dir / filename)
                summary["feature_exclusions"] = int((~frame.eligible).sum())
                frame = frame[frame.eligible].copy()
                columns = feature_columns(frame)
            elif args.dataset == "homecredit":
                if not args.accept_data_terms or args.source_dir is None:
                    raise ValueError("Home Credit needs --source-dir and --accept-data-terms; obtain permitted access first")
                frame, summary = prepare_homecredit(args.source_dir)
                columns = feature_columns(frame)
            else:
                if not args.accept_data_terms or args.transactions is None or args.assessments is None:
                    raise ValueError("Custom data needs --transactions, --assessments and --accept-data-terms")
                assessments = read_table(args.assessments)
                label_fields = {"target", "as_of", "outcome_window_end", "label_observed_at"}
                if not label_fields.issubset(assessments) or not args.target_definition:
                    raise ValueError("Custom labels need target, as_of, outcome_window_end, label_observed_at, and --target-definition")
                ends = pd.to_datetime(assessments.outcome_window_end, errors="raise", utc=True)
                observed = pd.to_datetime(assessments.label_observed_at, errors="raise", utc=True)
                starts = pd.to_datetime(assessments.as_of, errors="raise", utc=True)
                if ends.isna().any() or observed.isna().any() or starts.isna().any() or not ((ends > starts) & (observed >= ends)).all():
                    raise ValueError("Every outcome window must be after assessment and fully observed; pending loans are not negative labels")
                frame = builder(read_table(args.transactions), assessments)
                summary = {"rows_before_quality_filter": len(frame), "feature_exclusions": int((~frame.eligible).sum()),
                           "target": args.target_definition,
                           "sampling": "None", "statement_model": True}
                frame = frame[frame.eligible].copy()
                columns = feature_columns(frame)
            out = args.out or Path("artifacts") / (args.dataset + "-" + datetime.now(timezone.utc).strftime("%Y%m%dT%H%M%SZ"))
            report = train(frame, columns, out, args.dataset, summary, temporal, config)
            result = {"run": str(out), "test": report["test"], "test_ci": report["test_ci"],
                      "data_summary": summary, "research_only": True}
        elif args.command == "profile":
            result = cashflow_profile(read_table(args.transactions), json.loads(args.assessment.read_text()))
            if args.out:
                args.out.parent.mkdir(parents=True, exist_ok=True)
                write_json(args.out, result)
        elif args.command == "score-tabular":
            output = score_tabular(args.model, read_table(args.data))
            args.out.parent.mkdir(parents=True, exist_ok=True)
            output.to_csv(args.out, index=False)
            result = {"rows": len(output), "out": str(args.out), "research_only": True}
        elif args.command in {"score", "score-synthetic"}:
            result = score_statement(load_bundle(args.model), read_table(args.transactions),
                                     json.loads(args.assessment.read_text()),
                                     getattr(args, "allow_out_of_domain_research", False),
                                     synthetic_demo=args.command == "score-synthetic")
            if args.out:
                args.out.parent.mkdir(parents=True, exist_ok=True)
                write_json(args.out, result)
        else:
            result = simulate(args.amount, args.annual_rate, args.months, args.monthly_income,
                              args.monthly_expenses, args.existing_emi)
        print(json.dumps(clean_json(result), indent=2, allow_nan=False))
    except (ValueError, FileNotFoundError) as exc:
        parser.exit(2, f"Error: {exc}\n")


if __name__ == "__main__":
    main()
