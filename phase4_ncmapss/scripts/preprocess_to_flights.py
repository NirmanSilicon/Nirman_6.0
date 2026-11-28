"""Create memory-conscious per-flight summaries from an N-CMAPSS subset.

Default observable predictors are the four W flight-condition channels plus the
14 X_s physical sensor channels. X_v (virtual signals), T (hidden simulator health
parameters), A (metadata) and Y (RUL target) are never emitted as predictor features.
"""
from __future__ import annotations

import argparse
import json
from pathlib import Path
from typing import Any

import h5py
import numpy as np
import pandas as pd


def get_ds(h5: h5py.File, name: str) -> h5py.Dataset:
    if name in h5 and isinstance(h5[name], h5py.Dataset):
        return h5[name]
    found: list[h5py.Dataset] = []
    def visitor(path: str, obj: Any) -> None:
        if isinstance(obj, h5py.Dataset) and path.rsplit("/", 1)[-1] == name:
            found.append(obj)
    h5.visititems(visitor)
    if len(found) > 1:
        raise ValueError(f"Multiple HDF5 datasets have leaf name {name!r}: {[x.name for x in found]}")
    if not found:
        raise KeyError(f"Required HDF5 dataset not found: {name}")
    return found[0]


def read_names(h5: h5py.File, key: str, fallback_prefix: str, width: int) -> list[str]:
    try:
        raw = np.asarray(get_ds(h5, key)).reshape(-1)
        names = [x.decode("utf-8", errors="replace").strip() if isinstance(x, bytes) else str(x).strip() for x in raw]
        if len(names) == width:
            return names
    except KeyError:
        pass
    return [f"{fallback_prefix}_{i}" for i in range(width)]


def group_key(row: np.ndarray, unit_idx: int, cycle_idx: int) -> tuple[int, int]:
    return int(row[unit_idx]), int(row[cycle_idx])


def make_record(key, a_row, a_names, feature_names, xs_parts, w_parts, y_parts):
    xs = np.concatenate(xs_parts, axis=0)
    w = np.concatenate(w_parts, axis=0)
    y = np.concatenate(y_parts, axis=0).reshape(-1)
    x = np.concatenate([w, xs], axis=1)
    record: dict[str, float | int] = {"unit": key[0], "cycle": key[1], "samples_in_flight": int(len(x))}
    a_lookup = {name.lower(): float(a_row[i]) for i, name in enumerate(a_names) if i < len(a_row)}
    if "fc" in a_lookup:
        record["flight_class"] = int(a_lookup["fc"])
    if "hs" in a_lookup:
        record["health_state_code"] = int(a_lookup["hs"])
    for col, name in enumerate(feature_names):
        values = x[:, col]
        if not np.isfinite(values).all():
            raise ValueError(f"Non-finite values detected in {name} for engine/flight {key}.")
        safe_name = name.replace(" ", "_")
        record[f"{safe_name}_mean"] = float(np.mean(values))
        record[f"{safe_name}_std"] = float(np.std(values))
        record[f"{safe_name}_min"] = float(np.min(values))
        record[f"{safe_name}_max"] = float(np.max(values))
    if not np.isfinite(y).all():
        raise ValueError(f"Non-finite RUL labels detected for engine/flight {key}.")
    record["rul_first"] = float(y[0])
    record["rul_last"] = float(y[-1])
    record["rul_mean"] = float(np.mean(y))
    record["rul_min"] = float(np.min(y))
    record["rul_max"] = float(np.max(y))
    record["rul_within_flight_range"] = float(np.max(y) - np.min(y))
    return record


