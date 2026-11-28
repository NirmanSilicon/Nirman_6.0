
import streamlit as st
import pandas as pd
import numpy as np
import plotly.graph_objects as go
import plotly.express as px
from datetime import datetime

# =====================================================
# 1. PAGE CONFIGURATION
# =====================================================

st.set_page_config(
    page_title="WattWise | Energy Intelligence",
    page_icon="⚡",
    layout="wide",
    initial_sidebar_state="expanded"
)

# =====================================================
# 2. DATABASE INITIALIZATION
# =====================================================

try:
    from modules.database import create_database
    create_database()
except Exception as error:
    st.sidebar.warning(f"Database: {error}")

# =====================================================
# 3. DESIGN SYSTEM / CUSTOM CSS
# =====================================================

st.markdown("""
<style>

/* Main background */
.stApp {
    background: #080F1D;
    color: #E8F1FC;
}

[data-testid="stAppViewContainer"] {
    background: #080F1D;
}

[data-testid="stHeader"] {
    background: rgba(8, 15, 29, 0.95);
}

.block-container {
    max-width: 1550px;
    padding-top: 2rem;
    padding-bottom: 3rem;
}

/* Sidebar */
[data-testid="stSidebar"] {
    background: linear-gradient(180deg, #101C30, #0B1425);
    border-right: 1px solid #233650;
}

[data-testid="stSidebar"] p {
    color: #B8C9DD;
}

[data-testid="stSidebarNav"] {
    padding-top: 10px;
}

[data-testid="stSidebarNav"] a {
    border-radius: 9px;
    margin-bottom: 5px;
}

/* Headings */
h1, h2, h3, h4 {
    color: #F1F7FF !important;
}

p, label {
    color: #C4D2E4;
}

/* Brand */
.brand-logo {
    font-size: 27px;
    font-weight: 900;
    letter-spacing: 2px;
    color: #F8FAFC;
}

.brand-logo span {
    color: #38BDF8;
}

.brand-caption {
    font-size: 10px;
    color: #7E9AB8;
    letter-spacing: 2px;
    margin-top: 5px;
}

/* Hero */
.hero-box {
    background: linear-gradient(115deg, #142B48 0%, #104365 55%, #075985 100%);
    border: 1px solid #23648A;
    border-radius: 20px;
    padding: 34px;
    margin-bottom: 25px;
    position: relative;
    overflow: hidden;
    box-shadow: 0 12px 35px rgba(0, 0, 0, 0.22);
}

.hero-box:after {
    content: "⚡";
    position: absolute;
    right: 45px;
    top: 15px;
    font-size: 105px;
    opacity: 0.10;
}

.hero-tag {
    color: #7DD3FC;
    font-size: 11px;
    font-weight: 800;
    letter-spacing: 2px;
}

.hero-heading {
    color: white;
    font-size: 36px;
    font-weight: 850;
    margin-top: 14px;
    line-height: 1.2;
}

.hero-text {
    color: #D3E8F8;
    font-size: 14px;
    line-height: 1.8;
    margin-top: 12px;
    max-width: 720px;
}

.live-pill {
    display: inline-flex;
    align-items: center;
    gap: 8px;
    background: rgba(16, 185, 129, 0.13);
    border: 1px solid rgba(52, 211, 153, 0.4);
    color: #6EE7B7;
    padding: 8px 13px;
    border-radius: 30px;
    font-size: 11px;
    font-weight: 700;
    margin-top: 18px;
}

/* Pulse animation */
.pulse-dot {
    width: 8px;
    height: 8px;
    background: #34D399;
    border-radius: 50%;
    display: inline-block;
    animation: pulse 1.5s infinite;
}

@keyframes pulse {
    0% { box-shadow: 0 0 0 0 rgba(52, 211, 153, 0.8); }
    70% { box-shadow: 0 0 0 9px rgba(52, 211, 153, 0); }
    100% { box-shadow: 0 0 0 0 rgba(52, 211, 153, 0); }
}

/* Section title */
.section-title {
    font-size: 20px;
    font-weight: 800;
    color: #F1F5F9;
    margin-top: 28px;
    margin-bottom: 16px;
}

.section-subtitle {
    color: #8198B3;
    font-size: 12px;
    margin-top: -10px;
    margin-bottom: 18px;
}

/* KPI cards */
.kpi-card {
    background: linear-gradient(145deg, #15243A, #101D30);
    border: 1px solid #293E59;
    border-radius: 15px;
    padding: 20px;
    min-height: 145px;
    box-shadow: 0 7px 18px rgba(0, 0, 0, 0.15);
    transition: transform 0.25s ease, border-color 0.25s ease;
}

.kpi-card:hover {
    transform: translateY(-4px);
    border-color: #38BDF8;
}

.kpi-top {
    display: flex;
    justify-content: space-between;
    align-items: center;
}

.kpi-label {
    color: #9CB2CC;
    font-size: 12px;
    font-weight: 700;
    letter-spacing: 0.5px;
}

.kpi-icon {
    font-size: 23px;
}

.kpi-value {
    font-size: 29px;
    color: #F8FAFC;
    font-weight: 850;
    margin-top: 15px;
}

.kpi-note {
    font-size: 11px;
    color: #38BDF8;
    margin-top: 8px;
}

/* General cards */
.panel-card {
    background: #111E32;
    border: 1px solid #293D57;
    border-radius: 16px;
    padding: 20px;
    margin-bottom: 15px;
}

.machine-card {
    background: linear-gradient(145deg, #15243A, #101D30);
    border: 1px solid #293E59;
    border-radius: 14px;
    padding: 18px;
    margin-bottom: 10px;
    transition: border-color 0.2s ease;
}

.machine-card:hover {
    border-color: #38BDF8;
}

.machine-name {
    color: #F1F5F9;
    font-weight: 800;
    font-size: 15px;
}

.machine-detail {
    color: #91A7C0;
    font-size: 11px;
    margin-top: 7px;
}

.machine-running {
    color: #6EE7B7;
    font-size: 11px;
    font-weight: 700;
}

.machine-idle {
    color: #FBBF24;
    font-size: 11px;
    font-weight: 700;
}

/* Alert cards */
.alert-card {
    background: rgba(245, 158, 11, 0.08);
    border: 1px solid rgba(245, 158, 11, 0.35);
    border-left: 4px solid #F59E0B;
    padding: 15px;
    border-radius: 10px;
    margin-bottom: 12px;
}

.alert-title {
    color: #FCD34D;
    font-size: 13px;
    font-weight: 800;
}

.alert-description {
    color: #C3D0E0;
    font-size: 12px;
    margin-top: 6px;
}

/* Buttons */
.stButton > button {
    background: linear-gradient(90deg, #0284C7, #0369A1);
    color: white;
    border: 1px solid #0EA5E9;
    border-radius: 9px;
    font-weight: 700;
    min-height: 40px;
}

.stButton > button:hover {
    background: #0369A1;
    border-color: #38BDF8;
    color: white;
}

/* Select boxes */
.stSelectbox div[data-baseweb="select"] > div {
    background: #15243A;
    border-color: #344B68;
    color: white;
}

/* Chart container */
[data-testid="stPlotlyChart"] {
    background: #111E32;
    border: 1px solid #293D57;
    border-radius: 15px;
    padding: 10px;
}

/* Dividers */
hr {
    border-color: #263A54;
}

/* Footer */
.footer {
    border-top: 1px solid #263A54;
    margin-top: 35px;
    padding-top: 22px;
    text-align: center;
    color: #71869F;
    font-size: 11px;
    line-height: 2;
}

/* Responsive */
@media (max-width: 768px) {
    .hero-heading {
        font-size: 25px;
    }

    .hero-box {
        padding: 23px;
    }

    .kpi-value {
        font-size: 23px;
    }
}

</style>
""", unsafe_allow_html=True)


