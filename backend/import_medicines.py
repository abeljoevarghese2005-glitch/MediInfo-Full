import pandas as pd
import psycopg2
import uuid
from datetime import datetime
import re
import os

# ============================================
# DATABASE CONNECTION (USE YOUR WORKING URL)
# ============================================
conn = psycopg2.connect("postgresql://postgres:tuEifPQTTYoKsTfXppVFddqliLaVoaTN@mainline.proxy.rlwy.net:41984/railway")
cur = conn.cursor()

# ============================================
# CHECK EXISTING MEDICINES
# ============================================
cur.execute("SELECT LOWER(medicine_name) FROM medicines")
existing_medicines = set(row[0] for row in cur.fetchall())
print(f"✅ Existing medicines in DB: {len(existing_medicines)}")

# ============================================
# LOAD THE CSV FILE
# ============================================
# Make sure indian_medicine_data.csv is in the same folder
csv_path = 'indian_medicine_data.csv'

if not os.path.exists(csv_path):
    print(f"❌ Error: {csv_path} not found!")
    print("Make sure the CSV file is in the same folder as this script")
    exit()

df = pd.read_csv(csv_path)
print(f"📊 Total records in dataset: {len(df)}")
print(f"📋 Columns: {list(df.columns)}")

# ============================================
# PREPARE NEW MEDICINES
# ============================================
# Create a clean medicine name
df['medicine_name'] = df['name'].fillna('') + ' ' + df['pack_size_label'].fillna('')
df['medicine_name'] = df['medicine_name'].str.strip()
df['medicine_name_lower'] = df['medicine_name'].str.lower()

# Remove duplicates from dataset
df = df.drop_duplicates(subset=['medicine_name_lower'])

# Filter out existing medicines
df_new = df[~df['medicine_name_lower'].isin(existing_medicines)].copy()

# Take up to 9,000 new medicines
# Take ALL new medicines (no limit)
df_new = df_new  # This will add everything not already in DB
print(f"🆕 New medicines to add: {len(df_new)}")

# ============================================
# INSERT MEDICINES
# ============================================
inserted = 0
skipped = 0

for index, row in df_new.iterrows():
    try:
        # Extract data
        medicine_name = str(row.get('medicine_name', ''))[:255]
        brand_name = str(row.get('name', medicine_name))[:255]
        
        # Generic name (combine compositions)
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
        
        # Form and strength
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
        
        # Default values
        prescription_required = True
        is_otc = False
        schedule = 'H'
        storage_instructions = 'Store below 30°C, protect from moisture and light'
        cdsco_approved = True
        is_active = True
        created_at = datetime.now()
        updated_at = datetime.now()
        
        # Insert
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
            prescription_required, is_otc, schedule, storage_instructions,
            cdsco_approved, is_active, created_at, updated_at
        ))
        
        inserted += 1
        if inserted % 500 == 0:
            conn.commit()
            print(f"💾 Inserted {inserted} medicines so far...")
            
    except Exception as e:
        skipped += 1
        if skipped <= 5:
            print(f"⚠️ Error on row {index}: {e}")
        continue

# Final commit
conn.commit()

print(f"\n🎉 COMPLETE!")
print(f"   ✅ Inserted: {inserted}")
print(f"   ⏭️ Skipped: {skipped}")
print(f"   📊 Total medicines in DB: {len(existing_medicines) + inserted}")

# Show sample
if inserted > 0:
    print(f"\n📋 Sample of medicines added:")
    cur.execute("""
        SELECT medicine_name, brand_name, manufacturer 
        FROM medicines 
        ORDER BY created_at DESC 
        LIMIT 5
    """)
    for row in cur.fetchall():
        print(f"   - {row[0]} ({row[1]}) - {row[2]}")

cur.close()
conn.close()