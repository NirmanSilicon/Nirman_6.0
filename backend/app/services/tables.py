from sqlalchemy.orm import Session

from .. import models as m
from ..seed.data import PRESET_WEIGHTS


def load(db: Session) -> dict:
    prices = {p.item: {"price_low": p.price_low, "price_high": p.price_high, "unit": p.unit, "source": p.source,
                       "reuse_prob_low": p.reuse_prob_low or 0.0, "reuse_prob_high": p.reuse_prob_high or 0.0,
                       "updated_at": p.updated_at} for p in db.query(m.PriceTable)}
    materials: dict[str, list] = {}
    for r in db.query(m.MaterialTable):
        materials.setdefault(r.board_type, []).append(
            {"metal": r.metal, "grams_low": r.grams_low, "grams_high": r.grams_high, "source": r.source})
    params = {p.route: {"reuse_factor": p.reuse_factor, "metal_recovery": p.metal_recovery,
                        "cost_low": p.cost_low, "cost_high": p.cost_high, "source": p.source}
              for p in db.query(m.RouteParam)}
    ratings: dict[str, dict] = {}
    weights: dict[str, float] = {}
    for r in db.query(m.RouteRule):
        ratings.setdefault(r.route, {})[r.criterion] = r.rating if r.rating is not None else 0
        weights[r.criterion] = r.weight
    presets = {**PRESET_WEIGHTS, "default": weights or PRESET_WEIGHTS["default"]}
    as_of = max((p["updated_at"] for p in prices.values()), default=None)
    return {"prices": prices, "materials": materials, "route_params": params, "ratings": ratings,
            "presets": presets, "as_of": as_of}
