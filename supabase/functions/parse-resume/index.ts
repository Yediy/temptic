// Mock résumé parser adapter: writes a completed run with suggestions inferred
// from the worker's existing profile so the UI wiring can be tested end-to-end
// without spending AI credits. Swap the `mockSuggestions` block with a real
// AI Gateway call in Phase 3.
import { corsHeaders } from "npm:@supabase/supabase-js@2/cors";
import { createClient } from "npm:@supabase/supabase-js@2";
import { withSentry } from "../_shared/sentry.ts";
import { requireUser, jsonResponse, unauthorizedResponse } from "../_shared/auth.ts";

Deno.serve(withSentry("parse-resume", async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });

  const authHeader = req.headers.get("authorization") || "";
  if (!/^Bearer\s+\S/i.test(authHeader)) return unauthorizedResponse();

  const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
  const anonKey = Deno.env.get("SUPABASE_ANON_KEY")!;
  const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
  const userClient = createClient(supabaseUrl, anonKey, {
    global: { headers: { Authorization: authHeader } },
  });
  const admin = createClient(supabaseUrl, serviceKey);

  const user = await requireUser(userClient);
  if (!user) return unauthorizedResponse();

  const body = await req.json().catch(() => ({}));
  const workerId = typeof body.worker_id === "string" ? body.worker_id : null;
  const documentId = typeof body.document_id === "string" ? body.document_id : null;
  if (!workerId) return jsonResponse({ error: "worker_id required", code: "bad_request" }, 400);

  // RLS check: caller must be able to read the worker (agency staff only).
  const { data: worker, error: wErr } = await userClient.from("workers").select("id, first_name, last_name").eq("id", workerId).maybeSingle();
  if (wErr || !worker) return jsonResponse({ error: "forbidden", code: "forbidden" }, 403);

  const { data: profile } = await admin.from("worker_profiles").select("*").eq("worker_id", workerId).maybeSingle();

  const mockSuggestions = {
    bio: profile?.bio || `${worker.first_name} ${worker.last_name} — experienced field worker with strong safety record.`,
    years_experience: profile?.years_experience || 5,
    trade_specialties: profile?.trade_specialties?.length ? profile.trade_specialties : ["General labor", "Rigging"],
    languages: profile?.languages?.length ? profile.languages : ["English"],
    employment_history: [
      { employer: "Prior contractor", role: "Journeyman", started_on: "2021-01-01", ended_on: null, description: "Field work, rigging, safety compliance." },
    ],
  };

  const { data: run, error: runErr } = await admin
    .from("resume_parse_runs")
    .insert({
      worker_id: workerId,
      document_id: documentId,
      provider: "mock",
      status: "completed",
      suggestions: mockSuggestions,
      created_by: user.id,
    })
    .select()
    .single();
  if (runErr) return jsonResponse({ error: runErr.message, code: "internal" }, 500);

  return jsonResponse({ run_id: run.id, suggestions: mockSuggestions });
}));
