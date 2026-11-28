"""RootWhisper Database Backup & Inspection Tool.

Creates an atomic binary snapshot using SQLite Online Backup API,
verifies integrity, and dumps all table records to formatted JSON.
"""

import os
import json
import sqlite3
from datetime import datetime, timezone
from pathlib import Path

BASE_DIR = Path(__file__).resolve().parent.parent
DATA_DIR = BASE_DIR / "data"
DB_PATH = DATA_DIR / "rootwhisper.db"
BACKUP_DIR = DATA_DIR / "backups"
BACKUP_DIR.mkdir(parents=True, exist_ok=True)

timestamp = datetime.now(timezone.utc).strftime("%Y%m%d_%H%M%S")
BACKUP_DB_PATH = BACKUP_DIR / f"rootwhisper_backup_{timestamp}.db"
BACKUP_JSON_PATH = BACKUP_DIR / f"rootwhisper_export_{timestamp}.json"
LATEST_BACKUP_DB = BACKUP_DIR / "rootwhisper_backup_latest.db"
LATEST_EXPORT_JSON = BACKUP_DIR / "rootwhisper_export_latest.json"

print(f"[Backup] Source Database: {DB_PATH}")
print(f"[Backup] Target Snapshot: {BACKUP_DB_PATH}")

# 1. Atomic SQLite Online Backup
src_conn = sqlite3.connect(DB_PATH)
dst_conn = sqlite3.connect(BACKUP_DB_PATH)
with dst_conn:
    src_conn.backup(dst_conn)
dst_conn.close()

# Also copy to 'latest'
import shutil
shutil.copy2(BACKUP_DB_PATH, LATEST_BACKUP_DB)

print("[Backup] Binary SQLite snapshot created successfully.")

# 2. Verify Integrity of Snapshot
verify_conn = sqlite3.connect(BACKUP_DB_PATH)
verify_conn.row_factory = sqlite3.Row
integrity_res = verify_conn.execute("PRAGMA integrity_check;").fetchall()
integrity_ok = len(integrity_res) == 1 and integrity_res[0][0] == "ok"
print(f"[Backup] Integrity Check on Snapshot: {'PASSED (ok)' if integrity_ok else 'FAILED: ' + str(integrity_res)}")

# 3. Inspect All Tables and Export to JSON
tables = [row[0] for row in verify_conn.execute("SELECT name FROM sqlite_master WHERE type='table' ORDER BY name;").fetchall()]
print(f"[Backup] Discovered Tables ({len(tables)}): {tables}")

full_export = {
    "metadata": {
        "timestamp_utc": datetime.now(timezone.utc).isoformat(),
        "source_db": str(DB_PATH),
        "backup_db": str(BACKUP_DB_PATH),
        "integrity_status": "ok" if integrity_ok else "corrupt",
        "total_tables": len(tables),
    },
    "tables": {}
}

table_summary = {}

for tbl in tables:
    rows = verify_conn.execute(f"SELECT * FROM {tbl};").fetchall()
    cols = [col[1] for col in verify_conn.execute(f"PRAGMA table_info({tbl});").fetchall()]
    
    serialized_rows = []
    for r in rows:
        row_dict = {}
        for c in cols:
            val = r[c]
            # Convert non-serializable objects if any
            if isinstance(val, bytes):
                val = val.hex()
            row_dict[c] = val
        serialized_rows.append(row_dict)
        
    full_export["tables"][tbl] = {
        "column_names": cols,
        "row_count": len(rows),
        "records": serialized_rows
    }
    table_summary[tbl] = len(rows)

verify_conn.close()

# Save JSON Export
with open(BACKUP_JSON_PATH, "w", encoding="utf-8") as f:
    json.dump(full_export, f, indent=2, default=str)
shutil.copy2(BACKUP_JSON_PATH, LATEST_EXPORT_JSON)

print(f"[Backup] JSON Data Export written to: {BACKUP_JSON_PATH}")
print("\n[Backup] Table Row Counts Summary:")
for tbl, count in table_summary.items():
    print(f"  - {tbl:<25} : {count:>5} record(s)")

print(f"\n[Backup] Verification Complete. Backup verified and preserved.")
