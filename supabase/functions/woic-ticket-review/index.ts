// woic-ticket-review — WOIC Reason + Recommend for a client's sign/reject decision.
// POST { ticket_id, refresh?: boolean }
// Access: anyone whose RLS lets them read the ticket (assigned client signer, agency staff).
// WOIC never signs or rejects — it recommends with full explainability; the human decides.
import { corsHeaders } from "npm:@supabase/supabase-js@2/cors";
import { withSentry } from "../_shared/sentry.ts";
import { jsonResponse, requireUser } from "../_shared/auth.ts";
import { admin, isUuid } from "../_shared/woic.ts";
import { cognitiveJson, COGNITIVE_MODEL, GatewayError } from "../_shared/woic-cognitive.ts";
import { guardRecommendation, runTicketChecks } from "./checks.ts";

const clamp = (v: unknown) => Math.max(0, Math.min(1, Number(v) || 0));
const s = (v: unknown, max = 2000) => (typeof v === "string" ? v.slice(0, max) : "");

Deno.serve(withSentry("woic-ticket-review", async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });
  if (req.method !== "POST") return jsonResponse({ error: "method_not_allowed" }, 405, corsHeaders);
  const auth = await requireUser(req, corsHeaders);
  if (auth instanceof Response) return auth;
  const { user, userClient } = auth;

  const body = await req.json().catch(() => null) as { ticket_id?: unknown; refresh?: unknown } | null;
  if (!body || !isUuid(body.ticket_id)) return jsonResponse({ error: "ticket_id must be a UUID", code: "bad_request" }, 400, corsHeaders);

  // RLS-scoped read proves the caller may see this ticket.
  const { data: ticket } = await userClient.from("tickets").select("*, ticket_days(*)").eq("id", body.ticket_id).maybeSingle();
  if (!ticket) return jsonResponse({ error: "Ticket not found or not accessible", code: "forbidden" }, 403, corsHeaders);

  const db = admin();
  if (body.refresh !== true) {
    const { data: cached } = await db.from("ticket_ai_reviews").select("*").eq("ticket_id", ticket.id)
      .eq("ticket_version", ticket.version_number ?? 1).is("final_decision", null)
      .gte("created_at", new Date(Date.now() - 24 * 3600_000).toISOString())
      .order("created_at", { ascending: false }).limit(1).maybeSingle();
    if (cached) return jsonResponse({ review: cached, cached: true }, 200, corsHeaders);
  }

  const checks = runTicketChecks(ticket);

  // History (no personal data sent to the model — counts and reasons only).
  const [{ data: siteHistory }, { data: workerHistory }] = await Promise.all([
    db.from("tickets").select("status, rejection_reason, total_hours").eq("agency_id", ticket.agency_id)
      .eq("site_id", ticket.site_id).neq("id", ticket.id).in("status", ["signed", "rejected", "closed", "corrected"])
      .order("created_at", { ascending: false }).limit(30),
    db.from("tickets").select("status, rejection_reason, total_hours").eq("agency_id", ticket.agency_id)
      .eq("worker_id", ticket.worker_id).neq("id", ticket.id).in("status", ["signed", "rejected", "closed", "corrected"])
      .order("created_at", { ascending: false }).limit(30),
  ]);
  const summarize = (rows: { status: string; rejection_reason: string | null; total_hours: number | null }[] | null) => {
    const r = rows ?? [];
    const hours = r.map((x) => Number(x.total_hours) || 0).filter((h) => h > 0);
    return {
      decided: r.length,
      rejected: r.filter((x) => x.status === "rejected" || x.status === "corrected").length,
      avg_hours: hours.length ? +(hours.reduce((a, b) => a + b, 0) / hours.length).toFixed(2) : null,
      recent_rejection_reasons: r.map((x) => x.rejection_reason).filter(Boolean).slice(0, 5),
    };
  };

  const facts = {
    ticket: {
      type: ticket.ticket_type, version: ticket.version_number, status: ticket.status,
      work_date: ticket.work_date, week: [ticket.week_start_date, ticket.week_end_date],
      job_title: ticket.job_title, start_time: ticket.start_time, total_hours: ticket.total_hours,
      lunch_required: ticket.lunch_required, previous_rejection_reason: ticket.rejection_reason,
      days: (ticket.ticket_days ?? []).map((d: Record<string, unknown>) => ({
        date: d.day_date, start: d.start_time, end: d.end_time, lunch: [d.lunch_start, d.lunch_end],
        regular: d.regular_hours, overtime: d.overtime_hours, total: d.total_hours,
      })),
    },
    automated_checks: checks,
    site_history: summarize(siteHistory),
    worker_history: summarize(workerHistory),
  };

  type Out = {
    steps: { kind: string; content: string; confidence?: number }[];
    recommendation: string; confidence: number; summary: string;
    evidence: { source: string; detail: string }[];
    risks: string[];
    alternatives: { option: string; rationale: string; confidence?: number }[];
    suggested_rejection_reason: string;
  };
  let out: Out;
  try {
    out = await cognitiveJson<Out>(
      `You are WOIC, reviewing a staffing time ticket for the client supervisor who must sign (approve) or reject it.
Step 1 — REASON: 3-6 steps (kinds: observation, analysis, check, conclusion) grounded ONLY in the supplied facts. Never invent data.
Step 2 — RECOMMEND exactly one of "sign", "reject", "review" (review = not enough information / human judgement needed).
Any automated check with status "fail" means you must NOT recommend "sign".
Evidence items must cite a source: "automated_checks", "ticket", "site_history" or "worker_history".
Always include at least one alternative and the risks of following your recommendation.
If recommending reject or review, write a short, polite, factual rejection reason the client could send (otherwise empty string).
Write for a non-technical site supervisor. Confidence is 0-1.`,
      JSON.stringify(facts),
      '{"steps":[{"kind":"","content":"","confidence":0}],"recommendation":"sign|reject|review","confidence":0,"summary":"","evidence":[{"source":"","detail":""}],"risks":[""],"alternatives":[{"option":"","rationale":"","confidence":0}],"suggested_rejection_reason":""}',
    );
  } catch (e) {
    if (e instanceof GatewayError) return jsonResponse({ error: e.message, code: "ai_unavailable" }, e.status, corsHeaders);
    throw e;
  }

  const recommendation = guardRecommendation(String(out.recommendation ?? "").toLowerCase(), checks);
  const confidence = clamp(out.confidence);
  const steps = (out.steps ?? []).slice(0, 8).map((x) => ({ kind: s(x.kind, 40) || "analysis", content: s(x.content), confidence: clamp(x.confidence) }));
  const guarded = recommendation !== String(out.recommendation ?? "").toLowerCase();
  if (guarded) steps.push({ kind: "check", content: "Safety rule: a failed automatic check means WOIC cannot recommend signing, so this was changed to 'needs review'.", confidence: 1 });

  // Agency-side explainability: mirror into WOIC reasoning + decision records.
  const { data: trace } = await db.from("woic_reasoning_traces").insert({
    agency_id: ticket.agency_id, user_id: user.id, domain: "ticket_approval",
    question: `Should ticket ${ticket.ticket_number ?? ticket.id} be signed?`,
    conclusion: s(out.summary, 8000), confidence, evidence: out.evidence ?? [], alternatives: out.alternatives ?? [],
    risk: { factors: out.risks ?? [] }, explanation: s(out.summary, 8000), subject_entity: "ticket", subject_id: ticket.id,
  }).select("id").maybeSingle();
  if (trace?.id && steps.length) {
    await db.from("woic_reasoning_steps").insert(steps.map((x, i) => ({ trace_id: trace.id, agency_id: ticket.agency_id, step_no: i + 1, kind: x.kind, content: x.content, confidence: x.confidence, data: {} })));
  }
  const { data: decision } = await db.from("woic_decisions").insert({
    agency_id: ticket.agency_id, kind: "ticket_approval", subject_entity: "ticket", subject_id: ticket.id,
    confidence, reasoning: s(out.summary, 4000), alternative_options: out.alternatives ?? [],
    source: { engine: "woic-ticket-review", recommendation, checks: checks.map((c) => ({ id: c.id, status: c.status })) },
  }).select("id").maybeSingle();

  const { data: review, error } = await db.from("ticket_ai_reviews").insert({
    ticket_id: ticket.id, agency_id: ticket.agency_id, ticket_version: ticket.version_number ?? 1, requested_by: user.id,
    recommendation, confidence, summary: s(out.summary, 4000), reasoning_steps: steps,
    evidence: (out.evidence ?? []).slice(0, 12), risks: (out.risks ?? []).slice(0, 8), alternatives: (out.alternatives ?? []).slice(0, 4),
    checks, suggested_rejection_reason: recommendation === "sign" ? null : s(out.suggested_rejection_reason, 1000) || null,
    model: COGNITIVE_MODEL, reasoning_trace_id: trace?.id ?? null, decision_id: decision?.id ?? null,
  }).select("*").single();
  if (error) throw error;
  return jsonResponse({ review, cached: false }, 200, corsHeaders);
}));
