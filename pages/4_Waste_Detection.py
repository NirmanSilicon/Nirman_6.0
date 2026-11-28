
import streamlit as st
import pandas as pd
import plotly.express as px

from modules.energy_analysis import (
    load_energy_data,
    run_complete_analysis
)

from modules.detection import (
    detect_waste,
    save_waste_events,
    get_waste_events
)


# ==================================================
# 1. PAGE CONFIGURATION
# ==================================================

st.set_page_config(
    page_title="WattWise | Waste Detection",
    page_icon="🚨",
    layout="wide"
)


# ==================================================
# 2. DARK THEME STYLING
# ==================================================

st.markdown("""
<style>

.stApp {
    background-color: #081321;
    color: #F1F5F9;
}

section[data-testid="stSidebar"] {
    background-color: #101E32;
}

h1, h2, h3, h4, p, label {
    color: #F1F5F9 !important;
}

.metric-card {
    background: #15243A;
    padding: 20px;
    border-radius: 12px;
    border: 1px solid #263B56;
}

.metric-label {
    color: #AABBD0;
    font-size: 13px;
}

.metric-value {
    color: #FFAD42;
    font-size: 27px;
    font-weight: bold;
}

.section-heading {
    color: #FFAD42;
    font-size: 22px;
    font-weight: bold;
    margin-top: 25px;
}

div[data-testid="stDataFrame"] {
    background-color: #15243A;
}

.stButton button {
    background-color: #F59E0B;
    color: #081321;
    font-weight: bold;
    border-radius: 8px;
    border: none;
}

.stButton button:hover {
    background-color: #FDBA42;
    color: #081321;
}

</style>
""", unsafe_allow_html=True)


# ==================================================
# 3. PAGE HEADER
# ==================================================

st.markdown("""
<div style="margin-bottom:8px;">
    <span style="
        color:#FFAD42;
        font-size:12px;
        font-weight:800;
        letter-spacing:3px;">
        🚨 SMART INDUSTRIAL ENERGY MONITORING
    </span>
</div>
""", unsafe_allow_html=True)

st.title("Waste Detection & Monitoring")

st.markdown(
    "Identify energy wastage, abnormal machine behaviour, "
    "production rejection and opportunities to reduce factory costs."
)

st.divider()


# ==================================================
# 4. RECOMMENDATIONS
# ==================================================

recommendations = {
    "Idle Energy Waste":
        "Switch off or place machines in standby mode during "
        "unnecessary idle periods. Review machine shutdown schedules.",

    "Excess Energy Consumption":
        "Inspect machine operating conditions, motors and equipment. "
        "Compare actual energy consumption with the production baseline.",

    "Changeover Energy Waste":
        "Reduce machine changeover time through better production "
        "planning and standardized changeover procedures.",

    "High Product Rejection":
        "Inspect raw materials, machine calibration and production "
        "quality settings to reduce rejected units.",

    "Abnormal Energy Usage":
        "Inspect the machine for inefficient operation, maintenance "
        "issues or unexpected energy consumption."
}


# ==================================================
# 5. LOAD SAVED WASTE EVENTS
# ==================================================

try:
    waste_data = get_waste_events()

except Exception as e:
    st.error(f"Unable to load waste events: {e}")
    st.stop()


# ==================================================
# 6. RUN WASTE DETECTION BUTTON
# ==================================================

st.markdown(
    '<div class="section-heading">Run Waste Detection</div>',
    unsafe_allow_html=True
)

st.write(
    "Run the detection engine on your existing factory energy records. "
    "Previously saved events will not be duplicated."
)

if st.button("🚀 Run Waste Detection", use_container_width=True):

    try:
        with st.spinner("Analyzing factory energy records..."):

            raw_data = load_energy_data()

            if raw_data.empty:
                st.warning("No factory energy records found.")
                st.stop()

            analyzed_data, machine_data, product_data = (
                run_complete_analysis(raw_data)
            )

            detected_events = detect_waste(analyzed_data)

            if detected_events.empty:
                st.info("No waste events were detected in the available records.")

            else:
                detected_events["recommendation"] = (
                    detected_events["waste_type"]
                    .map(recommendations)
                    .fillna("Inspect the machine and review its energy usage.")
                )

                saved_count = save_waste_events(detected_events)

                st.success(
                    f"Detection completed! "
                    f"{len(detected_events)} events detected; "
                    f"{saved_count} new events saved."
                )

        st.rerun()

    except Exception as e:
        st.error(f"Waste detection failed: {e}")


