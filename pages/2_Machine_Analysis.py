
import sqlite3
from pathlib import Path

import pandas as pd
import streamlit as st


# =====================================================
# 1. PAGE CONFIGURATION
# =====================================================

st.set_page_config(
    page_title="WattWise | Machine Analysis",
    page_icon="🏭",
    layout="wide"
)


# =====================================================
# 2. WATTWISE DARK + ORANGE THEME
# =====================================================

st.markdown("""
<style>

/* Main application background */
.stApp,
section[data-testid="stMain"] {
    background-color: #080f1d !important;
    color: #ffbd69 !important;
}

/* Main content spacing */
.block-container {
    padding-top: 1.5rem;
    padding-bottom: 2rem;
}

/* Sidebar background */
section[data-testid="stSidebar"] {
    background-color: #101f34 !important;
    border-right: 1px solid #294766 !important;
}

/* Sidebar text */
section[data-testid="stSidebar"] p,
section[data-testid="stSidebar"] label,
section[data-testid="stSidebar"] span,
section[data-testid="stSidebar"] .stMarkdown,
section[data-testid="stSidebar"] h1,
section[data-testid="stSidebar"] h2,
section[data-testid="stSidebar"] h3 {
    color: #ffbd69 !important;
}

/* Main headings */
.stApp h1,
.stApp h2,
.stApp h3,
.stApp h4,
.stApp h5,
.stApp h6 {
    color: #ff9f43 !important;
    font-weight: 700 !important;
}

/* Normal text */
.stApp .stMarkdown,
.stApp .stMarkdown p,
.stApp .stMarkdown li,
.stApp .stCaption,
.stApp [data-testid="stCaptionContainer"] {
    color: #ffbd69 !important;
}

/* Machine header banner */
.machine-header {
    background: linear-gradient(110deg, #12304d, #07577c);
    padding: 32px 35px;
    border-radius: 18px;
    border: 1px solid #17618b;
    margin-bottom: 24px;
}

.machine-header h1 {
    color: #ff9f43 !important;
    font-size: 34px !important;
    margin: 0 0 12px 0 !important;
}

.machine-header p {
    color: #ffd0a0 !important;
    font-size: 15px !important;
    margin: 0 !important;
}

/* Section headings */
.section-heading {
    font-size: 21px;
    font-weight: 700;
    color: #ff9f43 !important;
    margin-top: 22px;
    margin-bottom: 10px;
}

/* Metric cards */
div[data-testid="stMetric"] {
    background-color: #14253c !important;
    border: 1px solid #294766 !important;
    padding: 16px !important;
    border-radius: 14px !important;
}

/* Metric labels */
div[data-testid="stMetric"] label,
div[data-testid="stMetricLabel"] {
    color: #ff9f43 !important;
}

/* Metric values */
div[data-testid="stMetric"] [data-testid="stMetricValue"],
div[data-testid="stMetricValue"] {
    color: #ffffff !important;
}

/* Metric delta */
div[data-testid="stMetricDelta"] {
    color: #38d9a9 !important;
}

/* Input fields */
.stSelectbox div[data-baseweb="select"],
.stMultiSelect div[data-baseweb="select"],
.stDateInput div[data-baseweb="input"],
.stTextInput div[data-baseweb="input"] {
    background-color: #172a42 !important;
    border-radius: 8px !important;
}

/* Input text */
div[data-baseweb="select"] *,
.stDateInput input,
.stTextInput input {
    color: #ffffff !important;
}

/* Input labels */
.stSelectbox label,
.stMultiSelect label,
.stDateInput label {
    color: #ffbd69 !important;
}

/* Tables */
div[data-testid="stDataFrame"],
div[data-testid="stTable"] {
    background-color: #14253c !important;
    color: #ffffff !important;
}

/* Chart containers */
div[data-testid="stPlotlyChart"],
div[data-testid="stVegaLiteChart"],
div[data-testid="stArrowVegaLiteChart"] {
    background-color: #101f34 !important;
    border-radius: 12px !important;
    padding: 10px !important;
}

/* Buttons */
.stButton button,
.stDownloadButton button {
    background-color: #087cae !important;
    color: #ffffff !important;
    border: none !important;
    border-radius: 8px !important;
}

/* Button hover */
.stButton button:hover,
.stDownloadButton button:hover {
    background-color: #0b9bd3 !important;
    color: #ffffff !important;
}

/* Captions */
.stCaption,
[data-testid="stCaptionContainer"] {
    color: #ffbd69 !important;
}

/* Horizontal lines */
hr {
    border-color: #294766 !important;
}

</style>
""", unsafe_allow_html=True)


