"""RootWhisper — Restrained Enterprise Plotly Visualizations.

Adheres strictly to the Premium Botanical Intelligence design system:
- High-contrast, clean 85% enterprise + 15% botanical palette.
- Tabular precision, crisp hairline grid lines, clean hover cards.
- Masked invalid sensor values (no -99.0 plunges).
"""

import plotly.graph_objects as go
from plotly.subplots import make_subplots
import pandas as pd
from dashboard.config import DESIGN_SYSTEM


def plot_thermal_dynamics(df: pd.DataFrame, threshold_c: float = 1.5) -> go.Figure:
    """Plots Observed Leaf Temp, Expected Baseline Leaf Temp, and Ambient Air Temp."""
    fig = go.Figure()

    if df.empty:
        fig.add_annotation(text="No telemetry recorded.", showarrow=False, font=dict(size=12, color=DESIGN_SYSTEM["secondary_text"]))
        fig.update_layout(height=290, plot_bgcolor=DESIGN_SYSTEM["white"], paper_bgcolor=DESIGN_SYSTEM["white"])
        return fig

    clean_df = df.copy()
    clean_df.loc[clean_df["leaf_temp_c"] <= -50.0, "leaf_temp_c"] = None
    clean_df.loc[clean_df["ambient_temp_c"] <= -50.0, "ambient_temp_c"] = None

    # Ambient Air Temperature (Dotted neutral)
    fig.add_trace(go.Scatter(
        x=clean_df["timestamp"],
        y=clean_df["ambient_temp_c"],
        mode="lines",
        name="Ambient Air (°C)",
        line=dict(color=DESIGN_SYSTEM["secondary_text"], dash="dot", width=1.6),
        hovertemplate="Air: %{y:.1f}°C<extra></extra>"
    ))

    # Expected Baseline Leaf Temp (Random Forest)
    if "expected_leaf_temp_c" in clean_df.columns and clean_df["expected_leaf_temp_c"].notnull().any():
        fig.add_trace(go.Scatter(
            x=clean_df["timestamp"],
            y=clean_df["expected_leaf_temp_c"],
            mode="lines",
            name="AI Baseline (°C)",
            line=dict(color=DESIGN_SYSTEM["deep_emerald"], dash="dash", width=2.0),
            hovertemplate="AI Baseline: %{y:.1f}°C<extra></extra>"
        ))

        # Provisional Stress Threshold upper bound
        upper_bound = clean_df["expected_leaf_temp_c"] + threshold_c
        fig.add_trace(go.Scatter(
            x=clean_df["timestamp"],
            y=upper_bound,
            mode="lines",
            name=f"Cutoff (+{threshold_c}°C)",
            line=dict(color="rgba(201, 93, 88, 0.4)", width=1.2, dash="dot"),
            hovertemplate="Threshold: %{y:.1f}°C<extra></extra>"
        ))

    # Actual Measured Leaf Temp (MLX90614)
    fig.add_trace(go.Scatter(
        x=clean_df["timestamp"],
        y=clean_df["leaf_temp_c"],
        mode="lines+markers",
        name="Observed Leaf (°C)",
        line=dict(color=DESIGN_SYSTEM["alert_red"], width=2.4, shape="spline"),
        marker=dict(size=5, color=DESIGN_SYSTEM["alert_red"], line=dict(width=1, color=DESIGN_SYSTEM["white"])),
        connectgaps=False,
        hovertemplate="Observed: %{y:.1f}°C<extra></extra>"
    ))

    fig.update_layout(
        title=dict(
            text="<b>Canopy Thermal Dynamics:</b> Observed vs. Predicted Baseline",
            font=dict(size=13, color=DESIGN_SYSTEM["charcoal"], family="Inter, sans-serif"),
            y=0.96
        ),
        xaxis=dict(
            title="",
            gridcolor=DESIGN_SYSTEM["border_light"],
            showline=True,
            linecolor=DESIGN_SYSTEM["border_subtle"],
            tickfont=dict(size=11, color=DESIGN_SYSTEM["secondary_text"])
        ),
        yaxis=dict(
            title="Temperature (°C)",
            gridcolor=DESIGN_SYSTEM["border_light"],
            showline=True,
            linecolor=DESIGN_SYSTEM["border_subtle"],
            tickfont=dict(size=11, color=DESIGN_SYSTEM["secondary_text"])
        ),
        hovermode="x unified",
        legend=dict(orientation="h", yanchor="bottom", y=1.04, xanchor="right", x=1, font=dict(size=11)),
        plot_bgcolor=DESIGN_SYSTEM["white"],
        paper_bgcolor=DESIGN_SYSTEM["white"],
        margin=dict(l=40, r=30, t=60, b=30),
        height=300
    )
    return fig


