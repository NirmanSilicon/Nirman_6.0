"""Independent Track A Reproduction & Audit Script for DocuReady B1.

Runs strictly against the read-only candidate snapshot at DocuReady-live
without modifying any source files, labels, thresholds, or scoring rules.
Writes all outputs under Nirman_6.0-wt-akriti/evidence/b1/track-a/.
"""

from __future__ import annotations

import csv
import hashlib
import json
import math
import time
from datetime import date
from pathlib import Path
from typing import Any, Dict, List

import docuready
import eval.harness as harness
from docuready.domain.enums import EvidenceState, ExtractionMethod, Readiness
from docuready.evidence.states import discretize_probability
from docuready.rules.engine import PackExecutionEngine
from eval.generators.generator_v2 import GeneratedSampleRecord, SyntheticGeneratorV2


import os
import subprocess

EXPECTED_CANDIDATE_SHA = "0e14a6ed4452c1e562da2df11df7e4f528045074"


def resolve_docuready_source() -> Path:
    src_env = os.environ.get("DOCUREADY_SOURCE")
    if not src_env:
        raise RuntimeError(
            "DOCUREADY_SOURCE environment variable must point to a read-only DocuReady checkout at "
            f"{EXPECTED_CANDIDATE_SHA}."
        )
    src = Path(src_env).resolve()
    if not src.exists():
        raise RuntimeError(f"DOCUREADY_SOURCE path does not exist: {src}")
    head = subprocess.check_output(["git", "-C", str(src), "rev-parse", "HEAD"], text=True).strip()
    if head != EXPECTED_CANDIDATE_SHA:
        raise RuntimeError(
            f"DOCUREADY_SOURCE HEAD {head} does not match expected candidate SHA {EXPECTED_CANDIDATE_SHA}."
        )
    return src

SOURCE_ROOT = resolve_docuready_source()
OUT_ROOT = Path(__file__).resolve().parent


def sha256_file(path: Path) -> str:
    return hashlib.sha256(path.read_bytes()).hexdigest()


def independent_wilson_ci(k: int, n: int, z: float = 1.959963984540054) -> List[float]:
    p = k / n
    z2 = z * z
    denom = 1.0 + z2 / n
    center = (p + z2 / (2.0 * n)) / denom
    half = (z * math.sqrt((p * (1.0 - p) / n) + (z2 / (4.0 * n * n)))) / denom
    return [round(max(0.0, center - half), 4), round(min(1.0, center + half), 4)]


def independent_ece_10bin(probs: List[float], labels: List[int]) -> float:
    n = len(probs)
    ece = 0.0
    for b in range(10):
        lo = b * 0.1
        hi = (b + 1) * 0.1
        idxs = [i for i, p in enumerate(probs) if (lo <= p < hi) or (b == 9 and p == 1.0)]
        if idxs:
            avg_c = sum(probs[i] for i in idxs) / len(idxs)
            emp_acc = sum(labels[i] for i in idxs) / len(idxs)
            ece += (len(idxs) / n) * abs(emp_acc - avg_c)
    return round(ece, 4)


def run_once(run_name: str) -> Dict[str, Any]:
    data_dir = OUT_ROOT / f"{run_name}_data"
    t0 = time.perf_counter()
    report = harness.run_evaluation_pipeline(
        data_dir,
        pack_dir=SOURCE_ROOT / "packs" / "odisha.subhadra",
        baseline_path=SOURCE_ROOT / "eval" / "baseline.json",
        n_dev=24,
        n_calib=32,
        n_test=48,
        render_pdfs=True,
    )
    elapsed = round(time.perf_counter() - t0, 4)
    (OUT_ROOT / f"{run_name}_report.json").write_text(
        json.dumps(report, indent=2, sort_keys=True), encoding="utf-8"
    )
    manifests = {}
    for split in ("dev", "calib", "test"):
        m_path = data_dir / split / "manifest.json"
        m = json.loads(m_path.read_text(encoding="utf-8"))
        manifests[split] = {
            "manifest_file_sha256": sha256_file(m_path),
            "dataset_sha256": m["dataset_sha256"],
            "n_samples": m["n_samples"],
            "layouts_used": m["layouts_used"],
        }
    return {
        "run_name": run_name,
        "elapsed_sec": elapsed,
        "report": report,
        "manifests": manifests,
        "report_sha256": sha256_file(OUT_ROOT / f"{run_name}_report.json"),
    }


