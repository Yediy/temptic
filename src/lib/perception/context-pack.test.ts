import { describe, it, expect } from "vitest";
import { buildContextPack } from "./context-pack";

const now = Date.parse("2026-11-13T12:00:00Z");
const req = { id: "r1", operation: "reason", status: "ok", created_at: "2026-11-13T11:00:00Z", input: { worker_id: "w1" }, output: { question: "Q?", conclusion: "C", trace_id: "t1" } };
const trace = { id: "t1", subject_entity: "worker", subject_id: "w1", evidence: [
  { source: "timesheet", ref_id: "x1", claim: "on site", stance: "supports", observed_at: "2026-11-13T11:30:00Z" },
  { source: "gps", ref_id: "x1", claim: "off site", stance: "contradicts", observed_at: "2026-11-01T11:30:00Z" },
] };

describe("context pack", () => {
  it("coverage counts 4 of 6 facets", () => {
    const p = buildContextPack(req, trace, now);
    expect(p.coverage.present).toEqual(["objective", "subject", "evidence", "conclusion"]);
    expect(p.coverage.score).toBeCloseTo(4 / 6);
  });
  it("overall freshness is the worst evidence item", () => {
    expect(buildContextPack(req, trace, now).freshness.overall).toBe("EXPIRED");
  });
  it("detects supports-vs-contradicts on same reference", () => {
    const p = buildContextPack(req, trace, now);
    expect(p.contradictions).toHaveLength(1);
    expect(p.contradictions[0].topic).toBe("x1");
  });
  it("lists missing facets and stale evidence", () => {
    const m = buildContextPack(req, trace, now).missing;
    expect(m).toContain("No alternatives recorded for this request");
    expect(m).toContain("1 evidence item(s) are stale or expired");
  });
  it("collects references from trace, input and evidence", () => {
    const ids = buildContextPack(req, trace, now).references.map((r) => r.id);
    expect(ids).toEqual(expect.arrayContaining(["t1", "w1", "x1"]));
  });
});
