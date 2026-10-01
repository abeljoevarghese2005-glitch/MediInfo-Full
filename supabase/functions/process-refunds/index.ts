import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

// Test URL. Production: https://info.payu.in/merchant/postservice?form=2
const PAYU_REFUND_URL = "https://test.payu.in/merchant/postservice.php?form=2";
const COMMAND = "cancel_refund_transaction";

async function sha512(s: string) {
  const buf = await crypto.subtle.digest("SHA-512", new TextEncoder().encode(s));
  return Array.from(new Uint8Array(buf)).map((b) => b.toString(16).padStart(2, "0")).join("");
}

Deno.serve(async (req) => {
  const secret = Deno.env.get("REFUND_ADMIN_SECRET");
  if (!secret || req.headers.get("x-refund-secret") !== secret) {
    return new Response("Unauthorized", { status: 401 });
  }

  const key = Deno.env.get("PAYU_KEY")!;
  const salt = Deno.env.get("PAYU_SALT")!;
  const supabase = createClient(
    Deno.env.get("SUPABASE_URL")!,
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
  );

  const { data: rows, error } = await supabase
    .from("payments")
    .select("id, amount, payu_mihpayid")
    .eq("refund_status", "approved")
    .eq("status", "success")
    .not("payu_mihpayid", "is", null)
    .limit(10);

  if (error) return new Response(JSON.stringify({ error: error.message }), { status: 500 });

  const results: unknown[] = [];

  for (const p of rows ?? []) {
    // Claim the row first so a second run can never refund it again
    const { data: claimed } = await supabase
      .from("payments")
      .update({
        refund_status: "refund_initiated",
        refund_requested_at: new Date().toISOString(),
        refund_amount: p.amount,
      })
      .eq("id", p.id)
      .eq("refund_status", "approved")
      .select("id")
      .maybeSingle();
    if (!claimed) continue;

    try {
      const hash = await sha512(`${key}|${COMMAND}|${p.payu_mihpayid}|${salt}`);
      const body = new URLSearchParams({
        key,
        command: COMMAND,
        var1: String(p.payu_mihpayid),
        var2: String(p.id), // unique token per payment
        var3: Number(p.amount).toFixed(2),
        hash,
      });

      const res = await fetch(PAYU_REFUND_URL, {
        method: "POST",
        headers: { "Content-Type": "application/x-www-form-urlencoded" },
        body,
      });
      const text = await res.text();
      let json: any = null;
      try { json = JSON.parse(text); } catch { /* non-JSON response */ }

      if (json && Number(json.status) === 1) {
        await supabase.from("payments").update({
          payu_refund_request_id: json.request_id ? String(json.request_id) : null,
        }).eq("id", p.id);
        results.push({ id: p.id, outcome: "initiated", request_id: json.request_id });
      } else {
        await supabase.from("payments").update({
          refund_status: "refund_failed",
          refund_failure_reason: (json?.msg ?? text).toString().slice(0, 500),
        }).eq("id", p.id);
        results.push({ id: p.id, outcome: "failed", detail: json?.msg ?? text });
      }
    } catch (e) {
      // Outcome unknown: do NOT retry automatically, check the PayU dashboard first
      await supabase.from("payments").update({
        refund_status: "refund_failed",
        refund_failure_reason: `Unknown outcome (network error), verify in PayU dashboard: ${String(e)}`.slice(0, 500),
      }).eq("id", p.id);
      results.push({ id: p.id, outcome: "unknown_error" });
    }
  }

  return new Response(JSON.stringify({ processed: results }), {
    headers: { "Content-Type": "application/json" },
  });
});