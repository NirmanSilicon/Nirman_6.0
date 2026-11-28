"""RootWhisper — Design System & Configuration.

Strict enterprise design system adhering to the Premium Botanical Intelligence aesthetic:
- 85% professional enterprise software + 15% botanical visual personality.
- Apple Health / Linear / Stripe level clarity, typography, and tabular alignment.
- Zero cartoonish clutter.
"""

import base64
from pathlib import Path

# Base Paths
BASE_DIR = Path(__file__).resolve().parent.parent
DATA_DIR = BASE_DIR / "data"
DATABASE_PATH = DATA_DIR / "rootwhisper.db"
API_BASE_URL = "http://127.0.0.1:8000"

# Strict Design System Color Palette (Prompt Specification)
DESIGN_SYSTEM = {
    # Core Palette
    "deep_emerald": "#173F32",       # Primary Brand Dark
    "forest_green": "#245640",       # Secondary Forest Tone
    "sage": "#A8BDA8",               # Neutral Botanical Accent
    "pale_sage": "#EEF3ED",          # Subtle active/highlight background
    "warm_ivory": "#F8F8F4",         # Overall application background
    "white": "#FFFFFF",              # Card and panel surfaces
    "charcoal": "#26342D",           # Primary text (high contrast)
    "secondary_text": "#78847C",     # Captions, labels, table headers
    "alert_red": "#C95D58",          # Possible Water-Stress alerts
    "alert_red_bg": "#FCF2F1",       # Light alert tint
    "warning_amber": "#C58A35",      # Inconclusive / low light warnings
    "warning_amber_bg": "#FDF8F0",   # Light warning tint
    "normal_green": "#2E7D52",       # Normal physiological status
    "normal_green_bg": "#F0F7F2",    # Normal badge tint
    "border_subtle": "#E2E8E2",      # Restrained 1px border
    "border_light": "#EDF2ED",       # Secondary hairline divider
    "offline_grey": "#8A948E",
    "offline_bg": "#F2F4F2",
    "card_radius": "12px",
    "shadow_subtle": "0 1px 3px rgba(23, 63, 50, 0.04), 0 4px 12px rgba(23, 63, 50, 0.03)"
}

# Backward compatibility alias
BOTANICAL_THEME = DESIGN_SYSTEM
THEME = DESIGN_SYSTEM


def svg_to_img_tag(svg_str: str, width: int = 40, height: int = 40, extra_style: str = "") -> str:
    """Encodes SVG into safe, self-contained base64 image tag."""
    b64 = base64.b64encode(svg_str.strip().encode("utf-8")).decode("utf-8")
    return f'<img src="data:image/svg+xml;base64,{b64}" width="{width}" height="{height}" style="display:inline-block; vertical-align:middle; {extra_style}" alt="botanical-identity" />'