def aggregate_split(h5: h5py.File, split: str, chunk_rows: int) -> pd.DataFrame:
    a_ds, w_ds, xs_ds, y_ds = [get_ds(h5, f"{name}_{split}") for name in ("A", "W", "X_s", "Y")]
    if any(ds.ndim == 0 or ds.shape[0] != a_ds.shape[0] for ds in (w_ds, xs_ds, y_ds)):
        raise ValueError(f"{split} arrays are not row-aligned; run inspect_ncmapss.py first.")
    a_names = read_names(h5, "A_var", "A", a_ds.shape[1])
    norm_a = [name.lower() for name in a_names]
    if "unit" not in norm_a or "cycle" not in norm_a:
        raise ValueError(f"A_var must identify unit and cycle columns; got {a_names}")
    unit_idx, cycle_idx = norm_a.index("unit"), norm_a.index("cycle")
    w_names = read_names(h5, "W_var", "W", w_ds.shape[1])
    xs_names = read_names(h5, "X_s_var", "sensor", xs_ds.shape[1])
    if w_ds.ndim != 2 or xs_ds.ndim != 2 or y_ds.ndim not in (1, 2):
        raise ValueError(f"Expected W/X_s 2-D and Y 1-D or 2-D arrays; got {w_ds.shape}, {xs_ds.shape}, {y_ds.shape}")
    if len(w_names) != w_ds.shape[1] or len(xs_names) != xs_ds.shape[1]:
        raise ValueError("Variable-name metadata width does not match the corresponding feature array.")
    feature_names = w_names + xs_names
    if len(set(feature_names)) != len(feature_names):
        raise ValueError(f"Duplicate observable feature names found: {feature_names}")

    records: list[dict[str, float | int]] = []
    seen_keys: set[tuple[int, int]] = set()
    pending = None

    def consume(key, a_row, a_parts, w_parts, xs_parts, y_parts):
        if key in seen_keys:
            raise ValueError(f"Engine/flight key {key} appears in multiple separated blocks; data are not contiguous by flight.")
        seen_keys.add(key)
        records.append(make_record(key, a_row, a_names, feature_names, xs_parts, w_parts, y_parts))

    n_rows = a_ds.shape[0]
    for start in range(0, n_rows, chunk_rows):
        end = min(start + chunk_rows, n_rows)
        a = np.asarray(a_ds[start:end])
        w = np.asarray(w_ds[start:end], dtype=np.float32)
        xs = np.asarray(xs_ds[start:end], dtype=np.float32)
        y = np.asarray(y_ds[start:end], dtype=np.float32).reshape(-1, 1)
        breaks = np.flatnonzero((a[1:, unit_idx] != a[:-1, unit_idx]) | (a[1:, cycle_idx] != a[:-1, cycle_idx])) + 1
        starts, ends = np.r_[0, breaks], np.r_[breaks, len(a)]
        segments = [(int(s), int(e)) for s, e in zip(starts, ends)]
        seg_i = 0
        if pending is not None:
            first_s, first_e = segments[0]
            first_key = group_key(a[first_s], unit_idx, cycle_idx)
            if first_key == pending["key"]:
                pending["a_parts"].append(a[first_s:first_e])
                pending["w_parts"].append(w[first_s:first_e])
                pending["xs_parts"].append(xs[first_s:first_e])
                pending["y_parts"].append(y[first_s:first_e])
                seg_i = 1
                if seg_i == len(segments):
                    continue
                consume(pending["key"], pending["a_parts"][0][0], pending["a_parts"], pending["w_parts"], pending["xs_parts"], pending["y_parts"])
                pending = None
            else:
                consume(pending["key"], pending["a_parts"][0][0], pending["a_parts"], pending["w_parts"], pending["xs_parts"], pending["y_parts"])
                pending = None
        remaining = segments[seg_i:]
        if not remaining:
            continue
        for s, e in remaining[:-1]:
            key = group_key(a[s], unit_idx, cycle_idx)
            consume(key, a[s], [a[s:e]], [w[s:e]], [xs[s:e]], [y[s:e]])
        s, e = remaining[-1]
        pending = {"key": group_key(a[s], unit_idx, cycle_idx), "a_parts": [a[s:e]], "w_parts": [w[s:e]], "xs_parts": [xs[s:e]], "y_parts": [y[s:e]]}

    if pending is not None:
        consume(pending["key"], pending["a_parts"][0][0], pending["a_parts"], pending["w_parts"], pending["xs_parts"], pending["y_parts"])
    frame = pd.DataFrame.from_records(records)
    if frame.empty:
        raise ValueError(f"No flight summaries were generated for split={split}.")
    if frame.duplicated(["unit", "cycle"]).any():
        raise ValueError(f"Duplicate engine/flight keys found in split={split}.")
    return frame


