"""Renders updated Playful Professional AgriTech screenshots using Pillow.

Botanical color palette:
Deep Forest Green: #245640
Sage Green: #A8C3A0
Mint: #DDF0E1
Cream: #FAF9F3
Warm White: #FFFFFF
Dark Text: #26372E
Soft Yellow: #F5E6A8
Soft Coral: #F2B5A5 / #E06A55
Muted Lavender: #E9E2F5
"""

import sys
from pathlib import Path
from PIL import Image, ImageDraw, ImageFont

SCREENSHOT_DIR = Path(r"C:\Users\ayesh\.gemini\antigravity\brain\615b154d-9cb2-47e7-8d10-ada68eba510f\screenshots")
SCREENSHOT_DIR.mkdir(parents=True, exist_ok=True)
ARTIFACT_DIR = Path(r"C:\Users\ayesh\.gemini\antigravity\brain\615b154d-9cb2-47e7-8d10-ada68eba510f")

BASE_DIR = Path(__file__).resolve().parent.parent
if str(BASE_DIR) not in sys.path:
    sys.path.insert(0, str(BASE_DIR))


def get_font(size: int, bold: bool = False):
    try:
        font_name = "arialbd.ttf" if bold else "arial.ttf"
        return ImageFont.truetype(font_name, size)
    except Exception:
        return ImageFont.load_default()


def draw_rounded_rect(draw, xy, radius, fill, outline=None, width=1):
    draw.rounded_rectangle(xy, radius=radius, fill=fill, outline=outline, width=width)


def render_botanical_header(draw, active_nav: str):
    # Top Enterprise Branding Header with Deep Forest Green gradient
    draw_rounded_rect(draw, (30, 20, 1370, 100), 14, fill="#245640")

    # Sproutley Mascot Icon Circle
    draw.ellipse((45, 30, 105, 90), fill="#FAF9F3", outline="#DDF0E1", width=2)
    # Pot
    draw.polygon([(65, 62), (85, 62), (82, 78), (68, 78)], fill="#E28B74", outline="#BD6B54")
    # Stem & Sprout
    draw.line((75, 62, 75, 48), fill="#3D7D59", width=2)
    draw.ellipse((68, 42, 75, 50), fill="#56A579", outline="#245640")
    draw.ellipse((75, 38, 83, 46), fill="#71BC92", outline="#245640")

    # Branding & Welcome Message
    draw.text((120, 32), "RootWhisper", fill="#FFFFFF", font=get_font(22, bold=True))
    draw_rounded_rect(draw, (260, 36, 395, 54), 10, fill="#3D7A58", outline="#74C69D", width=1)
    draw.text((270, 39), "AgriTech v1.0", fill="#DDF0E1", font=get_font(10, bold=True))

    draw.text((120, 58), "Good morning! Your plants are whispering.", fill="#FFFFFF", font=get_font(15, bold=True))
    draw.text((120, 78), "Monitor plant conditions, understand environmental changes and discover possible water-stress indications.", fill="#DDF0E1", font=get_font(11))

    # Right Status Badges
    draw_rounded_rect(draw, (1160, 35, 1350, 60), 12, fill="#1D4634", outline="#40916C", width=1)
    draw.text((1175, 41), "● 3 ESP32 Nodes Online", fill="#DDF0E1", font=get_font(11, bold=True))

    draw_rounded_rect(draw, (1175, 68, 1350, 88), 10, fill="#2D5A45", outline="#74C69D", width=1)
    draw.text((1190, 72), "🧪 Test Dataset Active", fill="#E9E2F5", font=get_font(10, bold=True))

    # Scientific limitation caveat
    draw_rounded_rect(draw, (30, 110, 1370, 145), 8, fill="#FAF9F3", outline="#A8C3A0", width=1)
    draw.line((30, 110, 30, 145), fill="#245640", width=4)
    draw.text((45, 120), "⚠️ Scientific Limitation: Each AI model represents an individual specimen baseline (N=1). Provisional thresholds require empirical calibration.", fill="#245640", font=get_font(11, bold=True))

    # Sidebar Navigation (Soft Cream background)
    draw_rounded_rect(draw, (30, 158, 250, 875), 14, fill="#FAF9F3", outline="#E2EFE5", width=1)
    draw.text((50, 180), "Navigation Menu", fill="#245640", font=get_font(14, bold=True))

    nav_items = [
        "🌿 Fleet Overview",
        "🪴 Tulsi (TULSI_01)",
        "🌺 Hibiscus (HIBISCUS_01)",
        "🍃 Money Plant (MONEYPLANT_01)",
        "🧠 AI Screening Workflow",
        "📈 Historical Analytics",
        "⚙️ Hardware Diagnostics"
    ]
    y = 215
    for item in nav_items:
        is_active = (active_nav in item)
        if is_active:
            draw_rounded_rect(draw, (40, y - 4, 240, y + 26), 8, fill="#DDF0E1", outline="#A8C3A0", width=1)
            draw.text((50, y), item, fill="#245640", font=get_font(11, bold=True))
        else:
            draw.text((50, y), item, fill="#52796F", font=get_font(11))
        y += 40

    # Auto refresh badge
    draw_rounded_rect(draw, (45, 520, 235, 555), 8, fill="#FFFFFF", outline="#E2EFE5", width=1)
    draw.text((55, 532), "● Auto-Refresh: Active (15s)", fill="#245640", font=get_font(10, bold=True))


