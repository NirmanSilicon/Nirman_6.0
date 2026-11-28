"""Reference tables for the MVP (board type: DDR4 desktop RAM module).

IMPORTANT: every number below is a *placeholder estimate* for the MVP, written
to be replaced by recycler assay data / quotes (PRD s16-17). Each row carries a
`source` string so valuations stay auditable (PRD s6.3 Explainability).
Edit this file and run `python -m app.seed --force` to refresh the tables.
"""

BOARD_TYPE = "DDR4_RAM"
PLACEHOLDER = "MVP placeholder estimate; validate with recycler assay/quote"

# Estimated grams of metal per board (low, high)
MATERIALS = [
    (BOARD_TYPE, "Au", 0.005, 0.015, f"Gold-finger plating estimate; {PLACEHOLDER}"),
    (BOARD_TYPE, "Ag", 0.02, 0.06, f"Solder/contacts estimate; {PLACEHOLDER}"),
    (BOARD_TYPE, "Cu", 6.0, 10.0, f"Laminate copper estimate (waste PCBs ~30-50% metal, Springer); {PLACEHOLDER}"),
    (BOARD_TYPE, "Pd", 0.001, 0.004, f"MLCC/contacts estimate; {PLACEHOLDER}"),
    (BOARD_TYPE, "Sn", 1.0, 2.0, f"Solder estimate; {PLACEHOLDER}"),
]

# item, unit, price_low, price_high, reuse_prob_low, reuse_prob_high, source   (INR)
PRICES = [
    ("metal:Au", "INR/g", 11000, 13000, None, None, "Manual weekly update; indicative spot-linked range"),
    ("metal:Ag", "INR/g", 90, 110, None, None, "Manual weekly update; indicative spot-linked range"),
    ("metal:Cu", "INR/g", 0.80, 0.95, None, None, "Manual weekly update; indicative scrap range"),
    ("metal:Pd", "INR/g", 3000, 4000, None, None, "Manual weekly update; indicative spot-linked range"),
    ("metal:Sn", "INR/g", 2.5, 3.2, None, None, "Manual weekly update; indicative scrap range"),
    ("reuse:RAM_IC", "INR/piece", 15, 40, 0.5, 0.8, f"Refurbisher resale estimate; reuse probability heuristic (no electrical test); {PLACEHOLDER}"),
    ("reuse:IC", "INR/piece", 5, 25, 0.2, 0.5, f"Refurbisher resale estimate; {PLACEHOLDER}"),
    ("reuse:CONNECTOR", "INR/piece", 3, 10, 0.3, 0.6, f"Refurbisher resale estimate; {PLACEHOLDER}"),
    ("reuse:CAPACITOR", "INR/piece", 0, 0, 0.0, 0.0, "Not treated as reusable in MVP"),
    ("reuse:RESISTOR", "INR/piece", 0, 0, 0.0, 0.0, "Not treated as reusable in MVP"),
    ("reuse:CRYSTAL", "INR/piece", 0, 0, 0.0, 0.0, "Not treated as reusable in MVP"),
]

# route, reuse_factor (share of reuse value realised), metal_recovery (share of metal value), cost_low, cost_high (INR/board)
ROUTE_PARAMS = [
    ("Reuse", 1.0, 0.0, 0, 0, f"Board sold intact to a refurbisher; no processing; {PLACEHOLDER}"),
    ("Desolder", 0.9, 0.45, 10, 20, f"Labour for harvesting; stripped board then goes to an authorised recycler; {PLACEHOLDER}"),
    ("Hydromet", 0.0, 0.90, 15, 30, f"Authorised-recycler hydrometallurgy; {PLACEHOLDER}"),
    ("Pyromet", 0.0, 0.75, 25, 50, f"Authorised-recycler pyrometallurgy; {PLACEHOLDER}"),
]

DEFAULT_WEIGHTS = {"value": 0.4, "cost": 0.2, "energy": 0.2, "co2": 0.2}
PRESET_WEIGHTS = {
    "default": DEFAULT_WEIGHTS,
    "max_profit": {"value": 0.7, "cost": 0.1, "energy": 0.1, "co2": 0.1},
    "greenest": {"value": 0.1, "cost": 0.1, "energy": 0.35, "co2": 0.45},
}