st.divider()


# ==================================================
# 7. REFRESH SAVED EVENTS
# ==================================================

try:
    waste_data = get_waste_events()

except Exception as e:
    st.error(f"Unable to refresh waste events: {e}")
    st.stop()


if waste_data.empty:

    st.warning(
        "No saved waste events are available yet. "
        "Click 'Run Waste Detection' to analyze your factory records."
    )

    st.stop()


# ==================================================
# 8. PREPARE DATA
# ==================================================

waste_data["timestamp"] = pd.to_datetime(
    waste_data["timestamp"],
    errors="coerce"
)

for column in ["waste_kwh", "waste_cost"]:
    waste_data[column] = pd.to_numeric(
        waste_data[column],
        errors="coerce"
    ).fillna(0)

waste_data["severity"] = (
    waste_data["severity"]
    .fillna("Unknown")
    .astype(str)
)

waste_data["waste_type"] = (
    waste_data["waste_type"]
    .fillna("Unknown")
    .astype(str)
)

waste_data["machine_id"] = (
    waste_data["machine_id"]
    .fillna("Unknown")
    .astype(str)
)

waste_data["product_type"] = (
    waste_data["product_type"]
    .fillna("Unknown")
    .astype(str)
)

if "recommendation" not in waste_data.columns:
    waste_data["recommendation"] = ""

waste_data["recommendation"] = (
    waste_data["recommendation"]
    .fillna("")
    .astype(str)
)

# Display fallback recommendations for older records
missing_recommendation = (
    waste_data["recommendation"].str.strip() == ""
)

waste_data.loc[missing_recommendation, "recommendation"] = (
    waste_data.loc[missing_recommendation, "waste_type"]
    .map(recommendations)
    .fillna("Inspect the machine and review its energy usage.")
)


# ==================================================
# 9. SIDEBAR FILTERS
# ==================================================

st.sidebar.title("Waste Filters")

filtered_data = waste_data.copy()

valid_dates = waste_data["timestamp"].dropna()

if not valid_dates.empty:

    min_date = valid_dates.min().date()
    max_date = valid_dates.max().date()

    selected_dates = st.sidebar.date_input(
        "Select date range",
        value=(min_date, max_date),
        min_value=min_date,
        max_value=max_date
    )

    if isinstance(selected_dates, (tuple, list)) and len(selected_dates) == 2:

        start_date, end_date = selected_dates

        filtered_data = filtered_data[
            filtered_data["timestamp"].dt.date.between(
                start_date,
                end_date
            )
        ]

machine_options = sorted(
    filtered_data["machine_id"].unique().tolist()
)

selected_machines = st.sidebar.multiselect(
    "Select machines",
    machine_options,
    default=machine_options
)

filtered_data = filtered_data[
    filtered_data["machine_id"].isin(selected_machines)
]

waste_options = sorted(
    filtered_data["waste_type"].unique().tolist()
)

selected_waste_types = st.sidebar.multiselect(
    "Waste category",
    waste_options,
    default=waste_options
)

filtered_data = filtered_data[
    filtered_data["waste_type"].isin(selected_waste_types)
]

severity_options = [
    "Critical", "High", "Medium", "Low", "Unknown"
]

available_severities = [
    severity for severity in severity_options
    if severity in filtered_data["severity"].unique()
]

selected_severities = st.sidebar.multiselect(
    "Severity",
    available_severities,
    default=available_severities
)

filtered_data = filtered_data[
    filtered_data["severity"].isin(selected_severities)
]

# ==================================================
# 10. KEY PERFORMANCE INDICATORS
# ==================================================

