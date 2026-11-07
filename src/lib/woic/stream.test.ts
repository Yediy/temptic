import { describe, it, expect } from "vitest";
import { extractPartialReasoning, extractPartialReport, parseSseChunk } from "./stream";

describe("WOIC streaming", () => {
  it("parses complete SSE events and keeps the incomplete tail", () => {
    const { events, rest } = parseSseChunk('event: delta\ndata: {"text":"a"}\n\n: ping\n\nevent: done\ndata: {"da');
    expect(events).toEqual([{ event: "delta", data: '{"text":"a"}' }]);
    expect(rest).toBe('event: done\ndata: {"da');
  });

  it("shows finished and in-progress reasoning steps from partial JSON", () => {
    const p = extractPartialReasoning('{"steps":[{"kind":"observation","content":"Fill rate fell"},{"kind":"analysis","content":"Two cli');
    expect(p.steps).toEqual([
      { kind: "observation", content: "Fill rate fell", complete: true },
      { kind: "analysis", content: "Two cli", complete: false },
    ]);
    expect(p.conclusion).toBe("");
  });

  it("reads a partial conclusion with escapes", () => {
    expect(extractPartialReasoning('{"steps":[],"conclusion":"Say \\"hi\\"\\nnext').conclusion).toBe('Say "hi"\nnext');
  });

  it("shows report sections as they arrive", () => {
    const r = extractPartialReport('{"title":"Morning","summary":"Ok","sections":[{"heading":"Ops","body":"Fine"},{"heading":"Risk');
    expect(r.title).toBe("Morning");
    expect(r.sections).toEqual([{ heading: "Ops", body: "Fine" }, { heading: "Risk", body: "" }]);
  });
});
