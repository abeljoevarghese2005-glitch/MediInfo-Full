import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const PAYU_KEY = Deno.env.get("PAYU_KEY")!;
const PAYU_SALT = Deno.env.get("PAYU_SALT")!;

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
    // PayU sends this as application/x-www-form-urlencoded, not JSON
    const formData = await req.formData();
    const params: Record<string, string> = {};
    for (const [key, value] of formData.entries()) {
      params[key] = value.toString();
    }

    const {
      key,
      txnid,
      amount,
      productinfo,
      firstname,
      email,
      status,
      mihpayid,
      hash: receivedHash,
      udf1 = "",
      udf2 = "",
      udf3 = "",
      udf4 = "",
      udf5 = "",
    } = params;

    if (!key || !txnid || !status || !receivedHash) {
      return new Response(JSON.stringify({ error: "Missing required fields" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Reverse hash verification — salt first, field order reversed
    // compared to the request hash. Never trust this payload without it.
    const hashString = `${PAYU_SALT}|${status}||||||${udf5}|${udf4}|${udf3}|${udf2}|${udf1}|${email}|${firstname}|${productinfo}|${amount}|${txnid}|${key}`;
    const computedHash = await sha512Hex(hashString);

    if (computedHash !== receivedHash) {
      // Hash mismatch — potential tampering or spoofed callback.
      // Log it, but never update any payment/appointment state from this.
      console.error("PayU webhook hash mismatch", { txnid, status });
      return new Response(JSON.stringify({ error: "Invalid hash" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
    );

    // Find the matching pending payment row by txnid
    const { data: payment, error: paymentError } = await supabase
      .from("payments")
      .select("id, appointment_id, status, amount, total_amount")
      .eq("payu_txnid", txnid)
      .single();

    if (paymentError || !payment) {
      console.error("PayU webhook: no matching payment for txnid", txnid);
      return new Response(JSON.stringify({ error: "Payment record not found" }), {
        status: 404,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Idempotency: if this payment has already been finalized, don't
    // process it again (PayU may retry webhooks)
    if (payment.status === "success" || payment.status === "failed") {
      return new Response(JSON.stringify({ message: "Already processed" }), {
        status: 200,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const newStatus = status === "success" ? "success" : "failed";

    const { error: updatePaymentError } = await supabase
      .from("payments")
      .update({
        status: newStatus,
        payu_mihpayid: mihpayid || null,
        payu_hash: receivedHash,
      })
      .eq("id", payment.id);

    if (updatePaymentError) {
      console.error("Failed to update payment", updatePaymentError);
      return new Response(JSON.stringify({ error: "Failed to update payment" }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Only ever touch payment_status/payment_id/amount_paid here —
    // `status` belongs exclusively to the doctor-accept flow
    // (DoctorAppointments.jsx) and must never be set by this webhook.
    // Confirmed via code search: appointments.status = 'confirmed' is
    // set only by the doctor's Accept button, independent of payment.
    if (newStatus === "success") {
      const { error: updateApptError } = await supabase
        .from("appointments")
        .update({
          payment_status: "paid",
          payment_id: mihpayid || txnid,
          amount_paid: payment.amount,
        })
        .eq("id", payment.appointment_id);

      if (updateApptError) {
        console.error("Failed to update appointment", updateApptError);
        return new Response(JSON.stringify({ error: "Failed to update appointment" }), {
          status: 500,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
    } else {
      // Payment failed — only mark payment_status; leave status alone,
      // since the doctor-accept flow is independent
      await supabase
        .from("appointments")
        .update({ payment_status: "failed" })
        .eq("id", payment.appointment_id);
    }

    // PayU expects a 200 response to consider the webhook delivered
    return new Response(JSON.stringify({ received: true }), {
      status: 200,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (err) {
    console.error("Webhook error", err);
    return new Response(JSON.stringify({ error: "Unexpected error", details: String(err) }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});