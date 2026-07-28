import { corsHeaders } from "npm:@supabase/supabase-js@2/cors";
import { withSentry } from "../_shared/sentry.ts";
import { jsonResponse, requireUser } from "../_shared/auth.ts";

Deno.serve(withSentry("cc-generate-analytics", async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });
  const auth = await requireUser(req, corsHeaders);
  if (auth instanceof Response) return auth;

  const b = (await req.json().catch(() => ({}))) as { client_id?: string; period_days?: number };
  if (!b.client_id) return jsonResponse({ error: "client_id required", code: "bad_request" }, 400, corsHeaders);
  const days = Math.min(Math.max(b.period_days ?? 30, 1), 365);

  const { userClient } = auth;
  const { data: client } = await userClient.from("clients").select("id, agency_id").eq("id", b.client_id).maybeSingle();
  if (!client) return jsonResponse({ error: "client_not_found", code: "not_found" }, 404, corsHeaders);

  const end = new Date();
  const start = new Date(end.getTime() - days * 86400_000);

  const [{ count: openOrders }, { count: openPositions }, { data: placements }, { data: tickets }] = await Promise.all([
    userClient.from("job_orders").select("id", { count: "exact", head: true }).eq("client_id", client.id).eq("status", "open"),
    userClient.from("job_orders").select("id", { count: "exact", head: true }).eq("client_id", client.id).in("status", ["open","on_hold"]),
    userClient.from("placements").select("id, created_at").eq("client_id", client.id).gte("created_at", start.toISOString()),
    userClient.from("tto_time_tickets").select("id, status").eq("client_id", client.id).gte("created_at", start.toISOString()),
  ]);

  const totalTickets = tickets?.length ?? 0;
  const approvedTickets = tickets?.filter((t) => t.status === "approved").length ?? 0;
  const metrics = {
    open_orders: openOrders ?? 0,
    open_positions: openPositions ?? 0,
    placements: placements?.length ?? 0,
    fill_rate: openOrders && placements ? Math.min(100, Math.round((placements.length / Math.max(1, openOrders)) * 100)) : 0,
    tickets_total: totalTickets,
    tickets_approved: approvedTickets,
    approval_rate: totalTickets ? Math.round((approvedTickets / totalTickets) * 100) : 0,
  };

  const { data, error } = await userClient.from("cc_analytics_snapshots").insert({
    agency_id: client.agency_id, client_id: client.id,
    period_start: start.toISOString().slice(0, 10),
    period_end: end.toISOString().slice(0, 10),
    metrics,
  }).select().maybeSingle();
  if (error) return jsonResponse({ error: error.message, code: "internal" }, 500, corsHeaders);
  return jsonResponse({ data }, 200, corsHeaders);
}));
