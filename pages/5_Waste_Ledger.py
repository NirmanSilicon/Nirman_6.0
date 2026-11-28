
import streamlit as st
import pandas as pd

from modules.detection import get_waste_events


# ==========================================================
# 1. PAGE CONFIGURATION
# ==========================================================

st.set_page_config(
    page_title="WattWise | Waste Ledger",
    page_icon="📒",
    layout="wide"
)


# ==========================================================
# 2. CUSTOM DARK THEME
# ==========================================================

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

.ledger-header {
    color: #FFAD42;
    font-size: 12px;
    font-weight: 800;
    letter-spacing: 3px;
    margin-bottom: 12px;
}

.section-heading {
    color: #FFAD42;
    font-size: 21px;
    font-weight: bold;
    margin-top: 25px;
    margin-bottom: 15px;
}

.metric-card {
    background-color: #15243A;
    padding: 18px;
    border-radius: 12px;
    border: 1px solid #263B56;
}

.metric-label {
    color: #AABBD0;
    font-size: 13px;
}

.metric-value {
    color: #FFAD42;
    font-size: 25px;
    font-weight: bold;
}

div[data-testid="stDataFrame"] {
    background-color: #15243A;
}

.stButton button,
.stDownloadButton button {
    background-color: #F59E0B;
    color: #081321;
    font-weight: bold;
    border-radius: 8px;
    border: none;
}

.stButton button:hover,
.stDownloadButton button:hover {
    background-color: #FDBA42;
    color: #081321;
}

