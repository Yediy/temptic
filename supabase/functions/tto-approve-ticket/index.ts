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

  await admin.from("tto_ticket_approvals").insert({
    agency_id: ticket.agency_id, time_ticket_id,
    approver_id: auth.user.id, approver_kind: "agency",
    decision, comment: body.comment ?? null, channel: "portal",
  });

  const status = decision === "approve" ? "approved" : decision === "reject" ? "rejected" : "corrected";
  const patch: Record<string, unknown> = { status };
  if (decision === "approve") { patch.approved_at = new Date().toISOString(); patch.approved_by = auth.user.id; }
  await admin.from("tto_time_tickets").update(patch).eq("id", time_ticket_id);

  await admin.from("tto_audit_events").insert({
    agency_id: ticket.agency_id, time_ticket_id, actor_id: auth.user.id, actor_kind: "agency",
    action: `ticket.${decision}`, reason: body.comment ? String(body.comment) : null,
  });

  await admin.from("ttos_events").insert({
    agency_id: ticket.agency_id, module: "time_ticket", name: `time.ticket.${decision}`,
    actor_id: auth.user.id, entity_type: "tto_time_ticket", entity_id: time_ticket_id,
    metadata: { comment: body.comment ?? null },
  });

  return jsonResponse({ ok: true, status }, 200, corsHeaders);
}));