def plot_residuals(df: pd.DataFrame, threshold_c: float = 1.5) -> go.Figure:
    """Plots prediction residuals with provisional cutoff reference."""
    fig = go.Figure()

    if df.empty or "residual_c" not in df.columns or df["residual_c"].isnull().all():
        fig.add_annotation(text="Residuals available after baseline calibration.", showarrow=False, font=dict(color=DESIGN_SYSTEM["secondary_text"]))
        fig.update_layout(height=260, plot_bgcolor=DESIGN_SYSTEM["white"], paper_bgcolor=DESIGN_SYSTEM["white"])
        return fig

    colors = [
        DESIGN_SYSTEM["alert_red"] if (r is not None and r > threshold_c) else DESIGN_SYSTEM["forest_green"]
        for r in df["residual_c"]
    ]

    fig.add_trace(go.Bar(
        x=df["timestamp"],
        y=df["residual_c"],
        marker=dict(color=colors),
        name="Residual (e)",
        hovertemplate="Residual: %{y:+.2f}°C<extra></extra>"
    ))

    fig.add_hline(
        y=threshold_c,
        line_dash="dash",
        line_color=DESIGN_SYSTEM["alert_red"],
        line_width=1.4,
        annotation_text=f"+{threshold_c}°C Cutoff",
        annotation_position="top left",
        annotation_font=dict(size=10, color=DESIGN_SYSTEM["alert_red"])
    )
    fig.add_hline(y=0.0, line_dash="solid", line_color="#D5DBD8", line_width=1)

    fig.update_layout(
        title=dict(
            text="<b>Prediction Residuals:</b> <i>e = T<sub>actual</sub> - T̂<sub>expected</sub></i>",
            font=dict(size=13, color=DESIGN_SYSTEM["charcoal"], family="Inter, sans-serif"),
            y=0.96
        ),
        xaxis=dict(title="", gridcolor=DESIGN_SYSTEM["border_light"], linecolor=DESIGN_SYSTEM["border_subtle"]),
        yaxis=dict(title="Residual (°C)", gridcolor=DESIGN_SYSTEM["border_light"], linecolor=DESIGN_SYSTEM["border_subtle"]),
        plot_bgcolor=DESIGN_SYSTEM["white"],
        paper_bgcolor=DESIGN_SYSTEM["white"],
        margin=dict(l=40, r=30, t=55, b=30),
        height=260
    )
    return fig