# route, criterion, rating 1-5 (more = better, so "cost" is inverted: 5 = cheapest); value is computed (None)
ROUTE_RATINGS = [
    ("Reuse", "value", None, "computed:value_mid/max_mid"),
    ("Reuse", "cost", 4, "static:PRD 9.2 Low"),
    ("Reuse", "energy", 5, "static:PRD 9.2 Very low"),
    ("Reuse", "co2", 5, "static:PRD 9.2 Very low"),
    ("Desolder", "value", None, "computed:value_mid/max_mid"),
    ("Desolder", "cost", 3, "static:PRD 9.2 Medium (labour)"),
    ("Desolder", "energy", 4, "static:PRD 9.2 Low"),
    ("Desolder", "co2", 4, "static:PRD 9.2 Low"),
    ("Hydromet", "value", None, "computed:value_mid/max_mid"),
    ("Hydromet", "cost", 3, "static:PRD 9.2 Medium"),
    ("Hydromet", "energy", 3, "static:PRD 9.2 Medium"),
    ("Hydromet", "co2", 3, "static:PRD 9.2 Medium"),
    ("Pyromet", "value", None, "computed:value_mid/max_mid"),
    ("Pyromet", "cost", 1, "static:PRD 9.2 High"),
    ("Pyromet", "energy", 1, "static:PRD 9.2 High"),
    ("Pyromet", "co2", 1, "static:PRD 9.2 High"),
]

# name, cpcb_reg_no, address, city, state, lat, lng, phone, accepts
# SAMPLE ROWS ONLY: they are NOT real CPCB registrations. Replace with the geocoded
# CPCB authorised-recycler list:  python -m app.seed.import_recyclers recyclers.csv
SAMPLE = "Sample seed row - not a verified CPCB listing"
RECYCLERS = [
    ("Sample Recycler - Seelampur, Delhi", "SAMPLE-DL-001", "Seelampur, Delhi", "Delhi", "Delhi", 28.6706, 77.2700, None, ["PCB", "RAM", "motherboard"]),
    ("Sample Recycler - Mundka, Delhi", "SAMPLE-DL-002", "Mundka Industrial Area, Delhi", "Delhi", "Delhi", 28.6820, 77.0310, None, ["PCB", "mixed"]),
    ("Sample Recycler - Noida", "SAMPLE-UP-001", "Sector 63, Noida", "Noida", "Uttar Pradesh", 28.6270, 77.3790, None, ["PCB", "RAM"]),
    ("Sample Recycler - Gurugram", "SAMPLE-HR-001", "Udyog Vihar, Gurugram", "Gurugram", "Haryana", 28.5010, 77.0850, None, ["PCB", "RAM", "motherboard"]),
    ("Sample Recycler - Mumbai", "SAMPLE-MH-001", "Andheri East, Mumbai", "Mumbai", "Maharashtra", 19.1190, 72.8700, None, ["PCB", "mixed"]),
    ("Sample Recycler - Pune", "SAMPLE-MH-002", "Pimpri-Chinchwad, Pune", "Pune", "Maharashtra", 18.6290, 73.8000, None, ["PCB", "RAM"]),
    ("Sample Recycler - Bengaluru", "SAMPLE-KA-001", "Peenya Industrial Area, Bengaluru", "Bengaluru", "Karnataka", 13.0290, 77.5200, None, ["PCB", "RAM", "motherboard"]),
    ("Sample Recycler - Chennai", "SAMPLE-TN-001", "Ambattur, Chennai", "Chennai", "Tamil Nadu", 13.1140, 80.1600, None, ["PCB", "mixed"]),
    ("Sample Recycler - Hyderabad", "SAMPLE-TS-001", "Jeedimetla, Hyderabad", "Hyderabad", "Telangana", 17.5160, 78.4500, None, ["PCB", "RAM"]),
    ("Sample Recycler - Kolkata", "SAMPLE-WB-001", "Howrah, Kolkata", "Kolkata", "West Bengal", 22.5900, 88.3100, None, ["PCB", "mixed"]),
    ("Sample Recycler - Bhubaneswar", "SAMPLE-OD-001", "Mancheswar Industrial Estate, Bhubaneswar", "Bhubaneswar", "Odisha", 20.3000, 85.8600, None, ["PCB", "RAM"]),
    ("Sample Recycler - Ahmedabad", "SAMPLE-GJ-001", "Naroda GIDC, Ahmedabad", "Ahmedabad", "Gujarat", 23.0900, 72.6600, None, ["PCB", "mixed"]),
]
