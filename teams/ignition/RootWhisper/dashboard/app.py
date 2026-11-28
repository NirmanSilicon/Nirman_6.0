"""RootWhisper — Premium Botanical Intelligence Dashboard.

Enterprise precision-agritech SaaS application:
- 85% professional enterprise software + 15% botanical visual personality.
- Strict Apple Health / Linear / Stripe level clarity, typography, and tabular alignment.
- Zero clutter, zero cartoonish mascots, zero oversized banners.
"""

import sys
import time
from pathlib import Path
from datetime import datetime, timezone
import importlib

# Ensure project root is in sys.path
BASE_DIR = Path(__file__).resolve().parent.parent
if str(BASE_DIR) not in sys.path:
    sys.path.insert(0, str(BASE_DIR))

import streamlit as st
import pandas as pd

import dashboard.config
import dashboard.data_loader
import dashboard.components.ui_elements
import dashboard.components.charts

importlib.reload(dashboard.config)
importlib.reload(dashboard.data_loader)
importlib.reload(dashboard.components.ui_elements)
importlib.reload(dashboard.components.charts)

from dashboard.config import (
    DESIGN_SYSTEM,
    PLANT_DISPLAY,
    PLANT_IMG_TAGS,
    LOGO_IMG_TAG
)
from dashboard.data_loader import (
    load_all_devices,
    load_latest_plant_status,
    load_plant_history_df,
    load_cross_plant_comparison_df,
    load_fleet_summary_metrics,
    get_db_session
)
from dashboard.components.ui_elements import (
    inject_custom_css,
    render_app_header,
    render_scientific_caveat,
    get_status_pill_html,
    get_provenance_tag_html,
    render_ai_workflow_diagram,
    format_sensor_reading
)
from dashboard.components.charts import (
    plot_thermal_dynamics,
    plot_residuals,
    plot_soil_moisture_trend,
    plot_microclimate,
    plot_cross_plant_comparison
)
from backend.app.models.device import Device

# -------------------------------------------------------------------------------------
# STREAMLIT CONFIGURATION
# -------------------------------------------------------------------------------------
st.set_page_config(
    page_title="RootWhisper | Botanical Intelligence",
    page_icon="🌿",
    layout="wide",
    initial_sidebar_state="expanded"
)

# Apply Strict Enterprise Design System Styles
inject_custom_css()

# -------------------------------------------------------------------------------------
# PROFESSIONAL COMPACT SIDEBAR (~230px, Deep Emerald)
# -------------------------------------------------------------------------------------
st.sidebar.html(f"""<div style="padding: 18px 8px 16px 8px; border-bottom: 1px solid rgba(255, 255, 255, 0.08); margin-bottom: 14px;">
  <div style="display: flex; align-items: center; gap: 9px;">
    {LOGO_IMG_TAG}
    <div>
      <div style="font-weight: 700; font-size: 16px; color: #FFFFFF; letter-spacing: -0.3px; line-height: 1.1;">
        RootWhisper
      </div>
      <div style="font-size: 9.5px; font-weight: 600; color: #A8BDA8; letter-spacing: 0.8px; text-transform: uppercase;">
        Botanical Intelligence
      </div>
    </div>
  </div>
</div>""")

view_options = [
    "Fleet Overview",
    "Tulsi (TULSI_01)",
    "Hibiscus (HIBISCUS_01)",
    "Money Plant (MONEYPLANT_01)",
    "Historical Analytics",
    "AI Screening",
    "Hardware Diagnostics"
]

query_view = st.query_params.get("view", None)
default_index = 0
if query_view:
    query_view_lower = query_view.lower()
    for idx, opt in enumerate(view_options):
        if query_view_lower in opt.lower():
            default_index = idx
            break

page_selection = st.sidebar.radio(
    "Navigation Menu",
    view_options,
    index=default_index,
    label_visibility="collapsed"
)

st.sidebar.markdown("---")
st.sidebar.html(f"<div style='font-size: 10.5px; font-weight: 700; color: #A8BDA8; text-transform: uppercase; letter-spacing: 0.8px; margin-bottom: 6px;'>TELEMETRY CONTROLS</div>")
auto_refresh = st.sidebar.checkbox("Auto-Refresh (15s)", value=False)
if st.sidebar.button("Refresh Data", use_container_width=True):
    st.rerun()

st.sidebar.markdown("---")
st.sidebar.html(f"""<div style="padding: 8px; font-size: 11px; color: #C2D6CA; line-height: 1.6;">
  <div style="font-weight: 600; color: #FFFFFF; margin-bottom: 2px;">System State</div>
  <div style="display: flex; align-items: center; gap: 5px; font-size: 10.5px;">
    <span style="width: 6px; height: 6px; border-radius: 50%; background: #48D597;"></span>
    FastAPI & SQLite Online
  </div>
  <div style="color: #8DA897; font-size: 10px; margin-top: 4px;">
    RootWhisper Enterprise v2.4
  </div>
</div>""")


