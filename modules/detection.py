
import sqlite3
import hashlib
from pathlib import Path

import numpy as np
import pandas as pd


# ==================================================
# 1. DATABASE CONFIGURATION
# ==================================================

BASE_DIR = Path(__file__).resolve().parent.parent
DB_PATH = BASE_DIR / "wattwise.db"


# ==================================================
# 2. CREATE WASTE EVENTS TABLE
# ==================================================

def create_waste_table():

    conn = sqlite3.connect(DB_PATH)

    try:
        conn.execute("""
            CREATE TABLE IF NOT EXISTS waste_events (

                id INTEGER PRIMARY KEY AUTOINCREMENT,
                event_key TEXT UNIQUE,
                timestamp TEXT,
                machine_id TEXT,
                product_type TEXT,
                waste_type TEXT,
                severity TEXT,
                waste_kwh REAL,
                waste_cost REAL,
                description TEXT,
                recommendation TEXT,
                created_at TEXT DEFAULT CURRENT_TIMESTAMP

            )
        """)

        conn.commit()

    finally:
        conn.close()


# ==================================================
# 3. SAFE COLUMN ACCESS
# ==================================================

def get_column(df, possible_names, default=0):

    for name in possible_names:

        if name in df.columns:

            return pd.to_numeric(
                df[name],
                errors="coerce"
            ).fillna(default)

    return pd.Series(
        default,
        index=df.index,
        dtype=float
    )


def get_text_column(
    df,
    possible_names,
    default="Unknown"
):

    for name in possible_names:

        if name in df.columns:

            return (
                df[name]
                .fillna(default)
                .astype(str)
            )

    return pd.Series(
        default,
        index=df.index
    )


# ==================================================
# 4. SEVERITY CLASSIFICATION
# ==================================================

def classify_severity(waste_percentage):

    if waste_percentage >= 40:
        return "Critical"

    elif waste_percentage >= 25:
        return "High"

    elif waste_percentage >= 10:
        return "Medium"

    return "Low"


# ==================================================
# 5. MAIN WASTE DETECTION ENGINE
# ==================================================

