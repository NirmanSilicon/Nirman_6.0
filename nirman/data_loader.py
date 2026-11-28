import os
import re
import numpy as np
import pandas as pd
from typing import Tuple, List, Dict, Optional

SENSOR_COLUMNS = [
    "EpdIntensity", "ForeLinePressure",
    "Gas1Flow", "Gas2Flow", "Gas3Flow", "Gas4Flow", "Gas5Flow", "Gas6Flow", "Gas7Flow", "Gas8Flow",
    "Heater1Temp", "Heater2Temp", "Heater3Temp", "Heater4Temp", "Heater5Temp", "Heater6Temp", "Heater7Temp", "Heater8Temp",
    "HeliumBPFlow", "HeliumBPPressure",
    "PlatenDcBias", "PlatenRFLoadCapacitor", "PlatenRFLoadPower", "PlatenRFPeakToPeak", "PlatenRFReflectedPower", "PlatenRFTuningCapacitor",
    "Pressure",
    "SourceRF2LoadCapacitor", "SourceRF2LoadPower", "SourceRF2PeakToPeak", "SourceRF2ReflectedPower", "SourceRF2TuningCapacitor",
    "SourceRFLoadCapacitor", "SourceRFLoadPower", "SourceRFPeakToPeak", "SourceRFReflectedPower", "SourceRFTuningCapacitor",
    "ThermoCouple1Temp", "ThermoCouple2Temp", "ThermoCouple3Temp", "ThermoCouple4Temp",
    "attenuatorRatio", "moriInnerCurrent", "moriOuterCurrent"
]

# Standard semiconductor equipment specification limits (USL / LSL) for critical sensors
SPEC_LIMITS = {
    "ForeLinePressure": {"LSL": 10.0, "USL": 180.0},
    "HeliumBPFlow": {"LSL": None, "USL": 14.0},
    "HeliumBPPressure": {"LSL": None, "USL": 20.0},
    "PlatenRFTuningCapacitor": {"LSL": 5.0, "USL": 65.0},
    "PlatenRFLoadCapacitor": {"LSL": 5.0, "USL": 100.0},
    "Pressure": {"LSL": None, "USL": 0.0900},
    "SourceRFReflectedPower": {"LSL": None, "USL": 1200.0},
    "PlatenRFReflectedPower": {"LSL": None, "USL": 500.0},
    "moriInnerCurrent": {"LSL": None, "USL": 15.0},
    "Heater1Temp": {"LSL": 1350.0, "USL": 1390.0}
}

def parse_timestamp_to_seconds(ts_str: str) -> float:
    """Parses timestamps like '01:32.8' into elapsed float seconds."""
    if pd.isna(ts_str):
        return 0.0
    ts_str = str(ts_str).strip()
    match = re.match(r"(?:(\d+):)?(\d+)(?:\.(\d+))?", ts_str)
    if not match:
        try:
            return float(ts_str)
        except ValueError:
            return 0.0
    parts = ts_str.split(":")
    if len(parts) == 2:
        minutes = float(parts[0])
        seconds = float(parts[1])
        return minutes * 60.0 + seconds
    return float(parts[0])

def clean_wafer_dataframe(df: pd.DataFrame) -> pd.DataFrame:
    """Cleans columns, drops Unnamed/empty columns, parses timestamps."""
    # Drop columns that have empty names or 'Unnamed'
    valid_cols = [c for c in df.columns if c and not c.startswith("Unnamed") and c.strip() != ""]
    df = df[valid_cols].copy()
    
    if "timestamp" in df.columns:
        df["time_sec"] = df["timestamp"].apply(parse_timestamp_to_seconds)
    else:
        df["time_sec"] = np.arange(len(df)) * 0.2
        
    # Ensure all sensor columns are numeric
    for col in SENSOR_COLUMNS:
        if col in df.columns:
            df[col] = pd.to_numeric(df[col], errors="coerce").fillna(0.0)
            
    return df

def load_sample_wafer(csv_path: str = "data/wafer_sample.csv") -> pd.DataFrame:
    """Loads and cleans the initial wafer sample CSV."""
    df = pd.read_csv(csv_path)
    return clean_wafer_dataframe(df)

def load_complete_process_data(
    csv_path: str = "data/complete_process_data.csv",
    sample_stride: int = 5,
    random_state: int = 42
) -> pd.DataFrame:
    """
    Loads the real multi-wafer production dataset (96 wafers, 313,169 samples).
    Applies Statistical Process Control (SPC) ground-truth labeling:
    - Normal (0): Nominal baseline runs (July production cycles)
    - Chamber_Drift (1): Progressive chamber aging runs (August cycles prior to wet clean)
    - Process_Fault (2): Acute plasma reflected power excursions (>400W) or pressure bursts (>0.065 Torr)
    """
    if not os.path.exists(csv_path):
        alt_path = "D:\\complete_process_data.csv"
        if os.path.exists(alt_path):
            csv_path = alt_path

    print(f"[*] Ingesting complete process data from: {csv_path}...")
    df = pd.read_csv(csv_path)
    print(f"    Raw file loaded: {len(df)} ticks across {df['wafer_id'].nunique()} wafers.")
    
    # Clean dataframe columns and parse timestamps
    df = clean_wafer_dataframe(df)
    
    # Ground-truth operational health labeling
    is_fault = (df['SourceRFReflectedPower'] > 400.0) | (df['Pressure'] > 0.065)
    is_drift = df['wafer_id'].str.contains('2024_08') & (~is_fault)

    labels = np.zeros(len(df), dtype=int)
    labels[is_drift] = 1
    labels[is_fault] = 2

    df['label'] = labels
    df['label_name'] = df['label'].map({0: 'Normal', 1: 'Chamber_Drift', 2: 'Process_Fault'})

    # If striding requested (e.g. 1 Hz sampling for high-efficiency training across all 96 wafers)
    if sample_stride > 1:
        df = df.iloc[::sample_stride].reset_index(drop=True)
        print(f"    Sampled at 1/{sample_stride} frequency: {len(df)} ticks across {df['wafer_id'].nunique()} wafers.")

    return df

