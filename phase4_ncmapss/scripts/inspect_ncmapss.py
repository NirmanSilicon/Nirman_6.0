"""Inspect a real N-CMAPSS HDF5 subset (default: DS05) in bounded memory.

For the current DS05 profile this checks all six aligned array families, their
column counts and names, finite numeric values, metadata-derived engine/flight
identities, and disjoint development/test units. It does not load whole arrays
into RAM and does not include virtual or hidden health variables as predictors.
"""
from __future__ import annotations

import argparse
import hashlib
import json
from pathlib import Path
from typing import Any

import h5py
import numpy as np

BASES = ["W", "X_s", "X_v", "T", "Y", "A"]
EXPECTED_WIDTHS = {"W": 4, "X_s": 14, "X_v": 14, "T": 10, "Y": 1, "A": 4}
EXPECTED_VARIABLES = {
    "W": {"alt", "mach", "tra", "t2"},
    "X_s": {"t24", "t30", "t48", "t50", "p15", "p2", "p21", "p24", "ps30", "p40", "p50", "nf", "nc", "wf"},
    "X_v": {"t40", "p30", "p45", "w21", "w22", "w25", "w31", "w32", "w48", "w50", "smfan", "smlpc", "smhpc", "phi"},
    "T": {"fan_eff_mod", "fan_flow_mod", "lpc_eff_mod", "lpc_flow_mod", "hpc_eff_mod", "hpc_flow_mod", "hpt_eff_mod", "hpt_flow_mod", "lpt_eff_mod", "lpt_flow_mod"},
    "A": {"unit", "cycle", "fc", "hs"},
}


def decode_names(ds: h5py.Dataset | None) -> list[str]:
    if ds is None:
        return []
    raw = np.asarray(ds)
    result: list[str] = []
    for value in raw.reshape(-1):
        if isinstance(value, bytes):
            result.append(value.decode("utf-8", errors="replace").strip())
        else:
            result.append(str(value).strip())
    return result


def find_leaf(h5: h5py.File, name: str) -> h5py.Dataset | None:
    if name in h5 and isinstance(h5[name], h5py.Dataset):
        return h5[name]
    matches: list[h5py.Dataset] = []

    def visit(path: str, obj: Any) -> None:
        if isinstance(obj, h5py.Dataset) and path.rsplit("/", 1)[-1] == name:
            matches.append(obj)

    h5.visititems(visit)
    if len(matches) > 1:
        raise ValueError(f"Multiple HDF5 datasets have leaf name {name!r}: {[x.name for x in matches]}")
    return matches[0] if matches else None


def sha256_file(path: Path, chunk_bytes: int = 8 * 1024 * 1024) -> str:
    digest = hashlib.sha256()
    with path.open("rb") as handle:
        for chunk in iter(lambda: handle.read(chunk_bytes), b""):
            digest.update(chunk)
    return digest.hexdigest()


def check_finite(ds: h5py.Dataset, chunk_rows: int) -> dict[str, int]:
    non_finite = 0
    checked = 0
    for start in range(0, ds.shape[0], chunk_rows):
        block = np.asarray(ds[start:start + chunk_rows])
        if np.issubdtype(block.dtype, np.number):
            checked += int(block.size)
            non_finite += int((~np.isfinite(block)).sum())
    return {"values_checked": checked, "non_finite_values": non_finite}


def unit_summary(a_ds: h5py.Dataset, a_names: list[str], chunk_rows: int) -> dict[str, Any]:
    normalized = [name.strip().lower() for name in a_names]
    if "unit" not in normalized or "cycle" not in normalized:
        raise ValueError(f"A_var must identify unit and cycle columns; found {a_names}")
    unit_idx, cycle_idx = normalized.index("unit"), normalized.index("cycle")
    units: set[int] = set()
    flights: set[tuple[int, int]] = set()
    for start in range(0, a_ds.shape[0], chunk_rows):
        values = np.asarray(a_ds[start:start + chunk_rows])
        selected = values[:, [unit_idx, cycle_idx]]
        if not np.isfinite(selected).all():
            raise ValueError("A metadata contains non-finite unit/cycle identifiers.")
        rounded = np.rint(selected)
        if not np.allclose(selected, rounded, atol=1e-8):
            raise ValueError("A metadata unit/cycle identifiers contain non-integer values.")
        integer_values = rounded.astype(np.int64)
        units.update(np.unique(integer_values[:, 0]).tolist())
        pairs = np.unique(integer_values, axis=0)
        flights.update((int(unit), int(cycle)) for unit, cycle in pairs)
    per_engine = {
        str(unit): sum(1 for item_unit, _ in flights if item_unit == unit)
        for unit in sorted(units)
    }
    return {"engine_units": sorted(units), "flight_count": len(flights), "flights_per_engine": per_engine}