def plot_soil_moisture_trend(df: pd.DataFrame, dry_threshold_pct: float = 35.0) -> go.Figure:
    """Plots volumetric soil moisture depletion trend with dry threshold cutoff."""
    fig = go.Figure()

    if df.empty:
        fig.add_annotation(text="No soil moisture data recorded.", showarrow=False, font=dict(color=DESIGN_SYSTEM["secondary_text"]))
        fig.update_layout(height=280, plot_bgcolor=DESIGN_SYSTEM["white"], paper_bgcolor=DESIGN_SYSTEM["white"])
        return fig

    clean_df = df.copy()
    clean_df.loc[clean_df["soil_moisture_pct"] < 0.0, "soil_moisture_pct"] = None

    fig.add_trace(go.Scatter(
        x=clean_df["timestamp"],
        y=clean_df["soil_moisture_pct"],
        mode="lines+markers",
        name="Soil Moisture (%)",
        fill="tozeroy",
        fillcolor="rgba(36, 86, 64, 0.06)",
        line=dict(color=DESIGN_SYSTEM["forest_green"], width=2.2, shape="spline"),
        marker=dict(size=4, color=DESIGN_SYSTEM["forest_green"]),
        connectgaps=False,
        hovertemplate="Soil: %{y:.1f}%<extra></extra>"
    ))

    fig.add_hline(
        y=dry_threshold_pct,
        line_dash="dash",
        line_color=DESIGN_SYSTEM["alert_red"],
        line_width=1.5,
        annotation_text=f"Dry Threshold ({dry_threshold_pct}%)",
        annotation_position="bottom right",
        annotation_font=dict(size=10, color=DESIGN_SYSTEM["alert_red"])
    )

    fig.update_layout(
        title=dict(
            text="<b>Volumetric Soil Moisture Trajectory:</b> Independent Corroboration",
            font=dict(size=13, color=DESIGN_SYSTEM["charcoal"], family="Inter, sans-serif"),
            y=0.96
        ),
        xaxis=dict(title="", gridcolor=DESIGN_SYSTEM["border_light"], linecolor=DESIGN_SYSTEM["border_subtle"]),
        yaxis=dict(title="Moisture (%)", range=[0, 100], gridcolor=DESIGN_SYSTEM["border_light"], linecolor=DESIGN_SYSTEM["border_subtle"]),
        plot_bgcolor=DESIGN_SYSTEM["white"],
        paper_bgcolor=DESIGN_SYSTEM["white"],
        margin=dict(l=40, r=30, t=55, b=30),
        height=280
    )
    return fig


def plot_microclimate(df: pd.DataFrame) -> go.Figure:
    """Subplots for Solar Light Intensity (Lux) and Relative Humidity & VPD."""
    fig = make_subplots(
        rows=2, cols=1,
        shared_xaxes=True,
        vertical_spacing=0.16,
        subplot_titles=("Solar Light Intensity (Lux)", "Relative Humidity (%) & VPD Demand (kPa)")
    )

    if df.empty:
        fig.update_layout(height=340, plot_bgcolor=DESIGN_SYSTEM["white"], paper_bgcolor=DESIGN_SYSTEM["white"])
        return fig

    # Light Lux (Warm Amber)
    fig.add_trace(go.Scatter(
        x=df["timestamp"],
        y=df["light_lux"],
        name="Light (Lux)",
        line=dict(color=DESIGN_SYSTEM["warning_amber"], width=1.8, shape="spline"),
        fill="tozeroy",
        fillcolor="rgba(197, 138, 53, 0.12)",
        hovertemplate="Light: %{y:.0f} Lux<extra></extra>"
    ), row=1, col=1)

    # Relative Humidity (Forest Green)
    fig.add_trace(go.Scatter(
        x=df["timestamp"],
        y=df["ambient_humidity_pct"],
        name="RH (%)",
        line=dict(color=DESIGN_SYSTEM["forest_green"], width=1.8, shape="spline"),
        hovertemplate="RH: %{y:.1f}%<extra></extra>"
    ), row=2, col=1)

    # VPD (Deep Emerald dashed)
    if "vpd_kpa" in df.columns:
        fig.add_trace(go.Scatter(
            x=df["timestamp"],
            y=df["vpd_kpa"] * 25,
            name="VPD (x25)",
            line=dict(color=DESIGN_SYSTEM["deep_emerald"], width=1.4, dash="dot", shape="spline"),
            hovertemplate="VPD: %{customdata:.2f} kPa<extra></extra>",
            customdata=df["vpd_kpa"]
        ), row=2, col=1)

    fig.update_layout(
        plot_bgcolor=DESIGN_SYSTEM["white"],
        paper_bgcolor=DESIGN_SYSTEM["white"],
        height=340,
        margin=dict(l=40, r=30, t=45, b=30),
        legend=dict(orientation="h", yanchor="bottom", y=1.04, xanchor="right", x=1, font=dict(size=10))
    )
    return fig


