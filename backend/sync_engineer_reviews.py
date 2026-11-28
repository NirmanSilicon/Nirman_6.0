"""
sync_engineer_reviews.py

Populates high-fidelity expert spacecraft engineering reviews into the
`engineer_feedback` database table and validates the active learning
retraining pipeline end-to-end.
"""

import os
import sys
from datetime import datetime, timezone

# Setup Django environment
sys.path.insert(0, os.path.abspath("backend"))
sys.path.insert(0, os.path.abspath("."))
os.environ.setdefault("DJANGO_SETTINGS_MODULE", "config.settings")

import django
django.setup()

from app.core import db_adapter
from ai_model.active_learning import collect_feedback_dataset, incremental_retrain

def sync_reviews():
    print("=== SYNCING REALISTIC SPACECRAFT ENGINEER REVIEWS TO DATABASE ===")

    sample_reviews = [
        {
            "feedback_id": "fb_thm_001",
            "incident_id": "inc_thm_904",
            "event_id": "evt-thm-rtd3",
            "component": "thermal_sensor",
            "engineer_verdict": "confirmed",
            "feature_vector": {
                "feat_mean": 2.8, "feat_std": 1.2, "feat_min": -240.2,
                "feat_max": 25.0, "feat_range": 265.2, "feat_rate_of_change": 3.4,
                "feat_skewness": -0.85
            },
            "model_prediction": "anomaly",
            "model_confidence": 0.98,
            "engineer_notes": "Thermal Subsystem Lead: Verified open-circuit RTD reading (0x0012). Causal link to survival heater confirmed."
        },
        {
            "feedback_id": "fb_bat_002",
            "incident_id": "inc_bat_802",
            "event_id": "evt-bat-cell2",
            "component": "battery",
            "engineer_verdict": "confirmed",
            "feature_vector": {
                "feat_mean": 3.12, "feat_std": 0.65, "feat_min": 2.78,
                "feat_max": 4.15, "feat_range": 1.37, "feat_rate_of_change": 1.85,
                "feat_skewness": -0.42
            },
            "model_prediction": "anomaly",
            "model_confidence": 0.95,
            "engineer_notes": "Power EPS Engineer: Peukert curve accelerated discharge confirmed. Cell #2 internal resistance degraded by 42mOhm."
        },
        {
            "feedback_id": "fb_pwr_003",
            "incident_id": "inc_pwr_701",
            "event_id": "evt-pwr-rail12",
            "component": "power_bus",
            "engineer_verdict": "overridden",
            "corrected_cause": "heater_controller",
            "feature_vector": {
                "feat_mean": 4.75, "feat_std": 0.35, "feat_min": 4.2,
                "feat_max": 5.0, "feat_range": 0.8, "feat_rate_of_change": 0.25,
                "feat_skewness": 0.12
            },
            "model_prediction": "anomaly",
            "model_confidence": 0.81,
            "engineer_notes": "Chief Systems Investigator: Overrode Power Bus finding. Root trigger was heater latchup continuous draw, not buck converter fault."
        },
        {
            "feedback_id": "fb_adcs_004",
            "incident_id": "inc_adcs_812",
            "event_id": "evt-rw-zaxis",
            "component": "obc",
            "engineer_verdict": "confirmed",
            "feature_vector": {
                "feat_mean": 5.2, "feat_std": 2.1, "feat_min": 0.0,
                "feat_max": 6200.0, "feat_range": 6200.0, "feat_rate_of_change": 4.5,
                "feat_skewness": 1.15
            },
            "model_prediction": "anomaly",
            "model_confidence": 0.97,
            "engineer_notes": "GNC Lead: FreeRTOS scheduler SEU bitflip at 0x20004180 left DAC torque register continuously energized."
        },
        {
            "feedback_id": "fb_com_005",
            "incident_id": "inc_com_102",
            "event_id": "evt-com-txlost",
            "component": "comms",
            "engineer_verdict": "overridden",
            "corrected_cause": "obc",
            "feature_vector": {
                "feat_mean": 1.1, "feat_std": 0.8, "feat_min": 0.0,
                "feat_max": 2000.0, "feat_range": 2000.0, "feat_rate_of_change": 2.2,
                "feat_skewness": -0.7
            },
            "model_prediction": "anomaly",
            "model_confidence": 0.88,
            "engineer_notes": "Ground Operations: S-band carrier drop was consequence of rapid satellite tumble causing Doppler tracking loss, not RF hardware failure."
        },
        {
            "feedback_id": "fb_thm_006",
            "incident_id": "inc_thm_905",
            "event_id": "evt-thm-louv",
            "component": "heater_controller",
            "engineer_verdict": "confirmed",
            "feature_vector": {
                "feat_mean": 3.4, "feat_std": 1.5, "feat_min": 0.0,
                "feat_max": 28.4, "feat_range": 28.4, "feat_rate_of_change": 3.1,
                "feat_skewness": 0.95
            },
            "model_prediction": "anomaly",
            "model_confidence": 0.96,
            "engineer_notes": "Thermal Systems: PWM duty cycle pegged at 100% (28.4W) for 78 seconds without deadband fallback."
        }
    ]

    for r in sample_reviews:
        db_adapter.save_engineer_feedback(
            feedback_id=r["feedback_id"],
            incident_id=r["incident_id"],
            event_id=r["event_id"],
            component=r["component"],
            engineer_verdict=r["engineer_verdict"],
            corrected_cause=r.get("corrected_cause"),
            feature_vector=r["feature_vector"],
            model_prediction=r["model_prediction"],
            model_confidence=r["model_confidence"],
            engineer_notes=r["engineer_notes"]
        )
        print(f"  Synced: {r['feedback_id']} | verdict={r['engineer_verdict']} | component={r['component']}")

    stats = db_adapter.get_feedback_stats()
    print("\n=== AGGREGATE DATABASE FLYWHEEL STATS ===")
    for k, v in stats.items():
        print(f"  {k}: {v}")

    # Retrain on pending records
    pending = db_adapter.load_feedback_for_retraining(min_records=1, only_pending=True)
    print(f"\nPending records for active learning: {len(pending)}")

    if pending:
        print("\n=== EXECUTING ACTIVE LEARNING INCREMENTAL RETRAINING ===")
        result = incremental_retrain(pending)
        print("  Status:", result.get("status"))
        print("  Model version:", result.get("model_version"))
        print("  Drift Delta:", result.get("drift_delta"))
        print("  Message:", result.get("message"))

        # Mark incorporated
        db_adapter.mark_feedback_incorporated([r["feedback_id"] for r in pending])

    final_stats = db_adapter.get_feedback_stats()
    print("\n=== FINAL FLYWHEEL METRICS AFTER ACTIVE LEARNING UPDATE ===")
    for k, v in final_stats.items():
        print(f"  {k}: {v}")

if __name__ == "__main__":
    sync_reviews()
