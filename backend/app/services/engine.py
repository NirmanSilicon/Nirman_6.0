"""Valuation engine + route scorer (PRD s9). Pure functions, no I/O.

Every figure returned carries a trace entry pointing at the table row and
assumptions it used, so the UI can show "how this was calculated".
"""
from __future__ import annotations

from collections import defaultdict
from typing import Any

ROUTES = ["Reuse", "Desolder", "Hydromet", "Pyromet"]
CRITERIA = ["value", "cost", "energy", "co2"]
CLASSES = ["RAM_IC", "IC", "CAPACITOR", "RESISTOR", "CONNECTOR", "CRYSTAL"]
AUTHORISED_ONLY = {"Hydromet", "Pyromet"}


def r2(x: float) -> float:
    return round(x + 0.0, 2)


def group_components(dets: list[dict], prices: dict[str, dict], min_conf: float, reuse_min_conf: float) -> list[dict]:
    """Detections -> per-class components. Presence-only detections (`count_unknown`) get an assumed count range."""
    g: dict[str, list[dict]] = defaultdict(list)
    for d in dets:
        if d["confidence"] >= min_conf:
            g[d["class"]].append(d)
    out = []
    for cls in CLASSES:
        if cls not in g:
            continue
        items = g[cls]
        confs = [d["confidence"] for d in items]
        p = prices.get(f"reuse:{cls}")
        potentially = bool(p and (p["reuse_prob_high"] or 0) > 0)
        unknown = any(d.get("count_unknown") for d in items)
        rng = [1, max(1, int(p["presence_count_high"]))] if unknown and p else [len(items), len(items)]
        out.append({
            "class": cls,
            "count": rng[0], "count_range": rng, "count_unknown": unknown,
            "avg_conf": round(sum(confs) / len(confs), 3),
            "reusable": potentially,
            "reusable_confident": potentially and sum(1 for c in confs if c >= reuse_min_conf),
        })
    return out


def reuse_value(components: list[dict], prices: dict[str, dict]) -> tuple[float, float, list[dict]]:
    lo = hi = 0.0
    trace = []
    for c in components:
        p = prices.get(f"reuse:{c['class']}")
        if not p or not c["reusable"]:
            continue
        n_lo, n_hi = c["count_range"]
        s_lo = n_lo * p["price_low"] * p["reuse_prob_low"]
        s_hi = n_hi * p["price_high"] * p["reuse_prob_high"]
        lo, hi = lo + s_lo, hi + s_hi
        trace.append({
            "class": c["class"], "count": c["count"], "count_range": c["count_range"],
            "price": [p["price_low"], p["price_high"]], "unit": p["unit"],
            "reuse_prob": [p["reuse_prob_low"], p["reuse_prob_high"]],
            "subtotal": [r2(s_lo), r2(s_hi)], "source": p["source"],
        })
    return lo, hi, trace


def metal_value(materials: list[dict], prices: dict[str, dict], recovery: float) -> tuple[float, float, list[dict]]:
    lo = hi = 0.0
    trace = []
    for m in materials:
        p = prices.get(f"metal:{m['metal']}")
        if not p:
            continue
        s_lo = m["grams_low"] * p["price_low"] * recovery
        s_hi = m["grams_high"] * p["price_high"] * recovery
        lo, hi = lo + s_lo, hi + s_hi
        trace.append({
            "metal": m["metal"], "grams": [m["grams_low"], m["grams_high"]],
            "price": [p["price_low"], p["price_high"]], "unit": p["unit"], "recovery": recovery,
            "subtotal": [r2(s_lo), r2(s_hi)],
            "source": f"{m['source']} | price: {p['source']}",
        })
    return lo, hi, trace


def route_values(components, materials, prices, route_params) -> tuple[dict[str, dict], dict]:
    """Net ₹ range per route = reuse*factor + metals*recovery - processing cost."""
    ru_lo, ru_hi, ru_trace = reuse_value(components, prices)
    values: dict[str, dict] = {}
    metal_traces: dict[str, list] = {}
    for route in ROUTES:
        rp = route_params[route]
        me_lo, me_hi, me_trace = metal_value(materials, prices, rp["metal_recovery"])
        metal_traces[route] = me_trace
        reuse = [ru_lo * rp["reuse_factor"], ru_hi * rp["reuse_factor"]]
        metals = [me_lo, me_hi]
        low = max(0.0, reuse[0] + metals[0] - rp["cost_high"])
        high = max(0.0, reuse[1] + metals[1] - rp["cost_low"])
        values[route] = {
            "low": round(low), "high": round(max(high, low)),
            "breakdown": {
                "reuse": [round(reuse[0]), round(reuse[1])],
                "metals": [round(metals[0]), round(metals[1])],
                "processing_cost": [rp["cost_low"], rp["cost_high"]],
            },
            "assumptions": {"reuse_factor": rp["reuse_factor"], "metal_recovery": rp["metal_recovery"], "source": rp["source"]},
        }
    return values, {"reuse": ru_trace, "metals": metal_traces}


