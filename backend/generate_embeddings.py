"""
generate_embeddings.py  —  MediInfo improved embedding pipeline

What changed vs the original
──────────────────────────────────────────────────────────────────────────────
1. Rich embedding text
   Old: 5 surface fields (name, brand, generic, drug_class, composition)
   New: joins medicine_leaflets and adds indications, mechanism_of_action,
        side_effects_common/serious, warnings, contraindications so that
        clinical queries like "safe in pregnancy" or "what reduces inflammation"
        actually hit the right medicines.

2. Task-type hint
   Gemini embedding-001 supports a "task_type" parameter.
   We use RETRIEVAL_DOCUMENT for the stored embeddings so the model optimises
   the vector for being retrieved, not for doing the searching.
   The query side should use RETRIEVAL_QUERY (already set in ai.py helper).

3. Incremental + force-refresh modes
   --force flag re-embeds every row, not just NULLs, so you can re-run after
   changing the text template without manually nulling the column.

4. Batch progress checkpointing
   Commits every COMMIT_EVERY rows so a crash mid-run doesn't lose all work.

5. Token-length guard
   Embedding models have input limits (~2048 tokens for gemini-embedding-001).
   We truncate the assembled text to MAX_CHARS characters before calling the
   API to avoid silent truncation or errors on very long leaflets.

Usage
──────────────────────────────────────────────────────────────────────────────
    python generate_embeddings.py            # only rows with NULL embedding
    python generate_embeddings.py --force    # re-embed everything
"""

import os
import time
import argparse
import psycopg2
from google import genai
from dotenv import load_dotenv

load_dotenv(override=False)

DATABASE_URL   = os.getenv("DATABASE_URL")
GEMINI_API_KEY = os.getenv("GEMINI_API_KEY")

MAX_CHARS    = 6000   # ~1500 tokens — safe for gemini-embedding-001's 2048-token limit
COMMIT_EVERY = 25     # checkpoint frequency
RATE_SLEEP   = 0.12   # seconds between API calls (~8 req/s, well under free-tier 1500/min)

print("DATABASE_URL:", DATABASE_URL)
print("GEMINI_API_KEY:", GEMINI_API_KEY[:20] if GEMINI_API_KEY else "NOT SET")

client = genai.Client(api_key=GEMINI_API_KEY)


# ── embedding helper ──────────────────────────────────────────────────────────

def get_embedding(text: str, task_type: str = "RETRIEVAL_DOCUMENT") -> list[float]:
    """
    task_type options:
      RETRIEVAL_DOCUMENT  — use when storing; optimised to be retrieved
      RETRIEVAL_QUERY     — use at query time in ai.py
      SEMANTIC_SIMILARITY — for similarity comparisons (compare endpoint)
    """
    response = client.models.embed_content(
        model="gemini-embedding-001",
        contents=text,
        config={"task_type": task_type},
    )
    return response.embeddings[0].values


# ── text assembly ─────────────────────────────────────────────────────────────

def build_embedding_text(row: dict) -> str:
    """
    Assembles a rich, human-readable document from medicine + leaflet fields.

    Sections are ordered from most-identifying (name) to most-clinical (warnings)
    so that even a truncated document still contains the core identity fields.

    Only non-empty fields are included so NULL/empty DB values don't produce
    noise like "Indications: None".
    """

    def fmt(label: str, value) -> str:
        """Return 'Label: value\\n' or '' when value is empty/None."""
        if value is None:
            return ""
        if isinstance(value, list):
            value = ", ".join(v for v in value if v)
        value = str(value).strip()
        return f"{label}: {value}\n" if value else ""

    parts = []

    # ── identity ──────────────────────────────────────────────────────────────
    parts.append(fmt("Medicine",    row["medicine_name"]))
    parts.append(fmt("Brand",       row["brand_name"]))
    parts.append(fmt("Generic",     row["generic_name"]))
    parts.append(fmt("Drug Class",  row["drug_class"]))
    parts.append(fmt("Composition", row["composition"]))

    # ── clinical (from leaflet join — may all be None if no leaflet) ──────────
    parts.append(fmt("Indications",         row.get("indications")))
    parts.append(fmt("Mechanism of Action", row.get("mechanism_of_action")))
    parts.append(fmt("Common Side Effects", row.get("side_effects_common")))
    parts.append(fmt("Serious Side Effects",row.get("side_effects_serious")))
    parts.append(fmt("Warnings",            row.get("warnings")))
    parts.append(fmt("Contraindications",   row.get("contraindications")))
    parts.append(fmt("Drug Interactions",   row.get("drug_interactions")))
    parts.append(fmt("Pregnancy Category",  row.get("pregnancy_category")))

    text = "".join(parts).strip()

    # Guard against exceeding the model's input limit
    if len(text) > MAX_CHARS:
        text = text[:MAX_CHARS]

    return text


# ── main ──────────────────────────────────────────────────────────────────────

def main(force: bool = False):
    print("Connecting to DB...")
    conn = psycopg2.connect(DATABASE_URL)
    conn.autocommit = False          # we control commits for checkpointing
    cur = conn.cursor()
    print("Connected!\n")

    # Join medicine_leaflets so we get clinical fields in one query
    where_clause = "" if force else "WHERE m.embedding_vector IS NULL"

    cur.execute(f"""
        SELECT
            m.id,
            m.medicine_name,
            m.brand_name,
            m.generic_name,
            m.drug_class,
            m.composition,
            l.indications,
            l.mechanism_of_action,
            l.side_effects_common,
            l.side_effects_serious,
            l.warnings,
            l.contraindications,
            l.drug_interactions,
            l.pregnancy_category
        FROM medicines m
        LEFT JOIN medicine_leaflets l ON l.medicine_id = m.id
        {where_clause}
        ORDER BY m.created_at
    """)

    rows = cur.fetchall()
    columns = [desc[0] for desc in cur.description]
    print(f"Found {len(rows)} medicines to embed {'(force mode)' if force else '(NULL only)'}\n")

    success = 0
    failed  = 0
    skipped = 0   # rows where build_embedding_text returns empty string

    for i, raw_row in enumerate(rows):
        row = dict(zip(columns, raw_row))
        med_id = row["id"]
        name   = row["medicine_name"]

        try:
            text = build_embedding_text(row)

            if not text:
                print(f"⚠  Skipped {name} — no embeddable content")
                skipped += 1
                continue

            embedding = get_embedding(text, task_type="RETRIEVAL_DOCUMENT")

            cur.execute(
                "UPDATE medicines SET embedding_vector = %s::vector WHERE id = %s",
                (str(embedding), str(med_id))
            )

            success += 1

            # Checkpoint every COMMIT_EVERY rows
            if success % COMMIT_EVERY == 0:
                conn.commit()
                print(f"✅  {success}/{len(rows)} committed")

            time.sleep(RATE_SLEEP)

        except Exception as e:
            print(f"❌  Failed for {name}: {e}")
            failed += 1
            conn.rollback()
            time.sleep(1)
            continue

    conn.commit()   # final commit for remaining rows
    cur.close()
    conn.close()

    print(f"\n── Summary ──────────────────────────────")
    print(f"  Embedded : {success}")
    print(f"  Skipped  : {skipped}")
    print(f"  Failed   : {failed}")
    print(f"─────────────────────────────────────────")


if __name__ == "__main__":
    parser = argparse.ArgumentParser(description="Generate medicine embeddings")
    parser.add_argument(
        "--force",
        action="store_true",
        help="Re-embed all rows, not just those with NULL embedding_vector",
    )
    args = parser.parse_args()
    main(force=args.force)