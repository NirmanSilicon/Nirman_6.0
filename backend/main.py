import os, re, csv, json, sqlite3
from fastapi import FastAPI, UploadFile, File, Form, WebSocket, WebSocketDisconnect, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles

from shared.schemas import BorderAlertEvent

BASE_DIR = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
SNAP_DIR = os.path.join(BASE_DIR, "backend", "snapshots")
DB_PATH = os.path.join(BASE_DIR, "backend", "ibvap_bop.db")
FRONTEND_DIR = os.path.join(BASE_DIR, "frontend")
RECORDS_CSV = os.path.join(BASE_DIR, "shared", "vehicle_records.csv")
FLAGGED_STATUSES = {"STOLEN", "WANTED", "BLACKLISTED", "SUSPECT"}

app = FastAPI(title="IBVAP Edge BOP Server")
app.add_middleware(CORSMiddleware, allow_origins=["*"], allow_methods=["*"], allow_headers=["*"])

os.makedirs(SNAP_DIR, exist_ok=True)
app.mount("/snapshots", StaticFiles(directory=SNAP_DIR), name="snapshots")

# --- Local Edge SQLite Storage ---
conn = sqlite3.connect(DB_PATH, check_same_thread=False)
conn.execute("""
CREATE TABLE IF NOT EXISTS border_events (
    event_id TEXT PRIMARY KEY, timestamp TEXT, bop_id TEXT, camera_id TEXT,
    event_type TEXT, target_class TEXT, track_id INTEGER, is_night_ir INTEGER,
    frs_match TEXT, anpr_plate TEXT, watchlist_hit INTEGER, snapshot_url TEXT,
    synced_to_hq INTEGER
)""")
if "details" not in [r[1] for r in conn.execute("PRAGMA table_info(border_events)")]:
    conn.execute("ALTER TABLE border_events ADD COLUMN details TEXT")  # migrate old DBs
conn.execute("""
CREATE TABLE IF NOT EXISTS vehicle_records (
    plate TEXT PRIMARY KEY, owner TEXT, status TEXT, notes TEXT
)""")
conn.commit()


def norm_plate(p: str) -> str:
    return re.sub(r"[^A-Z0-9]", "", p.upper())


def seed_records():
    if not os.path.exists(RECORDS_CSV):
        return
    with open(RECORDS_CSV, newline="", encoding="utf-8") as f:
        for r in csv.DictReader(f):
            conn.execute(
                "INSERT OR REPLACE INTO vehicle_records VALUES (?,?,?,?)",
                (norm_plate(r["plate"]), r.get("owner", ""), r.get("status", "REGISTERED").upper(), r.get("notes", "")),
            )
    conn.commit()


seed_records()


def levenshtein(a: str, b: str) -> int:
    prev = list(range(len(b) + 1))
    for i, ca in enumerate(a, 1):
        cur = [i]
        for j, cb in enumerate(b, 1):
            cur.append(min(prev[j] + 1, cur[j - 1] + 1, prev[j - 1] + (ca != cb)))
        prev = cur
    return prev[-1]


SAT_LINK_ONLINE = True
active_clients: list[WebSocket] = []


async def broadcast(payload: dict):
    for ws in list(active_clients):
        try:
            await ws.send_json(payload)
        except Exception:
            if ws in active_clients:
                active_clients.remove(ws)


@app.websocket("/ws")
async def websocket_endpoint(ws: WebSocket):
    await ws.accept()
    active_clients.append(ws)
    try:
        while True:
            await ws.receive_text()
    except WebSocketDisconnect:
        if ws in active_clients:
            active_clients.remove(ws)