# DATABASE LOCATION

BASE_DIR = Path(__file__).resolve().parent.parent
DB_PATH = BASE_DIR / "wattwise.db"


# =====================================================
# 3. LOAD DATABASE
# =====================================================

@st.cache_data(ttl=30)
def load_data(db_path, modified_time):

    conn = sqlite3.connect(db_path)

    try:
        energy = pd.read_sql_query(
            "SELECT * FROM energy_records",
            conn
        )

        waste = pd.read_sql_query(
            "SELECT * FROM waste_events",
            conn
        )

    finally:
        conn.close()

    return energy, waste


# =====================================================
# 4. PAGE HEADER
# =====================================================


st.markdown(
    """
    <style>
    .stApp h1 {
        color: #ff9f43 !important;
    }

    .stApp .ww-subtitle {
        color: #ffbd69 !important;
        font-size: 16px;
    }
    </style>
    """,
    unsafe_allow_html=True
)

st.title("🏭 Machine Performance Analysis")

st.markdown(
    '<p class="ww-subtitle">⚡ SMART INDUSTRIAL ENERGY MONITORING</p>',
    unsafe_allow_html=True
)

st.markdown(
    "Monitor machine-level energy consumption, production efficiency and energy waste."
)




# =====================================================
# 5. DATABASE CHECK
# =====================================================

if not DB_PATH.exists():
    st.error("WattWise database not found.")
    st.stop()

try:
    energy_df, waste_df = load_data(
        str(DB_PATH),
        DB_PATH.stat().st_mtime
    )

except Exception as error:
    st.error(f"Database error: {error}")
    st.stop()

if energy_df.empty:
    st.warning("No energy records available.")
    st.stop()


# =====================================================
# 6. DATA CLEANING
# =====================================================

energy_df["timestamp"] = pd.to_datetime(
    energy_df["timestamp"],
    errors="coerce"
)

waste_df["timestamp"] = pd.to_datetime(
    waste_df["timestamp"],
    errors="coerce"
)

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

    if col in energy_df.columns:

        energy_df[col] = pd.to_numeric(
            energy_df[col],
            errors="coerce"
        ).fillna(0)

for col in ["waste_kwh", "waste_cost"]:

    if col in waste_df.columns:

        waste_df[col] = pd.to_numeric(
            waste_df[col],
            errors="coerce"
        ).fillna(0)


# =====================================================
# 7. FILTERS
# =====================================================

st.sidebar.title("⚙️ Machine Filters")

valid_dates = energy_df["timestamp"].dropna()

if valid_dates.empty:
    st.error("No valid timestamps found.")
    st.stop()

min_date = valid_dates.min().date()
max_date = valid_dates.max().date()

date_range = st.sidebar.date_input(
    "Date Range",
    value=(min_date, max_date),
    min_value=min_date,
    max_value=max_date
)

if isinstance(date_range, (tuple, list)):

    if len(date_range) == 2:
        start_date, end_date = date_range

    elif len(date_range) == 1:
        start_date = end_date = date_range[0]

    else:
        start_date, end_date = min_date, max_date

else:
    start_date = end_date = date_range

if start_date > end_date:
    st.sidebar.error("Invalid date range.")
    st.stop()

energy_filtered = energy_df[
    energy_df["timestamp"].dt.date.between(
        start_date,
        end_date
    )
].copy()

waste_filtered = waste_df[
    waste_df["timestamp"].dt.date.between(
        start_date,
        end_date
    )
].copy()

if energy_filtered.empty:
    st.warning("No records found for this date range.")
    st.stop()

machine_list = sorted(
    energy_filtered["machine_id"]
    .dropna()
    .astype(str)
    .unique()
)

