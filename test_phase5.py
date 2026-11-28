
import pandas as pd

from modules.waste_engine import run_waste_engine


print("\n===================================")
print("       WATTWISE PHASE 5 TEST")
print("===================================\n")


# Run complete Phase 4 + Phase 5
result = run_waste_engine(save_to_database=True)


# 1. Check analyzed records
print("\n1. ENERGY ANALYSIS")

print("Total analyzed records:",
      len(result["analyzed_df"]))


# 2. Check waste events
print("\n2. DETECTED WASTE EVENTS")

events = result["events_df"]

print("Total detected events:", len(events))

if not events.empty:

    print(events[
        [
            "machine_id",
            "product_type",
            "waste_type",
            "severity",
            "waste_kwh",
            "waste_cost"
        ]
    ].to_string(index=False))

else:

    print("No waste events detected.")


# 3. Recommendations
print("\n3. AI RECOMMENDATIONS")

if not events.empty:

    print(events[
        [
            "machine_id",
            "waste_type",
            "recommendation"
        ]
    ].to_string(index=False))


# 4. Financial summary
print("\n4. POTENTIAL SAVINGS")

print(result["savings"])


# 5. Machine summary
print("\n5. MACHINE-WISE WASTE")

print(result["machine_summary"])


# 6. Category summary
print("\n6. WASTE CATEGORY SUMMARY")

print(result["category_summary"])


# 7. Database persistence
print("\n7. DATABASE VERIFICATION")

print("New events saved:",
      result["saved_count"])

from modules.detection import get_waste_events

saved_events = get_waste_events()

print("Total events in database:",
      len(saved_events))


print("\n===================================")
print("      PHASE 5 TEST COMPLETED")
print("===================================\n")
