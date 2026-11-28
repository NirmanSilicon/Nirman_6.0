"""Train/tune/calibrate/test separation, honest benchmarks and portable local artifacts."""

from __future__ import annotations

import hashlib
import importlib.metadata
import json
import platform
import time
from pathlib import Path

import joblib
import numpy as np
import pandas as pd
from lightgbm import LGBMClassifier
from sklearn.base import BaseEstimator, TransformerMixin
from sklearn.ensemble import RandomForestClassifier
from sklearn.impute import SimpleImputer
from sklearn.linear_model import LogisticRegression
from sklearn.metrics import (average_precision_score, brier_score_loss, confusion_matrix,
                             log_loss, precision_recall_curve, roc_auc_score, roc_curve)
from sklearn.model_selection import train_test_split
from sklearn.pipeline import Pipeline
from sklearn.preprocessing import StandardScaler
from xgboost import XGBClassifier

from .features import FEATURE_VERSION


class TrainingRangeClipper(TransformerMixin, BaseEstimator):
    """Bound numeric extrapolation using TRAIN-only quantiles; preserve missingness."""

    def __init__(self, lower=0.01, upper=0.99):
        self.lower = lower
        self.upper = upper

    def fit(self, X, y=None):
        if not 0 <= self.lower < self.upper <= 1:
            raise ValueError("Invalid clipping quantiles")
        self.feature_names_in_ = np.asarray(X.columns, dtype=object)
        self.low_ = X.quantile(self.lower)
        self.high_ = X.quantile(self.upper)
        return self

    def transform(self, X):
        if list(X.columns) != list(self.feature_names_in_):
            raise ValueError("Clipping feature schema differs from training")
        return X.clip(lower=self.low_, upper=self.high_, axis=1)

    def get_feature_names_out(self, input_features=None):
        return self.feature_names_in_


def clean_json(value):
    if isinstance(value, dict):
        return {str(k): clean_json(v) for k, v in value.items()}
    if isinstance(value, (list, tuple, np.ndarray)):
        return [clean_json(v) for v in value]
    if isinstance(value, (pd.Timestamp, Path)):
        return str(value)
    if isinstance(value, (np.integer, np.bool_)):
        return value.item()
    if isinstance(value, (float, np.floating)):
        return float(value) if np.isfinite(value) else None
    return value


def write_json(path: Path, value) -> None:
    path.write_text(json.dumps(clean_json(value), indent=2, allow_nan=False))


def split_indices(df: pd.DataFrame, temporal: bool, seed: int = 42,
                  temporal_holdout: bool = False) -> dict[str, np.ndarray]:
    """No customer can appear in multiple partitions. Boundaries never split equal dates."""
    if df.customer_id.duplicated().any():
        raise ValueError("This trainer requires one labelled assessment per customer; select an index date first")
    indices = np.arange(len(df))
    if temporal and temporal_holdout:
        dates = pd.to_datetime(df.as_of)
        unique = np.sort(dates.unique())
        cutoff = unique[int(len(unique) * .8)]
        development, test = indices[dates < cutoff], indices[dates >= cutoff]
        rest, calibration = train_test_split(development, test_size=.2,
                                            stratify=df.target.iloc[development], random_state=seed)
        train, validation = train_test_split(rest, test_size=.25,
                                             stratify=df.target.iloc[rest], random_state=seed + 1)
        splits = dict(train=train, validation=validation, calibration=calibration, test=test)
    elif temporal:
        dates = pd.to_datetime(df.as_of)
        unique = np.sort(dates.unique())
        cuts = [unique[min(int(len(unique) * q), len(unique) - 1)] for q in [0.55, 0.70, 0.85]]
        masks = [dates < cuts[0], (dates >= cuts[0]) & (dates < cuts[1]),
                 (dates >= cuts[1]) & (dates < cuts[2]), dates >= cuts[2]]
        splits = dict(zip(["train", "validation", "calibration", "test"], [indices[m] for m in masks]))
    else:
        rest, test = train_test_split(indices, test_size=0.15, stratify=df.target, random_state=seed)
        rest, calibration = train_test_split(rest, test_size=0.15 / 0.85,
                                            stratify=df.target.iloc[rest], random_state=seed + 1)
        train, validation = train_test_split(rest, test_size=0.15 / 0.70,
                                             stratify=df.target.iloc[rest], random_state=seed + 2)
        splits = dict(train=train, validation=validation, calibration=calibration, test=test)
    for name, idx in splits.items():
        if len(idx) < 10 or df.target.iloc[idx].nunique() != 2 or df.target.iloc[idx].value_counts().min() < 2:
            raise ValueError(f"{name} lacks sufficient observed outcomes; need >=10 rows and >=2 per class")
    assert len(np.unique(np.concatenate(list(splits.values())))) == len(df)
    return splits


