
# ==========================================
# WATTWISE - PHASE 6
# PRODUCTION ANALYSIS DASHBOARD
# ==========================================

import streamlit as st
import pandas as pd

from modules.energy_analysis import (
    load_energy_data,
    run_complete_analysis
)


# ------------------------------------------
# 1. PAGE CONFIGURATION
# ------------------------------------------

st.set_page_config(
    page_title="WattWise | Production Analysis",
    page_icon="📦",
    layout="wide"
)


# ------------------------------------------
# 2. CUSTOM DESIGN
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

h1, h2, h3 {
    color: #F1F5F9;
}

div[data-testid="stMetric"] {
    background-color: #15243A;
    border: 1px solid #293E59;
    border-radius: 14px;
    padding: 18px;
    min-height: 110px;
}

div[data-testid="stMetricLabel"] {
    color: #CBD5E1 !important;
    font-size: 13px !important;
    font-weight: 600 !important;
}

div[data-testid="stMetricValue"] {
    color: #38BDF8 !important;
    font-size: clamp(18px, 2vw, 26px) !important;
    white-space: normal !important;
    overflow-wrap: anywhere !important;
}

.stDataFrame {
    border: 1px solid #293E59;
    border-radius: 10px;
}

</style>
""",
unsafe_allow_html=True
)


# ------------------------------------------
# 3. PAGE HEADER
# ------------------------------------------

st.markdown(
"""
<div style="
    background:linear-gradient(135deg,#142238,#123B5A);
    padding:25px;
    border-radius:15px;
    border:1px solid #295477;
">

<div style="
    color:#ffbd69;
    font-size:12px;
    font-weight:800;
    letter-spacing:3px;
">
WATTWISE INTELLIGENCE CENTER
</div>

<h1 style="
    color:#ff9f43 !important;
    margin-top:10px;
">
📦 Production Analysis
</h1>

<p style="color:#D1DCE8;">
Monitor factory production, product efficiency,
quality performance and energy consumption.
</p>

</div>
""",
unsafe_allow_html=True
)

st.write("")


# ------------------------------------------
# 4. LOAD DATABASE
# ------------------------------------------

try:

    raw_data = load_energy_data()

except Exception as error:

    st.error(f"Database loading error: {error}")
    st.stop()


if raw_data.empty:

    st.warning("No factory records available.")

    st.stop()


required_columns = [
    "timestamp",
    "machine_id",
    "product_type",
    "energy_kwh",
    "units_produced",
    "good_units",
    "rejected_units"
]

missing_columns = [
    col for col in required_columns
    if col not in raw_data.columns
]

if missing_columns:

    st.error(
        "Missing required database columns: "
        + ", ".join(missing_columns)
    )

    st.stop()


# ------------------------------------------
# 5. SIDEBAR FILTERS
# ------------------------------------------

st.sidebar.markdown("## ⚙️ Production Filters")

raw_data["timestamp"] = pd.to_datetime(
    raw_data["timestamp"],
    errors="coerce"
)

raw_data = raw_data.dropna(
    subset=["timestamp"]
)

if raw_data.empty:

    st.error("No valid production timestamps found.")
    st.stop()


min_date = raw_data["timestamp"].min().date()
max_date = raw_data["timestamp"].max().date()

selected_dates = st.sidebar.date_input(
    "Production Date Range",
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
# 6. FILTER DATA
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

    st.warning("No records match the selected filters.")

    st.stop()


# ------------------------------------------
# 7. RUN ENERGY ANALYSIS ENGINE
# ------------------------------------------

try:

    analyzed_data, machine_data, product_data = (
        run_complete_analysis(filtered_data)
    )

except Exception as error:

    st.error(f"Production analysis failed: {error}")
    st.stop()


if analyzed_data.empty or product_data.empty:

    st.warning("No valid production data available.")

    st.stop()


# ------------------------------------------
# 8. PRODUCTION KPI CALCULATIONS
# ------------------------------------------

total_production = analyzed_data[
    "units_produced"
].sum()

total_good = analyzed_data[
    "good_units"
].sum()

total_rejected = analyzed_data[
    "rejected_units"
].sum()

total_energy = analyzed_data[
    "energy_kwh"
].sum()

total_cost = analyzed_data[
    "electricity_cost"
].sum()

total_excess = analyzed_data[
    "excess_energy_kwh"
].sum()

total_waste_cost = analyzed_data[
    "excess_energy_cost"
].sum()

production_efficiency = (
    total_good / total_production * 100
    if total_production > 0 else 0
)

rejection_rate = (
    total_rejected / total_production * 100
    if total_production > 0 else 0
)

energy_per_good_unit = (
    total_energy / total_good
    if total_good > 0 else 0
)


# ------------------------------------------
# 9. PRODUCTION OVERVIEW
# ------------------------------------------

st.markdown("## 📊 Production Performance Overview")

col1, col2, col3, col4 = st.columns(4)

col1.metric(
    "Total Production",
    f"{total_production:,.0f} Units"
)

col2.metric(
    "Good Units",
    f"{total_good:,.0f}"
)

col3.metric(
    "Rejected Units",
    f"{total_rejected:,.0f}"
)

col4.metric(
    "Production Efficiency",
    f"{production_efficiency:.2f}%"
)


col5, col6, col7, col8 = st.columns(4)

col5.metric(
    "Rejection Rate",
    f"{rejection_rate:.2f}%"
)

col6.metric(
    "Total Energy",
    f"{total_energy:,.2f} kWh"
)

col7.metric(
    "Energy / Good Unit",
    f"{energy_per_good_unit:.3f} kWh"
)

col8.metric(
    "Electricity Cost",
    f"₹ {total_cost:,.2f}"
)


st.divider()


# ------------------------------------------
# 10. PRODUCT-WISE PRODUCTION ANALYSIS
# ------------------------------------------

st.markdown("## 📦 Product-wise Production Comparison")

product_summary = (
    analyzed_data.groupby("product_type")
    .agg(
        total_production=("units_produced", "sum"),
        total_good_units=("good_units", "sum"),
        total_rejected_units=("rejected_units", "sum"),
        total_energy_kwh=("energy_kwh", "sum"),
        total_cost=("electricity_cost", "sum"),
        total_excess_energy=("excess_energy_kwh", "sum")
    )
    .reset_index()
)

product_summary["production_efficiency"] = (
    product_summary["total_good_units"]
    / product_summary["total_production"].replace(0, float("nan"))
) * 100

product_summary["rejection_percentage"] = (
    product_summary["total_rejected_units"]
    / product_summary["total_production"].replace(0, float("nan"))
) * 100

product_summary["energy_per_good_unit"] = (
    product_summary["total_energy_kwh"]
    / product_summary["total_good_units"].replace(0, float("nan"))
)

product_summary = product_summary.sort_values(
    "energy_per_good_unit",
    ascending=True,
    na_position="last"
)


product_display = product_summary.copy()

product_display.columns = [
    "Product",
    "Total Production",
    "Good Units",
    "Rejected Units",
    "Energy (kWh)",
    "Electricity Cost (₹)",
    "Excess Energy (kWh)",
    "Production Efficiency (%)",
    "Rejection (%)",
    "Energy / Good Unit"
]

st.dataframe(
    product_display.round(3),
    use_container_width=True,
    hide_index=True
)


st.divider()


# ------------------------------------------
# 11. PRODUCT-WISE PRODUCTION CHART
# ------------------------------------------

st.markdown("## 📈 Product Production Comparison")

production_chart = product_summary.set_index(
    "product_type"
)[[
    "total_good_units",
    "total_rejected_units"
]]

production_chart.columns = [
    "Good Units",
    "Rejected Units"
]

st.bar_chart(production_chart)


st.divider()


# ------------------------------------------
# 12. QUALITY ANALYSIS
# ------------------------------------------

st.markdown("## 🎯 Production Quality Analysis")

col1, col2 = st.columns(2)

with col1:

    st.markdown("### Good vs Rejected Production")

    quality_data = pd.DataFrame({
        "Production Type": [
            "Good Units",
            "Rejected Units"
        ],
        "Units": [
            total_good,
            total_rejected
        ]
    })

    st.bar_chart(
        quality_data.set_index("Production Type")
    )


with col2:

    st.markdown("### Product Rejection Rate")

    rejection_chart = product_summary.set_index(
        "product_type"
    )[["rejection_percentage"]]

    st.bar_chart(rejection_chart)


st.divider()


# ------------------------------------------
# 13. PRODUCT ENERGY ANALYSIS
# ------------------------------------------

st.markdown("## ⚡ Product-wise Energy Performance")

col1, col2 = st.columns(2)

with col1:

    st.markdown("### Energy Consumption by Product")

    energy_chart = product_summary.set_index(
        "product_type"
    )[["total_energy_kwh"]]

    st.bar_chart(energy_chart)


with col2:

    st.markdown("### Energy per Good Unit")

    intensity_chart = product_summary.dropna(
        subset=["energy_per_good_unit"]
    ).set_index("product_type")[[
        "energy_per_good_unit"
    ]]

    st.bar_chart(intensity_chart)


st.divider()


# ------------------------------------------
# 14. PRODUCTION COST ANALYSIS
# ------------------------------------------

st.markdown("## 💰 Product-wise Electricity Cost")

cost_chart = product_summary.set_index(
    "product_type"
)[["total_cost"]]

st.bar_chart(cost_chart)

cost_display = product_summary[[
    "product_type",
    "total_cost",
    "total_energy_kwh"
]].copy()

cost_display.columns = [
    "Product",
    "Electricity Cost (₹)",
    "Energy Consumption (kWh)"
]

st.dataframe(
    cost_display.round(2),
    use_container_width=True,
    hide_index=True
)


st.divider()


# ------------------------------------------
# 15. PRODUCT PERFORMANCE RANKING
# ------------------------------------------

st.markdown("## 🏆 Product Performance Ranking")

ranking = product_summary.dropna(
    subset=["energy_per_good_unit"]
).copy()

ranking = ranking.sort_values(
    "energy_per_good_unit",
    ascending=True
)

if not ranking.empty:

    ranking_display = ranking[[
        "product_type",
        "energy_per_good_unit",
        "production_efficiency",
        "rejection_percentage"
    ]].copy()

    ranking_display.insert(
        0,
        "Rank",
        range(1, len(ranking_display) + 1)
    )

    ranking_display.columns = [
        "Rank",
        "Product",
        "Energy / Good Unit",
        "Production Efficiency (%)",
        "Rejection (%)"
    ]

    st.dataframe(
        ranking_display.round(3),
        use_container_width=True,
        hide_index=True
    )

else:

    st.info("Insufficient good production data for ranking.")


st.caption(
    "Ranking is based on observed energy consumed per good unit. "
    "Products with different manufacturing requirements "
    "should be compared cautiously."
)


st.divider()


# ------------------------------------------
# 16. AUTOMATED PRODUCTION INSIGHTS
# ------------------------------------------

st.markdown("## 💡 Automated Production Insights")

if total_production > 0:

    st.info(
        f"🏭 Your selected records contain "
        f"{total_production:,.0f} total production units."
    )

    st.success(
        f"✅ {total_good:,.0f} good units produced "
        f"with an observed production efficiency "
        f"of {production_efficiency:.2f}%."
    )

    if rejection_rate > 5:

        st.warning(
            f"⚠️ Rejection rate is {rejection_rate:.2f}%. "
            "Investigate quality control and machine settings."
        )

    else:

        st.success(
            f"Production rejection rate is "
            f"{rejection_rate:.2f}%."
        )


if not ranking.empty:

    best_product = ranking.iloc[0]

    st.success(
        f"🏆 Lowest observed energy intensity: "
        f"{best_product['product_type']} "
        f"({best_product['energy_per_good_unit']:.3f} "
        f"kWh per good unit)."
    )


if total_rejected > 0:

    st.warning(
        f"Review {total_rejected:,.0f} rejected units "
        "to identify possible production quality improvements."
    )


if total_excess > 0:

    st.warning(
        f"Potential excess energy across selected production "
        f"records: {total_excess:,.2f} kWh."
    )


st.info(
    f"Estimated electricity cost associated with excess "
    f"energy: ₹ {total_waste_cost:,.2f}."
)


st.divider()


# ------------------------------------------
# 17. DOWNLOAD PRODUCTION REPORT
# ------------------------------------------

st.markdown("## 📥 Download Production Reports")

production_csv = product_summary.to_csv(
    index=False
).encode("utf-8")

st.download_button(
    label="📥 Download Product Performance Report",
    data=production_csv,
    file_name="wattwise_product_performance.csv",
    mime="text/csv",
    use_container_width=True
)


complete_report = analyzed_data.copy()

complete_report["timestamp"] = (
    complete_report["timestamp"]
    .dt.strftime("%Y-%m-%d %H:%M:%S")
)

complete_csv = complete_report.to_csv(
    index=False
).encode("utf-8")

st.download_button(
    label="📥 Download Complete Production Records",
    data=complete_csv,
    file_name="wattwise_complete_production_report.csv",
    mime="text/csv",
    use_container_width=True
)


# ------------------------------------------
# 18. COMPLETION MESSAGE
# ------------------------------------------

st.success(
    "WattWise Production Analysis completed successfully!"
)
