import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

// ─── FCM HTTP v1 helpers ───────────────────────────────────────────────────

// Build a signed JWT for Google OAuth2 to get an FCM access token
async function getFCMAccessToken(): Promise<string> {
  const clientEmail = Deno.env.get('FIREBASE_CLIENT_EMAIL') ?? ''
  const privateKeyPem = (Deno.env.get('FIREBASE_PRIVATE_KEY') ?? '').replace(/\\n/g, '\n')
  const projectId = Deno.env.get('FIREBASE_PROJECT_ID') ?? ''

  const now = Math.floor(Date.now() / 1000)
  const header = { alg: 'RS256', typ: 'JWT' }
  const payload = {
    iss: clientEmail,
    scope: 'https://www.googleapis.com/auth/firebase.messaging',
    aud: 'https://oauth2.googleapis.com/token',
    iat: now,
    exp: now + 3600,
  }

  const encode = (obj: object) =>
    btoa(JSON.stringify(obj)).replace(/=/g, '').replace(/\+/g, '-').replace(/\//g, '_')

  const signingInput = `${encode(header)}.${encode(payload)}`

  // Import the private key
  const pemBody = privateKeyPem
    .replace('-----BEGIN PRIVATE KEY-----', '')
    .replace('-----END PRIVATE KEY-----', '')
    .replace(/\s/g, '')
  const keyData = Uint8Array.from(atob(pemBody), c => c.charCodeAt(0))

  const cryptoKey = await crypto.subtle.importKey(
    'pkcs8',
    keyData,
    { name: 'RSASSA-PKCS1-v1_5', hash: 'SHA-256' },
    false,
    ['sign']
  )

  const signature = await crypto.subtle.sign(
    'RSASSA-PKCS1-v1_5',
    cryptoKey,
    new TextEncoder().encode(signingInput)
  )

  const sigB64 = btoa(String.fromCharCode(...new Uint8Array(signature)))
    .replace(/=/g, '').replace(/\+/g, '-').replace(/\//g, '_')

  const jwt = `${signingInput}.${sigB64}`

  // Exchange JWT for access token
  const tokenRes = await fetch('https://oauth2.googleapis.com/token', {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: `grant_type=urn%3Aietf%3Aparams%3Aoauth%3Agrant-type%3Ajwt-bearer&assertion=${jwt}`,
  })
  const tokenData = await tokenRes.json()
  return tokenData.access_token
}

async function sendFCM(fcmToken: string, title: string, body: string, data?: Record<string, string>) {
  const projectId = Deno.env.get('FIREBASE_PROJECT_ID') ?? ''
  const accessToken = await getFCMAccessToken()

  const message = {
    message: {
      token: fcmToken,
      notification: { title, body },
      android: {
        priority: 'high',
        notification: { sound: 'default', channel_id: 'niraamo_reminders' },
      },
      data: data || {},
    },
  }

  const res = await fetch(
    `https://fcm.googleapis.com/v1/projects/${projectId}/messages:send`,
    {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${accessToken}`,
      },
      body: JSON.stringify(message),
    }
  )

  if (!res.ok) {
    const err = await res.text()
    console.error(`FCM send failed for token ${fcmToken.slice(0, 20)}...: ${err}`)
    return false
  }
  return true
}

// ─── Main handler ──────────────────────────────────────────────────────────

serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders })

  try {
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    )

    const nowIST = new Date(Date.now() + 5.5 * 60 * 60 * 1000) // UTC+5:30
    const todayDate = nowIST.toISOString().split('T')[0]
    const currentHour = nowIST.getUTCHours()
    const currentMinute = nowIST.getUTCMinutes()
    // Match reminders within a 5-minute window of now
    const currentTime = `${String(currentHour).padStart(2, '0')}:${String(currentMinute).padStart(2, '0')}`

    let sent = 0
    let failed = 0

    // ── 1. Medicine reminders ──────────────────────────────────────────────
    const { data: medicineReminders } = await supabase
      .from('medication_reminders')
      .select('id, user_id, medicine_name, dosage, frequency, reminder_time')
      .lte('start_date', todayDate)
      .or(`end_date.is.null,end_date.gte.${todayDate}`)

    for (const reminder of medicineReminders || []) {
      if (!reminder.reminder_time) continue

      // Check if within 5-minute window
      const [rH, rM] = reminder.reminder_time.split(':').map(Number)
      const reminderMinutes = rH * 60 + rM
      const nowMinutes = currentHour * 60 + currentMinute
      if (Math.abs(reminderMinutes - nowMinutes) > 2) continue

      // Get user's FCM token
      const { data: sub } = await supabase
        .from('push_subscriptions')
        .select('fcm_token')
        .eq('user_id', reminder.user_id)
        .eq('is_active', true)
        .single()

      if (!sub?.fcm_token) continue

      const dosageText = reminder.dosage ? ` (${reminder.dosage})` : ''
      const ok = await sendFCM(
        sub.fcm_token,
        '💊 Medicine Reminder',
        `Time to take ${reminder.medicine_name}${dosageText}`,
        { type: 'medicine_reminder', reminder_id: String(reminder.id) }
      )
      ok ? sent++ : failed++
    }

    // ── 2. Appointment reminders — 24h before ─────────────────────────────
    const tomorrowDate = new Date(nowIST)
    tomorrowDate.setUTCDate(tomorrowDate.getUTCDate() + 1)
    const tomorrowStr = tomorrowDate.toISOString().split('T')[0]

    // Only fire at 9:00 AM IST so patients get exactly one 24h reminder
    if (currentHour === 9 && currentMinute < 5) {
      const { data: tomorrowAppts } = await supabase
        .from('appointments')
        .select('id, patient_id, doctor_id, appointment_date, appointment_time, users!appointments_doctor_id_fkey(full_name)')
        .eq('appointment_date', tomorrowStr)
        .eq('status', 'confirmed')

      for (const appt of tomorrowAppts || []) {
        const { data: sub } = await supabase
          .from('push_subscriptions')
          .select('fcm_token')
          .eq('user_id', appt.patient_id)
          .eq('is_active', true)
          .single()

        if (!sub?.fcm_token) continue

        const doctorName = (appt.users as any)?.full_name || 'your doctor'
        const timeStr = appt.appointment_time || ''
        const ok = await sendFCM(
          sub.fcm_token,
          '📅 Appointment Tomorrow',
          `Reminder: appointment with Dr. ${doctorName}${timeStr ? ` at ${timeStr}` : ''} is tomorrow`,
          { type: 'appointment_reminder', appointment_id: String(appt.id) }
        )
        ok ? sent++ : failed++
      }
    }

    // ── 3. Appointment reminders — 1h before ──────────────────────────────
    const oneHourLater = `${String(currentHour + 1).padStart(2, '0')}:${String(currentMinute).padStart(2, '0')}`

    const { data: soonAppts } = await supabase
      .from('appointments')
      .select('id, patient_id, appointment_time, users!appointments_doctor_id_fkey(full_name)')
      .eq('appointment_date', todayDate)
      .eq('status', 'confirmed')
      .eq('appointment_time', oneHourLater)

    for (const appt of soonAppts || []) {
      const { data: sub } = await supabase
        .from('push_subscriptions')
        .select('fcm_token')
        .eq('user_id', appt.patient_id)
        .eq('is_active', true)
        .single()

      if (!sub?.fcm_token) continue

      const doctorName = (appt.users as any)?.full_name || 'your doctor'
      const ok = await sendFCM(
        sub.fcm_token,
        '⏰ Appointment in 1 Hour',
        `Your appointment with Dr. ${doctorName} is in 1 hour`,
        { type: 'appointment_soon', appointment_id: String(appt.id) }
      )
      ok ? sent++ : failed++
    }

    return new Response(
      JSON.stringify({ success: true, sent, failed, time_ist: currentTime }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  } catch (err) {
    return new Response(JSON.stringify({ error: err.message }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    })
  }
})