def detect_waste(analyzed_df):

    if analyzed_df is None or analyzed_df.empty:
        return pd.DataFrame()

    df = analyzed_df.copy()

    # Machine and product information

    machine = get_text_column(
        df, ["machine_id"]
    )

    product = get_text_column(
        df, ["product_type"]
    )

    timestamp = get_text_column(
        df, ["timestamp"]
    )

    # Energy information

    total_energy = get_column(
        df, ["energy_kwh"]
    )

    idle_energy = get_column(
        df, ["idle_kwh"]
    )

    changeover_energy = get_column(
        df, ["changeover_kwh"]
    )

    expected_energy = get_column(
        df,
        ["expected_energy_kwh", "expected_kwh"]
    )

    excess_energy = get_column(
        df,
        ["excess_energy_kwh", "excess_kwh"]
    )

    # Production information

    units = get_column(
        df, ["units_produced"]
    )

    good_units = get_column(
        df, ["good_units"]
    )

    rejected_units = get_column(
        df, ["rejected_units"]
    )

    idle_hours = get_column(
        df, ["idle_hours"]
    )

    changeover_hours = get_column(
        df, ["changeover_hours"]
    )

    # Electricity rate

    electricity_rate = get_column(
        df, ["electricity_rate"], default=8
    )

    # Calculate percentages

    idle_percentage = np.where(
        total_energy > 0,
        idle_energy / total_energy * 100,
        0
    )

    changeover_percentage = np.where(
        total_energy > 0,
        changeover_energy / total_energy * 100,
        0
    )

    rejection_percentage = np.where(
        units > 0,
        rejected_units / units * 100,
        0
    )

    # Remove double counting

    production_excess = (
        excess_energy
        - idle_energy
        - changeover_energy
    ).clip(lower=0)

    production_excess_percentage = np.where(
        expected_energy > 0,
        production_excess / expected_energy * 100,
        0
    )

    # Energy per good unit

    energy_per_good_unit = np.where(
        good_units > 0,
        total_energy / good_units,
        0
    )

    baseline_energy_per_unit = np.where(
        good_units > 0,
        expected_energy / good_units,
        0
    )

    # Store calculated metrics

    df["idle_waste_percentage"] = idle_percentage

    df["changeover_waste_percentage"] = (
        changeover_percentage
    )

    df["rejection_percentage"] = rejection_percentage

    df["production_excess_kwh"] = production_excess

    df["production_excess_percentage"] = (
        production_excess_percentage
    )

    df["energy_per_good_unit"] = energy_per_good_unit

    df["baseline_energy_per_unit"] = (
        baseline_energy_per_unit
    )

    # Prepare event list

    events = []

    # Helper function

    def add_event(
        index,
        waste_type,
        waste_kwh,
        percentage,
        description
    ):

        if waste_kwh <= 0:
            return

        severity = classify_severity(percentage)

        rate = electricity_rate.iloc[index]

        waste_cost = waste_kwh * rate

        events.append({

            "timestamp": timestamp.iloc[index],

            "machine_id": machine.iloc[index],

            "product_type": product.iloc[index],

            "waste_type": waste_type,

            "severity": severity,

            "waste_kwh": round(
                float(waste_kwh), 3
            ),

            "waste_cost": round(
                float(waste_cost), 2
            ),

            "waste_percentage": round(
                float(percentage), 2
            ),

            "description": description

        })

    # ==================================================
    # 6. PROCESS EACH FACTORY RECORD
    # ==================================================

    for i in range(len(df)):

        # A. IDLE ENERGY WASTE

        if (
            idle_hours.iloc[i] > 0
            and idle_energy.iloc[i] > 0
        ):

            add_event(
                i,
                "Idle Energy Waste",
                idle_energy.iloc[i],
                idle_percentage[i],

                f"Machine {machine.iloc[i]} consumed "
                f"{idle_energy.iloc[i]:.2f} kWh "
                f"during {idle_hours.iloc[i]:.2f} idle hours."
            )

        # B. EXCESS ENERGY CONSUMPTION

        if production_excess.iloc[i] > 0:

            add_event(
                i,
                "Excess Energy Consumption",
                production_excess.iloc[i],
                production_excess_percentage[i],

                f"Machine {machine.iloc[i]} consumed "
                f"{production_excess.iloc[i]:.2f} kWh "
                "above its expected production baseline "
                "after accounting for idle and changeover energy."
            )

        # C. CHANGEOVER ENERGY WASTE

        if (
            changeover_hours.iloc[i] > 0
            and changeover_energy.iloc[i] > 0
        ):

            add_event(
                i,
                "Changeover Energy Waste",
                changeover_energy.iloc[i],
                changeover_percentage[i],

                f"Machine {machine.iloc[i]} consumed "
                f"{changeover_energy.iloc[i]:.2f} kWh "
                f"during {changeover_hours.iloc[i]:.2f} "
                "changeover hours."
            )

        # D. HIGH PRODUCT REJECTION

        if rejection_percentage[i] >= 10:

            events.append({

                "timestamp": timestamp.iloc[i],

                "machine_id": machine.iloc[i],

                "product_type": product.iloc[i],

                "waste_type": "High Product Rejection",

                "severity": classify_severity(
                    rejection_percentage[i]
                ),

                "waste_kwh": 0.0,

                "waste_cost": 0.0,

                "waste_percentage": round(
                    float(rejection_percentage[i]), 2
                ),

                "description": (
                    f"{rejected_units.iloc[i]:.0f} rejected "
                    f"units out of {units.iloc[i]:.0f} produced "
                    f"({rejection_percentage[i]:.1f}% rejection)."
                )

            })

        # E. ABNORMAL ENERGY USAGE

        if (
            baseline_energy_per_unit[i] > 0

            and energy_per_good_unit[i]
            > baseline_energy_per_unit[i] * 1.25

            and production_excess.iloc[i] <= 0
        ):

            abnormal_percentage = (
                energy_per_good_unit[i]
                / baseline_energy_per_unit[i] - 1
            ) * 100

            events.append({

                "timestamp": timestamp.iloc[i],

                "machine_id": machine.iloc[i],

                "product_type": product.iloc[i],

                "waste_type": "Abnormal Energy Usage",

                "severity": classify_severity(
                    abnormal_percentage
                ),

                "waste_kwh": 0.0,

                "waste_cost": 0.0,

                "waste_percentage": round(
                    float(abnormal_percentage), 2
                ),

                "description": (
                    f"Machine {machine.iloc[i]} shows "
                    "abnormally high energy consumption "
                    "per good unit compared with its "
                    "expected baseline."
                )

            })

    # Return results

    result = pd.DataFrame(events)

    if result.empty:
        return result

    return result.sort_values(
        "waste_cost",
        ascending=False
    ).reset_index(drop=True)


# ==================================================
# 7. SAVE WASTE EVENTS INTO SQLITE
# ==================================================

def save_waste_events(events_df):

    if events_df is None or events_df.empty:
        return 0

    create_waste_table()

    conn = sqlite3.connect(DB_PATH)

    saved = 0

    try:

        for _, row in events_df.iterrows():

            raw_key = "|".join([

                str(row.get("timestamp", "")),

                str(row.get("machine_id", "")),

                str(row.get("product_type", "")),

                str(row.get("waste_type", "")),

                str(row.get("description", ""))

            ])

            event_key = hashlib.sha256(
                raw_key.encode("utf-8")
            ).hexdigest()

            cursor = conn.execute("""

                INSERT OR IGNORE INTO waste_events (

                    event_key,
                    timestamp,
                    machine_id,
                    product_type,
                    waste_type,
                    severity,
                    waste_kwh,
                    waste_cost,
                    description,
                    recommendation

                )

                VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)

            """, (

                event_key,

                str(row.get("timestamp", "")),

                str(row.get("machine_id", "")),

                str(row.get("product_type", "")),

                str(row.get("waste_type", "")),

                str(row.get("severity", "")),

                float(row.get("waste_kwh", 0)),

                float(row.get("waste_cost", 0)),

                str(row.get("description", "")),

                str(row.get("recommendation", ""))

            ))

            saved += cursor.rowcount

        conn.commit()

    except Exception:

        conn.rollback()
        raise

    finally:

        conn.close()

    return saved


# ==================================================
# 8. RETRIEVE SAVED WASTE EVENTS
# ==================================================

def get_waste_events():

    create_waste_table()

    conn = sqlite3.connect(DB_PATH)

    try:

        df = pd.read_sql_query("""

            SELECT *

            FROM waste_events

            ORDER BY id DESC

        """, conn)

    finally:

        conn.close()

    return df
