"""MineAudit AI (mineaudit.ai) — Odisha Satellite Audit, 3D Mine Terrain, Safety & Replanting Platform."""
from __future__ import annotations

from typing import Any

import pandas as pd
import streamlit as st
from streamlit_folium import st_folium

from modules.auth import (
    DEFAULT_ACCOUNTS,
    assert_role,
    can_export_report,
    can_upload_or_audit,
    direct_login_profile,
    dispatch_govt_notice,
    list_dispatched_notices,
    load_audit_summaries,
    load_user_mines,
    logout_session,
    require_login,
    save_user_audit_summary,
    save_user_mine,
    update_notice_status,
)
from modules.classifier import classify_zones, generate_alerts
from modules.demo_generator import load_demo_bundle_for_mine
from modules.extraction import compute_extraction_audit
from modules.io_loader import (
    align_inputs,
    download_from_url,
    load_dem_bytes,
    load_geojson_bytes,
    load_satellite_bytes,
    load_species_csv_bytes,
)
from modules.map_viz import (
    build_3d_cross_section,
    build_3d_mine_surface,
    build_folium_zone_map,
    build_odisha_directory_map,
    build_offline_odisha_plotly_map,
    chart_extraction_by_zone,
    chart_veg_loss_by_zone,
)
from modules.odisha_directory import (
    MINERAL_COLORS,
    MINERAL_DENSITIES,
    MINERAL_TYPES,
    build_manual_mine_record,
    filter_mines,
    get_districts_geojson,
    get_odisha_geojson,
    load_base_odisha_mines,
    merge_user_mines,
    validate_and_parse_uploaded_mines,
)
from modules.replanting import BUILTIN_NATIVE_SPECIES, SPECIES_NOTICE, plan_replanting
from modules.report_gen import generate_html_report, generate_pdf_report
from modules.vegetation import FOREST_DENSITY_PRESETS, analyze_vegetation
from modules.zones import build_zone_grid


st.set_page_config(
    page_title="MineAudit AI (mineaudit.ai) — Odisha 3D Mine Audit",
    page_icon="🌿",
    layout="wide",
    initial_sidebar_state="expanded",
)

# Modern Deep-Emerald Obsidian Command-Center Theme
st.markdown(
    """
    <style>
      .stApp {
        background: radial-gradient(circle at top right, #0e2026 0%, #081014 55%, #060b0e 100%);
        color: #f1f5f9;
      }
      section[data-testid="stSidebar"] {
        background: linear-gradient(180deg, #0c171c 0%, #091216 100%);
        border-right: 1px solid #1b3138;
      }
      .hero-card {
        background: linear-gradient(135deg, rgba(16,185,129,0.14) 0%, rgba(14,165,233,0.08) 55%, rgba(15,27,33,0.95) 100%);
        border: 1px solid rgba(52, 211, 153, 0.28);
        border-radius: 16px;
        padding: 26px 28px;
        margin-bottom: 18px;
        box-shadow: 0 18px 42px rgba(0,0,0,0.35);
      }
      .problem-card {
        background: rgba(15, 27, 33, 0.88);
        border: 1px solid #1e353d;
        border-top: 3px solid #10b981;
        border-radius: 12px;
        padding: 15px 14px;
        min-height: 138px;
      }
      .kpi-card {
        background: linear-gradient(180deg, #101e25 0%, #0c161b 100%);
        border: 1px solid #1e353d;
        border-radius: 12px;
        padding: 12px 14px;
        box-shadow: 0 6px 18px rgba(0,0,0,0.25);
      }
      .kpi-label { font-size: 11px; text-transform: uppercase; letter-spacing: 0.7px; color: #94a3b8; font-weight: 600; }
      .kpi-value { font-size: 22px; font-weight: 800; color: #f8fafc; margin: 3px 0 2px 0; white-space: nowrap; }
      .kpi-sub { font-size: 11px; color: #34d399; font-weight: 600; }
      .auth-badge {
        display: inline-flex;
        align-items: center;
        gap: 6px;
        background: rgba(16, 185, 129, 0.14);
        border: 1px solid rgba(52, 211, 153, 0.35);
        color: #a7f3d0;
        padding: 4px 10px;
        border-radius: 999px;
        font-size: 12px;
        font-weight: 600;
      }
      .mine-banner {
        background: linear-gradient(90deg, rgba(16,185,129,0.14) 0%, rgba(15,27,33,0.92) 100%);
        border: 1px solid rgba(52, 211, 153, 0.32);
        border-left: 5px solid #10b981;
        border-radius: 12px;
        padding: 11px 16px;
        margin-bottom: 12px;
        font-size: 13px;
        color: #e2e8f0;
      }
      .limits-box {
        background: rgba(15, 27, 33, 0.9);
        border: 1px solid #1e353d;
        border-left: 4px solid #38bdf8;
        padding: 12px 16px;
        border-radius: 8px;
        font-size: 12.5px;
        color: #cbd5e1;
        margin-top: 12px;
      }
      div[data-testid="stMetric"] {
        background: #0f1b21;
        border: 1px solid #1e353d;
        border-radius: 10px;
        padding: 10px 14px;
      }
    </style>
    """,
    unsafe_allow_html=True,
)

# ==============================================================================
# DIRECT LOGIN / AUTHENTICATION GUARD
# ==============================================================================
current_user = require_login()
user_id = int(current_user["id"])
user_role = str(current_user["role"])

PAGES = [
    "Home",
    "Mine Finder",
    "Data Input",
    "Dashboard",
    "3D Mine View",
    "Safety Map",
    "Trees",
    "Alerts",
    "Report",
]


def _default_mine_state(mine_row: dict[str, Any]) -> dict[str, Any]:
    """Initialize per-mine state pre-loaded with Odisha baseline satellite & DEM rasters."""
    mineral = str(mine_row.get("mineral", "iron ore")).lower()
    lease_ha = float(mine_row.get("lease_area_ha") or 500.0)
    baseline = load_demo_bundle_for_mine(mine_row)
    state_dict = {
        **baseline,
        "mine_name": str(mine_row["mine_name"]),
        "state": "Odisha",
        "district": str(mine_row["district"]),
        "mineral_type": mineral,
        "mine_area_ha_override": lease_ha,
    }
    return state_dict


def _init_app_state(all_mines_df: pd.DataFrame) -> None:
    if "nav_page" not in st.session_state:
        st.session_state["nav_page"] = "Home"
    if "mine_store" not in st.session_state:
        st.session_state["mine_store"] = {}
    if "selected_mine_id" not in st.session_state:
        st.session_state["selected_mine_id"] = str(all_mines_df.iloc[0]["mine_id"])
    if "offline_map_mode" not in st.session_state:
        st.session_state["offline_map_mode"] = False
    if "show_all_mines" not in st.session_state:
        st.session_state["show_all_mines"] = True


