// woic-api — thin read/write dispatcher for the WOIC intelligence layer.
// Routes `{ service, action, agency_id, params }` to a small allowlist of
// operations, each executed with the caller's user-scoped Supabase client so
// RLS enforces tenant boundaries. Never accepts free-form SQL.
import { corsHeaders } from "npm:@supabase/supabase-js@2/cors";
import { withSentry } from "../_shared/sentry.ts";
import { jsonResponse, requireUser } from "../_shared/auth.ts";
import { isUuid, requireAgencyMember } from "../_shared/woic.ts";

type Body = {
  service?: string;
  action?: string;
  agency_id?: string;
  params?: Record<string, unknown>;
};

Deno.serve(withSentry("woic-api", async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });
  if (req.method !== "POST") return jsonResponse({ error: "method_not_allowed" }, 405, corsHeaders);

  const auth = await requireUser(req, corsHeaders);
  if (auth instanceof Response) return auth;
  const { userClient } = auth;

  const body = (await req.json().catch(() => null)) as Body | null;
  if (!body || typeof body.service !== "string" || typeof body.action !== "string") {
    return jsonResponse({ error: "service and action are required", code: "bad_request" }, 400, corsHeaders);
  }
  if (!isUuid(body.agency_id)) {
    return jsonResponse({ error: "agency_id must be a uuid", code: "bad_request" }, 400, corsHeaders);
  }
  const forbidden = await requireAgencyMember(userClient, body.agency_id, corsHeaders);
  if (forbidden) return forbidden;

  const key = `${body.service}.${body.action}`;
  const p = body.params ?? {};
  const limit = Math.min(Math.max(Number(p.limit ?? 25) | 0, 1), 100);

  try {
    switch (key) {
      case "identity.get": {
        if (!isUuid(p.identity_id)) return jsonResponse({ error: "identity_id required" }, 400, corsHeaders);
        const { data, error } = await userClient
          .from("woic_identities")
          .select("*")
          .eq("id", p.identity_id as string)
          .maybeSingle();
        if (error) throw error;
        return jsonResponse({ data }, 200, corsHeaders);
      }
      case "identity.list_memberships": {
        const { data, error } = await userClient
          .from("woic_identity_memberships")
          .select("id, identity_id, kind, status, metadata, created_at")
          .eq("agency_id", body.agency_id)
          .limit(limit);
        if (error) throw error;
        return jsonResponse({ data }, 200, corsHeaders);
      }
      case "knowledge.search": {
        const q = typeof p.q === "string" ? p.q.trim() : "";
        if (!q) return jsonResponse({ error: "q required" }, 400, corsHeaders);
        const { data, error } = await userClient
          .from("woic_knowledge_articles")
          .select("id, title, tags, status, updated_at")
          .eq("agency_id", body.agency_id)
          .ilike("title", `%${q}%`)
          .limit(limit);
        if (error) throw error;
        return jsonResponse({ data }, 200, corsHeaders);
      }
      case "decision.list": {
        const { data, error } = await userClient
          .from("woic_decisions")
          .select("*")
          .eq("agency_id", body.agency_id)
          .order("created_at", { ascending: false })
          .limit(limit);
        if (error) throw error;
        return jsonResponse({ data }, 200, corsHeaders);
      }
      case "recommendation.list": {
        const q = userClient
          .from("woic_recommendations")
          .select("*")
          .eq("agency_id", body.agency_id)
          .order("score", { ascending: false })
          .limit(limit);
        if (typeof p.subject_entity === "string") q.eq("subject_entity", p.subject_entity);
        if (isUuid(p.subject_id)) q.eq("subject_id", p.subject_id as string);
        const { data, error } = await q;
        if (error) throw error;
        return jsonResponse({ data }, 200, corsHeaders);
      }
      case "compliance.events": {
        const { data, error } = await userClient
          .from("woic_compliance_events")
          .select("*")
          .eq("agency_id", body.agency_id)
          .order("next_action_at", { ascending: true, nullsFirst: false })
          .limit(limit);
        if (error) throw error;
        return jsonResponse({ data }, 200, corsHeaders);
      }
      case "context.get": {
        const { data, error } = await userClient
          .from("woic_context_sessions")
          .select("*")
          .eq("agency_id", body.agency_id)
          .eq("user_id", auth.user.id)
          .maybeSingle();
        if (error) throw error;
        return jsonResponse({ data }, 200, corsHeaders);
      }
      case "context.set": {
        const patch: Record<string, unknown> = { updated_at: new Date().toISOString() };
        for (const k of ["current_worker_id", "current_client_id", "current_job_id", "current_workflow", "active_role"]) {
          if (k in p) patch[k] = (p as Record<string, unknown>)[k];
        }
        const { data, error } = await userClient
          .from("woic_context_sessions")
          .upsert(
            { agency_id: body.agency_id, user_id: auth.user.id, ...patch },
            { onConflict: "user_id,agency_id" },
          )
          .select()
          .maybeSingle();
        if (error) throw error;
        return jsonResponse({ data }, 200, corsHeaders);
      }
      case "org_memory.upsert": {
        const kind = typeof p.kind === "string" ? p.kind : null;
        const memKey = typeof p.key === "string" ? p.key : null;
        if (!kind || !memKey) return jsonResponse({ error: "kind and key required" }, 400, corsHeaders);
        const { data, error } = await userClient
          .from("woic_org_memory")
          .upsert({
            agency_id: body.agency_id,
            kind,
            key: memKey,
            value: (p.value ?? {}) as Record<string, unknown>,
            weight: typeof p.weight === "number" ? p.weight : 1,
            updated_at: new Date().toISOString(),
          }, { onConflict: "agency_id,kind,key" })
          .select()
          .maybeSingle();
        if (error) throw error;
        return jsonResponse({ data }, 200, corsHeaders);
      }
      default:
        return jsonResponse({ error: `unknown action: ${key}`, code: "not_found" }, 404, corsHeaders);
    }
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e);
    return jsonResponse({ error: msg, code: "internal" }, 500, corsHeaders);
  }
}));