# -------------------------------------------------------------------------------------
# 1. FLEET OVERVIEW PAGE (Redesigned from Scratch)
# -------------------------------------------------------------------------------------
if page_selection == "Fleet Overview":
    summary = load_fleet_summary_metrics()

    render_app_header(
        page_title="Fleet Overview",
        breadcrumb="RootWhisper / Environmental Telemetry",
        last_updated=summary["last_updated"],
        online_count=summary["online_count"],
        total_nodes=summary["total_nodes"],
        is_simulated=True
    )

    render_scientific_caveat()

    # 4 Compact KPI Cards in One Row (Identical Dimensions, Subtle Accents)
    k1, k2, k3, k4 = st.columns(4)

    with k1:
        st.html(f"""<div class="kpi-card" style="border-left: 3px solid {DESIGN_SYSTEM['deep_emerald']};">
  <div class="kpi-label">Active Nodes</div>
  <div class="kpi-value">{summary['online_count']} / {summary['total_nodes']}</div>
  <div style="font-size: 11.5px; color: {DESIGN_SYSTEM['secondary_text']};">ESP32 DevKit V1 online</div>
</div>""")

    with k2:
        st.html(f"""<div class="kpi-card" style="border-left: 3px solid {DESIGN_SYSTEM['normal_green']};">
  <div class="kpi-label">Normal Plants</div>
  <div class="kpi-value" style="color: {DESIGN_SYSTEM['normal_green']};">{summary['normal_count']}</div>
  <div style="font-size: 11.5px; color: {DESIGN_SYSTEM['secondary_text']};">Within baseline response</div>
</div>""")

    with k3:
        st.html(f"""<div class="kpi-card" style="border-left: 3px solid {DESIGN_SYSTEM['alert_red']};">
  <div class="kpi-label">Water-Stress Indications</div>
  <div class="kpi-value" style="color: {DESIGN_SYSTEM['alert_red']};">{summary['stress_count']}</div>
  <div style="font-size: 11.5px; color: {DESIGN_SYSTEM['secondary_text']};">Persistent thermal elevation</div>
</div>""")

    with k4:
        st.html(f"""<div class="kpi-card" style="border-left: 3px solid {DESIGN_SYSTEM['warning_amber']};">
  <div class="kpi-label">Inconclusive Readings</div>
  <div class="kpi-value" style="color: {DESIGN_SYSTEM['warning_amber']};">{summary['inconclusive_count']}</div>
  <div style="font-size: 11.5px; color: {DESIGN_SYSTEM['secondary_text']};">Low daylight / uncalibrated</div>
</div>""")

    st.html("<div style='height: 20px;'></div>")

    # Section Heading: Live Specimen Monitoring Cards
    st.html(f"""<div style="display: flex; justify-content: space-between; align-items: baseline; margin-bottom: 14px;">
  <div>
    <h2 style="font-size: 16px; font-weight: 700; color: {DESIGN_SYSTEM['charcoal']}; margin: 0;">
      Plant Specimen Telemetry
    </h2>
    <div style="font-size: 12px; color: {DESIGN_SYSTEM['secondary_text']}; margin-top: 2px;">
      Synchronous microclimate and infrared canopy observations across independent specimens.
    </div>
  </div>
  <div style="font-size: 11.5px; color: {DESIGN_SYSTEM['secondary_text']}; font-weight: 500;">
    3-Column Specimen Matrix
  </div>
</div>""")

    # 3 Aligned Plant Monitoring Cards (Strict 3-Column Grid)
    plant_cols = st.columns(3)
    devices = summary["devices"]
    plant_statuses = summary["plant_statuses"]

    for idx, dev in enumerate(devices):
        dev_id = dev["device_id"]
        status_data = plant_statuses[idx]
        tele = status_data["telemetry"]
        scr = status_data["screening"]
        is_online = dev.get("is_online", False)
        svg_icon = PLANT_IMG_TAGS.get(dev_id, "")
        plant_title = PLANT_DISPLAY.get(dev_id, {}).get("name", dev.get("plant_name", dev_id))

        leaf_str = format_sensor_reading(tele.get("leaf_temp_c") if tele else None, "°C", bool(tele and tele.get("mlx_connected", True)))
        soil_str = format_sensor_reading(tele.get("soil_moisture_pct") if tele else None, "%", bool(tele and tele.get("soil_sensor_valid", True)))
        air_str = format_sensor_reading(tele.get("ambient_temp_c") if tele else None, "°C", bool(tele and tele.get("aht_connected", True)))
        rh_str = format_sensor_reading(tele.get("ambient_humidity_pct") if tele else None, "%", bool(tele and tele.get("aht_connected", True)))
        lux_str = f"{tele['light_lux']:,.0f} Lux" if (tele and tele.get("bh1750_connected", True)) else "N/A"
        delta_t_val = tele.get("delta_t_c") if tele else None
        delta_t_str = f"{delta_t_val:+.1f} °C" if (delta_t_val is not None and delta_t_val > -50) else "N/A"

        status_text = scr["screening_output"] if scr else "Inconclusive"
        status_pill = get_status_pill_html(status_text, is_online=is_online)
        prov_tag = get_provenance_tag_html(tele.get("is_simulated", False) if tele else False)
        online_dot = "<span style='color: #2E7D52; font-size: 11px; font-weight: 600;'>● Online</span>" if is_online else "<span style='color: #8A948E; font-size: 11px; font-weight: 600;'>○ Offline</span>"

        with plant_cols[idx]:
            st.html(f"""<div class="rw-card">
  <div>
    <!-- Specimen Header -->
    <div style="display: flex; justify-content: space-between; align-items: flex-start; margin-bottom: 12px;">
      <div style="display: flex; align-items: center; gap: 10px;">
        {svg_icon}
        <div>
          <div style="font-size: 15px; font-weight: 700; color: {DESIGN_SYSTEM['charcoal']}; line-height: 1.2;">
            {plant_title}
          </div>
          <div style="font-size: 11.5px; color: {DESIGN_SYSTEM['secondary_text']}; font-style: italic; margin-top: 1px;">
            {dev['species']}
          </div>
        </div>
      </div>
      <div>{online_dot}</div>
    </div>

    <!-- Badges Row -->
    <div style="display: flex; align-items: center; justify-content: space-between; margin-bottom: 12px;">
      <span style="font-family: monospace; font-size: 11px; background: #FAFBF9; border: 1px solid {DESIGN_SYSTEM['border_subtle']}; padding: 2px 7px; border-radius: 4px; color: {DESIGN_SYSTEM['secondary_text']};">
        {dev_id}
      </span>
      <div style="display: flex; gap: 6px;">
        {status_pill}
        {prov_tag}
      </div>
    </div>

    <!-- Aligned 2-Column Sensor Metric Grid (Tabular Numerals) -->
    <div class="metric-grid">
      <div class="metric-item">
        <span class="metric-key">Leaf Temp (IR)</span>
        <span class="metric-val">{leaf_str}</span>
      </div>
      <div class="metric-item">
        <span class="metric-key">Soil Moisture</span>
        <span class="metric-val">{soil_str}</span>
      </div>
      <div class="metric-item">
        <span class="metric-key">Ambient Air</span>
        <span class="metric-val">{air_str}</span>
      </div>
      <div class="metric-item">
        <span class="metric-key">Relative Humidity</span>
        <span class="metric-val">{rh_str}</span>
      </div>
      <div class="metric-item">
        <span class="metric-key">Light Intensity</span>
        <span class="metric-val">{lux_str}</span>
      </div>
      <div class="metric-item">
        <span class="metric-key">Canopy ΔT (Leaf-Air)</span>
        <span class="metric-val">{delta_t_str}</span>
      </div>
    </div>
  </div>

  <!-- AI Explanation Footer Box -->
  <div style="background: #FAFBF9; border: 1px solid {DESIGN_SYSTEM['border_light']}; border-left: 3px solid {DESIGN_SYSTEM['forest_green']}; border-radius: 6px; padding: 10px 12px; font-size: 11.5px; color: {DESIGN_SYSTEM['charcoal']}; min-height: 54px; display: flex; align-items: center; line-height: 1.45;">
    <div>
      <strong style="color: {DESIGN_SYSTEM['deep_emerald']};">AI Reasoning:</strong> 
      {scr['scientific_reason'] if scr else 'Awaiting incoming sensor cycles to complete baseline analysis.'}
    </div>
  </div>
</div>""")

    st.html("<div style='height: 24px;'></div>")

    # Fleet Analytics Section (Side-by-side charts)
    st.html(f"""<div style="margin-bottom: 12px;">
  <h2 style="font-size: 16px; font-weight: 700; color: {DESIGN_SYSTEM['charcoal']}; margin: 0;">
    Fleet Telemetry Analytics
  </h2>
  <div style="font-size: 12px; color: {DESIGN_SYSTEM['secondary_text']}; margin-top: 2px;">
    Comparative thermal transpiration and root-zone moisture depletion curves.
  </div>
</div>""")

    df_cross = load_cross_plant_comparison_df(limit_per_plant=50)

    c1, c2 = st.columns(2)
    with c1:
        st.plotly_chart(
            plot_cross_plant_comparison(df_cross, metric="leaf_temp_c", title="Leaf Temperature (°C) Comparison"),
            use_container_width=True
        )
    with c2:
        st.plotly_chart(
            plot_cross_plant_comparison(df_cross, metric="soil_moisture_pct", title="Volumetric Soil Moisture (%) Comparison"),
            use_container_width=True
        )


