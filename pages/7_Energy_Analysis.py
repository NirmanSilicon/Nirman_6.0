
# ==========================================
# WATTWISE - PHASE 4
# ENERGY ANALYSIS DASHBOARD
# ==========================================

import streamlit as st
import pandas as pd

from modules.energy_analysis import (
    load_energy_data,
    run_complete_analysis
)


# ------------------------------------------
# PAGE CONFIGURATION
# ------------------------------------------

st.set_page_config(
    page_title="WattWise | Energy Analysis",
    page_icon="⚡",
    layout="wide"
)


# ------------------------------------------
# CUSTOM DESIGN
# ------------------------------------------

st.markdown(
"""
<style>

.stApp {
    background-color: #081321;
    color: #F1F5F9;
}

section[data-testid="stSidebar"] {
    background-color: #101E32;
}

div[data-testid="stMetric"] {
    background-color: #142238;
    border: 1px solid #293E59;
    padding: 18px;
    border-radius: 12px;
}

div[data-testid="stMetricLabel"] {
    color: #94A3B8;
}

div[data-testid="stMetricValue"] {
    color: #38BDF8;
}

h1, h2, h3 {
    color: #F1F5F9;
}


/* Improved KPI card number formatting */

[data-testid="stMetric"] {
    background: #15243A;
    border: 1px solid #293E59;
    border-radius: 14px;
    padding: 18px 14px;
    min-height: 110px;
}

[data-testid="stMetricValue"] {
    font-size: clamp(18px, 2vw, 25px) !important;
    white-space: normal !important;
    overflow-wrap: anywhere !important;
    word-break: normal !important;
    line-height: 1.3 !important;
}

[data-testid="stMetricLabel"] {
    font-size: 13px !important;
    font-weight: 600 !important;
    white-space: normal !important;
}

[data-testid="stMetricDelta"] {
    font-size: 12px !important;
}

</style>
""",
unsafe_allow_html=True
)


# ------------------------------------------
# HEADER
# ------------------------------------------

st.markdown(
"""
<div style="background:linear-gradient(135deg,#142238,#123B5A);
            padding:25px; border-radius:15px;
            border:1px solid #295477;">

<div style="color:#38BDF8;font-size:12px;
            font-weight:800;letter-spacing:2px;">
WATTWISE INTELLIGENCE CENTER
</div>

<h1 style="color:white;margin-top:10px;">
⚡ Industrial Energy Analysis
</h1>

<p style="color:#B8C9DC;">
Analyze machine consumption, production efficiency,
electricity costs and potential energy wastage.
</p>

</div>
""",
unsafe_allow_html=True
)

st.write("")


# ------------------------------------------
# LOAD DATABASE
# ------------------------------------------

try:

    raw_data = load_energy_data()

except Exception as error:

    st.error(f"Database loading error: {error}")
    st.stop()


if raw_data.empty:

    st.warning(
        "No factory records found. "
        "Please upload a CSV file first."
    )

    st.page_link(
        "pages/6_Factory_Data_Upload.py",
        label="📤 Upload Factory Data",
        use_container_width=True
    )

    st.stop()


# ------------------------------------------
# SIDEBAR FILTERS
# ------------------------------------------

st.sidebar.markdown(
    "## ⚙️ Analysis Filters"
)

raw_data["timestamp"] = pd.to_datetime(
    raw_data["timestamp"],
    errors="coerce"
)

raw_data = raw_data.dropna(
    subset=["timestamp"]
)

if raw_data.empty:

    st.error("No valid timestamp records found.")
    st.stop()


min_date = raw_data["timestamp"].min().date()
max_date = raw_data["timestamp"].max().date()

selected_dates = st.sidebar.date_input(
    "Select Date Range",
    value=(min_date, max_date),
    min_value=min_date,
    max_value=max_date
)

if isinstance(selected_dates, (tuple, list)):

    if len(selected_dates) == 2:
        start_date, end_date = selected_dates
    else:
        start_date = selected_dates[0]
        end_date = selected_dates[0]

else:

    start_date = selected_dates
    end_date = selected_dates


machine_options = sorted(
    raw_data["machine_id"]
    .dropna()
    .astype(str)
    .unique()
)

selected_machines = st.sidebar.multiselect(
    "Select Machines",
    machine_options,
    default=machine_options
)


product_options = sorted(
    raw_data["product_type"]
    .dropna()
    .astype(str)
    .unique()
)

selected_products = st.sidebar.multiselect(
    "Select Products",
    product_options,
    default=product_options
)


# ------------------------------------------
# FILTER DATA
# ------------------------------------------

