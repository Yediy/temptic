import { describe, it, expect } from "vitest";
import { readFileSync } from "node:fs";
import { buildImpact, planFingerprint, replayMetadata, workflowRoots, type ReplayEvent, type ReplayRule } from "./replay-plan";

const ev = (id: string, name: string, metadata: Record<string, unknown> = {}): ReplayEvent =>
  ({ id, agency_id: "a", module: "m", name, actor_id: null, entity_type: null, entity_id: null, metadata, correlation_id: "c", created_at: "2026-01-01" });

describe("event replay planning", () => {
  it("replays only workflow roots; children are regenerated", () => {
    const roots = workflowRoots([ev("1", "client.created"), ev("2", "automation.emitted", { caused_by_event: "1" })]);
    expect(roots.map((e) => e.id)).toEqual(["1"]);
  });
  it("counts the impact and flags anything creating records as needing confirmation", () => {
    const rules: ReplayRule[] = [
      { id: "r1", trigger_event: "client.created", actions: [{ type: "create_task" }, { type: "generate_payroll" }] },
      { id: "r2", trigger_event: "worker.created", actions: [{ type: "notify" }] },
    ];
    const impact = buildImpact([ev("1", "client.created")], rules);
    expect(impact.rules_triggered).toBe(1);
    expect(impact.actions.create_task).toBe(1);
    expect(impact.actions.awaiting_approval).toBe(1);
    expect(impact.sensitive).toEqual(["generate_payroll"]);
    expect(impact.destructive).toBe(true);
  });
  it("a replay that triggers nothing needs no confirmation", () => {
    expect(buildImpact([ev("1", "x.y")], [{ id: "r", trigger_event: "client.created", actions: [{ type: "notify" }] }]).destructive).toBe(false);
  });
  it("the plan fingerprint changes when a rule version changes", () => {
    const e = [ev("1", "a")];
    expect(planFingerprint(e, [{ id: "r", trigger_event: "a", version: 1 }])).not.toBe(planFingerprint(e, [{ id: "r", trigger_event: "a", version: 2 }]));
  });
  it("replay copies keep provenance and reset chain state", () => {
    const m = replayMetadata(ev("1", "a", { chain_depth: 3, caused_by_event: "0", worker_id: "w" }), "run", "me");
    expect(m).toEqual({ worker_id: "w", replay_of: "1", replay_run: "run", replayed_by: "me", original_created_at: "2026-01-01" });
  });
  it("server and browser copies stay identical", () => {
    const norm = (s: string) => s.split("\n").slice(1).join("\n").replace(/from "[^"]+simulate"|from "\.\/automation-sim\.ts"/, "SIM");
    expect(norm(readFileSync("src/lib/activity/replay-plan.ts", "utf8"))).toBe(norm(readFileSync("supabase/functions/_shared/replay-plan.ts", "utf8")));
  });
});
