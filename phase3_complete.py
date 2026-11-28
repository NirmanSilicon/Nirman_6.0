"""AEROSENTRY Phase 3: reproducible anomaly-detection training and evaluation.

Dataset: NASA C-MAPSS FD001. This is a synthetic benchmark, not aircraft telemetry.
Run from the project directory:
    python phase3_complete.py
"""
from __future__ import annotations

from pathlib import Path
import json
import warnings

import joblib
import numpy as np
import pandas as pd
from sklearn.ensemble import IsolationForest
from sklearn.metrics import confusion_matrix, precision_recall_fscore_support
from sklearn.neighbors import LocalOutlierFactor
from sklearn.preprocessing import StandardScaler

ROOT = Path(__file__).resolve().parent
DATA = ROOT / "data" / "raw" / "FD001"
OUTPUT = ROOT / "outputs"
OUTPUT.mkdir(exist_ok=True)
SEED = 42
COLS = ["unit", "cycle", "setting_1", "setting_2", "setting_3"] + [f"sensor_{i}" for i in range(1, 22)]
META = {"unit", "cycle"}


def load_fd001() -> pd.DataFrame:
    path = DATA / "train_FD001.txt"
    if not path.exists():
        raise FileNotFoundError(f"Missing {path}. Put train_FD001.txt in data/.")
    frame = pd.read_csv(path, sep=r"\s+", header=None, names=COLS)
    if frame.isna().any().any():
        raise ValueError("FD001 contains missing values; inspect the source file before training.")
    return frame.sort_values(["unit", "cycle"]).reset_index(drop=True)


def split_engine_ids(frame: pd.DataFrame):
    engine_ids = np.array(sorted(frame.unit.unique()))
    rng = np.random.default_rng(SEED)
    rng.shuffle(engine_ids)
    return engine_ids[:70], engine_ids[70:85], engine_ids[85:]


def reference_and_eval(frame: pd.DataFrame, engine_ids: np.ndarray):
    """Use first 30% of each engine, split into calibration and evaluation segments."""
    calibration, evaluation = [], []
    for unit in engine_ids:
        group = frame.loc[frame.unit == unit].sort_values("cycle").copy()
        early_n = max(12, int(np.ceil(len(group) * 0.30)))
        early = group.iloc[:early_n]
        split_at = max(8, int(np.floor(len(early) * 0.60)))
        split_at = min(split_at, len(early) - 5)
        calibration.append(early.iloc[:split_at])
        evaluation.append(early.iloc[split_at:])
    return (pd.concat(calibration).sort_values(["unit", "cycle"]).copy(),
            pd.concat(evaluation).sort_values(["unit", "cycle"]).copy())


def fit_engine_baselines(calibration: pd.DataFrame, sensors: list[str], global_scales: dict[str, float]):
    baselines = {}
    for unit, group in calibration.groupby("unit"):
        stats = {}
        for sensor in sensors:
            centre = float(group[sensor].median())
            scale = float(group[sensor].std(ddof=1))
            # Floor prevents tiny sample variance from creating unbounded z-scores.
            scale = max(scale if np.isfinite(scale) else 0.0, global_scales[sensor] * 0.03, 1e-8)
            stats[sensor] = {"median": centre, "scale": scale}
        baselines[int(unit)] = stats
    return baselines


def derive_global_scales(frame: pd.DataFrame, sensors: list[str]):
    return {sensor: max(float(frame[sensor].std(ddof=1)), 1e-8) for sensor in sensors}


def rolling_range_reference(train_cal: pd.DataFrame, sensors: list[str]):
    """5% quantile of clean six-cycle ranges for each eligible sensor.

    Near-constant sensor_6 is deliberately excluded from flatline detection because
    its natural signal is often unchanged over six cycles in FD001.
    """
    result = {}
    for sensor in sensors:
        ranges = []
        for _, group in train_cal.groupby("unit"):
            values = group.sort_values("cycle")[sensor].to_numpy(dtype=float)
            ranges.extend(float(np.ptp(values[i - 5:i + 1])) for i in range(5, len(values)))
        result[sensor] = max(float(np.quantile(ranges, 0.05)) if ranges else 0.0, 1e-8)
    return result


