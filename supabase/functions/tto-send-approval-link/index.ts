// tto-send-approval-link: agency staff send one-time approve/reject links to a
// ticket's client supervisor(s) by email and/or SMS.
import { corsHeaders } from "npm:@supabase/supabase-js@2/cors";
import { createClient } from "npm:@supabase/supabase-js@2";
import { withSentry } from "../_shared/sentry.ts";
import { requireUser, jsonResponse } from "../_shared/auth.ts";
import { sendEmail } from "../_shared/resend.ts";

const UUID = /^[0-9a-f-]{36}$/i;
const ORIGIN_OK = /^(https:\/\/([a-z0-9-]+\.)*(lovable\.app|lovableproject\.com|temptic\.net)|http:\/\/localhost(:\d+)?)$/i;
const DEFAULT_ORIGIN = "https://temptic.lovable.app";
const TTL_HOURS = 72;

async function sha256(s: string) {
  const b = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(s));
  return Array.from(new Uint8Array(b)).map((x) => x.toString(16).padStart(2, "0")).join("");
}
function token() {
  const b = crypto.getRandomValues(new Uint8Array(32));
  return btoa(String.fromCharCode(...b)).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
}
const esc = (s: string) => s.replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]!));

async function sendSms(to: string, text: string): Promise<{ ok: boolean; detail: string }> {
  const lovable = Deno.env.get("LOVABLE_API_KEY");
  const twilio = Deno.env.get("TWILIO_API_KEY");
  const from = Deno.env.get("TWILIO_FROM_NUMBER");
  if (!lovable || !twilio || !from) return { ok: false, detail: "SMS not configured" };
  const r = await fetch("https://connector-gateway.lovable.dev/twilio/Messages.json", {
    method: "POST",
    headers: { Authorization: `Bearer ${lovable}`, "X-Connection-Api-Key": twilio, "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({ To: to, From: from, Body: text }),
  });
  const body = await r.text();
  if (!r.ok) console.error(`Twilio send failed [${r.status}]: ${body}`);
  return { ok: r.ok, detail: r.ok ? "sent" : `[${r.status}] ${body.slice(0, 200)}` };
}

Deno.serve(withSentry("tto-send-approval-link", async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });
  const auth = await requireUser(req, corsHeaders);
  if (auth instanceof Response) return auth;

  let body: Record<string, unknown>;
  try { body = await req.json(); } catch { return jsonResponse({ error: "Invalid JSON", code: "bad_request" }, 400, corsHeaders); }
  const ticketId = String(body.time_ticket_id ?? "");
  const channels = Array.isArray(body.channels) ? body.channels.filter((c) => c === "email" || c === "sms") as string[] : [];
  const origin = typeof body.app_origin === "string" && ORIGIN_OK.test(body.app_origin) ? body.app_origin : DEFAULT_ORIGIN;
  if (!UUID.test(ticketId) || !channels.length) return jsonResponse({ error: "time_ticket_id and channels required", code: "bad_request" }, 400, corsHeaders);

  const admin = createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!);
  const { data: ticket } = await admin.from("tto_time_tickets").select("*").eq("id", ticketId).maybeSingle();
  if (!ticket) return jsonResponse({ error: "Ticket not found", code: "not_found" }, 404, corsHeaders);

  const { data: member } = await admin.from("agency_members").select("id").eq("agency_id", ticket.agency_id)
    .eq("user_id", auth.user.id).eq("is_active", true).maybeSingle();
  if (!member) return jsonResponse({ error: "Not a member of this agency", code: "forbidden" }, 403, corsHeaders);
  if (ticket.status !== "submitted") return jsonResponse({ error: "Only submitted tickets can be sent for approval", code: "bad_request" }, 400, corsHeaders);
  if (!ticket.client_id) return jsonResponse({ error: "Ticket has no client", code: "bad_request" }, 400, corsHeaders);

  let q = admin.from("client_signers").select("id,first_name,email,phone,site_id").eq("client_id", ticket.client_id).eq("is_active", true);
  if (ticket.site_id) q = q.or(`site_id.eq.${ticket.site_id},site_id.is.null`);
  const { data: signers } = await q;
  if (!signers?.length) return jsonResponse({ error: "No active client supervisors for this ticket", code: "bad_request" }, 400, corsHeaders);

  const { data: worker } = await admin.from("workers").select("first_name,last_name").eq("id", ticket.worker_id).maybeSingle();
  const workerName = worker ? `${worker.first_name} ${worker.last_name?.[0] ?? ""}.` : "Worker";
  const hours = `${ticket.regular_hours}h reg${Number(ticket.overtime_hours) ? `, ${ticket.overtime_hours}h OT` : ""}`;
  const expires = new Date(Date.now() + TTL_HOURS * 3600_000).toISOString();

  // Revoke any earlier unused links so only the newest one works.
  await admin.from("tto_approval_links").update({ revoked_at: new Date().toISOString() })
    .eq("time_ticket_id", ticketId).is("used_at", null).is("revoked_at", null);

  const results: Array<{ channel: string; recipient: string; ok: boolean; detail: string }> = [];
  for (const s of signers) {
    for (const ch of channels) {
      const recipient = ch === "email" ? s.email : s.phone;
      if (!recipient) continue;
      const t = token();
      const { error } = await admin.from("tto_approval_links").insert({
        agency_id: ticket.agency_id, time_ticket_id: ticketId, signer_id: s.id, channel: ch,
        recipient, token_hash: await sha256(t), expires_at: expires, created_by: auth.user.id,
      });
      if (error) { results.push({ channel: ch, recipient, ok: false, detail: error.message }); continue; }
      const url = `${origin}/approve/${t}`;
      if (ch === "email") {
        const r = await sendEmail({
          to: recipient,
          subject: `Approve time: ${workerName} on ${ticket.work_date}`,
          html: `<p>Hi ${esc(s.first_name ?? "")},</p><p>${esc(workerName)} submitted time for <b>${esc(ticket.work_date)}</b> (${esc(hours)}).</p>
<p><a href="${url}" style="display:inline-block;padding:12px 20px;background:#1e293b;color:#fff;border-radius:6px;text-decoration:none">Review &amp; approve</a></p>
<p style="color:#64748b;font-size:12px">This link works once and expires in ${TTL_HOURS} hours.</p>`,
          text: `${workerName} submitted time for ${ticket.work_date} (${hours}). Review: ${url}`,
        });
        results.push({ channel: ch, recipient, ok: r.ok, detail: r.ok ? "sent" : r.body.slice(0, 200) });
      } else {
        const r = await sendSms(recipient, `Temp Tic: ${workerName} ${ticket.work_date} (${hours}). Approve or reject: ${url}`);
        results.push({ channel: ch, recipient, ...r });
      }
    }
  }

  await admin.from("tto_audit_events").insert({
    agency_id: ticket.agency_id, time_ticket_id: ticketId, actor_id: auth.user.id, actor_kind: "agency",
    action: "approval_link.sent", updated_value: { results: results.map((r) => ({ channel: r.channel, ok: r.ok })) },
  });

  if (!results.length) return jsonResponse({ error: "Supervisors have no email or phone on file for the chosen method", code: "bad_request" }, 400, corsHeaders);
  return jsonResponse({ ok: results.some((r) => r.ok), results }, 200, corsHeaders);
}));