# =====================================================
# 4. ILLUSTRATIVE PREVIEW DATA
# =====================================================

# These values are only for the design preview.
# Phase 2 will replace them with the generated dataset.

rng = np.random.default_rng(42)

hours = pd.date_range(
    end=datetime.now().replace(minute=0, second=0, microsecond=0),
    periods=24,
    freq="h"
)

energy_data = pd.DataFrame({
    "Time": hours,
    "Machine 1": rng.normal(42, 4, 24).clip(25),
    "Machine 2": rng.normal(35, 4, 24).clip(20),
    "Machine 3": rng.normal(12, 2, 24).clip(5)
})

machine_data = [
    {
        "name": "Machine 01",
        "type": "Production Unit A",
        "status": "RUNNING",
        "energy": "42.5 kWh",
        "color": "green"
    },
    {
        "name": "Machine 02",
        "type": "Production Unit B",
        "status": "RUNNING",
        "energy": "35.8 kWh",
        "color": "green"
    },
    {
        "name": "Machine 03",
        "type": "Production Unit C",
        "status": "IDLE",
        "energy": "12.4 kWh",
        "color": "yellow"
    }
]

# Clearly illustrative preview values
preview_total_energy = 3024.0
preview_waste = 12.5
preview_savings = 3024.0
preview_active = 2