def _get_mine_state(mine_row: dict[str, Any]) -> dict[str, Any]:
    mid = str(mine_row["mine_id"])
    store = st.session_state["mine_store"]
    if mid not in store:
        store[mid] = _default_mine_state(mine_row)
    return store[mid]


def _render_kpi_cards(items: list[tuple[str, str, str, str]]) -> None:
    cols = st.columns(len(items))
    for col, (label, value, sub, accent) in zip(cols, items):
        col.markdown(
            f"""
            <div class="kpi-card" style="border-top:3px solid {accent};">
              <div class="kpi-label">{label}</div>
              <div class="kpi-value">{value}</div>
              <div class="kpi-sub" style="color:{accent};">{sub}</div>
            </div>
            """,
            unsafe_allow_html=True,
        )


def _render_assumptions_box(veg_label: str | None = None) -> None:
    extra = f"<br>• <b>Vegetation Index:</b> {veg_label}" if veg_label else ""
    st.markdown(
        f"""
        <div class="limits-box">
          <b>Assumptions &amp; Limitations:</b>
          Satellite imagery captures surface signatures only—not sub-surface ore bodies.
          Reserve numbers, remaining tonnage, and tree loss counts are <b>estimates</b>.
          Mine directory coordinates marked <i>approximate</i> should be verified on site.
          Upload site-specific GeoTIFFs or DEMs in <b>Data Input</b> to override the pre-loaded Odisha baseline dataset.
          {extra}
        </div>
        """,
        unsafe_allow_html=True,
    )


def _load_input_slot(
    mine_id: str,
    mstate: dict[str, Any],
    label: str,
    key: str,
    loader_fn,
    accepted_types: list[str],
    extra_kwargs: dict | None = None,
):
    st.markdown(f"**{label}**")
    mode = st.radio(
        f"{label} source",
        ["Upload file", "Paste URL"],
        horizontal=True,
        key=f"src_{mine_id}_{key}",
        label_visibility="collapsed",
    )
    if mode == "Upload file":
        up = st.file_uploader(
            f"Upload {label}",
            type=accepted_types,
            key=f"up_{mine_id}_{key}",
            label_visibility="collapsed",
        )
        if up is not None:
            try:
                assert_role(user_role, "upload_or_audit")
                raw = up.getvalue()
                mstate[key] = loader_fn(raw, up.name, **(extra_kwargs or {}))
                mstate["data_source_label"] = f"User Upload ({up.name})"
            except Exception as exc:
                st.error(f"{label}: {exc}")
    else:
        url = st.text_input(f"Direct URL for {label}", key=f"url_{mine_id}_{key}", placeholder="https://...")
        if st.button(f"Fetch {label}", key=f"btn_{mine_id}_{key}"):
            if not url.strip():
                st.warning("Please paste a valid http/https URL first.")
            else:
                try:
                    assert_role(user_role, "upload_or_audit")
                    raw, fname = download_from_url(url)
                    mstate[key] = loader_fn(raw, fname, **(extra_kwargs or {}))
                    mstate["data_source_label"] = f"Remote URL ({fname})"
                    st.success(f"Loaded {fname}")
                except Exception as exc:
                    st.error(f"{label} download failed: {exc}")

    val = mstate.get(key)
    if val is not None:
        if hasattr(val, "rgb_preview"):
            st.image(val.rgb_preview, caption=f"Preview: {val.source_name}", width=210)
            for w in val.warnings:
                st.caption(f"⚠ {w}")
        elif hasattr(val, "preview_rgb"):
            st.image(val.preview_rgb, caption=f"DEM: {val.source_name}", width=210)
            for w in val.warnings:
                st.caption(f"⚠ {w}")
        elif key == "boundary_geojson":
            st.caption("✓ Lease boundary GeoJSON loaded")
        elif key == "species_df":
            st.caption(f"✓ {len(val)} native species loaded")


base_mines_df = load_base_odisha_mines()
user_added_mines = load_user_mines(user_id)
all_mines_df = merge_user_mines(base_mines_df, user_added_mines)
_init_app_state(all_mines_df)

def _go_to(page_name: str) -> None:
    st.session_state["nav_page"] = page_name