selected_machine = st.sidebar.selectbox(
    "Choose Machine",
    ["All Machines"] + machine_list
)

product_list = sorted(
    energy_filtered["product_type"]
    .dropna()
    .astype(str)
    .unique()
)

selected_product = st.sidebar.selectbox(
    "Choose Product",
    ["All Products"] + product_list
)

if selected_machine != "All Machines":

    energy_filtered = energy_filtered[
        energy_filtered["machine_id"].astype(str)
        == selected_machine
    ]

    waste_filtered = waste_filtered[
        waste_filtered["machine_id"].astype(str)
        == selected_machine
    ]

if selected_product != "All Products":

    energy_filtered = energy_filtered[
        energy_filtered["product_type"].astype(str)
        == selected_product
    ]

    waste_filtered = waste_filtered[
        waste_filtered["product_type"].astype(str)
        == selected_product
    ]

if energy_filtered.empty:
    st.warning("No records available for selected filters.")
    st.stop()


# =====================================================
# 8. MACHINE-WISE AGGREGATION
# =====================================================

machine_summary = (
    energy_filtered.groupby("machine_id")
    .agg(
        total_energy=("energy_kwh", "sum"),
        total_production=("units_produced", "sum"),
        good_units=("good_units", "sum"),
        rejected_units=("rejected_units", "sum"),
        running_energy=("running_kwh", "sum"),
        idle_energy=("idle_kwh", "sum"),
        changeover_energy=("changeover_kwh", "sum"),
        production_hours=("production_hours", "sum"),
        idle_hours=("idle_hours", "sum"),
        changeover_hours=("changeover_hours", "sum")
    )
    .reset_index()
)

machine_summary["energy_per_good_unit"] = (
    machine_summary["total_energy"]
    / machine_summary["good_units"].replace(
        0, float("nan")
    )
)

machine_summary["rejection_rate"] = (
    machine_summary["rejected_units"]
    / machine_summary["total_production"].replace(
        0, float("nan")
    )
) * 100

machine_summary["electricity_cost"] = (
    energy_filtered.assign(
        calculated_cost=lambda x:
        x["energy_kwh"] * x["electricity_rate"]
    )
    .groupby("machine_id")["calculated_cost"]
    .sum()
    .reindex(machine_summary["machine_id"])
    .values
)


# =====================================================
# 9. MACHINE-WISE WASTE AGGREGATION
# =====================================================

if not waste_filtered.empty:

    waste_summary = (
        waste_filtered.groupby("machine_id")
        .agg(
            waste_energy=("waste_kwh", "sum"),
            waste_cost=("waste_cost", "sum"),
            waste_events=("id", "count")
        )
        .reset_index()
    )

else:

    waste_summary = pd.DataFrame(
        columns=[
            "machine_id",
            "waste_energy",
            "waste_cost",
            "waste_events"
        ]
    )

machine_summary = machine_summary.merge(
    waste_summary,
    on="machine_id",
    how="left"
)

for col in ["waste_energy", "waste_cost", "waste_events"]:

    machine_summary[col] = machine_summary[col].fillna(0)


# =====================================================
# 10. MACHINE PERFORMANCE OVERVIEW
# =====================================================

st.markdown(
    '<div class="section-heading">📊 Machine Performance Overview</div>',
    unsafe_allow_html=True
)

total_energy = machine_summary["total_energy"].sum()

total_good = machine_summary["good_units"].sum()

total_waste = machine_summary["waste_energy"].sum()

total_machine_count = machine_summary["machine_id"].nunique()

overall_energy_per_good = (
    total_energy / total_good if total_good > 0 else 0
)



# Create four dashboard columns
c1, c2, c3, c4 = st.columns([1.3, 1.5, 1.3, 1.3])

# Custom metric card styling
st.markdown("""
<style>
.metric-card {
    background-color: #14263d;
    border: 1px solid #294866;
    border-radius: 14px;
    padding: 16px 14px;
    min-height: 105px;
    width: 100%;
    box-sizing: border-box;
}

.metric-label {
    color: #ff9f43;
    font-size: 13px;
    font-weight: 600;
    margin-bottom: 12px;
    white-space: normal;
}

.metric-value {
    color: #ffffff;
    font-size: 21px;
    font-weight: 600;
    line-height: 1.3;
    white-space: normal;
    overflow-wrap: anywhere;
    word-break: break-word;
}
</style>
""", unsafe_allow_html=True)

