
import sqlite3

conn = sqlite3.connect("wattwise.db")

cursor = conn.cursor()

# Display all database tables
cursor.execute("""
    SELECT name
    FROM sqlite_master
    WHERE type='table'
""")

tables = cursor.fetchall()

print("\nDATABASE TABLES")

for table in tables:
    print(table[0])

# Check energy_records
print("\nENERGY RECORDS")

try:
    cursor.execute("SELECT * FROM energy_records LIMIT 5")

    for row in cursor.fetchall():
        print(row)

except Exception as e:
    print("Error:", e)

# Check waste_events
print("\nWASTE EVENTS")

try:
    cursor.execute("SELECT * FROM waste_events LIMIT 10")

    for row in cursor.fetchall():
        print(row)

except Exception as e:
    print("Error:", e)

conn.close()