# ==============================================================================
# SIDEBAR
# ==============================================================================
with st.sidebar:
    st.markdown(
        "<div style='font-size:22px;font-weight:800;color:#34d399;'>🌿 MineAudit AI</div>"
        "<div style='font-size:12px;color:#94a3b8;margin-bottom:8px;'>mineaudit.ai · Odisha 3D Audit Platform</div>",
        unsafe_allow_html=True,
    )

    selected_page = st.radio("Navigation", PAGES, key="nav_page")

    st.divider()
    st.subheader("📍 Odisha Mine Selector")

    districts_list = ["All"] + sorted(all_mines_df["district"].dropna().astype(str).unique().tolist())
    minerals_list = ["All"] + sorted(all_mines_df["mineral"].dropna().astype(str).unique().tolist())

    f_dist = st.selectbox("District (Odisha only)", districts_list)
    f_min = st.selectbox("Mineral type", minerals_list)
    f_search = st.text_input("Search mine name", placeholder="e.g. Joda, Sukinda, Talcher...")

    filtered_df = filter_mines(all_mines_df, district=f_dist, mineral=f_min, search_text=f_search)
    st.session_state["show_all_mines"] = st.checkbox("Show all mines on map", value=st.session_state["show_all_mines"])

    if filtered_df.empty:
        st.warning("No Odisha mines match those filters.")
        active_mine_row = all_mines_df.iloc[0].to_dict()
    else:
        mine_options = filtered_df["mine_id"].tolist()
        label_map = {
            r["mine_id"]: f"{r['mine_name']} ({r['district']} · {r['mineral']})"
            for _, r in filtered_df.iterrows()
        }
        cur_id = st.session_state["selected_mine_id"]
        idx_sel = mine_options.index(cur_id) if cur_id in mine_options else 0
        chosen_id = st.selectbox(
            f"Matching mines ({len(filtered_df)})",
            mine_options,
            index=idx_sel,
            format_func=lambda x: label_map.get(x, x),
        )
        if chosen_id != cur_id:
            st.session_state["selected_mine_id"] = chosen_id
            st.rerun()
        active_mine_row = all_mines_df[all_mines_df["mine_id"] == st.session_state["selected_mine_id"]].iloc[0].to_dict()

    mine_id = str(active_mine_row["mine_id"])
    mstate = _get_mine_state(active_mine_row)

    st.divider()
    with st.expander("📂 Data Input (Per Selected Mine)", expanded=False):
        if not can_upload_or_audit(user_role):
            st.warning("Read-only Viewer role cannot upload files or fetch URLs.")
        else:
            if st.button("🔄 Restore Odisha Baseline Imagery", use_container_width=True, key=f"rst_{mine_id}"):
                mstate.update(_default_mine_state(active_mine_row))
                st.success(f"Restored baseline dataset for {active_mine_row['mine_name']}.")

            mstate["year_before"] = st.number_input("Year BEFORE", 1990, 2030, int(mstate["year_before"]), key=f"yb_{mine_id}")
            _load_input_slot(mine_id, mstate, "1a. Satellite BEFORE", "sat_before", load_satellite_bytes, ["png", "jpg", "jpeg", "tif", "tiff"])
            mstate["year_after"] = st.number_input("Year AFTER", 1990, 2030, int(mstate["year_after"]), key=f"ya_{mine_id}")
            _load_input_slot(mine_id, mstate, "1b. Satellite AFTER", "sat_after", load_satellite_bytes, ["png", "jpg", "jpeg", "tif", "tiff"])

            st.caption("For plain grayscale DEM images (PNG/JPG), set elevation range:")
            c1, c2 = st.columns(2)
            min_elev = c1.number_input("Min elev (m)", value=100.0, step=10.0, key=f"emin_{mine_id}")
            max_elev = c2.number_input("Max elev (m)", value=550.0, step=10.0, key=f"emax_{mine_id}")

            _load_input_slot(mine_id, mstate, "2a. DEM BEFORE", "dem_before", load_dem_bytes, ["tif", "tiff", "png", "jpg", "jpeg"], {"min_elev_m": min_elev, "max_elev_m": max_elev})
            _load_input_slot(mine_id, mstate, "2b. DEM AFTER", "dem_after", load_dem_bytes, ["tif", "tiff", "png", "jpg", "jpeg"], {"min_elev_m": min_elev, "max_elev_m": max_elev})

            mstate["pixel_size_m"] = st.number_input("Pixel size / resolution (m)", 0.5, 250.0, float(mstate["pixel_size_m"]), key=f"px_{mine_id}")
            mstate["mine_area_ha_override"] = st.number_input("Mine area (ha)", 0.0, value=float(mstate["mine_area_ha_override"]), key=f"ha_{mine_id}")
            _load_input_slot(mine_id, mstate, "5a. Lease Boundary (GeoJSON)", "boundary_geojson", load_geojson_bytes, ["geojson", "json"])
            _load_input_slot(mine_id, mstate, "5b. Native Tree Species (CSV)", "species_df", load_species_csv_bytes, ["csv"])

    with st.expander("⛏️ Mine Details Form (Odisha)", expanded=False):
        readonly_form = not can_upload_or_audit(user_role)
        mstate["mine_name"] = st.text_input("Mine name", mstate["mine_name"], disabled=readonly_form, key=f"mname_{mine_id}")
        st.text_input("State (locked)", value="Odisha", disabled=True, key=f"mstate_{mine_id}")
        mstate["district"] = st.text_input("District", mstate["district"], disabled=readonly_form, key=f"mdist_{mine_id}")
        min_idx = MINERAL_TYPES.index(mstate["mineral_type"]) if mstate["mineral_type"] in MINERAL_TYPES else 0
        chosen_min = st.selectbox("Mineral type", MINERAL_TYPES, index=min_idx, disabled=readonly_form, key=f"mmin_{mine_id}")
        if chosen_min != mstate["mineral_type"]:
            mstate["mineral_type"] = chosen_min
            mstate["density_t_m3"] = MINERAL_DENSITIES.get(chosen_min, 3.0)

        mstate["density_t_m3"] = st.number_input("Density (t/m³)", 0.5, 8.0, float(mstate["density_t_m3"]), 0.1, disabled=readonly_form, key=f"mden_{mine_id}")
        mstate["approved_total_reserve_t"] = st.number_input("Approved total reserve (tonnes)", 1000.0, value=float(mstate["approved_total_reserve_t"]), step=1_000_000.0, disabled=readonly_form, key=f"mres_{mine_id}")
        mstate["approved_extraction_limit_t"] = st.number_input("Approved extraction limit (tonnes)", 1000.0, value=float(mstate["approved_extraction_limit_t"]), step=500_000.0, disabled=readonly_form, key=f"mlim_{mine_id}")
        mstate["trees_permitted_cut"] = st.number_input("Trees permitted to cut", 0, value=int(mstate["trees_permitted_cut"]), step=500, disabled=readonly_form, key=f"mtree_{mine_id}")
        mstate["replanting_ratio"] = st.selectbox("Replanting ratio", ["1:1", "1:2", "1:3"], index=["1:1", "1:2", "1:3"].index(mstate["replanting_ratio"]), disabled=readonly_form, key=f"mrat_{mine_id}")
        mstate["soil_rainfall_notes"] = st.text_area("Soil / rainfall notes", mstate["soil_rainfall_notes"], disabled=readonly_form, key=f"msoil_{mine_id}")

    with st.expander("🎛️ Zone Grid & Rules", expanded=True):
        grid_n = st.slider("Zone grid size (N × N)", 5, 20, 8)
        mstate["min_worthwhile_reserve_pct"] = st.slider("Min worthwhile reserve (%)", 5.0, 50.0, float(mstate["min_worthwhile_reserve_pct"]), 1.0, key=f"mw_{mine_id}")
        max_slope_deg = st.slider("Max safe slope (degrees)", 15.0, 70.0, 45.0, 1.0)
        max_recent_drop_m = st.slider("Max safe drop (m)", 5.0, 60.0, 28.0, 1.0)
        forest_preset = st.selectbox("Forest type density", list(FOREST_DENSITY_PRESETS.keys()))
        tree_density_per_ha = st.number_input("Tree density (trees/ha)", 10, 1500, FOREST_DENSITY_PRESETS[forest_preset])


