import { corsHeaders } from "npm:@supabase/supabase-js@2/cors";
import { withSentry } from "../_shared/sentry.ts";
import { jsonResponse, requireUser } from "../_shared/auth.ts";

Deno.serve(withSentry("cc-send-message", async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });
  if (req.method !== "POST") return jsonResponse({ error: "method_not_allowed" }, 405, corsHeaders);
  const auth = await requireUser(req, corsHeaders);
  if (auth instanceof Response) return auth;

  const body = await req.json().catch(() => null) as null | {
    thread_id?: string; body?: string; attachments?: unknown[]; sender_kind?: string;
  };
  if (!body?.thread_id || !body.body?.trim()) {
    return jsonResponse({ error: "thread_id and body required", code: "bad_request" }, 400, corsHeaders);
  }

  const { userClient, user } = auth;
  const { data: thread, error: tErr } = await userClient
    .from("cc_threads").select("id, agency_id, client_id").eq("id", body.thread_id).maybeSingle();
  if (tErr || !thread) return jsonResponse({ error: "thread_not_found", code: "not_found" }, 404, corsHeaders);

  const { data: msg, error } = await userClient.from("cc_messages").insert({
    agency_id: thread.agency_id,
    client_id: thread.client_id,
    thread_id: thread.id,
    sender_user_id: user.id,
    sender_kind: body.sender_kind ?? "agency",
    body: body.body.trim(),
    attachments: body.attachments ?? [],
  }).select().maybeSingle();
  if (error) return jsonResponse({ error: error.message, code: "internal" }, 500, corsHeaders);

  await userClient.from("cc_threads").update({ last_message_at: new Date().toISOString() }).eq("id", thread.id);
  await userClient.from("cc_activities").insert({
    agency_id: thread.agency_id, client_id: thread.client_id,
    actor_user_id: user.id, actor_kind: "user",
    verb: "message.sent", object_type: "cc_thread", object_id: thread.id,
    metadata: { preview: body.body.slice(0, 120) },
  });
  return jsonResponse({ data: msg }, 200, corsHeaders);
}));