def eligibility(route: str, components: list[dict]) -> tuple[bool, str | None]:
    """PRD 9.2 hard rule: Reuse needs >=1 reusable component with conf >= 0.6."""
    if route == "Reuse" and not any(c["reusable_confident"] for c in components):
        return False, "no_confident_reusable_part"
    return True, None


def criteria_ratings(values: dict[str, dict], ratings: dict[str, dict], eligible: dict[str, bool]) -> dict[str, dict]:
    mids = {r: (values[r]["low"] + values[r]["high"]) / 2 for r in ROUTES if eligible[r]}
    top = max(mids.values(), default=0.0)
    out = {}
    for r in ROUTES:
        row = dict(ratings[r])
        row["value"] = max(1, min(5, round(1 + 4 * mids.get(r, 0) / top))) if top > 0 and r in mids else 1
        out[r] = {k: int(round(v)) for k, v in row.items()}
    return out


def score(rating_row: dict, weights: dict[str, float]) -> float:
    return round(sum(weights[c] * rating_row[c] / 5 for c in CRITERIA), 3)


def build_routes(values, ratings, eligible, reasons, weights) -> list[dict]:
    out = []
    for r in ROUTES:
        ok = eligible[r]
        out.append({
            "route": r, "eligible": ok, "ineligible_reason": reasons.get(r),
            "score": score(ratings[r], weights) if ok else 0.0,
            **ratings[r],
            "value_range": {"low": values[r]["low"], "high": values[r]["high"]},
            "breakdown": values[r]["breakdown"],
            "authorised_only": r in AUTHORISED_ONLY,
        })
    out.sort(key=lambda x: (-x["score"], ROUTES.index(x["route"])))
    return out


def reason(route: str, components: list[dict], value: dict) -> dict[str, str]:
    lo, hi = value["low"], value["high"]
    reusable = [c for c in components if c["reusable_confident"]]
    names = {"RAM_IC": ("RAM chips", "RAM चिप"), "IC": ("ICs", "IC"), "CONNECTOR": ("connectors", "कनेक्टर")}
    lead = max(reusable, key=lambda c: c["reusable_confident"], default=None)
    en_n, hi_n = names.get(lead["class"], ("parts", "पुर्ज़े")) if lead else ("parts", "पुर्ज़े")
    rng = f"₹{lo}–{hi}"
    n = 0
    if lead:
        lo_n, hi_n = lead["count_range"]
        n = f"{lo_n}-{hi_n}" if lead["count_unknown"] and hi_n > lo_n else lead["reusable_confident"]
    if route == "Reuse":
        return {"en": f"Sell to a refurbisher: {n} potentially reusable {en_n}, worth about {rng}.",
                "hi": f"रिफर्बिशर को बेचें: {n} संभावित पुन: उपयोग योग्य {hi_n}, लगभग {rng}।"}
    if route == "Desolder":
        return {"en": f"Desolder first: {n} reusable {en_n} plus metals, about {rng}. Send the stripped board to an authorised recycler.",
                "hi": f"पहले डीसोल्डर करें: {n} {hi_n} और धातु, लगभग {rng}। बचा बोर्ड अधिकृत रिसाइक्लर को दें।"}
    label = {"Hydromet": ("hydrometallurgy", "हाइड्रोमेटलर्जी"), "Pyromet": ("pyrometallurgy", "पायरोमेटलर्जी")}[route]
    return {"en": f"Send to an authorised recycler ({label[0]}): metals worth about {rng}. Do not process at home.",
            "hi": f"अधिकृत रिसाइक्लर को दें ({label[1]}): धातु लगभग {rng}। घर पर प्रोसेस न करें।"}


def evaluate(dets: list[dict], board_type: str, tables: dict[str, Any], min_conf: float, reuse_min_conf: float) -> dict:
    prices, materials = tables["prices"], tables["materials"].get(board_type, [])
    comps = group_components(dets, prices, min_conf, reuse_min_conf)
    values, trace = route_values(comps, materials, prices, tables["route_params"])
    elig, reasons = {}, {}
    for r in ROUTES:
        elig[r], reasons[r] = eligibility(r, comps)
    ratings = criteria_ratings(values, tables["ratings"], elig)
    by_preset = {name: build_routes(values, ratings, elig, reasons, w) for name, w in tables["presets"].items()}
    for routes in by_preset.values():
        for rt in routes:
            rt["reason"] = reason(rt["route"], comps, rt["value_range"])
    top = by_preset["default"][0]
    return {
        "components": comps,
        "routes_by_preset": by_preset,
        "top_route": top["route"],
        "value": {"currency": "INR", "low": top["value_range"]["low"], "high": top["value_range"]["high"],
                  "breakdown": values[top["route"]]["breakdown"], "route": top["route"]},
        "recommendation": top["reason"]["en"],
        "recommendation_i18n": top["reason"],
        "trace": {"reuse": trace["reuse"], "metals": trace["metals"][top["route"]], "weights": tables["presets"]},
    }