def _compute_selected_mine_audit() -> dict[str, Any] | None:
    sb, sa, db, da = mstate["sat_before"], mstate["sat_after"], mstate["dem_before"], mstate["dem_after"]
    if not all([sb, sa, db, da]):
        return None

    sb, sa, db, da, align_notes = align_inputs(sb, sa, db, da)
    px_m = float(mstate["pixel_size_m"])
    density = float(mstate["density_t_m3"])
    reserve_t = float(mstate["approved_total_reserve_t"])
    limit_t = float(mstate["approved_extraction_limit_t"])

    veg_res = analyze_vegetation(sb, sa, pixel_res_m=px_m, tree_density_per_ha=float(tree_density_per_ha), replanting_ratio=mstate["replanting_ratio"])
    ext_res = compute_extraction_audit(db.elevation_m, da.elevation_m, pixel_res_m=px_m, density_t_m3=density, approved_total_reserve_t=reserve_t, approved_extraction_limit_t=limit_t)
    bounds = db.bounds_wgs84 or sb.bounds_wgs84
    zones_df = build_zone_grid(
        grid_n=grid_n, dem_before_m=db.elevation_m, dem_after_m=da.elevation_m, extraction=ext_res, vegetation=veg_res,
        pixel_res_m=px_m, density_t_m3=density, approved_total_reserve_t=reserve_t, approved_extraction_limit_t=limit_t,
        bounds_wgs84=bounds, default_center=(float(active_mine_row["latitude"]), float(active_mine_row["longitude"])),
    )
    classified_df = classify_zones(zones_df, min_worthwhile_reserve_pct=float(mstate["min_worthwhile_reserve_pct"]), max_slope_deg=float(max_slope_deg), max_recent_drop_m=float(max_recent_drop_m))
    alerts = generate_alerts(classified_df, replanting_required=veg_res.replanting_required, trees_lost_est=veg_res.trees_lost_est, trees_permitted_cut=int(mstate["trees_permitted_cut"]))
    replant_df, species_note = plan_replanting(classified_df, replanting_required=veg_res.replanting_required, soil_rainfall_notes=mstate["soil_rainfall_notes"], custom_species_df=mstate.get("species_df"))

    statuses = set(classified_df["status"])
    overall_verdict = (
        "unsafe" if "Unsafe" in statuses
        else "over-mined" if "Over-mined" in statuses
        else "depleted" if "Depleted" in statuses
        else "caution" if "Caution" in statuses
        else "safe"
    )
    save_user_audit_summary(
        user_id,
        {
            "mine_id": mine_id, "mine_name": mstate["mine_name"], "district": mstate["district"],
            "mineral": mstate["mineral_type"], "verdict": overall_verdict,
            "extracted_tonnes": ext_res.extracted_tonnes, "remaining_pct": ext_res.pct_remaining,
            "veg_lost_ha": veg_res.area_lost_ha, "trees_to_replant": veg_res.replanting_required,
            "is_demo": False,
        },
    )
    return {
        "sat_before": sb, "sat_after": sa, "dem_before": db, "dem_after": da,
        "align_notes": align_notes, "veg": veg_res, "ext": ext_res,
        "classified": classified_df, "alerts": alerts, "replant": replant_df,
        "species_note": species_note, "overall_verdict": overall_verdict,
    }


audit = _compute_selected_mine_audit()

# ==============================================================================
# TOP BAR (Direct Login Session Status + Quick Profile Switcher + Selected Mine)
# ==============================================================================
hdr_l, hdr_mid, hdr_r = st.columns([3.0, 2.2, 1.0])
with hdr_l:
    st.markdown(
        f"<div style='padding-top:4px;'>"
        f"<span class='auth-badge'>● Direct Login Active: {current_user['full_name']} ({user_role})</span> "
        f"<span style='font-size:12px;color:#94a3b8;margin-left:8px;'>{current_user['organisation']}</span>"
        f"</div>",
        unsafe_allow_html=True,
    )
with hdr_mid:
    profile_labels = [f"{p[0]} · {p[3]}" for p in DEFAULT_ACCOUNTS]
    profile_emails = [p[1] for p in DEFAULT_ACCOUNTS]
    cur_email = current_user["email"]
    cur_p_idx = profile_emails.index(cur_email) if cur_email in profile_emails else 0
    picked_profile = st.selectbox(
        "Direct Role Switch",
        profile_labels,
        index=cur_p_idx,
        label_visibility="collapsed",
        key="top_role_switch",
    )
    picked_email = profile_emails[profile_labels.index(picked_profile)]
    if picked_email != cur_email and cur_email in profile_emails:
        direct_login_profile(picked_email)
        st.rerun()
with hdr_r:
    if st.button("Logout", key="top_logout", use_container_width=True):
        logout_session(st.session_state, notice="Signed out. Use direct login or enter credentials below.")
        st.rerun()

qual = str(active_mine_row.get("coordinates_quality", "approximate"))
qual_msg = "⚠️ Approximate coordinates — verify location on site" if qual == "approximate" else "✅ Exact coordinates"
b_col1, b_col2 = st.columns([5.2, 1])
with b_col1:
    st.markdown(
        f"""
        <div class="mine-banner">
          <b style="color:#34d399;">Selected Mine:</b> <b>{active_mine_row['mine_name']}</b> ({mine_id}) &nbsp;|&nbsp;
          <b>District:</b> {active_mine_row['district']}, Odisha &nbsp;|&nbsp;
          <b>Mineral:</b> {str(active_mine_row['mineral']).title()} &nbsp;|&nbsp;
          <b>Lease:</b> {active_mine_row.get('lease_area_ha', '—')} ha &nbsp;|&nbsp;
          <span style="color:#fbbf24;">{qual_msg}</span>
        </div>
        """,
        unsafe_allow_html=True,
    )
with b_col2:
    st.button("Change mine", use_container_width=True, on_click=_go_to, args=("Mine Finder",))

# ==============================================================================
# PAGES
# ==============================================================================
if selected_page == "Home":
    st.markdown(
        f"""
        <div class="hero-card">
          <div style="font-size:12px;font-weight:700;letter-spacing:1.2px;color:#34d399;text-transform:uppercase;">
            mineaudit.ai · Odisha State-wide Platform · Signed in as {current_user['full_name']} ({user_role})
          </div>
          <h1 style="margin:6px 0 8px 0;font-size:36px;color:#ffffff;">One state. Every mine. 3D clarity.</h1>
          <p style="font-size:15px;color:#cbd5e1;max-width:850px;margin:0;">
            An AI-powered satellite &amp; 3D terrain auditing workbench covering all mining belts of Odisha
            (iron ore, manganese, chromite, bauxite, coal, and limestone). Every Odisha mine opens ready to inspect
            across 2D zone grids, 3D pit surfaces, worker safety slopes, forest loss, and native replanting plans.
          </p>
        </div>
        """,
        unsafe_allow_html=True,
    )

    st.subheader("5 Core Problems MineAudit AI Solves")
    cols = st.columns(5)
    for col, (t, d) in zip(
        cols,
        [
            ("1. Reserve Tracking", "Measures excavated m³ & tonnes from DEM drops vs approved reserve."),
            ("2. Over-Mining Alerts", "Flags grid zones exceeding permitted extraction limits."),
            ("3. 3D Slope & Safety", "Inspects interactive 3D pit benches & flags steep unsafe slopes."),
            ("4. Tree Loss Audit", "Quantifies forest ha & estimated trees lost (NDVI or RGB ExG)."),
            ("5. Replanting Planner", "Matches safe open zones with native Odisha tree species."),
        ],
    ):
        col.markdown(
            f"<div class='problem-card'><div style='font-weight:700;color:#34d399;margin-bottom:6px;font-size:14px;'>{t}</div>"
            f"<div style='font-size:12.5px;color:#cbd5e1;line-height:1.45;'>{d}</div></div>",
            unsafe_allow_html=True,
        )

    st.markdown("<br>", unsafe_allow_html=True)
    c_start1, c_start2, c_start3 = st.columns([2.8, 1.3, 1.3])
    c_start1.success(f"👉 **Direct session ready:** Signed in as **{current_user['full_name']} ({user_role})**. Select any Odisha mine or jump directly to 3D Terrain View.")
    c_start2.button("🗺️ Odisha Mine Finder", type="primary", use_container_width=True, on_click=_go_to, args=("Mine Finder",))
    c_start3.button("⛰️ Open 3D Mine View", use_container_width=True, on_click=_go_to, args=("3D Mine View",))