def plot_cross_plant_comparison(df: pd.DataFrame, metric: str = "leaf_temp_c", title: str = "Cross-Plant Comparison") -> go.Figure:
    """Overlays sensor metric across Tulsi, Hibiscus, and Money Plant with strict color coding."""
    fig = go.Figure()

    if df.empty:
        fig.add_annotation(text="No comparison data recorded.", showarrow=False, font=dict(color=DESIGN_SYSTEM["secondary_text"]))
        fig.update_layout(height=320, plot_bgcolor=DESIGN_SYSTEM["white"], paper_bgcolor=DESIGN_SYSTEM["white"])
        return fig

    plant_colors = {
        "TULSI_01": DESIGN_SYSTEM["forest_green"],      # #245640
        "HIBISCUS_01": DESIGN_SYSTEM["alert_red"],        # #C95D58
        "MONEYPLANT_01": DESIGN_SYSTEM["warning_amber"]   # #C58A35
    }

    metric_labels = {
        "leaf_temp_c": "Leaf Temp (°C)",
        "soil_moisture_pct": "Soil Moisture (%)",
        "ambient_temp_c": "Ambient Temp (°C)",
        "ambient_humidity_pct": "Relative Humidity (%)",
        "light_lux": "Light (Lux)",
        "delta_t_c": "Canopy Delta-T (°C)"
    }
    unit_label = metric_labels.get(metric, metric)

    for dev_id in ["TULSI_01", "HIBISCUS_01", "MONEYPLANT_01"]:
        group = df[df["device_id"] == dev_id].copy()
        if group.empty:
            continue

        if metric in ["leaf_temp_c", "ambient_temp_c", "delta_t_c"]:
            group.loc[group[metric] <= -50.0, metric] = None
        elif metric in ["soil_moisture_pct", "light_lux"]:
            group.loc[group[metric] < 0.0, metric] = None

        plant_label = group["plant_name"].iloc[0] if "plant_name" in group.columns else dev_id
        fig.add_trace(go.Scatter(
            x=group["timestamp"],
            y=group[metric],
            mode="lines+markers",
            name=f"{plant_label}",
            line=dict(color=plant_colors.get(dev_id, "#666666"), width=2.4, shape="spline"),
            marker=dict(size=4.5, color=plant_colors.get(dev_id, "#666666"), line=dict(width=1, color=DESIGN_SYSTEM["white"])),
            connectgaps=False,
            hovertemplate=f"<b>{plant_label}:</b> %{{y:.1f}} {unit_label}<extra></extra>"
        ))

    fig.update_layout(
        title=dict(
            text=f"<b>{title}</b>",
            font=dict(size=13, color=DESIGN_SYSTEM["charcoal"], family="Inter, sans-serif"),
            y=0.96
        ),
        xaxis=dict(
            title="",
            gridcolor=DESIGN_SYSTEM["border_light"],
            showline=True,
            linecolor=DESIGN_SYSTEM["border_subtle"],
            tickfont=dict(size=11, color=DESIGN_SYSTEM["secondary_text"])
        ),
        yaxis=dict(
            title=unit_label,
            gridcolor=DESIGN_SYSTEM["border_light"],
            showline=True,
            linecolor=DESIGN_SYSTEM["border_subtle"],
            tickfont=dict(size=11, color=DESIGN_SYSTEM["secondary_text"])
        ),
        hovermode="x unified",
        plot_bgcolor=DESIGN_SYSTEM["white"],
        paper_bgcolor=DESIGN_SYSTEM["white"],
        margin=dict(l=40, r=30, t=65, b=30),
        height=320,
        legend=dict(orientation="h", yanchor="bottom", y=1.04, xanchor="right", x=1, font=dict(size=11))
    )
    return fig
