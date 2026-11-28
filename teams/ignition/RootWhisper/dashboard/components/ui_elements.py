"""RootWhisper — Premium Botanical Intelligence UI Elements & Design System.

Implements the 85% Enterprise SaaS + 15% Botanical Personality design system:
- Strict Apple Health / Linear / Stripe level clarity, typography, and tabular alignment.
- Zero clutter, zero cartoonish mascots, zero oversized banners.
"""

from typing import Optional, Any, Dict, List
import streamlit as st
from dashboard.config import DESIGN_SYSTEM, PLANT_IMG_TAGS, LOGO_IMG_TAG


def inject_custom_css():
    """Injects the strict enterprise design system styles."""
    css_content = f"""<style>
@import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&display=swap');

/* Global Reset & Base Typography */
html, body, [class*="css"] {{
    font-family: 'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
    color: {DESIGN_SYSTEM["charcoal"]};
    -webkit-font-smoothing: antialiased;
}}

/* Application Background (Warm Ivory) */
.stApp {{
    background-color: {DESIGN_SYSTEM["warm_ivory"]};
}}

/* Compact Fixed Sidebar (Deep Emerald) */
section[data-testid="stSidebar"] {{
    background-color: {DESIGN_SYSTEM["deep_emerald"]} !important;
    border-right: 1px solid rgba(255, 255, 255, 0.06) !important;
    min-width: 230px !important;
    max-width: 250px !important;
}}

section[data-testid="stSidebar"] * {{
    color: #E2ECE5 !important;
}}

/* Navigation Radio Styling */
section[data-testid="stSidebar"] .stRadio > div {{
    gap: 4px;
}}

section[data-testid="stSidebar"] .stRadio label {{
    background: transparent;
    padding: 8px 12px;
    border-radius: 8px;
    font-weight: 500;
    font-size: 13px;
    color: #C2D6CA !important;
    transition: all 0.15s ease;
    cursor: pointer;
    border-left: 3px solid transparent;
}}

section[data-testid="stSidebar"] .stRadio label:hover {{
    background: rgba(255, 255, 255, 0.06) !important;
    color: #FFFFFF !important;
}}

/* Active Navigation Item (Subtle Sage tint + Indicator) */
section[data-testid="stSidebar"] .stRadio [data-checked="true"] {{
    background: rgba(168, 189, 168, 0.14) !important;
    color: #FFFFFF !important;
    border-left: 3px solid {DESIGN_SYSTEM["sage"]} !important;
    font-weight: 600;
}}

/* Unified Card Component */
.rw-card {{
    background: {DESIGN_SYSTEM["white"]};
    border: 1px solid {DESIGN_SYSTEM["border_subtle"]};
    border-radius: {DESIGN_SYSTEM["card_radius"]};
    padding: 20px 22px;
    box-shadow: {DESIGN_SYSTEM["shadow_subtle"]};
    transition: box-shadow 0.2s ease, border-color 0.2s ease;
    height: 100%;
    display: flex;
    flex-direction: column;
    justify-content: space-between;
}}
.rw-card:hover {{
    box-shadow: 0 4px 16px rgba(23, 63, 50, 0.06);
    border-color: {DESIGN_SYSTEM["sage"]};
}}

/* KPI Metric Cards (Fleet Overview) */
.kpi-card {{
    background: {DESIGN_SYSTEM["white"]};
    border: 1px solid {DESIGN_SYSTEM["border_subtle"]};
    border-radius: {DESIGN_SYSTEM["card_radius"]};
    padding: 16px 18px;
    box-shadow: {DESIGN_SYSTEM["shadow_subtle"]};
    height: 100%;
    display: flex;
    flex-direction: column;
    justify-content: space-between;
}}
.kpi-value {{
    font-size: 24px;
    font-weight: 700;
    color: {DESIGN_SYSTEM["charcoal"]};
    font-variant-numeric: tabular-nums;
    margin: 6px 0 2px 0;
    letter-spacing: -0.4px;
}}
.kpi-label {{
    font-size: 11.5px;
    font-weight: 600;
    color: {DESIGN_SYSTEM["secondary_text"]};
    text-transform: uppercase;
    letter-spacing: 0.5px;
}}

/* Clean Status Pills */
.status-pill {{
    display: inline-flex;
    align-items: center;
    gap: 5px;
    padding: 3px 10px;
    border-radius: 6px;
    font-size: 11.5px;
    font-weight: 600;
    letter-spacing: 0.1px;
}}
.status-normal {{
    background: {DESIGN_SYSTEM["normal_green_bg"]};
    color: {DESIGN_SYSTEM["normal_green"]};
    border: 1px solid #C8E6D3;
}}
.status-stress {{
    background: {DESIGN_SYSTEM["alert_red_bg"]};
    color: {DESIGN_SYSTEM["alert_red"]};
    border: 1px solid #F5CCC9;
}}
.status-inconclusive {{
    background: {DESIGN_SYSTEM["warning_amber_bg"]};
    color: {DESIGN_SYSTEM["warning_amber"]};
    border: 1px solid #F6DFB8;
}}
.status-offline {{
    background: {DESIGN_SYSTEM["offline_bg"]};
    color: {DESIGN_SYSTEM["offline_grey"]};
    border: 1px solid #DCE2DC;
}}

/* Provenance Tags */
.tag-provenance {{
    font-size: 10.5px;
    font-weight: 600;
    padding: 2px 8px;
    border-radius: 4px;
    letter-spacing: 0.3px;
    display: inline-block;
}}
.tag-simulated {{
    background: #F3EEF8;
    color: #6B4E85;
    border: 1px solid #DDD0E8;
}}
.tag-physical {{
    background: #E8F3EE;
    color: #173F32;
    border: 1px solid #C6DDD2;
}}

/* Tabular Metric Grid */
.metric-grid {{
    display: grid;
    grid-template-columns: 1fr 1fr;
    gap: 12px;
    padding: 12px 14px;
    background: #FAFBF9;
    border: 1px solid {DESIGN_SYSTEM["border_light"]};
    border-radius: 8px;
    margin: 12px 0;
}}
.metric-item {{
    display: flex;
    flex-direction: column;
}}
.metric-key {{
    font-size: 11px;
    color: {DESIGN_SYSTEM["secondary_text"]};
    font-weight: 500;
}}
.metric-val {{
    font-size: 15px;
    font-weight: 600;
    color: {DESIGN_SYSTEM["charcoal"]};
    font-variant-numeric: tabular-nums;
    margin-top: 2px;
}}

/* Metric Styling Override for Enterprise Precision */
[data-testid="stMetricValue"] {{
    font-size: 19px !important;
    font-weight: 700 !important;
    font-variant-numeric: tabular-nums !important;
    color: #26342D !important;
    white-space: nowrap !important;
    overflow: visible !important;
    line-height: 1.2 !important;
}}
[data-testid="stMetricLabel"] {{
    font-size: 11px !important;
    font-weight: 600 !important;
    color: #78847C !important;
    text-transform: uppercase !important;
    letter-spacing: 0.5px !important;
}}
[data-testid="stMetricDelta"] {{
    font-size: 11px !important;
    font-weight: 500 !important;
    white-space: nowrap !important;
}}

/* Compact Scientific Notice */
.scientific-notice {{
    background: #FCFBF7;
    border-left: 3px solid {DESIGN_SYSTEM["warning_amber"]};
    border: 1px solid #ECE7D8;
    border-left-width: 3px;
    border-radius: 8px;
    padding: 10px 14px;
    font-size: 11.5px;
    color: #5D5646;
    margin-bottom: 16px;
    line-height: 1.5;
}}

/* Streamlit Element Cleanups */
div[data-testid="stHorizontalBlock"] {{
    align-items: stretch;
}}
button[kind="secondary"] {{
    border-radius: 8px !important;
    font-size: 12.5px !important;
    font-weight: 600 !important;
}}
</style>"""
    st.html(css_content)


