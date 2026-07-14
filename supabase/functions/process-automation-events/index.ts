// process-automation-events: drains queued automation_events with side-effect
// fan-out. Idempotent per event_id. Intended for scheduled invocation.
import { corsHeaders } from "npm:@supabase/supabase-js@2/cors";
import { createClient } from "npm:@supabase/supabase-js@2";
import { withSentry } from "../_shared/sentry.ts";
import { jsonResponse } from "../_shared/auth.ts";

Deno.serve(withSentry("process-automation-events", async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });

  // Restricted to service role or cron — reject callers without service key.
  const provided = req.headers.get("x-service-key") ?? "";
  const expected = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "";
  if (!expected || provided !== expected) {
    return jsonResponse({ error: "forbidden", code: "forbidden" }, 403, corsHeaders);
  }

  const admin = createClient(Deno.env.get("SUPABASE_URL")!, expected);

  const { data: events, error } = await admin
    .from("automation_events")
    .select("*")
    .is("processed_at", null)
    .order("created_at", { ascending: true })
    .limit(100);
  if (error) return jsonResponse({ error: error.message, code: "internal" }, 500, corsHeaders);

  let processed = 0;
  for (const evt of events ?? []) {
    // Fan-out is intentionally a no-op scaffold for now: mark processed so
    // downstream automations can plug in per event_type without back-pressure.
    const { error: uErr } = await admin
      .from("automation_events")
      .update({ processed_at: new Date().toISOString() })
      .eq("id", (evt as { id: string }).id)
      .is("processed_at", null);
    if (!uErr) processed += 1;
  }

  return jsonResponse({ processed, scanned: events?.length ?? 0 }, 200, corsHeaders);
}));
