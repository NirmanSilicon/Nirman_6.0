
# ==========================================
# WATTWISE - PHASE 4
# INDUSTRIAL ENERGY ANALYSIS ENGINE
# ==========================================

import sqlite3
from pathlib import Path

import pandas as pd


# Database location
BASE_DIR = Path(__file__).resolve().parent.parent
DB_PATH = BASE_DIR / "wattwise.db"


# ------------------------------------------
# 1. LOAD DATA FROM SQLITE DATABASE
# ------------------------------------------

def load_energy_data():

    if not DB_PATH.exists():
        raise FileNotFoundError(
            f"Database not found: {DB_PATH}"
        )

    conn = sqlite3.connect(DB_PATH)

    try:
        data = pd.read_sql_query(
            "SELECT * FROM energy_records",
            conn
        )
    finally:
        conn.close()

    if data.empty:
        return data

    return data


# ------------------------------------------
# 2. CLEAN AND PREPARE DATA
# ------------------------------------------

def prepare_energy_data(data):

    df = data.copy()

    numeric_columns = [
        "energy_kwh",
        "units_produced",
        "good_units",
        "rejected_units",
        "production_hours",
        "idle_hours",
        "changeover_hours",
        "running_kwh",
        "idle_kwh",
        "changeover_kwh",
        "electricity_rate"
    ]

    for col in numeric_columns:

        if col in df.columns:
            df[col] = pd.to_numeric(
                df[col],
                errors="coerce"
            ).fillna(0)

    required_columns = [
        "timestamp",
        "machine_id",
        "product_type",
        "energy_kwh",
        "units_produced",
        "good_units",
        "rejected_units",
        "production_hours",
        "idle_hours",
        "changeover_hours",
        "running_kwh",
        "idle_kwh",
        "changeover_kwh",
        "electricity_rate"
    ]

    missing = [
        col for col in required_columns
        if col not in df.columns
    ]

    if missing:
        raise ValueError(
            "Missing database columns: "
            + ", ".join(missing)
        )

    df["timestamp"] = pd.to_datetime(
        df["timestamp"],
        errors="coerce"
    )

    df["machine_id"] = (
        df["machine_id"]
        .fillna("Unknown")
        .astype(str)
    )

    df["product_type"] = (
        df["product_type"]
        .fillna("Unknown")
        .astype(str)
    )

    # Remove records with invalid dates
    df = df.dropna(subset=["timestamp"])

    # Remove invalid negative measurements
    measurement_columns = [
        "energy_kwh",
        "units_produced",
        "good_units",
        "rejected_units",
        "production_hours",
        "idle_hours",
        "changeover_hours",
        "running_kwh",
        "idle_kwh",
        "changeover_kwh",
        "electricity_rate"
    ]

    for col in measurement_columns:
        df = df[df[col] >= 0]

    return df.reset_index(drop=True)


# ------------------------------------------
# 3. PRODUCTION EFFICIENCY
# ------------------------------------------

def calculate_production_efficiency(df):

    result = df.copy()

    result["energy_per_good_unit"] = (
        result["energy_kwh"]
        / result["good_units"].replace(0, float("nan"))
    )

    result["rejection_percentage"] = (
        result["rejected_units"]
        / result["units_produced"].replace(0, float("nan"))
    ) * 100

    result["good_production_percentage"] = (
        result["good_units"]
        / result["units_produced"].replace(0, float("nan"))
    ) * 100

    return result


# ------------------------------------------
# 4. PRODUCTION-AWARE ENERGY BASELINE
# ------------------------------------------

def calculate_energy_baseline(df):

    result = df.copy()

    # Calculate energy per good unit
    result["energy_per_good_unit"] = (
        result["energy_kwh"]
        / result["good_units"].replace(0, float("nan"))
    )

    # Use the lower quartile of observed
    # energy intensity for each product.
    # This is an estimated internal benchmark,
    # not an external industry standard.

    baseline = (
        result.dropna(
            subset=["energy_per_good_unit"]
        )
        .groupby("product_type")[
            "energy_per_good_unit"
        ]
        .quantile(0.25)
    )

    result["baseline_kwh_per_unit"] = (
        result["product_type"].map(baseline)
    )

    result["baseline_kwh_per_unit"] = (
        result["baseline_kwh_per_unit"].fillna(0)
    )

    # Expected energy for actual good production
    result["expected_energy_kwh"] = (
        result["good_units"]
        * result["baseline_kwh_per_unit"]
    )

    # Actual energy above the expected baseline
    result["excess_energy_kwh"] = (
        result["energy_kwh"]
        - result["expected_energy_kwh"]
    ).clip(lower=0)

    result["excess_energy_percentage"] = (
        result["excess_energy_kwh"]
        / result["expected_energy_kwh"].replace(0, float("nan"))
    ) * 100

    return result