def render_app_header(
    page_title: str,
    breadcrumb: str,
    last_updated: str,
    online_count: int = 3,
    total_nodes: int = 3,
    is_simulated: bool = True
):
    """
    Renders a clean, executive top header with page context and unified system state.
    Eliminates duplicated badges and oversized banners.
    """
    prov_pill = '<span class="tag-provenance tag-simulated">SIMULATED DATA</span>' if is_simulated else '<span class="tag-provenance tag-physical">PHYSICAL TELEMETRY</span>'

    header_html = f"""<div style="display: flex; justify-content: space-between; align-items: flex-end; padding-bottom: 14px; border-bottom: 1px solid {DESIGN_SYSTEM['border_subtle']}; margin-bottom: 20px;">
  <div>
    <div style="font-size: 11px; font-weight: 600; color: {DESIGN_SYSTEM['secondary_text']}; text-transform: uppercase; letter-spacing: 0.6px; margin-bottom: 3px;">
      {breadcrumb}
    </div>
    <h1 style="font-size: 22px; font-weight: 700; color: {DESIGN_SYSTEM['charcoal']}; margin: 0; letter-spacing: -0.4px;">
      {page_title}
    </h1>
  </div>
  <div style="display: flex; align-items: center; gap: 10px; font-size: 12px;">
    <span style="display: inline-flex; align-items: center; gap: 5px; color: {DESIGN_SYSTEM['secondary_text']}; font-weight: 500;">
      <span style="width: 7px; height: 7px; border-radius: 50%; background: {'#2E7D52' if online_count > 0 else '#8A948E'};"></span>
      {online_count}/{total_nodes} Nodes Online
    </span>
    <span style="color: {DESIGN_SYSTEM['border_subtle']};">|</span>
    <span style="color: {DESIGN_SYSTEM['secondary_text']}; font-variant-numeric: tabular-nums;">
      Sync: {last_updated}
    </span>
    <span style="color: {DESIGN_SYSTEM['border_subtle']};">|</span>
    {prov_pill}
  </div>
</div>"""
    st.html(header_html)


