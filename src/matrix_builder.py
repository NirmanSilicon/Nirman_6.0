from __future__ import annotations

import re
import pandas as pd


def build_comparative_matrix(chunks: list[dict], pages: list[dict]) -> pd.DataFrame:
    """
    Extract structured metrics and parameters per document to construct a
    side-by-side comparative matrix.
    """
    doc_map = {}

    # Initialize document entries
    for p in pages:
        d_name = p["document_name"]
        if d_name not in doc_map:
            doc_map[d_name] = {
                "Document Name": d_name,
                "Sample Size": "N/A",
                "Temperature / Cooling Delta": "N/A",
                "Key Focus Area": "N/A",
                "Primary Methodology": "N/A",
            }

    # Aggregate text per document for pattern extraction
    doc_texts = {}
    for c in chunks:
        d_name = c["document_name"]
        doc_texts[d_name] = doc_texts.get(d_name, "") + " " + c["text"]

    for d_name, text in doc_texts.items():
        text_lower = text.lower()

        # Extract temperature deltas (°C or degrees)
        temp_matches = re.findall(r"\d+(?:\.\d+)?\s*(?:°c|degrees)", text_lower)
        if temp_matches:
            # Deduplicate while preserving order
            unique_temps = list(dict.fromkeys(temp_matches))
            doc_map[d_name]["Temperature / Cooling Delta"] = ", ".join(unique_temps)

        # Extract sample sizes (e.g., twelve neighborhoods, 8 locations)
        sample_match = re.search(r"(\b(?:twelve|eight|three|[0-9]+)\b\s+(?:neighborhoods|cities|locations|sites))", text_lower)
        if sample_match:
            doc_map[d_name]["Sample Size"] = sample_match.group(1).title()

        # Identify focus area based on key domain terms
        if "cooling" in text_lower or "health" in text_lower or "brief" in text_lower:
            doc_map[d_name]["Key Focus Area"] = "Public Health & Cooling Infrastructure"
        elif "canopy" in text_lower or "park" in text_lower or "green" in text_lower:
            doc_map[d_name]["Key Focus Area"] = "Urban Tree Canopy & Surface Heat"

        # Identify method
        if "satellite" in text_lower or "field measurements" in text_lower:
            doc_map[d_name]["Primary Methodology"] = "Satellite & Field Sensors"
        elif "simulation" in text_lower or "planning exercise" in text_lower or "tabletop" in text_lower:
            doc_map[d_name]["Primary Methodology"] = "Simulated Planning Exercise"
        elif "monitoring" in text_lower or "sensors" in text_lower:
            doc_map[d_name]["Primary Methodology"] = "Outdoor Fixed Sensors"

    return pd.DataFrame(list(doc_map.values()))