</style>
""", unsafe_allow_html=True)


# ==========================================================
# 3. PAGE HEADER
# ==========================================================

st.markdown(
    '<div class="ledger-header">'
    '📒 SMART INDUSTRIAL ENERGY MONITORING'
    '</div>',
    unsafe_allow_html=True
)

st.title("Waste Ledger")

st.write(
    "Centralized historical record of factory energy waste, "
    "machine inefficiencies and production-related waste events."
)

st.divider()


# ==========================================================
# 4. LOAD WASTE EVENTS FROM DATABASE
# ==========================================================

try:

    waste_data = get_waste_events()

except Exception as e:

    st.error(f"Unable to load waste records: {e}")
    st.stop()


if waste_data.empty:

    st.warning(
        "No waste events found in the database. "
        "Open Waste Detection and run the detection engine first."
    )

    st.stop()


# ==========================================================
# 5. DATA PREPARATION
# ==========================================================

required_columns = [
    "id",
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

missing_columns = [
    column for column in required_columns
    if column not in waste_data.columns
]

if missing_columns:

    st.error(
        "The waste_events table is missing these columns: "
        + ", ".join(missing_columns)
    )

    st.stop()


waste_data["timestamp"] = pd.to_datetime(
    waste_data["timestamp"],
    errors="coerce"
)

waste_data["waste_kwh"] = pd.to_numeric(
    waste_data["waste_kwh"],
    errors="coerce"
).fillna(0)

waste_data["waste_cost"] = pd.to_numeric(
    waste_data["waste_cost"],
    errors="coerce"
).fillna(0)


text_columns = [
    "machine_id",
    "product_type",
    "waste_type",
    "severity",
    "description",
    "recommendation"
]

for column in text_columns:

    waste_data[column] = (
        waste_data[column]
        .fillna("Not available")
        .astype(str)
    )


# ==========================================================
# 6. SIDEBAR FILTERS
# ==========================================================

st.sidebar.title("📒 Ledger Filters")

filtered_data = waste_data.copy()


# DATE FILTER

valid_dates = filtered_data["timestamp"].dropna()

if not valid_dates.empty:

    min_date = valid_dates.min().date()
    max_date = valid_dates.max().date()

    selected_dates = st.sidebar.date_input(
        "Select Date Range",
        value=(min_date, max_date),
        min_value=min_date,
        max_value=max_date
    )

    if (
        isinstance(selected_dates, (tuple, list))
        and len(selected_dates) == 2
    ):

        start_date, end_date = selected_dates

        filtered_data = filtered_data[
            filtered_data["timestamp"].dt.date.between(
                start_date,
                end_date
            )
        ]


# MACHINE FILTER

machine_options = sorted(
    filtered_data["machine_id"].unique().tolist()
)

selected_machines = st.sidebar.multiselect(
    "Select Machine",
    options=machine_options,
    default=machine_options
)

filtered_data = filtered_data[
    filtered_data["machine_id"].isin(selected_machines)
]


# PRODUCT FILTER

product_options = sorted(
    filtered_data["product_type"].unique().tolist()
)

selected_products = st.sidebar.multiselect(
    "Select Product",
    options=product_options,
    default=product_options
)

filtered_data = filtered_data[
    filtered_data["product_type"].isin(selected_products)
]


# WASTE TYPE FILTER

waste_options = sorted(
    filtered_data["waste_type"].unique().tolist()
)

selected_waste_types = st.sidebar.multiselect(
    "Select Waste Type",
    options=waste_options,
    default=waste_options
)

filtered_data = filtered_data[
    filtered_data["waste_type"].isin(selected_waste_types)
]


# SEVERITY FILTER

severity_options = sorted(
    filtered_data["severity"].unique().tolist()
)

selected_severities = st.sidebar.multiselect(
    "Select Severity",
    options=severity_options,
    default=severity_options
)

filtered_data = filtered_data[
    filtered_data["severity"].isin(selected_severities)
]


# ==========================================================
# 7. LEDGER SUMMARY
# ==========================================================


# ==================================================
# LEDGER SUMMARY - KEY PERFORMANCE INDICATORS
# ==================================================

st.markdown(
    '<div class="section-heading">Ledger Summary</div>',
    unsafe_allow_html=True
)

# Calculate KPI values
total_records = len(filtered_data)

total_energy = filtered_data["waste_kwh"].sum()

total_cost = filtered_data["waste_cost"].sum()

critical_events = (
    filtered_data["severity"].str.lower() == "critical"
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
col1, col2, col3, col4 = st.columns(4)

show_metric_card(
    col1,
    "Total Waste Events",
    f"{total_records:,}"
)

show_metric_card(
    col2,
    "Waste Energy",
    f"{total_energy:,.2f} kWh"
)

show_metric_card(
    col3,
    "Waste Cost",
    f"₹ {total_cost:,.2f}"
)

show_metric_card(
    col4,
    "Critical Events",
    f"{critical_events:,}"
)


# ==========================================================
# 8. COMPLETE WASTE RECORDS
# ==========================================================

st.markdown(
    '<div class="section-heading">Complete Waste Records</div>',
    unsafe_allow_html=True
)

st.caption(
    "Every row represents a waste event saved in the WattWise database."
)

if filtered_data.empty:

    st.info("No records match the selected filters.")

else:

    display_columns = [
        "id",
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
        display_columns
    ].copy()

    display_data["timestamp"] = (
        display_data["timestamp"]
        .dt.strftime("%Y-%m-%d %H:%M")
    )

    st.dataframe(
        display_data,
        use_container_width=True,
        hide_index=True
    )


# ==========================================================
# 9. MACHINE-WISE LEDGER SUMMARY
# ==========================================================

st.markdown(
    '<div class="section-heading">Machine-wise Waste Summary</div>',
    unsafe_allow_html=True
)

if not filtered_data.empty:

    machine_summary = (
        filtered_data.groupby("machine_id")
        .agg(
            total_events=("id", "count"),
            waste_energy_kwh=("waste_kwh", "sum"),
            waste_cost=("waste_cost", "sum")
        )
        .reset_index()
        .sort_values(
            "waste_cost",
            ascending=False
        )
    )

    st.dataframe(
        machine_summary,
        use_container_width=True,
        hide_index=True
    )


# ==========================================================
# 10. WASTE CATEGORY SUMMARY
# ==========================================================

st.markdown(
    '<div class="section-heading">Waste Category Summary</div>',
    unsafe_allow_html=True
)

if not filtered_data.empty:

    category_summary = (
        filtered_data.groupby("waste_type")
        .agg(
            total_events=("id", "count"),
            waste_energy_kwh=("waste_kwh", "sum"),
            waste_cost=("waste_cost", "sum")
        )
        .reset_index()
        .sort_values(
            "waste_cost",
            ascending=False
        )
    )

    st.dataframe(
        category_summary,
        use_container_width=True,
        hide_index=True
    )


# ==========================================================
# 11. INDIVIDUAL EVENT DETAILS
# ==========================================================

st.markdown(
    '<div class="section-heading">Individual Event Details</div>',
    unsafe_allow_html=True
)

if not filtered_data.empty:

    event_ids = filtered_data["id"].tolist()

    selected_event_id = st.selectbox(
        "Select Waste Event ID",
        options=event_ids
    )

    event = filtered_data[
        filtered_data["id"] == selected_event_id
    ].iloc[0]

    st.subheader(
        f"Event #{selected_event_id}"
    )

    left, right = st.columns(2)

    with left:

        st.write("**Machine:**", event["machine_id"])

        st.write("**Product:**", event["product_type"])

        st.write("**Waste Type:**", event["waste_type"])

        st.write("**Severity:**", event["severity"])

    with right:

        st.write(
            "**Waste Energy:**",
            f"{event['waste_kwh']:.2f} kWh"
        )

        st.write(
            "**Waste Cost:**",
            f"₹ {event['waste_cost']:.2f}"
        )

        st.write(
            "**Timestamp:**",
            str(event["timestamp"])
        )

    st.write("**Event Description**")

    st.info(event["description"])

    st.write("**Recommended Action**")

    if event["recommendation"].strip():

        st.success(event["recommendation"])

    else:

        st.warning("No recommendation is available for this event.")


# ==========================================================
# 12. DOWNLOAD WASTE LEDGER
# ==========================================================

st.markdown(
    '<div class="section-heading">Export Waste Ledger</div>',
    unsafe_allow_html=True
)

csv_data = filtered_data.to_csv(
    index=False
).encode("utf-8")

st.download_button(
    label="⬇ Download Complete Waste Ledger",
    data=csv_data,
    file_name="wattwise_complete_waste_ledger.csv",
    mime="text/csv",
    use_container_width=True
)


# ==========================================================
# 13. FOOTER
# ==========================================================

st.divider()

st.markdown("""
<div style="
    text-align:center;
    color:#8FA3B8;
    padding:15px;
    font-size:12px;">
    WattWise | Smart Industrial Energy Monitoring<br>
    Waste Ledger Management System
</div>
""", unsafe_allow_html=True)