# -------------------------------------------------------------------------------------
# 2. INDIVIDUAL PLANT MONITORING PAGES (Tulsi, Hibiscus, Money Plant)
# -------------------------------------------------------------------------------------
elif page_selection in ["Tulsi (TULSI_01)", "Hibiscus (HIBISCUS_01)", "Money Plant (MONEYPLANT_01)"]:
    dev_map = {
        "Tulsi (TULSI_01)": "TULSI_01",
        "Hibiscus (HIBISCUS_01)": "HIBISCUS_01",
        "Money Plant (MONEYPLANT_01)": "MONEYPLANT_01"
    }
    dev_id = dev_map[page_selection]
    meta = PLANT_DISPLAY[dev_id]
    svg_icon = PLANT_IMG_TAGS.get(dev_id, "")

    plant_data = load_latest_plant_status(dev_id)
    device = plant_data["device"]
    tele = plant_data["telemetry"]
    scr = plant_data["screening"]
    model_meta = plant_data["model_metadata"]
    df_history = load_plant_history_df(dev_id, limit=60)

    render_app_header(
        page_title=f"{meta['name']} ({dev_id})",
        breadcrumb=f"Specimens / {meta['name']}",
        last_updated=tele["timestamp"][:19].replace("T", " ") if tele else "N/A",
        online_count=1 if device.get("is_online") else 0,
        total_nodes=1,
        is_simulated=tele.get("is_simulated", True) if tele else True
    )

    # Top Specimen Summary Card
    st.html(f"""<div class="rw-card" style="margin-bottom: 20px;">
  <div style="display: flex; justify-content: space-between; align-items: center; flex-wrap: wrap; gap: 14px;">
    <div style="display: flex; align-items: center; gap: 14px;">
      {svg_icon}
      <div>
        <div style="font-size: 18px; font-weight: 700; color: {DESIGN_SYSTEM['charcoal']};">
          {meta['name']} <span style="font-size: 13px; font-weight: 500; color: {DESIGN_SYSTEM['secondary_text']};">({meta['common_name']})</span>
        </div>
        <div style="font-size: 12px; color: {DESIGN_SYSTEM['secondary_text']}; font-style: italic; margin-top: 1px;">
          Species: {meta['species']} • Node ID: <code style="font-family: monospace; font-size: 11px;">{dev_id}</code>
        </div>
      </div>
    </div>
    <div style="display: flex; align-items: center; gap: 8px;">
      {get_status_pill_html(scr['screening_output'] if scr else 'Inconclusive', device.get('is_online', True) if device else True)}
      {get_provenance_tag_html(tele.get('is_simulated', False) if tele else False)}
    </div>
  </div>
</div>""")

    # Main Split: Left Metrics, Right Observed vs Expected Chart
    detail_col1, detail_col2 = st.columns([1.1, 1.9])

    with detail_col1:
        st.html(f"""<div style="font-size: 12.5px; font-weight: 700; color: {DESIGN_SYSTEM['charcoal']}; text-transform: uppercase; letter-spacing: 0.5px; margin-bottom: 8px;">
  Live Telemetry Readings
</div>""")
        if tele and device:
            delta_t = tele.get("delta_t_c", 0.0)
            vpd_val = tele.get("vpd_kpa")
            dry_thresh = device.get("provisional_soil_dry_threshold_pct", 35.0)

            m1, m2 = st.columns(2)
            m1.metric("Leaf Temp (IR)", f"{tele['leaf_temp_c']:.1f} °C", delta=f"{delta_t:+.1f} vs Air")
            m2.metric("Soil Moisture", f"{tele['soil_moisture_pct']:.1f} %", delta=f"Cutoff < {dry_thresh:.0f}%")

            m3, m4 = st.columns(2)
            m3.metric("Ambient Air", f"{tele['ambient_temp_c']:.1f} °C")
            m4.metric("Humidity (RH)", f"{tele['ambient_humidity_pct']:.1f} %")

            m5, m6 = st.columns(2)
            m5.metric("Light Intensity", f"{tele['light_lux']:,.0f} Lux")
            m6.metric("VPD Demand", f"{vpd_val:.2f} kPa" if vpd_val else "N/A")

    with detail_col2:
        st.plotly_chart(
            plot_thermal_dynamics(df_history, threshold_c=device.get("provisional_temp_residual_threshold_c", 1.5)),
            use_container_width=True
        )

    st.html("<div style='height: 18px;'></div>")

    # Specimen AI Baseline & Residuals Card
    ai_col1, ai_col2 = st.columns([1.8, 1.2])

    with ai_col1:
        if scr and scr.get("expected_leaf_temp_c") is not None:
            r1, r2, r3 = st.columns(3)
            r1.metric("AI Expected Baseline", f"{scr['expected_leaf_temp_c']:.1f} °C")
            r2.metric("Observed Leaf Temp", f"{tele['leaf_temp_c']:.1f} °C")
            residual = scr.get("residual_c", 0.0)
            threshold_val = device.get("provisional_temp_residual_threshold_c", 1.5)
            r3.metric(
                "Prediction Residual (e)",
                f"{residual:+.2f} °C",
                delta=f"Cutoff: +{threshold_val:.1f}°C",
                delta_color="inverse" if residual > threshold_val else "normal"
            )

            st.info(f"**Agronomic Assessment:** {scr['scientific_reason']}")
        else:
            st.warning("Individual baseline model calibration is pending. Waiting for daytime sensor cycles.")

    with ai_col2:
        st.html(f"""<div class="rw-card" style="padding: 16px 18px;">
  <div style="font-size: 12px; font-weight: 700; color: {DESIGN_SYSTEM['deep_emerald']}; margin-bottom: 6px;">
    ADAPTIVE MODEL SPECIFICATION
  </div>
  <div style="font-size: 12px; color: {DESIGN_SYSTEM['secondary_text']}; line-height: 1.7;">
    • <strong>Algorithm:</strong> Specimen Random Forest Regressor<br>
    • <strong>Target Variable:</strong> Well-Watered Leaf Temp (T̂leaf)<br>
    • <strong>Independent Variable:</strong> Soil Moisture (Excluded from RF)<br>
    • <strong>Persistence Window:</strong> {device.get('persistence_window_size', 5)} cycles (~25 min)<br>
    • <strong>Model Fit (R²):</strong> {model_meta['r2_score'] if model_meta else 'Pending'} | <strong>MAE:</strong> {model_meta['mae_score'] if model_meta else 'Pending'} °C
  </div>
</div>""")

    st.html("<div style='height: 16px;'></div>")

    # Interactive Analytical Plotly Tabs
    st.html(f"""<div style="font-size: 13px; font-weight: 700; color: {DESIGN_SYSTEM['charcoal']}; text-transform: uppercase; letter-spacing: 0.5px; margin-bottom: 8px;">
  Analytical Time-Series Records
</div>""")

    tab1, tab2, tab3 = st.tabs([
        "Prediction Residuals (e)",
        "Soil Moisture Trend",
        "Microclimate Dynamics"
    ])

    with tab1:
        st.plotly_chart(
            plot_residuals(df_history, threshold_c=device.get("provisional_temp_residual_threshold_c", 1.5)),
            use_container_width=True
        )

    with tab2:
        st.plotly_chart(
            plot_soil_moisture_trend(df_history, dry_threshold_pct=device.get("provisional_soil_dry_threshold_pct", 35.0)),
            use_container_width=True
        )

    with tab3:
        st.plotly_chart(plot_microclimate(df_history), use_container_width=True)


