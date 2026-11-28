
import pandas as pd
import numpy as np
from pathlib import Path

# =====================================================
# WATTWISE INDUSTRIAL DATASET GENERATOR
# =====================================================

# Project root directory
BASE_DIR = Path(__file__).resolve().parents[1]

# Output directory
DATA_DIR = BASE_DIR / "data"
DATA_DIR.mkdir(parents=True, exist_ok=True)

OUTPUT_FILE = DATA_DIR / "energy_data.csv"

# Reproducible random data
rng = np.random.default_rng(42)

# =====================================================
# 1. INDUSTRIAL CONFIGURATION
# =====================================================

NUM_RECORDS = 1000

MACHINES = {
    "M-01": 1.00,
    "M-02": 1.08,
    "M-03": 0.95
}

PRODUCTS = {
    "Product A": 1.70,
    "Product B": 2.30
}

ELECTRICITY_RATE = 8.0

# Machine-specific energy multipliers
# Product-specific values represent approximate
# normal energy consumption per produced unit.

# =====================================================
# 2. GENERATE RECORDS
# =====================================================

records = []

start_time = pd.Timestamp.now().floor("min") - pd.Timedelta(days=30)

for i in range(NUM_RECORDS):

    machine_id = rng.choice(list(MACHINES.keys()))
    product_type = rng.choice(list(PRODUCTS.keys()))

    machine_factor = MACHINES[machine_id]
    product_factor = PRODUCTS[product_type]

    # Select machine operating state
    machine_status = rng.choice(
        ["RUNNING", "IDLE", "CHANGEOVER"],
        p=[0.75, 0.15, 0.10]
    )

    # Default values
    units_produced = 0
    good_units = 0
    rejected_units = 0

    production_hours = 0.0
    idle_hours = 0.0
    changeover_hours = 0.0

    running_kwh = 0.0
    idle_kwh = 0.0
    changeover_kwh = 0.0

    # =================================================
    # 3. RUNNING MACHINE
    # =================================================

    if machine_status == "RUNNING":

        units_produced = int(rng.integers(20, 101))

        production_hours = round(
            float(rng.uniform(1.0, 4.0)), 2
        )

        idle_hours = round(
            float(rng.uniform(0.0, 0.20)), 2
        )

        # Assign production scenarios
        scenario = rng.choice(
            ["NORMAL_PRODUCTION",
             "HIGH_ENERGY",
             "HIGH_REJECTION"],
            p=[0.80, 0.12, 0.08]
        )

        if scenario == "HIGH_REJECTION":

            rejection_rate = rng.uniform(0.12, 0.20)

        else:

            rejection_rate = rng.uniform(0.01, 0.05)

        rejected_units = int(
            round(units_produced * rejection_rate)
        )

        good_units = units_produced - rejected_units

        # Expected running energy
        normal_energy = (
            units_produced
            * product_factor
            * machine_factor
        )

        # Add natural variation
        running_kwh = normal_energy * rng.normal(1.0, 0.05)

        # Inject abnormal energy consumption
        if scenario == "HIGH_ENERGY":

            running_kwh *= rng.uniform(1.35, 1.65)

        # Idle consumption during short pauses
        idle_kwh = idle_hours * rng.uniform(0.6, 1.0)

        scenario_tag = scenario

    # =================================================
    # 4. IDLE MACHINE
    # =================================================

    elif machine_status == "IDLE":

        idle_hours = round(
            float(rng.uniform(0.5, 3.0)), 2
        )

        scenario = rng.choice(
            ["NORMAL_IDLE", "IDLE_WASTE"],
            p=[0.80, 0.20]
        )

        if scenario == "IDLE_WASTE":

            idle_rate = rng.uniform(2.2, 3.0)

        else:

            idle_rate = rng.uniform(0.6, 1.0)

        idle_kwh = idle_hours * idle_rate

        scenario_tag = scenario

    # =================================================
    # 5. CHANGEOVER MACHINE
    # =================================================

    else:

        scenario = rng.choice(
            ["NORMAL_CHANGEOVER", "LONG_CHANGEOVER"],
            p=[0.85, 0.15]
        )

        if scenario == "LONG_CHANGEOVER":

            changeover_hours = rng.uniform(2.0, 4.0)

        else:

            changeover_hours = rng.uniform(0.2, 1.5)

        changeover_hours = round(
            float(changeover_hours), 2
        )

        # Energy consumed during machine setup
        changeover_rate = rng.uniform(4.0, 6.0)

        changeover_kwh = (
            changeover_hours * changeover_rate
        )

        scenario_tag = scenario

    # =================================================
    # 6. TOTAL ENERGY
    # =================================================

    total_energy = (
        running_kwh
        + idle_kwh
        + changeover_kwh
    )

    # =================================================
    # 7. TIMESTAMP
    # =================================================

    timestamp = (
        start_time
        + pd.Timedelta(minutes=30 * i)
    )

    # =================================================
    # 8. SAVE RECORD
    # =================================================

    records.append({

        "timestamp": timestamp,

        "machine_id": machine_id,

        "product_type": product_type,

        "energy_kwh": round(float(total_energy), 3),

        "units_produced": units_produced,

        "good_units": good_units,

        "rejected_units": rejected_units,

        "machine_status": machine_status,

        "production_hours": production_hours,

        "idle_hours": idle_hours,

        "changeover_hours": changeover_hours,

        "running_kwh": round(float(running_kwh), 3),

        "idle_kwh": round(float(idle_kwh), 3),

        "changeover_kwh": round(float(changeover_kwh), 3),

        "electricity_rate": ELECTRICITY_RATE,

        "scenario_tag": scenario_tag

    })


# =====================================================
# 9. CREATE DATAFRAME
# =====================================================

df = pd.DataFrame(records)

df = df.sort_values("timestamp").reset_index(drop=True)

# =====================================================
# 10. DATA VALIDATION
# =====================================================

assert len(df) == NUM_RECORDS

assert df["machine_id"].nunique() == 3

assert df["product_type"].nunique() == 2

assert (df["energy_kwh"] >= 0).all()

assert (
    df["good_units"] + df["rejected_units"]
    == df["units_produced"]
).all()

assert (
    df["energy_kwh"]
    - df["running_kwh"]
    - df["idle_kwh"]
    - df["changeover_kwh"]
).abs().max() < 0.002

# =====================================================
# 11. SAVE CSV
# =====================================================

df.to_csv(OUTPUT_FILE, index=False)

# =====================================================
# 12. DISPLAY RESULTS
# =====================================================

print("\n======================================")
print("       WATTWISE DATASET GENERATED")
print("======================================")

print(f"\nTotal records: {len(df)}")

print(f"Total machines: {df['machine_id'].nunique()}")

print(f"Total products: {df['product_type'].nunique()}")

print("\nMachine distribution:")
print(df["machine_id"].value_counts())

print("\nProduct distribution:")
print(df["product_type"].value_counts())

print("\nMachine status distribution:")
print(df["machine_status"].value_counts())

print("\nScenario distribution:")
print(df["scenario_tag"].value_counts())

print("\nTotal energy consumption:")
print(round(df["energy_kwh"].sum(), 2), "kWh")

print("\nTotal units produced:")
print(df["units_produced"].sum())

print("\nTotal good units:")
print(df["good_units"].sum())

print("\nTotal rejected units:")
print(df["rejected_units"].sum())

print("\nCSV saved successfully:")
print(OUTPUT_FILE)

print("\nFirst five records:")
print(df.head().to_string(index=False))

print("\n======================================")
print("          VALIDATION PASSED")
print("======================================")
