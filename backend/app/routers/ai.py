from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from sqlalchemy import text
from pydantic import BaseModel
from ..database import get_db
from ..models import Medicine, MedicineLeaflet
from google import genai
from dotenv import load_dotenv
import os
import time as time_module

load_dotenv()

router = APIRouter()
client = genai.Client(api_key=os.getenv("GEMINI_API_KEY"))

SIMILARITY_THRESHOLD = 0.60   # discard results below this score to reduce hallucination


class AIQuestion(BaseModel):
    question: str
    medicine_names: list[str] = []


# ── embedding helpers ─────────────────────────────────────────────────────────

def get_embedding(text_input: str) -> list[float]:
    """
    Uses RETRIEVAL_QUERY task type so the query vector is optimised to find
    stored RETRIEVAL_DOCUMENT vectors — matches what generate_embeddings.py
    now stores.  Previously both sides used the default (no task type), which
    is sub-optimal for asymmetric retrieval.
    """
    response = client.models.embed_content(
        model="gemini-embedding-001",
        contents=text_input,
        config={"task_type": "RETRIEVAL_QUERY"},
    )
    return response.embeddings[0].values


# ── context builders ──────────────────────────────────────────────────────────

def get_medicine_context(db: Session, medicine_names: list[str]) -> tuple[str, set]:
    """
    Returns (context_string, set_of_medicine_ids_already_included).
    The id set lets rag_search skip duplicates.
    """
    context = ""
    seen_ids: set = set()

    for name in medicine_names:
        medicine = db.query(Medicine).filter(
            Medicine.medicine_name.ilike(f"%{name}%") |
            Medicine.brand_name.ilike(f"%{name}%") |
            Medicine.generic_name.ilike(f"%{name}%")
        ).first()

        if not medicine or medicine.id in seen_ids:
            continue

        seen_ids.add(medicine.id)

        leaflet = db.query(MedicineLeaflet).filter(
            MedicineLeaflet.medicine_id == medicine.id
        ).first()

        context += f"""
MEDICINE: {medicine.medicine_name} ({medicine.brand_name})
Generic Name: {medicine.generic_name}
Drug Class: {medicine.drug_class}
Manufacturer: {medicine.manufacturer}
"""
        if leaflet:
            context += f"""
Indications: {leaflet.indications}
Dosage (Adult): {leaflet.dosage_adult}
Dosage (Child): {leaflet.dosage_child}
Dosage (Elderly): {leaflet.dosage_elderly}
Side Effects (Common): {', '.join(leaflet.side_effects_common or [])}
Side Effects (Serious): {', '.join(leaflet.side_effects_serious or [])}
Drug Interactions: {leaflet.drug_interactions}
Food Interactions: {leaflet.food_interactions}
Warnings: {leaflet.warnings}
Contraindications: {leaflet.contraindications}
Overdose Info: {leaflet.overdose_info}
Pregnancy Category: {leaflet.pregnancy_category}
Breastfeeding Safe: {leaflet.breastfeeding_safe}
Mechanism of Action: {leaflet.mechanism_of_action}
---
"""
    return context, seen_ids


def rag_search(db: Session, question: str, top_k: int = 5, exclude_ids: set = None) -> str:
    """
    Semantic search over medicines.

    Changes vs original:
    ─────────────────────────────────────────────────────────────────────────
    1. Uses RETRIEVAL_QUERY task type (via get_embedding) so query vectors
       align with the RETRIEVAL_DOCUMENT vectors stored by generate_embeddings.

    2. Joins medicine_leaflets to return clinical fields (indications,
       mechanism_of_action, side_effects) in the RAG context block — not just
       the 5 surface fields the original returned.

    3. exclude_ids: skips medicines already fetched by get_medicine_context
       to avoid duplicate context blocks in the final prompt.

    4. SIMILARITY_THRESHOLD: drops results below 0.60 cosine similarity so
       the LLM never sees vaguely-related medicines that could cause it to
       hallucinate a connection.
    """
    exclude_ids = exclude_ids or set()

    try:
        question_embedding = get_embedding(question)
        embedding_str = str(question_embedding)

        # Fetch top_k + len(exclude_ids) so we still get top_k after filtering
        fetch_k = top_k + len(exclude_ids)

        result = db.execute(text("""
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
                1 - (m.embedding_vector <=> CAST(:embedding AS vector)) AS similarity
            FROM medicines m
            LEFT JOIN medicine_leaflets l ON l.medicine_id = m.id
            WHERE m.embedding_vector IS NOT NULL
            ORDER BY m.embedding_vector <=> CAST(:embedding AS vector)
            LIMIT :fetch_k
        """), {"embedding": embedding_str, "fetch_k": fetch_k})

        rows = result.fetchall()

        if not rows:
            return ""

        kept = []
        for row in rows:
            # Skip already-included medicines
            if row.id in exclude_ids:
                continue
            # Skip low-confidence results
            if row.similarity < SIMILARITY_THRESHOLD:
                continue
            kept.append(row)
            if len(kept) >= top_k:
                break

        if not kept:
            return ""

        context = "SEMANTICALLY RELATED MEDICINES:\n"
        for row in kept:
            side_common  = ", ".join(row.side_effects_common  or []) or "N/A"
            side_serious = ", ".join(row.side_effects_serious or []) or "N/A"

            context += f"""
Medicine: {row.medicine_name} ({row.brand_name})
Generic: {row.generic_name}
Drug Class: {row.drug_class or 'N/A'}
Composition: {row.composition or 'N/A'}
Indications: {row.indications or 'N/A'}
Mechanism: {row.mechanism_of_action or 'N/A'}
Common Side Effects: {side_common}
Serious Side Effects: {side_serious}
Warnings: {row.warnings or 'N/A'}
Contraindications: {row.contraindications or 'N/A'}
Similarity: {row.similarity:.2f}
---"""

        return context

    except Exception as e:
        print(f"RAG search error: {e}")
        return ""


