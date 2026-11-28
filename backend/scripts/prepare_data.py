
"""
AlarmSense - TEP Dataset Preparation

Converts the 3-year Tennessee Eastman Process dataset from a
semicolon-separated TXT file into a compressed Parquet file.

Input:
    backend/python_data_3years.txt

Output:
    backend/data/processed/tep_3years.parquet

Also generates a summary of contiguous operating episodes.
"""

import os
import time
from pathlib import Path

import numpy as np
import pandas as pd


# ---------------------------------------------------------------------
# CONFIGURATION
# ---------------------------------------------------------------------

SAMPLE_INTERVAL_MINUTES = 3.0

TARGET_STATUSES = [
    0, 1, 2, 4, 5, 6,
    7, 8, 10, 11, 13, 14
]

SENSOR_CONTROL_COLS = (
    [f"XMEAS({i})" for i in range(1, 42)]
    + [f"XMV({i})" for i in range(1, 12)]
)

REQUIRED_COLS = SENSOR_CONTROL_COLS + ["STATUS"]


# ---------------------------------------------------------------------
# PATH CONFIGURATION
# ---------------------------------------------------------------------

def get_paths():
    """Resolve input and output paths relative to the backend directory."""

    base_dir = Path(__file__).resolve().parent.parent

    input_file = base_dir / "python_data_3years.txt"
    output_dir = base_dir / "data" / "processed"
    output_file = output_dir / "tep_3years.parquet"

    return base_dir, input_file, output_dir, output_file


# ---------------------------------------------------------------------
# DATA VALIDATION
# ---------------------------------------------------------------------

def validate_input_file(input_file: Path):
    """Check that the source dataset exists and is not empty."""

    if not input_file.exists():
        raise FileNotFoundError(
            f"Dataset not found: {input_file}\n"
            "Place python_data_3years.txt inside the backend directory."
        )

    if input_file.stat().st_size == 0:
        raise ValueError("The input dataset is empty.")

    print(
        f"Input file size: "
        f"{input_file.stat().st_size / (1024 ** 2):.2f} MB"
    )


def validate_columns(df: pd.DataFrame):
    """Verify that all expected TEP columns exist."""

    missing_cols = [
        col for col in REQUIRED_COLS
        if col not in df.columns
    ]

    if missing_cols:
        raise KeyError(
            "The dataset is missing required columns:\n"
            + ", ".join(missing_cols)
        )

    if len(df.columns) != len(set(df.columns)):
        raise ValueError("Duplicate column names detected in the dataset.")

    print("Column validation successful.")
    print(f"Total columns: {len(df.columns)}")


# ---------------------------------------------------------------------
# DATA LOADING
# ---------------------------------------------------------------------

def load_dataset(input_file: Path) -> pd.DataFrame:
    """Read the semicolon-separated TEP dataset."""

    print("\nReading dataset...")
    start = time.perf_counter()

    df = pd.read_csv(
        input_file,
        sep=";",
        low_memory=False
    )

    read_time = time.perf_counter() - start

    if df.empty:
        raise ValueError("The dataset contains no data rows.")

    print(
        f"Read {len(df):,} rows and {len(df.columns)} columns "
        f"in {read_time:.2f} seconds."
    )

    # Rename the first column to timestamp if necessary.
    first_col = df.columns[0]

    if first_col != "timestamp":
        if "timestamp" in df.columns:
            raise ValueError(
                "A timestamp column already exists, but the first "
                "column has a different name."
            )

        df = df.rename(columns={first_col: "timestamp"})

    print(f"First column '{first_col}' identified as timestamp.")

    validate_columns(df)

    return df


# ---------------------------------------------------------------------
# DATA CLEANING AND TYPE CONVERSION
# ---------------------------------------------------------------------

def clean_and_convert(df: pd.DataFrame) -> pd.DataFrame:
    """Validate timestamps and convert sensor columns to float32."""

    print("\nProcessing timestamps...")

    start = time.perf_counter()

    df["timestamp"] = pd.to_datetime(
        df["timestamp"],
        errors="coerce"
    )

    invalid_timestamps = int(df["timestamp"].isna().sum())

    if invalid_timestamps:
        raise ValueError(
            f"Found {invalid_timestamps:,} invalid or missing timestamps."
        )

    print(
        f"Timestamp conversion completed in "
        f"{time.perf_counter() - start:.2f} seconds."
    )

    print("\nConverting sensor and control columns...")

    start = time.perf_counter()

    for col in SENSOR_CONTROL_COLS:
        df[col] = pd.to_numeric(
            df[col],
            errors="coerce"
        )

    df["STATUS"] = pd.to_numeric(
        df["STATUS"],
        errors="coerce"
    )

    # Check for missing or invalid numerical values.
    numeric_cols = REQUIRED_COLS

    missing_counts = df[numeric_cols].isna().sum()
    columns_with_missing = missing_counts[missing_counts > 0]

    if not columns_with_missing.empty:
        print("\nMissing or invalid values detected:")

        for col, count in columns_with_missing.items():
            print(f"  {col}: {count:,}")

        raise ValueError(
            "Dataset contains missing or non-numeric sensor values. "
            "Resolve these before training."
        )

    # STATUS must contain integer values.
    status_values = df["STATUS"].to_numpy()

    if not np.all(np.isfinite(status_values)):
        raise ValueError("STATUS contains non-finite values.")

    if not np.all(status_values == np.floor(status_values)):
        raise ValueError("STATUS contains non-integer values.")

    status_min = int(df["STATUS"].min())
    status_max = int(df["STATUS"].max())

    if status_min < np.iinfo(np.int16).min or (
        status_max > np.iinfo(np.int16).max
    ):
        raise ValueError(
            "STATUS values cannot be represented using int16."
        )

    # Convert sensor and control values to float32.
    for col in SENSOR_CONTROL_COLS:
        df[col] = df[col].astype(np.float32)

    # Convert STATUS to int16.
    df["STATUS"] = df["STATUS"].astype(np.int16)

    # Validate sensor values after conversion.
    sensor_values = df[SENSOR_CONTROL_COLS].to_numpy()

    if not np.isfinite(sensor_values).all():
        raise ValueError(
            "Non-finite sensor values detected after float32 conversion."
        )

    print(
        f"Type conversion completed in "
        f"{time.perf_counter() - start:.2f} seconds."
    )

    print("\nFinal data types:")
    print(df.dtypes.value_counts())

    return df


