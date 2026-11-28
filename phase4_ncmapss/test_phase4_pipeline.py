"""Small synthetic HDF5 smoke tests for the Phase 4 loader/aggregator.
Run: python -m unittest test_phase4_pipeline.py
"""
from __future__ import annotations

import tempfile
import unittest
import subprocess
import sys
import json
from pathlib import Path

import h5py
import numpy as np

try:
    from .scripts.preprocess_to_flights import aggregate_split
except ImportError:  # direct execution from the phase4 folder
    from scripts.preprocess_to_flights import aggregate_split


class Phase4PipelineTests(unittest.TestCase):
    def setUp(self):
        self.temp = tempfile.TemporaryDirectory()
        self.h5_path = Path(self.temp.name) / "mock_ds05.h5"
        rng = np.random.default_rng(17)
        with h5py.File(self.h5_path, "w") as h5:
            for split, units in (("dev", [101, 102, 103, 104, 105, 106]), ("test", [201, 202, 203])):
                rows, rul = [], []
                for unit in units:
                    for cycle in (1, 2):
                        for second in range(7):
                            rows.append((unit, cycle, 1, 0))
                            rul.append(2 - cycle)
                a = np.asarray(rows, dtype=np.int32)
                n = len(a)
                h5.create_dataset(f"A_{split}", data=a)
                h5.create_dataset(f"W_{split}", data=rng.normal(size=(n, 4)).astype("f4"))
                h5.create_dataset(f"X_s_{split}", data=rng.normal(size=(n, 14)).astype("f4"))
                h5.create_dataset(f"X_v_{split}", data=rng.normal(size=(n, 14)).astype("f4"))
                h5.create_dataset(f"T_{split}", data=rng.normal(size=(n, 10)).astype("f4"))
                h5.create_dataset(f"Y_{split}", data=np.asarray(rul, dtype="f4").reshape(-1, 1))
            metadata = {
                "A_var": ["unit", "cycle", "Fc", "hs"],
                "W_var": ["alt", "Mach", "TRA", "T2"],
                "X_s_var": ["Wf", "Nf", "Nc", "T24", "T30", "T48", "T50", "P15", "P2", "P21", "P24", "Ps30", "P40", "P50"],
                "X_v_var": ["T40", "P30", "P45", "W21", "W22", "W25", "W31", "W32", "W48", "W50", "SmFan", "SmLPC", "SmHPC", "phi"],
                "T_var": ["fan_eff_mod", "fan_flow_mod", "LPC_eff_mod", "LPC_flow_mod", "HPC_eff_mod", "HPC_flow_mod", "HPT_eff_mod", "HPT_flow_mod", "LPT_eff_mod", "LPT_flow_mod"],
            }
            for key, names in metadata.items():
                h5.create_dataset(key, data=np.asarray(names, dtype=h5py.string_dtype()))

    def tearDown(self):
        self.temp.cleanup()

    def test_dev_split_aggregates_engine_flights_and_crosses_chunk_boundaries(self):
        with h5py.File(self.h5_path, "r") as h5:
            frame = aggregate_split(h5, "dev", chunk_rows=13)
        self.assertEqual(len(frame), 12)
        self.assertEqual(frame["unit"].nunique(), 6)
        self.assertEqual(frame["samples_in_flight"].min(), 7)
        self.assertIn("Wf_mean", frame.columns)
        self.assertIn("alt_std", frame.columns)
        self.assertIn("rul_mean", frame.columns)
        self.assertIn("health_state_code", frame.columns)
        self.assertNotIn("T0_mean", frame.columns)
        self.assertNotIn("V0_mean", frame.columns)

    def test_test_split_units_are_separate(self):
        with h5py.File(self.h5_path, "r") as h5:
            frame = aggregate_split(h5, "test", chunk_rows=11)
        self.assertEqual(len(frame), 6)
        self.assertEqual(sorted(frame["unit"].unique().tolist()), [201, 202, 203])

    def test_ds05_nested_zip_extractor_writes_expected_file(self):
        from zipfile import ZipFile

        phase_root = Path(__file__).resolve().parent
        script = phase_root / "scripts" / "extract_ds05_from_nested_zip.py"
        archive_path = Path(self.temp.name) / "data_set.zip"
        output_path = Path(self.temp.name) / "N-CMAPSS_DS05.h5"
        payload = b"small hdf5 placeholder for zip-extraction smoke test"
        with ZipFile(archive_path, "w") as archive:
            archive.writestr("data_set/N-CMAPSS_DS05.h5", payload)

        extracted = subprocess.run(
            [sys.executable, str(script), "--archive", str(archive_path), "--output", str(output_path)],
            capture_output=True, text=True, check=False,
        )
        self.assertEqual(extracted.returncode, 0, extracted.stdout + extracted.stderr)
        self.assertEqual(output_path.read_bytes(), payload)


    def test_ds05_extractor_can_read_outer_archive_when_inner_zip_is_absent(self):
        from zipfile import ZipFile

        phase_root = Path(__file__).resolve().parent
        script = phase_root / "scripts" / "extract_ds05_from_nested_zip.py"
        outer_path = Path(self.temp.name) / "ncmapss_full.zip"
        inner_bytes_path = Path(self.temp.name) / "data_set.zip"
        output_path = Path(self.temp.name) / "N-CMAPSS_DS05.h5"
        payload = b"small DS05 extraction test"
        with ZipFile(inner_bytes_path, "w") as inner:
            inner.writestr("data_set/N-CMAPSS_DS05.h5", payload)
        with ZipFile(inner_bytes_path, "r") as inner:
            inner_payload = inner_bytes_path.read_bytes()
        with ZipFile(outer_path, "w") as outer:
            outer.writestr("17. Turbofan/data_set.zip", inner_payload)

        extracted = subprocess.run(
            [
                sys.executable, str(script),
                "--archive", str(Path(self.temp.name) / "missing_data_set.zip"),
                "--outer-archive", str(outer_path),
                "--output", str(output_path),
            ], capture_output=True, text=True, check=False,
        )
        self.assertEqual(extracted.returncode, 0, extracted.stdout + extracted.stderr)
        self.assertEqual(output_path.read_bytes(), payload)

    def test_inspector_fails_if_hidden_health_array_contains_nonfinite_values(self):
        phase_root = Path(__file__).resolve().parent
        inspect_script = phase_root / "scripts" / "inspect_ncmapss.py"
        with h5py.File(self.h5_path, "r+") as h5:
            h5["T_dev"][0, 0] = np.nan
        report_path = Path(self.temp.name) / "nonfinite_report.json"
        inspected = subprocess.run(
            [sys.executable, str(inspect_script), "--file", str(self.h5_path), "--output", str(report_path)],
            capture_output=True, text=True, check=False,
        )
        self.assertEqual(inspected.returncode, 2, inspected.stdout + inspected.stderr)
        report = json.loads(report_path.read_text(encoding="utf-8"))
        self.assertEqual(report["validation_status"], "failed")
        self.assertTrue(any("T_dev contains" in warning for warning in report["warnings"]))

    def test_full_inspection_and_preprocess_cli_pipeline(self):
        phase_root = Path(__file__).resolve().parent
        report_path = Path(self.temp.name) / "inspection.json"
        processed_dir = Path(self.temp.name) / "processed"
        inspect_script = phase_root / "scripts" / "inspect_ncmapss.py"
        preprocess_script = phase_root / "scripts" / "preprocess_to_flights.py"

        inspected = subprocess.run(
            [sys.executable, str(inspect_script), "--file", str(self.h5_path), "--output", str(report_path)],
            capture_output=True, text=True, check=False,
        )
        self.assertEqual(inspected.returncode, 0, inspected.stdout + inspected.stderr)
        report = json.loads(report_path.read_text(encoding="utf-8"))
        self.assertEqual(report["validation_status"], "passed")
        self.assertEqual(report["splits"]["dev"]["engine_units"], [101, 102, 103, 104, 105, 106])
        self.assertEqual(report["splits"]["test"]["engine_units"], [201, 202, 203])
        self.assertTrue(report["sha256"])

        processed = subprocess.run(
            [sys.executable, str(preprocess_script), "--file", str(self.h5_path), "--output-dir", str(processed_dir), "--chunk-rows", "10000"],
            capture_output=True, text=True, check=False,
        )
        self.assertEqual(processed.returncode, 0, processed.stdout + processed.stderr)
        summary = json.loads((processed_dir / "ncmapss_ds05_preprocessing_summary.json").read_text(encoding="utf-8"))
        self.assertEqual(summary["validation_status"], "passed")
        self.assertEqual(summary["splits"]["dev"]["rows"], 12)
        self.assertEqual(summary["splits"]["test"]["rows"], 6)
        self.assertTrue((processed_dir / "ncmapss_ds05_dev_flights.csv").is_file())
        self.assertTrue((processed_dir / "ncmapss_ds05_test_flights.csv").is_file())


if __name__ == "__main__":
    unittest.main(verbosity=2)