def main() -> int:
    root = Path(__file__).resolve().parents[1]
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--file", type=Path, default=root / "data/raw/N-CMAPSS_DS05.h5")
    parser.add_argument("--dataset-id", default="DS05")
    parser.add_argument("--output-dir", type=Path, default=root / "data/processed")
    parser.add_argument("--chunk-rows", type=int, default=250_000)
    args = parser.parse_args()
    if not args.file.is_file():
        parser.error(f"HDF5 file not found: {args.file}")
    if args.chunk_rows < 10_000:
        parser.error("--chunk-rows must be at least 10000 for efficient processing")
    dataset_id = args.dataset_id.upper().replace("N-CMAPSS_", "")
    args.output_dir.mkdir(parents=True, exist_ok=True)
    summary: dict[str, Any] = {
        "dataset": f"NASA N-CMAPSS {dataset_id}",
        "source_file": str(args.file.resolve()),
        "source_size_bytes": args.file.stat().st_size,
        "chunk_rows": int(args.chunk_rows),
        "aggregation_level": "one row per engine flight/cycle",
        "input_policy": {
            "included": "W observable flight-condition variables and X_s physical measured sensor channels",
            "excluded": ["X_v virtual sensors", "T hidden simulator health parameters", "A auxiliary metadata as predictors", "Y RUL target as predictor"],
        },
        "splits": {},
        "target_note": "rul_first/rul_last/rul_mean/rul_min/rul_max summarize Y within each flight. Choose and justify a single target definition before training.",
    }
    all_units: dict[str, list[int]] = {}
    with h5py.File(args.file, "r") as h5:
        for split in ("dev", "test"):
            print(f"Aggregating {split} split in chunks...")
            frame = aggregate_split(h5, split, args.chunk_rows)
            out = args.output_dir / f"ncmapss_{dataset_id.lower()}_{split}_flights.csv"
            temp_out = out.with_suffix(out.suffix + ".partial")
            frame.to_csv(temp_out, index=False)
            temp_out.replace(out)
            units = sorted(frame["unit"].unique().astype(int).tolist())
            all_units[split] = units
            summary["splits"][split] = {
                "output_file": out.name,
                "rows": int(len(frame)),
                "columns": int(len(frame.columns)),
                "engine_units": units,
                "flight_key_duplicates": int(frame.duplicated(["unit", "cycle"]).sum()),
                "feature_columns": [c for c in frame.columns if c.endswith(("_mean", "_std", "_min", "_max")) and not c.startswith("rul_")],
                "rul_within_flight_range_max": float(frame["rul_within_flight_range"].max()),
                "flights_with_varying_rul": int((frame["rul_within_flight_range"] > 1e-8).sum()),
                "output_size_bytes": out.stat().st_size,
            }
            print(f"Saved {len(frame)} flights, {len(frame.columns)} columns: {out}")
            print("Engine units:", units)
    overlap = sorted(set(all_units.get("dev", [])).intersection(all_units.get("test", [])))
    summary["engine_split_overlap"] = overlap
    if overlap:
        raise ValueError(f"Engine IDs overlap between dev and test splits: {overlap}")
    summary["validation_status"] = "passed"
    summary_path = args.output_dir / f"ncmapss_{dataset_id.lower()}_preprocessing_summary.json"
    summary_path.write_text(json.dumps(summary, indent=2), encoding="utf-8")
    print(f"Saved preprocessing summary: {summary_path}")
    print("PREPROCESSING COMPLETE")
    print("Default model inputs: W flight conditions + X_s physical measured sensors.")
    print("Excluded: X_v virtual sensors, T hidden health parameters, A metadata and Y target from predictors.")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
