// woic-recommend — generates ranked recommendations (worker↔job today) and
// persists them to woic_recommendations. Deterministic scoring on top of
// existing tables; RLS enforces read/write scoping via a member check.
import { corsHeaders } from "npm:@supabase/supabase-js@2/cors";
import { withSentry } from "../_shared/sentry.ts";
import { jsonResponse, requireUser } from "../_shared/auth.ts";
import { admin, isUuid, requireAgencyMember } from "../_shared/woic.ts";

type Body = {
  agency_id?: string;
  kind?: "worker_for_job" | "job_for_worker";
  subject_id?: string; // job_id or worker_id
  limit?: number;
};

Deno.serve(withSentry("woic-recommend", async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });
  if (req.method !== "POST") return jsonResponse({ error: "method_not_allowed" }, 405, corsHeaders);

  const auth = await requireUser(req, corsHeaders);
  if (auth instanceof Response) return auth;

  const body = (await req.json().catch(() => null)) as Body | null;
  if (!body || !isUuid(body.agency_id) || !isUuid(body.subject_id)) {
    return jsonResponse({ error: "agency_id and subject_id required (uuid)", code: "bad_request" }, 400, corsHeaders);
  }
  const kind = body.kind ?? "worker_for_job";
  if (kind !== "worker_for_job" && kind !== "job_for_worker") {
    return jsonResponse({ error: "invalid kind", code: "bad_request" }, 400, corsHeaders);
  }
  const forbidden = await requireAgencyMember(auth.userClient, body.agency_id!, corsHeaders);
  if (forbidden) return forbidden;

  const limit = Math.min(Math.max(Number(body.limit ?? 10) | 0, 1), 50);
  const db = admin();

  try {
    const now = new Date().toISOString();
    const expires = new Date(Date.now() + 24 * 3600 * 1000).toISOString();
    const recs: Array<Record<string, unknown>> = [];

    if (kind === "worker_for_job") {
      const { data: job, error: jErr } = await db
        .from("job_orders")
        .select("id, agency_id, required_skills")
        .eq("id", body.subject_id!)
        .eq("agency_id", body.agency_id!)
        .maybeSingle();
      if (jErr) throw jErr;
      if (!job) return jsonResponse({ error: "job not found", code: "not_found" }, 404, corsHeaders);

      const { data: workers, error: wErr } = await db
        .from("workers")
        .select("id, first_name, last_name, skills, status")
        .eq("agency_id", body.agency_id!)
        .eq("status", "active")
        .limit(500);
      if (wErr) throw wErr;

      const required = (Array.isArray((job as { required_skills?: unknown }).required_skills)
        ? (job as { required_skills: string[] }).required_skills
        : []).map((s) => String(s).toLowerCase());

      for (const w of workers ?? []) {
        const wSkills = (Array.isArray((w as { skills?: unknown }).skills)
          ? (w as { skills: string[] }).skills
          : []).map((s) => String(s).toLowerCase());
        const matched = required.filter((s) => wSkills.includes(s));
        const score = required.length === 0 ? 0.5 : matched.length / required.length;
        recs.push({
          agency_id: body.agency_id,
          kind,
          subject_entity: "job_order",
          subject_id: job.id,
          target_entity: "worker",
          target_id: (w as { id: string }).id,
          score,
          reasoning: `Matched ${matched.length}/${required.length} required skills`,
          why: { matched_skills: matched, worker_skills: wSkills },
          status: "proposed",
          expires_at: expires,
          created_at: now,
          updated_at: now,
        });
      }
    } else {
      const { data: worker, error: wErr } = await db
        .from("workers")
        .select("id, agency_id, skills")
        .eq("id", body.subject_id!)
        .eq("agency_id", body.agency_id!)
        .maybeSingle();
      if (wErr) throw wErr;
      if (!worker) return jsonResponse({ error: "worker not found", code: "not_found" }, 404, corsHeaders);

      const { data: jobs, error: jErr } = await db
        .from("job_orders")
        .select("id, title, required_skills, status")
        .eq("agency_id", body.agency_id!)
        .in("status", ["open", "active"])
        .limit(500);
      if (jErr) throw jErr;

      const wSkills = (Array.isArray((worker as { skills?: unknown }).skills)
        ? (worker as { skills: string[] }).skills
        : []).map((s) => String(s).toLowerCase());

      for (const j of jobs ?? []) {
        const required = (Array.isArray((j as { required_skills?: unknown }).required_skills)
          ? (j as { required_skills: string[] }).required_skills
          : []).map((s) => String(s).toLowerCase());
        const matched = required.filter((s) => wSkills.includes(s));
        const score = required.length === 0 ? 0.5 : matched.length / required.length;
        recs.push({
          agency_id: body.agency_id,
          kind,
          subject_entity: "worker",
          subject_id: worker.id,
          target_entity: "job_order",
          target_id: (j as { id: string }).id,
          score,
          reasoning: `Matched ${matched.length}/${required.length} required skills`,
          why: { matched_skills: matched },
          status: "proposed",
          expires_at: expires,
          created_at: now,
          updated_at: now,
        });
      }
    }

    recs.sort((a, b) => (b.score as number) - (a.score as number));
    const top = recs.slice(0, limit);

    if (top.length) {
      const { error: iErr } = await db.from("woic_recommendations").insert(top);
      if (iErr) throw iErr;
    }
    return jsonResponse({ count: top.length, recommendations: top }, 200, corsHeaders);
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e);
    return jsonResponse({ error: msg, code: "internal" }, 500, corsHeaders);
  }
}));
