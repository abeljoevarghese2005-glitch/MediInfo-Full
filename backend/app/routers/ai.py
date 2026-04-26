from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from sqlalchemy import text
from pydantic import BaseModel
from collections import defaultdict
from ..database import get_db
from ..models import Medicine, MedicineLeaflet
from google import genai
from dotenv import load_dotenv
import os
import time as time_module
import uuid

load_dotenv()

router = APIRouter()
client = genai.Client(api_key=os.getenv("GEMINI_API_KEY"))

SIMILARITY_THRESHOLD = 0.55
MAX_HISTORY_TURNS    = 6      # pairs of (user, ai) messages to keep per session

# ── server-side session store ─────────────────────────────────────────────────
# Simple in-memory dict: session_id -> list of {"role": str, "text": str}
# Lives as long as the Railway container is running.
# On redeploy it resets — acceptable for a chat session.
_sessions: dict[str, list[dict]] = defaultdict(list)


# ── schema ────────────────────────────────────────────────────────────────────

class AIQuestion(BaseModel):
    question: str
    medicine_names: list[str] = []
    session_id: str = ""          # frontend sends this; we generate one if missing


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


# ── hybrid search with RRF ────────────────────────────────────────────────────

def hybrid_rag_search(db: Session, question: str, top_k: int = 5, exclude_ids: set = None) -> str:
    exclude_ids = exclude_ids or set()
    fetch_k = top_k * 3
    RRF_K = 60

    try:
        question_embedding = get_embedding(question)
        embedding_str = str(question_embedding)

        vector_rows = db.execute(text("""
            SELECT
                m.id, m.medicine_name, m.brand_name, m.generic_name,
                m.drug_class, m.composition,
                l.indications, l.mechanism_of_action,
                l.side_effects_common, l.side_effects_serious,
                l.warnings, l.contraindications,
                1 - (m.embedding_vector <=> CAST(:embedding AS vector)) AS similarity
            FROM medicines m
            LEFT JOIN medicine_leaflets l ON l.medicine_id = m.id
            WHERE m.embedding_vector IS NOT NULL
            ORDER BY m.embedding_vector <=> CAST(:embedding AS vector)
            LIMIT :fetch_k
        """), {"embedding": embedding_str, "fetch_k": fetch_k}).fetchall()

        keyword_rows = db.execute(text("""
            SELECT
                m.id, m.medicine_name, m.brand_name, m.generic_name,
                m.drug_class, m.composition,
                l.indications, l.mechanism_of_action,
                l.side_effects_common, l.side_effects_serious,
                l.warnings, l.contraindications,
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


# ── session helpers ───────────────────────────────────────────────────────────

def get_session_history(session_id: str) -> list[dict]:
    """Return last MAX_HISTORY_TURNS * 2 messages for this session."""
    return _sessions[session_id][-(MAX_HISTORY_TURNS * 2):]


def save_to_session(session_id: str, role: str, text: str):
    _sessions[session_id].append({"role": role, "text": text})
    # Trim to avoid unbounded growth — keep last 20 messages per session
    if len(_sessions[session_id]) > 20:
        _sessions[session_id] = _sessions[session_id][-20:]


def format_history(history: list[dict]) -> str:
    lines = []
    for msg in history:
        label = "User" if msg["role"] == "user" else "MediInfo AI"
        lines.append(f"{label}: {msg['text']}")
    return "\n".join(lines)


def extract_medicines_from_history(history: list[dict]) -> list[str]:
    """
    Scan recent history for capitalised words that look like medicine names.
    Used to anchor follow-up questions to the right medicine.
    """
    common_words = {
        "what", "which", "how", "does", "is", "are", "can", "its", "it",
        "the", "a", "an", "and", "or", "of", "for", "in", "to", "that",
        "this", "with", "about", "safe", "during", "pregnancy", "dosage",
        "side", "effects", "interactions", "warnings", "me", "tell", "give",
        "please", "should", "i", "take", "use", "used", "also", "here",
        "some", "information", "based", "provided", "always", "consult",
        "doctor", "before", "taking", "medicine", "medicines", "common",
        "serious", "drug", "class", "brand", "generic", "indian", "users",
        "remember", "general", "understanding", "note", "however", "these",
        "those", "they", "them", "their", "important", "please", "following",
        "certain", "your", "you", "have", "been", "will", "not", "only",
        "also", "both", "very", "more", "most", "such", "than", "then",
    }
    found = []
    for msg in reversed(history[-6:]):
        for word in msg["text"].split():
            clean = word.strip("?.,!:;()*/\n*#-")
            if (
                len(clean) > 3
                and clean[0].isupper()
                and not clean.isupper()
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
        # Ensure we have a session_id — generate one if frontend didn't send it
        session_id = question.session_id or str(uuid.uuid4())

        # Load this session's history from server memory
        history = get_session_history(session_id)

        # 1. Exact name match from explicitly provided medicine names
        exact_context, seen_ids = get_medicine_context(db, question.medicine_names)

        # 2. Extract medicines from server-side history for follow-up resolution
        history_medicines = extract_medicines_from_history(history)

        if history_medicines:
            extra_context, extra_ids = get_medicine_context(db, history_medicines)
            for mid in extra_ids:
                if mid not in seen_ids:
                    seen_ids.add(mid)
            if extra_context and extra_context not in exact_context:
                exact_context += extra_context

        # 3. Hybrid search — prepend history medicine to query if it's a follow-up
        search_query = question.question
        if history_medicines and not question.medicine_names:
            search_query = f"{history_medicines[0]} {question.question}"

        rag_context = hybrid_rag_search(db, search_query, top_k=5, exclude_ids=seen_ids)

        # 4. Assemble context
        context_parts = []
        if exact_context:
            context_parts.append("EXACT MATCH DATA:\n" + exact_context)
        if rag_context:
            context_parts.append(rag_context)
        context = "\n\n".join(context_parts)

        # 5. Format history for the prompt
        history_block = format_history(history)
        history_section = f"""CONVERSATION HISTORY:
{history_block}

""" if history_block else ""

        # ── out-of-scope guard ────────────────────────────────────────────────
        # Catch clearly non-medical questions before hitting the LLM
        out_of_scope_keywords = [
            "cricket", "football", "movie", "film", "actor", "actress",
            "stock", "share price", "weather", "recipe", "cook", "sport",
            "politics", "election", "news", "celebrity", "song", "music",
            "game", "travel", "hotel", "flight", "visa",
        ]
        q_lower = question.question.lower()
        if any(kw in q_lower for kw in out_of_scope_keywords) and not context:
            out_of_scope_answer = (
                "I'm MediInfo AI and I can only help with medicine and health-related questions. "
                "Please ask me about medicines, dosages, side effects, drug interactions, or similar topics."
            )
            save_to_session(session_id, "user", question.question)
            save_to_session(session_id, "ai", out_of_scope_answer)
            return {
                "answer": out_of_scope_answer,
                "medicines_used": [],
                "session_id": session_id,
            }

        # ── build prompt ──────────────────────────────────────────────────────
        # Determine language instruction
        has_hindi = any("\u0900" <= c <= "\u097F" for c in question.question)
        language_instruction = "Respond in Hindi." if has_hindi else "Respond in English."

        # Confidence level based on how much context we found
        if exact_context and rag_context:
            confidence_note = "HIGH confidence — answering from matched database records."
        elif exact_context or rag_context:
            confidence_note = "MEDIUM confidence — answering from partially matched records."
        else:
            confidence_note = "LOW confidence — no matching records found; using general knowledge."

        prompt = f"""You are MediInfo AI, a knowledgeable and friendly medical assistant for Indian users.
You speak like a helpful pharmacist — clear, warm, and trustworthy.

LANGUAGE RULES (most important rule):
- Detect the language and script the user is writing in and reply in the EXACT same style.
- If the user writes in English → reply in English.
- If the user writes in Hindi (Devanagari script) → reply in Hindi.
- If the user writes in Hinglish (Hindi words typed in English letters, e.g. "dolo ke side effects kya hai") → reply in Hinglish in the same casual style.
- If the user writes in any other language (Tamil, Telugu, Marathi, Bengali, etc.) → reply in that language.
- NEVER switch languages unless the user switches first.
- Match the user's exact tone — casual stays casual, formal stays formal.

YOUR PERSONALITY:
- Friendly and reassuring, never clinical or robotic
- Speak directly to the user, not about them
- Never say "based on the provided data", "my database", "the records show",
  "based on the information available", or any phrase that reveals you are
  reading from a database. Just answer naturally and confidently.
- If you are unsure, say "I don't have specific information on that" — do not mention databases.

STRICT RULES:
1. SCOPE: Only answer medicine and health-related questions. If the question is
   clearly unrelated (cricket, movies, cooking, weather, finance, politics),
   say: "I'm here to help with medicine and health questions only. Feel free
   to ask me about any medicine, dosage, side effects, or interactions!"

2. CITATIONS: Always name the medicine when stating a fact about it.
   e.g. "Ibuprofen should be avoided in the third trimester..."
   Never say "this medicine" or "the medicine" without naming it.

3. FOLLOW-UPS: When the question uses "it", "its", "that", or refers back to
   something without naming it, use the CONVERSATION HISTORY to identify
   the medicine and answer specifically about it.

4. DOCTOR DISCLAIMER — use sparingly and only when genuinely needed:
   - ADD "consult your doctor" ONLY for: pregnancy questions, overdose,
     serious drug interactions, or when recommending a prescription medicine.
   - DO NOT add it for routine questions like side effects, dosage info,
     mechanism of action, or general medicine information.
   - Never repeat the disclaimer more than once per response.

5. SAFETY:
   - For drug interactions: clearly warn about dangers
   - For overdose questions: emphasize seeking emergency help immediately
   - For pregnancy questions: be extra cautious and specific

6. FORMAT:
   - Use **bold** for medicine names and section headings
   - Keep responses concise — no unnecessary repetition
   - Use bullet points for lists of side effects or interactions
   - For dosage questions, present adult/child doses separately if available

7. TONE CALIBRATION: {confidence_note.replace("HIGH confidence — answering from matched database records.", "You have detailed information — be specific and confident.").replace("MEDIUM confidence — answering from partially matched records.", "You have some information — be helpful but suggest confirming with a doctor.").replace("LOW confidence — no matching records found; using general knowledge.", "You don't have specific information — answer from general medical knowledge and recommend a doctor.")}

MEDICINE INFORMATION:
{context if context else "No specific medicine information available for this query."}

{history_section}USER: {question.question}

MediInfo AI:"""

        answer = gemini_generate(prompt)

        # Save this turn to server-side session history
        save_to_session(session_id, "user", question.question)
        save_to_session(session_id, "ai", answer)

        return {
            "answer": answer,
            "medicines_used": question.medicine_names,
            "session_id": session_id,
            "confidence": (
                "high" if exact_context and rag_context else
                "medium" if exact_context or rag_context else
                "low"
            ),
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
def compare_medicines(medicine1: str, medicine2: str, db: Session = Depends(get_db)):
    try:
        context, seen_ids = get_medicine_context(db, [medicine1, medicine2])

        if not context:
            rag1 = hybrid_rag_search(db, medicine1, top_k=2)
            rag2 = hybrid_rag_search(db, medicine2, top_k=2)
            context = rag1 + "\n" + rag2

        prompt = f"""You are MediInfo AI, a knowledgeable and friendly medical assistant for Indian users.
Always respond in English. Speak like a helpful pharmacist — clear, warm, and direct.

Never say "based on the provided data", "my database", or any phrase that reveals
you are reading from records. Just answer naturally and confidently.

MEDICINE INFORMATION:
{context}

Compare {medicine1} and {medicine2} covering:
1. **Main uses** — what each is used for and key differences
2. **Side effects** — common and serious for each
3. **Which to prefer** — situations where one is better than the other
4. **Drug interactions** — key interactions to watch for each
5. **Warnings** — pregnancy, kidney/liver concerns, age restrictions

Use **bold** for medicine names and headings. Keep it clear and easy to understand.
End with: Always consult your doctor before switching or starting any medicine."""

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