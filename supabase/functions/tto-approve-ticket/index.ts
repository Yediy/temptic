// tto-approve-ticket: supervisor/client approve, reject, or request correction.
import { corsHeaders } from "npm:@supabase/supabase-js@2/cors";
import { createClient } from "npm:@supabase/supabase-js@2";
import { withSentry } from "../_shared/sentry.ts";
import { requireUser, jsonResponse } from "../_shared/auth.ts";
import { hasAgencyRole, TTO_STAFF, UUID_RE } from "../_shared/tto_access.ts";

Deno.serve(withSentry("tto-approve-ticket", async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });
  const auth = await requireUser(req, corsHeaders);
  if (auth instanceof Response) return auth;

  let body: Record<string, unknown>;
  try { body = await req.json(); } catch { return jsonResponse({ error: "Invalid JSON", code: "bad_request" }, 400, corsHeaders); }

  const time_ticket_id = String(body.time_ticket_id ?? "");
  const decision = String(body.decision ?? "");
  if (!UUID_RE.test(time_ticket_id) || !["approve", "reject", "correction"].includes(decision)) {
    return jsonResponse({ error: "time_ticket_id + decision required", code: "bad_request" }, 400, corsHeaders);
  }

  const admin = createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!);
  const { data: ticket } = await admin.from("tto_time_tickets").select("*").eq("id", time_ticket_id).maybeSingle();
  if (!ticket) return jsonResponse({ error: "Not found", code: "not_found" }, 404, corsHeaders);
  if (!(await hasAgencyRole(admin, auth.user.id, ticket.agency_id, TTO_STAFF))) return jsonResponse({ error: "Forbidden", code: "forbidden" }, 403, corsHeaders);

  const { data: status, error } = await admin.rpc("decide_contracted_time_ticket", {
    _ticket_id: time_ticket_id, _actor_id: auth.user.id, _decision: decision,
    _comment: typeof body.comment === "string" ? body.comment.slice(0, 2000) : null,
  });
  if (error) return jsonResponse({ error: error.message, code: error.code === "42501" ? "forbidden" : "conflict" }, error.code === "42501" ? 403 : 409, corsHeaders);

  return jsonResponse({ ok: true, status }, 200, corsHeaders);
}));
