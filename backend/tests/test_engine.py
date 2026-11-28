from app.seed import data as d
from app.services import engine, quality
from app.config import Settings
from PIL import Image
import numpy as np


def tables():
    prices = {i: {"price_low": lo, "price_high": hi, "unit": u, "source": s,
                  "reuse_prob_low": pl or 0.0, "reuse_prob_high": ph or 0.0}
              for i, u, lo, hi, pl, ph, s in d.PRICES}
    mats = {d.BOARD_TYPE: [{"metal": me, "grams_low": lo, "grams_high": hi, "source": s} for _, me, lo, hi, s in d.MATERIALS]}
    params = {r: {"reuse_factor": rf, "metal_recovery": mr, "cost_low": cl, "cost_high": ch, "source": s}
              for r, rf, mr, cl, ch, s in d.ROUTE_PARAMS}
    ratings = {}
    for r, c, rt, _ in d.ROUTE_RATINGS:
        ratings.setdefault(r, {})[c] = rt or 0
    return {"prices": prices, "materials": mats, "route_params": params, "ratings": ratings, "presets": d.PRESET_WEIGHTS}


def dets(cls, n, conf):
    return [{"class": cls, "confidence": conf, "bbox": [0, 0, 1, 1]} for _ in range(n)]


def run(ds):
    return engine.evaluate(ds, d.BOARD_TYPE, tables(), 0.35, 0.6)


def test_range_is_ordered_and_split():
    ev = run(dets("RAM_IC", 8, 0.88) + dets("CAPACITOR", 10, 0.7))
    v = ev["value"]
    assert 0 < v["low"] <= v["high"]
    assert v["breakdown"]["reuse"][0] <= v["breakdown"]["reuse"][1]


def test_reuse_ineligible_without_confident_reusable_part():
    ev = run(dets("RAM_IC", 8, 0.5) + dets("CAPACITOR", 4, 0.9))
    reuse = next(r for r in ev["routes_by_preset"]["default"] if r["route"] == "Reuse")
    assert not reuse["eligible"] and reuse["score"] == 0.0


def test_scores_use_documented_weights():
    ev = run(dets("RAM_IC", 8, 0.9))
    r = next(r for r in ev["routes_by_preset"]["default"] if r["route"] == "Pyromet")
    w = d.DEFAULT_WEIGHTS
    assert r["score"] == round(sum(w[c] * r[c] / 5 for c in w), 3)


def test_greenest_prefers_low_impact_routes():
    ev = run(dets("RAM_IC", 8, 0.9))
    assert ev["routes_by_preset"]["greenest"][0]["route"] in ("Reuse", "Desolder")
    assert ev["routes_by_preset"]["greenest"][-1]["route"] == "Pyromet"


def test_no_parts_falls_back_to_metals_route():
    ev = run([])
    assert ev["top_route"] in ("Hydromet", "Desolder", "Pyromet")
    assert ev["top_route"] != "Reuse"


def test_low_conf_detections_ignored():
    assert run(dets("RAM_IC", 8, 0.2))["components"] == []


def test_quality_flags():
    s = Settings()
    flat = Image.new("RGB", (400, 400), (20, 20, 20))
    q = quality.check(flat, s)
    assert "too_dark" in q["issues"] and "blurry" in q["issues"]
    noisy = Image.fromarray(np.random.randint(0, 255, (400, 400, 3), dtype=np.uint8))
    assert quality.check(noisy, s)["ok"]


def test_gamify_levels_and_rules():
    from app.services import gamify
    assert gamify.LEVELS[0][0] == 0
    assert {r["id"] for r in gamify.RULES} >= {"scan", "dropoff"}
    assert gamify._streak(set()) == 0
    from datetime import date, timedelta
    t = date(2026, 11, 28)
    assert gamify._streak({t, t - timedelta(days=1), t - timedelta(days=2)}) == 3
