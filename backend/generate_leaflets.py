import os
import time
import json
import uuid as uuid_lib
import psycopg2
from google import genai
from dotenv import load_dotenv

load_dotenv(override=False)

DATABASE_URL = os.getenv("DATABASE_URL")
GEMINI_API_KEY = os.getenv("GEMINI_API_KEY")

client = genai.Client(api_key=GEMINI_API_KEY)

def generate_leaflet(medicine_name, brand_name, generic_name, drug_class, composition):
    prompt = f"""Generate a detailed medicine leaflet for:
Medicine: {medicine_name}
Brand: {brand_name}
Generic: {generic_name}
Drug Class: {drug_class}
Composition: {composition}

Respond ONLY with a valid JSON object with exactly these fields:
{{
  "indications": "what this medicine is used for",
  "contraindications": "when not to use",
  "dosage_adult": "adult dosage",
  "dosage_child": "child dosage",
  "dosage_elderly": "elderly dosage",
  "side_effects_common": ["side effect 1", "side effect 2", "side effect 3"],
  "side_effects_serious": ["serious side effect 1", "serious side effect 2"],
  "drug_interactions": "medicines it interacts with",
  "food_interactions": "food/drink interactions",
  "warnings": "important warnings",
  "overdose_info": "what to do in overdose",
  "pregnancy_category": "A/B/C/D/X",
  "breastfeeding_safe": true or false,
  "mechanism_of_action": "how it works",
  "onset_of_action": "e.g. 30 min (keep under 80 characters)",
  "duration_of_action": "e.g. 4-6 hours (keep under 80 characters)"
}}
Return ONLY the JSON, no markdown, no explanation."""

    last_error = None
    for attempt in range(3):
        try:
            response = client.models.generate_content(
                model="models/gemini-2.5-flash",
                contents=prompt
            )
            text = response.text.strip()
            if text.startswith("```"):
                text = text.split("```")[1]
                if text.startswith("json"):
                    text = text[4:]
            return json.loads(text.strip())
        except Exception as e:
            last_error = e
            if "503" in str(e) or "UNAVAILABLE" in str(e):
                time.sleep(3)
            else:
                raise e
    raise last_error

def truncate(val, length=90):
    if val and isinstance(val, str) and len(val) > length:
        return val[:length]
    return val

def main():
    conn = psycopg2.connect(DATABASE_URL)
    conn.autocommit = True
    cur = conn.cursor()

    cur.execute("""
        SELECT m.id, m.medicine_name, m.brand_name, m.generic_name, m.drug_class, m.composition
        FROM medicines m
        LEFT JOIN medicine_leaflets ml ON ml.medicine_id = m.id
        WHERE ml.id IS NULL
    """)
    medicines = cur.fetchall()
    print(f"Found {len(medicines)} medicines without leaflets")

    success = 0
    failed = 0

    for i, (med_id, name, brand, generic, drug_class, composition) in enumerate(medicines):
        try:
            leaflet = generate_leaflet(name, brand or '', generic or '', drug_class or '', composition or '')

            cur.execute("""
                INSERT INTO medicine_leaflets (
                    id, medicine_id, indications, contraindications,
                    dosage_adult, dosage_child, dosage_elderly,
                    side_effects_common, side_effects_serious,
                    drug_interactions, food_interactions, warnings,
                    overdose_info, pregnancy_category, breastfeeding_safe,
                    mechanism_of_action, onset_of_action, duration_of_action
                ) VALUES (
                    %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s
                )
            """, (
                str(uuid_lib.uuid4()),
                str(med_id),
                leaflet.get('indications'),
                leaflet.get('contraindications'),
                leaflet.get('dosage_adult'),
                leaflet.get('dosage_child'),
                leaflet.get('dosage_elderly'),
                leaflet.get('side_effects_common', []),
                leaflet.get('side_effects_serious', []),
                leaflet.get('drug_interactions'),
                leaflet.get('food_interactions'),
                leaflet.get('warnings'),
                leaflet.get('overdose_info'),
                truncate(leaflet.get('pregnancy_category'), 5),
                leaflet.get('breastfeeding_safe'),
                leaflet.get('mechanism_of_action'),
                truncate(leaflet.get('onset_of_action'), 90),
                truncate(leaflet.get('duration_of_action'), 90)
            ))

            success += 1

            if (i + 1) % 10 == 0:
                print(f"✅ Progress: {i+1}/{len(medicines)} done")

            time.sleep(0.5)

        except Exception as e:
            print(f"❌ Failed for {name}: {e}")
            failed += 1
            time.sleep(2)
            continue

    cur.close()
    conn.close()
    print(f"\n✅ Done! {success} leaflets generated, {failed} failed")

if __name__ == "__main__":
    main()