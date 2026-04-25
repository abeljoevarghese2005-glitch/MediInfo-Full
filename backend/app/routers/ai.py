from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from sqlalchemy import text
from pydantic import BaseModel
from typing import Optional
from ..database import get_db
from ..models import Medicine, MedicineLeaflet
from google import genai
from dotenv import load_dotenv
import os
import time as time_module

load_dotenv()

router = APIRouter()
client = genai.Client(api_key=os.getenv("GEMINI_API_KEY"))

SIMILARITY_THRESHOLD = 0.55   # minimum cosine similarity to include a result
MAX_HISTORY_TURNS    = 6      # number of past user+ai pairs to include in prompt


# ── schema ────────────────────────────────────────────────────────────────────

class ChatMessage(BaseModel):
    role: str   # "user" or "ai"
    text: str

class AIQuestion(BaseModel):
    question: str
    medicine_names: list[str] = []
    chat_history: list[ChatMessage] = []   # NEW — frontend passes last N turns


# ── embedding ─────────────────────────────────────────────────────────────────

def get_embedding(text_input: str) -> list[float]:
    response = client.models.embed_content(
        model="gemini-embedding-001",
        contents=text_input,
        config={"task_type": "RETRIEVAL_QUERY"},
    )
    return response.embeddings[0].values


# ── exact / fuzzy name lookup ─────────────────────────────────────────────────

def get_medicine_context(db: Session, medicine_names: list[str]) -> tuple[str, set]:
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
            context += f"""Indications: {leaflet.indications}
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


# ── hybrid search with RRF reranking ─────────────────────────────────────────

def hybrid_rag_search(
    db: Session,
    question: str,
    top_k: int = 5,
    exclude_ids: set = None,
) -> str:
    """
    Combines two retrieval strategies merged with Reciprocal Rank Fusion (RRF).

    Strategy 1 — Vector search (semantic)
      Converts the question to an embedding and finds closest medicine vectors
      by cosine similarity. Good at: symptom/indication queries, mechanism
      questions, clinical intent. Bad at: exact drug name spelling matches.

    Strategy 2 — Keyword search (pg_trgm trigram similarity)
      Scores every medicine by how closely its name/brand/generic/drug_class
      matches the raw question text. Good at: exact or near-exact drug names,
      brand name look-ups. Bad at: paraphrased or symptom-based queries.

    RRF merging:
      Each strategy produces a ranked list. RRF turns ranks into scores:
          score = 1 / (rank + K)   where K=60 (standard constant)
      Scores from both lists are summed per medicine, then re-sorted.
      A medicine ranking high in both lists beats one appearing in only one.
    """
    exclude_ids = exclude_ids or set()
    fetch_k = top_k * 3
    RRF_K = 60

    try:
        # ── 1. vector search ──────────────────────────────────────────────────
        question_embedding = get_embedding(question)
        embedding_str = str(question_embedding)

        vector_rows = db.execute(text("""
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
        """), {"embedding": embedding_str, "fetch_k": fetch_k}).fetchall()

        # ── 2. keyword search (pg_trgm) ───────────────────────────────────────
        keyword_rows = db.execute(text("""
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
                GREATEST(
                    similarity(LOWER(m.medicine_name), LOWER(:q)),
                    similarity(LOWER(m.brand_name),    LOWER(:q)),
                    similarity(LOWER(m.generic_name),  LOWER(:q)),
                    similarity(LOWER(COALESCE(m.drug_class,  '')), LOWER(:q)),
                    similarity(LOWER(COALESCE(m.composition, '')), LOWER(:q))
                ) AS kw_score
            FROM medicines m
            LEFT JOIN medicine_leaflets l ON l.medicine_id = m.id
            WHERE
                similarity(LOWER(m.medicine_name), LOWER(:q)) > 0.1
                OR similarity(LOWER(m.brand_name),   LOWER(:q)) > 0.1
                OR similarity(LOWER(m.generic_name), LOWER(:q)) > 0.1
            ORDER BY kw_score DESC
            LIMIT :fetch_k
        """), {"q": question, "fetch_k": fetch_k}).fetchall()

        # ── 3. RRF fusion ─────────────────────────────────────────────────────
        all_rows: dict = {}
        rrf_scores: dict = {}

        for rank, row in enumerate(vector_rows):
            rid = str(row.id)
            all_rows[rid] = row
            rrf_scores[rid] = rrf_scores.get(rid, 0) + 1 / (rank + RRF_K)

        for rank, row in enumerate(keyword_rows):
            rid = str(row.id)
            if rid not in all_rows:
                all_rows[rid] = row
            rrf_scores[rid] = rrf_scores.get(rid, 0) + 1 / (rank + RRF_K)

        ranked_ids = sorted(rrf_scores, key=lambda x: rrf_scores[x], reverse=True)

        # ── 4. filter & build context ─────────────────────────────────────────
        kept = []
        for rid in ranked_ids:
            if rid in {str(eid) for eid in exclude_ids}:
                continue
            row = all_rows[rid]
            sim = getattr(row, "similarity", None)
            if sim is not None and sim < SIMILARITY_THRESHOLD:
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
---"""

        return context

    except Exception as e:
        print(f"Hybrid RAG search error: {e}")
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


# ── history helpers ───────────────────────────────────────────────────────────