# -------------------------------------------------------------------------------------
# 3. HISTORICAL ANALYTICS & CSV EXPORT
# -------------------------------------------------------------------------------------
elif page_selection == "Historical Analytics":
    render_app_header(
        page_title="Historical Analytics",
        breadcrumb="Analytics / Comparative Workspace",
        last_updated=datetime.now().strftime("%I:%M %p"),
        online_count=3,
        total_nodes=3,
        is_simulated=True
    )

    # Filter Bar
    f_col1, f_col2, f_col3, f_col4 = st.columns([1.2, 1.2, 1.4, 1.0])

    with f_col1:
        plant_filter = st.selectbox("Plant Selection", ["All Plants", "Tulsi (TULSI_01)", "Hibiscus (HIBISCUS_01)", "Money Plant (MONEYPLANT_01)"])

    with f_col2:
        date_range = st.selectbox("Date Range", ["Last 24 Hours", "Last 12 Hours", "Last 6 Hours", "All Telemetry Records"])

    with f_col3:
        metric_choice = st.selectbox(
            "Sensor Metric",
            [
                "Leaf Temperature (°C)",
                "Soil Moisture (%)",
                "Canopy-Air Delta-T (°C)",
                "Ambient Temperature (°C)",
                "Relative Humidity (%)",
                "Light Intensity (Lux)"
            ]
        )

    metric_key_map = {
        "Leaf Temperature (°C)": "leaf_temp_c",
        "Soil Moisture (%)": "soil_moisture_pct",
        "Canopy-Air Delta-T (°C)": "delta_t_c",
        "Ambient Temperature (°C)": "ambient_temp_c",
        "Relative Humidity (%)": "ambient_humidity_pct",
        "Light Intensity (Lux)": "light_lux"
    }
    selected_metric = metric_key_map[metric_choice]

    df_cross = load_cross_plant_comparison_df(limit_per_plant=60)

    if plant_filter != "All Plants":
        dev_id_sel = "TULSI_01" if "Tulsi" in plant_filter else ("HIBISCUS_01" if "Hibiscus" in plant_filter else "MONEYPLANT_01")
        df_cross_filtered = df_cross[df_cross["device_id"] == dev_id_sel]
    else:
        df_cross_filtered = df_cross

    with f_col4:
        st.write("")
        st.write("")
        if not df_cross_filtered.empty:
            csv_data = df_cross_filtered.to_csv(index=False).encode('utf-8')
            st.download_button(
                label="Export CSV",
                data=csv_data,
                file_name=f"rootwhisper_telemetry_{datetime.now().strftime('%Y%m%d_%H%M%S')}.csv",
                mime="text/csv",
                use_container_width=True
            )

    st.html("<div style='height: 10px;'></div>")

    # Primary Comparison Chart
    if not df_cross_filtered.empty:
        st.plotly_chart(
            plot_cross_plant_comparison(
                df_cross_filtered,
                metric=selected_metric,
                title=f"{metric_choice} Trend Comparison"
            ),
            use_container_width=True
        )

        # Secondary 2-Column Analytical Breakdown
        c1, c2 = st.columns(2)
        with c1:
            st.plotly_chart(
                plot_cross_plant_comparison(df_cross_filtered, metric="soil_moisture_pct", title="Volumetric Soil Moisture (%) Depletion Rates"),
                use_container_width=True
            )
        with c2:
            st.plotly_chart(
                plot_cross_plant_comparison(df_cross_filtered, metric="delta_t_c", title="Canopy-Air Temperature Difference (ΔT = T_leaf - T_air)"),
                use_container_width=True
            )
    else:
        st.info("Insufficient historical records found to render comparative trends.")