def audit_packets(data_dir: Path) -> Dict[str, Any]:
    dev_m = json.loads((data_dir / "dev" / "manifest.json").read_text(encoding="utf-8"))
    cal_m = json.loads((data_dir / "calib" / "manifest.json").read_text(encoding="utf-8"))
    test_m = json.loads((data_dir / "test" / "manifest.json").read_text(encoding="utf-8"))
    hist_audit = json.loads(
        (SOURCE_ROOT / "eval" / "reports" / "t4_1_packet_audit.json").read_text(encoding="utf-8")
    )
    hist_by_id = {p["packet_id"]: p for p in hist_audit["packets"]}

    calibrator = harness.fit_calibrator_on_calib(cal_m)
    engine = PackExecutionEngine(SOURCE_ROOT / "packs" / "odisha.subhadra")
    gen = SyntheticGeneratorV2(seed=int(test_m["seed"]))

    rows: List[Dict[str, Any]] = []
    probs: List[float] = []
    y_fields: List[int] = []
    discrepancies: List[Dict[str, Any]] = []

    for idx, s in enumerate(test_m["samples"]):
        rec = GeneratedSampleRecord(**s)
        packet = gen.build_extracted_packet(rec)
        fv, y_field = harness._sample_to_feature_vector(s)
        p_cal = calibrator.predict_proba(fv)
        probs.append(p_cal)
        y_fields.append(y_field)

        cal_state = discretize_probability(p_cal)
        packet_state = EvidenceState.VERIFIED.value
        for doc in packet.values():
            for fld in doc.fields.values():
                if fld.extraction_method == ExtractionMethod.LOCAL_OCR.value:
                    fld.calibrated_confidence = p_cal
                    fld.evidence_state = cal_state
                    fld.is_uncertain = cal_state == EvidenceState.UNCERTAIN
                    packet_state = cal_state.value

        res = engine.validate_packet(rec.packet_id, packet, as_of=date(2024, 7, 1))
        pred_rd = res.readiness.value

        pdf_a = Path(rec.document_paths["aadhaar_card"])
        pdf_b = Path(rec.document_paths["bank_passbook"])
        sha_a_actual = sha256_file(pdf_a) if pdf_a.exists() else None
        sha_b_actual = sha256_file(pdf_b) if pdf_b.exists() else None
        pdfs_ok = (
            pdf_a.exists()
            and pdf_b.exists()
            and pdf_a.stat().st_size > 0
            and pdf_b.stat().st_size > 0
            and sha_a_actual == rec.document_sha256s["aadhaar_card"]
            and sha_b_actual == rec.document_sha256s["bank_passbook"]
        )

        # Trace rule-based defect definition independently
        underage_rule = (idx % 3 == 1) and (rec.ground_truth_fields["dob"] == "10/08/2006")
        neg_rule = rec.negative_control != "none"
        expected_defective = underage_rule or neg_rule
        if expected_defective != rec.is_defective:
            discrepancies.append(
                {
                    "packet_id": rec.packet_id,
                    "type": "defect_label_mismatch",
                    "expected": expected_defective,
                    "actual": rec.is_defective,
                }
            )

        # Compare against historical packet audit record
        hp = hist_by_id.get(rec.packet_id)
        gt_str = "defective" if rec.is_defective else "clean"
        hist_match = (
            hp is not None
            and hp["layout_id"] == rec.layout_id
            and hp["perturbation"] == rec.perturbation
            and hp["negative_control"] == rec.negative_control
            and hp["ground_truth"] == gt_str
            and hp["readiness"] == pred_rd
            and hp["evidence_state"] == packet_state
            and abs(float(hp["calibrated_prob"]) - round(p_cal, 4)) < 1e-6
            and hp["document_sha256s"] == rec.document_sha256s
        )
        if not hist_match:
            discrepancies.append(
                {
                    "packet_id": rec.packet_id,
                    "type": "historical_packet_mismatch",
                    "historical": hp,
                    "reproduced": {
                        "ground_truth": gt_str,
                        "readiness": pred_rd,
                        "evidence_state": packet_state,
                        "calibrated_prob": round(p_cal, 4),
                        "document_sha256s": rec.document_sha256s,
                    },
                }
            )

        if rec.expected_readiness != pred_rd:
            discrepancies.append(
                {
                    "packet_id": rec.packet_id,
                    "type": "expected_vs_predicted_readiness_diff",
                    "expected_readiness": rec.expected_readiness,
                    "predicted_readiness": pred_rd,
                    "perturbation": rec.perturbation,
                    "is_defective": rec.is_defective,
                    "negative_control": rec.negative_control,
                }
            )

        rows.append(
            {
                "idx": idx,
                "packet_id": rec.packet_id,
                "layout_id": rec.layout_id,
                "perturbation": rec.perturbation,
                "negative_control": rec.negative_control,
                "dob": rec.ground_truth_fields["dob"],
                "is_defective": rec.is_defective,
                "expected_readiness": rec.expected_readiness,
                "predicted_readiness": pred_rd,
                "packet_evidence_state": packet_state,
                "calibrated_prob": round(p_cal, 6),
                "y_field": y_field,
                "pdfs_verified": pdfs_ok,
                "hist_match": hist_match,
            }
        )

    # Independent 3-way confusion matrix (Positive = defective, Pred+ = FAIL, Pred- = PASS, Abstain = REVIEW)
    cm = {
        "clean": {"PASS": 0, "FAIL": 0, "REVIEW": 0},
        "defective": {"PASS": 0, "FAIL": 0, "REVIEW": 0},
    }
    for r in rows:
        gt = "defective" if r["is_defective"] else "clean"
        pred = r["predicted_readiness"]
        key = "PASS" if pred == "NO_ISSUES_FOUND" else ("FAIL" if pred == "NOT_READY" else "REVIEW")
        cm[gt][key] += 1

    tp = cm["defective"]["FAIL"]
    fn_fp_pass = cm["defective"]["PASS"]  # defective predicted PASS = false pass (FN)
    abstain_def = cm["defective"]["REVIEW"]
    tn = cm["clean"]["PASS"]
    fp_ff = cm["clean"]["FAIL"]  # clean predicted FAIL = false fail (FP)
    abstain_clean = cm["clean"]["REVIEW"]

    n_total = len(rows)
    n_def = cm["defective"]["PASS"] + cm["defective"]["FAIL"] + cm["defective"]["REVIEW"]
    n_clean = cm["clean"]["PASS"] + cm["clean"]["FAIL"] + cm["clean"]["REVIEW"]
    n_decided = tp + fn_fp_pass + tn + fp_ff
    n_abstained = abstain_def + abstain_clean
    n_def_decided = tp + fn_fp_pass
    n_clean_decided = tn + fp_ff

    precision = tp / (tp + fp_ff) if (tp + fp_ff) > 0 else None
    recall_all = tp / n_def if n_def > 0 else None
    recall_decided = tp / n_def_decided if n_def_decided > 0 else None
    f1_all = (
        (2 * precision * recall_all / (precision + recall_all))
        if (precision is not None and recall_all is not None and (precision + recall_all) > 0)
        else None
    )

    reconstructed = {
        "confusion_matrix_3way": cm,
        "counts": {
            "n_total": n_total,
            "n_defective": n_def,
            "n_clean": n_clean,
            "tp_defective_fail": tp,
            "tn_clean_pass": tn,
            "fp_false_fail_clean_fail": fp_ff,
            "fn_false_pass_defective_pass": fn_fp_pass,
            "abstain_total_review": n_abstained,
            "abstain_defective": abstain_def,
            "abstain_clean": abstain_clean,
            "decided_total": n_decided,
            "decided_defective": n_def_decided,
            "decided_clean": n_clean_decided,
        },
        "rates": {
            "false_pass_rate_all_defective": round(fn_fp_pass / n_def, 4),
            "false_pass_rate_decided_defective": round(fn_fp_pass / n_def_decided, 4),
            "false_fail_rate_all_clean": round(fp_ff / n_clean, 4),
            "false_fail_rate_decided_clean": round(fp_ff / n_clean_decided, 4),
            "decision_coverage": round(n_decided / n_total, 4),
            "abstention_rate": round(n_abstained / n_total, 4),
            "precision_decided": round(precision, 4) if precision is not None else None,
            "recall_all_defective": round(recall_all, 4) if recall_all is not None else None,
            "recall_decided_defective": round(recall_decided, 4) if recall_decided is not None else None,
            "f1_all_defective": round(f1_all, 4) if f1_all is not None else None,
            "per_field_accuracy": round(sum(y_fields) / n_total, 4),
            "ece_10bin": independent_ece_10bin(probs, y_fields),
        },
        "wilson_95_cis": {
            "false_pass_all_defective": {
                "k": fn_fp_pass,
                "n": n_def,
                "ci": independent_wilson_ci(fn_fp_pass, n_def),
            },
            "false_pass_decided_defective": {
                "k": fn_fp_pass,
                "n": n_def_decided,
                "ci": independent_wilson_ci(fn_fp_pass, n_def_decided),
            },
            "false_fail_all_clean": {
                "k": fp_ff,
                "n": n_clean,
                "ci": independent_wilson_ci(fp_ff, n_clean),
            },
            "false_fail_decided_clean": {
                "k": fp_ff,
                "n": n_clean_decided,
                "ci": independent_wilson_ci(fp_ff, n_clean_decided),
            },
        },
        "hist_test_dataset_sha256_match": (
            test_m["dataset_sha256"] == hist_audit["test_dataset_sha256"]
        ),
        "all_pdfs_verified": all(r["pdfs_verified"] for r in rows),
        "all_hist_packets_matched": all(r["hist_match"] for r in rows),
        "unique_packet_ids": len({r["packet_id"] for r in rows}),
        "discrepancies": discrepancies,
    }

    csv_path = OUT_ROOT / "packet_audit_48.csv"
    with csv_path.open("w", newline="", encoding="utf-8") as f:
        writer = csv.DictWriter(f, fieldnames=list(rows[0].keys()))
        writer.writeheader()
        writer.writerows(rows)

    return {"packets": rows, "reconstructed": reconstructed}


