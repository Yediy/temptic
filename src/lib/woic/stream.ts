// Client for streamed WOIC Reason / Explain / GenerateReport calls.
// The woic-cognitive function emits SSE events: status, delta, done, error.

export type StreamableOperation = "reason" | "explain" | "generate_report";

export interface StreamHandlers {
  onStatus?: (stage: string) => void;
  onDelta?: (text: string, full: string) => void;
}

export interface SseEvent { event: string; data: string }

/** Splits an SSE buffer into complete events; returns the unconsumed remainder. */
export function parseSseChunk(buffer: string): { events: SseEvent[]; rest: string } {
  const events: SseEvent[] = [];
  const blocks = buffer.split(/\r?\n\r?\n/);
  const rest = blocks.pop() ?? "";
  for (const block of blocks) {
    let event = "message";
    const data: string[] = [];
    for (const line of block.split(/\r?\n/)) {
      if (line.startsWith(":")) continue;
      if (line.startsWith("event:")) event = line.slice(6).trim();
      else if (line.startsWith("data:")) data.push(line.slice(5).trimStart());
    }
    if (data.length) events.push({ event, data: data.join("\n") });
  }
  return { events, rest };
}

/** Reads a JSON string value that may still be streaming (unterminated). */
function readJsonString(src: string, start: number): { value: string; end: number; complete: boolean } {
  let out = "";
  let i = start;
  while (i < src.length) {
    const c = src[i];
    if (c === "\\") {
      const n = src[i + 1];
      if (n === undefined) break;
      const map: Record<string, string> = { n: "\n", t: "\t", r: "", '"': '"', "\\": "\\", "/": "/", b: "", f: "" };
      if (n === "u") {
        const hex = src.slice(i + 2, i + 6);
        if (hex.length < 4) break;
        out += String.fromCharCode(parseInt(hex, 16));
        i += 6;
        continue;
      }
      out += map[n] ?? n;
      i += 2;
      continue;
    }
    if (c === '"') return { value: out, end: i + 1, complete: true };
    out += c;
    i++;
  }
  return { value: out, end: i, complete: false };
}

/** Returns every value (complete or partial) for a string field name in partial JSON. */
export function extractStringFields(partial: string, field: string): Array<{ value: string; complete: boolean }> {
  const out: Array<{ value: string; complete: boolean }> = [];
  const re = new RegExp(`"${field}"\\s*:\\s*"`, "g");
  let m: RegExpExecArray | null;
  while ((m = re.exec(partial))) {
    const r = readJsonString(partial, m.index + m[0].length);
    out.push({ value: r.value, complete: r.complete });
    re.lastIndex = r.end;
  }
  return out;
}

export interface PartialReasoning {
  steps: Array<{ kind: string; content: string; complete: boolean }>;
  conclusion: string;
  explanation: string;
}

/** Pulls in-progress reasoning steps, conclusion and explanation out of a streaming JSON reply. */
export function extractPartialReasoning(partial: string): PartialReasoning {
  const stepsStart = partial.indexOf('"steps"');
  const afterSteps = partial.search(/"(conclusion|evidence|alternatives|risk|explanation|confidence)"\s*:/);
  const stepsRegion = stepsStart >= 0 ? partial.slice(stepsStart, afterSteps > stepsStart ? afterSteps : undefined) : "";
  const kinds = extractStringFields(stepsRegion, "kind");
  const contents = extractStringFields(stepsRegion, "content");
  return {
    steps: contents.map((c, i) => ({ kind: kinds[i]?.value ?? "", content: c.value, complete: c.complete })),
    conclusion: extractStringFields(partial, "conclusion")[0]?.value ?? "",
    explanation: extractStringFields(partial, "explanation")[0]?.value ?? "",
  };
}

export interface PartialReport {
  title: string;
  summary: string;
  sections: Array<{ heading: string; body: string }>;
}

export function extractPartialReport(partial: string): PartialReport {
  const headings = extractStringFields(partial, "heading");
  const bodies = extractStringFields(partial, "body");
  return {
    title: extractStringFields(partial, "title")[0]?.value ?? "",
    summary: extractStringFields(partial, "summary")[0]?.value ?? "",
    sections: headings.map((h, i) => ({ heading: h.value, body: bodies[i]?.value ?? "" })),
  };
}

export async function streamCognitive<T = Record<string, unknown>>(
  opts: {
    url: string;
    accessToken: string;
    apiKey: string;
    agencyId: string;
    operation: StreamableOperation;
    params: Record<string, unknown>;
    signal?: AbortSignal;
  } & StreamHandlers,
): Promise<T> {
  const res = await fetch(opts.url, {
    method: "POST",
    signal: opts.signal,
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${opts.accessToken}`,
      apikey: opts.apiKey,
      Accept: "text/event-stream",
    },
    body: JSON.stringify({ agency_id: opts.agencyId, operation: opts.operation, params: opts.params, stream: true }),
  });
  if (!res.ok || !res.body) {
    let msg = `Request failed (${res.status})`;
    try { msg = (await res.json())?.error ?? msg; } catch { /* not json */ }
    throw new Error(msg);
  }
  const reader = res.body.getReader();
  const decoder = new TextDecoder();
  let buf = "";
  let full = "";
  for (;;) {
    const { done, value } = await reader.read();
    if (done) break;
    buf += decoder.decode(value, { stream: true });
    const { events, rest } = parseSseChunk(buf);
    buf = rest;
    for (const ev of events) {
      let data: Record<string, unknown> = {};
      try { data = JSON.parse(ev.data); } catch { continue; }
      if (ev.event === "status") opts.onStatus?.(String(data.stage ?? ""));
      else if (ev.event === "delta") {
        full += String(data.text ?? "");
        opts.onDelta?.(String(data.text ?? ""), full);
      } else if (ev.event === "done") return data.data as T;
      else if (ev.event === "error") throw new Error(String(data.error ?? "WOIC stream failed"));
    }
  }
  throw new Error("Stream ended before WOIC finished.");
}