def main() -> int:
    root = Path(__file__).resolve().parents[1]
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--file", type=Path, default=root / "data/raw/N-CMAPSS_DS05.h5")
    parser.add_argument("--dataset-id", default="DS05", help="Dataset label used in the report/output name.")
    parser.add_argument("--output", type=Path, default=None)
    parser.add_argument("--chunk-rows", type=int, default=250_000)
    args = parser.parse_args()
    if not args.file.is_file():
        parser.error(f"HDF5 file not found: {args.file}. Place the selected N-CMAPSS HDF5 file in data/raw or pass --file.")
    if args.chunk_rows <= 0:
        parser.error("--chunk-rows must be positive")

    dataset_id = args.dataset_id.upper().replace("N-CMAPSS_", "")
    output_path = args.output or root / "outputs" / f"ncmapss_{dataset_id.lower()}_inspection.json"
    report: dict[str, Any] = {
        "dataset": f"NASA N-CMAPSS {dataset_id}",
        "file": str(args.file.resolve()),
        "file_size_bytes": args.file.stat().st_size,
        "sha256": None,
        "groups_and_datasets": [],
        "variable_names": {},
        "splits": {},
        "finite_value_checks": {},
        "feature_policy": {
            "default_model_inputs": "W_* operating conditions plus X_s_* physical measured sensors (18 channels for DS05)",
            "excluded_from_default_inputs": ["X_v_* virtual sensors", "T_* hidden engine-model health parameters", "A_* metadata", "Y_* RUL target"],
        },
        "warnings": [],
    }
    with h5py.File(args.file, "r") as h5:
        def visitor(path: str, obj: Any) -> None:
            if isinstance(obj, h5py.Dataset):
                report["groups_and_datasets"].append({"path": path, "shape": list(obj.shape), "dtype": str(obj.dtype), "ndim": int(obj.ndim)})
        h5.visititems(visitor)

        names_by_base = {base: decode_names(find_leaf(h5, f"{base}_var")) for base in BASES}
        report["variable_names"] = names_by_base
        all_units: dict[str, list[int]] = {}
        for split in ("dev", "test"):
            shapes: dict[str, list[int]] = {}
            datasets: dict[str, h5py.Dataset] = {}
            for base in BASES:
                dataset = find_leaf(h5, f"{base}_{split}")
                if dataset is not None:
                    datasets[base] = dataset
                    shapes[base] = list(dataset.shape)
            row_counts = {base: shape[0] for base, shape in shapes.items() if shape}
            info: dict[str, Any] = {
                "shapes": shapes,
                "row_counts": row_counts,
                "required_arrays_present": all(base in datasets for base in BASES),
            }
            info["row_aligned"] = info["required_arrays_present"] and len(set(row_counts.get(base) for base in BASES)) == 1
            info["widths_valid"] = True
            info["metadata_labels_valid"] = True
            for base, expected_width in EXPECTED_WIDTHS.items():
                shape = shapes.get(base)
                if not shape or len(shape) != 2 or shape[1] != expected_width:
                    info["widths_valid"] = False
                    report["warnings"].append(f"{base}_{split} expected a 2-D array with {expected_width} columns; got {shape}.")
                labels = names_by_base.get(base, [])
                if base != "Y":
                    expected_names = EXPECTED_VARIABLES[base]
                    if len(labels) != expected_width or {value.strip().lower() for value in labels} != expected_names:
                        info["metadata_labels_valid"] = False
                        report["warnings"].append(f"{base}_var labels do not match the expected DS05 schema: {labels}")
            try:
                if "A" in datasets:
                    info.update(unit_summary(datasets["A"], names_by_base.get("A", []), args.chunk_rows))
                    all_units[split] = info["engine_units"]
                else:
                    report["warnings"].append(f"A_{split} metadata array is missing.")
            except ValueError as exc:
                report["warnings"].append(f"{split.upper()} metadata validation failed: {exc}")

            split_finite: dict[str, dict[str, int]] = {}
            for base in BASES:
                dataset = datasets.get(base)
                if dataset is not None:
                    result = check_finite(dataset, args.chunk_rows)
                    split_finite[base] = result
                    if result["non_finite_values"]:
                        report["warnings"].append(f"{base}_{split} contains {result['non_finite_values']} NaN/Inf values.")
            report["finite_value_checks"][split] = split_finite

            if not info["required_arrays_present"] or not info["row_aligned"]:
                report["warnings"].append(f"{split} arrays are absent or not row-aligned: {row_counts}")
            if not info["widths_valid"]:
                report["warnings"].append(f"{split} array dimensions do not match the DS05 schema.")
            report["splits"][split] = info

        if set(all_units) == {"dev", "test"}:
            overlap = sorted(set(all_units["dev"]).intersection(all_units["test"]))
            report["engine_split_overlap"] = overlap
            if overlap:
                report["warnings"].append(f"Engine IDs overlap between dev and test splits: {overlap}")
        else:
            report["warnings"].append("Could not verify disjoint engine IDs across development and test splits.")

    report["sha256"] = sha256_file(args.file)
    report["validation_status"] = "passed" if not report["warnings"] else "failed"
    output_path.parent.mkdir(parents=True, exist_ok=True)
    output_path.write_text(json.dumps(report, indent=2), encoding="utf-8")
    print(f"N-CMAPSS {dataset_id} inspection complete")
    print(f"File: {args.file}")
    print(f"Size: {args.file.stat().st_size / (1024**3):.2f} GiB")
    for split, info in report["splits"].items():
        print(f"\n{split.upper()} row counts: {info.get('row_counts', {})}")
        print(f"  Engine units: {info.get('engine_units', [])}")
        print(f"  Flights: {info.get('flight_count', 'n/a')}")
        print(f"  Row aligned: {info.get('row_aligned', False)}")
    print(f"\nReport saved: {output_path}")
    if report["warnings"]:
        print("\nWARNINGS:")
        for warning in report["warnings"]:
            print(f"  - {warning}")
    else:
        print("INSPECTION CHECKS: PASS")
    return 0 if report["validation_status"] == "passed" else 2


if __name__ == "__main__":
    raise SystemExit(main())