elif selected_page == "Mine Finder":
    st.header("🗺️ Odisha Mine Finder & Directory")
    odisha_geo = get_odisha_geojson()
    districts_geo = get_districts_geojson()

    ctrl_1, ctrl_2 = st.columns([2, 3])
    st.session_state["offline_map_mode"] = ctrl_1.toggle("Offline vector map fallback (no internet tiles)", value=st.session_state["offline_map_mode"])
    ctrl_2.markdown(
        "Legend: " + " ".join(
            f"<span style='display:inline-block;padding:2px 8px;border-radius:99px;background:{col};color:#fff;font-size:11px;margin-right:4px;'>{m.title()}</span>"
            for m, col in MINERAL_COLORS.items()
        ),
        unsafe_allow_html=True,
    )

    if st.session_state["offline_map_mode"]:
        st.plotly_chart(
            build_offline_odisha_plotly_map(
                filtered_df if st.session_state["show_all_mines"] else filtered_df[filtered_df["mine_id"] == mine_id],
                odisha_geo, selected_mine=active_mine_row,
            ),
            use_container_width=True,
        )
    else:
        dir_map = build_odisha_directory_map(
            mines_df=filtered_df, odisha_geojson=odisha_geo, districts_geojson=districts_geo,
            selected_mine=active_mine_row, show_all_mines=st.session_state["show_all_mines"],
            selected_boundary_geojson=mstate.get("boundary_geojson"),
        )
        map_ret = st_folium(dir_map, height=480, use_container_width=True, key="odisha_finder_map")
        clicked_tip = (map_ret or {}).get("last_object_clicked_tooltip")
        if clicked_tip:
            for _, mr in all_mines_df.iterrows():
                if mr["mine_name"] in str(clicked_tip) and mr["mine_id"] != mine_id:
                    st.session_state["selected_mine_id"] = mr["mine_id"]
                    st.rerun()

    st.subheader(f"Odisha Mine Directory ({len(filtered_df)} matching)")
    st.dataframe(
        filtered_df[["mine_id", "mine_name", "operator", "district", "block_area", "mineral", "latitude", "longitude", "lease_area_ha", "coordinates_quality"]],
        use_container_width=True, hide_index=True,
    )

    if can_upload_or_audit(user_role):
        st.subheader("➕ Extend Odisha Mine Directory (Saved Per User)")
        t_up, t_man = st.tabs(["Upload CSV / GeoJSON of Mines", "Add Single Mine Manually"])
        with t_up:
            up_dir = st.file_uploader("Upload mines CSV or GeoJSON (must lie inside Odisha)", type=["csv", "geojson", "json"], key="dir_upload")
            if up_dir is not None and st.button("Import Mines to My Directory"):
                try:
                    valid_rows, warns = validate_and_parse_uploaded_mines(up_dir.getvalue(), up_dir.name)
                    for w in warns:
                        st.warning(w)
                    for vr in valid_rows:
                        save_user_mine(user_id, vr)
                    st.success(f"Added {len(valid_rows)} Odisha mine(s).")
                    st.rerun()
                except ValueError as exc:
                    st.error(str(exc))

        with t_man:
            with st.form("add_manual_mine"):
                mc1, mc2, mc3 = st.columns(3)
                m_name = mc1.text_input("Mine name")
                m_dist = mc2.text_input("Odisha District", value="Keonjhar")
                m_min = mc3.selectbox("Mineral", MINERAL_TYPES)
                mc4, mc5, mc6 = st.columns(3)
                m_lat = mc4.number_input("Latitude (°N)", value=21.98, format="%.5f")
                m_lon = mc5.number_input("Longitude (°E)", value=85.42, format="%.5f")
                m_ha = mc6.number_input("Lease area (ha)", value=350.0, min_value=1.0)
                m_qual = st.radio("Coordinates quality", ["exact", "approximate"], horizontal=True)
                if st.form_submit_button("Add Mine to Odisha Directory"):
                    try:
                        rec = build_manual_mine_record(m_name, m_dist, m_min, m_lat, m_lon, lease_area_ha=m_ha, coordinates_quality=m_qual)
                        save_user_mine(user_id, rec)
                        st.session_state["selected_mine_id"] = rec["mine_id"]
                        st.success(f"Added {rec['mine_name']}!")
                        st.rerun()
                    except ValueError as exc:
                        st.error(str(exc))
    _render_assumptions_box()

elif selected_page == "Data Input":
    st.header(f"📂 Data Input & Imagery Preview — {active_mine_row['mine_name']}")
    st.caption(f"Active dataset source: **{mstate.get('data_source_label', 'Odisha Baseline Satellite & DEM')}**")
    if audit is not None:
        for note in audit["align_notes"]:
            st.warning(note)
        c1, c2, c3, c4 = st.columns(4)
        c1.image(audit["sat_before"].rgb_preview, caption=f"Satellite Before ({mstate['year_before']})", use_container_width=True)
        c2.image(audit["sat_after"].rgb_preview, caption=f"Satellite After ({mstate['year_after']})", use_container_width=True)
        c3.image(audit["dem_before"].preview_rgb, caption="DEM Before (Elevation)", use_container_width=True)
        c4.image(audit["dem_after"].preview_rgb, caption="DEM After (Elevation)", use_container_width=True)

