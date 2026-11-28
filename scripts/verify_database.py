
from pathlib import Path
import sys
import sqlite3
import pandas as pd

BASE_DIR = Path(__file__).resolve().parents[1]

sys.path.insert(0, str(BASE_DIR))

from modules.database import DB_PATH, get_records

print("\n========== WATTWISE DATABASE TEST ==========\n")

# 1. Check database file
print("Database exists:", DB_PATH.exists())

# 2. Read data
df = get_records()

print("Total records:", len(df))

# 3. Machine validation
print("\nMachines:")
print(df["machine_id"].value_counts())

print("\nUnique machines:", df["machine_id"].nunique())

# 4. Product validation
print("\nProducts:")
print(df["product_type"].value_counts())

print("\nUnique products:", df["product_type"].nunique())

# 5. Machine status
print("\nMachine status:")
print(df["machine_status"].value_counts())

# 6. Scenario validation
print("\nSimulated scenarios:")
print(df["scenario_tag"].value_counts())

# 7. Production validation
print("\nProduction summary:")
print("Total units:", df["units_produced"].sum())
print("Good units:", df["good_units"].sum())
print("Rejected units:", df["rejected_units"].sum())

# 8. Energy validation
print("\nEnergy summary:")

print(
    "Total energy:",
    round(df["energy_kwh"].sum(), 2),
    "kWh"
)

print(
    "Running energy:",
    round(df["running_kwh"].sum(), 2),
    "kWh"
)

print(
    "Idle energy:",
    round(df["idle_kwh"].sum(), 2),
    "kWh"
)

print(
    "Changeover energy:",
    round(df["changeover_kwh"].sum(), 2),
    "kWh"
)

# 9. Check energy formula
energy_difference = (
    df["energy_kwh"]
    - df["running_kwh"]
    - df["idle_kwh"]
    - df["changeover_kwh"]
).abs().max()

print("\nMaximum energy formula difference:", energy_difference)

# 10. Check quality formula
quality_valid = (
    df["good_units"] + df["rejected_units"]
    == df["units_produced"]
).all()

print("Production quality validation:", quality_valid)

# 11. Check duplicate records
print(
    "Duplicate records:",
    df.duplicated(subset=["timestamp", "machine_id"]).sum()
)

# 12. Final validation
assert len(df) == 1000
assert df["machine_id"].nunique() == 3
assert df["product_type"].nunique() == 2
assert energy_difference < 0.002
assert quality_valid
assert df["machine_status"].isin(
    ["RUNNING", "IDLE", "CHANGEOVER"]
).all()

print("\n========== ALL DATABASE TESTS PASSED ==========")
