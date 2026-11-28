
import sqlite3
from pathlib import Path

import pandas as pd
import streamlit as st


# =====================================================
# 1. PAGE CONFIGURATION
# =====================================================

st.set_page_config(
    page_title="WattWise | Factory Dashboard",
    page_icon="⚡",
    layout="wide"
)

# Database path: WattWise4/wattwise.db
BASE_DIR = Path(__file__).resolve().parent.parent
DB_PATH = BASE_DIR / "wattwise.db"


# =====================================================
# 2. CUSTOM CSS
# =====================================================

st.markdown("""
<style>
    .main {
        background-color: #F5F7FA;
    }

    .block-container {
        padding-top: 1.5rem;
        padding-bottom: 2rem;
    }

    .dashboard-header {
        background: linear-gradient(120deg, #102A43, #176B87);
        padding: 25px;
        border-radius: 14px;
        color: white;
        margin-bottom: 22px;
    }

    .dashboard-header h1 {
        color: white;
        margin-bottom: 5px;
    }

    .dashboard-header p {
        color: #D9EAF2;
        margin-bottom: 0;
    }

    div[data-testid="stMetric"] {
        background: white;
        border: 1px solid #E5EAF0;
        padding: 16px;
        border-radius: 12px;
    }

    div[data-testid="stMetricLabel"] {
        color: #526579;
    }

    div[data-testid="stMetricValue"] {
        color: #102A43;
    }

    .section-heading {
        color: #102A43;
        font-weight: 700;
        font-size: 21px;
        margin-top: 15px;
    }
</style>
""", unsafe_allow_html=True)


# =====================================================
# 3. LOAD DATABASE
# =====================================================

@st.cache_data(ttl=30)
def load_database(db_path, modified_time):

    conn = sqlite3.connect(db_path)

    energy = pd.read_sql_query(
        "SELECT * FROM energy_records",
        conn
    )

    waste = pd.read_sql_query(
        "SELECT * FROM waste_events",
        conn
    )

    conn.close()

    return energy, waste


# =====================================================
# 4. CHECK DATABASE
# =====================================================

st.markdown("""
<div class="dashboard-header">
    <h1>⚡ WattWise Factory Dashboard</h1>
    <p>Smart Industrial Energy Monitoring and Waste Analytics</p>
</div>
""", unsafe_allow_html=True)

if not DB_PATH.exists():
    st.error(f"Database not found: {DB_PATH}")
    st.stop()

try:
    energy_df, waste_df = load_database(
        str(DB_PATH),
        DB_PATH.stat().st_mtime
    )
except Exception as error:
    st.error(f"Database loading error: {error}")
    st.stop()

if energy_df.empty:
    st.warning("No energy records available.")
    st.stop()


# =====================================================
# 5. DATA PREPARATION
# =====================================================

energy_df["timestamp"] = pd.to_datetime(
    energy_df["timestamp"],
    errors="coerce"
)

waste_df["timestamp"] = pd.to_datetime(
    waste_df["timestamp"],
    errors="coerce"
)