st.markdown(
    '<div class="section-heading">Waste Overview</div>',
    unsafe_allow_html=True
)

# Calculate KPI values
total_events = len(filtered_data)

total_waste_energy = filtered_data["waste_kwh"].sum()

total_waste_cost = filtered_data["waste_cost"].sum()

critical_events = (
    filtered_data["severity"] == "Critical"
).sum()


# Custom KPI card styling
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


# Custom metric card function
def show_metric_card(column, label, value):
    with column:
        st.markdown(f"""
        <div class="metric-card">
            <div class="metric-label">{label}</div>
            <div class="metric-value">{value}</div>
        </div>
        """, unsafe_allow_html=True)


# Display four KPI cards
c1, c2, c3, c4 = st.columns(4)

show_metric_card(
    c1,
    "Total Waste Events",
    f"{total_events:,}"
)

show_metric_card(
    c2,
    "Waste Energy",
    f"{total_waste_energy:,.2f} kWh"
)

show_metric_card(
    c3,
    "Estimated Waste Cost",
    f"₹ {total_waste_cost:,.2f}"
)

show_metric_card(
    c4,
    "Critical Events",
    f"{critical_events:,}"
)








# ==================================================
# 11. SEVERITY ANALYSIS
# ==================================================

st.markdown(
    '<div class="section-heading">Severity Analysis</div>',
    unsafe_allow_html=True
)

left, right = st.columns(2)

severity_order = ["Critical", "High", "Medium", "Low", "Unknown"]

severity_counts = (
    filtered_data["severity"]
    .value_counts()
    .reindex(severity_order, fill_value=0)
    .reset_index()
)

severity_counts.columns = ["Severity", "Events"]

with left:

    st.subheader("Events by Severity")

    if severity_counts["Events"].sum() > 0:

        fig = px.pie(
            severity_counts[
                severity_counts["Events"] > 0
            ],
            names="Severity",
            values="Events",
            hole=0.55,
            title="Waste Event Distribution"
        )

        fig.update_layout(
            paper_bgcolor="#081321",
            plot_bgcolor="#081321",
            font_color="white"
        )

        st.plotly_chart(fig, use_container_width=True)

with right:

    st.subheader("Severity Summary")

    st.dataframe(
        severity_counts,
        use_container_width=True,
        hide_index=True
    )


# ==================================================
# 12. WASTE TYPE ANALYSIS
# ==================================================

st.markdown(
    '<div class="section-heading">Waste Category Analysis</div>',
    unsafe_allow_html=True
)

waste_type_summary = (
    filtered_data.groupby("waste_type")
    .agg(
        total_events=("id", "count"),
        waste_energy_kwh=("waste_kwh", "sum"),
        waste_cost=("waste_cost", "sum")
    )
    .reset_index()
    .sort_values("waste_cost", ascending=False)
)

left, right = st.columns(2)

with left:

    st.subheader("Events by Waste Type")

    if not waste_type_summary.empty:

        fig = px.bar(
            waste_type_summary,
            x="waste_type",
            y="total_events",
            title="Number of Waste Events",
            labels={
                "waste_type": "Waste Type",
                "total_events": "Number of Events"
            }
        )

        fig.update_layout(
            paper_bgcolor="#081321",
            plot_bgcolor="#081321",
            font_color="white",
            xaxis_tickangle=-25
        )

        st.plotly_chart(fig, use_container_width=True)

with right:

    st.subheader("Waste Cost by Category")

    if not waste_type_summary.empty:

        fig = px.bar(
            waste_type_summary,
            x="waste_type",
            y="waste_cost",
            title="Estimated Waste Cost",
            labels={
                "waste_type": "Waste Type",
                "waste_cost": "Cost (₹)"
            }
        )

        fig.update_layout(
            paper_bgcolor="#081321",
            plot_bgcolor="#081321",
            font_color="white",
            xaxis_tickangle=-25
        )

        st.plotly_chart(fig, use_container_width=True)


# ==================================================
# 13. MACHINE-WISE WASTE ANALYSIS
# ==================================================

