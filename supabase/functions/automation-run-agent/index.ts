// automation-run-agent: execute an AI agent by id. Logs to automation_agent_runs.
import { corsHeaders } from "npm:@supabase/supabase-js@2/cors";
import { createClient } from "npm:@supabase/supabase-js@2";
import { withSentry } from "../_shared/sentry.ts";
import { jsonResponse, requireUser } from "../_shared/auth.ts";
import { lovableAiText } from "../_shared/woic.ts";

Deno.serve(withSentry("automation-run-agent", async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });

  const auth = await requireUser(req, corsHeaders);
  if (auth instanceof Response) return auth;

  const body = await req.json().catch(() => ({}));
  const agentId = typeof body.agent_id === "string" ? body.agent_id : null;
  const input = (body.input ?? {}) as Record<string, unknown>;
  if (!agentId) return jsonResponse({ error: "agent_id required", code: "invalid_input" }, 400, corsHeaders);

  const admin = createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!);

  // Fetch agent; RLS on user client enforces access
  const { data: agent, error } = await auth.userClient
    .from("automation_agents")
    .select("*")
    .eq("id", agentId)
    .maybeSingle();
  if (error || !agent) return jsonResponse({ error: "agent not found", code: "not_found" }, 404, corsHeaders);
  if (!(agent as { enabled: boolean }).enabled) {
    return jsonResponse({ error: "agent disabled", code: "disabled" }, 400, corsHeaders);
  }

  const started = Date.now();
  const { data: run } = await admin.from("automation_agent_runs").insert({
    agency_id: (agent as { agency_id: string }).agency_id,
    agent_id: agentId,
    input,
    status: "running",
  }).select("id").single();

  try {
    const userMsg = typeof input.message === "string" ? input.message : JSON.stringify(input);
    const output = await lovableAiText(
      (agent as { system_prompt: string }).system_prompt,
      userMsg,
      (agent as { model: string }).model,
    );
    const duration = Date.now() - started;
    await admin.from("automation_agent_runs").update({
      status: output ? "succeeded" : "failed",
      output: output ? { text: output } : null,
      error: output ? null : "empty response",
      duration_ms: duration,
    }).eq("id", (run as { id: string }).id);
    return jsonResponse({ run_id: (run as { id: string }).id, output }, 200, corsHeaders);
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e);
    await admin.from("automation_agent_runs").update({
      status: "failed",
      error: msg,
      duration_ms: Date.now() - started,
    }).eq("id", (run as { id: string }).id);
    return jsonResponse({ error: msg, code: "internal" }, 500, corsHeaders);
  }
}));
