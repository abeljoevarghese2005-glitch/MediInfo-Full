import psycopg2
import os

DATABASE_URL = os.getenv("DATABASE_URL", "postgresql://postgres:tuEifPQTTYoKsTfXppVFddqliLaVoaTN@mainline.proxy.rlwy.net:41984/railway")

conn = psycopg2.connect(DATABASE_URL)
cur = conn.cursor()

print("=== Drug Class Distribution ===")
cur.execute("SELECT drug_class, COUNT(*) FROM medicines GROUP BY drug_class ORDER BY COUNT(*) DESC LIMIT 30")
for row in cur.fetchall():
    print(f"  {row[1]:>8} | {row[0]}")

print("\n=== Sample medicines with no/generic drug class ===")
cur.execute("""
    SELECT medicine_name, generic_name, composition, drug_class 
    FROM medicines 
    WHERE drug_class IS NULL 
       OR drug_class = '' 
       OR drug_class = 'General'
       OR drug_class = 'Not Specified'
    LIMIT 20
""")
for row in cur.fetchall():
    print(f"  {row[0]} | generic: {row[1]} | composition: {row[2]} | class: {row[3]}")

cur.close()
conn.close()