def probability_logits(probabilities: np.ndarray) -> np.ndarray:
    p = np.clip(probabilities, 1e-6, 1 - 1e-6)
    return np.log(p / (1 - p)).reshape(-1, 1)


def calibrated(bundle: dict, frame: pd.DataFrame) -> np.ndarray:
    raw = bundle["pipeline"].predict_proba(frame[bundle["features"]])[:, 1]
    return bundle["calibrator"].predict_proba(probability_logits(raw))[:, 1]


def metrics(y, probabilities, threshold: float) -> dict:
    y = np.asarray(y)
    p = np.asarray(probabilities)
    prediction = p >= threshold
    tn, fp, fn, tp = confusion_matrix(y, prediction, labels=[0, 1]).ravel()
    fpr, tpr, _ = roc_curve(y, p)
    bins = []
    for low, high in zip(np.linspace(0, 1, 11)[:-1], np.linspace(0, 1, 11)[1:]):
        mask = (p >= low) & ((p < high) if high < 1 else (p <= high))
        if mask.any():
            bins.append({"lower": low, "upper": high, "count": int(mask.sum()),
                         "predicted": float(p[mask].mean()), "observed": float(y[mask].mean())})
    return {"n": len(y), "positive_outcomes": int(y.sum()), "positive_rate": float(y.mean()),
            "roc_auc": roc_auc_score(y, p), "pr_auc": average_precision_score(y, p),
            "ks": float(np.max(tpr - fpr)), "gini": 2 * roc_auc_score(y, p) - 1,
            "brier": brier_score_loss(y, p), "log_loss": log_loss(y, p, labels=[0, 1]),
            "threshold": threshold, "precision": float(tp / (tp + fp)) if tp + fp else 0.0,
            "recall": float(tp / (tp + fn)), "false_positive_rate": float(fp / (fp + tn)),
            "confusion_matrix": {"tn": int(tn), "fp": int(fp), "fn": int(fn), "tp": int(tp)},
            "calibration_bins": bins}


def bootstrap_ci(y, p, iterations: int, seed: int) -> dict:
    rng = np.random.default_rng(seed)
    y, p = np.asarray(y), np.asarray(p)
    results = {"roc_auc": [], "pr_auc": [], "brier": []}
    for _ in range(iterations):
        idx = rng.integers(0, len(y), len(y))
        if len(np.unique(y[idx])) < 2:
            continue
        results["roc_auc"].append(roc_auc_score(y[idx], p[idx]))
        results["pr_auc"].append(average_precision_score(y[idx], p[idx]))
        results["brier"].append(brier_score_loss(y[idx], p[idx]))
    return {k: {"lower_95": float(np.quantile(v, .025)), "upper_95": float(np.quantile(v, .975)),
                "valid_resamples": len(v)} for k, v in results.items() if v}


def choose_threshold(y, p) -> float:
    precision, recall, thresholds = precision_recall_curve(y, p)
    # Research operating point: maximize F2 (recall weighted), chosen on validation only.
    score = 5 * precision[:-1] * recall[:-1] / np.maximum(4 * precision[:-1] + recall[:-1], 1e-12)
    return float(thresholds[int(np.argmax(score))])