elif selected_page == "Dashboard":
    tab_mine, tab_3d, tab_odisha = st.tabs(["📊 Selected Mine Audit", "⛰️ Interactive 3D Preview", "🗺️ Odisha Overview"])

    with tab_mine:
        ext, veg = audit["ext"], audit["veg"]
        for note in audit["align_notes"]:
            st.warning(note)
        if not veg.is_true_ndvi:
            st.info(f"ℹ️ **Index Notice:** {veg.index_label}")

        _render_kpi_cards(
            [
                ("Reserve at Start", f"{ext.reserve_start_tonnes / 1e6:.1f}M t", f"{mstate['mineral_type'].title()}", "#38bdf8"),
                ("Extracted So Far", f"{ext.extracted_tonnes / 1e6:.1f}M t", f"{ext.volume_extracted_m3 / 1e6:.2f}M m³", "#f97316"),
                ("Remaining Reserve", f"{ext.remaining_tonnes / 1e6:.1f}M t", f"Limit {ext.limit_utilization_pct:.0f}% used", "#10b981"),
                ("% Reserve Left", f"{ext.pct_remaining:.1f}%", f"Verdict: {audit['overall_verdict'].upper()}", "#a855f7"),
                ("Vegetation Lost", f"{veg.area_lost_ha:.1f} ha", f"-{veg.pct_lost:.1f}% canopy", "#ef4444"),
                ("Trees to Replant", f"{veg.replanting_required:,}", f"Est. {veg.trees_lost_est:,} lost", "#22c55e"),
            ]
        )
        st.markdown("<div style='height:12px;'></div>", unsafe_allow_html=True)

        overlay_choice = st.radio("Map image layer", ["Satellite After", "Satellite Before", "Vegetation Loss (Red)"], horizontal=True)
        overlay_img = (
            audit["sat_before"].rgb_preview if overlay_choice == "Satellite Before"
            else audit["veg"].change_map_rgb if overlay_choice == "Vegetation Loss (Red)"
            else audit["sat_after"].rgb_preview
        )
        fmap = build_folium_zone_map(
            audit["classified"], overlay_rgb=overlay_img, overlay_name=overlay_choice,
            boundary_geojson=mstate.get("boundary_geojson"),
        )
        st_folium(fmap, height=460, use_container_width=True, returned_objects=[])

        c1, c2 = st.columns(2)
        c1.plotly_chart(chart_extraction_by_zone(audit["classified"]), use_container_width=True)
        c2.plotly_chart(chart_veg_loss_by_zone(audit["classified"]), use_container_width=True)
        _render_assumptions_box(veg.index_label)

    with tab_3d:
        st.plotly_chart(
            build_3d_mine_surface(
                audit["dem_before"].elevation_m,
                audit["dem_after"].elevation_m,
                audit["sat_after"].rgb_preview,
                pixel_res_m=float(mstate["pixel_size_m"]),
                surface_mode="Satellite True-Color Draped",
                z_exag=2.5,
                mine_name=mstate["mine_name"],
            ),
            use_container_width=True,
        )

    with tab_odisha:
        st.subheader("Odisha State-wide Mines Overview")
        odisha_geo = get_odisha_geojson()
        districts_geo = get_districts_geojson()
        if st.session_state["offline_map_mode"]:
            st.plotly_chart(build_offline_odisha_plotly_map(all_mines_df, odisha_geo, active_mine_row), use_container_width=True)
        else:
            st_folium(
                build_odisha_directory_map(all_mines_df, odisha_geo, districts_geo, active_mine_row, show_all_mines=True),
                height=380, use_container_width=True, returned_objects=[], key="odisha_overview_map",
            )

        oc1, oc2 = st.columns(2)
        with oc1:
            st.markdown("**Mines by Odisha District**")
            st.dataframe(all_mines_df.groupby("district").size().reset_index(name="mine_count").sort_values("mine_count", ascending=False), use_container_width=True, hide_index=True)
        with oc2:
            st.markdown("**Mines by Mineral**")
            st.dataframe(all_mines_df.groupby("mineral").size().reset_index(name="mine_count").sort_values("mine_count", ascending=False), use_container_width=True, hide_index=True)

        st.subheader("Audited Mines Table (Verdicts)")
        audits_rows = load_audit_summaries(user_id, user_role)
        if audits_rows:
            st.dataframe(pd.DataFrame(audits_rows), use_container_width=True, hide_index=True)
        else:
            st.info("No mines audited yet.")

elif selected_page == "3D Mine View":
    st.header(f"⛰️ 3D Terrain & Pit Excavation Viewer — {mstate['mine_name']}")
    dem_b = audit["dem_before"].elevation_m
    dem_a = audit["dem_after"].elevation_m
    max_slope_val = float(audit["classified"]["p90_slope_deg"].max())

    _render_kpi_cards(
        [
            ("Highest Rim Elev", f"{float(dem_a.max()):.1f} m", "Current DEM peak", "#38bdf8"),
            ("Deepest Pit Floor", f"{float(dem_a.min()):.1f} m", "Active sump bottom", "#f97316"),
            ("Max Excavated Drop", f"{audit['ext'].max_drop_m:.1f} m", f"Mean {audit['ext'].mean_drop_m:.1f} m", "#ef4444"),
            ("Steepest Bench (P90)", f"{max_slope_val:.1f}°", f"Limit {max_slope_deg:.0f}°", "#eab308"),
        ]
    )
    st.markdown("<div style='height:10px;'></div>", unsafe_allow_html=True)

    c3d_1, c3d_2, c3d_3, c3d_4 = st.columns([2.1, 1.7, 1.1, 1.1])
    surf_mode = c3d_1.selectbox(
        "3D Surface Overlay",
        [
            "Satellite True-Color Draped",
            "Compare Before vs After (3D Ghost Overlay)",
            "Excavation Depth (m)",
            "Slope Stability (°)",
            "Pre-Mining Terrain (DEM Before)",
        ],
    )
    cam_preset = c3d_2.selectbox(
        "Camera View",
        [
            "Pit Amphitheater (Close)",
            "High Isometric Overview",
            "Low-Angle Bench Inspection",
        ],
    )
    z_exag = c3d_3.slider("Vertical Exag.", 1.0, 5.0, 2.8, 0.2)
    slice_pos = c3d_4.slider("Slice N-S (%)", 10, 90, 50, 5) / 100.0

    st.caption("Drag to orbit 360°, scroll to zoom, and hover on any bench terrace to inspect elevation, excavation drop, and slope.")
    fig_3d = build_3d_mine_surface(
        dem_before_m=dem_b,
        dem_after_m=dem_a,
        sat_after_rgb=audit["sat_after"].rgb_preview,
        pixel_res_m=float(mstate["pixel_size_m"]),
        surface_mode=surf_mode,
        z_exag=z_exag,
        mine_name=mstate["mine_name"],
        camera_preset=cam_preset,
    )
    st.plotly_chart(fig_3d, use_container_width=True)

    st.plotly_chart(
        build_3d_cross_section(
            dem_b,
            dem_a,
            pixel_res_m=float(mstate["pixel_size_m"]),
            row_frac=slice_pos,
        ),
        use_container_width=True,
    )
    _render_assumptions_box(audit["veg"].index_label)

elif selected_page == "Safety Map":
    st.header(f"🦺 Worker Safety Map — {mstate['mine_name']}")
    st.markdown("🟢 **Green = Safe** · 🟡 **Yellow = Caution** · 🔴 **Red = Unsafe / Over-mined**")
    fmap = build_folium_zone_map(
        audit["classified"], overlay_rgb=audit["sat_after"].rgb_preview,
        boundary_geojson=mstate.get("boundary_geojson"), show_safety_only=True,
    )
    st_folium(fmap, height=440, use_container_width=True, returned_objects=[])
    st.dataframe(
        audit["classified"][["zone_id", "status", "safety_color", "extracted_tonnes", "zone_limit_t", "pct_reserve_remaining", "max_drop_m", "p90_slope_deg", "veg_loss_ha", "reason"]],
        use_container_width=True, hide_index=True,
    )
    _render_assumptions_box(audit["veg"].index_label)