# ---------------------------------------------------------------------
# MEMORY REPORT
# ---------------------------------------------------------------------

def print_memory_report(df: pd.DataFrame):
    """Display dataframe memory usage."""

    memory_mb = df.memory_usage(deep=True).sum() / (1024 ** 2)

    print("\n=== MEMORY USAGE ===")
    print(f"DataFrame memory usage: {memory_mb:.2f} MB")

    df.info(memory_usage="deep")


# ---------------------------------------------------------------------
# PARQUET EXPORT
# ---------------------------------------------------------------------

def save_parquet(
    df: pd.DataFrame,
    output_dir: Path,
    output_file: Path
):
    """Save the processed dataframe as a Parquet file."""

    output_dir.mkdir(parents=True, exist_ok=True)

    temp_file = output_file.with_name(
        output_file.stem + ".tmp.parquet"
    )

    print(f"\nSaving Parquet file to:\n{output_file}")

    start = time.perf_counter()

    try:
        df.to_parquet(
            temp_file,
            engine="pyarrow",
            index=False,
            compression="snappy"
        )

        # Replace the previous output only after successful writing.
        os.replace(temp_file, output_file)

    except Exception:
        if temp_file.exists():
            temp_file.unlink()

        raise

    save_time = time.perf_counter() - start

    parquet_size_bytes = output_file.stat().st_size
    parquet_size_mb = parquet_size_bytes / (1024 ** 2)

    print("\n=== PARQUET EXPORT ===")
    print(f"Save time: {save_time:.2f} seconds")
    print(f"Parquet size: {parquet_size_mb:.2f} MB")
    print(f"Output file: {output_file}")

    return parquet_size_bytes, parquet_size_mb, save_time


# ---------------------------------------------------------------------
# PARQUET LOAD BENCHMARK
# ---------------------------------------------------------------------

def benchmark_parquet_load(output_file: Path):
    """Measure the time required to reload the Parquet file."""

    print("\nMeasuring Parquet load time...")

    start = time.perf_counter()

    df_loaded = pd.read_parquet(
        output_file,
        engine="pyarrow"
    )

    load_time = time.perf_counter() - start

    print(
        f"Loaded {len(df_loaded):,} rows and "
        f"{len(df_loaded.columns)} columns "
        f"in {load_time:.4f} seconds."
    )

    return df_loaded, load_time


# ---------------------------------------------------------------------
# EPISODE ANALYSIS
# ---------------------------------------------------------------------

def analyze_episodes(df: pd.DataFrame) -> pd.DataFrame:
    """
    Identify contiguous episodes.

    An episode is a continuous sequence of rows with the same STATUS.

    A new episode starts whenever STATUS changes.
    """

    print("\nAnalyzing contiguous episodes...")

    start = time.perf_counter()

    episode_id = (
        df["STATUS"] != df["STATUS"].shift()
    ).cumsum()

    episodes = (
        df.groupby(episode_id)
        .agg(
            status=("STATUS", "first"),
            steps=("STATUS", "count")
        )
        .reset_index(drop=True)
    )

    episodes["hours"] = (
        episodes["steps"] * SAMPLE_INTERVAL_MINUTES / 60.0
    )

    print(
        f"Episode identification completed in "
        f"{time.perf_counter() - start:.2f} seconds."
    )

    print(f"Total contiguous episodes: {len(episodes):,}")

    return episodes


# ---------------------------------------------------------------------
# EPISODE SUMMARY
# ---------------------------------------------------------------------

