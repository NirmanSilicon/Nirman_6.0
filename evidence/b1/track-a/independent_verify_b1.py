"""Standalone Independent Metric & Discrepancy Verification Script (Track A).

Uses Python standard library ONLY. Does NOT import `docuready` or `eval`.
Reads raw packet-level records from:
  - evidence/b1/track-a/run1_data/test/manifest.json
  - evidence/b1/track-a/packet_audit_48.csv
  - DocuReady-live/eval/reports/t4_1_packet_audit.json
  - evidence/b1/track-a/run1_report.json
  - evidence/b1/track-a/run2_report.json
"""

from __future__ import annotations

import csv
import hashlib
import json
import math
from pathlib import Path
from typing import Any, Dict, List


TRACK_A = Path(__file__).resolve().parent
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

HIST_AUDIT_PATH = resolve_docuready_source() / "eval" / "reports" / "t4_1_packet_audit.json"


def wilson_95(k: int, n: int, z: float = 1.959963984540054) -> List[float]:
    if n <= 0:
        raise ValueError(f"n must be > 0, got {n}")
    p = k / n
    z2 = z * z
    denom = 1.0 + z2 / n
    center = (p + z2 / (2.0 * n)) / denom
    half = (z * math.sqrt((p * (1.0 - p) / n) + (z2 / (4.0 * n * n)))) / denom
    return [round(max(0.0, center - half), 4), round(min(1.0, center + half), 4)]


def compute_ece_10bin_detailed(probs: List[float], labels: List[int]) -> Dict[str, Any]:
    n = len(probs)
    bins = []
    ece_unrounded = 0.0
    for b in range(10):
        lo = round(b * 0.1, 1)
        hi = round((b + 1) * 0.1, 1)
        idxs = [i for i, p in enumerate(probs) if (lo <= p < hi) or (b == 9 and p == 1.0)]
        cnt = len(idxs)
        if cnt > 0:
            avg_c = sum(probs[i] for i in idxs) / cnt
            emp_acc = sum(labels[i] for i in idxs) / cnt
            contrib = (cnt / n) * abs(emp_acc - avg_c)
            ece_unrounded += contrib
        else:
            avg_c = 0.0
            emp_acc = 0.0
            contrib = 0.0
        bins.append(
            {
                "bin_idx": b,
                "range": f"[{lo}, {hi}{']' if b == 9 else ')'}",
                "count": cnt,
                "avg_confidence": round(avg_c, 4),
                "empirical_accuracy": round(emp_acc, 4),
                "weighted_abs_error": round(contrib, 6),
            }
        )
    return {
        "n_samples": n,
        "empty_bin_treatment": "count=0, avg_confidence=0.0, empirical_accuracy=0.0, contribution=0.0",
        "ece_10bin": round(ece_unrounded, 4),
        "ece_10bin_unrounded": round(ece_unrounded, 8),
        "bins": bins,
    }


