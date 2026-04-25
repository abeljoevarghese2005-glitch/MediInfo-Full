import os
import psycopg2
from dotenv import load_dotenv
 
load_dotenv()
 
conn = psycopg2.connect(os.getenv("DATABASE_URL"))
conn.autocommit = True
cur = conn.cursor()
 
cur.execute("CREATE EXTENSION IF NOT EXISTS pg_trgm;")
print("✅ pg_trgm enabled")
 
# Optional but speeds up keyword search significantly
cur.execute("""
    CREATE INDEX IF NOT EXISTS idx_medicines_name_trgm
    ON medicines USING gin (LOWER(medicine_name) gin_trgm_ops);
""")
cur.execute("""
    CREATE INDEX IF NOT EXISTS idx_medicines_brand_trgm
    ON medicines USING gin (LOWER(brand_name) gin_trgm_ops);
""")
cur.execute("""
    CREATE INDEX IF NOT EXISTS idx_medicines_generic_trgm
    ON medicines USING gin (LOWER(generic_name) gin_trgm_ops);
""")
print("✅ trigram indexes created")
 
cur.close()
conn.close()
print("\nDone! Hybrid search is ready.")