# -------------------------------------------------------------------------------------
# 4. AI SCREENING WORKFLOW
# -------------------------------------------------------------------------------------
elif page_selection == "AI Screening":
    render_app_header(
        page_title="AI Water-Stress Screening",
        breadcrumb="AI Engine / Physiological Decision Logic",
        last_updated=datetime.now().strftime("%I:%M %p"),
        online_count=3,
        total_nodes=3,
        is_simulated=True
    )

    # Minimal Horizontal Process Diagram
    render_ai_workflow_diagram()

    # Specimen Scientific Breakdown Cards
    st.html(f"""<div style="font-size: 13px; font-weight: 700; color: {DESIGN_SYSTEM['charcoal']}; text-transform: uppercase; letter-spacing: 0.5px; margin-bottom: 12px;">
  Live Specimen Screening Evaluations
</div>""")

    devices = load_all_devices()
    w_cols = st.columns(3)

    for idx, d in enumerate(devices):
        dev_id = d["device_id"]
        latest = load_latest_plant_status(dev_id)
        scr = latest["screening"]
        tele = latest["telemetry"]
        plant_svg = PLANT_IMG_TAGS.get(dev_id, "")
        plant_title = PLANT_DISPLAY.get(dev_id, {}).get("name", d.get("plant_name", dev_id))

        with w_cols[idx]:
            exp_val = f"{scr['expected_leaf_temp_c']:.1f} °C" if (scr and scr.get('expected_leaf_temp_c')) else "N/A"
            obs_val = f"{tele['leaf_temp_c']:.1f} °C" if tele else "N/A"
            res_val = f"{scr['residual_c']:+.2f} °C" if (scr and scr.get('residual_c') is not None) else "N/A"
            soil_val = f"{tele['soil_moisture_pct']:.1f} %" if tele else "N/A"
            soil_eval = 'DRY DEFICIT' if (tele and tele['soil_moisture_pct'] < d.get('provisional_soil_dry_threshold_pct', 35)) else 'ADEQUATE'
            persistence_count = scr['elevated_count_in_window'] if scr else 0
            persistence_max = d.get('persistence_window_size', 5)

            st.html(f"""<div class="rw-card">
  <div>
    <div style="display: flex; align-items: center; justify-content: space-between; margin-bottom: 12px;">
      <div style="display: flex; align-items: center; gap: 10px;">
        {plant_svg}
        <div>
          <div style="font-size: 15px; font-weight: 700; color: {DESIGN_SYSTEM['charcoal']};">{plant_title}</div>
          <div style="font-size: 11px; color: {DESIGN_SYSTEM['secondary_text']}; font-family: monospace;">{dev_id}</div>
        </div>
      </div>
      <div>{get_status_pill_html(scr['screening_output'] if scr else 'Inconclusive')}</div>
    </div>

    <!-- Step Breakdown -->
    <div style="background: #FAFBF9; border: 1px solid {DESIGN_SYSTEM['border_light']}; border-radius: 8px; padding: 12px; font-size: 12px; color: {DESIGN_SYSTEM['charcoal']}; line-height: 1.8; margin-bottom: 12px;">
      <div><strong>Observed Leaf:</strong> <span style="font-variant-numeric: tabular-nums;">{obs_val}</span></div>
      <div><strong>AI Expected Baseline:</strong> <span style="font-variant-numeric: tabular-nums;">{exp_val}</span></div>
      <div><strong>Thermal Residual:</strong> <span style="font-weight: 700; color: {DESIGN_SYSTEM['alert_red']}; font-variant-numeric: tabular-nums;">{res_val}</span></div>
      <div><strong>Soil Moisture:</strong> <span style="font-variant-numeric: tabular-nums;">{soil_val}</span> ({soil_eval})</div>
      <div><strong>Persistence Window:</strong> {persistence_count} / {persistence_max} cycles (~25 min)</div>
    </div>
  </div>

  <div style="background: #FAFBF9; border: 1px solid {DESIGN_SYSTEM['border_light']}; border-left: 3px solid {DESIGN_SYSTEM['forest_green']}; border-radius: 6px; padding: 10px 12px; font-size: 11.5px; color: {DESIGN_SYSTEM['charcoal']};">
    <strong>Agronomic Reasoning:</strong><br>
    {scr['scientific_reason'] if scr else 'Awaiting telemetry cycles.'}
  </div>
</div>""")


