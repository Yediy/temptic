// automation-suggest: WOIC-backed automation rule suggestions.
// Given a natural-language description, returns a proposed rule shape.
import { corsHeaders } from "npm:@supabase/supabase-js@2/cors";
import { withSentry } from "../_shared/sentry.ts";
import { jsonResponse, requireUser } from "../_shared/auth.ts";
import { lovableAiText } from "../_shared/woic.ts";

Deno.serve(withSentry("automation-suggest", async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });

  const auth = await requireUser(req, corsHeaders);
  if (auth instanceof Response) return auth;

  const body = await req.json().catch(() => ({}));
  const prompt = typeof body.prompt === "string" ? body.prompt.slice(0, 2000) : "";
  if (!prompt) return jsonResponse({ error: "prompt required", code: "invalid_input" }, 400, corsHeaders);

  const system = `You design IWOS automation rules. Respond with:
1. A short plain-English summary.
2. A JSON block for the rule with keys: name, trigger_event, conditions (array), actions (array).

Supported trigger events include: worker.created, worker.updated, job.created, job.closed, ticket.sent, ticket.signed, ticket.rejected, ticket.approved, credential.expiring, training.completed, incident.reported, document.expiring, compliance.violation, placement.created, assignment.completed.

Supported action types: notify, create_task, emit_event, run_agent, call_webhook.

Condition operator vocabulary: eq, neq, gt, lt, gte, lte, in, contains.
Keep it minimal and valid JSON.`;

  const text = await lovableAiText(system, prompt);
  if (!text) return jsonResponse({ error: "AI unavailable", code: "ai_unavailable" }, 503, corsHeaders);

  return jsonResponse({ text }, 200, corsHeaders);
}));