def main() -> None:
    OUT_ROOT.mkdir(parents=True, exist_ok=True)
    print("docuready.__file__:", docuready.__file__)
    print("harness.__file__:", harness.__file__)
    assert str(SOURCE_ROOT).lower() in str(Path(docuready.__file__).resolve()).lower()
    assert str(SOURCE_ROOT).lower() in str(Path(harness.__file__).resolve()).lower()

    r1 = run_once("run1")
    r2 = run_once("run2")

    audit = audit_packets(OUT_ROOT / "run1_data")

    # Compare Run 1 vs Run 2
    r1_test_pdfs = sorted((OUT_ROOT / "run1_data" / "test").glob("*.pdf"))
    r2_test_pdfs = sorted((OUT_ROOT / "run2_data" / "test").glob("*.pdf"))
    pdf_hashes_match = [sha256_file(p) for p in r1_test_pdfs] == [
        sha256_file(p) for p in r2_test_pdfs
    ]

    repro = {
        "run1_elapsed_sec": r1["elapsed_sec"],
        "run2_elapsed_sec": r2["elapsed_sec"],
        "run1_report_sha256": r1["report_sha256"],
        "run2_report_sha256": r2["report_sha256"],
        "reports_byte_identical": r1["report_sha256"] == r2["report_sha256"],
        "manifests_match": r1["manifests"] == r2["manifests"],
        "test_pdf_count_run1": len(r1_test_pdfs),
        "test_pdf_count_run2": len(r2_test_pdfs),
        "all_96_test_pdfs_byte_identical": pdf_hashes_match,
        "run1_manifests": r1["manifests"],
        "run2_manifests": r2["manifests"],
    }

    summary = {
        "reproducibility": repro,
        "reconstructed": audit["reconstructed"],
    }
    (OUT_ROOT / "b1_track_a_summary.json").write_text(
        json.dumps(summary, indent=2, sort_keys=True), encoding="utf-8"
    )
    print(json.dumps(summary, indent=2))


if __name__ == "__main__":
    main()