def probability_psi(reference, comparison) -> float:
    # Bin edges come from training predictions only. PSI is descriptive, not proof of stability.
    edges = np.unique(np.quantile(reference, np.linspace(0, 1, 11)))
    if len(edges) < 2:
        return 0.0
    edges[0], edges[-1] = -np.inf, np.inf
    a = np.histogram(reference, edges)[0].astype(float)
    b = np.histogram(comparison, edges)[0].astype(float)
    a = np.maximum(a / a.sum(), 1e-6)
    b = np.maximum(b / b.sum(), 1e-6)
    return float(np.sum((b - a) * np.log(b / a)))


def candidates(seed: int, jobs: int, trials: int, trees: int, clip_quantiles=None,
               families=None, monotone_constraints=None):
    rng = np.random.default_rng(seed)
    families = families or ["logistic", "random_forest", "lightgbm", "xgboost"]
    if set(families) - {"logistic", "random_forest", "lightgbm", "xgboost"}:
        raise ValueError("Unknown candidate family")
    if monotone_constraints is not None and set(families) - {"lightgbm", "xgboost"}:
        raise ValueError("Monotonic runs require supported constrained tree families only")
    for family in families:
        for trial in range(trials):
            if family == "logistic":
                estimator = LogisticRegression(C=float(10 ** rng.uniform(-2, 1)), max_iter=2000,
                                                class_weight="balanced", random_state=seed)
            elif family == "random_forest":
                estimator = RandomForestClassifier(n_estimators=trees, max_depth=int(rng.choice([3, 5, 8])),
                                                    min_samples_leaf=int(rng.choice([5, 10, 20])),
                                                    class_weight="balanced_subsample", n_jobs=jobs,
                                                    random_state=seed)
            elif family == "lightgbm":
                estimator = LGBMClassifier(n_estimators=trees, num_leaves=int(rng.choice([7, 15, 31])),
                                          learning_rate=float(rng.choice([.02, .04, .07])),
                                          min_child_samples=int(rng.choice([10, 20, 40])),
                                          reg_lambda=3.0, verbosity=-1, n_jobs=jobs, random_state=seed,
                                          deterministic=True, force_col_wise=True)
            else:
                estimator = XGBClassifier(n_estimators=trees, max_depth=int(rng.choice([2, 3, 5])),
                                         learning_rate=float(rng.choice([.02, .04, .07])),
                                         min_child_weight=5, reg_lambda=5, subsample=.8,
                                         colsample_bytree=.8, tree_method="hist", n_jobs=jobs,
                                         random_state=seed, eval_metric="logloss")
            if monotone_constraints is not None:
                parameter = list(monotone_constraints) if family == "lightgbm" else tuple(monotone_constraints)
                estimator.set_params(monotone_constraints=parameter)
            steps = []
            if clip_quantiles is not None:
                steps.append(("clipper", TrainingRangeClipper(*clip_quantiles)))
            steps.append(("imputer", SimpleImputer(strategy="median", keep_empty_features=True).set_output(transform="pandas")))
            if family == "logistic":
                steps.append(("scaler", StandardScaler()))
            steps.append(("model", estimator))
            yield f"{family}-{trial}", Pipeline(steps)