elif selected_page == "Trees":
    st.header(f"🌳 Tree Loss & Native Replanting — {mstate['mine_name']}")
    veg = audit["veg"]
    if not veg.is_true_ndvi:
        st.warning(f"⚠️ {veg.index_label}")

    _render_kpi_cards(
        [
            ("Vegetation Before", f"{veg.veg_area_before_ha:.1f} ha", "Baseline canopy", "#10b981"),
            ("Vegetation Lost", f"{veg.area_lost_ha:.1f} ha", f"-{veg.pct_lost:.1f}% cleared", "#ef4444"),
            ("Trees Lost (ESTIMATE)", f"{veg.trees_lost_est:,}", f"@ {tree_density_per_ha} trees/ha", "#f97316"),
            (f"Replanting ({mstate['replanting_ratio']})", f"{veg.replanting_required:,}", "Native trees target", "#22c55e"),
        ]
    )
    st.markdown("<div style='height:12px;'></div>", unsafe_allow_html=True)

    c1, c2 = st.columns(2)
    c1.image(audit["sat_before"].rgb_preview, caption=f"Before ({mstate['year_before']})", use_container_width=True)
    c2.image(veg.change_map_rgb, caption="Tree Loss Map (Red = Vegetation Lost)", use_container_width=True)

    st.subheader("Suggested Replanting Sites & Native Odisha Species")
    st.info(f"ℹ️ {audit['species_note']}")
    fmap = build_folium_zone_map(
        audit["classified"], overlay_rgb=veg.change_map_rgb, overlay_name="Tree Loss (Red)",
        boundary_geojson=mstate.get("boundary_geojson"), replant_df=audit["replant"],
    )
    st_folium(fmap, height=410, use_container_width=True, returned_objects=[])
    if not audit["replant"].empty:
        st.dataframe(audit["replant"][["zone_id", "trees_to_plant", "recommended_species", "slope_deg", "veg_cover_pct", "reason"]], use_container_width=True, hide_index=True)
    with st.expander("Reference Native Tree Species"):
        st.caption(SPECIES_NOTICE)
        ref_df = mstate["species_df"] if mstate.get("species_df") is not None else BUILTIN_NATIVE_SPECIES
        st.dataframe(ref_df, use_container_width=True, hide_index=True)
    _render_assumptions_box(veg.index_label)

elif selected_page == "Alerts":
    from datetime import date, timedelta
    st.header(f"🚨 Alerts & Government Dispatch — {mstate['mine_name']}")

    mine_notices = list_dispatched_notices(mine_id=mine_id)
    pending_count = sum(1 for n in mine_notices if n["status"] == "Sent")

    # 1. Operator Inbox / Official Notice Status Banner
    if user_role == "Mine Operator" and pending_count > 0:
        st.error(f"📬 **Action Required:** You have **{pending_count}** official Odisha DMG notice(s) awaiting acknowledgment for **{mstate['mine_name']}**.")

    # 2. Regulator Dispatch Panel (only when alerts exist and user is Regulator)
    if audit["alerts"]:
        if user_role == "Regulator":
            with st.expander("🏛️ Send Official Government Alert / Notice to Mine Owner or Operator", expanded=True):
                alert_options = [
                    f"ALL CRITICAL & HIGH ALERTS ({sum(1 for a in audit['alerts'] if a['severity'] in ('critical', 'high'))} items)"
                ] + [f"[{a['severity'].upper()}] {a['message']} — {a['detail']}" for a in audit["alerts"]]

                with st.form(f"dispatch_notice_form_{mine_id}"):
                    dc1, dc2 = st.columns(2)
                    selected_alert_label = dc1.selectbox("Alert(s) to include", alert_options)
                    directive_type = dc2.selectbox(
                        "Official Directive Type",
                        [
                            "Show-Cause Notice (DMG Odisha)",
                            "Immediate Stop-Work Order (Unsafe Slope)",
                            "Over-Extraction Penalty & Ceiling Notice",
                            "Compensatory Tree Replanting Directive",
                        ],
                    )
                    dc3, dc4, dc5 = st.columns([1.4, 1.5, 1.0])
                    op_name = dc3.text_input("Mine Owner / Operator Name", value=str(active_mine_row.get("operator") or "Mine Lessee"))
                    recip_email = dc4.text_input("Recipient Operator Email", value="satyajit.mohanty@odishamineaudit.in")
                    deadline_dt = dc5.date_input("Compliance Deadline", value=date.today() + timedelta(days=14))
                    remarks = st.text_area(
                        "Official Government Remarks / Field Instructions",
                        value=f"Satellite & 3D DEM audit flagged compliance issues at {mstate['mine_name']} ({mstate['district']}, Odisha). Submit corrective action report before deadline.",
                    )
                    send_btn = st.form_submit_button("📨 Send Official Alert to Mine Owner / Operator", type="primary", use_container_width=True)

                if send_btn:
                    if selected_alert_label.startswith("ALL CRITICAL"):
                        crit_msgs = [a["message"] for a in audit["alerts"] if a["severity"] in ("critical", "high")]
                        summary_txt = "; ".join(crit_msgs[:6]) + (f" (+{len(crit_msgs) - 6} more)" if len(crit_msgs) > 6 else "")
                        sev = "critical"
                    else:
                        summary_txt = selected_alert_label
                        sev = "critical" if "[CRITICAL]" in selected_alert_label else "high"
                    try:
                        created = dispatch_govt_notice(
                            sender_name=current_user["full_name"],
                            sender_role=user_role,
                            mine_id=mine_id,
                            mine_name=mstate["mine_name"],
                            district=mstate["district"],
                            operator_name=op_name,
                            recipient_email=recip_email,
                            directive_type=directive_type,
                            severity=sev,
                            alert_summary=summary_txt,
                            remarks=remarks,
                            deadline_date=deadline_dt.isoformat(),
                        )
                        st.success(
                            f"✅ Official Notice **{created['notice_ref']}** dispatched to **{created['operator_name']}** ({created['recipient_email']})."
                        )
                        mine_notices = list_dispatched_notices(mine_id=mine_id)
                    except (PermissionError, ValueError) as exc:
                        st.error(str(exc))

        # 3. Detected Automated Satellite Alerts List
        st.subheader(f"Detected Satellite & Safety Alerts ({len(audit['alerts'])})")
        for idx, al in enumerate(audit["alerts"]):
            label = f"[{mstate['mine_name']}] {al['message']}"
            a_col, btn_col = st.columns([5.2, 1.1])
            with a_col:
                if al["severity"] == "critical":
                    st.error(f"**{label}** — {al['detail']}")
                elif al["severity"] == "high":
                    st.warning(f"**{label}** — {al['detail']}")
                else:
                    st.info(f"**{label}** — {al['detail']}")
            with btn_col:
                if user_role == "Regulator":
                    if st.button("📨 Send Notice", key=f"qsend_{mine_id}_{idx}", use_container_width=True):
                        created = dispatch_govt_notice(
                            sender_name=current_user["full_name"],
                            sender_role=user_role,
                            mine_id=mine_id,
                            mine_name=mstate["mine_name"],
                            district=mstate["district"],
                            operator_name=str(active_mine_row.get("operator") or "Mine Lessee"),
                            recipient_email="satyajit.mohanty@odishamineaudit.in",
                            directive_type="Show-Cause Notice (DMG Odisha)",
                            severity=al["severity"],
                            alert_summary=f"{al['message']} — {al['detail']}",
                            remarks=f"Immediate field inspection & corrective plan required for {al['zone']}.",
                            deadline_date=(date.today() + timedelta(days=7)).isoformat(),
                        )
                        st.toast(f"Sent {created['notice_ref']} to operator!")
                        st.rerun()
    else:
        st.success(f"[{mstate['mine_name']}] All zones within safe & permitted limits. No alerts to dispatch.")

    # 4. Dispatched Government Notices Log & Operator Response Trail
    st.divider()
    st.subheader(f"📋 Dispatched Government Notices & Operator Response Trail ({len(mine_notices)})")
    if not mine_notices:
        st.info("No official notices dispatched for this mine yet.")
    else:
        for n in mine_notices:
            status_icon = "🔴" if n["status"] == "Sent" else "🟡" if n["status"] in ("Acknowledged", "Action Submitted") else "🟢"
            with st.container(border=True):
                nh1, nh2 = st.columns([4, 1.4])
                nh1.markdown(
                    f"**{status_icon} {n['notice_ref']} · {n['directive_type']}** (`{n['status']}`)  \n"
                    f"**To:** {n['operator_name']} ({n['recipient_email']}) &nbsp;|&nbsp; **From:** {n['sender_name']} ({n['sender_role']}) &nbsp;|&nbsp; **Deadline:** `{n['deadline_date']}`"
                )
                notice_txt = (
                    f"OFFICIAL NOTICE: {n['notice_ref']}\n"
                    f"FROM: {n['sender_name']} ({n['sender_role']})\n"
                    f"TO: {n['operator_name']} ({n['recipient_email']})\n"
                    f"MINE: {n['mine_name']} ({n['district']}, Odisha)\n"
                    f"DIRECTIVE: {n['directive_type']}\n"
                    f"DEADLINE: {n['deadline_date']}\n"
                    f"ALERT SUMMARY: {n['alert_summary']}\n"
                    f"REMARKS: {n['remarks']}\n"
                    f"STATUS: {n['status']}\n"
                    f"OPERATOR RESPONSE: {n['operator_response']}\n"
                )
                nh2.download_button(
                    "⬇️ Notice TXT",
                    data=notice_txt.encode("utf-8"),
                    file_name=f"{n['notice_ref']}.txt",
                    mime="text/plain",
                    key=f"dl_notice_{n['id']}",
                    use_container_width=True,
                )
                st.caption(f"**Alert Trigger:** {n['alert_summary']}")
                st.write(n["remarks"])
                if n["operator_response"]:
                    st.success(f"**Operator Reply:** {n['operator_response']}")

                if user_role in ("Mine Operator", "Regulator") and n["status"] != "Resolved":
                    rc1, rc2, rc3 = st.columns([3.5, 1.2, 1.2])
                    reply_txt = rc1.text_input(
                        "Operator compliance response / action taken",
                        value=n["operator_response"],
                        key=f"resp_{n['id']}",
                        placeholder="Enter corrective action plan or field verification note...",
                    )
                    if rc2.button("Acknowledge / Reply", key=f"ack_{n['id']}", use_container_width=True):
                        new_st = "Action Submitted" if reply_txt.strip() else "Acknowledged"
                        update_notice_status(n["id"], new_st, reply_txt, user_role)
                        st.rerun()
                    if user_role == "Regulator" and rc3.button("Mark Resolved", key=f"res_{n['id']}", use_container_width=True):
                        update_notice_status(n["id"], "Resolved", reply_txt or "Verified and resolved by Regulator.", user_role)
                        st.rerun()