# =====================================================
# 5. SIDEBAR
# =====================================================

with st.sidebar:

    st.markdown(
        '<div class="brand-logo">⚡ WATT<span>WISE</span></div>'
        '<div class="brand-caption">INDUSTRIAL ENERGY INTELLIGENCE</div>',
        unsafe_allow_html=True
    )

    st.markdown("---")

    st.markdown(
        '<p style="font-size:11px;color:#7DD3FC;'
        'font-weight:800;letter-spacing:2px;">SYSTEM STATUS</p>',
        unsafe_allow_html=True
    )

    st.markdown(
        '<div style="background:#142B35;border:1px solid #23634F;'
        'padding:12px;border-radius:10px;">'
        '<span class="pulse-dot"></span> '
        '<span style="color:#6EE7B7;font-size:12px;'
        'font-weight:800;"> SYSTEM ONLINE</span>'
        '<div style="color:#8FA8BF;font-size:10px;margin-top:7px;">'
        'WattWise demonstration environment</div></div>',
        unsafe_allow_html=True
    )

    st.markdown("---")

    st.markdown(
        '<p style="font-size:11px;color:#7DD3FC;'
        'font-weight:800;letter-spacing:2px;">PLATFORM</p>',
        unsafe_allow_html=True
    )

    st.caption("Use the navigation menu above to explore all modules.")

    st.markdown("---")

    st.markdown(
        '<div style="background:#15243A;padding:15px;'
        'border-radius:12px;border:1px solid #293E59;">'
        '<div style="color:#8FA8BF;font-size:11px;">'
        'INTELLIGENCE ENGINE</div>'
        '<div style="color:#E0F2FE;font-size:13px;'
        'font-weight:800;margin-top:8px;">'
        'Production-Aware Analytics</div>'
        '<div style="color:#8FA8BF;font-size:10px;margin-top:6px;">'
        'Energy • Production • Quality • Cost</div>'
        '</div>',
        unsafe_allow_html=True
    )

    st.markdown("---")

    st.caption("WATTWISE • HACKATHON PROTOTYPE")


# =====================================================
# 6. HERO SECTION
# =====================================================

st.markdown(
    '<div class="hero-box">'
    '<div class="hero-tag">⚡ SMART INDUSTRIAL ENERGY MONITORING</div>'
    '<div class="hero-heading">Energy Intelligence Center</div>'
    '<div class="hero-text">'
    'Transform industrial energy data into actionable intelligence. '
    'Monitor machine consumption, identify production inefficiencies '
    'and discover opportunities to reduce electricity costs.'
    '</div>'
    '<div class="live-pill">'
    '<span class="pulse-dot"></span> '
    'DEMO ENVIRONMENT • PREVIEW DATA'
    '</div>'
    '</div>',
    unsafe_allow_html=True
)



# =====================================================
# FACTORY DATA UPLOAD SHORTCUT
# =====================================================

import streamlit as st


st.markdown(
"""
<div style="background-color:#142238; border:1px solid #293E59; border-radius:14px; padding:20px; margin-bottom:20px;">

<div style="color:#38BDF8; font-size:11px; font-weight:800; letter-spacing:1.5px;">
FACTORY MANAGER WORKSPACE
</div>

<div style="color:#F1F5F9; font-size:20px; font-weight:800; margin-top:8px;">
Have your factory energy data?
</div>

<div style="color:#9CB2CC; font-size:13px; margin-top:8px;">
Upload your factory CSV, validate production readings and generate industrial energy insights.
</div>

</div>
""",
unsafe_allow_html=True
)

