import { createOpenAI } from "npm:@ai-sdk/openai@3";
import { createOpenAICompatible } from "npm:@ai-sdk/openai-compatible@2";
import { streamText, Output } from "npm:ai@6";
import { z } from "npm:zod@4";
import { createLovableAiGatewayRunIdFetch } from "./run-id.ts";

export const PRIMARY_MODEL = "openai/gpt-6-astra";
export const SECONDARY_MODEL = "google/gemini-3.8-flash";
export const opinionSchema = z.object({ conclusion: z.string(), confidence: z.number(), verdict: z.enum(["SUPPORTED", "CONTESTED", "INSUFFICIENT_EVIDENCE"]), evidence_indices: z.array(z.number()), weak_assumptions: z.array(z.string()), counterexamples: z.array(z.string()), missing_evidence: z.array(z.string()) });
export const comparisonSchema = z.object({ outcome: z.enum(["SUPPORTED", "CONTESTED", "INSUFFICIENT_EVIDENCE"]), conclusion: z.string(), confidence: z.number(), evidence_indices: z.array(z.number()), divergence: z.string().nullable(), impact: z.string().nullable(), contradictions: z.array(z.object({ side_a: z.string(), side_b: z.string(), evidence_indices: z.array(z.number()), impact: z.string() })), hypotheses: z.array(z.object({ statement: z.string(), evidence_indices: z.array(z.number()) })), alternatives: z.array(z.object({ explanation: z.string(), evidence_indices: z.array(z.number()) })), causal_claims: z.array(z.object({ claim: z.string(), classification: z.enum(["CORRELATION_ONLY", "POSSIBLE_CAUSAL_RELATION", "SUPPORTED_CAUSAL_RELATION", "UNDETERMINED"]), evidence_indices: z.array(z.number()) })) });
export class ReviewGatewayError extends Error { constructor(public status: number, message: string) { super(message); } }

export function createReviewAI(key: string, signal: AbortSignal) {
  const run = createLovableAiGatewayRunIdFetch();
  let gatewayFailure: ReviewGatewayError | undefined;
  const providerFetch: typeof fetch = async (url, init) => {
    const res = await run.fetch(url, init);
    if (!res.ok) {
      const raw = await res.text();
      let message = `AI service returned ${res.status}`;
      try { const parsed = JSON.parse(raw); message = parsed.message ?? parsed.error?.message ?? message; } catch { /* no raw response leakage */ }
      gatewayFailure = new ReviewGatewayError(res.status, message);
      throw gatewayFailure;
    }
    return res;
  };
  const headers = { "Lovable-API-Key": key, "X-Lovable-AIG-SDK": "vercel-ai-sdk" };
  const primary = createOpenAI({ apiKey: key, baseURL: "https://ai.gateway.lovable.dev/v1", headers, fetch: providerFetch });
  const secondary = createOpenAICompatible({ name: "lovable", baseURL: "https://ai.gateway.lovable.dev/v1", headers, fetch: providerFetch });
  async function call<T>(model: string, schema: z.ZodType<T>, instructions: string, data: unknown): Promise<T> {
    if (model !== PRIMARY_MODEL) {
      const result = streamText({ model: secondary(model), system: `${instructions}\nReturn only a JSON object matching this schema, with all fields present:\n${JSON.stringify(z.toJSONSchema(schema))}`, prompt: JSON.stringify(data), abortSignal: signal, maxRetries: 0 });
      await result.consumeStream();
      if (gatewayFailure) throw gatewayFailure;
      if (await result.finishReason === "content-filter") throw new ReviewGatewayError(422, "The second model declined this review. Narrow or revise the source request.");
      const text = (await result.text).trim().replace(/^```(?:json)?\s*/i, "").replace(/\s*```$/, "");
      if (!text) throw new ReviewGatewayError(502, "The second model returned no review.");
      try { return schema.parse(JSON.parse(text)); } catch { throw new ReviewGatewayError(502, "The second model returned a review that did not match the required structure."); }
    }
    const result = streamText({ model: model === PRIMARY_MODEL ? primary.responses(model) : secondary(model), system: instructions, prompt: JSON.stringify(data), output: Output.object({ schema }), abortSignal: signal, maxRetries: 0,
      ...(model === PRIMARY_MODEL ? { providerOptions: { openai: { forceReasoning: true, reasoningEffort: "medium", reasoningSummary: "auto", store: false, include: ["reasoning.encrypted_content"] } } } : {}),
    });
    await result.consumeStream();
    if (gatewayFailure) throw gatewayFailure;
    if (await result.finishReason === "content-filter") throw new ReviewGatewayError(422, "The model declined this review. Narrow or revise the source request.");
    const output = await result.output;
    if (!output) throw new ReviewGatewayError(502, "The model did not return a validated review.");
    return output;
  }
  return { call, run };
}