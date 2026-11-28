import os
import time
import pandas as pd
import numpy as np

def main():
    base_dir = os.path.abspath(os.path.join(os.path.dirname(__file__), ".."))
    input_file = os.path.join(base_dir, "python_data_3years.txt")
    output_dir = os.path.join(base_dir, "data", "processed")
    output_file = os.path.join(output_dir, "tep_3years.parquet")
    
    os.makedirs(output_dir, exist_ok=True)
    
    print(f"Reading {input_file}...")
    t0 = time.perf_counter()
    df = pd.read_csv(input_file, sep=";")
    read_time = time.perf_counter() - t0
    print(f"Read {len(df)} rows and {len(df.columns)} columns in {read_time:.2f}s")
    
    # Rename unnamed first column to 'timestamp'
    first_col = df.columns[0]
    df = df.rename(columns={first_col: "timestamp"})
    print(f"Parsed first column '{first_col}' as 'timestamp'")
    
    t_parse = time.perf_counter()
    df["timestamp"] = pd.to_datetime(df["timestamp"])
    print(f"Parsed timestamps in {time.perf_counter() - t_parse:.2f}s")
    
    # Cast 52 sensor/control columns to float32 and STATUS to int16
    sensor_control_cols = [f"XMEAS({i})" for i in range(1, 42)] + [f"XMV({i})" for i in range(1, 12)]
    
    cast_dict = {col: np.float32 for col in sensor_control_cols}
    cast_dict["STATUS"] = np.int16
    
    # Verify all expected columns exist
    for col in sensor_control_cols + ["STATUS"]:
        if col not in df.columns:
            raise KeyError(f"Expected column '{col}' not found in dataframe")
            
    df = df.astype(cast_dict)
    print("Casting complete. Memory usage:")
    df.info(memory_usage="deep")
    
    # Save to Parquet
    print(f"\nSaving dataframe to {output_file}...")
    t_save = time.perf_counter()
    df.to_parquet(output_file, engine="pyarrow", index=False)
    save_time = time.perf_counter() - t_save
    parquet_size_bytes = os.path.getsize(output_file)
    parquet_size_mb = parquet_size_bytes / (1024 * 1024)
    print(f"Saved Parquet in {save_time:.2f}s, size: {parquet_size_mb:.2f} MB ({parquet_size_bytes} bytes)")
    
    # Measure load time of tep_3years.parquet
    print("\nMeasuring Parquet load time...")
    t_load = time.perf_counter()
    df_loaded = pd.read_parquet(output_file, engine="pyarrow")
    load_time = time.perf_counter() - t_load
    print(f"Loaded Parquet file in {load_time:.4f}s ({len(df_loaded)} rows, {len(df_loaded.columns)} columns)")
    
    # Identify contiguous episodes
    print("\nAnalyzing contiguous episodes...")
    episode_id = (df["STATUS"] != df["STATUS"].shift()).cumsum()
    
    # Group by episode
    episodes = df.groupby(episode_id).agg(
        status=("STATUS", "first"),
        steps=("STATUS", "count")
    ).reset_index(drop=True)
    
    episodes["hours"] = episodes["steps"] * 3.0 / 60.0
    
    target_statuses = [0, 1, 2, 4, 5, 6, 7, 8, 10, 11, 13, 14]
    
    summary_rows = []
    for s in target_statuses:
        sub = episodes[episodes["status"] == s]
        total_rows = int(sub["steps"].sum()) if len(sub) > 0 else 0
        num_episodes = len(sub)
        if num_episodes > 0:
            min_steps = int(sub["steps"].min())
            med_steps = float(sub["steps"].median())
            max_steps = int(sub["steps"].max())
            min_hours = sub["hours"].min()
            med_hours = sub["hours"].median()
            max_hours = sub["hours"].max()
        else:
            min_steps = med_steps = max_steps = 0
            min_hours = med_hours = max_hours = 0.0
            
        summary_rows.append({
            "STATUS": s,
            "Total Rows": total_rows,
            "Episodes": num_episodes,
            "Min (steps)": min_steps,
            "Min (hrs)": min_hours,
            "Median (steps)": med_steps,
            "Median (hrs)": med_hours,
            "Max (steps)": max_steps,
            "Max (hrs)": max_hours
        })
        
    summary_df = pd.DataFrame(summary_rows)
    
    print("\n=== CONTIGUOUS EPISODES SUMMARY TABLE ===")
    print(summary_df.to_string(index=False, formatters={
        "Min (hrs)": "{:.2f}".format,
        "Median (hrs)": "{:.2f}".format,
        "Max (hrs)": "{:.2f}".format,
        "Median (steps)": "{:.1f}".format
    }))
    
    print("\n=== DATASET AND PERFORMANCE SUMMARY ===")
    print(f"Original Text File Size: {os.path.getsize(input_file) / (1024 * 1024):.2f} MB")
    print(f"Parquet File Path:       {output_file}")
    print(f"Parquet File Size:       {parquet_size_mb:.2f} MB")
    print(f"Parquet Load Time:       {load_time:.4f} seconds")
    print(f"Compression Ratio:       {(os.path.getsize(input_file) / parquet_size_bytes):.2f}x")

if __name__ == "__main__":
    main()