with c1:
    st.markdown(f"""
    <div class="metric-card">
        <div class="metric-label">Total Energy</div>
        <div class="metric-value">{total_energy:,.2f} kWh</div>
    </div>
    """, unsafe_allow_html=True)

with c2:
    st.markdown(f"""
    <div class="metric-card">
        <div class="metric-label">Energy / Good Unit</div>
        <div class="metric-value">{overall_energy_per_good:,.3f} kWh</div>
    </div>
    """, unsafe_allow_html=True)

with c3:
    st.markdown(f"""
    <div class="metric-card">
        <div class="metric-label">Machine Waste</div>
        <div class="metric-value">{total_waste:,.2f} kWh</div>
    </div>
    """, unsafe_allow_html=True)

with c4:
    st.markdown(f"""
    <div class="metric-card">
        <div class="metric-label">Machines Analyzed</div>
        <div class="metric-value">{int(total_machine_count):,}</div>
    </div>
    """, unsafe_allow_html=True)


# =====================================================
# 11. MACHINE ENERGY COMPARISON
# =====================================================

st.markdown(
    '<div class="section-heading">⚡ Machine-wise Energy Consumption</div>',
    unsafe_allow_html=True
)

energy_chart = (
    machine_summary.set_index("machine_id")[
        "total_energy"
    ].sort_values(ascending=False)
)

st.bar_chart(
    energy_chart,
    use_container_width=True
)


# =====================================================
# 12. MACHINE ELECTRICITY COST
# =====================================================

st.markdown(
    '<div class="section-heading">💰 Machine-wise Electricity Cost</div>',
    unsafe_allow_html=True
)

cost_chart = (
    machine_summary.set_index("machine_id")[
        "electricity_cost"
    ].sort_values(ascending=False)
)

st.bar_chart(
    cost_chart,
    use_container_width=True
)

st.metric(
    "Total Machine Electricity Cost",
    f"₹ {machine_summary['electricity_cost'].sum():,.2f}"
)


# =====================================================
# 13. MACHINE ENERGY BREAKDOWN
# =====================================================

st.markdown(
    '<div class="section-heading">🔋 Running vs Idle vs Changeover Energy</div>',
    unsafe_allow_html=True
)

breakdown = machine_summary.set_index("machine_id")[
    [
        "running_energy",
        "idle_energy",
        "changeover_energy"
    ]
]

breakdown.columns = [
    "Running Energy",
    "Idle Energy",
    "Changeover Energy"
]

st.bar_chart(
    breakdown,
    use_container_width=True
)

idle_total = machine_summary["idle_energy"].sum()

idle_percentage = (
    idle_total / total_energy * 100
    if total_energy > 0 else 0
)

st.metric(
    "Idle Energy Percentage",
    f"{idle_percentage:.2f}%"
)


# =====================================================
# 14. MACHINE WASTE COMPARISON
# =====================================================

st.markdown(
    '<div class="section-heading">♻️ Machine-wise Waste Analysis</div>',
    unsafe_allow_html=True
)

if not machine_summary.empty:

    waste_chart = (
        machine_summary.set_index("machine_id")[
            "waste_energy"
        ].sort_values(ascending=False)
    )

    st.bar_chart(
        waste_chart,
        use_container_width=True
    )

    waste_col1, waste_col2, waste_col3 = st.columns(3)

    waste_col1.metric(
        "Waste Energy",
        f"{total_waste:,.2f} kWh"
    )

    waste_col2.metric(
        "Waste Cost",
        f"₹ {machine_summary['waste_cost'].sum():,.2f}"
    )

    waste_col3.metric(
        "Waste Events",
        f"{int(machine_summary['waste_events'].sum())}"
    )


# =====================================================
# 15. PRODUCTION AND REJECTION ANALYSIS
# =====================================================

