// event-replay — admin-only replay of Event Fabric events.
// POST { agency_id, mode: "single"|"range"|"workflow", event_id?, correlation_id?, range?: {from,to,names?,modules?,statuses?},
//        dry_run: boolean, plan_hash?: string, confirm?: boolean }
// - dry_run=true returns the impact preview + plan_hash (nothing is changed).
// - dry_run=false requires the plan_hash from a preview (409 if rules/events changed since), and confirm=true
//   whenever the plan creates real records (428 otherwise).
// Replays never mutate original events: each is copied as a new pending event (fresh correlation id,
// metadata.replay_of) and dispatched, so history stays intact and the correlation ledger doesn't suppress it.
// Every request — preview, execution, denial — is written to event_replay_runs.
import { corsHeaders } from "npm:@supabase/supabase-js@2/cors";
import { createClient } from "npm:@supabase/supabase-js@2";
import { withSentry } from "../_shared/sentry.ts";
import { jsonResponse, requireUser } from "../_shared/auth.ts";
import {
  buildImpact, MAX_REPLAY_EVENTS, planFingerprint, REPLAY_ADMIN_ROLES, replayMetadata, workflowRoots,
  type ReplayEvent, type ReplayRule,
} from "../_shared/replay-plan.ts";

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const COLS = "id,agency_id,module,name,actor_id,entity_type,entity_id,metadata,correlation_id,created_at";
const strList = (v: unknown) => (Array.isArray(v) ? v.filter((x) => typeof x === "string" && x.length <= 120).slice(0, 50) as string[] : []);

async function sha256(s: string) {
  const buf = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(s));
  return Array.from(new Uint8Array(buf)).map((b) => b.toString(16).padStart(2, "0")).join("");
}

