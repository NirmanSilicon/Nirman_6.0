#!/usr/bin/env python3
"""Build backend/app/seed/recyclers.csv from the official CPCB list (as on 2023-06-08) + curated state-board data.

  python scripts/build_recyclers.py --state Odisha     # geocode one state (cached)
  python scripts/build_recyclers.py                    # all states (~1 request/s to Nominatim)

Inputs : data/recyclers/cpcb_2023-06-08_raw.json (parsed from the CPCB list), data/recyclers/curated.json (overrides)
Cache  : data/recyclers/geocode_cache.json     Output: backend/app/seed/recyclers.csv
Geocoding uses OpenStreetMap Nominatim (<=1 req/s, cached, identifying User-Agent). Rows whose address cannot be
placed keep empty coordinates and are skipped by the locator.
"""
import argparse, csv, json, re, time, urllib.parse, urllib.request
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
RAW, CUR = ROOT / "data/recyclers/cpcb_2023-06-08_raw.json", ROOT / "data/recyclers/curated.json"
CACHE, OUT = ROOT / "data/recyclers/geocode_cache.json", ROOT / "backend/app/seed/recyclers.csv"
SRC_URL = "https://www.ndmc.gov.in/pdf/cpcb_approved_list_of_e-waste_recyclers_dismantler.pdf"
SRC = "CPCB list of dismantlers/recyclers authorised by SPCBs/PCCs, as on 08-06-2023"
FIELDS = ["name", "cpcb_reg_no", "address", "city", "state", "lat", "lng", "phone", "accepts", "capacity_mta",
          "geocode_level", "list_date", "source_url", "validity_note", "verified", "source"]
VALIDITY = "Listed by CPCB as on 2023-06-08; authorisation validity not confirmed. Check with the State Pollution Control Board before visiting."


def split(text: str):
    t = re.sub(r"\s+", " ", text).strip()
    phone = None
    m = re.search(r"(?:M|Ph|Mob)[-:. ]*\s*(\+?\d[\d ]{8,13}\d)", t)
    if m:
        phone = re.sub(r"\D", "", m.group(1))[-10:]
        t = (t[:m.start()] + t[m.end():]).strip(" ,-")
    t = re.sub(r"^M/s\.?\s*", "", t)
    m = re.match(r"(.+?(?:Pvt\.? ?Ltd\.?|\(P\) ?Ltd\.?|Private Limited|Limited|Ltd\.?|LLP|\(I\)|Industries|Enterprises|Recyclers?|Recycling|Solutions?|Udyog|Net|Trading|Corporation|Systems|Services|Technology|Technologies|Computers|Impex|Steel|Metals?)\b[\.,]?)\s*(.*)", t, re.I)
    name, addr = (m.group(1), m.group(2)) if m and m.group(2) else (t.split(",")[0], ",".join(t.split(",")[1:]))
    return name.strip(" ,."), (addr or t).strip(" ,."), phone


def district(addr: str) -> str | None:
    m = re.search(r"(?:Dist(?:rict|t)?|Distt)\.?\s*[-:. ]*\s*([A-Za-z][A-Za-z ]{2,25})", addr)
    return m.group(1).strip(" ,.-") if m else None


def nominatim(q, cache):
    if q in cache:
        return cache[q]
    url = "https://nominatim.openstreetmap.org/search?" + urllib.parse.urlencode({"q": q, "format": "jsonv2", "limit": 1, "countrycodes": "in"})
    req = urllib.request.Request(url, headers={"User-Agent": "ouroboros-recycler-import/1.0 (open-source e-waste project)"})
    try:
        data = json.load(urllib.request.urlopen(req, timeout=20))
    except Exception:
        return None  # transient: don't cache
    time.sleep(1.1)
    cache[q] = [float(data[0]["lat"]), float(data[0]["lon"])] if data else None
    return cache[q]


def geocode(addr, city, dist, state, cache, override=None):
    st = state
    tries = ([(override, "locality")] if override else []) + [(f"{addr}, {st}, India", "address")]
    parts = [p.strip() for p in addr.split(",") if p.strip()]
    if len(parts) >= 3:
        tries.append((f"{', '.join(parts[-3:])}, {st}, India", "locality"))
    pin = re.search(r"\b(\d{3}) ?(\d{3})\b", addr)
    if pin:
        tries.append((f"{pin.group(1)}{pin.group(2)}, India", "locality"))
    if len(parts) >= 2:
        tries.append((f"{', '.join(parts[-2:])}, {st}, India", "locality"))
    if parts:
        tries.append((f"{parts[-1]}, {st}, India", "city"))
    if city:
        tries.append((f"{city}, {st}, India", "city"))
    if dist:
        tries.append((f"{dist} district, {st}, India", "district"))
    for q, lvl in tries:
        r = nominatim(q, cache)
        if r and 6 < r[0] < 38 and 67 < r[1] < 98:
            return r, lvl
    return None, ""


def main():
    ap = argparse.ArgumentParser(); ap.add_argument("--state"); a = ap.parse_args()
    cache = json.loads(CACHE.read_text()) if CACHE.exists() else {}
    curated = json.loads(CUR.read_text())
    cur_by_key = {c["match"].lower(): c for c in curated}
    rows = []
    for e in json.loads(RAW.read_text()):
        name, addr, phone = split(e["text"])
        row = dict(name=name, cpcb_reg_no="", address=addr, city="", state=e["state"], phone=phone or "", accepts="PCB|RAM|motherboard|mixed",
                   capacity_mta=e["cap"].replace(",", ""), list_date="2023-06-08", source_url=SRC_URL, validity_note=VALIDITY, verified="true", source=SRC)
        for k, c in cur_by_key.items():
            if k in e["text"].lower():
                row.update({kk: vv for kk, vv in c.items() if kk != "match"})
        d = district(e["text"])
        row["_district"] = d
        rows.append(row)
    todo = [r for r in rows if not a.state or r["state"] == a.state]
    for i, r in enumerate(todo):
        if not r.get("lat"):
            pos, lvl = geocode(r["address"], r["city"], r["_district"], r["state"], cache, r.get("geocode_query"))
            if pos:
                r["lat"], r["lng"], r["geocode_level"] = pos[0], pos[1], lvl
        if i % 20 == 0:
            CACHE.write_text(json.dumps(cache, indent=0))
            print(f"{i}/{len(todo)}", flush=True)
    CACHE.write_text(json.dumps(cache, indent=0))
    # keep previously built rows for states not processed in this run
    prev = {}
    if OUT.exists():
        for r in csv.DictReader(OUT.open(encoding="utf-8")):
            prev[(r["name"], r["state"])] = r
    with OUT.open("w", newline="", encoding="utf-8") as f:
        w = csv.DictWriter(f, FIELDS, extrasaction="ignore"); w.writeheader()
        for r in rows:
            p = prev.get((r["name"], r["state"]))
            if (a.state and r["state"] != a.state) and p:
                r = p
            w.writerow(r)
    ok = sum(1 for r in rows if r.get("lat"))
    print("done; geocoded in this run's scope:", sum(1 for r in todo if r.get("lat")), "/", len(todo))


if __name__ == "__main__":
    main()
