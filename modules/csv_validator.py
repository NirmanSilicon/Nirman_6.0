
import pandas as pd

# =====================================================
# WATTWISE CSV VALIDATION MODULE
# =====================================================

REQUIRED_COLUMNS = [
    "timestamp",
    "machine_id",
    "product_type",
    "energy_kwh",
    "units_produced",
    "good_units",
    "rejected_units",
    "machine_status",
    "production_hours",
    "idle_hours",
    "changeover_hours",
    "running_kwh",
    "idle_kwh",
    "changeover_kwh",
    "electricity_rate"
]

OPTIONAL_COLUMNS = ["scenario_tag"]

NUMERIC_COLUMNS = [
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

VALID_STATUSES = [
    "RUNNING",
    "IDLE",
    "CHANGEOVER"
]


def validate_factory_csv(df):

    errors = []
    warnings = []

    # Work on a copy; do not modify original dataframe
    df = df.copy()

    # -------------------------------------------------
    # 1. EMPTY FILE CHECK
    # -------------------------------------------------

    if df.empty:

        return False, df, ["Uploaded CSV is empty."], warnings

    # -------------------------------------------------
    # 2. NORMALIZE COLUMN NAMES
    # -------------------------------------------------

    df.columns = [
        str(column).strip().lower()
        for column in df.columns
    ]

    # -------------------------------------------------
    # 3. DUPLICATE COLUMN CHECK
    # -------------------------------------------------

    if df.columns.duplicated().any():

        return False, df, [
            "CSV contains duplicate column names."
        ], warnings

    # -------------------------------------------------
    # 4. REQUIRED COLUMN CHECK
    # -------------------------------------------------

    missing_columns = [
        column
        for column in REQUIRED_COLUMNS
        if column not in df.columns
    ]

    if missing_columns:

        return False, df, [
            "Missing required columns: "
            + ", ".join(missing_columns)
        ], warnings

    # -------------------------------------------------
    # 5. EXTRA COLUMN CHECK
    # -------------------------------------------------

    allowed_columns = set(
        REQUIRED_COLUMNS + OPTIONAL_COLUMNS
    )

    extra_columns = [
        column
        for column in df.columns
        if column not in allowed_columns
    ]

    if extra_columns:

        warnings.append(
            "Extra columns will be ignored: "
            + ", ".join(extra_columns)
        )

    # Keep only supported columns
    df = df[
        REQUIRED_COLUMNS
        + [
            column
            for column in OPTIONAL_COLUMNS
            if column in df.columns
        ]
    ].copy()

    # -------------------------------------------------
    # 6. MISSING VALUE CHECK
    # -------------------------------------------------

    if df[REQUIRED_COLUMNS].isnull().any().any():

        missing = df[REQUIRED_COLUMNS].isnull().sum()

        missing = missing[missing > 0]

        errors.append(
            "Missing values found: "
            + ", ".join(
                f"{col} ({count})"
                for col, count in missing.items()
            )
        )

    if errors:

        return False, df, errors, warnings

    # -------------------------------------------------
    # 7. TIMESTAMP VALIDATION
    # -------------------------------------------------

    timestamps = pd.to_datetime(
        df["timestamp"],
        errors="coerce"
    )

    if timestamps.isnull().any():

        errors.append(
            "Invalid date/time values found in timestamp."
        )

    else:

        df["timestamp"] = timestamps.dt.strftime(
            "%Y-%m-%d %H:%M:%S"
        )

    # -------------------------------------------------
    # 8. MACHINE AND PRODUCT VALIDATION
    # -------------------------------------------------

    df["machine_id"] = (
        df["machine_id"].astype(str).str.strip()
    )

    df["product_type"] = (
        df["product_type"].astype(str).str.strip()
    )

    if (df["machine_id"] == "").any():

        errors.append("Machine ID cannot be empty.")

    if (df["product_type"] == "").any():

        errors.append("Product type cannot be empty.")

    # -------------------------------------------------
    # 9. MACHINE STATUS VALIDATION
    # -------------------------------------------------

    df["machine_status"] = (
        df["machine_status"]
        .astype(str)
        .str.strip()
        .str.upper()
    )

    invalid_status = ~df["machine_status"].isin(
        VALID_STATUSES
    )

    if invalid_status.any():

        values = df.loc[
            invalid_status, "machine_status"
        ].unique()

        errors.append(
            "Invalid machine status: "
            + ", ".join(values)
        )

    # -------------------------------------------------
    # 10. NUMERIC VALIDATION
    # -------------------------------------------------

    for column in NUMERIC_COLUMNS:

        df[column] = pd.to_numeric(
            df[column],
            errors="coerce"
        )

        if df[column].isnull().any():

            errors.append(
                f"Invalid numeric values in {column}."
            )

    if errors:

        return False, df, errors, warnings

    # -------------------------------------------------
    # 11. NON-NEGATIVE VALUE VALIDATION
    # -------------------------------------------------

    non_negative_columns = [
        column for column in NUMERIC_COLUMNS
    ]

    for column in non_negative_columns:

        if (df[column] < 0).any():

            errors.append(
                f"{column} cannot contain negative values."
            )

    # -------------------------------------------------
    # 12. INTEGER VALIDATION
    # -------------------------------------------------

    integer_columns = [
        "units_produced",
        "good_units",
        "rejected_units"
    ]

    for column in integer_columns:

        if not (df[column] % 1 == 0).all():

            errors.append(
                f"{column} must contain whole numbers."
            )

    # -------------------------------------------------
    # 13. PRODUCTION QUALITY VALIDATION
    # -------------------------------------------------

    quality_valid = (
        df["good_units"] + df["rejected_units"]
        == df["units_produced"]
    )

    if not quality_valid.all():

        errors.append(
            "Good units + rejected units must equal "
            "total units produced."
        )

    # -------------------------------------------------
    # 14. ENERGY COMPONENT VALIDATION
    # -------------------------------------------------

    calculated_energy = (
        df["running_kwh"]
        + df["idle_kwh"]
        + df["changeover_kwh"]
    )

    energy_difference = (
        df["energy_kwh"] - calculated_energy
    ).abs()

    if (energy_difference > 0.02).any():

        errors.append(
            "Total energy does not match the sum of "
            "running, idle and changeover energy."
        )

    # -------------------------------------------------
    # 15. MACHINE TIME VALIDATION
    # -------------------------------------------------

    total_hours = (
        df["production_hours"]
        + df["idle_hours"]
        + df["changeover_hours"]
    )

    if (total_hours <= 0).any():

        errors.append(
            "Each record must have positive total machine time."
        )

    # -------------------------------------------------
    # 16. STATUS CONSISTENCY CHECK
    # -------------------------------------------------

    running_invalid = (
        (df["machine_status"] == "RUNNING")
        & (df["units_produced"] <= 0)
    )

    idle_invalid = (
        (df["machine_status"] == "IDLE")
        & (
            (df["units_produced"] != 0)
            | (df["production_hours"] != 0)
        )
    )

    changeover_invalid = (
        (df["machine_status"] == "CHANGEOVER")
        & (
            (df["units_produced"] != 0)
            | (df["production_hours"] != 0)
        )
    )

    if running_invalid.any():

        errors.append(
            "RUNNING records must have production units."
        )

    if idle_invalid.any():

        errors.append(
            "IDLE records must have zero production units "
            "and zero production hours."
        )

    if changeover_invalid.any():

        errors.append(
            "CHANGEOVER records must have zero production "
            "units and zero production hours."
        )

    # -------------------------------------------------
    # 17. DUPLICATE RECORD VALIDATION
    # -------------------------------------------------

    duplicates = df.duplicated(
        subset=["timestamp", "machine_id"],
        keep=False
    )

    if duplicates.any():

        errors.append(
            "Duplicate timestamp and machine ID combinations found."
        )

    # -------------------------------------------------
    # 18. ADD DEFAULT SCENARIO TAG
    # -------------------------------------------------

    if "scenario_tag" not in df.columns:

        df["scenario_tag"] = "FACTORY_UPLOAD"

    else:

        df["scenario_tag"] = (
            df["scenario_tag"]
            .fillna("FACTORY_UPLOAD")
            .astype(str)
        )

    # -------------------------------------------------
    # 19. FINAL RESULT
    # -------------------------------------------------

    if errors:

        return False, df, errors, warnings

    return True, df, errors, warnings