energy_numeric_columns = [
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

waste_numeric_columns = [
    "waste_kwh",
    "waste_cost"
]

for column in energy_numeric_columns:
    if column in energy_df.columns:
        energy_df[column] = pd.to_numeric(
            energy_df[column],
            errors="coerce"
        ).fillna(0)

for column in waste_numeric_columns:
    if column in waste_df.columns:
        waste_df[column] = pd.to_numeric(
            waste_df[column],
            errors="coerce"
        ).fillna(0)


# =====================================================
# 6. SIDEBAR FILTERS
# =====================================================

st.sidebar.title("📊 Dashboard Filters")

valid_dates = energy_df["timestamp"].dropna()

if valid_dates.empty:
    st.error("No valid timestamps found in energy_records.")
    st.stop()

min_date = valid_dates.min().date()
max_date = valid_dates.max().date()

selected_dates = st.sidebar.date_input(
    "Select Date Range",
    value=(min_date, max_date),
    min_value=min_date,
    max_value=max_date
)

if isinstance(selected_dates, (tuple, list)):
    if len(selected_dates) == 2:
        start_date, end_date = selected_dates
    elif len(selected_dates) == 1:
        start_date = end_date = selected_dates[0]
    else:
        start_date, end_date = min_date, max_date
else:
    start_date = end_date = selected_dates

if start_date > end_date:
    st.sidebar.error("Invalid date range.")
    st.stop()

machines = sorted(
    energy_df["machine_id"].dropna().astype(str).unique()
)

products = sorted(
    energy_df["product_type"].dropna().astype(str).unique()
)

selected_machine = st.sidebar.selectbox(
    "Select Machine",
    ["All Machines"] + machines
)

selected_product = st.sidebar.selectbox(
    "Select Product",
    ["All Products"] + products
)


# =====================================================
# 7. APPLY FILTERS
# =====================================================

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
    st.warning(
        "No energy records found for the selected filters."
    )
    st.stop()


# =====================================================
# 8. CALCULATE MAIN KPIs
# =====================================================

total_energy = energy_filtered["energy_kwh"].sum()

total_production = energy_filtered["units_produced"].sum()

total_good_units = energy_filtered["good_units"].sum()

total_rejected_units = energy_filtered["rejected_units"].sum()

total_cost = (
    energy_filtered["energy_kwh"]
    * energy_filtered["electricity_rate"]
).sum()

energy_per_good_unit = (
    total_energy / total_good_units
    if total_good_units > 0 else 0
)

total_waste_energy = waste_filtered["waste_kwh"].sum()

total_waste_cost = waste_filtered["waste_cost"].sum()

total_waste_events = len(waste_filtered)

rejection_rate = (
    total_rejected_units / total_production * 100
    if total_production > 0 else 0
)


# =====================================================
# 9. MAIN KPI CARDS
# =====================================================




# ==========================================
# DASHBOARD KPI CARDS - NO DOTS / TRUNCATION
# ==========================================

st.markdown("""
<style>
.metric-card {
    background-color: #14263d;
    border: 1px solid #294866;
    border-radius: 14px;
    padding: 16px 14px;
    min-height: 110px;
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
    font-size: 20px;
    font-weight: 600;
    line-height: 1.4;
    white-space: normal;
    overflow-wrap: anywhere;
    word-break: break-word;
}
</style>
""", unsafe_allow_html=True)


def show_metric_card(column, label, value):
    with column:
        st.markdown(f"""
        <div class="metric-card">
            <div class="metric-label">{label}</div>
            <div class="metric-value">{value}</div>
        </div>
        """, unsafe_allow_html=True)


# FIRST ROW - 4 KPI CARDS

col1, col2, col3, col4 = st.columns(4)

show_metric_card(
    col1,
    "Total Energy",
    f"{total_energy:,.2f} kWh"
)

show_metric_card(
    col2,
    "Electricity Cost",
    f"₹ {total_cost:,.2f}"
)

show_metric_card(
    col3,
    "Energy / Good Unit",
    f"{energy_per_good_unit:,.3f} kWh"
)

show_metric_card(
    col4,
    "Total Waste Energy",
    f"{total_waste_energy:,.2f} kWh"
)


# SECOND ROW - 4 KPI CARDS

col5, col6, col7, col8 = st.columns(4)

show_metric_card(
    col5,
    "Total Production",
    f"{total_production:,}"
)

show_metric_card(
    col6,
    "Good Units",
    f"{total_good_units:,}"
)

show_metric_card(
    col7,
    "Rejected Units",
    f"{total_rejected_units:,}"
)

show_metric_card(
    col8,
    "Rejection Rate",
    f"{rejection_rate:.2f}%"
)





# =====================================================
# 10. ENERGY CONSUMPTION TREND
# =====================================================

st.markdown(
    '<div class="section-heading">Energy Consumption Trend</div>',
    unsafe_allow_html=True
)

daily_energy = (
    energy_filtered.dropna(subset=["timestamp"])
    .assign(date=lambda df: df["timestamp"].dt.date)
    .groupby("date")["energy_kwh"]
    .sum()
    .reset_index()
)

if not daily_energy.empty:

    daily_energy["date"] = pd.to_datetime(
        daily_energy["date"]
    )

    st.line_chart(
        daily_energy.set_index("date"),
        y="energy_kwh",
        use_container_width=True
    )

else:
    st.info("No daily energy trend available.")


# =====================================================
# 11. MACHINE-WISE ENERGY CONSUMPTION
# =====================================================

st.markdown(
    '<div class="section-heading">Machine-wise Energy Consumption</div>',
    unsafe_allow_html=True
)

machine_energy = (
    energy_filtered.groupby("machine_id")["energy_kwh"]
    .sum()
    .sort_values(ascending=False)
)

if not machine_energy.empty:

    st.bar_chart(
        machine_energy,
        use_container_width=True
    )

    st.dataframe(
        machine_energy.reset_index().rename(
            columns={
                "machine_id": "Machine",
                "energy_kwh": "Energy (kWh)"
            }
        ),
        use_container_width=True,
        hide_index=True
    )


# =====================================================
# 12. PRODUCT-WISE ENERGY CONSUMPTION
# =====================================================

st.markdown(
    '<div class="section-heading">Product-wise Energy Consumption</div>',
    unsafe_allow_html=True
)

product_energy = (
    energy_filtered.groupby("product_type")["energy_kwh"]
    .sum()
    .sort_values(ascending=False)
)

if not product_energy.empty:

    st.bar_chart(
        product_energy,
        use_container_width=True
    )


# =====================================================
# 13. ENERGY BREAKDOWN
# =====================================================

st.markdown(
    '<div class="section-heading">Energy Utilization Breakdown</div>',
    unsafe_allow_html=True
)

running = energy_filtered["running_kwh"].sum()

idle = energy_filtered["idle_kwh"].sum()

changeover = energy_filtered["changeover_kwh"].sum()

breakdown = pd.DataFrame({
    "Energy Type": [
        "Running Energy",
        "Idle Energy",
        "Changeover Energy"
    ],
    "Energy (kWh)": [
        running,
        idle,
        changeover
    ]
})

left, right = st.columns(2)

with left:

    st.bar_chart(
        breakdown.set_index("Energy Type"),
        y="Energy (kWh)",
        use_container_width=True
    )

with right:

    if total_energy > 0:

        st.dataframe(
            breakdown,
            use_container_width=True,
            hide_index=True
        )

        st.metric(
            "Running Energy Percentage",
            f"{running / total_energy * 100:.2f}%"
        )


# =====================================================
# 14. WASTE ANALYSIS
# =====================================================

st.markdown(
    '<div class="section-heading">Waste Analysis</div>',
    unsafe_allow_html=True
)

if not waste_filtered.empty:

    waste_by_type = (
        waste_filtered.groupby("waste_type")["waste_kwh"]
        .sum()
        .sort_values(ascending=False)
    )

    left, right = st.columns(2)

    with left:

        st.subheader("Waste by Type")

        st.bar_chart(waste_by_type)

    with right:

        st.subheader("Waste Severity")

        severity_counts = (
            waste_filtered["severity"]
            .fillna("Unknown")
            .value_counts()
        )

        st.bar_chart(severity_counts)

    waste_col1, waste_col2, waste_col3 = st.columns(3)

    waste_col1.metric(
        "Waste Events",
        f"{total_waste_events:,}"
    )

    waste_col2.metric(
        "Waste Energy",
        f"{total_waste_energy:,.2f} kWh"
    )

    waste_col3.metric(
        "Waste Cost",
        f"₹ {total_waste_cost:,.2f}"
    )

else:

    st.info("No waste events found for the selected filters.")


# =====================================================
# 15. MACHINE STATUS
# =====================================================

st.markdown(
    '<div class="section-heading">Machine Status Overview</div>',
    unsafe_allow_html=True
)

if "machine_status" in energy_filtered.columns:

    machine_status = (
        energy_filtered["machine_status"]
        .fillna("Unknown")
        .value_counts()
    )

    st.bar_chart(machine_status)


# =====================================================
# 16. RECENT WASTE EVENTS
# =====================================================

st.markdown(
    '<div class="section-heading">Recent Waste Events</div>',
    unsafe_allow_html=True
)

if not waste_filtered.empty:

    recent_events = waste_filtered.sort_values(
        "timestamp",
        ascending=False
    ).head(10)

    display_columns = [
        "timestamp",
        "machine_id",
        "product_type",
        "waste_type",
        "severity",
        "waste_kwh",
        "waste_cost",
        "recommendation"
    ]

    display_columns = [
        column for column in display_columns
        if column in recent_events.columns
    ]

    st.dataframe(
        recent_events[display_columns],
        use_container_width=True,
        hide_index=True
    )

else:

    st.info("No recent waste events available.")


# =====================================================
# 17. DOWNLOAD REPORT
# =====================================================

st.markdown(
    '<div class="section-heading">Download Factory Report</div>',
    unsafe_allow_html=True
)

report = energy_filtered.copy()

csv_data = report.to_csv(index=False).encode("utf-8")

st.download_button(
    label="⬇ Download Energy Report (CSV)",
    data=csv_data,
    file_name="wattwise_energy_report.csv",
    mime="text/csv"
)

if not waste_filtered.empty:

    waste_csv = waste_filtered.to_csv(
        index=False
    ).encode("utf-8")

    st.download_button(
        label="⬇ Download Waste Report (CSV)",
        data=waste_csv,
        file_name="wattwise_waste_report.csv",
        mime="text/csv"
    )


# =====================================================
# 18. FOOTER
# =====================================================

st.markdown("---")

st.caption(
    "WattWise | Smart Industrial Energy Monitoring "
    "and Waste Analytics"
)