st.markdown(
    '<div class="section-heading">Machine-wise Waste Analysis</div>',
    unsafe_allow_html=True
)

machine_summary = (
    filtered_data.groupby("machine_id")
    .agg(
        total_events=("id", "count"),
        waste_energy_kwh=("waste_kwh", "sum"),
        waste_cost=("waste_cost", "sum")
    )
    .reset_index()
    .sort_values("waste_cost", ascending=False)
)

if not machine_summary.empty:

    fig = px.bar(
        machine_summary,
        x="machine_id",
        y="waste_cost",
        title="Waste Cost by Machine",
        labels={
            "machine_id": "Machine",
            "waste_cost": "Waste Cost (₹)"
        }
    )

    fig.update_layout(
        paper_bgcolor="#081321",
        plot_bgcolor="#081321",
        font_color="white"
    )

    st.plotly_chart(fig, use_container_width=True)

    st.dataframe(
        machine_summary,
        use_container_width=True,
        hide_index=True
    )


# ==================================================
# 14. PRODUCT-WISE WASTE ANALYSIS
# ==================================================

st.markdown(
    '<div class="section-heading">Product-wise Waste Analysis</div>',
    unsafe_allow_html=True
)

product_summary = (
    filtered_data.groupby("product_type")
    .agg(
        total_events=("id", "count"),
        waste_energy_kwh=("waste_kwh", "sum"),
        waste_cost=("waste_cost", "sum")
    )
    .reset_index()
    .sort_values("waste_cost", ascending=False)
)

st.dataframe(
    product_summary,
    use_container_width=True,
    hide_index=True
)


# ==================================================
# 15. RECOMMENDATIONS
# ==================================================

st.markdown(
    '<div class="section-heading">AI-assisted Improvement Recommendations</div>',
    unsafe_allow_html=True
)

st.caption(
    "These are rule-based recommendations generated from the detected "
    "waste category, not predictions from a trained AI model."
)

for waste_type in filtered_data["waste_type"].dropna().unique():

    with st.expander(f"💡 {waste_type}"):

        st.write(
            recommendations.get(
                waste_type,
                "Inspect the machine and review its energy usage."
            )
        )


# ==================================================
# 16. WASTE EVENT HISTORY
# ==================================================

st.markdown(
    '<div class="section-heading">Waste Event History</div>',
    unsafe_allow_html=True
)

display_columns = [
    "timestamp",
    "machine_id",
    "product_type",
    "waste_type",
    "severity",
    "waste_kwh",
    "waste_cost",
    "description",
    "recommendation"
]

display_data = filtered_data[
    [
        col for col in display_columns
        if col in filtered_data.columns
    ]
].copy()

if "timestamp" in display_data.columns:
    display_data["timestamp"] = (
        display_data["timestamp"]
        .dt.strftime("%Y-%m-%d %H:%M")
    )

st.dataframe(
    display_data,
    use_container_width=True,
    hide_index=True
)


# ==================================================
# 17. DOWNLOAD REPORTS
# ==================================================

st.markdown(
    '<div class="section-heading">Download Waste Reports</div>',
    unsafe_allow_html=True
)

col1, col2 = st.columns(2)

with col1:

    csv_data = filtered_data.to_csv(
        index=False
    ).encode("utf-8")

    st.download_button(
        "⬇ Download Complete Waste Report",
        data=csv_data,
        file_name="wattwise_waste_report.csv",
        mime="text/csv",
        use_container_width=True
    )

with col2:

    summary_csv = waste_type_summary.to_csv(
        index=False
    ).encode("utf-8")

    st.download_button(
        "⬇ Download Waste Category Summary",
        data=summary_csv,
        file_name="wattwise_waste_summary.csv",
        mime="text/csv",
        use_container_width=True
    )


# ==================================================
# 18. FOOTER
# ==================================================

st.divider()

st.markdown("""
<div style="
    text-align:center;
    color:#8FA3B8;
    padding:15px;
    font-size:12px;">
    WattWise | Smart Industrial Energy Monitoring<br>
    Waste Detection & Prevention Module
</div>
""", unsafe_allow_html=True)
