import { describe, it, expect } from "vitest";
import { evaluateWoicAccess, resolveWoicPermission } from "./policy";
import { readFileSync } from "node:fs";

const check = (fn: string, op: string, roles: string[], opts: { member?: boolean; module?: string; params?: Record<string, unknown> } = {}) =>
  evaluateWoicAccess({ permission: resolveWoicPermission(fn, op, opts.params), roles, isMember: opts.member ?? true, module: opts.module ?? "console" });

describe("WOIC access policy", () => {
  it("blocks anyone outside the organization, except super admins", () => {
    expect(check("woic-api", "knowledge.search", ["agency_admin"], { member: false })).toEqual({ allowed: false, reason: "not_agency_member" });
    expect(check("woic-api", "knowledge.search", ["super_admin"], { member: false }).allowed).toBe(true);
  });
  it("memory: staff may read, only admins may write", () => {
    expect(check("woic-cognitive", "retrieve_knowledge", ["recruiter"]).allowed).toBe(true);
    expect(check("woic-cognitive", "store_knowledge", ["recruiter"])).toEqual({ allowed: false, reason: "role_not_permitted" });
    expect(check("woic-api", "org_memory.upsert", ["agency_admin"]).allowed).toBe(true);
    expect(check("woic-cognitive", "retrieve_knowledge", ["viewer"]).allowed).toBe(false);
  });
  it("compliance signals: compliance specialists yes, recruiters and viewers no", () => {
    expect(check("woic-api", "compliance.events", ["compliance_specialist"]).allowed).toBe(true);
    expect(check("woic-api", "compliance.events", ["recruiter"]).allowed).toBe(false);
    expect(check("woic-cognitive", "evaluate_compliance", ["viewer"]).allowed).toBe(false);
  });
  it("client and worker users get nothing", () => {
    expect(check("woic-api", "knowledge.search", ["client_user"]).allowed).toBe(false);
    expect(check("woic-api", "decision.list", ["worker_user"]).allowed).toBe(false);
  });
  it("modules only reach their own resources; unknown modules reach nothing", () => {
    expect(check("woic-api", "compliance.events", ["agency_admin"], { module: "recruit" })).toEqual({ allowed: false, reason: "module_not_permitted" });
    expect(check("woic-api", "compliance.events", ["agency_admin"], { module: "compliance" }).allowed).toBe(true);
    expect(check("woic-api", "knowledge.search", ["agency_admin"], { module: "made-up" }).allowed).toBe(false);
  });
  it("explain follows the target: security artifacts need admin", () => {
    expect(check("woic-cognitive", "explain", ["dispatcher"], { params: { target_kind: "security" } }).allowed).toBe(false);
    expect(check("woic-cognitive", "explain", ["dispatcher"], { params: { target_kind: "reasoning" } }).allowed).toBe(true);
    expect(check("woic-cognitive", "explain", ["agency_admin"], { params: { target_kind: "nope" } })).toEqual({ allowed: false, reason: "unknown_operation" });
  });
  it("server and browser copies stay identical", () => {
    const strip = (s: string) => s.split("\n").slice(2).join("\n");
    expect(strip(readFileSync("src/lib/woic/policy.ts", "utf8"))).toBe(strip(readFileSync("supabase/functions/_shared/woic-policy.ts", "utf8")));
  });
});
