import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders })
  try {
    const url = new URL(req.url)
    const lat = parseFloat(url.searchParams.get('lat') || '0')
    const lng = parseFloat(url.searchParams.get('lng') || '0')
    const radius = parseFloat(url.searchParams.get('radius') || '15')
    const specialization = url.searchParams.get('specialization') || ''
    const supabase = createClient(Deno.env.get('SUPABASE_URL') ?? '', Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '')
    const { data, error } = await supabase.rpc('nearby_doctors', { lat, lng, radius_km: radius })
    if (error) throw error
    let results = data || []
    if (specialization) results = results.filter((d) => d.specialization?.toLowerCase().includes(specialization.toLowerCase()))
    return new Response(JSON.stringify(results), { headers: { ...corsHeaders, 'Content-Type': 'application/json' } })
  } catch (err) {
    return new Response(JSON.stringify({ error: err.message }), { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } })
  }
})