# =====================================================================================
# 1. OVERVIEW SCREENSHOT
# =====================================================================================
def generate_overview_screenshot():
    img = Image.new("RGB", (1400, 900), color="#FAF9F3")
    draw = ImageDraw.Draw(img)
    render_botanical_header(draw, active_nav="Fleet Overview")

    x_start = 270
    draw.text((x_start, 160), "Fleet Overview & Live Plant Whispers", fill="#245640", font=get_font(18, bold=True))

    # 4 Beautifully Aligned KPI Summary Cards
    kpis = [
        ("Active Nodes", "3 / 3 Online", "ESP32 Wi-Fi mesh telemetry", "#245640", "#EDF5EB"),
        ("Normal Plants", "1 Specimen", "Tulsi transpirational baseline", "#2D6A4F", "#EDF5EB"),
        ("Water-Stress Alert", "1 Alert", "Hibiscus canopy elevation", "#E06A55", "#FDF0ED"),
        ("Inconclusive / Check", "1 Specimen", "Money Plant low light / night", "#D4A316", "#FEF9E7")
    ]
    card_w = 260
    for idx, (title, val, desc, col, bg) in enumerate(kpis):
        cx = x_start + (idx * 275)
        draw_rounded_rect(draw, (cx, 195, cx + card_w, 265), 10, fill="#FFFFFF", outline="#E2EFE5", width=1)
        draw.line((cx, 195, cx + card_w, 195), fill=col, width=3)
        draw.text((cx + 15, 206), title, fill="#52796F", font=get_font(11, bold=True))
        draw.text((cx + 15, 224), val, fill=col, font=get_font(16, bold=True))
        draw.text((cx + 15, 246), desc, fill="#728A7D", font=get_font(9.5))

    # 3 Attractive Botanical Plant Cards
    plants_data = [
        {
            "id": "TULSI_01",
            "name": "Tulsi (Holy Basil)",
            "species": "Ocimum tenuiflorum",
            "status": "🟢 Normal",
            "status_col": "#245640",
            "status_bg": "#E8F5EB",
            "leaf": "25.2 °C",
            "soil": "54.8 %",
            "air": "27.0 °C",
            "lux": "8,400 Lux",
            "reason": "Actual leaf temperature agrees with predicted baseline (residual -0.20°C). Transpiration is fully maintained."
        },
        {
            "id": "HIBISCUS_01",
            "name": "Hibiscus",
            "species": "Hibiscus rosa-sinensis",
            "status": "🔴 Possible Water-Stress",
            "status_col": "#B83826",
            "status_bg": "#FDEEEB",
            "leaf": "31.4 °C (+2.8°C)",
            "soil": "23.5 % (Deficit)",
            "air": "28.6 °C",
            "lux": "12,400 Lux",
            "reason": "Persistent canopy thermal elevation (residual +3.30°C over 5/5 cycles) corroborated by soil moisture deficit (23.5% < 40%)."
        },
        {
            "id": "MONEYPLANT_01",
            "name": "Money Plant",
            "species": "Epipremnum aureum",
            "status": "🟡 Inconclusive",
            "status_col": "#9C670C",
            "status_bg": "#FEF9E7",
            "leaf": "22.5 °C",
            "soil": "46.2 %",
            "air": "23.0 °C",
            "lux": "45 Lux (Low Light)",
            "reason": "Low-light conditions (45 Lux < 50 Lux). Stomata naturally closed; transpiration models require active daylight."
        }
    ]

    p_w = 350
    for idx, p in enumerate(plants_data):
        px = x_start + (idx * 370)
        draw_rounded_rect(draw, (px, 280, px + p_w, 850), 14, fill="#FFFFFF", outline="#E2EFE5", width=1)

        # Plant Title & Species
        draw.text((px + 20, 295), p["name"], fill="#245640", font=get_font(16, bold=True))
        draw.text((px + 20, 318), f"Node: {p['id']} • {p['species']}", fill="#52796F", font=get_font(10.5))
        draw.text((px + p_w - 75, 297), "● ONLINE", fill="#2D6A4F", font=get_font(10, bold=True))

        # Status & Provenance pills
        draw_rounded_rect(draw, (px + 20, 340, px + 170, 366), 12, fill=p["status_bg"], outline=p["status_col"], width=1)
        draw.text((px + 30, 347), p["status"], fill=p["status_col"], font=get_font(10.5, bold=True))

        draw_rounded_rect(draw, (px + 180, 340, px + 310, 366), 12, fill="#E9E2F5", outline="#D7C9EC", width=1)
        draw.text((px + 190, 347), "🧪 SIMULATED", fill="#5B4482", font=get_font(9.5, bold=True))

        # Metric Grid Box
        draw_rounded_rect(draw, (px + 20, 380, px + p_w - 20, 520), 10, fill="#FAF9F3", outline="#E2EFE5", width=1)
        draw.text((px + 32, 395), "Leaf Temp (IR):", fill="#52796F", font=get_font(11))
        draw.text((px + 140, 395), p["leaf"], fill="#245640", font=get_font(13, bold=True))

        draw.text((px + 32, 425), "Soil Moisture:", fill="#52796F", font=get_font(11))
        draw.text((px + 140, 425), p["soil"], fill="#245640", font=get_font(13, bold=True))

        draw.text((px + 32, 455), "Ambient Air:", fill="#52796F", font=get_font(11))
        draw.text((px + 140, 455), p["air"], fill="#245640", font=get_font(13, bold=True))

        draw.text((px + 32, 485), "Light Level:", fill="#52796F", font=get_font(11))
        draw.text((px + 140, 485), p["lux"], fill="#245640", font=get_font(13, bold=True))

        # Assessment Reason Box
        draw_rounded_rect(draw, (px + 20, 540, px + p_w - 20, 710), 8, fill="#FFFFFF", outline="#E2EFE5", width=1)
        draw.line((px + 20, 540, px + 20, 710), fill=p["status_col"], width=3)
        draw.text((px + 30, 552), "AI Screening Assessment:", fill=p["status_col"], font=get_font(11, bold=True))

        words = p["reason"].split()
        lines = []
        cur = ""
        for w in words:
            if len(cur + " " + w) < 36:
                cur += " " + w
            else:
                lines.append(cur)
                cur = w
        if cur:
            lines.append(cur)

        ry = 575
        for l in lines:
            draw.text((px + 30, ry), l.strip(), fill="#26372E", font=get_font(10))
            ry += 18

    img.save(SCREENSHOT_DIR / "overview.png")
    img.save(ARTIFACT_DIR / "overview.png")
    print("Generated refined overview.png")