# ------------------------------------------
# 5. IDLE AND CHANGEOVER ANALYSIS
# ------------------------------------------

def calculate_wastage(df):

    result = df.copy()

    result["idle_energy_percentage"] = (
        result["idle_kwh"]
        / result["energy_kwh"].replace(0, float("nan"))
    ) * 100

    result["changeover_energy_percentage"] = (
        result["changeover_kwh"]
        / result["energy_kwh"].replace(0, float("nan"))
    ) * 100

    result["idle_energy_cost"] = (
        result["idle_kwh"]
        * result["electricity_rate"]
    )

    result["changeover_energy_cost"] = (
        result["changeover_kwh"]
        * result["electricity_rate"]
    )

    return result


# ------------------------------------------
# 6. ELECTRICITY COST ANALYSIS
# ------------------------------------------

def calculate_electricity_cost(df):

    result = df.copy()

    result["electricity_cost"] = (
        result["energy_kwh"]
        * result["electricity_rate"]
    )

    result["expected_energy_cost"] = (
        result["expected_energy_kwh"]
        * result["electricity_rate"]
    )

    result["excess_energy_cost"] = (
        result["excess_energy_kwh"]
        * result["electricity_rate"]
    )

    return result


# ------------------------------------------
# 7. MACHINE-WISE ANALYSIS
# ------------------------------------------

def machine_analysis(df):

    result = (
        df.groupby("machine_id")
        .agg(
            total_energy_kwh=("energy_kwh", "sum"),
            total_good_units=("good_units", "sum"),
            total_production=("units_produced", "sum"),
            total_idle_energy=("idle_kwh", "sum"),
            total_changeover_energy=("changeover_kwh", "sum"),
            total_excess_energy=("excess_energy_kwh", "sum"),
            total_electricity_cost=("electricity_cost", "sum"),
            total_production_hours=("production_hours", "sum"),
            total_idle_hours=("idle_hours", "sum"),
            total_changeover_hours=("changeover_hours", "sum")
        )
        .reset_index()
    )

    result["energy_per_good_unit"] = (
        result["total_energy_kwh"]
        / result["total_good_units"].replace(0, float("nan"))
    )

    result["rejection_percentage"] = (
        (
            result["total_production"]
            - result["total_good_units"]
        )
        / result["total_production"].replace(0, float("nan"))
    ) * 100

    result["idle_energy_percentage"] = (
        result["total_idle_energy"]
        / result["total_energy_kwh"].replace(0, float("nan"))
    ) * 100

    result["excess_energy_percentage"] = (
        result["total_excess_energy"]
        / (
            result["total_energy_kwh"]
            - result["total_excess_energy"]
        ).replace(0, float("nan"))
    ) * 100

    result = result.sort_values(
        "energy_per_good_unit",
        ascending=True,
        na_position="last"
    )

    result["efficiency_rank"] = range(
        1, len(result) + 1
    )

    return result


# ------------------------------------------
# 8. PRODUCT-WISE ANALYSIS
# ------------------------------------------

def product_analysis(df):

    result = (
        df.groupby("product_type")
        .agg(
            total_energy_kwh=("energy_kwh", "sum"),
            total_good_units=("good_units", "sum"),
            total_production=("units_produced", "sum"),
            total_excess_energy=("excess_energy_kwh", "sum"),
            total_electricity_cost=("electricity_cost", "sum")
        )
        .reset_index()
    )

    result["energy_per_good_unit"] = (
        result["total_energy_kwh"]
        / result["total_good_units"].replace(0, float("nan"))
    )

    result["rejection_percentage"] = (
        (
            result["total_production"]
            - result["total_good_units"]
        )
        / result["total_production"].replace(0, float("nan"))
    ) * 100

    return result.sort_values(
        "energy_per_good_unit",
        ascending=True,
        na_position="last"
    )


# ------------------------------------------
# 9. RUN COMPLETE ANALYSIS
# ------------------------------------------

def run_complete_analysis(data):

    df = prepare_energy_data(data)

    if df.empty:
        return df, pd.DataFrame(), pd.DataFrame()

    df = calculate_production_efficiency(df)

    df = calculate_energy_baseline(df)

    df = calculate_wastage(df)

    df = calculate_electricity_cost(df)

    machines = machine_analysis(df)

    products = product_analysis(df)

    return df, machines, products