st.page_link(
    "pages/6_Factory_Data_Upload.py",
    label="📤 Upload Factory Data",
    use_container_width=True
)

st.page_link(
    "pages/7_Energy_Analysis.py",
    label="⚡ View Energy Analysis",
    use_container_width=True
)




# =====================================================
# 7. KPI CARDS
# =====================================================

st.markdown(
    '<div class="section-title">⚡ Performance Overview</div>',
    unsafe_allow_html=True
)

st.markdown(
    '<div class="section-subtitle">'
    'A snapshot of industrial energy performance • Illustrative preview'
    '</div>',
    unsafe_allow_html=True
)

kpis = [
    ("TOTAL ENERGY", f"{preview_total_energy:,.0f} kWh", "⚡", "Energy consumed"),
    ("ESTIMATED WASTE", f"{preview_waste:.1f}%", "⚠️", "Illustrative estimate"),
    ("ACTIVE MACHINES", f"{preview_active} / 3", "🏭", "Machine availability"),
    ("POTENTIAL SAVINGS", f"₹{preview_savings:,.0f}", "💰", "Illustrative scenario")
]

columns = st.columns(4)

for col, item in zip(columns, kpis):
    label, value, icon, note = item

    with col:
        st.markdown(
            f'<div class="kpi-card">'
            f'<div class="kpi-top">'
            f'<div class="kpi-label">{label}</div>'
            f'<div class="kpi-icon">{icon}</div>'
            f'</div>'
            f'<div class="kpi-value">{value}</div>'
            f'<div class="kpi-note">{note}</div>'
            f'</div>',
            unsafe_allow_html=True
        )


# =====================================================
# 8. ENERGY TREND CHART
# =====================================================

st.markdown(
    '<div class="section-title">📊 Energy Analytics</div>',
    unsafe_allow_html=True
)

left, right = st.columns([1.65, 1])

with left:

    fig = go.Figure()

    colors = ["#38BDF8", "#A78BFA", "#34D399"]

    for machine, color in zip(
        ["Machine 1", "Machine 2", "Machine 3"],
        colors
    ):
        fig.add_trace(
            go.Scatter(
                x=energy_data["Time"],
                y=energy_data[machine],
                mode="lines",
                name=machine,
                line=dict(color=color, width=3),
                fill="tozeroy",
                opacity=0.8
            )
        )

    fig.update_layout(
        title="Machine Energy Consumption",
        xaxis_title="Time",
        yaxis_title="Energy (kWh)",
        template="plotly_dark",
        height=365,
        paper_bgcolor="#111E32",
        plot_bgcolor="#111E32",
        font=dict(color="#C8D8EA"),
        margin=dict(l=15, r=15, t=55, b=15),
        legend=dict(orientation="h", y=-0.2),
        hovermode="x unified"
    )

    fig.update_xaxes(gridcolor="#263A54")
    fig.update_yaxes(gridcolor="#263A54")

    st.plotly_chart(fig, use_container_width=True)

with right:

    machine_energy = pd.DataFrame({
        "Machine": ["Machine 1", "Machine 2", "Machine 3"],
        "Energy": [42.5, 35.8, 12.4]
    })

    bar_fig = px.bar(
        machine_energy,
        x="Energy",
        y="Machine",
        orientation="h",
        color="Machine",
        color_discrete_sequence=["#38BDF8", "#A78BFA", "#34D399"],
        title="Machine-wise Energy Comparison"
    )

    bar_fig.update_layout(
        template="plotly_dark",
        height=365,
        paper_bgcolor="#111E32",
        plot_bgcolor="#111E32",
        font=dict(color="#C8D8EA"),
        showlegend=False,
        margin=dict(l=15, r=15, t=55, b=15),
        xaxis_title="Energy (kWh)",
        yaxis_title=""
    )

    bar_fig.update_xaxes(gridcolor="#263A54")
    bar_fig.update_yaxes(gridcolor="#263A54")

    st.plotly_chart(bar_fig, use_container_width=True)


# =====================================================
# 9. MACHINE STATUS
# =====================================================

st.markdown(
    '<div class="section-title">🏭 Machine Health & Status</div>',
    unsafe_allow_html=True
)

st.markdown(
    '<div class="section-subtitle">'
    'Illustrative machine operating conditions'
    '</div>',
    unsafe_allow_html=True
)

