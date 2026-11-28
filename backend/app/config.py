"""Configuration constants and metadata for AlarmSense.

Defines target dataset paths, process column names, fault metadata,
and ISA-18.2 alarm management delay configurations.
"""

from typing import Final, TypedDict


class FaultInfo(TypedDict):
    """Metadata attributes for a Tennessee Eastman Process operating condition."""

    name: str
    unit: str
    type: str
    description: str


# Path to preprocessed Parquet dataset
PARQUET_PATH: Final[str] = "data/processed/tep_3years.parquet"

# Target faults for multi-class detection and baseline normal operation
TARGET_FAULTS: Final[list[int]] = [0, 1, 2, 4, 5, 6, 7, 8, 10, 11, 13, 14]

# Default window size for rolling statistical features (in 3-min steps)
DEFAULT_WINDOW_SIZE: Final[int] = 20

# 52 Process measurement and manipulated variables:
# XMEAS(1)..XMEAS(41) and XMV(1)..XMV(11)
SENSOR_COLS: Final[list[str]] = [f"XMEAS({i})" for i in range(1, 42)] + [
    f"XMV({i})" for i in range(1, 12)
]

# Standard Tennessee Eastman Process fault definitions
FAULT_METADATA: Final[dict[int, FaultInfo]] = {
    0: {
        "name": "Normal",
        "unit": "Process-wide",
        "type": "None",
        "description": "Normal operation without induced process faults",
    },
    1: {
        "name": "A/C Feed Ratio Step",
        "unit": "Stream 4",
        "type": "Step",
        "description": "Step change in A/C feed ratio in Stream 4",
    },
    2: {
        "name": "B Composition Step",
        "unit": "Stream 4",
        "type": "Step",
        "description": "Step change in B composition in Stream 4",
    },
    4: {
        "name": "Reactor Cooling Water Inlet Temp Step",
        "unit": "Reactor cooling",
        "type": "Step",
        "description": "Step change in reactor cooling water inlet temperature",
    },
    5: {
        "name": "Condenser Cooling Water Inlet Temp Step",
        "unit": "Condenser cooling",
        "type": "Step",
        "description": "Step change in condenser cooling water inlet temperature",
    },
    6: {
        "name": "A Feed Loss",
        "unit": "Stream 1",
        "type": "Step",
        "description": "A feed loss (valve 1 closed / Stream 1 feed loss)",
    },
    7: {
        "name": "C Header Pressure Loss",
        "unit": "Stream 4",
        "type": "Step",
        "description": "C header pressure loss - reduced availability in Stream 4",
    },
    8: {
        "name": "A/B/C Feed Composition Random Variation",
        "unit": "Stream 4",
        "type": "Random Variation",
        "description": "Random variation in A, B, C feed composition in Stream 4",
    },
    10: {
        "name": "C Feed Temp Random Variation",
        "unit": "Stream 4",
        "type": "Random Variation",
        "description": "Random variation in C feed temperature in Stream 4",
    },
    11: {
        "name": "Reactor Cooling Water Temp Random Variation",
        "unit": "Reactor cooling",
        "type": "Random Variation",
        "description": "Random variation in reactor cooling water inlet temperature",
    },
    13: {
        "name": "Reaction Kinetics Slow Drift",
        "unit": "Reactor",
        "type": "Slow Drift",
        "description": "Slow drift in reaction kinetics",
    },
    14: {
        "name": "Reactor Cooling Water Valve Sticking",
        "unit": "Reactor cooling valve",
        "type": "Sticking",
        "description": "Reactor cooling water valve sticking",
    },
}

# ISA-18.2 chattering delay configuration (steps at 3-min sampling)
# Fast dynamics (flow, pressure) use 1 step (3 min);
# slower thermal and level dynamics use 2 steps (6 min).
ISA_DELAY_STEPS: Final[dict[str, int]] = {
    "flow_pressure": 1,
    "temp_level": 2,
    "flow": 1,
    "pressure": 1,
    "temperature": 2,
    "level": 2,
    "composition": 2,
}

