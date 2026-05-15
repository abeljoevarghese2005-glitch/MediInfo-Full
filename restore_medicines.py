import psycopg2
import re

conn = psycopg2.connect("postgresql://postgres:pre1WLMC6mR4bHmg@db.xfuzwuraowhaxqnfolzg.supabase.co:5432/postgres")
cur = conn.cursor()

with open(r'C:\mediinfo\mediinfo_backup.sql', 'r', encoding='utf-8', errors='ignore') as f:
    content = f.read()

# Extract just the medicines COPY block
match = re.search(r'(COPY public\.medicines.*?FROM stdin;\n)(.*?)(\n\\\.)', content, re.DOTALL)
if not match:
    print("Could not find medicines block")
    exit()

header = match.group(1)
data = match.group(2)

cols = re.search(r'COPY public\.medicines \((.*?)\)', header).group(1).split(', ')
print(f"Found columns: {len(cols)}")

rows = [r for r in data.split('\n') if r.strip()]
print(f"Found rows: {len(rows)}")

success = 0
errors = 0
for row in rows:
    try:
        cur.copy_from(
            __import__('io').StringIO(row + '\n'),
            'medicines',
            columns=cols,
            null=r'\N'
        )
        conn.commit()
        success += 1
    except Exception as e:
        conn.rollback()
        errors += 1

print(f"Inserted: {success}, Skipped: {errors}")
cur.close()
conn.close()