st.markdown(
    '<div class="section-heading">🏭 Machine Production Analysis</div>',
    unsafe_allow_html=True
)

production_chart = machine_summary.set_index(
    "machine_id"
)[
    ["good_units", "rejected_units"]
]

production_chart.columns = [
    "Good Units",
    "Rejected Units"
]

st.bar_chart(
    production_chart,
    use_container_width=True
)


# =====================================================
# 16. MACHINE EFFICIENCY RANKING
# =====================================================

st.markdown(
    '<div class="section-heading">🏆 Machine Efficiency Ranking</div>',
    unsafe_allow_html=True
)

ranking = machine_summary[
    [
        "machine_id",
        "total_energy",
        "good_units",
        "energy_per_good_unit",
        "rejection_rate",
        "waste_energy"
    ]
].copy()

ranking = ranking.sort_values(
    "energy_per_good_unit",
    ascending=True,
    na_position="last"
)

ranking.insert(
    0,
    "Rank",
    range(1, len(ranking) + 1)
)

ranking.columns = [
    "Rank",
    "Machine",
    "Energy (kWh)",
    "Good Units",
    "Energy / Good Unit",
    "Rejection Rate (%)",
    "Waste Energy (kWh)"
]

st.dataframe(
    ranking,
    use_container_width=True,
    hide_index=True
)

st.caption(
    "Lower energy per good unit indicates better energy "
    "performance. Compare similar products and operating "
    "conditions before concluding that one machine is more efficient."
)


# =====================================================
# 17. INDIVIDUAL MACHINE DETAILS
# =====================================================

st.markdown(
    '<div class="section-heading">🔍 Individual Machine Details</div>',
    unsafe_allow_html=True
)

detail_machine = st.selectbox(
    "Select Machine for Detailed Analysis",
    machine_list,
    key="machine_detail"
)

machine_data = machine_summary[
    machine_summary["machine_id"].astype(str)
    == detail_machine
]

if not machine_data.empty:

    row = machine_data.iloc[0]

    a, b, c = st.columns(3)

    a.metric(
        "Total Energy",
        f"{row['total_energy']:,.2f} kWh"
    )

    b.metric(
        "Good Production",
        f"{row['good_units']:,.0f}"
    )

    c.metric(
        "Rejected Production",
        f"{row['rejected_units']:,.0f}"
    )

    a, b, c = st.columns(3)

    a.metric(
        "Running Energy",
        f"{row['running_energy']:,.2f} kWh"
    )

    b.metric(
        "Idle Energy",
        f"{row['idle_energy']:,.2f} kWh"
    )

    c.metric(
        "Changeover Energy",
        f"{row['changeover_energy']:,.2f} kWh"
    )

    a, b, c = st.columns(3)

    a.metric(
        "Waste Energy",
        f"{row['waste_energy']:,.2f} kWh"
    )

    b.metric(
        "Waste Cost",
        f"₹ {row['waste_cost']:,.2f}"
    )

    c.metric(
        "Waste Events",
        f"{int(row['waste_events'])}"
    )

    st.subheader("Selected Machine Production Records")

    selected_records = energy_filtered[
        energy_filtered["machine_id"].astype(str)
        == detail_machine
    ].sort_values(
        "timestamp",
        ascending=False
    )

    detail_columns = [
        "timestamp",
        "product_type",
        "energy_kwh",
        "units_produced",
        "good_units",
        "rejected_units",
        "machine_status"
    ]

    detail_columns = [
        col for col in detail_columns
        if col in selected_records.columns
    ]

    st.dataframe(
        selected_records[detail_columns],
        use_container_width=True,
        hide_index=True
    )


# =====================================================
# 18. DOWNLOAD MACHINE REPORT
# =====================================================

st.markdown("---")

st.subheader("📥 Download Machine Analysis Report")

csv_data = machine_summary.to_csv(
    index=False
).encode("utf-8")

st.download_button(
    "⬇ Download Machine Report",
    data=csv_data,
    file_name="wattwise_machine_analysis.csv",
    mime="text/csv"
)

st.caption(
    "WattWise | Smart Industrial Energy Monitoring"
)
