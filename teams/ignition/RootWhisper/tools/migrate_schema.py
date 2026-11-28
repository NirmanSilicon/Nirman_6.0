import sqlite3
from pathlib import Path

db_path = Path("data/rootwhisper.db")
con = sqlite3.connect(db_path)
cur = con.cursor()

def add_col_if_missing(table, col_def):
    col_name = col_def.split()[0]
    cols = [r[1] for r in cur.execute(f"PRAGMA table_info({table})").fetchall()]
    if col_name not in cols:
        cur.execute(f"ALTER TABLE {table} ADD COLUMN {col_def}")
        print(f"Added {col_name} to {table}")
    else:
        print(f"{col_name} already exists in {table}")

add_col_if_missing("plant_models", "validation_approach TEXT DEFAULT 'Chronological Forward Split'")
add_col_if_missing("plant_models", "n_train INTEGER")
add_col_if_missing("plant_models", "n_test INTEGER")
add_col_if_missing("plant_models", "adaptive_threshold_c REAL")
add_col_if_missing("plant_models", "residual_std_c REAL")
add_col_if_missing("plant_models", "residual_mean_c REAL")
add_col_if_missing("plant_models", "data_provenance TEXT DEFAULT 'SIMULATED_TEST_DATA'")
add_col_if_missing("plant_models", "scientific_limitations TEXT")

add_col_if_missing("screening_results", "consecutive_elevated_count INTEGER DEFAULT 0")
add_col_if_missing("screening_results", "soil_moisture_trend TEXT DEFAULT 'STABLE'")
add_col_if_missing("screening_results", "soil_moisture_slope REAL")
add_col_if_missing("screening_results", "evidence_sufficiency TEXT DEFAULT 'SUFFICIENT'")

con.commit()
con.close()
print("Database schema migration completed successfully.")