filtered_data = raw_data[
    (raw_data["timestamp"].dt.date >= start_date)
    &
    (raw_data["timestamp"].dt.date <= end_date)
    &
    (raw_data["machine_id"].astype(str).isin(selected_machines))
    &
    (raw_data["product_type"].astype(str).isin(selected_products))
].copy()


if filtered_data.empty:

    st.warning(
        "No records match the selected filters. "
        "Please change your date, machine or product selection."
    )

    st.stop()


# ------------------------------------------
# RUN ENERGY ANALYSIS
# ------------------------------------------

try:

    analyzed_data, machine_data, product_data = (
        run_complete_analysis(filtered_data)
    )

except Exception as error:

    st.error(f"Energy analysis failed: {error}")
    st.stop()


if analyzed_data.empty:

    st.warning("No valid data available for analysis.")
    st.stop()


# ------------------------------------------
# SECTION 1: KPI DASHBOARD
# ------------------------------------------

st.markdown("## 📊 Energy Performance Overview")

total_energy = analyzed_data["energy_kwh"].sum()

total_good_units = analyzed_data["good_units"].sum()

total_cost = analyzed_data["electricity_cost"].sum()

total_excess = analyzed_data["excess_energy_kwh"].sum()

total_idle = analyzed_data["idle_kwh"].sum()

total_production = analyzed_data["units_produced"].sum()

energy_per_unit = (
    total_energy / total_good_units
    if total_good_units > 0 else 0
)

rejection_rate = (
    analyzed_data["rejected_units"].sum()
    / total_production * 100
    if total_production > 0 else 0
)

col1, col2, col3, col4 = st.columns(4)

col1.metric(
    label="Total Energy",
    value=f"{total_energy:,.2f} kWh"
)

col2.metric(
    "Electricity Cost",
    value=f"₹ {total_cost:,.2f}"
)

col3.metric(
    "Energy / Good Unit",
    value=f"{energy_per_unit:.3f} kWh"
)

col4.metric(
    "Potential Excess Energy",
    value=f"{total_excess:,.2f} kWh"
)

col5, col6, col7 = st.columns(3)

col5.metric(
    "Idle Energy",
    value=f"{total_idle:,.2f} kWh"
)

col6.metric(
    "Good Units Produced",
    value=f"{total_good_units:,.0f}"
)

col7.metric(
    "Rejection Rate",
    value=f"{rejection_rate:.2f}%"
)


st.divider()


# ------------------------------------------
# SECTION 2: ENERGY BREAKDOWN
# ------------------------------------------

st.markdown("## ⚡ Energy Consumption Breakdown")

energy_breakdown = pd.DataFrame({
    "Energy Type": [
        "Running Energy",
        "Idle Energy",
        "Changeover Energy"
    ],
    "Consumption (kWh)": [
        analyzed_data["running_kwh"].sum(),
        analyzed_data["idle_kwh"].sum(),
        analyzed_data["changeover_kwh"].sum()
    ]
})

col1, col2 = st.columns(2)

with col1:

    st.markdown("### Energy Distribution")

    st.bar_chart(
        energy_breakdown.set_index("Energy Type")
    )

with col2:

    st.markdown("### Energy Details")

    st.dataframe(
        energy_breakdown,
        use_container_width=True,
        hide_index=True
    )


st.divider()


# ------------------------------------------
# SECTION 3: MACHINE-WISE ANALYSIS
# ------------------------------------------

st.markdown("## 🏭 Machine-wise Performance")

machine_display = machine_data[
    [
        "efficiency_rank",
        "machine_id",
        "total_energy_kwh",
        "total_good_units",
        "energy_per_good_unit",
        "total_idle_energy",
        "total_excess_energy",
        "total_electricity_cost"
    ]
].copy()

machine_display.columns = [
    "Rank",
    "Machine",
    "Total Energy (kWh)",
    "Good Units",
    "Energy / Good Unit",
    "Idle Energy (kWh)",
    "Excess Energy (kWh)",
    "Electricity Cost (₹)"
]

st.dataframe(
    machine_display,
    use_container_width=True,
    hide_index=True
)


st.markdown("### Machine Energy Consumption")

machine_chart = machine_data.set_index(
    "machine_id"
)[["total_energy_kwh"]]

st.bar_chart(machine_chart)


st.markdown("### Machine Efficiency Ranking")

st.caption(
    "Lower energy consumption per good unit indicates "
    "better observed energy intensity."
)

ranking_chart = machine_data.dropna(
    subset=["energy_per_good_unit"]
).set_index("machine_id")[["energy_per_good_unit"]]

if not ranking_chart.empty:

    st.bar_chart(ranking_chart)


st.divider()


# ------------------------------------------
# SECTION 4: PRODUCT-WISE ANALYSIS
# ------------------------------------------

st.markdown("## 📦 Product-wise Energy Analysis")

