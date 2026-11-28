"""
GoldenHour — Pilot Metrics & Operational KPI Analyzer
Analyzes emergency response KPIs:
1. Time to First Claim (Target < 90 seconds)
2. Response Rate (% of alerts acknowledged < 90s)
3. Closure Handover Rate
"""

import sys

def compute_pilot_kpis(records):
    print("=" * 60)
    print("GoldenHour Emergency Operations — Shift KPI Analysis")
    print("=" * 60)

    total_alerts = len(records)
    if total_alerts == 0:
        print("No pilot records found.")
        return

    claimed_under_90s = sum(1 for r in records if r.get("time_to_first_claim_sec", 0) <= 90)
    avg_claim_time = sum(r.get("time_to_first_claim_sec", 0) for r in records) / total_alerts
    arrived_count = sum(1 for r in records if r.get("arrived", False))
    closed_count = sum(1 for r in records if r.get("closed", False))

    response_rate = (claimed_under_90s / total_alerts) * 100

    print(f"Total Dispatched Pre-Arrival Notices: {total_alerts}")
    print(f"Average Time to First Protocol Claim: {avg_claim_time:.1f} seconds")
    print(f"SLA Compliance (< 90s Response Rate):  {response_rate:.1f}% (PRD Target >= 75%)")
    print(f"Arrival Handover Rate:                {(arrived_count / total_alerts) * 100:.1f}%")
    print(f"Closed / Admitted Rate:               {(closed_count / total_alerts) * 100:.1f}%")

    if response_rate >= 75:
        print("\nOperational Benchmark: TARGET MET (High Emergency Readiness)")
    else:
        print("\nOperational Benchmark: ATTENTION (Response time exceeded 90s)")

if __name__ == "__main__":
    demo_pilot_data = [
        {"id": "GH-2026-001", "time_to_first_claim_sec": 34, "arrived": True, "closed": True},
        {"id": "GH-2026-002", "time_to_first_claim_sec": 48, "arrived": True, "closed": True},
        {"id": "GH-2026-003", "time_to_first_claim_sec": 22, "arrived": True, "closed": True},
        {"id": "GH-2026-004", "time_to_first_claim_sec": 71, "arrived": True, "closed": True},
    ]
    compute_pilot_kpis(demo_pilot_data)