def format_history(chat_history: list[ChatMessage]) -> str:
    if not chat_history:
        return ""
    recent = chat_history[-(MAX_HISTORY_TURNS * 2):]
    lines = []
    for msg in recent:
        label = "User" if msg.role == "user" else "MediInfo AI"
        lines.append(f"{label}: {msg.text}")
    return "\n".join(lines)


def extract_last_medicines(chat_history: list[ChatMessage]) -> list[str]:
    """
    Scans recent messages (both user AND ai) backwards to find medicine names.

    Key insight: when a user asks "What are the side effects of Ibuprofen?"
    and then "Is it safe during pregnancy?", the word "Ibuprofen" only appears
    in the FIRST user message and the AI's response — NOT in the follow-up.
    So we must scan all messages, not just user ones.

    We scan backwards through the last 6 messages and collect capitalised
    words that are likely medicine names (not common English words).
    """
    common_words = {
        "what", "which", "how", "does", "is", "are", "can", "its", "it",
        "the", "a", "an", "and", "or", "of", "for", "in", "to", "that",
        "this", "with", "about", "safe", "during", "pregnancy", "dosage",
        "side", "effects", "interactions", "warnings", "me", "tell", "give",
        "please", "what's", "should", "i", "take", "use", "used", "also",
        "here", "some", "information", "based", "provided", "always",
        "consult", "doctor", "before", "taking", "medicine", "medicines",
        "common", "serious", "drug", "class", "brand", "generic", "indian",
        "users", "please", "remember", "general", "understanding", "note",
        "however", "also", "these", "those", "they", "them", "their",
        "brufen", # brand names that shouldn't override the generic search
    }
    found = []
    # Scan last 6 messages (3 turns) in reverse
    recent = chat_history[-6:]
    for msg in reversed(recent):
        words = msg.text.split()
        for word in words:
            clean = word.strip("?.,!:;()*/\n")
            if (
                len(clean) > 3
                and clean[0].isupper()
                and not clean.isupper()          # skip ALL-CAPS acronyms
                and clean.lower() not in common_words
                and clean not in found
            ):
                found.append(clean)
        if len(found) >= 2:
            break
    return found[:2]


# ── routes ────────────────────────────────────────────────────────────────────

@router.post("/ask")
def ask_ai(question: AIQuestion, db: Session = Depends(get_db)):
    try:
        # 1. Exact name match from explicitly provided medicine names
        exact_context, seen_ids = get_medicine_context(db, question.medicine_names)

        # 2. If current question looks like a follow-up (short, no medicine name
        #    mentioned), extract medicines from history and fetch their context too
        q_lower = question.question.lower()
        q_words = set(q_lower.replace("?", "").replace(".", "").split())
        followup_indicators = {"it", "its", "that", "this"}
        is_followup = (
            not question.medicine_names
            and question.chat_history
            and (
                bool(q_words & followup_indicators)
                or len(question.question.split()) < 6
            )
        )

        if is_followup and question.chat_history:
            history_medicines = extract_last_medicines(question.chat_history)
            if history_medicines:
                extra_context, extra_ids = get_medicine_context(db, history_medicines)
                exact_context += extra_context
                seen_ids |= extra_ids

        # 3. Hybrid semantic + keyword search (skip already-fetched medicines)
        #    For follow-ups, search using the resolved medicine name, not the
        #    vague pronoun-filled question
        search_query = question.question
        if is_followup and question.chat_history:
            resolved = extract_last_medicines(question.chat_history)
            if resolved:
                search_query = f"{resolved[0]} {question.question}"

        rag_context = hybrid_rag_search(
            db,
            search_query,
            top_k=5,
            exclude_ids=seen_ids,
        )

        # 4. Assemble context
        context_parts = []
        if exact_context:
            context_parts.append("EXACT MATCH DATA:\n" + exact_context)
        if rag_context:
            context_parts.append(rag_context)
        context = "\n\n".join(context_parts)

        # 5. Format conversation history for the prompt
        history_block = format_history(question.chat_history)
        history_section = f"""CONVERSATION HISTORY:
{history_block}

""" if history_block else ""

        prompt = f"""You are MediInfo AI, a helpful medical information assistant for Indian users.
You provide accurate, easy-to-understand medicine information based on the provided database.

IMPORTANT RULES:
- Answer based on the provided medicine data; use general knowledge only if no data is found
- Always recommend consulting a doctor for medical decisions
- Be clear, simple and helpful
- If asked about drug interactions, be very specific and warn about dangers
- CRITICAL: If the current question uses pronouns like "it", "its", "that medicine", or
  is a short follow-up with no medicine name, look at the CONVERSATION HISTORY to identify
  which medicine is being referred to and answer specifically about THAT medicine.
  Do NOT give a generic answer about multiple medicines when the user is clearly asking
  about a specific one from the conversation.
- ALWAYS respond in English unless the user's question contains Hindi/Devanagari script
- Keep answers concise but complete

MEDICINE DATABASE CONTEXT:
{context if context else "No specific medicine data found. Answer based on general knowledge but recommend consulting a doctor."}

{history_section}CURRENT QUESTION: {question.question}

Answer:"""

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
            rag1 = hybrid_rag_search(db, medicine1, top_k=2)
            rag2 = hybrid_rag_search(db, medicine2, top_k=2)
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