def explain(bundle: dict, frame: pd.DataFrame, top: int = 5) -> list[list[dict]]:
    import shap

    columns = bundle["features"]
    pipeline = bundle["pipeline"]
    transformed = np.asarray(pipeline[:-1].transform(frame[columns]))
    model = pipeline[-1]
    if isinstance(model, LogisticRegression):
        background = bundle["explanation_background"]
        explainer = shap.LinearExplainer(model, background)
        values = explainer.shap_values(transformed)
    else:
        explainer = shap.TreeExplainer(model)
        values = explainer.shap_values(transformed, check_additivity=False)
    values = np.asarray(values)
    if values.ndim == 3:
        values = values[:, :, 1]
    output = []
    for i, row in enumerate(values):
        # Include both helpful and adverse associations, not only the largest risk increases.
        positive = np.where(row > 0)[0]
        negative = np.where(row < 0)[0]
        chosen = list(positive[np.argsort(-row[positive])[: max(1, top // 2)]])
        chosen += list(negative[np.argsort(row[negative])[: max(1, top // 2)]])
        if len(chosen) < top:
            chosen += [j for j in np.argsort(-np.abs(row)) if j not in chosen][: top - len(chosen)]
        order = sorted(chosen, key=lambda j: -abs(row[j]))[:top]
        output.append([{"feature": columns[j], "value": clean_json(frame.iloc[i][columns[j]]),
                        "shap_contribution": float(row[j]),
                        "direction": "increases_raw_model_risk" if row[j] > 0 else "decreases_raw_model_risk",
                        "scope": "Raw model attribution after fitted preprocessing; not calibrated probability points or causal advice"}
                       for j in order])
    return output


def train(frame: pd.DataFrame, columns: list[str], out: Path, dataset: str, summary: dict,
          temporal: bool, config: dict) -> dict:
    started = time.perf_counter()
    if out.exists():
        raise ValueError(f"Run directory already exists; choose a new one: {out}")
    out.mkdir(parents=True)
    frame = frame.reset_index(drop=True)
    if not frame.target.isin([0, 1]).all():
        raise ValueError("Training requires binary 0/1 targets with documented provenance")
    for column in columns:
        frame[column] = pd.to_numeric(frame[column], errors="raise").replace([np.inf, -np.inf], np.nan)
    seed = int(config.get("seed", 42))
    excluded = set(config.get("excluded_features", []))
    columns = [c for c in columns if c not in excluded]
    temporal_holdout = dataset == "berka"
    splits = split_indices(frame, temporal, seed, temporal_holdout=temporal_holdout)
    tr, va, ca, te = [splits[k] for k in ["train", "validation", "calibration", "test"]]
    # Drop constants using TRAIN ONLY, so the holdout cannot influence feature selection.
    removed = [c for c in columns if frame.iloc[tr][c].nunique(dropna=True) < 2]
    columns = [c for c in columns if c not in removed]
    if not columns:
        raise ValueError("No variable predictors")
    x, y = frame[columns], frame.target.astype(int)
    constraint_map = config.get("monotonic_constraints")
    constraints = [constraint_map[c] for c in columns] if constraint_map is not None else None
    best, best_auc, leaderboard = None, -np.inf, []
    for name, pipeline in candidates(seed, int(config.get("jobs", 4)), int(config.get("trials_per_family", 3)),
                                     int(config.get("trees", 400)), config.get("clip_quantiles"),
                                     config.get("families"), constraints):
        t = time.perf_counter()
        pipeline.fit(x.iloc[tr], y.iloc[tr])
        p = pipeline.predict_proba(x.iloc[va])[:, 1]
        auc = roc_auc_score(y.iloc[va], p)
        result = {"candidate": name, "validation_roc_auc": auc,
                  "validation_pr_auc": average_precision_score(y.iloc[va], p),
                  "seconds": time.perf_counter() - t, "parameters": pipeline[-1].get_params()}
        leaderboard.append(result)
        print(f"{name}: validation AUC={auc:.4f}, PR-AUC={result['validation_pr_auc']:.4f} "
              f"({result['seconds']:.1f}s)", flush=True)
        write_json(out / "candidate_results.json", leaderboard)
        if auc > best_auc:
            best, best_auc, best_name = pipeline, auc, name
    # Never refit on the calibration or test partitions.
    raw_calibration = best.predict_proba(x.iloc[ca])[:, 1]
    calibrator = LogisticRegression(C=1.0, max_iter=1000, random_state=seed)
    calibrator.fit(probability_logits(raw_calibration), y.iloc[ca])
    if calibrator.coef_[0, 0] <= 0:
        raise ValueError("Calibration reverses risk ranking. Data is insufficient/unstable; no usable artifact saved")
    background = np.asarray(best[:-1].transform(x.iloc[tr]))
    # A small background summarizes SHAP explanations only. Every training row above was used.
    background = background[np.linspace(0, len(background) - 1, min(200, len(background)), dtype=int)]
    cashflow_model = dataset in {"berka", "custom", "synthetic_india"}
    if cashflow_model and (frame.country.nunique() != 1 or frame.currency.nunique() != 1):
        raise ValueError("Train each cashflow model on one documented country/currency population")
    bundle = {"pipeline": best, "calibrator": calibrator, "features": columns,
              "dataset": dataset, "feature_version": config.get("feature_version", FEATURE_VERSION) if cashflow_model else f"{dataset}-v1",
              "country": str(frame.country.iloc[0]) if cashflow_model else "source_population_only",
              "currency": str(frame.currency.iloc[0]) if cashflow_model else "source_currency",
              "feature_bounds": {c: [float(x.iloc[tr][c].min()), float(x.iloc[tr][c].max())] for c in columns},
              "explanation_background": background, "research_only": True,
              "target": summary.get("target"), "model_name": best_name}
    bundle["data_origin"] = "synthetic" if dataset == "synthetic_india" else "source_dataset"
    bundle["monotonic_constraints"] = constraint_map
    validation_p = calibrated(bundle, x.iloc[va])
    threshold = choose_threshold(y.iloc[va], validation_p)
    bundle["threshold"] = threshold
    test_p = calibrated(bundle, x.iloc[te])
    test_raw = best.predict_proba(x.iloc[te])[:, 1]
    report = {"dataset": dataset, "data_summary": summary, "feature_version": bundle["feature_version"],
              "data_origin": bundle["data_origin"],
              "model_name": best_name, "research_only": True, "indian_validation": False,
              "split_method": ("chronological final 20% holdout; stratified development train/validation/calibration"
                               if temporal_holdout else "chronological, customer-disjoint" if temporal else
                               "random stratified, customer-disjoint; no date supplied"),
              "partitions": {}, "feature_count": len(columns), "removed_train_constant_features": removed,
              "selection_metric": "Validation ROC-AUC", "threshold_policy": "Maximum validation F2, not a lending policy",
              "test": metrics(y.iloc[te], test_p, threshold),
              "test_uncalibrated": metrics(y.iloc[te], test_raw, .5),
              "test_ci": bootstrap_ci(y.iloc[te], test_p, int(config.get("bootstrap_iterations", 500)), seed),
              "majority_baseline": metrics(y.iloc[te], np.full(len(te), y.iloc[tr].mean()), threshold),
              "validation": metrics(y.iloc[va], validation_p, threshold),
              "prediction_psi_train_to_test": probability_psi(calibrated(bundle, x.iloc[tr]), test_p),
              "calibration_slope": float(calibrator.coef_[0, 0]),
              "feature_missingness_train": x.iloc[tr].isna().mean().to_dict(),
              "dataframe_sha256": hashlib.sha256(pd.util.hash_pandas_object(frame, index=True).values.tobytes()).hexdigest(),
              "config": config, "runtime_seconds": time.perf_counter() - started,
              "excluded_by_policy": sorted(excluded),
              "evaluation_role": config.get("evaluation_role", "Original holdout evaluation"),
              "environment": {"python": platform.python_version(), "platform": platform.platform(),
                              **{name: importlib.metadata.version(name) for name in
                                 ["pandas", "numpy", "scikit-learn", "lightgbm", "xgboost", "shap"]}}}
    assignments = []
    for name, idx in splits.items():
        details = {"rows": len(idx), "positive_outcomes": int(y.iloc[idx].sum())}
        if temporal:
            details.update(start=str(frame.as_of.iloc[idx].min()), end=str(frame.as_of.iloc[idx].max()))
        report["partitions"][name] = details
        subset = frame.iloc[idx][["assessment_id", "customer_id"]].copy()
        subset["partition"] = name
        assignments.append(subset)
    pd.concat(assignments).to_csv(out / "split_assignments.csv", index=False)
    prediction = frame.iloc[te][["assessment_id", "customer_id", "target"]].copy()
    prediction["raw_probability"] = test_raw
    prediction["calibrated_probability"] = test_p
    prediction["synthetic_risk_index" if dataset == "synthetic_india" else "research_risk_index"] = 100 * (1 - test_p)
    prediction.to_csv(out / "test_predictions.csv", index=False)
    warnings = []
    if int(y.iloc[te].sum()) < 30:
        warnings.append("Fewer than 30 bad outcomes in final holdout: very high statistical uncertainty")
    if report["test"]["recall"] == 0:
        warnings.append("Validation-selected operating point detected no positive outcomes on final holdout")
    if not temporal:
        warnings.append("No chronological validation: source data lacks an assessment date")
    warnings.append("No Indian statement-linked repayment validation or fairness approval")
    if dataset == "synthetic_india":
        warnings.insert(0, "Trained and evaluated only on generated transactions and simulated outcomes; metrics measure generator recovery")
    report["readiness"] = {"approved_for_lending": False, "warnings": warnings}
    bundle["validation_warnings"] = warnings
    bundle["validation_test_metrics"] = report["test"]
    joblib.dump(bundle, out / "model.joblib", compress=3)
    report["artifact_sha256"] = hashlib.sha256((out / "model.joblib").read_bytes()).hexdigest()
    # Explanation sample never affects fitting, selection or evaluation.
    explanations = explain(bundle, x.iloc[te].head(10))
    write_json(out / "explanations.json", explanations)
    write_json(out / "metrics.json", report)
    auc = report["test"]["roc_auc"]
    ci = report["test_ci"].get("roc_auc", {})
    (out / "MODEL_CARD.md").write_text(
        f"# UQUAL research model: {dataset}\n\n"
        + ("**SYNTHETIC DEMONSTRATION ONLY.** No real Indian repayment outcomes were used. "
           "Reported accuracy is against simulator labels, not real people. Scores must never be used for credit decisions.\n\n"
           if dataset == "synthetic_india" else "")
        +
        f"Selected model: {best_name}. Feature contract: {bundle['feature_version']}.\n\n"
        f"Evaluation role: {report['evaluation_role']}.\n\n"
        f"Target: {bundle['target']}.\n\n"
        f"Test ROC-AUC: {auc:.4f}; bootstrap 95% interval: {ci}.\n"
        f"Test PR-AUC: {report['test']['pr_auc']:.4f}; Brier: {report['test']['brier']:.4f}.\n\n"
        "This is a research artifact, not an Indian credit score or a validated Financial Behaviour Index. "
        "Independent Indian validation has not been established. Metrics are measured on this source population only. "
        "AUC measures ranking, not individual probability accuracy. Inspect calibration and operating-point errors. "
        "The risk index is only 100 × (1 − estimated source-target probability); it is not a bureau score.\n\n"
        "Berka: completed-loan selection creates survivorship/selection effects; loan horizons vary. "
        "A million transactions do not create a million independent loan labels. Credit labels are limited. "
        "Unknown credits can include transfers/refunds/borrowing; known-income features exclude them, "
        "but gross cashflow predictors can still be affected. Loan-day and future transactions are excluded.\n\n"
        "GMSC/Home Credit are separate tabular benchmarks with different features and targets. "
        "Do not deploy those artifacts on bank-statement features. "
        "SHAP explains raw model contributions, not causality or calibrated probability changes. "
        "No fairness certification, causal improvement guarantee or production approval is implied.\n\n"
        "Read metrics.json, split_assignments.csv, candidate_results.json and test_predictions.csv "
        "for exact sample counts, settings and outcomes. Calibration and final test records were not used to fit the predictor.\n\n"
        + "\n".join(f"- {warning}" for warning in warnings) + "\n")
    return clean_json(report)