def generate_episode_summary(
    episodes: pd.DataFrame
) -> pd.DataFrame:
    """Generate statistics for each target operating status."""

    summary_rows = []

    for status in TARGET_STATUSES:

        subset = episodes[
            episodes["status"] == status
        ]

        total_rows = int(subset["steps"].sum())
        num_episodes = len(subset)

        if num_episodes > 0:

            min_steps = int(subset["steps"].min())
            median_steps = float(subset["steps"].median())
            max_steps = int(subset["steps"].max())

            min_hours = float(subset["hours"].min())
            median_hours = float(subset["hours"].median())
            max_hours = float(subset["hours"].max())

        else:
            min_steps = 0
            median_steps = 0.0
            max_steps = 0

            min_hours = 0.0
            median_hours = 0.0
            max_hours = 0.0

        summary_rows.append({
            "STATUS": status,
            "Total Rows": total_rows,
            "Episodes": num_episodes,
            "Min (steps)": min_steps,
            "Min (hrs)": min_hours,
            "Median (steps)": median_steps,
            "Median (hrs)": median_hours,
            "Max (steps)": max_steps,
            "Max (hrs)": max_hours
        })

    return pd.DataFrame(summary_rows)


def print_episode_summary(summary_df: pd.DataFrame):
    """Print the contiguous episode summary table."""

    print("\n=== CONTIGUOUS EPISODES SUMMARY TABLE ===")

    print(
        summary_df.to_string(
            index=False,
            formatters={
                "Min (hrs)": "{:.2f}".format,
                "Median (hrs)": "{:.2f}".format,
                "Max (hrs)": "{:.2f}".format,
                "Median (steps)": "{:.1f}".format
            }
        )
    )


# ---------------------------------------------------------------------
# FINAL PERFORMANCE SUMMARY
# ---------------------------------------------------------------------

def print_final_summary(
    input_file: Path,
    output_file: Path,
    parquet_size_bytes: int,
    parquet_size_mb: float,
    load_time: float,
    save_time: float,
    df: pd.DataFrame,
    episodes: pd.DataFrame
):
    """Display dataset size and processing performance."""

    original_size_bytes = input_file.stat().st_size
    original_size_mb = original_size_bytes / (1024 ** 2)

    compression_ratio = (
        original_size_bytes / parquet_size_bytes
        if parquet_size_bytes > 0
        else 0
    )

    print("\n" + "=" * 60)
    print("DATASET AND PERFORMANCE SUMMARY")
    print("=" * 60)

    print(f"Original text file size : {original_size_mb:.2f} MB")
    print(f"Parquet file size       : {parquet_size_mb:.2f} MB")
    print(f"Compression ratio       : {compression_ratio:.2f}x")
    print(f"Parquet save time       : {save_time:.2f} seconds")
    print(f"Parquet load time       : {load_time:.4f} seconds")
    print(f"Total rows              : {len(df):,}")
    print(f"Total columns           : {len(df.columns)}")
    print(f"Total episodes          : {len(episodes):,}")
    print(f"Unique STATUS values    : {df['STATUS'].nunique()}")
    print(f"Output path             : {output_file}")

    print("=" * 60)


# ---------------------------------------------------------------------
# MAIN
# ---------------------------------------------------------------------

def main():

    total_start = time.perf_counter()

    print("=" * 60)
    print("ALARMSENSE - TEP DATASET PREPARATION")
    print("=" * 60)

    try:
        # 1. Resolve paths.
        _, input_file, output_dir, output_file = get_paths()

        # 2. Validate input file.
        validate_input_file(input_file)

        # 3. Load dataset.
        df = load_dataset(input_file)

        # 4. Clean and convert data types.
        df = clean_and_convert(df)

        # 5. Display memory usage.
        print_memory_report(df)

        # 6. Export to Parquet.
        parquet_size_bytes, parquet_size_mb, save_time = save_parquet(
            df,
            output_dir,
            output_file
        )

        # 7. Benchmark Parquet loading.
        df_loaded, load_time = benchmark_parquet_load(output_file)

        # 8. Verify the exported data.
        if len(df_loaded) != len(df):
            raise RuntimeError(
                "Parquet verification failed: row count mismatch."
            )

        if list(df_loaded.columns) != list(df.columns):
            raise RuntimeError(
                "Parquet verification failed: column mismatch."
            )

        if not df_loaded["STATUS"].equals(df["STATUS"]):
            raise RuntimeError(
                "Parquet verification failed: STATUS values changed."
            )

        print("\nParquet verification successful.")

        # 9. Analyze contiguous episodes.
        episodes = analyze_episodes(df)

        # 10. Generate and display summary.
        summary_df = generate_episode_summary(episodes)

        print_episode_summary(summary_df)

        # 11. Final performance report.
        print_final_summary(
            input_file=input_file,
            output_file=output_file,
            parquet_size_bytes=parquet_size_bytes,
            parquet_size_mb=parquet_size_mb,
            load_time=load_time,
            save_time=save_time,
            df=df,
            episodes=episodes
        )

        print(
            f"\nTotal execution time: "
            f"{time.perf_counter() - total_start:.2f} seconds"
        )

        print("\nDataset preparation completed successfully.")

    except Exception as exc:
        print("\nDATASET PREPARATION FAILED")
        print(f"Reason: {exc}")
        raise


if __name__ == "__main__":
    main()