Deno.serve(withSentry("event-replay", async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });
  if (req.method !== "POST") return jsonResponse({ error: "method_not_allowed" }, 405, corsHeaders);

  const auth = await requireUser(req, corsHeaders);
  if (auth instanceof Response) return auth;
  const { user } = auth;
  const admin = createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!);

  const raw = await req.text();
  if (raw.length > 32_000) return jsonResponse({ error: "Payload too large", code: "payload_too_large" }, 413, corsHeaders);
  let body: Record<string, unknown>;
  try { body = JSON.parse(raw); } catch { return jsonResponse({ error: "Invalid JSON", code: "bad_request" }, 400, corsHeaders); }

  const agencyId = typeof body.agency_id === "string" && UUID.test(body.agency_id) ? body.agency_id : null;
  const mode = body.mode;
  const dryRun = body.dry_run !== false;
  if (!agencyId) return jsonResponse({ error: "agency_id must be a uuid", code: "bad_request" }, 400, corsHeaders);
  if (mode !== "single" && mode !== "range" && mode !== "workflow") {
    return jsonResponse({ error: "mode must be single, range or workflow", code: "bad_request" }, 400, corsHeaders);
  }

  // ---- authorization: admin of this agency (or super_admin) ----
  const [{ data: globalRoles }, { data: membership }] = await Promise.all([
    admin.from("user_roles").select("role").eq("user_id", user.id),
    admin.from("agency_members").select("role,is_active").eq("user_id", user.id).eq("agency_id", agencyId).maybeSingle(),
  ]);
  const isMember = !!membership && membership.is_active !== false;
  const gl = (globalRoles ?? []).map((r: { role: string }) => String(r.role));
  const roles = isMember ? [...new Set([...gl, ...(membership?.role ? [String(membership.role)] : [])])] : gl.includes("super_admin") ? ["super_admin"] : [];
  const selector = { event_id: body.event_id ?? null, correlation_id: body.correlation_id ?? null, range: body.range ?? null };

  const record = async (row: Record<string, unknown>) => {
    const { data } = await admin.from("event_replay_runs").insert({
      agency_id: agencyId, actor_id: user.id, actor_roles: roles, mode, dry_run: dryRun, selector,
      ip_address: req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ?? null,
      user_agent: req.headers.get("user-agent")?.slice(0, 500) ?? null,
      ...row,
    }).select("id").single();
    return (data as { id: string } | null)?.id ?? null;
  };

  if (!roles.some((r) => REPLAY_ADMIN_ROLES.includes(r))) {
    await record({ status: "denied", error: isMember || gl.includes("super_admin") ? "role_not_permitted" : "not_agency_member" });
    return jsonResponse({ error: "Only agency owners and admins can replay events.", code: "forbidden" }, 403, corsHeaders);
  }

  // ---- select events ----
  let events: ReplayEvent[] = [];
  if (mode === "single") {
    if (typeof body.event_id !== "string" || !UUID.test(body.event_id)) return jsonResponse({ error: "event_id required", code: "bad_request" }, 400, corsHeaders);
    const { data } = await admin.from("ttos_events").select(COLS).eq("agency_id", agencyId).eq("id", body.event_id).limit(1);
    events = (data ?? []) as ReplayEvent[];
  } else if (mode === "workflow") {
    const cid = typeof body.correlation_id === "string" && UUID.test(body.correlation_id) ? body.correlation_id : null;
    if (!cid) return jsonResponse({ error: "correlation_id required", code: "bad_request" }, 400, corsHeaders);
    const { data } = await admin.from("ttos_events").select(COLS).eq("agency_id", agencyId)
      .or(`correlation_id.eq.${cid},id.eq.${cid}`).order("created_at").limit(MAX_REPLAY_EVENTS + 1);
    events = workflowRoots((data ?? []) as ReplayEvent[]);
  } else {
    const r = (body.range ?? {}) as Record<string, unknown>;
    const from = typeof r.from === "string" ? new Date(r.from) : null;
    const to = typeof r.to === "string" ? new Date(r.to) : null;
    if (!from || !to || Number.isNaN(+from) || Number.isNaN(+to) || from >= to) {
      return jsonResponse({ error: "range.from and range.to are required and from must be before to", code: "bad_request" }, 400, corsHeaders);
    }
    let q = admin.from("ttos_events").select(COLS).eq("agency_id", agencyId)
      .gte("created_at", from.toISOString()).lte("created_at", to.toISOString());
    const names = strList(r.names), modules = strList(r.modules), statuses = strList(r.statuses);
    if (names.length) q = q.in("name", names);
    if (modules.length) q = q.in("module", modules);
    if (statuses.length) q = q.in("status", statuses);
    // Replays of replays are excluded from ranges to avoid compounding effects.
    q = q.is("metadata->>replay_of", null);
    const { data } = await q.order("created_at").limit(MAX_REPLAY_EVENTS + 1);
    events = (data ?? []) as ReplayEvent[];
  }

  if (!events.length) return jsonResponse({ error: "No events matched.", code: "not_found" }, 404, corsHeaders);
  if (events.length > MAX_REPLAY_EVENTS) {
    return jsonResponse({ error: `More than ${MAX_REPLAY_EVENTS} events matched — narrow the selection.`, code: "too_many" }, 422, corsHeaders);
  }

  const { data: ruleRows } = await admin.from("ttos_automations")
    .select("id,name,trigger_event,conditions,actions,priority,version,enabled").eq("agency_id", agencyId).eq("enabled", true);
  const rules = (ruleRows ?? []) as ReplayRule[];
  const impact = buildImpact(events, rules);
  const planHash = await sha256(planFingerprint(events, rules));
  const eventIds = events.map((e) => e.id);

  if (dryRun) {
    const runId = await record({ status: "previewed", event_ids: eventIds, plan_hash: planHash, impact: { ...impact, per_event: undefined } });
    return jsonResponse({ data: { run_id: runId, dry_run: true, plan_hash: planHash, requires_confirmation: impact.destructive, impact } }, 200, corsHeaders);
  }

  // ---- execution guards ----
  if (body.plan_hash !== planHash) {
    await record({ status: "rejected", event_ids: eventIds, plan_hash: planHash, error: "stale_or_missing_preview" });
    return jsonResponse({
      error: "Events or automation rules changed since the preview. Review the new impact and confirm again.",
      code: "plan_changed", data: { plan_hash: planHash, requires_confirmation: impact.destructive, impact },
    }, 409, corsHeaders);
  }
  if (impact.destructive && body.confirm !== true) {
    await record({ status: "rejected", event_ids: eventIds, plan_hash: planHash, error: "confirmation_required" });
    return jsonResponse({ error: "This replay creates real records and must be confirmed.", code: "confirmation_required" }, 428, corsHeaders);
  }

  const runId = await record({
    status: "running", event_ids: eventIds, plan_hash: planHash, confirmed: body.confirm === true,
    impact: { ...impact, per_event: undefined },
  });
  if (!runId) return jsonResponse({ error: "Could not record replay run", code: "internal" }, 500, corsHeaders);

  // ---- execute: copy each event as a new pending event, then dispatch ----
  const replayed: string[] = [];
  let error: string | null = null;
  try {
    const rows = events.map((e) => ({
      agency_id: agencyId, module: e.module, name: e.name, actor_id: user.id,
      entity_type: e.entity_type, entity_id: e.entity_id, status: "pending",
      correlation_id: crypto.randomUUID(), metadata: replayMetadata(e, runId, user.id),
    }));
    const { data: inserted, error: iErr } = await admin.from("ttos_events").insert(rows).select("id");
    if (iErr) throw iErr;
    for (const r of (inserted ?? []) as Array<{ id: string }>) replayed.push(r.id);
    for (const id of replayed) {
      await fetch(`${Deno.env.get("SUPABASE_URL")}/functions/v1/ttos-dispatch`, {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")}` },
        body: JSON.stringify({ event_id: id }),
      }).catch(() => { /* hourly backstop will pick it up */ });
    }
  } catch (e) {
    error = e instanceof Error ? e.message : String(e);
  }
  // Audit rows are immutable; the outcome is recorded as a follow-up row linked by replay_run.
  await record({
    status: error ? "failed" : "completed", event_ids: eventIds, plan_hash: planHash, confirmed: body.confirm === true,
    replayed_event_ids: replayed, error, selector: { ...selector, run_id: runId },
  });

  if (error) return jsonResponse({ error: `Replay failed: ${error}`, code: "internal", data: { run_id: runId, replayed_event_ids: replayed } }, 500, corsHeaders);
  return jsonResponse({ data: { run_id: runId, dry_run: false, replayed_event_ids: replayed, impact } }, 200, corsHeaders);
}));
