import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const PAYU_KEY = Deno.env.get("PAYU_KEY")!;
const PAYU_SALT = Deno.env.get("PAYU_SALT")!;
const PAYU_ACTION_URL = "https://test.payu.in/_payment";
const COMMISSION_AMOUNT = 20;
const PAYU_FEE_RATE = 0.0236;

async function sha512Hex(input: string): Promise<string> {
  const data = new TextEncoder().encode(input);
  const hashBuffer = await crypto.subtle.digest("SHA-512", data);
  return Array.from(new Uint8Array(hashBuffer))
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) {
      return new Response(JSON.stringify({ error: "Missing authorization header" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Client #1: verify the caller's identity using their JWT + anon key
    const supabaseAuth = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_ANON_KEY")!,
      { global: { headers: { Authorization: authHeader } } }
    );

    const {
      data: { user },
      error: authError,
    } = await supabaseAuth.auth.getUser();

    if (authError || !user) {
      return new Response(JSON.stringify({ error: "Invalid or expired session" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Client #2: service-role client for all DB operations — bypasses RLS,
    // since this function is the trusted gatekeeper enforcing authorization
    // manually (patient_id === user.id check below)
    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
    );

    const { appointment_id } = await req.json();
    if (!appointment_id) {
      return new Response(JSON.stringify({ error: "appointment_id is required" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

      const { data: appointment, error: apptError } = await supabase
      .from("appointments")
      .select("id, patient_id, doctor_id, payment_status, consultation_type")
      .eq("id", appointment_id)
      .single();

    if (apptError || !appointment) {
      return new Response(JSON.stringify({ error: "Appointment not found" }), {
        status: 404,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    if (appointment.patient_id !== user.id) {
      return new Response(JSON.stringify({ error: "Not authorized for this appointment" }), {
        status: 403,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    if (appointment.payment_status === "paid") {
      return new Response(JSON.stringify({ error: "Appointment already paid" }), {
        status: 409,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

        const { data: doctor, error: doctorError } = await supabase
      .from("users")
      .select("consultation_fee, home_visit_fee, video_fee")
      .eq("id", appointment.doctor_id)
      .single();

    if (doctorError || !doctor) {
      return new Response(JSON.stringify({ error: "Could not fetch doctor details" }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

        // Never trust the frontend for the fee — always resolve it server-side
    // based on the appointment's own consultation_type.
    const consultationType = appointment.consultation_type;
    const baseFee =
      consultationType === "home_visit" ? doctor.home_visit_fee :
      consultationType === "video" ? doctor.video_fee :
      doctor.consultation_fee;

    if (baseFee == null) {
      const label =
        consultationType === "home_visit" ? "home visit fee" :
        consultationType === "video" ? "video consultation fee" :
        "consultation fee";
      return new Response(
        JSON.stringify({ error: `This doctor has not set a ${label}` }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const { data: patient, error: patientError } = await supabase
      .from("users")
      .select("full_name, email, phone")
      .eq("id", user.id)
      .single();

    if (patientError || !patient) {
      return new Response(JSON.stringify({ error: "Could not fetch patient details" }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const doctorAmount = Number(baseFee);
    const totalAmount = doctorAmount + COMMISSION_AMOUNT;
    const amount = Number((totalAmount / (1 - PAYU_FEE_RATE)).toFixed(2));
    const convenienceFee = Number((amount - totalAmount).toFixed(2));

    const payuTxnid = `NIRAAMO${Date.now()}${Math.random().toString(36).slice(2, 8)}`;
    const productinfo =
      consultationType === "home_visit" ? "Doctor Home Visit" :
      consultationType === "video" ? "Video Consultation" :
      "Doctor Consultation";
    const firstname = patient.full_name || "Patient";
    const phone = patient.phone || "";
    const email = patient.email || (phone ? `${phone}@niraamo.app` : "guest@niraamo.app");
    

    const hashString = `${PAYU_KEY}|${payuTxnid}|${amount}|${productinfo}|${firstname}|${email}|||||||||||${PAYU_SALT}`;
    const hash = await sha512Hex(hashString);

    const { error: insertError } = await supabase.from("payments").insert({
      appointment_id: appointment.id,
      patient_id: user.id,
      doctor_id: appointment.doctor_id,
      payu_txnid: payuTxnid,
      amount,
      currency: "INR",
      status: "pending",
      doctor_amount: doctorAmount,
      commission_amount: COMMISSION_AMOUNT,
      convenience_fee: convenienceFee,
      total_amount: totalAmount,
    });

    if (insertError) {
      return new Response(JSON.stringify({ error: "Failed to create payment record", details: insertError.message }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const supabaseProjectUrl = Deno.env.get("SUPABASE_URL")!;
    const surl = `${supabaseProjectUrl}/functions/v1/payu-return`;
    const furl = `${supabaseProjectUrl}/functions/v1/payu-return`;

    return new Response(
      JSON.stringify({
        action_url: PAYU_ACTION_URL,
        fields: {
          key: PAYU_KEY,
          txnid: payuTxnid,
          amount: amount.toString(),
          productinfo,
          firstname,
          email,
          phone,
          surl,
          furl,
          hash,
        },
      }),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (err) {
    return new Response(JSON.stringify({ error: "Unexpected error", details: String(err) }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});