def main() -> None:
    manifest = json.loads((TRACK_A / "run1_data" / "test" / "manifest.json").read_text(encoding="utf-8"))
    hist_audit = json.loads(HIST_AUDIT_PATH.read_text(encoding="utf-8"))
    r1_report = json.loads((TRACK_A / "run1_report.json").read_text(encoding="utf-8"))
    r2_report = json.loads((TRACK_A / "run2_report.json").read_text(encoding="utf-8"))

    with (TRACK_A / "packet_audit_48.csv").open("r", encoding="utf-8") as f:
        csv_rows = list(csv.DictReader(f))

    hist_by_id = {p["packet_id"]: p for p in hist_audit["packets"]}
    manifest_by_id = {s["packet_id"]: s for s in manifest["samples"]}
    assert len(csv_rows) == 48 and len(hist_by_id) == 48 and len(manifest_by_id) == 48

    # 1. Confusion matrix & rates from raw packet records
    cm = {"clean": {"PASS": 0, "FAIL": 0, "REVIEW": 0}, "defective": {"PASS": 0, "FAIL": 0, "REVIEW": 0}}
    probs: List[float] = []
    y_fields: List[int] = []
    discrepancy_rows: List[Dict[str, Any]] = []

    for row in csv_rows:
        pid = row["packet_id"]
        m_rec = manifest_by_id[pid]
        h_rec = hist_by_id[pid]

        is_def = m_rec["is_defective"]
        gt_label = "defective" if is_def else "clean"
        expected_rd = m_rec["expected_readiness"]
        pred_rd = h_rec["readiness"]
        outcome = h_rec["outcome"]  # PASS / FAIL / REVIEW
        p_cal = float(h_rec["calibrated_prob"])
        tok_conf = float(m_rec["ocr_sim_params"]["token_confidence"])
        y_field = 1 if tok_conf >= 0.60 else 0

        cm[gt_label][outcome] += 1
        probs.append(p_cal)
        y_fields.append(y_field)

        matches_target = expected_rd == pred_rd
        if matches_target:
            disc_class = "MATCH"
        elif (not is_def) and m_rec["perturbation"] in ("bilingual_indic", "rotation", "overlapping_stamp"):
            disc_class = "GENERATOR_OMITTED_ABSTENTION_CLEAN_PERTURBED"
        elif is_def and m_rec["perturbation"] != "unperturbed":
            disc_class = "GENERATOR_OMITTED_ABSTENTION_DEFECTIVE_PERTURBED"
        else:
            disc_class = "OTHER_MISMATCH"

        evidence = (
            f"pert={m_rec['perturbation']}; neg={m_rec['negative_control']}; "
            f"dob={m_rec['ground_truth_fields']['dob']}; tok_conf={tok_conf}; "
            f"p_cal={p_cal}; state={h_rec['evidence_state']}"
        )
        discrepancy_rows.append(
            {
                "packet_id": pid,
                "ground_truth_defect_label": gt_label,
                "expected_readiness": expected_rd,
                "predicted_readiness": pred_rd,
                "actual_outcome": outcome,
                "matches_target": matches_target,
                "supporting_evidence": evidence,
                "discrepancy_classification": disc_class,
            }
        )

    with (TRACK_A / "expected_readiness_discrepancy_48.csv").open("w", newline="", encoding="utf-8") as f:
        writer = csv.DictWriter(f, fieldnames=list(discrepancy_rows[0].keys()))
        writer.writeheader()
        writer.writerows(discrepancy_rows)

    tp = cm["defective"]["FAIL"]
    fn_fp = cm["defective"]["PASS"]
    ab_def = cm["defective"]["REVIEW"]
    tn = cm["clean"]["PASS"]
    fp_ff = cm["clean"]["FAIL"]
    ab_cln = cm["clean"]["REVIEW"]

    n_total = 48
    n_def = tp + fn_fp + ab_def
    n_clean = tn + fp_ff + ab_cln
    n_decided = tp + fn_fp + tn + fp_ff
    n_abstained = ab_def + ab_cln
    n_def_decided = tp + fn_fp
    n_clean_decided = tn + fp_ff
    n_pred_pos = tp + fp_ff

    precision = tp / n_pred_pos
    recall_all = tp / n_def
    recall_decided = tp / n_def_decided
    f1_all = 2 * precision * recall_all / (precision + recall_all)
    f1_decided = 2 * precision * recall_decided / (precision + recall_decided)

    ece_detail = compute_ece_10bin_detailed(probs, y_fields)

    # 2. Separate content-based SHA-256 inventory using stable relative paths + PDF bytes
    test_dir = TRACK_A / "run1_data" / "test"
    content_files = []
    agg = hashlib.sha256()
    for pdf in sorted(test_dir.glob("*.pdf")):
        rel = f"test/{pdf.name}"
        raw_bytes = pdf.read_bytes()
        h = hashlib.sha256(raw_bytes).hexdigest()
        content_files.append({"relative_path": rel, "size_bytes": len(raw_bytes), "sha256": h})
        agg.update(f"{rel}:{h}\n".encode("utf-8"))

    content_inv = {
        "algorithm": "SHA-256 over sorted (relative_path + ':' + file_sha256 + '\\n')",
        "n_pdfs": len(content_files),
        "content_bundle_sha256": agg.hexdigest(),
        "files": content_files,
    }
    (TRACK_A / "content_based_sha256_inventory.json").write_text(
        json.dumps(content_inv, indent=2), encoding="utf-8"
    )

    disc_counts: Dict[str, int] = {}
    for r in discrepancy_rows:
        disc_counts[r["discrepancy_classification"]] = disc_counts.get(r["discrepancy_classification"], 0) + 1

    audit_out = {
        "inputs": {
            "manifest": str(TRACK_A / "run1_data" / "test" / "manifest.json"),
            "packet_audit_48": str(TRACK_A / "packet_audit_48.csv"),
            "historical_audit": str(HIST_AUDIT_PATH),
            "run1_report": str(TRACK_A / "run1_report.json"),
            "run2_report": str(TRACK_A / "run2_report.json"),
        },
        "confusion_matrix_3way": cm,
        "metrics": {
            "false_pass_rate_all_defective": {"k": fn_fp, "n": n_def, "value": round(fn_fp / n_def, 4), "wilson_95": wilson_95(fn_fp, n_def)},
            "false_pass_rate_decided_defective": {"k": fn_fp, "n": n_def_decided, "value": round(fn_fp / n_def_decided, 4), "wilson_95": wilson_95(fn_fp, n_def_decided)},
            "false_fail_rate_all_clean": {"k": fp_ff, "n": n_clean, "value": round(fp_ff / n_clean, 4), "wilson_95": wilson_95(fp_ff, n_clean)},
            "false_fail_rate_decided_clean": {"k": fp_ff, "n": n_clean_decided, "value": round(fp_ff / n_clean_decided, 4), "wilson_95": wilson_95(fp_ff, n_clean_decided)},
            "decision_coverage": {"k": n_decided, "n": n_total, "value": round(n_decided / n_total, 4)},
            "abstention_rate": {"k": n_abstained, "n": n_total, "value": round(n_abstained / n_total, 4)},
            "precision_decided_positive": {"k": tp, "n": n_pred_pos, "value": round(precision, 4), "wilson_95": wilson_95(tp, n_pred_pos)},
            "recall_all_defective": {"k": tp, "n": n_def, "value": round(recall_all, 4), "wilson_95": wilson_95(tp, n_def)},
            "recall_decided_defective": {"k": tp, "n": n_def_decided, "value": round(recall_decided, 4), "wilson_95": wilson_95(tp, n_def_decided)},
            "f1_all_defective": round(f1_all, 4),
            "f1_decided_only": round(f1_decided, 4),
            "per_field_accuracy": {"k": sum(y_fields), "n": n_total, "value": round(sum(y_fields) / n_total, 4)},
        },
        "ece_10bin_detail": ece_detail,
        "expected_readiness_discrepancy_summary": disc_counts,
        "comparison_with_historical_and_reproduced": {
            "hist_false_pass_match": hist_audit["metrics"]["headline_metrics"]["false_pass_rate"] == round(fn_fp / n_def, 4),
            "hist_false_fail_match": hist_audit["metrics"]["headline_metrics"]["false_fail_rate"] == round(fp_ff / n_clean, 4),
            "hist_coverage_match": hist_audit["metrics"]["headline_metrics"]["coverage"] == round(n_decided / n_total, 4),
            "hist_abstention_match": hist_audit["metrics"]["headline_metrics"]["abstention_rate"] == round(n_abstained / n_total, 4),
            "hist_per_field_acc_match": hist_audit["metrics"]["headline_metrics"]["per_field_extraction_accuracy"]["overall"] == round(sum(y_fields) / n_total, 4),
            "hist_ece_match": hist_audit["metrics"]["headline_metrics"]["ece_10bin"] == ece_detail["ece_10bin"],
            "run1_equals_run2_metrics": r1_report["metrics"] == r2_report["metrics"],
            "run1_equals_hist_metrics": r1_report["metrics"] == hist_audit["metrics"],
        },
        "content_bundle_sha256": content_inv["content_bundle_sha256"],
    }
    (TRACK_A / "independent_metrics_audit.json").write_text(
        json.dumps(audit_out, indent=2), encoding="utf-8"
    )
    print(json.dumps({k: v for k, v in audit_out.items() if k != "inputs"}, indent=2))


if __name__ == "__main__":
    main()
