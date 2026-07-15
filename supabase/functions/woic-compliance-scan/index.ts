// woic-compliance-scan — service-role only. Scans woic_compliance_events for
// items expiring within the grace window and marks them warning/expired.
// Intended for pg_cron; refuses browser callers.
import { corsHeaders } from "npm:@supabase/supabase-js@2/cors";
import { withSentry } from "../_shared/sentry.ts";
import { jsonResponse } from "../_shared/auth.ts";
import { admin, isUuid } from "../_shared/woic.ts";

Deno.serve(withSentry("woic-compliance-scan", async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });

  const provided = req.headers.get("x-service-key") ?? "";
  const expected = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "";
  if (!expected || provided !== expected) {
    return jsonResponse({ error: "forbidden", code: "forbidden" }, 403, corsHeaders);
  }

  const body = (await req.json().catch(() => ({}))) as { agency_id?: string };
  const db = admin();

  try {
    const now = new Date();
    const iso = now.toISOString();

    // Pull rules to derive grace windows.
    const rulesQuery = db.from("woic_compliance_rules").select("id, agency_id, grace_days, active").eq("active", true);
    if (isUuid(body.agency_id)) rulesQuery.eq("agency_id", body.agency_id);
    const { data: rules, error: rErr } = await rulesQuery;
    if (rErr) throw rErr;
    const graceByRule = new Map<string, number>();
    for (const r of rules ?? []) {
      graceByRule.set((r as { id: string }).id, Number((r as { grace_days?: number }).grace_days ?? 0));
    }

    // Fetch events not already terminal.
    const evQuery = db
      .from("woic_compliance_events")
      .select("id, agency_id, rule_id, status, expires_at, next_action_at")
      .in("status", ["ok", "warning", "pending"])
      .limit(1000);
    if (isUuid(body.agency_id)) evQuery.eq("agency_id", body.agency_id);
    const { data: events, error: eErr } = await evQuery;
    if (eErr) throw eErr;

    let expired = 0;
    let warned = 0;
    for (const e of events ?? []) {
      const ev = e as {
        id: string;
        rule_id: string | null;
        status: string;
        expires_at: string | null;
      };
      if (!ev.expires_at) continue;
      const expiresAt = new Date(ev.expires_at).getTime();
      const graceDays = ev.rule_id ? (graceByRule.get(ev.rule_id) ?? 0) : 0;
      const warnAt = expiresAt - graceDays * 86400_000;

      let next: string | null = null;
      if (now.getTime() >= expiresAt && ev.status !== "expired") next = "expired";
      else if (now.getTime() >= warnAt && ev.status === "ok") next = "warning";

      if (!next) continue;
      const { error: uErr } = await db
        .from("woic_compliance_events")
        .update({ status: next, next_action_at: iso, updated_at: iso })
        .eq("id", ev.id);
      if (uErr) continue;
      if (next === "expired") expired += 1;
      else warned += 1;
    }

    return jsonResponse({ scanned: events?.length ?? 0, expired, warned }, 200, corsHeaders);
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e);
    return jsonResponse({ error: msg, code: "internal" }, 500, corsHeaders);
  }
}));