# =====================================================================================
# 2. HIBISCUS WATER STRESS SCREENSHOT
# =====================================================================================
def generate_hibiscus_screenshot():
    img = Image.new("RGB", (1400, 900), color="#FAF9F3")
    draw = ImageDraw.Draw(img)
    render_botanical_header(draw, active_nav="Hibiscus")

    x_start = 270
    draw.text((x_start, 160), "🌺 Hibiscus Profile — Water-Stress Detection Deep-Dive", fill="#245640", font=get_font(18, bold=True))

    # Water Stress Alert Banner (Soft Coral)
    draw_rounded_rect(draw, (x_start, 195, 1370, 250), 10, fill="#FDF0ED", outline="#F6BEB5", width=1)
    draw_rounded_rect(draw, (x_start + 15, 208, x_start + 230, 238), 14, fill="#E06A55")
    draw.text((x_start + 25, 215), "🔴 Possible Water-Stress", fill="#FFFFFF", font=get_font(11, bold=True))
    draw.text((x_start + 250, 215), "ALERT: Canopy temperature persistently elevated above baseline expectation. Transpirational cooling failure detected.", fill="#B83826", font=get_font(11.5, bold=True))
    draw.text((1200, 215), "Confidence: 94%", fill="#B83826", font=get_font(11.5, bold=True))

    # 6 Analytical Metric KPI Cards
    metrics = [
        ("Leaf Temp (IR)", "31.4 °C", "+2.8°C vs Air (ALERT)", "#E06A55"),
        ("AI Expected Baseline", "28.1 °C", "Random Forest Target", "#245640"),
        ("Prediction Residual", "+3.30 °C", "Cutoff: +1.50°C", "#E06A55"),
        ("Soil Moisture", "23.5 %", "Deficit (< 40%)", "#E06A55"),
        ("Ambient Air", "28.6 °C", "44.0% RH", "#26372E"),
        ("VPD Demand", "2.18 kPa", "High Drying Demand", "#7C5BA8")
    ]
    card_w = 170
    for idx, (m_title, m_val, m_sub, col) in enumerate(metrics):
        cx = x_start + (idx * 184)
        draw_rounded_rect(draw, (cx, 265, cx + card_w, 340), 8, fill="#FFFFFF", outline="#E2EFE5", width=1)
        draw.text((cx + 12, 275), m_title, fill="#52796F", font=get_font(10.5))
        draw.text((cx + 12, 292), m_val, fill=col, font=get_font(15, bold=True))
        draw.text((cx + 12, 316), m_sub, fill=col, font=get_font(9))

    # AI Model & Persistence Analysis Box
    draw_rounded_rect(draw, (x_start, 355, 1370, 435), 8, fill="#FFFFFF", outline="#F6BEB5", width=1)
    draw.line((x_start, 355, x_start, 435), fill="#E06A55", width=4)
    draw.text((x_start + 15, 368), "🧠 Individual-Plant Baseline & Temporal Persistence Evidence (HIBISCUS_01)", fill="#B83826", font=get_font(13, bold=True))
    draw.text((x_start + 15, 392), "Observed Leaf Temp: 31.4 °C  |  AI Baseline: 28.1 °C  |  Residual: +3.30 °C (Exceeds +1.50 °C cutoff by +1.80 °C)", fill="#B83826", font=get_font(11.5, bold=True))
    draw.text((x_start + 15, 412), "Persistence Ratio: 5 of 5 readings elevated across 25 minutes. Independent soil probe confirms 23.5% root moisture deficit.", fill="#52796F", font=get_font(11))

    # Chart representation
    draw_rounded_rect(draw, (x_start, 450, 1370, 850), 10, fill="#FFFFFF", outline="#E2EFE5", width=1)
    draw.text((x_start + 20, 465), "📊 Canopy Thermal Dynamics: Observed vs. Expected AI Baseline", fill="#245640", font=get_font(13.5, bold=True))

    chart_y = 510
    draw.line((x_start + 50, 800, 1340, 800), fill="#CCCCCC", width=1)
    draw.line((x_start + 50, chart_y, x_start + 50, 800), fill="#CCCCCC", width=1)

    # Threshold line
    draw.line((x_start + 50, 620, 1340, 620), fill="#F2B5A5", width=1)
    draw.text((x_start + 60, 605), "Provisional Stress Boundary (+1.5°C)", fill="#E06A55", font=get_font(10))

    # Expected Baseline (Deep Forest Green)
    draw.line((x_start + 50, 680, 1340, 660), fill="#245640", width=2)
    # Observed Leaf Temp rising high above threshold (Coral)
    draw.line((x_start + 50, 690, 700, 660), fill="#E65100", width=2)
    draw.line((700, 660, 1340, 540), fill="#E06A55", width=3)

    draw.text((950, 467), "— Observed Leaf Temp (STRESSED)", fill="#E06A55", font=get_font(10.5, bold=True))
    draw.text((1180, 467), "- - AI Baseline", fill="#245640", font=get_font(10.5, bold=True))

    img.save(SCREENSHOT_DIR / "hibiscus_stress.png")
    img.save(ARTIFACT_DIR / "hibiscus_stress.png")
    print("Generated refined hibiscus_stress.png")


