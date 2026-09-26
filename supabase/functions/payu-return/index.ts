import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const PAYU_SALT = Deno.env.get("PAYU_SALT")!;
const FRONTEND_URL = "https://www.niraamo.com";

async function sha512Hex(input: string): Promise<string> {
  const data = new TextEncoder().encode(input);
  const hashBuffer = await crypto.subtle.digest("SHA-512", data);
  return Array.from(new Uint8Array(hashBuffer))
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");
}

serve(async (req) => {
  try {
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
      hash: receivedHash,
      udf1 = "",
      udf2 = "",
      udf3 = "",
      udf4 = "",
      udf5 = "",
    } = params;

    // Verify hash for display purposes only — never trust this alone,
    // and never write payment/appointment state from this function.
    // The webhook is the sole source of truth for actual state.
    let hashValid = false;
    if (key && txnid && status && receivedHash) {
      const hashString = `${PAYU_SALT}|${status}||||||${udf5}|${udf4}|${udf3}|${udf2}|${udf1}|${email}|${firstname}|${productinfo}|${amount}|${txnid}|${key}`;
      const computedHash = await sha512Hex(hashString);
      hashValid = computedHash === receivedHash;
    }

    // Look up the appointment_id for this txnid so the frontend lands
    // on the right appointment page, not just a generic message
    let appointmentId = "";
    if (txnid) {
      const supabase = createClient(
        Deno.env.get("SUPABASE_URL")!,
        Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
      );
      const { data: payment } = await supabase
        .from("payments")
        .select("appointment_id")
        .eq("payu_txnid", txnid)
        .single();
      appointmentId = payment?.appointment_id || "";
    }

    const outcome = status === "success" && hashValid ? "success" : "failed";

    const redirectUrl = `${FRONTEND_URL}/payment-result?status=${outcome}&appointment_id=${appointmentId}&txnid=${txnid || ""}`;

    return new Response(null, {
      status: 302,
      headers: { Location: redirectUrl },
    });
  } catch (err) {
    console.error("payu-return error", err);
    const fallbackUrl = `${FRONTEND_URL}/payment-result?status=error`;
    return new Response(null, {
      status: 302,
      headers: { Location: fallbackUrl },
    });
  }
});