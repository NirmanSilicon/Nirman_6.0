"""AEROSENTRY Phase 3.1: engine-held-out validation and contiguous fault tests.

This is a controlled synthetic benchmark, NOT evidence of real aircraft fault detection.
Run: python phase3_evaluate.py
"""
from pathlib import Path
import numpy as np
import pandas as pd
from sklearn.ensemble import IsolationForest
from sklearn.model_selection import GroupShuffleSplit
from sklearn.preprocessing import StandardScaler
from sklearn.metrics import classification_report, confusion_matrix, precision_recall_fscore_support
import joblib

ROOT = Path(__file__).resolve().parent
DATA, OUTPUT = ROOT / 'data', ROOT / 'outputs'
OUTPUT.mkdir(exist_ok=True)
COLS = ['unit', 'cycle', 'setting_1', 'setting_2', 'setting_3'] + [f'sensor_{i}' for i in range(1, 22)]
META = {'unit', 'cycle'}
SEED = 42


def load_data():
    return pd.read_csv(DATA / 'train_FD001.txt', sep=r'\s+', header=None, names=COLS)


def early_reference(df, fraction=0.30):
    df = df.sort_values(['unit', 'cycle']).copy()
    last = df.groupby('unit')['cycle'].transform('max')
    return df.loc[df.cycle <= np.ceil(fraction * last)].copy()


def inject_segment_faults(clean_df, sensor_cols, seed=SEED):
    """Inject labelled, contiguous spike/drift/stuck-at events into a copy."""
    rng = np.random.default_rng(seed)
    out = clean_df.copy().reset_index(drop=True)
    labels = np.zeros(len(out), dtype=int)
    fault_type = np.full(len(out), 'normal', dtype=object)
    # Use actual sensor channels only; operational settings are not fault channels here.
    sensors = [c for c in sensor_cols if c.startswith('sensor_')]
    if len(sensors) < 3:
        raise ValueError('Need at least three non-constant sensor channels.')
    engines = sorted(out.unit.unique())
    for i, unit in enumerate(engines):
        idx = out.index[out.unit == unit].to_numpy()
        if len(idx) < 8:
            continue
        # Three separate events per engine, placed in non-overlapping portions.
        segments = [idx[len(idx)//5], idx[len(idx)//2], idx[(4*len(idx))//5]]
        # Spike: one extreme sample.
        j = int(segments[0]); col = sensors[0]
        sigma = max(float(out[col].std()), 1e-6)
        out.loc[j, col] += 8.0 * sigma
        labels[j] = 1; fault_type[j] = 'spike'
        # Drift: 6 consecutive samples with a gradual offset.
        start = int(segments[1]); col = sensors[1]
        positions = idx[(idx >= start)][:6]
        sigma = max(float(out[col].std()), 1e-6)
        if len(positions) == 6:
            out.loc[positions, col] += np.linspace(1.0, 6.0, 6) * sigma
            labels[positions] = 1; fault_type[positions] = 'drift'
        # Stuck-at: 6 consecutive identical readings.
        start = int(segments[2]); col = sensors[2]
        positions = idx[(idx >= start)][:6]
        if len(positions) == 6:
            stuck_value = float(out.loc[positions[0], col])
            out.loc[positions, col] = stuck_value
            labels[positions] = 1; fault_type[positions] = 'stuck_at'
    return out, labels, fault_type


def main():
    df = load_data()
    candidates = [c for c in df.columns if c not in META]
    features = [c for c in candidates if df[c].nunique(dropna=False) > 1]
    sensors = [c for c in features if c.startswith('sensor_')]

    # Split by engine IDs so rows from one engine cannot appear in both partitions.
    splitter = GroupShuffleSplit(n_splits=1, test_size=0.20, random_state=SEED)
    train_idx, hold_idx = next(splitter.split(df, groups=df.unit))
    train_engines = df.iloc[train_idx].unit.unique()
    hold_engines = df.iloc[hold_idx].unit.unique()
    train_ref = early_reference(df[df.unit.isin(train_engines)])
    hold_ref = early_reference(df[df.unit.isin(hold_engines)])

    scaler = StandardScaler()
    x_train = scaler.fit_transform(train_ref[features])
    model = IsolationForest(n_estimators=400, contamination=0.02, random_state=SEED, n_jobs=-1)
    model.fit(x_train)

    # Calibrate a fixed anomaly threshold on unseen, clean engines.
    hold_scores = -model.score_samples(scaler.transform(hold_ref[features]))
    threshold = float(np.quantile(hold_scores, 0.98))

    synthetic, y_true, kinds = inject_segment_faults(hold_ref, features)
    scores = -model.score_samples(scaler.transform(synthetic[features]))
    y_pred = (scores >= threshold).astype(int)

    report = classification_report(y_true, y_pred, labels=[0, 1], target_names=['normal', 'injected_fault'], zero_division=0)
    cm = confusion_matrix(y_true, y_pred, labels=[0, 1])
    lines = [
        'AEROSENTRY Phase 3.1 — Engine-held-out synthetic fault evaluation',
        'IMPORTANT: injected faults are artificial; these metrics are not NASA ground-truth fault metrics.',
        f'Train engines: {len(train_engines)} | held-out engines: {len(hold_engines)}',
        f'Features ({len(features)}): {", ".join(features)}',
        f'Calibration threshold (98th percentile of held-out clean scores): {threshold:.6f}',
        f'Rows evaluated: {len(y_true)} | injected fault rows: {int(y_true.sum())}',
        '', 'Overall classification report:', report,
        'Confusion matrix [[TN, FP], [FN, TP]]:', str(cm), '',
        'Per fault type:']
    for kind in ['spike', 'drift', 'stuck_at']:
        mask = kinds == kind
        if mask.any():
            p, r, f1, _ = precision_recall_fscore_support(y_true[mask], y_pred[mask], average='binary', zero_division=0)
            lines.append(f'{kind}: injected_rows={int(mask.sum())}, detected={int(y_pred[mask].sum())}, precision={p:.3f}, recall={r:.3f}, f1={f1:.3f}')
    (OUTPUT / 'heldout_synthetic_evaluation.txt').write_text('\n'.join(lines))

    scored = synthetic[['unit', 'cycle']].copy()
    scored['fault_type'] = kinds
    scored['true_fault'] = y_true
    scored['anomaly_score'] = scores
    scored['predicted_anomaly'] = y_pred
    scored.to_csv(OUTPUT / 'heldout_synthetic_scores.csv', index=False)
    joblib.dump({'model': model, 'scaler': scaler, 'feature_cols': features, 'threshold': threshold}, OUTPUT / 'isolation_forest_validated.joblib')

    print('\n'.join(lines))
    print('\nSaved heldout_synthetic_evaluation.txt, heldout_synthetic_scores.csv and isolation_forest_validated.joblib in outputs/.')

if __name__ == '__main__':
    main()
