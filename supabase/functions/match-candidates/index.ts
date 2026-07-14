// match-candidates: AI Gateway call over the blind_candidate_view.
// Returns ranked suggestions with rationale — never auto-decides.
import { corsHeaders } from "npm:@supabase/supabase-js@2/cors";
import { createClient } from "npm:@supabase/supabase-js@2";
import { withSentry } from "../_shared/sentry.ts";
import { jsonResponse, requireUser } from "../_shared/auth.ts";

Deno.serve(withSentry("match-candidates", async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });

  const auth = await requireUser(req, corsHeaders);
  if (auth instanceof Response) return auth;
  const { user, userClient } = auth;

  const body = await req.json().catch(() => ({}));
  const jobOrderId = typeof body.job_order_id === "string" ? body.job_order_id : null;
  if (!jobOrderId) return jsonResponse({ error: "job_order_id required", code: "bad_request" }, 400, corsHeaders);

  // RLS-enforced job order read
  const { data: job, error: jobErr } = await userClient.from("job_orders").select("*").eq("id", jobOrderId).maybeSingle();
  if (jobErr || !job) return jsonResponse({ error: "forbidden", code: "forbidden" }, 403, corsHeaders);

  // Blind view — DB-level identity redaction
  const { data: candidates, error: cErr } = await userClient
    .from("blind_candidate_view")
    .select("*")
    .eq("agency_id", job.agency_id)
    .limit(50);
  if (cErr) return jsonResponse({ error: cErr.message, code: "internal" }, 500, corsHeaders);

  const lovableKey = Deno.env.get("LOVABLE_API_KEY");
  const admin = createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!);

  let ranked: Array<{ worker_id: string; score: number; rationale: string }> = [];
  let model = "heuristic";
  let status: "succeeded" | "failed" | "partial" = "succeeded";
  let errorMsg: string | null = null;

  if (!lovableKey || !candidates || candidates.length === 0) {
    // Heuristic fallback ranking by completion + credentials
    ranked = (candidates ?? []).map((c: Record<string, unknown>) => ({
      worker_id: String(c.worker_id),
      score: Math.min(100, ((c.completion_score as number) ?? 0) + ((c.verified_credential_count as number) ?? 0) * 5),
      rationale: `Completion ${c.completion_score ?? 0}%, ${c.verified_credential_count ?? 0} verified credentials.`,
    })).sort((a, b) => b.score - a.score).slice(0, 10);
    if (!lovableKey) status = "partial";
  } else {
    model = "google/gemini-2.5-flash";
    try {
      const prompt = `You are ranking anonymized candidates for the job order below. Score each 0-100 by fit and return JSON only.

Job: ${JSON.stringify({ title: job.title, industry: job.industry, location: job.location, description: job.description })}
Candidates: ${JSON.stringify(candidates)}

Return JSON: {"ranked":[{"worker_id":"...","score":0-100,"rationale":"<one sentence>"}]}`;
      const res = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
        method: "POST",
        headers: { "Authorization": `Bearer ${lovableKey}`, "Content-Type": "application/json" },
        body: JSON.stringify({
          model,
          messages: [{ role: "user", content: prompt }],
          response_format: { type: "json_object" },
        }),
      });
      if (!res.ok) throw new Error(`gateway ${res.status}: ${await res.text()}`);
      const raw = await res.json();
      const content = raw?.choices?.[0]?.message?.content ?? "{}";
      const parsed = JSON.parse(content);
      ranked = Array.isArray(parsed.ranked) ? parsed.ranked.slice(0, 10) : [];
    } catch (e) {
      status = "failed";
      errorMsg = e instanceof Error ? e.message : String(e);
    }
  }

  await admin.from("ai_runs").insert({
    agency_id: job.agency_id,
    actor_id: user.id,
    kind: "match_candidates",
    input_ref: jobOrderId,
    input_summary: `${candidates?.length ?? 0} candidates for "${job.title}"`,
    output_summary: `Ranked ${ranked.length}`,
    model,
    status,
    error: errorMsg,
  });

  return jsonResponse({ ranked, model, status }, 200, corsHeaders);
}));