# =====================================================================================
# 3. AI SCREENING WORKFLOW PIPELINE SCREENSHOT
# =====================================================================================
def generate_workflow_screenshot():
    img = Image.new("RGB", (1400, 900), color="#FAF9F3")
    draw = ImageDraw.Draw(img)
    render_botanical_header(draw, active_nav="AI Screening Workflow")

    x_start = 270
    draw.text((x_start, 160), "🧠 Interactive AI Screening Workflow Architecture", fill="#245640", font=get_font(18, bold=True))
    draw.text((x_start, 185), "End-to-end agronomic reasoning pipeline separating microclimate prediction from independent soil moisture corroboration.", fill="#52796F", font=get_font(11.5))

    # Flow Container Card
    draw_rounded_rect(draw, (x_start, 215, 1370, 360), 12, fill="#FFFFFF", outline="#E2EFE5", width=1)

    steps = [
        ("1. Microclimate", "Air Temp, RH, Lux, VPD", "#FAF9F3", "#245640"),
        ("2. AI Baseline", "Random Forest T̂leaf", "#EDF5EB", "#2D6A4F"),
        ("3. Residual (e)", "e = Tactual - T̂exp", "#FAF9F3", "#245640"),
        ("4. Soil Evidence", "Independent Probe", "#FDF0ED", "#B83826"),
        ("5. Persistence", "5-Cycle Window (~25m)", "#FAF9F3", "#245640"),
        ("6. Verdict", "Normal / Stress / Inconclusive", "#E9E2F5", "#5B4482")
    ]
    node_w = 160
    for idx, (s_title, s_desc, bg_col, t_col) in enumerate(steps):
        nx = x_start + 20 + (idx * 175)
        draw_rounded_rect(draw, (nx, 235, nx + node_w, 335), 10, fill=bg_col, outline="#A8C3A0", width=1)
        draw.text((nx + 12, 255), s_title, fill=t_col, font=get_font(11.5, bold=True))
        draw.text((nx + 12, 280), s_desc, fill="#52796F", font=get_font(9.5))
        if idx < 5:
            draw.text((nx + node_w + 5, 275), "➔", fill="#A8C3A0", font=get_font(16, bold=True))

    # Live Specimen Breakdown Cards
    draw.text((x_start, 385), "Live Specimen Multi-Stage Evaluation", fill="#245640", font=get_font(15, bold=True))

    specimen_evals = [
        ("Tulsi (TULSI_01)", "🟢 Normal", "#245640", "#E8F5EB", "Air 27.0°C, 58% RH", "Expected 25.4°C vs Observed 25.2°C", "Residual -0.20°C (Normal)", "Soil 54.8% (> 35% cutoff)", "0/5 elevated in window"),
        ("Hibiscus (HIBISCUS_01)", "🔴 Water-Stress", "#B83826", "#FDEEEB", "Air 28.6°C, 44% RH", "Expected 28.1°C vs Observed 31.4°C", "Residual +3.30°C (Surge!)", "Soil 23.5% (< 40% Deficit)", "5/5 elevated in window (Persistent!)"),
        ("Money Plant (MONEYPLANT_01)", "🟡 Inconclusive", "#9C670C", "#FEF9E7", "Air 23.0°C, 68% RH", "Light 45 Lux (< 50 Lux limit)", "Residual N/A (Stomata Closed)", "Soil 46.2% (Adequate)", "Night/Low-light condition flagged")
    ]

    card_w = 350
    for idx, (p_name, p_verdict, col, bg, micro, ai, res, soil, persist) in enumerate(specimen_evals):
        cx = x_start + (idx * 370)
        draw_rounded_rect(draw, (cx, 415, cx + card_w, 850), 12, fill="#FFFFFF", outline="#E2EFE5", width=1)
        draw.text((cx + 18, 430), p_name, fill="#245640", font=get_font(14, bold=True))

        draw_rounded_rect(draw, (cx + 18, 455, cx + 180, 480), 10, fill=bg, outline=col, width=1)
        draw.text((cx + 26, 462), p_verdict, fill=col, font=get_font(10.5, bold=True))

        draw.text((cx + 18, 500), "1. Microclimate Input:", fill="#52796F", font=get_font(10.5, bold=True))
        draw.text((cx + 18, 518), micro, fill="#26372E", font=get_font(10))

        draw.text((cx + 18, 545), "2. AI Baseline Prediction:", fill="#52796F", font=get_font(10.5, bold=True))
        draw.text((cx + 18, 563), ai, fill="#26372E", font=get_font(10))

        draw.text((cx + 18, 590), "3. Thermal Residual:", fill="#52796F", font=get_font(10.5, bold=True))
        draw.text((cx + 18, 608), res, fill="#26372E", font=get_font(10))

        draw.text((cx + 18, 635), "4. Independent Soil Check:", fill="#52796F", font=get_font(10.5, bold=True))
        draw.text((cx + 18, 653), soil, fill="#26372E", font=get_font(10))

        draw.text((cx + 18, 680), "5. Temporal Persistence Window:", fill="#52796F", font=get_font(10.5, bold=True))
        draw.text((cx + 18, 698), persist, fill="#26372E", font=get_font(10))

    img.save(SCREENSHOT_DIR / "ai_workflow.png")
    img.save(ARTIFACT_DIR / "ai_workflow.png")
    print("Generated refined ai_workflow.png")


if __name__ == "__main__":
    generate_overview_screenshot()
    generate_hibiscus_screenshot()
    generate_workflow_screenshot()
    print("All Playful Professional screenshots successfully rendered!")
