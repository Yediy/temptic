// Unified client-side approval dispatcher.
// Routes { target: "time_ticket"|"invoice"|"request"|"extension", id, decision }
// to the correct downstream mutation, always executed under the caller's RLS.
import { corsHeaders } from "npm:@supabase/supabase-js@2/cors";
import { withSentry } from "../_shared/sentry.ts";
import { jsonResponse, requireUser } from "../_shared/auth.ts";

Deno.serve(withSentry("cc-approve", async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });
  const auth = await requireUser(req, corsHeaders);
  if (auth instanceof Response) return auth;

  const b = (await req.json().catch(() => ({}))) as {
    target?: string; id?: string; decision?: "approve"|"reject"; note?: string;
  };
  if (!b.target || !b.id || !b.decision) {
    return jsonResponse({ error: "target, id, decision required", code: "bad_request" }, 400, corsHeaders);
  }
  const { userClient, user } = auth;
  const decisionText = b.decision === "approve" ? "approved" : "rejected";

  let clientId: string | null = null;
  let agencyId: string | null = null;
  let ok = false;
  let errMsg: string | null = null;

  if (b.target === "time_ticket") {
    const { data, error } = await userClient
      .from("tto_time_tickets")
      .update({ status: decisionText })
      .eq("id", b.id)
      .select("id, client_id, agency_id")
      .maybeSingle();
    ok = !error && !!data; errMsg = error?.message ?? null;
    clientId = data?.client_id ?? null; agencyId = data?.agency_id ?? null;
  } else if (b.target === "invoice") {
    const status = b.decision === "approve" ? "approved" : "rejected";
    const { data, error } = await userClient
      .from("pb_invoices").update({ status }).eq("id", b.id)
      .select("id, client_id, agency_id").maybeSingle();
    ok = !error && !!data; errMsg = error?.message ?? null;
    clientId = data?.client_id ?? null; agencyId = data?.agency_id ?? null;
  } else if (b.target === "request") {
    const status = b.decision === "approve" ? "resolved" : "closed";
    const { data, error } = await userClient
      .from("cc_requests").update({ status }).eq("id", b.id)
      .select("id, client_id, agency_id").maybeSingle();
    ok = !error && !!data; errMsg = error?.message ?? null;
    clientId = data?.client_id ?? null; agencyId = data?.agency_id ?? null;
  } else {
    return jsonResponse({ error: "unsupported target", code: "bad_request" }, 400, corsHeaders);
  }

  if (!ok) return jsonResponse({ error: errMsg ?? "approval_failed", code: "forbidden" }, 403, corsHeaders);

  if (clientId && agencyId) {
    await userClient.from("cc_activities").insert({
      agency_id: agencyId, client_id: clientId, actor_user_id: user.id, actor_kind: "user",
      verb: `${b.target}.${decisionText}`, object_type: b.target, object_id: b.id,
      metadata: { note: b.note ?? null },
    });
    await userClient.from("cc_audit_logs").insert({
      agency_id: agencyId, client_id: clientId, actor_user_id: user.id,
      action: `${b.target}.${decisionText}`, target_type: b.target, target_id: b.id,
      payload: { note: b.note ?? null },
    });
  }
  return jsonResponse({ data: { ok: true } }, 200, corsHeaders);
}));