# Refined, Minimalist Botanical Specimen Vectors (Scientific & Architectural, Not Cartoonish)
PLANT_SVGS = {
    "TULSI_01": """<svg width="44" height="44" viewBox="0 0 48 48" fill="none" xmlns="http://www.w3.org/2000/svg">
<rect width="48" height="48" rx="10" fill="#F0F5F1"/>
<path d="M24 38V14M24 28L18 22M24 20L30 16" stroke="#245640" stroke-width="2" stroke-linecap="round"/>
<path d="M18 22C14 20 12 15 16 12C20 12 22 17 18 22Z" fill="#3D7355" stroke="#173F32" stroke-width="1"/>
<path d="M30 16C34 14 36 9 32 6C28 6 26 11 30 16Z" fill="#4B8563" stroke="#173F32" stroke-width="1"/>
<path d="M24 14C22 9 25 5 29 6C32 8 29 13 24 14Z" fill="#3D7355" stroke="#173F32" stroke-width="1"/>
<path d="M16 30C12 29 11 23 15 21C19 21 20 28 16 30Z" fill="#589B74" stroke="#173F32" stroke-width="1"/>
<path d="M32 26C36 25 37 19 33 17C29 17 28 24 32 26Z" fill="#4B8563" stroke="#173F32" stroke-width="1"/>
<circle cx="28" cy="5" r="1.2" fill="#B388BB"/>
<circle cx="31" cy="7" r="1.2" fill="#B388BB"/>
</svg>""",

    "HIBISCUS_01": """<svg width="44" height="44" viewBox="0 0 48 48" fill="none" xmlns="http://www.w3.org/2000/svg">
<rect width="48" height="48" rx="10" fill="#FDF3F1"/>
<path d="M24 40V28M24 34C19 34 16 37 14 39" stroke="#3D7355" stroke-width="2" stroke-linecap="round"/>
<path d="M14 39C12 34 16 31 20 32C22 35 17 39 14 39Z" fill="#4B8563" stroke="#245640" stroke-width="1"/>
<path d="M24 24C18 19 16 11 22 9C27 9 27 18 24 24Z" fill="#C95D58" stroke="#A8443F" stroke-width="1"/>
<path d="M24 24C29 17 37 17 39 22C39 29 31 29 24 24Z" fill="#D66D68" stroke="#A8443F" stroke-width="1"/>
<path d="M24 24C29 29 34 35 29 38C23 40 21 32 24 24Z" fill="#C95D58" stroke="#A8443F" stroke-width="1"/>
<path d="M24 24C17 27 11 30 9 24C8 19 16 19 24 24Z" fill="#DE7D78" stroke="#A8443F" stroke-width="1"/>
<path d="M24 24L33 12" stroke="#B83A35" stroke-width="1.8" stroke-linecap="round"/>
<circle cx="33" cy="12" r="2" fill="#C58A35"/>
<circle cx="31" cy="15" r="1.2" fill="#C58A35"/>
<circle cx="29" cy="18" r="1.2" fill="#C58A35"/>
</svg>""",

    "MONEYPLANT_01": """<svg width="44" height="44" viewBox="0 0 48 48" fill="none" xmlns="http://www.w3.org/2000/svg">
<rect width="48" height="48" rx="10" fill="#F0F5F3"/>
<path d="M14 38C19 35 20 27 25 24C30 21 34 16 37 11" stroke="#245640" stroke-width="2" stroke-linecap="round"/>
<path d="M25 24C22 21 19 22 19 26C19 31 25 32 25 32C25 32 31 31 31 26C31 22 28 21 25 24Z" fill="#3D7355" stroke="#173F32" stroke-width="1"/>
<path d="M37 11C35 9 32 9 32 12C32 16 37 18 37 18C37 18 42 16 42 12C42 9 39 9 37 11Z" fill="#52946E" stroke="#173F32" stroke-width="1"/>
<path d="M16 35C14 33 11 33 11 36C11 39 16 41 16 41C16 41 21 39 21 36C21 33 18 33 16 35Z" fill="#3D7355" stroke="#173F32" stroke-width="1"/>
<path d="M25 26C24 27 23 29 25 30" stroke="#EEF3ED" stroke-width="1" stroke-linecap="round"/>
<path d="M37 13C36 14 35 15 37 16" stroke="#EEF3ED" stroke-width="1" stroke-linecap="round"/>
</svg>"""
}

# Restrained Brand Logo (Minimalist Seed & Sprout Monogram, Precision Engineered)
ROOTWHISPER_LOGO_SVG = """<svg width="24" height="24" viewBox="0 0 28 28" fill="none" xmlns="http://www.w3.org/2000/svg">
<path d="M14 26V10M14 10C14 5 18 2 24 2C24 8 21 12 14 14M14 18C14 14 10 11 4 12C4 18 8 20 14 20" stroke="#FFFFFF" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round"/>
</svg>"""

ROOTWHISPER_LOGO_DARK_SVG = """<svg width="24" height="24" viewBox="0 0 28 28" fill="none" xmlns="http://www.w3.org/2000/svg">
<path d="M14 26V10M14 10C14 5 18 2 24 2C24 8 21 12 14 14M14 18C14 14 10 11 4 12C4 18 8 20 14 20" stroke="#173F32" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round"/>
</svg>"""

# Pre-compiled HTML image tags
LOGO_IMG_TAG = svg_to_img_tag(ROOTWHISPER_LOGO_SVG, 22, 22)
LOGO_DARK_IMG_TAG = svg_to_img_tag(ROOTWHISPER_LOGO_DARK_SVG, 22, 22)
PLANT_IMG_TAGS = {k: svg_to_img_tag(v, 42, 42) for k, v in PLANT_SVGS.items()}

# Plant metadata for display
PLANT_DISPLAY = {
    "TULSI_01": {
        "name": "Tulsi",
        "common_name": "Holy Basil",
        "species": "Ocimum tenuiflorum",
        "color": DESIGN_SYSTEM["deep_emerald"],
        "soil_threshold_default": 35.0,
        "residual_threshold_default": 1.5,
    },
    "HIBISCUS_01": {
        "name": "Hibiscus",
        "common_name": "Rose of China",
        "species": "Hibiscus rosa-sinensis",
        "color": DESIGN_SYSTEM["alert_red"],
        "soil_threshold_default": 40.0,
        "residual_threshold_default": 1.5,
    },
    "MONEYPLANT_01": {
        "name": "Money Plant",
        "common_name": "Devil's Ivy",
        "species": "Epipremnum aureum",
        "color": DESIGN_SYSTEM["forest_green"],
        "soil_threshold_default": 30.0,
        "residual_threshold_default": 1.5,
    }
}
