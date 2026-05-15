import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

const SIMILARITY_THRESHOLD = 0.55
const GEMINI_API_KEY = Deno.env.get('GEMINI_API_KEY') ?? ''

async function getEmbedding(text: string): Promise<number[]> {
  const res = await fetch(
    `https://generativelanguage.googleapis.com/v1beta/models/gemini-embedding-001:embedContent?key=${GEMINI_API_KEY}`,
    {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        model: 'models/gemini-embedding-001',
        content: { parts: [{ text }] },
        taskType: 'RETRIEVAL_QUERY',
      }),
    }
  )
  const data = await res.json()
  return data.embedding?.values ?? []
}

async function geminiGenerate(prompt: string): Promise<string> {
  const res = await fetch(
    `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${GEMINI_API_KEY}`,
    {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ contents: [{ parts: [{ text: prompt }] }] }),
    }
  )
  const data = await res.json()
  return data.candidates?.[0]?.content?.parts?.[0]?.text ?? 'Sorry, I could not generate a response.'
}

async function getMedicineContext(supabase: any, medicineNames: string[]): Promise<{ context: string, seenIds: Set<string> }> {
  let context = ''
  const seenIds = new Set<string>()

  for (const name of medicineNames) {
    const { data: medicines } = await supabase
      .from('medicines')
      .select('*, medicine_leaflets(*)')
      .or(`medicine_name.ilike.%${name}%,brand_name.ilike.%${name}%,generic_name.ilike.%${name}%`)
      .limit(1)

    if (!medicines || medicines.length === 0) continue
    const medicine = medicines[0]
    if (seenIds.has(medicine.id)) continue
    seenIds.add(medicine.id)

    const leaflet = medicine.medicine_leaflets?.[0]
    context += `\nMEDICINE: ${medicine.medicine_name} (${medicine.brand_name})\nGeneric Name: ${medicine.generic_name}\nDrug Class: ${medicine.drug_class}\nManufacturer: ${medicine.manufacturer}\n`
    if (leaflet) {
      context += `Indications: ${leaflet.indications}\nDosage (Adult): ${leaflet.dosage_adult}\nDosage (Child): ${leaflet.dosage_child}\nSide Effects (Common): ${(leaflet.side_effects_common || []).join(', ')}\nSide Effects (Serious): ${(leaflet.side_effects_serious || []).join(', ')}\nDrug Interactions: ${leaflet.drug_interactions}\nWarnings: ${leaflet.warnings}\nContraindications: ${leaflet.contraindications}\nPregnancy Category: ${leaflet.pregnancy_category}\nMechanism of Action: ${leaflet.mechanism_of_action}\n---\n`
    }
  }
  return { context, seenIds }
}

async function hybridRagSearch(supabase: any, question: string, topK: number, excludeIds: Set<string>): Promise<string> {
  try {
    const embedding = await getEmbedding(question)
    const embeddingStr = '[' + embedding.join(',') + ']'

    const { data: vectorRows } = await supabase.rpc('match_medicines_vector', {
      query_embedding: embeddingStr,
      match_count: topK * 3,
    })

    const { data: keywordRows } = await supabase
      .from('medicines')
      .select('id, medicine_name, brand_name, generic_name, drug_class, medicine_leaflets(indications, mechanism_of_action, side_effects_common, side_effects_serious, warnings, contraindications)')
      .or(`medicine_name.ilike.%${question}%,brand_name.ilike.%${question}%,generic_name.ilike.%${question}%`)
      .limit(topK * 3)

    const allRows: Record<string, any> = {}
    const rrfScores: Record<string, number> = {}
    const RRF_K = 60

    for (let rank = 0; rank < (vectorRows || []).length; rank++) {
      const row = vectorRows[rank]
      const rid = row.id
      if (row.similarity < SIMILARITY_THRESHOLD) continue
      allRows[rid] = row
      rrfScores[rid] = (rrfScores[rid] || 0) + 1 / (rank + RRF_K)
    }

    for (let rank = 0; rank < (keywordRows || []).length; rank++) {
      const row = keywordRows[rank]
      const rid = row.id
      if (!allRows[rid]) allRows[rid] = row
      rrfScores[rid] = (rrfScores[rid] || 0) + 1 / (rank + RRF_K)
    }

    const rankedIds = Object.keys(rrfScores).sort((a, b) => rrfScores[b] - rrfScores[a])
    const kept = []
    for (const rid of rankedIds) {
      if (excludeIds.has(rid)) continue
      kept.push(allRows[rid])
      if (kept.length >= topK) break
    }

    if (kept.length === 0) return ''

    let context = 'SEMANTICALLY RELATED MEDICINES:\n'
    for (const row of kept) {
      const leaflet = row.medicine_leaflets?.[0] || row
      context += `\nMedicine: ${row.medicine_name} (${row.brand_name})\nGeneric: ${row.generic_name}\nDrug Class: ${row.drug_class || 'N/A'}\nIndications: ${leaflet.indications || 'N/A'}\nCommon Side Effects: ${(leaflet.side_effects_common || []).join(', ') || 'N/A'}\nWarnings: ${leaflet.warnings || 'N/A'}\n---`
    }
    return context
  } catch (e) {
    console.error('RAG search error:', e)
    return ''
  }
}