machine_cols = st.columns(3)

for col, machine in zip(machine_cols, machine_data):

    with col:

        if machine["status"] == "RUNNING":
            status_class = "machine-running"
            status_icon = "●"
        else:
            status_class = "machine-idle"
            status_icon = "●"

        st.markdown(
            f'<div class="machine-card">'
            f'<div class="machine-name">⚙️ {machine["name"]}</div>'
            f'<div class="machine-detail">{machine["type"]}</div>'
            f'<div class="{status_class}" style="margin-top:15px;">'
            f'{status_icon} {machine["status"]}</div>'
            f'<div style="color:#E2E8F0;font-size:21px;'
            f'font-weight:800;margin-top:15px;">'
            f'{machine["energy"]}</div>'
            f'<div class="machine-detail">Energy consumption</div>'
            f'</div>',
            unsafe_allow_html=True
        )


# =====================================================
# 10. WASTE INTELLIGENCE
# =====================================================

st.markdown(
    '<div class="section-title">🧠 Waste Intelligence Center</div>',
    unsafe_allow_html=True
)

alert_left, alert_right = st.columns([1.3, 1])

with alert_left:

    st.markdown(
        '<div class="alert-card">'
        '<div class="alert-title">⚠️ Idle Energy Consumption</div>'
        '<div class="alert-description">'
        'Machine 03 is in an idle state in the illustrative preview. '
        'Its energy consumption should be compared with its idle baseline.'
        '</div></div>'
        '<div class="alert-card">'
        '<div class="alert-title">🔍 Production Efficiency Analysis</div>'
        '<div class="alert-description">'
        'Compare energy per good unit to identify machines or '
        'production batches with higher-than-expected consumption.'
        '</div></div>',
        unsafe_allow_html=True
    )

with alert_right:

    st.markdown(
        '<div class="panel-card">'
        '<div style="font-size:14px;font-weight:800;color:#F1F5F9;">'
        '💡 Recommended Actions</div>'
        '<div style="color:#9CB2CC;font-size:12px;line-height:2.1;'
        'margin-top:12px;">'
        '✓ Review idle machine shutdown settings<br>'
        '✓ Compare actual vs expected energy<br>'
        '✓ Monitor rejected production units<br>'
        '✓ Investigate abnormal consumption'
        '</div></div>',
        unsafe_allow_html=True
    )


# =====================================================
# 11. INTERACTIVE SIMULATION CONTROL
# =====================================================

st.markdown(
    '<div class="section-title">🎛️ Energy Savings Simulator</div>',
    unsafe_allow_html=True
)

sim_left, sim_right = st.columns([1, 1])

with sim_left:

    reduction = st.slider(
        "Target reduction in estimated waste (%)",
        min_value=0,
        max_value=100,
        value=30,
        step=5
    )

    estimated_waste_kwh = 100.0
    electricity_rate = 8.0

    savings_kwh = estimated_waste_kwh * reduction / 100
    savings_rupees = savings_kwh * electricity_rate

with sim_right:

    st.markdown(
        '<div class="panel-card">'
        '<div style="color:#9CB2CC;font-size:12px;">'
        'SIMULATED POTENTIAL SAVINGS</div>'
        f'<div style="font-size:30px;color:#34D399;'
        f'font-weight:850;margin-top:10px;">'
        f'₹{savings_rupees:,.2f}</div>'
        f'<div style="color:#38BDF8;font-size:13px;'
        f'margin-top:8px;">'
        f'{savings_kwh:.1f} kWh potential reduction</div>'
        '<div style="color:#71869F;font-size:10px;margin-top:8px;">'
        'Based on an illustrative 100 kWh waste scenario and '
        '₹8/kWh electricity rate.</div>'
        '</div>',
        unsafe_allow_html=True
    )


# =====================================================
# 12. FOOTER
# =====================================================

st.markdown(
    '<div class="footer">'
    '<b style="color:#38BDF8;">⚡ WATTWISE</b><br>'
    'Production-Aware Industrial Energy Waste Detection System<br>'
    'Energy Intelligence • Machine Analytics • Waste Optimization<br><br>'
    'Hackathon Prototype | Preview data is illustrative'
    '</div>',
    unsafe_allow_html=True
)
