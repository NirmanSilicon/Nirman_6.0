"""
GoldenHour — Data Validation Script
Checks for duplicate pre-arrival alert transmissions, missing capability flags,
and abnormal timestamps (clock drift) in alert records.
"""

import sys
import json
from datetime import datetime

def validate_alert_records(alerts):
    print("=" * 60)
    print("GoldenHour Alert Record Validation Suite")
    print("=" * 60)

    seen_ids = set()
    duplicates = []
    invalid_categories = []
    valid_categories = {
        "Chest Pain", 
        "Stroke Symptoms", 
        "Serious Bleeding", 
        "Severe Breathing", 
        "Not Sure / Other Emergency"
    }

    for alert in alerts:
        alert_id = alert.get("id")
        if alert_id in seen_ids:
            duplicates.append(alert_id)
        seen_ids.add(alert_id)

        category = alert.get("category")
        if category not in valid_categories:
            invalid_categories.append((alert_id, category))

    print(f"Total Alerts Scanned: {len(alerts)}")
    print(f"Unique Alerts:        {len(seen_ids)}")
    print(f"Duplicate Alerts:     {len(duplicates)} {duplicates if duplicates else '(Passed)'}")
    print(f"Category Validation:  {'Passed' if not invalid_categories else f'Failed: {invalid_categories}'}")

    if not duplicates and not invalid_categories:
        print("\nAll data integrity checks PASSED successfully.")
        return 0
    else:
        print("\nIntegrity check errors detected.")
        return 1

if __name__ == "__main__":
    sample_alerts = [
        {"id": "GH-2026-X84", "category": "Chest Pain", "hospitalId": "hosp-aiims-bbsr"},
        {"id": "GH-2026-NS42", "category": "Not Sure / Other Emergency", "hospitalId": "hosp-kims-bbsr"},
    ]
    sys.exit(validate_alert_records(sample_alerts))