@app.post("/api/events")
async def ingest_border_event(payload: str = Form(...), image: UploadFile = File(...)):
    try:
        data = BorderAlertEvent(**json.loads(payload)).model_dump()
    except Exception as e:
        raise HTTPException(status_code=422, detail=f"Bad event payload: {e}")

    safe_id = re.sub(r"[^A-Za-z0-9_-]", "", data["event_id"])
    snap_filename = f"{safe_id}.jpg"
    with open(os.path.join(SNAP_DIR, snap_filename), "wb") as f:
        f.write(await image.read())

    data["snapshot_url"] = f"/snapshots/{snap_filename}"
    data["synced_to_hq"] = SAT_LINK_ONLINE

    conn.execute(
        """INSERT INTO border_events
           (event_id,timestamp,bop_id,camera_id,event_type,target_class,track_id,is_night_ir,
            frs_match,anpr_plate,watchlist_hit,snapshot_url,synced_to_hq,details)
           VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?)""",
        (data["event_id"], data["timestamp"], data["bop_id"], data["camera_id"], data["event_type"],
         data["target_class"], data["track_id"], int(data["is_night_ir"]), data["frs_match"],
         data["anpr_plate"], int(data["watchlist_hit"]), data["snapshot_url"],
         int(data["synced_to_hq"]), data["details"]),
    )
    conn.commit()
    await broadcast({"type": "NEW_BORDER_ALERT", "event": data})
    return {"status": "logged_at_bop", "synced_to_hq": data["synced_to_hq"]}


# ---------------- vehicle records / ANPR lookup ----------------
@app.get("/api/vehicles/check/{plate}")
def check_vehicle(plate: str):
    p = norm_plate(plate)
    row = conn.execute("SELECT plate,owner,status,notes FROM vehicle_records WHERE plate=?", (p,)).fetchone()
    exact = True
    if row is None:  # tolerate 1 OCR error
        best = None
        for r in conn.execute("SELECT plate,owner,status,notes FROM vehicle_records"):
            d = levenshtein(p, r[0])
            if d <= 1 and (best is None or d < best[0]):
                best = (d, r)
        if best:
            row, exact = best[1], False
    if row is None:
        return {"plate": p, "found": False, "exact": False, "flagged": False,
                "matched_plate": None, "owner": None, "status": None, "notes": None}
    return {"plate": p, "found": True, "exact": exact, "matched_plate": row[0], "owner": row[1],
            "status": row[2], "notes": row[3], "flagged": row[2] in FLAGGED_STATUSES}


@app.get("/api/vehicle-records")
def list_vehicle_records():
    cur = conn.execute("SELECT plate,owner,status,notes FROM vehicle_records ORDER BY plate")
    return [dict(zip(["plate", "owner", "status", "notes"], r)) for r in cur.fetchall()]


@app.post("/api/vehicle-records")
def upsert_vehicle_record(plate: str = Form(...), owner: str = Form(""), status: str = Form("REGISTERED"), notes: str = Form("")):
    conn.execute("INSERT OR REPLACE INTO vehicle_records VALUES (?,?,?,?)", (norm_plate(plate), owner, status.upper(), notes))
    conn.commit()
    return {"ok": True, "plate": norm_plate(plate)}


# ---------------- HQ link ----------------
@app.get("/api/hq-link")
def get_hq_link():
    return {"sat_link_online": SAT_LINK_ONLINE}


@app.post("/api/hq-link/{status}")
async def toggle_hq_link(status: str):
    """Simulate 4G/Satellite link drop and Store-and-Forward flush to Sector HQ"""
    global SAT_LINK_ONLINE
    SAT_LINK_ONLINE = status.lower() == "online"
    flushed = 0
    if SAT_LINK_ONLINE:
        flushed = conn.execute("SELECT COUNT(*) FROM border_events WHERE synced_to_hq = 0").fetchone()[0]
        conn.execute("UPDATE border_events SET synced_to_hq = 1 WHERE synced_to_hq = 0")
        conn.commit()
        await broadcast({"type": "HQ_OUTBOX_FLUSHED", "flushed_count": flushed})
    return {"sat_link_online": SAT_LINK_ONLINE, "flushed_to_hq": flushed}


@app.get("/api/events")
def list_border_events():
    cur = conn.execute("SELECT * FROM border_events ORDER BY timestamp DESC LIMIT 50")
    cols = [d[0] for d in cur.description]
    return [dict(zip(cols, row)) for row in cur.fetchall()]


# Must stay LAST (after all API routes)
app.mount("/", StaticFiles(directory=FRONTEND_DIR, html=True), name="frontend")
