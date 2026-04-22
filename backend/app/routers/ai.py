from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from sqlalchemy import text
from pydantic import BaseModel
from ..database import get_db
from ..models import Medicine, MedicineLeaflet
from google import genai
from dotenv import load_dotenv
import os

load_dotenv()

router = APIRouter()
client = genai.Client(api_key=os.getenv("GEMINI_API_KEY"))

class AIQuestion(BaseModel):
    question: str
    medicine_names: list[str] = []

def get_embedding(text_input: str) -> list[float]:
    response = client.models.embed_content(
        model="gemini-embedding-001",
        contents=text_input
    )
    return response.embeddings[0].values

def get_medicine_context(db: Session, medicine_names: list[str]) -> str:
    context = ""
    for name in medicine_names:
        medicine = db.query(Medicine).filter(
            Medicine.medicine_name.ilike(f"%{name}%") |
            Medicine.brand_name.ilike(f"%{name}%") |
            Medicine.generic_name.ilike(f"%{name}%")
        ).first()

        if medicine:
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
    return context

def rag_search(db: Session, question: str, top_k: int = 5) -> str:
    """Search medicines by vector similarity and return context"""
    try:
        # Generate embedding for the question
        question_embedding = get_embedding(question)
        embedding_str = str(question_embedding)

        # Vector similarity search using pgvector
        result = db.execute(text("""
            SELECT medicine_name, brand_name, generic_name, drug_class, composition,
                   1 - (embedding_vector <=> :embedding::vector) as similarity
            FROM medicines
            WHERE embedding_vector IS NOT NULL
            ORDER BY embedding_vector <=> :embedding::vector
            LIMIT :top_k
        """), {"embedding": embedding_str, "top_k": top_k})

        rows = result.fetchall()

        if not rows:
            return ""

        context = "RELEVANT MEDICINES FROM DATABASE:\n"
        for row in rows:
            context += f"""
Medicine: {row.medicine_name} ({row.brand_name})
Generic: {row.generic_name}
Drug Class: {row.drug_class or 'N/A'}
Composition: {row.composition or 'N/A'}
Similarity Score: {row.similarity:.2f}
---"""
        return context

    except Exception as e:
        print(f"RAG search error: {e}")
        return ""

@router.post("/ask")
def ask_ai(question: AIQuestion, db: Session = Depends(get_db)):
    try:
        context = ""

        # If specific medicines mentioned, use direct lookup first
        if question.medicine_names:
            context = get_medicine_context(db, question.medicine_names)

        # Always enhance with RAG search
        rag_context = rag_search(db, question.question, top_k=5)

        # Combine both contexts
        if rag_context and rag_context not in context:
            context = context + "\n" + rag_context if context else rag_context

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

        response = client.models.generate_content(
            model="models/gemini-2.5-flash",
            contents=prompt
        )
        return {
            "answer": response.text,
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
        context = get_medicine_context(db, [medicine1, medicine2])

        # Enhance with RAG if direct lookup missed anything
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

        response = client.models.generate_content(
            model="models/gemini-2.5-flash",
            contents=prompt
        )
        return {"comparison": response.text}

    except Exception as e:
        err = str(e)
        if "429" in err or "RESOURCE_EXHAUSTED" in err:
            raise HTTPException(
                status_code=503,
                detail="AI service is temporarily unavailable. Please try again later."
            )
        raise HTTPException(status_code=500, detail=f"AI error: {err}")