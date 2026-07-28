import { corsHeaders } from "npm:@supabase/supabase-js@2/cors";
import { withSentry } from "../_shared/sentry.ts";
import { jsonResponse, requireUser } from "../_shared/auth.ts";

const KINDS = new Set([
  "additional_workers","replacement","schedule_change",
  "payroll_question","billing_question","compliance_review","general",
]);

Deno.serve(withSentry("cc-create-request", async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });
  if (req.method !== "POST") return jsonResponse({ error: "method_not_allowed" }, 405, corsHeaders);
  const auth = await requireUser(req, corsHeaders);
  if (auth instanceof Response) return auth;

  const b = await req.json().catch(() => null) as null | {
    client_id?: string; kind?: string; subject?: string; body?: string;
    priority?: string; metadata?: Record<string, unknown>;
  };
  if (!b?.client_id || !b.subject?.trim() || !b.kind || !KINDS.has(b.kind)) {
    return jsonResponse({ error: "client_id, subject, valid kind required", code: "bad_request" }, 400, corsHeaders);
  }

  const { userClient, user } = auth;
  const { data: client } = await userClient
    .from("clients").select("id, agency_id").eq("id", b.client_id).maybeSingle();
  if (!client) return jsonResponse({ error: "client_not_found", code: "not_found" }, 404, corsHeaders);

  const { data, error } = await userClient.from("cc_requests").insert({
    agency_id: client.agency_id, client_id: client.id,
    kind: b.kind, subject: b.subject.trim(), body: b.body ?? null,
    priority: b.priority ?? "normal", created_by: user.id,
    metadata: b.metadata ?? {},
  }).select().maybeSingle();
  if (error) return jsonResponse({ error: error.message, code: "internal" }, 500, corsHeaders);

  await userClient.from("cc_activities").insert({
    agency_id: client.agency_id, client_id: client.id,
    actor_user_id: user.id, actor_kind: "user",
    verb: "request.created", object_type: "cc_request", object_id: data!.id,
    metadata: { kind: b.kind, subject: b.subject },
  });
  // Emit TTOS event best-effort
  await userClient.from("ttos_events").insert({
    agency_id: client.agency_id, kind: "cc.request.created",
    payload: { request_id: data!.id, client_id: client.id, kind: b.kind, subject: b.subject },
  }).then(() => null, () => null);

  return jsonResponse({ data }, 200, corsHeaders);
}));
