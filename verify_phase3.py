"""Verify Phase 3 artifacts and the Phase 3 endpoints in the consolidated API."""
from __future__ import annotations
from pathlib import Path
import json
import sys

ROOT = Path(__file__).resolve().parent
sys.path.insert(0, str(ROOT / "backend"))
from fastapi.testclient import TestClient  # noqa: E402
from app.main import app  # noqa: E402

OUT = ROOT / "outputs"
required = [
    OUT / "aerosentry_phase3_model.joblib",
    OUT / "phase3_metrics.json",
    OUT / "PHASE3_FINAL_REPORT.txt",
    OUT / "phase3_test_anomaly_results.csv",
    OUT / "phase3_event_results.csv",
    OUT / "phase3_model_comparison.csv",
]
missing = [str(p.relative_to(ROOT)) for p in required if not p.exists()]
assert not missing, f"Missing Phase 3 artifacts: {missing}"
metrics = json.loads((OUT / "phase3_metrics.json").read_text(encoding="utf-8"))
assert metrics["split_by_engine"] == {"train": 70, "calibration": 15, "final_test": 15}
assert metrics["feature_count"] == 17
assert metrics["synthetic_test"]["event_level_recall"] >= 0.80
assert metrics["synthetic_test"]["sample_level"]["false_positive_rate"] <= 0.05

client = TestClient(app)
health = client.get("/api/v1/health")
assert health.status_code == 200, health.text
model_status = client.get("/api/v1/anomaly/fd001/status")
assert model_status.status_code == 200 and model_status.json()["model_available"] is True, model_status.text
engines = client.get("/api/v1/anomaly/fd001/engines")
assert engines.status_code == 200 and len(engines.json()["engines"]) == 100, engines.text
engine = engines.json()["engines"][0]
cycle = min(26, engine["max_cycle"])
score = client.get("/api/v1/anomaly/fd001/analyze", params={"engine_id": engine["engine_id"], "end_cycle": cycle})
assert score.status_code == 200, score.text
assert str(score.json()["engine_id"]) == str(engine["engine_id"])
assert score.json()["mode"] == "historical_replay"
print("PHASE 3 VERIFICATION: PASS")
print(f"Features: {metrics['feature_count']}")
print(f"Final test engines: {metrics['split_by_engine']['final_test']}")
print(f"Synthetic event recall: {metrics['synthetic_test']['event_level_recall']:.1%}")
print(f"Synthetic sample false-positive rate: {metrics['synthetic_test']['sample_level']['false_positive_rate']:.1%}")
print("Consolidated API model status, engine list and historical replay: PASS")