function formatHistory(history: Array<{role: string, content?: string, text?: string}>): string {
  return history.map(m => {
    const label = m.role === 'user' ? 'User' : 'MediInfo AI'
    const text = m.content ?? m.text ?? ''
    return `${label}: ${text}`
  }).join('\n')
}

function extractMedicinesFromHistory(history: Array<{role: string, content?: string, text?: string}>): string[] {
  const commonWords = new Set(['what','which','how','does','is','are','can','its','it','the','a','an','and','or','of','for','in','to','that','this','with','about','safe','during','pregnancy','dosage','side','effects','interactions','warnings','me','tell','give','please','should','i','take','use','used'])
  const found: string[] = []
  for (const msg of [...history].reverse().slice(0, 6)) {
    const text = msg.content ?? msg.text ?? ''
    for (const word of text.split(' ')) {
      const clean = word.replace(/[?.,!:;()*\/\n#\-]/g, '')
      if (clean.length > 3 && clean[0] === clean[0].toUpperCase() && clean[0] !== clean[0].toLowerCase() && !commonWords.has(clean.toLowerCase()) && !found.includes(clean)) {
        found.push(clean)
      }
    }
    if (found.length >= 2) break
  }
  return found.slice(0, 2)
}

serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders })

  try {
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    )

    const body = await req.json()

    const question: string = body.query ?? body.question ?? ''
    const medicine_names: string[] = body.medicines ?? body.medicine_names ?? []
    const history: Array<{role: string, content?: string, text?: string}> = body.conversation_history ?? body.history ?? []

    const outOfScopeKeywords = ['cricket','football','movie','film','actor','stock','weather','recipe','cook','sport','politics','election','celebrity','song','game','travel','hotel','flight']
    if (outOfScopeKeywords.some(kw => question.toLowerCase().includes(kw))) {
      return new Response(JSON.stringify({
        answer: "I'm MediInfo AI and I can only help with medicine and health-related questions. Please ask me about medicines, dosages, side effects, drug interactions, or similar topics.",
        session_id: '',
      }), { headers: { ...corsHeaders, 'Content-Type': 'application/json' } })
    }

    const { context: exactContext, seenIds } = await getMedicineContext(supabase, medicine_names)

    const historyMedicines = extractMedicinesFromHistory(history)
    if (historyMedicines.length > 0) {
      const { context: extraContext, seenIds: extraIds } = await getMedicineContext(supabase, historyMedicines)
      if (extraContext) {
        for (const id of extraIds) seenIds.add(id)
      }
    }

    const searchQuery = historyMedicines.length > 0 && medicine_names.length === 0
      ? `${historyMedicines[0]} ${question}`
      : question
    const ragContext = await hybridRagSearch(supabase, searchQuery, 5, seenIds)

    const contextParts = []
    if (exactContext) contextParts.push('EXACT MATCH DATA:\n' + exactContext)
    if (ragContext) contextParts.push(ragContext)
    const context = contextParts.join('\n\n')

    const historyBlock = formatHistory(history.slice(-12))
    const historySection = historyBlock ? `CONVERSATION HISTORY:\n${historyBlock}\n\n` : ''

    const confidenceNote = exactContext && ragContext
      ? 'You have detailed information — be specific and confident.'
      : exactContext || ragContext
      ? 'You have some information — be helpful.'
      : 'No specific records found — answer from general medical knowledge.'

    const prompt = `You are MediInfo AI, a knowledgeable and friendly medical assistant for Indian users.
You speak like a helpful pharmacist — clear, warm, and trustworthy.

LANGUAGE RULES (CRITICAL - follow exactly):
- Detect the language of the USER message below.
- If the user writes in English, you MUST reply in English only. Do NOT use Hindi or any other language.
- If the user writes in Hindi (Devanagari script like यह, कृपया), reply in Hindi.
- If the user writes in Hinglish (mix of English and Hindi words in Latin script like "mujhe bata", "kya hoga"), reply in Hinglish.
- Match the user's language precisely. English question = English answer. No exceptions.

YOUR PERSONALITY:
- Friendly and reassuring, never clinical or robotic.
- Never say "based on the provided data", "my database", or any phrase that reveals you are reading from a database.
- If unsure, say "I don't have specific information on that".

STRICT RULES:
1. Only answer medicine and health-related questions.
2. Always name the medicine when stating a fact about it.
3. Use CONVERSATION HISTORY to resolve follow-up questions.
4. Add "consult your doctor" ONLY for pregnancy, overdose, serious interactions, or prescription medicines.
5. Use **bold** for medicine names and headings.
6. ${confidenceNote}

MEDICINE INFORMATION:
${context || 'No specific medicine information available for this query.'}

${historySection}USER: ${question}

MediInfo AI:`

    const answer = await geminiGenerate(prompt)

    return new Response(JSON.stringify({ answer, session_id: '' }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    })
  } catch (err) {
    console.error(err)
    return new Response(JSON.stringify({ error: err.message }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    })
  }
})