def score_rows(
    calibration: pd.DataFrame,
    observations: pd.DataFrame,
    features: list[str],
    sensors: list[str],
    global_scales: dict[str, float],
    rolling_range_q05: dict[str, float],
    scaler: StandardScaler,
    isolation_forest: IsolationForest,
    lof: LocalOutlierFactor,
):
    """Return unsupervised and engineered sensor-pattern scores for ordered rows."""
    observations = observations.sort_values(["unit", "cycle"]).copy()
    baselines = fit_engine_baselines(calibration, sensors, global_scales)
    z = pd.DataFrame(index=observations.index, columns=sensors, dtype=float)

    for unit, group in observations.groupby("unit"):
        unit_stats = baselines.get(int(unit))
        if unit_stats is None:
            raise ValueError(f"No healthy calibration baseline supplied for engine {unit}.")
        for sensor in sensors:
            centre = unit_stats[sensor]["median"]
            scale = unit_stats[sensor]["scale"]
            z.loc[group.index, sensor] = (group[sensor] - centre) / scale

    # Point anomaly: strongest sensor deviation from that engine's initial baseline.
    spike_z = z.abs().max(axis=1)

    # Flatline score: high when a six-cycle sensor range is unusually small.
    stuck_score = pd.Series(0.0, index=observations.index, dtype=float)
    for unit, group in observations.groupby("unit"):
        idx = group.index.to_list()
        for sensor in rolling_range_q05:
            vals = group[sensor].to_numpy(dtype=float)
            ref_range = rolling_range_q05[sensor]
            for pos in range(5, len(vals)):
                current_range = float(np.ptp(vals[pos - 5:pos + 1]))
                score = ref_range / max(current_range, 1e-8)
                row_idx = idx[pos]
                if score > stuck_score.loc[row_idx]:
                    stuck_score.loc[row_idx] = score

    scaled = scaler.transform(observations[features])
    if_score = -isolation_forest.score_samples(scaled)
    lof_score = -lof.score_samples(scaled)

    scores = pd.DataFrame({
        "spike_z": spike_z,
        "stuck_score": stuck_score,
        "isolation_forest_score": if_score,
        "lof_score": lof_score,
    }, index=observations.index)
    return observations, scores, z


def inject_controlled_faults(observations: pd.DataFrame, global_scales: dict[str, float]):
    """Inject three documented high-severity fault patterns into a copy of clean rows."""
    faulty = observations.copy(deep=True).sort_values(["unit", "cycle"]).copy()
    labels = pd.Series(0, index=faulty.index, dtype=int)
    fault_types = pd.Series("normal", index=faulty.index, dtype=object)
    events = []

    for unit, group in faulty.groupby("unit"):
        idx = group.index.to_list()
        n = len(idx)
        if n < 12:
            continue

        # Spike: one-cycle excursion of 8 global standard deviations.
        spike_row = idx[int(n * 0.15)]
        spike_sensor = "sensor_2"
        faulty.loc[spike_row, spike_sensor] += 8.0 * global_scales[spike_sensor]
        labels.loc[spike_row] = 1
        fault_types.loc[spike_row] = "spike"
        events.append({"event_id": f"{int(unit)}-spike", "unit": int(unit), "fault_type": "spike", "rows": [int(spike_row)]})

        # Drift: five consecutive cycles with increasing offset (1 to 6 sigma).
        drift_rows = idx[int(n * 0.40):int(n * 0.40) + 5]
        drift_sensor = "sensor_3"
        if len(drift_rows) == 5:
            faulty.loc[drift_rows, drift_sensor] += np.linspace(1.0, 6.0, 5) * global_scales[drift_sensor]
            labels.loc[drift_rows] = 1
            fault_types.loc[drift_rows] = "drift"
            events.append({"event_id": f"{int(unit)}-drift", "unit": int(unit), "fault_type": "drift", "rows": [int(x) for x in drift_rows]})

        # Stuck-at: six consecutive readings held at the segment's first value.
        stuck_rows = idx[int(n * 0.70):int(n * 0.70) + 6]
        stuck_sensor = "sensor_4"
        if len(stuck_rows) == 6:
            held_value = float(faulty.loc[stuck_rows[0], stuck_sensor])
            faulty.loc[stuck_rows, stuck_sensor] = held_value
            labels.loc[stuck_rows] = 1
            fault_types.loc[stuck_rows] = "stuck_at"
            events.append({"event_id": f"{int(unit)}-stuck", "unit": int(unit), "fault_type": "stuck_at", "rows": [int(x) for x in stuck_rows]})

    return faulty, labels, fault_types, events