def render_scientific_caveat():
    """Renders the required scientific specimen boundary disclaimer in restrained styling."""
    notice_html = f"""<div class="scientific-notice">
  <strong>Scientific Specimen Boundary (N=1):</strong>
  Adaptive baseline models reflect individual plant response calibration and do not establish generalized species-level physiological thresholds. Thermal residual and soil drying cutoffs are provisional parameters for research calibration.
</div>"""
    st.html(notice_html)


def format_sensor_reading(value: Optional[float], unit: str, is_valid: bool = True) -> str:
    """Safely formats sensor readings; converts invalid values (-99.0) into SENSOR ERROR."""
    if value is None or not is_valid or value <= -90.0:
        return "SENSOR ERROR"
    return f"{value:.1f} {unit}"


def get_status_pill_html(status: str, is_online: bool = True) -> str:
    """Returns restrained, professional status pill."""
    if not is_online:
        return '<span class="status-pill status-offline">● Offline</span>'
    if status == "Normal":
        return '<span class="status-pill status-normal">Normal</span>'
    elif status == "Possible Water-Stress Indication":
        return '<span class="status-pill status-stress">Possible Stress</span>'
    else:
        return '<span class="status-pill status-inconclusive">Inconclusive</span>'


def get_provenance_tag_html(is_simulated: bool) -> str:
    """Returns explicit data provenance tag."""
    if is_simulated:
        return '<span class="tag-provenance tag-simulated">Simulated</span>'
    return '<span class="tag-provenance tag-physical">Physical</span>'