# Official Tennessee Eastman Process human-readable sensor descriptions & units
SENSOR_LABELS: Final[dict[str, str]] = {
    "XMEAS(1)": "A Feed (Stream 1)",
    "XMEAS(2)": "D Feed (Stream 2)",
    "XMEAS(3)": "E Feed (Stream 3)",
    "XMEAS(4)": "A & C Feed (Stream 4)",
    "XMEAS(5)": "Recycle Flow (Stream 8)",
    "XMEAS(6)": "Reactor Feed Rate (Stream 6)",
    "XMEAS(7)": "Reactor Pressure",
    "XMEAS(8)": "Reactor Level",
    "XMEAS(9)": "Reactor Temperature",
    "XMEAS(10)": "Purge Rate (Stream 9)",
    "XMEAS(11)": "Product Separator Temp",
    "XMEAS(12)": "Product Separator Level",
    "XMEAS(13)": "Product Separator Pressure",
    "XMEAS(14)": "Separator Underflow (Stream 10)",
    "XMEAS(15)": "Stripper Level",
    "XMEAS(16)": "Stripper Pressure",
    "XMEAS(17)": "Stripper Underflow (Stream 11)",
    "XMEAS(18)": "Stripper Temperature",
    "XMEAS(19)": "Stripper Steam Flow",
    "XMEAS(20)": "Compressor Work",
    "XMEAS(21)": "Reactor Cooling Water Outlet Temp",
    "XMEAS(22)": "Separator Cooling Water Outlet Temp",
    "XMEAS(23)": "Reactor Feed A Conc (Stream 6)",
    "XMEAS(24)": "Reactor Feed B Conc (Stream 6)",
    "XMEAS(25)": "Reactor Feed C Conc (Stream 6)",
    "XMEAS(26)": "Reactor Feed D Conc (Stream 6)",
    "XMEAS(27)": "Reactor Feed E Conc (Stream 6)",
    "XMEAS(28)": "Reactor Feed F Conc (Stream 6)",
    "XMEAS(29)": "Purge Gas A Conc (Stream 9)",
    "XMEAS(30)": "Purge Gas B Conc (Stream 9)",
    "XMEAS(31)": "Purge Gas C Conc (Stream 9)",
    "XMEAS(32)": "Purge Gas D Conc (Stream 9)",
    "XMEAS(33)": "Purge Gas E Conc (Stream 9)",
    "XMEAS(34)": "Purge Gas F Conc (Stream 9)",
    "XMEAS(35)": "Purge Gas G Conc (Stream 9)",
    "XMEAS(36)": "Purge Gas H Conc (Stream 9)",
    "XMEAS(37)": "Product D Conc (Stream 11)",
    "XMEAS(38)": "Product E Conc (Stream 11)",
    "XMEAS(39)": "Product F Conc (Stream 11)",
    "XMEAS(40)": "Product G Conc (Stream 11)",
    "XMEAS(41)": "Product H Conc (Stream 11)",
    "XMV(1)": "D Feed Flow Valve (Stream 2)",
    "XMV(2)": "E Feed Flow Valve (Stream 3)",
    "XMV(3)": "A Feed Flow Valve (Stream 1)",
    "XMV(4)": "A & C Feed Flow Valve (Stream 4)",
    "XMV(5)": "Compressor Recycle Valve",
    "XMV(6)": "Purge Valve (Stream 9)",
    "XMV(7)": "Separator Pot Liquid Valve (Stream 10)",
    "XMV(8)": "Stripper Liquid Product Valve (Stream 11)",
    "XMV(9)": "Stripper Steam Valve",
    "XMV(10)": "Reactor Cooling Water Valve",
    "XMV(11)": "Condenser Cooling Water Valve",
}

SENSOR_UNITS: Final[dict[str, str]] = {
    "XMEAS(1)": "kscmh",
    "XMEAS(2)": "kg/hr",
    "XMEAS(3)": "kg/hr",
    "XMEAS(4)": "kscmh",
    "XMEAS(5)": "kscmh",
    "XMEAS(6)": "kscmh",
    "XMEAS(7)": "kPa gauge",
    "XMEAS(8)": "%",
    "XMEAS(9)": "Deg C",
    "XMEAS(10)": "kscmh",
    "XMEAS(11)": "Deg C",
    "XMEAS(12)": "%",
    "XMEAS(13)": "kPa gauge",
    "XMEAS(14)": "m3/hr",
    "XMEAS(15)": "%",
    "XMEAS(16)": "kPa gauge",
    "XMEAS(17)": "m3/hr",
    "XMEAS(18)": "Deg C",
    "XMEAS(19)": "kg/hr",
    "XMEAS(20)": "kW",
    "XMEAS(21)": "Deg C",
    "XMEAS(22)": "Deg C",
    **{f"XMEAS({i})": "Mole %" for i in range(23, 42)},
    **{f"XMV({i})": "%" for i in range(1, 12)},
}


def get_sensor_label(tag: str) -> str:
    """Return the human-readable description for a TEP sensor tag, or the tag itself."""
    return SENSOR_LABELS.get(tag, tag)


def get_sensor_unit(tag: str) -> str:
    """Return the engineering unit string for a TEP sensor tag, or empty string."""
    return SENSOR_UNITS.get(tag, "")