# ── LLM call ──────────────────────────────────────────────────────────────────

def gemini_generate(prompt: str) -> str:
    last_error = None
    for attempt in range(3):
        try:
            response = client.models.generate_content(
                model="models/gemini-2.5-flash",
                contents=prompt
            )
            return response.text
        except Exception as retry_err:
            last_error = retry_err
            if attempt < 2:
                time_module.sleep(2)
    raise last_error


# ── routes ────────────────────────────────────────────────────────────────────

@router.post("/ask")
def ask_ai(question: AIQuestion, db: Session = Depends(get_db)):
    try:
        # 1. Exact / fuzzy name match (highest priority)
        exact_context, seen_ids = get_medicine_context(db, question.medicine_names)

        # 2. Semantic search — skips what was already fetched above
        rag_context = rag_search(
            db,
            question.question,
            top_k=5,
            exclude_ids=seen_ids,
        )

        # 3. Assemble context with clear section headers
        context_parts = []
        if exact_context:
            context_parts.append("EXACT MATCH DATA:\n" + exact_context)
        if rag_context:
            context_parts.append(rag_context)

        context = "\n\n".join(context_parts)

        prompt = f"""You are MediInfo AI, a helpful medical information assistant for Indian users.
You provide accurate, easy-to-understand medicine information based on the provided database.

IMPORTANT RULES:
- Only answer based on the provided medicine data
- Always recommend consulting a doctor for medical decisions
- Be clear, simple and helpful
- If asked about drug interactions, be very specific and warn about dangers
- ALWAYS respond in English unless the user's question contains Hindi/Devanagari script
- If the question is written in English, respond in English only
- If the question contains Hindi or Devanagari script, respond in Hindi
- Keep answers concise but complete

MEDICINE DATABASE CONTEXT:
{context if context else "No specific medicine data found. Answer based on general knowledge but recommend consulting a doctor."}

USER QUESTION: {question.question}

Please provide a helpful, accurate answer in the same language as the question above:"""

        answer = gemini_generate(prompt)
        return {
            "answer": answer,
            "medicines_used": question.medicine_names
        }

    except Exception as e:
        err = str(e)
        if "429" in err or "RESOURCE_EXHAUSTED" in err:
            raise HTTPException(
                status_code=503,
                detail="AI service is temporarily unavailable. Please try again later."
            )
        raise HTTPException(status_code=500, detail=f"AI error: {err}")


@router.post("/compare")
def compare_medicines(
    medicine1: str,
    medicine2: str,
    db: Session = Depends(get_db)
):
    try:
        context, seen_ids = get_medicine_context(db, [medicine1, medicine2])

        if not context:
            rag1 = rag_search(db, medicine1, top_k=2)
            rag2 = rag_search(db, medicine2, top_k=2)
            context = rag1 + "\n" + rag2

        prompt = f"""You are MediInfo AI. Compare these two medicines clearly and helpfully.
Always respond in English.

MEDICINE DATA:
{context}

Please compare {medicine1} and {medicine2} covering:
1. Main uses and differences
2. Side effect comparison
3. Which is safer/preferred in what situations
4. Drug interactions of each
5. Key warnings

Keep it clear and easy to understand for a regular person."""

        comparison = gemini_generate(prompt)
        return {"comparison": comparison}

    except Exception as e:
        err = str(e)
        if "429" in err or "RESOURCE_EXHAUSTED" in err:
            raise HTTPException(
                status_code=503,
                detail="AI service is temporarily unavailable. Please try again later."
            )
        raise HTTPException(status_code=500, detail=f"AI error: {err}")