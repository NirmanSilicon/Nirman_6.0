
from pathlib import Path
import sys

# Make project modules accessible
BASE_DIR = Path(__file__).resolve().parents[1]

sys.path.insert(0, str(BASE_DIR))

from modules.database import (
    create_database,
    load_csv_to_database,
    get_records,
    get_record_count
)

# Step 1: Initialize database
create_database()

# Step 2: Import CSV records
csv_path = BASE_DIR / "data" / "energy_data.csv"

count = load_csv_to_database(
    csv_path=csv_path,
    replace=True
)

# Step 3: Read imported records
df = get_records()

print("\n================================")
print("WATTWISE DATABASE IMPORT")
print("================================")

print("Imported records:", count)

print("Database records:", get_record_count())

print("\nFirst five records:")

print(df.head().to_string(index=False))

print("\nMachine distribution:")

print(df["machine_id"].value_counts())

print("\nProduct distribution:")

print(df["product_type"].value_counts())

print("\nMachine status distribution:")

print(df["machine_status"].value_counts())

print("\n================================")
print("DATABASE IMPORT SUCCESSFUL")
print("================================")
