
import mysql.connector
from openpyxl import load_workbook
from getpass import getpass

# Read Excel file
workbook = load_workbook("mandi_dataset_1.csv.xlsx", data_only=True)
sheet = workbook.active

# Connect to MySQL
connection = mysql.connector.connect(
    host="localhost",
    user="root",
    password=getpass("Enter MySQL root password: "),
    database="fasalsathi_db"
)

cursor = connection.cursor()

sql = """
INSERT INTO mandi_prices
(State, District, Market, Commodity, Variety, Grade,
 Arrival_Date, Min_Price, Max_Price, Modal_Price)
VALUES (%s, %s, %s, %s, %s, %s, %s, %s, %s, %s)
"""

records = []

for row in sheet.iter_rows(min_row=2, values_only=True):
    records.append((
        row[0], row[1], row[2], row[3], row[4], row[5],
        row[6].date() if hasattr(row[6], "date") else row[6],
        row[7], row[8], row[9]
    ))

cursor.executemany(sql, records)
connection.commit()

print("Successfully imported:", cursor.rowcount, "records!")

cursor.close()
connection.close()
workbook.close()
