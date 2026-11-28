import sqlite3

conn = sqlite3.connect('data/rootwhisper.db')
c = conn.cursor()

print("--- TABLES & ROW COUNTS ---")
tables = c.execute("SELECT name FROM sqlite_master WHERE type='table';").fetchall()
for (table,) in tables:
    count = c.execute(f"SELECT count(*) FROM {table};").fetchone()[0]
    print(f"{table}: {count} rows")

print("\n--- TELEMETRY READINGS (is_simulated) ---")
try:
    rows = c.execute("SELECT is_simulated, count(*) FROM telemetry_readings GROUP BY is_simulated;").fetchall()
    print("Telemetry groups:", rows)
except Exception as e:
    print(e)

print("\n--- DEVICES ---")
try:
    for row in c.execute("SELECT device_id, plant_name, is_online, last_seen FROM devices;").fetchall():
        print(row)
except Exception as e:
    print(e)

print("\n--- USERS ---")
try:
    for row in c.execute("SELECT id, email, full_name, role, is_active FROM users;").fetchall():
        print(row)
except Exception as e:
    print(e)

