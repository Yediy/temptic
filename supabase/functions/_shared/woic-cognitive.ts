// WOIC Cognitive Core — shared primitives for every cognitive service.
//
// Responsibilities:
//  - Lovable AI Gateway access (structured JSON + streaming text + embeddings)
//  - Semantic memory read/write (vector search over woic_memory)
//  - Knowledge-graph upserts (entities + edges)
//  - Cognitive request auditing (woic_cognitive_requests)
//  - Short-lived answer caching (woic_cache)
//
// Every module in IWOS must reach intelligence through these primitives so we
// never duplicate reasoning logic in feature code.

import type { SupabaseClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";
import { admin } from "./woic.ts";

export const COGNITIVE_MODEL = "openai/gpt-5.6-sol";
export const EMBEDDING_MODEL = "openai/text-embedding-3-small";
const GATEWAY = "https://ai.gateway.lovable.dev/v1";

export class GatewayError extends Error {
  constructor(public status: number, message: string) {
    super(message);
  }
}

function gatewayHeaders(): Record<string, string> {
  const key = Deno.env.get("LOVABLE_API_KEY");
  if (!key) throw new GatewayError(503, "AI gateway is not configured.");
  return {
    "Content-Type": "application/json",
    "Lovable-API-Key": key,
    "X-Lovable-AIG-SDK": "woic-cognitive-core",
  };
}

/** Raw chat completion returning plain text. */
export async function cognitiveText(
  system: string,
  user: string,
  opts: { model?: string; temperature?: number } = {},
): Promise<string> {
  const res = await fetch(`${GATEWAY}/chat/completions`, {
    method: "POST",
    headers: gatewayHeaders(),
    body: JSON.stringify({
      model: opts.model ?? COGNITIVE_MODEL,
      reasoning_effort: "none",
      messages: [
        { role: "system", content: system },
        { role: "user", content: user },
      ],
    }),
  });
  if (res.status === 429) throw new GatewayError(429, "Rate limit exceeded. Try again shortly.");
  if (res.status === 402) throw new GatewayError(402, "AI credits exhausted. Add credits to continue.");
  if (!res.ok) throw new GatewayError(502, `AI gateway error (${res.status}).`);
  const json = await res.json() as { choices?: Array<{ message?: { content?: string } }> };
  return json?.choices?.[0]?.message?.content ?? "";
}

/**
 * Chat completion constrained to JSON. The schema is described in the prompt
 * (not enforced in-schema) so large/dynamic shapes never break generation.
 */
export async function cognitiveJson<T = Record<string, unknown>>(
  system: string,
  user: string,
  shapeHint: string,
  opts: { model?: string } = {},
): Promise<T> {
  const text = await cognitiveText(
    `${system}\n\nRespond with a single valid JSON object and nothing else. Shape:\n${shapeHint}`,
    user,
    opts,
  );
  return parseJsonLoose<T>(text);
}

export function parseJsonLoose<T>(text: string): T {
  const cleaned = text.trim().replace(/^```(?:json)?/i, "").replace(/```$/, "").trim();
  try {
    return JSON.parse(cleaned) as T;
  } catch {
    const start = cleaned.indexOf("{");
    const end = cleaned.lastIndexOf("}");
    if (start >= 0 && end > start) {
      try {
        return JSON.parse(cleaned.slice(start, end + 1)) as T;
      } catch { /* fall through */ }
    }
    throw new GatewayError(502, "AI returned malformed output.");
  }
}

/** Streaming chat completion — returns an SSE Response for the browser. */
export async function cognitiveStream(
  system: string,
  user: string,
  corsHeaders: Record<string, string>,
  opts: { model?: string } = {},
): Promise<Response> {
  const res = await fetch(`${GATEWAY}/chat/completions`, {
    method: "POST",
    headers: gatewayHeaders(),
    body: JSON.stringify({
      model: opts.model ?? COGNITIVE_MODEL,
      reasoning_effort: "none",
      stream: true,
      messages: [
        { role: "system", content: system },
        { role: "user", content: user },
      ],
    }),
  });
  if (!res.ok || !res.body) throw new GatewayError(res.status || 502, "AI gateway stream failed.");
  return new Response(res.body, {
    headers: { ...corsHeaders, "Content-Type": "text/event-stream", "Cache-Control": "no-cache" },
  });
}

/** Embeddings for semantic memory. Returns null when embeddings are unavailable. */
export async function embed(input: string): Promise<number[] | null> {
  try {
    const res = await fetch(`${GATEWAY}/embeddings`, {
      method: "POST",
      headers: gatewayHeaders(),
      body: JSON.stringify({ model: EMBEDDING_MODEL, input: input.slice(0, 8000) }),
    });
    if (!res.ok) return null;
    const json = await res.json() as { data?: Array<{ embedding?: number[] }> };
    const vec = json?.data?.[0]?.embedding;
    return Array.isArray(vec) && vec.length === 1536 ? vec : null;
  } catch {
    return null;
  }
}

// ---------------- Memory ----------------

export interface MemoryInput {
  agency_id: string;
  scope?: string;
  kind?: string;
  title?: string | null;
  content: string;
  source_entity?: string | null;
  source_id?: string | null;
  tags?: string[];
  importance?: number;
  metadata?: Record<string, unknown>;
  created_by?: string | null;
}

export async function storeMemory(db: SupabaseClient, input: MemoryInput) {
  const embedding = await embed(`${input.title ?? ""}\n${input.content}`);
  const { data, error } = await db
    .from("woic_memory")
    .insert({
      agency_id: input.agency_id,
      scope: input.scope ?? "organizational",
      kind: input.kind ?? "fact",
      title: input.title ?? null,
      content: input.content,
      source_entity: input.source_entity ?? null,
      source_id: input.source_id ?? null,
      tags: input.tags ?? [],
      importance: input.importance ?? 0.5,
      metadata: input.metadata ?? {},
      created_by: input.created_by ?? null,
      embedding: embedding ? JSON.stringify(embedding) : null,
    })
    .select("id, title, scope, kind, created_at")
    .single();
  if (error) throw error;
  return data;
}

export interface RetrievedMemory {
  id: string;
  title: string | null;
  content: string;
  scope: string;
  kind: string;
  importance: number;
  similarity?: number;
}

/** Semantic retrieval with keyword fallback when embeddings are unavailable. */
export async function retrieveMemory(
  db: SupabaseClient,
  agencyId: string,
  query: string,
  limit = 10,
  scope?: string | null,
): Promise<RetrievedMemory[]> {
  const vec = await embed(query);
  if (vec) {
    const { data, error } = await db.rpc("woic_match_memory", {
      _agency_id: agencyId,
      _embedding: JSON.stringify(vec),
      _match_count: limit,
      _scope: scope ?? null,
    });
    if (!error && data) return data as RetrievedMemory[];
  }
  let q = db
    .from("woic_memory")
    .select("id, title, content, scope, kind, importance")
    .eq("agency_id", agencyId)
    .order("importance", { ascending: false })
    .limit(limit);
  if (scope) q = q.eq("scope", scope);
  if (query.trim()) q = q.ilike("content", `%${query.trim().slice(0, 120)}%`);
  const { data } = await q;
  return (data ?? []) as RetrievedMemory[];
}

/** Retrieve published knowledge articles relevant to a question. */
export async function retrieveKnowledgeArticles(
  db: SupabaseClient,
  agencyId: string,
  query: string,
  limit = 5,
) {
  const { data } = await db
    .from("woic_knowledge_articles")
    .select("id, title, body, tags, status, updated_at")
    .eq("agency_id", agencyId)
    .eq("status", "published")
    .textSearch("tsv", query.split(/\s+/).filter(Boolean).slice(0, 6).join(" | "), {
      config: "simple",
    })
    .limit(limit);
  return data ?? [];
}

// ---------------- Knowledge graph ----------------

export interface GraphEntityInput {
  entity_type: string;
  entity_key: string;
  label: string;
  ref_entity?: string | null;
  ref_id?: string | null;
  attributes?: Record<string, unknown>;
}

export async function upsertGraphEntity(
  db: SupabaseClient,
  agencyId: string,
  e: GraphEntityInput,
): Promise<string | null> {
  const { data, error } = await db
    .from("woic_graph_entities")
    .upsert(
      {
        agency_id: agencyId,
        entity_type: e.entity_type,
        entity_key: e.entity_key,
        label: e.label,
        ref_entity: e.ref_entity ?? null,
        ref_id: e.ref_id ?? null,
        attributes: e.attributes ?? {},
      },
      { onConflict: "agency_id,entity_type,entity_key" },
    )
    .select("id")
    .maybeSingle();
  if (error) return null;
  return data?.id ?? null;
}

export async function upsertGraphEdge(
  db: SupabaseClient,
  agencyId: string,
  fromId: string,
  toId: string,
  relation: string,
  attributes: Record<string, unknown> = {},
) {
  await db.from("woic_graph_edges").upsert(
    { agency_id: agencyId, from_id: fromId, to_id: toId, relation, attributes },
    { onConflict: "agency_id,from_id,to_id,relation" },
  );
}

// ---------------- Cache ----------------

export async function cacheGet(
  db: SupabaseClient,
  agencyId: string,
  key: string,
): Promise<unknown | null> {
  const { data } = await db
    .from("woic_cache")
    .select("value, expires_at")
    .eq("agency_id", agencyId)
    .eq("cache_key", key)
    .maybeSingle();
  if (!data) return null;
  if (new Date(data.expires_at).getTime() < Date.now()) return null;
  return data.value;
}

export async function cacheSet(
  db: SupabaseClient,
  agencyId: string,
  key: string,
  value: unknown,
  ttlSeconds = 300,
) {
  await db.from("woic_cache").upsert(
    {
      agency_id: agencyId,
      cache_key: key,
      value: value as Record<string, unknown>,
      expires_at: new Date(Date.now() + ttlSeconds * 1000).toISOString(),
    },
    { onConflict: "agency_id,cache_key" },
  );
}

export function cacheKey(operation: string, payload: unknown): string {
  const raw = `${operation}:${JSON.stringify(payload ?? {})}`;
  let h = 2166136261;
  for (let i = 0; i < raw.length; i++) {
    h ^= raw.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return `${operation}:${(h >>> 0).toString(36)}`;
}

// ---------------- Audit ----------------

export async function logCognitiveRequest(entry: {
  agency_id: string;
  user_id?: string | null;
  service: string;
  operation: string;
  input?: unknown;
  output?: unknown;
  status?: string;
  error?: string | null;
  latency_ms?: number;
  model?: string | null;
  cached?: boolean;
}) {
  try {
    await admin().from("woic_cognitive_requests").insert({
      agency_id: entry.agency_id,
      user_id: entry.user_id ?? null,
      service: entry.service,
      operation: entry.operation,
      input: truncate(entry.input),
      output: truncate(entry.output),
      status: entry.status ?? "ok",
      error: entry.error ?? null,
      latency_ms: entry.latency_ms ?? null,
      model: entry.model ?? COGNITIVE_MODEL,
      cached: entry.cached ?? false,
    });
  } catch { /* auditing must never break a request */ }
}

function truncate(v: unknown): Record<string, unknown> | null {
  if (v === undefined || v === null) return null;
  const s = JSON.stringify(v);
  if (s.length <= 20000) return typeof v === "object" ? v as Record<string, unknown> : { value: v };
  return { truncated: true, preview: s.slice(0, 2000) };
}
