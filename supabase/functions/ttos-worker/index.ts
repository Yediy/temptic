// ttos-worker: drains ttos_jobs. Uses claim-by-update to avoid double
// processing. Service-role gated.
import { corsHeaders } from "npm:@supabase/supabase-js@2/cors";
import { createClient } from "npm:@supabase/supabase-js@2";
import { withSentry } from "../_shared/sentry.ts";
import { jsonResponse } from "../_shared/auth.ts";

Deno.serve(withSentry("ttos-worker", async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });

  const provided = req.headers.get("x-service-key") ?? "";
  const expected = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "";
  if (!expected || provided !== expected) {
    return jsonResponse({ error: "forbidden", code: "forbidden" }, 403, corsHeaders);
  }

  const admin = createClient(Deno.env.get("SUPABASE_URL")!, expected);
  const workerId = crypto.randomUUID();
  const lockUntil = new Date(Date.now() + 60_000).toISOString();

  // Claim up to 25 jobs
  const { data: candidates } = await admin
    .from("ttos_jobs")
    .select("id")
    .eq("status", "queued")
    .lte("run_after", new Date().toISOString())
    .order("run_after")
    .limit(25);

  const ids = (candidates ?? []).map((r: { id: string }) => r.id);
  if (ids.length === 0) return jsonResponse({ processed: 0 }, 200, corsHeaders);

  const { data: claimed } = await admin
    .from("ttos_jobs")
    .update({ status: "running", locked_by: workerId, locked_until: lockUntil, attempts: 1 })
    .in("id", ids)
    .eq("status", "queued")
    .select("*");

  let ok = 0, failed = 0;
  for (const job of claimed ?? []) {
    try {
      // Simple dispatch — extendable by kind. Nothing implemented yet.
      await admin.from("ttos_jobs").update({
        status: "succeeded",
        result: { note: "no-op handler for kind=" + (job as { kind: string }).kind },
      }).eq("id", (job as { id: string }).id);
      ok += 1;
    } catch (e) {
      failed += 1;
      const msg = e instanceof Error ? e.message : String(e);
      await admin.from("ttos_jobs").update({ status: "failed", last_error: msg }).eq("id", (job as { id: string }).id);
    }
  }

  return jsonResponse({ processed: ok, failed }, 200, corsHeaders);
}));