# -------------------------------------------------------------------------------------
# 5. HARDWARE DIAGNOSTICS
# -------------------------------------------------------------------------------------
elif page_selection == "Hardware Diagnostics":
    render_app_header(
        page_title="Hardware Diagnostics & Calibration",
        breadcrumb="System / Multi-Node Hardware Health",
        last_updated=datetime.now().strftime("%I:%M %p"),
        online_count=3,
        total_nodes=3,
        is_simulated=True
    )

    devices = load_all_devices()

    st.html(f"""<div style="font-size: 13px; font-weight: 700; color: {DESIGN_SYSTEM['charcoal']}; text-transform: uppercase; letter-spacing: 0.5px; margin-bottom: 12px;">
  ESP32 DevKit V1 Hardware Node Matrix
</div>""")

    # 3 Node Panels in an aligned grid
    node_cols = st.columns(3)
    for idx, d in enumerate(devices):
        dev_id = d["device_id"]
        latest = load_latest_plant_status(dev_id)
        tele = latest["telemetry"]
        is_online = d.get("is_online", False)
        svg_icon = PLANT_IMG_TAGS.get(dev_id, "")
        plant_title = PLANT_DISPLAY.get(dev_id, {}).get("name", d.get("plant_name", dev_id))

        online_badge = '<span style="color: #2E7D52; font-weight: 600;">● Online</span>' if is_online else '<span style="color: #8A948E; font-weight: 600;">○ Offline</span>'
        mlx_stat = '<span style="color: #2E7D52; font-weight: 600;">OK</span>' if (tele and tele.get("mlx_connected")) else '<span style="color: #C95D58; font-weight: 600;">FAULT</span>'
        aht_stat = '<span style="color: #2E7D52; font-weight: 600;">OK</span>' if (tele and tele.get("aht_connected")) else '<span style="color: #C95D58; font-weight: 600;">FAULT</span>'
        bh_stat = '<span style="color: #2E7D52; font-weight: 600;">OK</span>' if (tele and tele.get("bh1750_connected")) else '<span style="color: #C95D58; font-weight: 600;">FAULT</span>'
        soil_stat = '<span style="color: #2E7D52; font-weight: 600;">VALID</span>' if (tele and tele.get("soil_sensor_valid")) else '<span style="color: #C95D58; font-weight: 600;">INVALID</span>'
        rssi_str = f"{tele['wifi_rssi']} dBm" if (tele and tele.get("wifi_rssi")) else "N/A"
        soil_adc = f"{tele['soil_moisture_raw']} ADC" if (tele and tele.get("soil_moisture_raw")) else "N/A"

        with node_cols[idx]:
            st.html(f"""<div class="rw-card">
  <div>
    <div style="display: flex; align-items: center; justify-content: space-between; margin-bottom: 12px;">
      <div style="display: flex; align-items: center; gap: 10px;">
        {svg_icon}
        <div>
          <div style="font-size: 15px; font-weight: 700; color: {DESIGN_SYSTEM['charcoal']};">{plant_title}</div>
          <div style="font-size: 11px; color: {DESIGN_SYSTEM['secondary_text']}; font-family: monospace;">{dev_id}</div>
        </div>
      </div>
      <div>{online_badge}</div>
    </div>

    <!-- Sensor Health List -->
    <div style="background: #FAFBF9; border: 1px solid {DESIGN_SYSTEM['border_light']}; border-radius: 8px; padding: 12px; font-size: 12px; color: {DESIGN_SYSTEM['charcoal']}; line-height: 1.8;">
      <div style="display: flex; justify-content: space-between;">
        <span style="color: {DESIGN_SYSTEM['secondary_text']};">Wi-Fi Signal:</span>
        <span style="font-weight: 600;">{rssi_str}</span>
      </div>
      <div style="display: flex; justify-content: space-between;">
        <span style="color: {DESIGN_SYSTEM['secondary_text']};">MLX90614 (0x5A IR):</span>
        {mlx_stat}
      </div>
      <div style="display: flex; justify-content: space-between;">
        <span style="color: {DESIGN_SYSTEM['secondary_text']};">AHT25 (0x38 Temp/RH):</span>
        {aht_stat}
      </div>
      <div style="display: flex; justify-content: space-between;">
        <span style="color: {DESIGN_SYSTEM['secondary_text']};">BH1750 (0x23 Light):</span>
        {bh_stat}
      </div>
      <div style="display: flex; justify-content: space-between;">
        <span style="color: {DESIGN_SYSTEM['secondary_text']};">Soil Probe Voltage:</span>
        <span>{soil_stat} ({soil_adc})</span>
      </div>
    </div>
  </div>

  <div style="margin-top: 12px; font-size: 11px; color: {DESIGN_SYSTEM['secondary_text']}; display: flex; justify-content: space-between;">
    <span>Uptime: {tele['uptime_seconds'] if tele else '0'}s</span>
    {get_provenance_tag_html(tele.get('is_simulated', False) if tele else False)}
  </div>
</div>""")

    st.markdown("---")
    st.html(f"<h3 style='font-size: 15px; font-weight: 700; color: {DESIGN_SYSTEM['charcoal']};'>Empirical Calibration & Thresholds Manager</h3>")

    calib_dev_id = st.selectbox("Select Plant Node to Calibrate", ["TULSI_01", "HIBISCUS_01", "MONEYPLANT_01"])
    curr_dev = next((d for d in devices if d["device_id"] == calib_dev_id), None)

    if curr_dev:
        with st.form("calib_form_precision"):
            c1, c2 = st.columns(2)
            new_dry = c1.number_input("Probe Dry ADC (Air)", value=int(curr_dev.get("soil_dry_adc", 3200)), min_value=1000, max_value=4095)
            new_wet = c2.number_input("Probe Wet ADC (Submerged)", value=int(curr_dev.get("soil_wet_adc", 1400)), min_value=500, max_value=3000)

            c3, c4 = st.columns(2)
            new_soil_thresh = c3.number_input("Provisional Soil Dry Cutoff (%)", value=float(curr_dev.get("provisional_soil_dry_threshold_pct", 35.0)), min_value=5.0, max_value=80.0, step=1.0)
            new_temp_thresh = c4.number_input("Provisional Canopy Residual Threshold (°C)", value=float(curr_dev.get("provisional_temp_residual_threshold_c", 1.5)), min_value=0.5, max_value=5.0, step=0.1)

            new_win = st.number_input("Temporal Persistence Window (Cycles)", value=int(curr_dev.get("persistence_window_size", 5)), min_value=1, max_value=20)

            if st.form_submit_button("Save Calibration Parameters"):
                db = get_db_session()
                try:
                    dev_obj = db.query(Device).filter(Device.device_id == calib_dev_id).first()
                    if dev_obj:
                        dev_obj.soil_dry_adc = new_dry
                        dev_obj.soil_wet_adc = new_wet
                        dev_obj.provisional_soil_dry_threshold_pct = new_soil_thresh
                        dev_obj.provisional_temp_residual_threshold_c = new_temp_thresh
                        dev_obj.persistence_window_size = new_win
                        db.commit()
                        st.success(f"Calibration updated and saved for {calib_dev_id}!")
                        st.rerun()
                finally:
                    db.close()


# Auto-refresh loop
if auto_refresh:
    time.sleep(15)
    st.rerun()
