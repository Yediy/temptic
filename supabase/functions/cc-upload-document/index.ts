// Issues a short-lived signed upload URL for the client-documents bucket
// and records a cc_documents row + audit log entry.
import { corsHeaders } from "npm:@supabase/supabase-js@2/cors";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";
import { withSentry } from "../_shared/sentry.ts";
import { jsonResponse, requireUser } from "../_shared/auth.ts";

Deno.serve(withSentry("cc-upload-document", async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });
  const auth = await requireUser(req, corsHeaders);
  if (auth instanceof Response) return auth;

  const b = (await req.json().catch(() => ({}))) as {
    client_id?: string; name?: string; category?: string; version?: number; parent_id?: string;
  };
  if (!b.client_id || !b.name) return jsonResponse({ error: "client_id and name required", code: "bad_request" }, 400, corsHeaders);

  const { userClient, user } = auth;
  const { data: client } = await userClient.from("clients").select("id, agency_id").eq("id", b.client_id).maybeSingle();
  if (!client) return jsonResponse({ error: "client_not_found", code: "not_found" }, 404, corsHeaders);

  const safeName = b.name.replace(/[^\w.\-]+/g, "_");
  const path = `${client.agency_id}/${client.id}/${Date.now()}-${safeName}`;
  const admin = createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!);
  const { data: signed, error: sErr } = await admin.storage.from("client-documents").createSignedUploadUrl(path);
  if (sErr) return jsonResponse({ error: sErr.message, code: "internal" }, 500, corsHeaders);

  const { data: doc, error } = await userClient.from("cc_documents").insert({
    agency_id: client.agency_id, client_id: client.id,
    category: (b.category as string) ?? "other",
    name: b.name, storage_path: path,
    version: b.version ?? 1, parent_id: b.parent_id ?? null,
    uploaded_by: user.id,
  }).select().maybeSingle();
  if (error) return jsonResponse({ error: error.message, code: "internal" }, 500, corsHeaders);

  await userClient.from("cc_audit_logs").insert({
    agency_id: client.agency_id, client_id: client.id,
    actor_user_id: user.id, action: "document.upload_requested",
    target_type: "cc_document", target_id: doc!.id, payload: { path, name: b.name },
  });

  return jsonResponse({ data: { document: doc, upload: signed } }, 200, corsHeaders);
}));
