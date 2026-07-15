// woic-conversation-summarize — summarizes a WOIC conversation using
// Lovable AI Gateway and stores the summary back on woic_conversations.
// User-scoped; RLS on the underlying tables enforces tenant boundaries.
import { corsHeaders } from "npm:@supabase/supabase-js@2/cors";
import { withSentry } from "../_shared/sentry.ts";
import { jsonResponse, requireUser } from "../_shared/auth.ts";
import { admin, isUuid, lovableAiText, requireAgencyMember } from "../_shared/woic.ts";

type Body = { agency_id?: string; conversation_id?: string; max_messages?: number };

Deno.serve(withSentry("woic-conversation-summarize", async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });
  if (req.method !== "POST") return jsonResponse({ error: "method_not_allowed" }, 405, corsHeaders);

  const auth = await requireUser(req, corsHeaders);
  if (auth instanceof Response) return auth;

  const body = (await req.json().catch(() => null)) as Body | null;
  if (!body || !isUuid(body.agency_id) || !isUuid(body.conversation_id)) {
    return jsonResponse({ error: "agency_id and conversation_id required (uuid)", code: "bad_request" }, 400, corsHeaders);
  }
  const forbidden = await requireAgencyMember(auth.userClient, body.agency_id!, corsHeaders);
  if (forbidden) return forbidden;

  const maxMessages = Math.min(Math.max(Number(body.max_messages ?? 50) | 0, 1), 200);

  try {
    // RLS-scoped read via user client.
    const { data: convo, error: cErr } = await auth.userClient
      .from("woic_conversations")
      .select("id, subject, agency_id, entity_type, entity_id")
      .eq("id", body.conversation_id!)
      .eq("agency_id", body.agency_id!)
      .maybeSingle();
    if (cErr) throw cErr;
    if (!convo) return jsonResponse({ error: "conversation not found", code: "not_found" }, 404, corsHeaders);

    const { data: messages, error: mErr } = await auth.userClient
      .from("woic_conversation_messages")
      .select("channel, direction, sender, body, created_at")
      .eq("conversation_id", convo.id)
      .order("created_at", { ascending: true })
      .limit(maxMessages);
    if (mErr) throw mErr;
    if (!messages || messages.length === 0) {
      return jsonResponse({ summary: null, count: 0 }, 200, corsHeaders);
    }

    const transcript = messages
      .map((m) => {
        const r = m as { direction: string; sender: string; body: string; channel: string };
        return `[${r.channel}] ${r.direction === "in" ? "←" : "→"} ${r.sender}: ${r.body}`;
      })
      .join("\n");

    const summary = await lovableAiText(
      "You are an operations analyst. Summarize the workforce conversation in 3-5 concise bullet points, capturing decisions, action items, and outstanding questions. Do not invent facts.",
      `Subject: ${convo.subject ?? "(none)"}\n\nTranscript:\n${transcript}`,
    );

    if (!summary) {
      return jsonResponse({ error: "ai_unavailable", code: "ai_unavailable" }, 502, corsHeaders);
    }

    // Persist via admin (audited by RLS-scoped read above).
    const { error: uErr } = await admin()
      .from("woic_conversations")
      .update({ summary, last_activity_at: new Date().toISOString() })
      .eq("id", convo.id)
      .eq("agency_id", body.agency_id!);
    if (uErr) throw uErr;

    return jsonResponse({ summary, count: messages.length }, 200, corsHeaders);
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e);
    return jsonResponse({ error: msg, code: "internal" }, 500, corsHeaders);
  }
}));
