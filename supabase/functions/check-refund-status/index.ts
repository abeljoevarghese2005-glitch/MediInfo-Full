import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const PAYU_URL = "https://test.payu.in/merchant/postservice.php?form=2";
const COMMAND = "check_action_status";

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
    .select("id, payu_refund_request_id")
    .eq("refund_status", "refund_initiated")
    .not("payu_refund_request_id", "is", null)
    .limit(20);

  if (error) return new Response(JSON.stringify({ error: error.message }), { status: 500 });

  const results: unknown[] = [];

  for (const p of rows ?? []) {
    const rid = String(p.payu_refund_request_id);
    try {
      const hash = await sha512(`${key}|${COMMAND}|${rid}|${salt}`);
      const body = new URLSearchParams({ key, command: COMMAND, var1: rid, hash });
      const res = await fetch(PAYU_URL, {
        method: "POST",
        headers: { "Content-Type": "application/x-www-form-urlencoded" },
        body,
      });
      const json: any = await res.json();
      const entry = json?.transaction_details?.[rid]?.[rid];
      const status = String(entry?.status ?? "").toLowerCase();

      if (status === "success") {
        await supabase.from("payments").update({
          refund_status: "refunded",
          refunded_at: new Date().toISOString(),
        }).eq("id", p.id).eq("refund_status", "refund_initiated");
        results.push({ id: p.id, payu_status: status, action: "marked refunded" });
      } else if (status === "failure" || status === "failed") {
        await supabase.from("payments").update({
          refund_status: "refund_failed",
          refund_failure_reason: `PayU refund failed: ${JSON.stringify(entry).slice(0, 400)}`,
        }).eq("id", p.id).eq("refund_status", "refund_initiated");
        results.push({ id: p.id, payu_status: status, action: "marked refund_failed" });
      } else {
        results.push({ id: p.id, payu_status: status || "unknown", action: "no change" });
      }
    } catch (e) {
      results.push({ id: p.id, action: "error, no change", detail: String(e) });
    }
  }

  return new Response(JSON.stringify({ checked: results }, null, 2), {
    headers: { "Content-Type": "application/json" },
  });
});