def render_ai_workflow_diagram():
    """Renders the minimal, scientific horizontal process diagram."""
    flow_html = f"""<div style="background: {DESIGN_SYSTEM['white']}; border: 1px solid {DESIGN_SYSTEM['border_subtle']}; border-radius: {DESIGN_SYSTEM['card_radius']}; padding: 18px 22px; box-shadow: {DESIGN_SYSTEM['shadow_subtle']}; margin-bottom: 22px;">
  <div style="font-size: 11px; font-weight: 700; color: {DESIGN_SYSTEM['secondary_text']}; text-transform: uppercase; letter-spacing: 0.6px; margin-bottom: 12px;">
    AI Screening Pipeline & Inference Sequence
  </div>
  <div style="display: flex; align-items: center; justify-content: space-between; flex-wrap: wrap; gap: 8px;">
    <div style="flex: 1; min-width: 130px; background: #FAFBF9; border: 1px solid {DESIGN_SYSTEM['border_subtle']}; border-radius: 8px; padding: 10px 12px; text-align: left;">
      <div style="font-size: 10.5px; color: {DESIGN_SYSTEM['secondary_text']}; font-weight: 600;">STEP 01</div>
      <div style="font-size: 12.5px; font-weight: 600; color: {DESIGN_SYSTEM['charcoal']}; margin-top: 2px;">Environmental Data</div>
      <div style="font-size: 10px; color: {DESIGN_SYSTEM['secondary_text']}; margin-top: 1px;">Temp, RH, Light, VPD</div>
    </div>
    <div style="color: {DESIGN_SYSTEM['sage']}; font-weight: 600; font-size: 14px;">→</div>
    <div style="flex: 1; min-width: 130px; background: {DESIGN_SYSTEM['pale_sage']}; border: 1px solid #D5E2D7; border-radius: 8px; padding: 10px 12px; text-align: left;">
      <div style="font-size: 10.5px; color: {DESIGN_SYSTEM['forest_green']}; font-weight: 600;">STEP 02</div>
      <div style="font-size: 12.5px; font-weight: 600; color: {DESIGN_SYSTEM['deep_emerald']}; margin-top: 2px;">Expected Leaf Temp</div>
      <div style="font-size: 10px; color: {DESIGN_SYSTEM['forest_green']}; margin-top: 1px;">Random Forest Baseline</div>
    </div>
    <div style="color: {DESIGN_SYSTEM['sage']}; font-weight: 600; font-size: 14px;">→</div>
    <div style="flex: 1; min-width: 130px; background: #FAFBF9; border: 1px solid {DESIGN_SYSTEM['border_subtle']}; border-radius: 8px; padding: 10px 12px; text-align: left;">
      <div style="font-size: 10.5px; color: {DESIGN_SYSTEM['secondary_text']}; font-weight: 600;">STEP 03</div>
      <div style="font-size: 12.5px; font-weight: 600; color: {DESIGN_SYSTEM['charcoal']}; margin-top: 2px;">Thermal Residual</div>
      <div style="font-size: 10px; color: {DESIGN_SYSTEM['secondary_text']}; margin-top: 1px;">e = Tactual - T̂expected</div>
    </div>
    <div style="color: {DESIGN_SYSTEM['sage']}; font-weight: 600; font-size: 14px;">→</div>
    <div style="flex: 1; min-width: 130px; background: {DESIGN_SYSTEM['alert_red_bg']}; border: 1px solid #F5CCC9; border-radius: 8px; padding: 10px 12px; text-align: left;">
      <div style="font-size: 10.5px; color: {DESIGN_SYSTEM['alert_red']}; font-weight: 600;">STEP 04</div>
      <div style="font-size: 12.5px; font-weight: 600; color: {DESIGN_SYSTEM['alert_red']}; margin-top: 2px;">Soil Evidence</div>
      <div style="font-size: 10px; color: {DESIGN_SYSTEM['alert_red']}; margin-top: 1px;">Independent Probe Deficit</div>
    </div>
    <div style="color: {DESIGN_SYSTEM['sage']}; font-weight: 600; font-size: 14px;">→</div>
    <div style="flex: 1; min-width: 130px; background: #FAFBF9; border: 1px solid {DESIGN_SYSTEM['border_subtle']}; border-radius: 8px; padding: 10px 12px; text-align: left;">
      <div style="font-size: 10.5px; color: {DESIGN_SYSTEM['secondary_text']}; font-weight: 600;">STEP 05</div>
      <div style="font-size: 12.5px; font-weight: 600; color: {DESIGN_SYSTEM['charcoal']}; margin-top: 2px;">Persistence Filter</div>
      <div style="font-size: 10px; color: {DESIGN_SYSTEM['secondary_text']}; margin-top: 1px;">5-Reading Window (~25m)</div>
    </div>
    <div style="color: {DESIGN_SYSTEM['sage']}; font-weight: 600; font-size: 14px;">→</div>
    <div style="flex: 1; min-width: 130px; background: #F3EEF8; border: 1px solid #DDD0E8; border-radius: 8px; padding: 10px 12px; text-align: left;">
      <div style="font-size: 10.5px; color: #6B4E85; font-weight: 600;">STEP 06</div>
      <div style="font-size: 12.5px; font-weight: 600; color: #4F3269; margin-top: 2px;">Screening Verdict</div>
      <div style="font-size: 10px; color: #6B4E85; margin-top: 1px;">Normal / Stress / Inconcl.</div>
    </div>
  </div>
</div>"""
    st.html(flow_html)
