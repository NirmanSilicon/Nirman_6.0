
import sqlite3
import pandas as pd
from pathlib import Path

# =====================================================
# DATABASE CONFIGURATION
# =====================================================

BASE_DIR = Path(__file__).resolve().parents[1]

DB_PATH = BASE_DIR / "wattwise.db"

TABLE_NAME = "energy_records"

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
    "electricity_rate",
    "scenario_tag"
]


# =====================================================
# DATABASE CONNECTION
# =====================================================

def get_connection():

    conn = sqlite3.connect(DB_PATH)

    return conn


# =====================================================
# CREATE DATABASE AND TABLE
# =====================================================

def create_database():

    conn = get_connection()

    cursor = conn.cursor()

    # Check whether an older version of the table exists
    cursor.execute("""
        SELECT name
        FROM sqlite_master
        WHERE type='table' AND name='energy_records'
    """)

    existing_table = cursor.fetchone()

    if existing_table:

        cursor.execute("PRAGMA table_info(energy_records)")

        existing_columns = {
            row[1] for row in cursor.fetchall()
        }

        if not set(REQUIRED_COLUMNS).issubset(existing_columns):

            # Preserve old table rather than deleting it
            backup_name = "energy_records_legacy"

            suffix = 1

            while True:

                cursor.execute("""
                    SELECT name
                    FROM sqlite_master
                    WHERE type='table' AND name=?
                """, (backup_name,))

                if cursor.fetchone() is None:
                    break

                backup_name = f"energy_records_legacy_{suffix}"
                suffix += 1

            cursor.execute(
                f"ALTER TABLE energy_records RENAME TO {backup_name}"
            )

    # Create the new table
    cursor.execute("""
        CREATE TABLE IF NOT EXISTS energy_records (

            id INTEGER PRIMARY KEY AUTOINCREMENT,

            timestamp TEXT NOT NULL,

            machine_id TEXT NOT NULL,

            product_type TEXT NOT NULL,

            energy_kwh REAL NOT NULL,

            units_produced INTEGER NOT NULL,

            good_units INTEGER NOT NULL,

            rejected_units INTEGER NOT NULL,

            machine_status TEXT NOT NULL,

            production_hours REAL NOT NULL,

            idle_hours REAL NOT NULL,

            changeover_hours REAL NOT NULL,

            running_kwh REAL NOT NULL,

            idle_kwh REAL NOT NULL,

            changeover_kwh REAL NOT NULL,

            electricity_rate REAL NOT NULL,

            scenario_tag TEXT NOT NULL

        )
    """)

    # Indexes improve common searches
    cursor.execute("""
        CREATE INDEX IF NOT EXISTS idx_machine
        ON energy_records(machine_id)
    """)

    cursor.execute("""
        CREATE INDEX IF NOT EXISTS idx_timestamp
        ON energy_records(timestamp)
    """)

    conn.commit()

    conn.close()

    print("WattWise database initialized successfully.")


# =====================================================
# INSERT SINGLE RECORD
# =====================================================

def insert_record(record):

    missing = set(REQUIRED_COLUMNS) - set(record.keys())

    if missing:
        raise ValueError(f"Missing fields: {missing}")

    values = [record[column] for column in REQUIRED_COLUMNS]

    placeholders = ", ".join(["?"] * len(REQUIRED_COLUMNS))

    columns = ", ".join(REQUIRED_COLUMNS)

    conn = get_connection()

    cursor = conn.cursor()

    cursor.execute(
        f"""
        INSERT INTO energy_records ({columns})
        VALUES ({placeholders})
        """,
        values
    )

    conn.commit()

    record_id = cursor.lastrowid

    conn.close()

    return record_id


# =====================================================
# LOAD CSV INTO DATABASE
# =====================================================

def load_csv_to_database(csv_path=None, replace=True):

    if csv_path is None:

        csv_path = BASE_DIR / "data" / "energy_data.csv"

    csv_path = Path(csv_path)

    if not csv_path.exists():

        raise FileNotFoundError(
            f"Dataset not found: {csv_path}"
        )

    df = pd.read_csv(csv_path)

    missing = set(REQUIRED_COLUMNS) - set(df.columns)

    if missing:

        raise ValueError(
            f"CSV is missing columns: {missing}"
        )

    if df.empty:

        raise ValueError("CSV contains no records.")

    if df[REQUIRED_COLUMNS].isnull().any().any():

        raise ValueError("CSV contains missing required values.")

    if (df["energy_kwh"] < 0).any():

        raise ValueError("Energy values cannot be negative.")

    if (
        df["good_units"] + df["rejected_units"]
        != df["units_produced"]
    ).any():

        raise ValueError("Production quality totals do not match.")

    records = df[REQUIRED_COLUMNS].values.tolist()

    conn = get_connection()

    cursor = conn.cursor()

    try:

        if replace:

            cursor.execute("DELETE FROM energy_records")

        placeholders = ", ".join(["?"] * len(REQUIRED_COLUMNS))

        columns = ", ".join(REQUIRED_COLUMNS)

        cursor.executemany(
            f"""
            INSERT INTO energy_records ({columns})
            VALUES ({placeholders})
            """,
            records
        )

        conn.commit()

    except Exception:

        conn.rollback()

        raise

    finally:

        conn.close()

    return len(records)


# =====================================================
# GET ALL RECORDS
# =====================================================

def get_records():

    conn = get_connection()

    try:

        df = pd.read_sql_query(
            "SELECT * FROM energy_records ORDER BY timestamp",
            conn
        )

    finally:

        conn.close()

    return df


# =====================================================
# GET RECORD COUNT
# =====================================================

def get_record_count():

    conn = get_connection()

    try:

        result = pd.read_sql_query(
            "SELECT COUNT(*) AS total FROM energy_records",
            conn
        )

        return int(result.iloc[0]["total"])

    finally:

        conn.close()


# =====================================================
# CLEAR DATABASE RECORDS
# =====================================================

def clear_records():

    conn = get_connection()

    try:

        conn.execute("DELETE FROM energy_records")

        conn.commit()

    finally:

        conn.close()


# =====================================================
# DATABASE TEST
# =====================================================

if __name__ == "__main__":

    create_database()

    print("Database path:", DB_PATH)

    print("Current record count:", get_record_count())
