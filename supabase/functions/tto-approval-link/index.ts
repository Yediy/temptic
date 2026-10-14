// tto-approval-link (public): view a ticket via one-time token and approve/reject it.
import { corsHeaders } from "npm:@supabase/supabase-js@2/cors";
import { createClient } from "npm:@supabase/supabase-js@2";
import { withSentry } from "../_shared/sentry.ts";
import { jsonResponse } from "../_shared/auth.ts";

async function sha256(s: string) {
  const b = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(s));
  return Array.from(new Uint8Array(b)).map((x) => x.toString(16).padStart(2, "0")).join("");
}

Deno.serve(withSentry("tto-approval-link", async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });
  if (req.method !== "POST") return jsonResponse({ error: "Method not allowed", code: "bad_request" }, 405, corsHeaders);

  let body: Record<string, unknown>;
  try { body = await req.json(); } catch { return jsonResponse({ error: "Invalid JSON", code: "bad_request" }, 400, corsHeaders); }
  const tok = String(body.token ?? "");
  const action = String(body.action ?? "view");
  if (!/^[A-Za-z0-9_-]{40,64}$/.test(tok) || !["view", "approve", "reject"].includes(action)) {
    return jsonResponse({ error: "Invalid link", code: "bad_request" }, 400, corsHeaders);
  }
  const comment = typeof body.comment === "string" ? body.comment.slice(0, 1000).trim() : "";
  if (action === "reject" && !comment) return jsonResponse({ error: "A reason is required to reject", code: "bad_request" }, 400, corsHeaders);

  const admin = createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!);
  const { data: link } = await admin.from("tto_approval_links").select("*").eq("token_hash", await sha256(tok)).maybeSingle();
  if (!link) return jsonResponse({ error: "This link is invalid", code: "not_found" }, 404, corsHeaders);

  const state = link.revoked_at ? "revoked" : link.used_at ? "used" : new Date(link.expires_at) < new Date() ? "expired" : "active";
  const { data: ticket } = await admin.from("tto_time_tickets")
    .select("id,agency_id,work_date,actual_start,actual_end,regular_hours,overtime_hours,double_time_hours,break_minutes,worker_notes,status,worker_id,site_id")
    .eq("id", link.time_ticket_id).maybeSingle();
  if (!ticket) return jsonResponse({ error: "Ticket not found", code: "not_found" }, 404, corsHeaders);
  const { data: worker } = await admin.from("workers").select("first_name,last_name").eq("id", ticket.worker_id).maybeSingle();
  const { data: site } = ticket.site_id ? await admin.from("client_sites").select("site_name").eq("id", ticket.site_id).maybeSingle() : { data: null };

  const view = {
    state, decision: link.decision, expires_at: link.expires_at,
    ticket: {
      work_date: ticket.work_date, actual_start: ticket.actual_start, actual_end: ticket.actual_end,
      regular_hours: ticket.regular_hours, overtime_hours: ticket.overtime_hours, double_time_hours: ticket.double_time_hours,
      break_minutes: ticket.break_minutes, worker_notes: ticket.worker_notes, status: ticket.status,
      worker_name: worker ? `${worker.first_name} ${worker.last_name}` : null, site_name: site?.site_name ?? null,
    },
  };
  if (action === "view") return jsonResponse(view, 200, corsHeaders);

  if (state !== "active") return jsonResponse({ error: `This link has ${state === "used" ? "already been used" : state === "expired" ? "expired" : "been replaced"}`, code: "gone" }, 410, corsHeaders);
  if (ticket.status !== "submitted") return jsonResponse({ error: "This ticket is no longer awaiting approval", code: "conflict" }, 409, corsHeaders);

  // Atomically claim the link so it can only be used once.
  const now = new Date().toISOString();
  const ip = req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ?? null;
  const ua = req.headers.get("user-agent")?.slice(0, 500) ?? null;
  const { data: claimed } = await admin.from("tto_approval_links")
    .update({ used_at: now, decision: action, decision_ip: ip, decision_user_agent: ua })
    .eq("id", link.id).is("used_at", null).is("revoked_at", null).select("id").maybeSingle();
  if (!claimed) return jsonResponse({ error: "This link has already been used", code: "gone" }, 410, corsHeaders);
  await admin.from("tto_approval_links").update({ revoked_at: now })
    .eq("time_ticket_id", ticket.id).is("used_at", null).is("revoked_at", null);

  const { data: signer } = link.signer_id ? await admin.from("client_signers").select("user_id").eq("id", link.signer_id).maybeSingle() : { data: null };
  const approverId = signer?.user_id ?? null;
  const decision = action === "approve" ? "approve" : "reject";
  const status = decision === "approve" ? "approved" : "rejected";

  await admin.from("tto_ticket_approvals").insert({
    agency_id: ticket.agency_id, time_ticket_id: ticket.id, approver_id: approverId, approver_kind: "client",
    decision, comment: comment || null, channel: link.channel,
  });
  const patch: Record<string, unknown> = { status };
  if (decision === "approve") { patch.approved_at = now; patch.approved_by = approverId; }
  await admin.from("tto_time_tickets").update(patch).eq("id", ticket.id);
  await admin.from("tto_audit_events").insert({
    agency_id: ticket.agency_id, time_ticket_id: ticket.id, actor_id: approverId, actor_kind: "client",
    action: `ticket.${decision}`, reason: comment || null,
    updated_value: { via: "approval_link", channel: link.channel, recipient: link.recipient, ip, user_agent: ua },
  });
  await admin.from("ttos_events").insert({
    agency_id: ticket.agency_id, module: "time_ticket", name: `time.ticket.${decision}`,
    actor_id: approverId, entity_type: "tto_time_ticket", entity_id: ticket.id,
    metadata: { via: "approval_link", channel: link.channel },
  });

  return jsonResponse({ ok: true, status }, 200, corsHeaders);
}));
