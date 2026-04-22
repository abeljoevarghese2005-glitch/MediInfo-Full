import os
import time
import psycopg2
from google import genai
from dotenv import load_dotenv

load_dotenv(override=False)

DATABASE_URL = os.getenv("DATABASE_URL")
GEMINI_API_KEY = os.getenv("GEMINI_API_KEY")

print("DATABASE_URL:", DATABASE_URL)
print("GEMINI_API_KEY:", GEMINI_API_KEY[:20] if GEMINI_API_KEY else "NOT SET")

client = genai.Client(api_key=GEMINI_API_KEY)

def get_embedding(text: str) -> list[float]:
    response = client.models.embed_content(
        model="gemini-embedding-001",
        contents=text
    )
    return response.embeddings[0].values

def main():
    print("Connecting to DB...")
    conn = psycopg2.connect(DATABASE_URL)
    conn.autocommit = True
    cur = conn.cursor()
    print("Connected!")

    cur.execute("""
        SELECT id, medicine_name, brand_name, generic_name, drug_class, composition
        FROM medicines
        WHERE embedding_vector IS NULL
    """)
    medicines = cur.fetchall()
    print(f"Found {len(medicines)} medicines without embeddings")

    success = 0
    failed = 0

    for i, (med_id, name, brand, generic, drug_class, composition) in enumerate(medicines):
        try:
            text = f"""
Medicine: {name}
Brand: {brand}
Generic: {generic}
Drug Class: {drug_class or ''}
Composition: {composition or ''}
""".strip()

            embedding = get_embedding(text)

            cur.execute(
                "UPDATE medicines SET embedding_vector = %s::vector WHERE id = %s",
                (str(embedding), str(med_id))
            )

            if (i + 1) % 10 == 0:
                print(f"✅ Progress: {i+1}/{len(medicines)} done")

            success += 1
            time.sleep(0.1)

        except Exception as e:
            print(f"❌ Failed for {name}: {e}")
            failed += 1
            time.sleep(1)
            continue

    cur.close()
    conn.close()
    print(f"\n✅ Done! {success} embeddings generated, {failed} failed")

if __name__ == "__main__":
    main()