// AI Career Coach: generates career_recommendations + passport_opportunities via WOIC + Lovable AI.
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";
import { corsHeaders, jsonResponse, requireUser } from "../_shared/auth.ts";
import { withSentry } from "../_shared/sentry.ts";

Deno.serve(withSentry("passport-career-coach", async (req: Request) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });

  const gate = await requireUser(req);
  if (!gate.ok) return gate.response;
  const { userClient } = gate;

  let body: { passport_id?: string };
  try { body = await req.json(); } catch { body = {}; }
  const passportId = body.passport_id;
  if (!passportId) return jsonResponse({ error: "passport_id required", code: "bad_request" }, 400, corsHeaders);

  // RLS gate.
  const { data: passport, error: pe } = await userClient
    .from("workforce_passports").select("*, workers!inner(id, first_name, last_name)")
    .eq("id", passportId).maybeSingle();
  if (pe || !passport) return jsonResponse({ error: "not_found", code: "not_found" }, 404, corsHeaders);

  const admin = createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!);
  const workerId = (passport as any).workers.id;

  const [skills, creds, empl] = await Promise.all([
    admin.from("worker_skills").select("skill, level").eq("worker_id", workerId).limit(50),
    admin.from("worker_credentials").select("name, expires_on").eq("worker_id", workerId).limit(50),
    admin.from("employment_history").select("employer, role, started_on, ended_on").eq("worker_id", workerId).limit(20),
  ]);

  const summary = {
    skills: (skills.data ?? []).map((s: any) => `${s.skill}(${s.level ?? "n/a"})`).join(", ") || "none",
    certifications: (creds.data ?? []).map((c: any) => c.name).join(", ") || "none",
    experience_years: (empl.data ?? []).length,
    recent_roles: (empl.data ?? []).slice(0, 5).map((e: any) => `${e.role ?? "?"} @ ${e.employer}`).join("; "),
  };

  const apiKey = Deno.env.get("LOVABLE_API_KEY");
  let recs: Array<{ category: string; title: string; description: string; priority: number }> = [];

  if (apiKey) {
    const prompt = `You are a workforce career coach. Given this worker profile, return 5-8 short, high-impact recommendations.
Profile:
- Skills: ${summary.skills}
- Certifications: ${summary.certifications}
- Recent employment: ${summary.recent_roles} (${summary.experience_years} entries)

Return strict JSON: {"recommendations":[{"category":"training|certification|skill|career|income|next_best_action","title":"...","description":"...","priority":1-10}]}`;

    try {
      const res = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Lovable-API-Key": apiKey,
          "X-Lovable-AIG-SDK": "edge-function-fetch",
        },
        body: JSON.stringify({
          model: "google/gemini-2.5-flash",
          messages: [
            { role: "system", content: "You return strict JSON only. No markdown fences." },
            { role: "user", content: prompt },
          ],
          response_format: { type: "json_object" },
        }),
      });
      if (res.ok) {
        const json = await res.json();
        const content = json?.choices?.[0]?.message?.content ?? "{}";
        const parsed = JSON.parse(content);
        recs = Array.isArray(parsed?.recommendations) ? parsed.recommendations : [];
      }
    } catch (_e) {
      recs = [];
    }
  }

  // Fallback deterministic recs.
  if (recs.length === 0) {
    recs = [
      { category: "next_best_action", title: "Complete your profile", description: "Add missing skills and credentials to unlock more opportunities.", priority: 9 },
      { category: "certification", title: "Consider OSHA 10", description: "Widely required across industrial staffing roles.", priority: 7 },
      { category: "skill", title: "Highlight top skills", description: "Rank your strongest skills at Advanced or Expert level.", priority: 6 },
    ];
  }

  const rows = recs.slice(0, 10).map((r) => ({
    passport_id: passportId,
    category: ["career", "training", "certification", "skill", "income", "next_best_action"].includes(r.category) ? r.category : "career",
    title: String(r.title).slice(0, 200),
    description: String(r.description ?? "").slice(0, 1000),
    priority: Math.max(0, Math.min(10, Number(r.priority) || 5)),
    source: apiKey ? "woic-ai" : "fallback",
  }));

  const { error: ie } = await admin.from("career_recommendations").insert(rows);
  if (ie) return jsonResponse({ error: ie.message, code: "server_error" }, 500, corsHeaders);

  // Also insert as opportunities where category is training/certification.
  const oppRows = rows.filter((r) => ["training", "certification"].includes(r.category)).map((r) => ({
    passport_id: passportId,
    kind: r.category,
    title: r.title,
    description: r.description,
    score: r.priority * 10,
    reasoning: `AI career coach: ${r.category} recommendation`,
  }));
  if (oppRows.length) await admin.from("passport_opportunities").insert(oppRows);

  await admin.from("passport_timeline").insert({
    passport_id: passportId,
    event_type: "career_coach_run",
    title: "AI Career Coach analyzed passport",
    description: `${rows.length} recommendations generated.`,
  });

  return jsonResponse({ ok: true, count: rows.length }, 200, corsHeaders);
}));