elif selected_page == "Report":
    st.header(f"📄 Audit Summary Report — {mstate['mine_name']}")
    if user_role == "Viewer":
        st.error("🔒 Viewer role is read-only. Report preview and export are disabled for Viewer accounts.")
    else:
        meta = {
            "mine_name": mstate["mine_name"], "state": "Odisha", "district": mstate["district"],
            "mineral_type": mstate["mineral_type"], "year_before": mstate["year_before"], "year_after": mstate["year_after"],
            "pixel_size_m": mstate["pixel_size_m"], "density_t_m3": mstate["density_t_m3"],
            "replanting_ratio": mstate["replanting_ratio"],
            "coordinates_quality": active_mine_row.get("coordinates_quality", "approximate"),
            "is_demo": False,
        }
        ext_dict = {
            "reserve_start_tonnes": audit["ext"].reserve_start_tonnes,
            "volume_extracted_m3": audit["ext"].volume_extracted_m3,
            "extracted_tonnes": audit["ext"].extracted_tonnes,
            "remaining_tonnes": audit["ext"].remaining_tonnes,
            "pct_remaining": audit["ext"].pct_remaining,
        }
        veg_dict = {
            "area_lost_ha": audit["veg"].area_lost_ha, "pct_lost": audit["veg"].pct_lost,
            "trees_lost_est": audit["veg"].trees_lost_est, "replanting_required": audit["veg"].replanting_required,
            "index_label": audit["veg"].index_label,
        }
        html_str = generate_html_report(
            meta, ext_dict, veg_dict, audit["classified"], audit["replant"], audit["alerts"],
            audit["sat_before"].rgb_preview, audit["sat_after"].rgb_preview, audit["veg"].change_map_rgb, audit["ext"].drop_map_m,
        )
        if can_export_report(user_role):
            pdf_bytes = generate_pdf_report(
                meta, ext_dict, veg_dict, audit["classified"], audit["replant"], audit["alerts"],
                audit["sat_before"].rgb_preview, audit["sat_after"].rgb_preview, audit["veg"].change_map_rgb, audit["ext"].drop_map_m,
            )
            c1, c2 = st.columns(2)
            c1.download_button("⬇️ Download PDF Report", pdf_bytes, f"MineAudit_{mine_id}.pdf", "application/pdf", use_container_width=True)
            c2.download_button("⬇️ Download HTML Report", html_str.encode("utf-8"), f"MineAudit_{mine_id}.html", "text/html", use_container_width=True)
        else:
            st.info("ℹ️ **Mine Operator role:** Full preview shown below. PDF/HTML download is restricted to **Regulator** accounts.")
        st.subheader("Report Preview")
        st.components.v1.html(html_str, height=680, scrolling=True)