def metric_block(y_true: np.ndarray, y_pred: np.ndarray):
    precision, recall, f1, _ = precision_recall_fscore_support(
        y_true, y_pred, average="binary", zero_division=0
    )
    tn, fp, fn, tp = confusion_matrix(y_true, y_pred, labels=[0, 1]).ravel()
    return {
        "precision": float(precision), "recall": float(recall), "f1": float(f1),
        "accuracy": float((tn + tp) / max(tn + fp + fn + tp, 1)),
        "tn": int(tn), "fp": int(fp), "fn": int(fn), "tp": int(tp),
        "false_positive_rate": float(fp / max(fp + tn, 1)),
    }


def main():
    frame = load_fd001()
    candidate_features = [c for c in frame.columns if c not in META and frame[c].nunique(dropna=False) > 1]
    features = candidate_features
    # sensor_6 is retained for model scoring but excluded from stuck-at detection
    # because FD001 naturally has many six-cycle flat windows on this channel.
    sensors_for_z = [c for c in features if c.startswith("sensor_")]
    sensors_for_flatline = [c for c in sensors_for_z if c != "sensor_6"]

    train_ids, calibration_ids, test_ids = split_engine_ids(frame)
    train_cal, _ = reference_and_eval(frame, train_ids)
    val_cal, val_eval = reference_and_eval(frame, calibration_ids)
    test_cal, test_eval = reference_and_eval(frame, test_ids)

    global_scales = derive_global_scales(train_cal, sensors_for_z)
    range_q05 = rolling_range_reference(train_cal, sensors_for_flatline)

    scaler = StandardScaler().fit(train_cal[features])
    x_train = scaler.transform(train_cal[features])
    isolation_forest = IsolationForest(
        n_estimators=400, contamination=0.02, random_state=SEED, n_jobs=-1
    ).fit(x_train)
    lof_neighbors = min(20, max(2, len(train_cal) - 1))
    lof = LocalOutlierFactor(
        n_neighbors=lof_neighbors, contamination=0.02, novelty=True, n_jobs=-1
    ).fit(x_train)

    _, val_scores, _ = score_rows(
        val_cal, val_eval, features, sensors_for_z, global_scales,
        range_q05, scaler, isolation_forest, lof
    )

    # Thresholds use only clean observations from separate calibration engines.
    thresholds = {
        "lof_score": float(val_scores["lof_score"].quantile(0.992)),
        "spike_z": float(val_scores["spike_z"].quantile(0.992)),
        "stuck_score": float(val_scores["stuck_score"].quantile(0.992)),
    }

    faulty_eval, y_true, fault_types, events = inject_controlled_faults(test_eval, global_scales)
    scored_observations, test_scores, z = score_rows(
        test_cal, faulty_eval, features, sensors_for_z, global_scales,
        range_q05, scaler, isolation_forest, lof
    )

    # Final prototype decision: calibrated LOF + point-spike + sensor-flatline checks.
    # IF remains a benchmark score, not an alert trigger, based on this benchmark.
    y_pred = (
        (test_scores["lof_score"] >= thresholds["lof_score"]) |
        (test_scores["spike_z"] >= thresholds["spike_z"]) |
        (test_scores["stuck_score"] >= thresholds["stuck_score"])
    ).astype(int).to_numpy()
    y = y_true.to_numpy(dtype=int)
    sample_metrics = metric_block(y, y_pred)

    # Event-level recall: an injected event counts as detected if at least one row
    # within that event's interval is flagged.
    event_results = []
    for event in events:
        positions = [scored_observations.index.get_loc(row_id) for row_id in event["rows"]]
        detected = bool(np.any(y_pred[positions]))
        event_results.append({
            "event_id": event["event_id"], "unit": event["unit"],
            "fault_type": event["fault_type"], "detected": detected,
        })
    event_df = pd.DataFrame(event_results)
    per_fault = {}
    for fault_type in ["spike", "drift", "stuck_at"]:
        subset = event_df.loc[event_df.fault_type == fault_type]
        per_fault[fault_type] = {
            "events": int(len(subset)),
            "detected_events": int(subset.detected.sum()),
            "event_recall": float(subset.detected.mean()) if len(subset) else 0.0,
        }
    event_recall = float(event_df.detected.mean()) if len(event_df) else 0.0

    # Benchmark individual ML detectors on the same final synthetic set.
    benchmark = {}
    for name, score_col in [("Isolation Forest", "isolation_forest_score"), ("LOF", "lof_score")]:
        threshold = float(val_scores[score_col].quantile(0.99))
        pred = (test_scores[score_col].to_numpy() >= threshold).astype(int)
        benchmark[name] = metric_block(y, pred)
    benchmark["Selected combined detector"] = sample_metrics

    out = scored_observations[["unit", "cycle"]].copy()
    out["fault_type"] = fault_types.loc[out.index]
    out["true_fault"] = y
    out["predicted_anomaly"] = y_pred
    for column in test_scores.columns:
        out[column] = test_scores[column].to_numpy()
    out.to_csv(OUTPUT / "phase3_test_anomaly_results.csv", index=False)
    event_df.to_csv(OUTPUT / "phase3_event_results.csv", index=False)
    pd.DataFrame([{"model": name, **metrics} for name, metrics in benchmark.items()]).to_csv(
        OUTPUT / "phase3_model_comparison.csv", index=False
    )

    bundle = {
        "model_version": "phase3_fd001_v1",
        "dataset": "NASA C-MAPSS FD001",
        "features": features,
        "sensor_features": sensors_for_z,
        "flatline_features": sensors_for_flatline,
        "scaler": scaler,
        "isolation_forest": isolation_forest,
        "lof": lof,
        "thresholds": thresholds,
        "global_sensor_scales": global_scales,
        "rolling_range_q05": range_q05,
        "seed": SEED,
        "note": "Synthetic benchmark only; not certified or validated for live aircraft use.",
    }
    joblib.dump(bundle, OUTPUT / "aerosentry_phase3_model.joblib")

    report = {
        "phase": "3 - Anomaly Detection",
        "dataset": "NASA C-MAPSS FD001",
        "split_by_engine": {"train": len(train_ids), "calibration": len(calibration_ids), "final_test": len(test_ids)},
        "feature_count": len(features),
        "features": features,
        "thresholds_calibrated_on_clean_validation_engines": thresholds,
        "synthetic_test": {
            "test_engines": len(test_ids),
            "test_rows": int(len(y)),
            "injected_fault_rows": int(y.sum()),
            "injected_events": int(len(event_df)),
            "sample_level": sample_metrics,
            "event_level_recall": event_recall,
            "per_fault_type": per_fault,
        },
        "model_comparison": benchmark,
        "interpretation": [
            "All anomaly labels in this report come from controlled synthetic injections, not NASA ground-truth sensor-fault labels.",
            "The early-life calibration window is an engineering assumption and must be checked for each deployment domain.",
            "An alert indicates unusual telemetry, not a confirmed component failure.",
            "FD001 simulates one operating condition and HPC degradation; it does not establish performance on other engines or flight conditions.",
        ],
    }
    (OUTPUT / "phase3_metrics.json").write_text(json.dumps(report, indent=2))

    text_lines = [
        "AEROSENTRY PHASE 3 — FINAL REPRODUCIBLE SYNTHETIC BENCHMARK",
        "Dataset: NASA C-MAPSS FD001 (simulated turbofan degradation)",
        "Engine split: 70 train / 15 calibration / 15 final test; no engine appears in more than one split.",
        f"Candidate input features: {len(features)}",
        f"Validation-calibrated thresholds (99.2nd percentile): {thresholds}",
        "",
        "SELECTED COMBINED DETECTOR — SAMPLE-LEVEL METRICS",
        json.dumps(sample_metrics, indent=2),
        "",
        f"EVENT-LEVEL RECALL: {int(event_df.detected.sum())}/{len(event_df)} = {event_recall:.1%}",
    ]
    for fault_type, metrics in per_fault.items():
        text_lines.append(
            f"{fault_type}: {metrics['detected_events']}/{metrics['events']} events detected "
            f"({metrics['event_recall']:.1%})"
        )
    text_lines += ["", "MODEL COMPARISON (same synthetic test rows)"]
    for name, metrics in benchmark.items():
        text_lines.append(
            f"{name}: precision={metrics['precision']:.3f}, recall={metrics['recall']:.3f}, "
            f"F1={metrics['f1']:.3f}, FPR={metrics['false_positive_rate']:.3f}"
        )
    text_lines += [
        "", "LIMITATIONS",
        "1. Synthetic fault injections are not naturally labelled NASA faults.",
        "2. Event recall means at least one sample in each injected event interval was flagged.",
        "3. This benchmark does not prove real-world aircraft fault detection.",
        "4. FD001 is one simulated operating condition and one degradation mode (HPC).",
    ]
    (OUTPUT / "PHASE3_FINAL_REPORT.txt").write_text("\n".join(text_lines) + "\n")

    print("\n".join(text_lines))
    print("\nSaved model, metrics, comparison CSV, test scores and event results in outputs/.")


if __name__ == "__main__":
    warnings.filterwarnings("ignore", category=UserWarning)
    main()