def generate_multi_wafer_dataset(
    base_sample_path: str = "data/wafer_sample.csv",
    n_normal_wafers: int = 40,
    n_drift_wafers: int = 25,
    n_fault_wafers: int = 20,
    random_state: int = 42
) -> pd.DataFrame:
    """
    Generates a realistic multi-wafer manufacturing dataset based on the sensor dynamics
    of the seed wafer. Simulates:
    - Normal (Class 0): Stable etch execution with inherent physical sensor jitter
    - Chamber Drift (Class 1): Progressive degradation (e.g. Helium seal leak, RF capacitor drift)
    - Process Fault (Class 2): Abrupt chamber excursions (e.g. RF reflected power spike, pressure burst)
    """
    rng = np.random.RandomState(random_state)
    base_df = load_sample_wafer(base_sample_path)
    base_len = len(base_df)
    
    records = []
    
    # 1. Normal Wafers
    for w_idx in range(1, n_normal_wafers + 1):
        wafer_id = f"Normal_Wafer_{w_idx:03d}"
        df_w = base_df.copy()
        df_w["wafer_id"] = wafer_id
        df_w["label"] = 0
        df_w["label_name"] = "Normal"
        
        # Add realistic sensor Gaussian jitter (~1-2%)
        for col in SENSOR_COLUMNS:
            if col in df_w.columns:
                noise_scale = max(0.01 * df_w[col].std(), 0.005 * (df_w[col].mean() if df_w[col].mean() != 0 else 1.0))
                noise = rng.normal(0, noise_scale, size=base_len)
                df_w[col] = np.clip(df_w[col] + noise, 0, None)
                
        records.append(df_w)
        
    # 2. Chamber Drift Wafers
    for w_idx in range(1, n_drift_wafers + 1):
        wafer_id = f"Drift_Wafer_{w_idx:03d}"
        df_w = base_df.copy()
        df_w["wafer_id"] = wafer_id
        df_w["label"] = 1
        df_w["label_name"] = "Chamber_Drift"
        
        drift_severity = w_idx / float(n_drift_wafers)  # Progressive drift
        t_ramp = np.linspace(0, 1, base_len)
        
        for col in SENSOR_COLUMNS:
            if col in df_w.columns:
                noise_scale = max(0.01 * df_w[col].std(), 0.005)
                noise = rng.normal(0, noise_scale, size=base_len)
                drift_factor = 0.0
                
                # RF Tuning Capacitor drift (impedance match wear)
                if col == "PlatenRFTuningCapacitor":
                    drift_factor = 12.0 * drift_severity * t_ramp
                # Backside Helium leak drift (seal degradation)
                elif col == "HeliumBPFlow":
                    drift_factor = 2.5 * drift_severity * t_ramp
                # Foreline pressure drift
                elif col == "ForeLinePressure":
                    drift_factor = 8.0 * drift_severity * t_ramp
                # Heater temperature micro-drift
                elif col in ["Heater1Temp", "Heater2Temp"]:
                    drift_factor = 0.8 * drift_severity * t_ramp
                    
                df_w[col] = np.clip(df_w[col] + noise + drift_factor, 0, None)
                
        records.append(df_w)
        
    # 3. Process Fault Wafers
    for w_idx in range(1, n_fault_wafers + 1):
        wafer_id = f"Fault_Wafer_{w_idx:03d}"
        df_w = base_df.copy()
        df_w["wafer_id"] = wafer_id
        df_w["label"] = 2
        df_w["label_name"] = "Process_Fault"
        
        fault_start_idx = rng.randint(int(base_len * 0.4), int(base_len * 0.75))
        fault_type = w_idx % 3
        
        for col in SENSOR_COLUMNS:
            if col in df_w.columns:
                noise = rng.normal(0, 0.01 * (df_w[col].std() + 0.01), size=base_len)
                fault_offset = np.zeros(base_len)
                
                if fault_type == 0:
                    # RF Reflected Power Excursion (Plasma instability)
                    if col == "SourceRFReflectedPower":
                        fault_offset[fault_start_idx:] = rng.uniform(300.0, 700.0, size=base_len - fault_start_idx)
                    elif col == "Pressure":
                        fault_offset[fault_start_idx:] = rng.uniform(0.03, 0.06, size=base_len - fault_start_idx)
                elif fault_type == 1:
                    # Helium Backside seal blow-out / pressure drop
                    if col == "HeliumBPPressure":
                        fault_offset[fault_start_idx:] = -0.8 * df_w[col].values[fault_start_idx:]
                    elif col == "HeliumBPFlow":
                        fault_offset[fault_start_idx:] = rng.uniform(8.0, 15.0, size=base_len - fault_start_idx)
                else:
                    # Gas flow MFC failure / foreline pressure choke
                    if col == "ForeLinePressure":
                        fault_offset[fault_start_idx:] = rng.uniform(35.0, 60.0, size=base_len - fault_start_idx)
                    elif col == "Gas1Flow":
                        fault_offset[fault_start_idx:] = -50.0
                        
                df_w[col] = np.clip(df_w[col] + noise + fault_offset, 0, None)
                
        records.append(df_w)
        
    full_dataset = pd.concat(records, ignore_index=True)
    return full_dataset
