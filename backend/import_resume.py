import pandas as pd
import psycopg2
import uuid
from datetime import datetime
import re
import os
import time

# ============================================
# DATABASE CONNECTION (USE YOUR URL)
# ============================================
DATABASE_URL = "postgresql://postgres:tuEifPQTTYoKsTfXppVFddqliLaVoaTN@mainline.proxy.rlwy.net:41984/railway"

def get_connection():
    return psycopg2.connect(DATABASE_URL, keepalives=1, keepalives_idle=30, keepalives_interval=10, keepalives_count=5)

conn = get_connection()
cur = conn.cursor()

# ============================================
# CHECK EXISTING MEDICINES
# ============================================
cur.execute("SELECT LOWER(medicine_name) FROM medicines")
existing_medicines = set(row[0] for row in cur.fetchall())
print(f"✅ Existing medicines in DB: {len(existing_medicines)}")

# ============================================
# LOAD CSV
# ============================================
csv_path = 'indian_medicine_data.csv'
if not os.path.exists(csv_path):
    print(f"❌ Error: {csv_path} not found!")
    exit()

df = pd.read_csv(csv_path)
print(f"📊 Total records in dataset: {len(df)}")

# ============================================
# PREPARE NEW MEDICINES
# ============================================
df['medicine_name'] = df['name'].fillna('') + ' ' + df['pack_size_label'].fillna('')
df['medicine_name'] = df['medicine_name'].str.strip()
df['medicine_name_lower'] = df['medicine_name'].str.lower()

df = df.drop_duplicates(subset=['medicine_name_lower'])
df_new = df[~df['medicine_name_lower'].isin(existing_medicines)].copy()

print(f"🆕 New medicines to add: {len(df_new)}")

if len(df_new) == 0:
    print("✅ No new medicines to add!")
    exit()

# ============================================
# INSERT WITH AUTO-RECOVERY
# ============================================
inserted = 0
skipped = 0
batch_size = 500

for index, row in df_new.iterrows():
    try:
        # Check connection
        try:
            cur.execute("SELECT 1")
        except:
            print(f"⚠️ Connection lost, reconnecting...")
            conn = get_connection()
            cur = conn.cursor()
        
        medicine_name = str(row.get('medicine_name', ''))[:255]
        brand_name = str(row.get('name', medicine_name))[:255]
        
        comp1 = str(row.get('short_composition1', ''))
        comp2 = str(row.get('short_composition2', ''))
        generic_name = comp1
        if pd.notna(comp2) and comp2 and comp2 != 'nan':
            generic_name = f"{comp1} + {comp2}"
        if not generic_name or generic_name == 'nan':
            generic_name = medicine_name
        generic_name = generic_name[:255]
        
        manufacturer = str(row.get('manufacturer_name', 'Unknown'))[:255]
        drug_class = 'Not Specified'
        composition = generic_name
        
        form = str(row.get('type', 'Tablet'))
        if form == 'nan':
            form = 'Tablet'
        available_forms = f"{{{form}}}"
        
        pack_size = str(row.get('pack_size_label', ''))
        strength = 'Standard'
        if pack_size and pack_size != 'nan':
            match = re.search(r'(\d+(?:\.\d+)?\s*(?:mg|mcg|g|ml|IU)?)', pack_size, re.IGNORECASE)
            if match:
                strength = match.group(1)
        available_strengths = f"{{{strength}}}"
        
        cur.execute("""
            INSERT INTO medicines (
                id, medicine_name, brand_name, generic_name, manufacturer,
                drug_class, composition, available_forms, available_strengths,
                prescription_required, is_otc, schedule, storage_instructions,
                cdsco_approved, is_active, created_at, updated_at
            ) VALUES (
                %s, %s, %s, %s, %s, %s, %s, %s, %s,
                %s, %s, %s, %s, %s, %s, %s, %s
            )
        """, (
            str(uuid.uuid4()), medicine_name, brand_name, generic_name, manufacturer,
            drug_class, composition, available_forms, available_strengths,
            True, False, 'H', 'Store below 30°C, protect from moisture',
            True, True, datetime.now(), datetime.now()
        ))
        
        inserted += 1
        
        if inserted % batch_size == 0:
            conn.commit()
            total_now = len(existing_medicines) + inserted
            print(f"💾 Inserted {inserted} so far... (Total in DB: {total_now})")
            
    except Exception as e:
        skipped += 1
        if skipped <= 10:
            print(f"⚠️ Error: {e}")
            try:
                conn = get_connection()
                cur = conn.cursor()
                print("   ✅ Reconnected")
            except:
                pass
        continue

# Final commit
try:
    conn.commit()
except:
    pass

print(f"\n🎉 COMPLETE!")
print(f"   ✅ Inserted this session: {inserted}")
print(f"   ⏭️ Skipped: {skipped}")
print(f"   📊 Final total: {len(existing_medicines) + inserted}")

cur.close()
conn.close()