product_display = product_data[
    [
        "product_type",
        "total_energy_kwh",
        "total_good_units",
        "energy_per_good_unit",
        "rejection_percentage",
        "total_excess_energy",
        "total_electricity_cost"
    ]
].copy()

product_display.columns = [
    "Product",
    "Energy (kWh)",
    "Good Units",
    "Energy / Good Unit",
    "Rejection (%)",
    "Excess Energy (kWh)",
    "Cost (₹)"
]

st.dataframe(
    product_display,
    use_container_width=True,
    hide_index=True
)


st.divider()


# ------------------------------------------
# SECTION 5: ENERGY WASTAGE ANALYSIS
# ------------------------------------------

st.markdown("## 🚨 Energy Wastage Analysis")

col1, col2 = st.columns(2)

with col1:

    st.metric(
        "Idle Energy Consumption",
        f"{total_idle:,.2f} kWh"
    )

    idle_hours = analyzed_data["idle_hours"].sum()

    st.metric(
        "Total Idle Hours",
        f"{idle_hours:,.2f} hours"
    )

with col2:

    changeover_energy = (
        analyzed_data["changeover_kwh"].sum()
    )

    changeover_hours = (
        analyzed_data["changeover_hours"].sum()
    )

    st.metric(
        "Changeover Energy",
        f"{changeover_energy:,.2f} kWh"
    )

    st.metric(
        "Changeover Hours",
        f"{changeover_hours:,.2f} hours"
    )


st.markdown("### Potential Excess Energy by Machine")

excess_chart = machine_data.set_index(
    "machine_id"
)[["total_excess_energy"]]

st.bar_chart(excess_chart)


# ------------------------------------------
# SECTION 6: ELECTRICITY COST ANALYSIS
# ------------------------------------------

st.markdown("## 💰 Electricity Cost Analysis")

cost_data = (
    analyzed_data.groupby("machine_id")[
        "electricity_cost"
    ]
    .sum()
    .reset_index()
)

cost_data.columns = [
    "Machine",
    "Electricity Cost (₹)"
]

st.bar_chart(
    cost_data.set_index("Machine")
)

st.dataframe(
    cost_data,
    use_container_width=True,
    hide_index=True
)


st.divider()


# ------------------------------------------
# SECTION 7: ENERGY INSIGHTS
# ------------------------------------------

st.markdown("## 💡 Automated Energy Insights")

highest_machine = machine_data.sort_values(
    "total_energy_kwh",
    ascending=False
).iloc[0]

best_machine = machine_data.dropna(
    subset=["energy_per_good_unit"]
)

if not best_machine.empty:

    best_machine = best_machine.sort_values(
        "energy_per_good_unit"
    ).iloc[0]

else:

    best_machine = None


st.info(
    f"⚡ Highest energy-consuming machine: "
    f"{highest_machine['machine_id']} "
    f"({highest_machine['total_energy_kwh']:.2f} kWh)"
)


if best_machine is not None:

    st.success(
        f"🏆 Best observed energy intensity: "
        f"{best_machine['machine_id']} "
        f"({best_machine['energy_per_good_unit']:.3f} "
        f"kWh per good unit)"
    )


if total_idle > 0:

    st.warning(
        f"⚠️ Your selected records contain "
        f"{total_idle:.2f} kWh of idle energy. "
        "Review machine idle schedules and shutdown practices."
    )


if total_excess > 0:

    st.warning(
        f"⚠️ {total_excess:.2f} kWh of energy is above "
        "the estimated product-specific baseline. "
        "Investigate the machines and production conditions."
    )


if rejection_rate > 5:

    st.warning(
        "Production rejection rate is above 5%. "
        "Review quality and machine operating conditions."
    )

elif total_production > 0:

    st.success(
        "Production rejection rate is at or below 5%."
    )


# ------------------------------------------
# SECTION 8: DOWNLOAD ANALYSIS REPORT
# ------------------------------------------

st.divider()

st.markdown("## 📥 Download Energy Analysis Report")

report = analyzed_data.copy()

report["timestamp"] = (
    report["timestamp"].dt.strftime("%Y-%m-%d %H:%M:%S")
)

csv_report = report.to_csv(
    index=False
).encode("utf-8")

st.download_button(
    label="📥 Download Complete Energy Analysis CSV",
    data=csv_report,
    file_name="wattwise_energy_analysis.csv",
    mime="text/csv",
    use_container_width=True
)


machine_csv = machine_data.to_csv(
    index=False
).encode("utf-8")

st.download_button(
    label="📥 Download Machine Performance Report",
    data=machine_csv,
    file_name="wattwise_machine_performance.csv",
    mime="text/csv",
    use_container_width=True
)


st.success(
    "WattWise Energy Analysis completed successfully!"
)
