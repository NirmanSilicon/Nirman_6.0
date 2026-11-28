# -*- coding: utf-8 -*-
"""
ai_model/drift_reference_set.py

CAELIS AI — Fixed Benchmark Reference Dataset (Frozen for Drift Governance)
Frozen on: 2026-09-02 (Pipeline v4.0 Active Learning & Drift Governance)

Generates and loads `ai_model/drift_reference_set.csv` — a FIXED, never-regenerated
benchmark dataset containing 2,000 standardized feature vectors sampled across all
5 flight/spacecraft datasets (OPSSAT-AD, CuCD-ID, Micius, SMAP-MSL, PCoE-Battery).

This serves as the immutable yardstick against which every future candidate model's
prediction distribution is compared via Population Stability Index (PSI).
"""

import os
import sys
import pandas as pd
import numpy as np

THIS_DIR = os.path.dirname(os.path.abspath(__file__))
PROJECT_ROOT = os.path.abspath(os.path.join(THIS_DIR, ".."))
CSV_PATH = os.path.join(THIS_DIR, "drift_reference_set.csv")
HARMONIZATION_LOG = os.path.join(THIS_DIR, "feature_harmonization_log.csv")

FEATURE_COLS = [
    "feat_mean",
    "feat_std",
    "feat_min",
    "feat_max",
    "feat_range",
    "feat_rate_of_change",
    "feat_skewness",
]
LABEL_COL = "label"
DATASET_COL = "dataset_source"

RANDOM_STATE = 42
TARGET_SAMPLE_SIZE = 2000


def generate_drift_reference_set(output_path: str = CSV_PATH, sample_size: int = TARGET_SAMPLE_SIZE, force: bool = False) -> pd.DataFrame:
    """
    Generate the immutable drift reference set from the harmonized datasets.
    If the file already exists and force is False, loads existing frozen benchmark.
    """
    if os.path.exists(output_path) and not force:
        print(f"[DriftReference] {output_path} already exists. Loading existing frozen benchmark.")
        return pd.read_csv(output_path, comment="#")

    print(f"[DriftReference] Generating fixed benchmark reference set (N={sample_size})...")

    if os.path.exists(HARMONIZATION_LOG):
        full_df = pd.read_csv(HARMONIZATION_LOG)
    else:
        from ai_model.build_telemetry_ensemble import load_all_datasets
        full_df, _ = load_all_datasets()

    # Stratified sampling across dataset sources and labels
    datasets = full_df[DATASET_COL].unique()
    per_dataset_samples = max(sample_size // len(datasets), 1)

    sampled_dfs = []

    for ds in datasets:
        sub_df = full_df[full_df[DATASET_COL] == ds]
        n_take = min(per_dataset_samples, len(sub_df))

        # Stratify by label if multiple labels exist
        if sub_df[LABEL_COL].nunique() > 1:
            nom = sub_df[sub_df[LABEL_COL] == 0]
            anom = sub_df[sub_df[LABEL_COL] == 1]
            n_nom = int(n_take * len(nom) / len(sub_df))
            n_anom = n_take - n_nom

            take_nom = nom.sample(n=min(n_nom, len(nom)), random_state=RANDOM_STATE) if len(nom) > 0 else pd.DataFrame()
            take_anom = anom.sample(n=min(n_anom, len(anom)), random_state=RANDOM_STATE) if len(anom) > 0 else pd.DataFrame()
            sampled_ds = pd.concat([take_nom, take_anom], ignore_index=True)
        else:
            sampled_ds = sub_df.sample(n=n_take, random_state=RANDOM_STATE)

        sampled_dfs.append(sampled_ds)

    ref_df = pd.concat(sampled_dfs, ignore_index=True)

    # If short of target, fill from remaining rows
    if len(ref_df) < sample_size:
        remaining = full_df.drop(ref_df.index, errors="ignore")
        needed = min(sample_size - len(ref_df), len(remaining))
        if needed > 0:
            extra = remaining.sample(n=needed, random_state=RANDOM_STATE)
            ref_df = pd.concat([ref_df, extra], ignore_index=True)

    # Sort columns
    cols_to_save = FEATURE_COLS + [LABEL_COL, DATASET_COL]
    ref_df = ref_df[cols_to_save].copy()

    # Shuffle with fixed seed
    ref_df = ref_df.sample(frac=1.0, random_state=RANDOM_STATE).reset_index(drop=True)

    # Write CSV with documentation header
    header_comment = (
        f"# CAELIS AI Fixed Benchmark Reference Dataset\n"
        f"# Frozen on: 2026-09-02 (Pipeline v4.0 Active Learning & Drift Governance)\n"
        f"# Total rows: {len(ref_df)} | Random seed: {RANDOM_STATE}\n"
        f"# NEVER REGENERATE IN PRODUCTION RETRAINS\n"
    )

    with open(output_path, "w", encoding="utf-8") as f:
        f.write(header_comment)
        ref_df.to_csv(f, index=False)

    print(f"[DriftReference] Frozen reference set written to {output_path} ({len(ref_df)} rows).")
    return ref_df


def load_drift_reference_set(csv_path: str = CSV_PATH) -> pd.DataFrame:
    """
    Load the fixed reference dataset, ignoring comments.
    """
    if not os.path.exists(csv_path):
        return generate_drift_reference_set(output_path=csv_path)

    df = pd.read_csv(csv_path, comment="#")
    for col in FEATURE_COLS:
        if col not in df.columns:
            raise ValueError(f"Corrupted reference set: missing required feature column '{col}'")
    return df


if __name__ == "__main__":
    force_gen = "--force" in sys.argv
    df = generate_drift_reference_set(force=force_gen)
    print(f"Verified Reference Set: {len(df)} rows across {df[DATASET_COL].value_counts().to_dict()}")
