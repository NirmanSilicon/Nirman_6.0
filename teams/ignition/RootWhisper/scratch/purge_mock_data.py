import sqlite3

conn = sqlite3.connect('data/rootwhisper.db')
c = conn.cursor()

print("--- PURGING PERSISTED MOCK & TEST DATA ---")

# 1. Telemetry readings
c.execute("DELETE FROM telemetry_readings WHERE is_simulated = 1;")
print(f"Deleted simulated telemetry readings. Remaining: {c.execute('SELECT count(*) FROM telemetry_readings;').fetchone()[0]}")

# 2. Screening results
c.execute("DELETE FROM screening_results WHERE is_simulated = 1 OR telemetry_id NOT IN (SELECT id FROM telemetry_readings);")
print(f"Purged screening results. Remaining: {c.execute('SELECT count(*) FROM screening_results;').fetchone()[0]}")

# 3. Plant models (simulated test models)
c.execute("DELETE FROM plant_models WHERE data_provenance = 'SIMULATED_TEST_DATA';")
print(f"Purged simulated plant models. Remaining: {c.execute('SELECT count(*) FROM plant_models;').fetchone()[0]}")

# 4. Devices reset
c.execute("UPDATE devices SET last_seen = NULL, is_online = 0;")
print("Reset devices to offline / waiting for first data:")
for row in c.execute("SELECT device_id, plant_name, is_online, last_seen FROM devices;").fetchall():
    print(f"  {row}")

# 5. Clean test users, keeping only actual human user (patnaik.ayesha9@gmail.com)
c.execute("DELETE FROM users WHERE email != 'patnaik.ayesha9@gmail.com';")
print(f"Cleaned test users. Remaining actual users:")
for row in c.execute("SELECT id, email, full_name, is_active FROM users;").fetchall():
    print(f"  {row}")

# 6. Password reset tokens
c.execute("DELETE FROM password_reset_tokens WHERE user_id NOT IN (SELECT id FROM users);")
print(f"Cleaned orphaned password reset tokens. Remaining: {c.execute('SELECT count(*) FROM password_reset_tokens;').fetchone()[0]}")

conn.commit()
c.execute("VACUUM;")
conn.close()
print("--- DATABASE PURGE COMPLETE & COMMITTED ---")

