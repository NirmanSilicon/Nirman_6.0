"""The two analyses on the telemetry page (D56), from every recording on this laptop (RECORDED data):

1. Spatial decay curve: for each kind of object, the probability that it is still where the user was
   told, against the time since (Kaplan–Meier with censoring; constant-rate fit). The phone uses the
   measured rates to answer "where is my cup?" with "…, but it may have been moved since" (SpatialDecay).
2. Co-occurrence knowledge graph: which kit objects are seen together (once per second), with the lift
   of each pair (market-basket analysis: together ÷ expected if independent).
Results are cached in recordings/insights_cache.json until a recording changes.
"""
from __future__ import annotations

import itertools
import json
import sys
from collections import Counter, defaultdict
from pathlib import Path

ROOT = Path(__file__).resolve().parents[2]
sys.path.insert(0, str(ROOT / "tools"))
import belief_model as bm  # noqa: E402

RECORDINGS = ROOT / "recordings"
CACHE = RECORDINGS / "insights_cache.json"


def compute() -> dict:
    files = sorted(RECORDINGS.glob("feed_2026*.jsonl"))
    key = [[f.name, f.stat().st_size] for f in files]
    if CACHE.is_file():
        cached = json.loads(CACHE.read_text(encoding="utf-8"))
        if cached.get("key") == key:
            return cached
    decay, minutes = {}, 0.0
    per_label = defaultdict(list)
    for f in files:
        evs = bm.events(f)
        for lab in bm.KIT:
            per_label[lab] += bm.survival([e for e in evs if e[2] in (lab, None)])
    for lab, data in per_label.items():
        if len(data) < 5:
            continue
        moved = sum(e for _, e in data)
        exposure = sum(d for d, _ in data)
        km = [(t, s) for t, s in bm.kaplan_meier(data) if t <= 600]
        decay[lab] = {"km": [[round(t, 1), round(s, 4)] for t, s in km], "intervals": len(data), "moved": moved,
                      "ratePerMin": round(60 * moved / exposure, 4) if exposure else 0.0}
        minutes += exposure / 60
    pair, single, seconds = Counter(), Counter(), 0
    for f in files:
        last = None
        for line in open(f, encoding="utf-8"):
            if '"type":"perception"' not in line:
                continue
            try:
                m = json.loads(line)
            except ValueError:
                continue
            if last is not None and 0 <= m["t"] - last < 1000:
                continue
            last = m["t"]
            seen = sorted({w["label"] for w in m.get("world") or [] if w.get("seen") == "in_view" and w["label"] in bm.KIT})
            if seen:
                seconds += 1
                single.update(seen)
                pair.update(itertools.combinations(seen, 2))
    nodes = [{"label": k, "seconds": v} for k, v in single.most_common() if v >= 30]
    names = {n["label"] for n in nodes}
    edges = [{"a": a, "b": b, "seconds": c, "lift": round(c * seconds / (single[a] * single[b]), 2)}
             for (a, b), c in pair.items() if a in names and b in names and c >= 30]
    out = {"key": key, "recordings": len(files), "decay": decay, "toldMinutes": round(minutes, 1),
           "cooc": {"seconds": seconds, "nodes": nodes, "edges": sorted(edges, key=lambda e: -e["seconds"])}}
    CACHE.write_text(json.dumps(out), encoding="utf-8")
    return out


if __name__ == "__main__":
    r = compute()
    print(r["recordings"], "recordings;", {k: (v["intervals"], v["moved"], v["ratePerMin"]) for k, v in r["decay"].items()})
