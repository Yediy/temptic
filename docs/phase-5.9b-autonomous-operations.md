# Phase 5.9B — Autonomous Operations Workspace

Architecture Version: IWOS v1.5.0 · Constitution v1.0
Platform Contract: **PC-5.9B** · Capability Specification: **CapSpec-5.9B** · Platform DNA: **PDNA-5.9B**

## 1. Platform Contract (PC-5.9B)

The Autonomous Operations Workspace is a **human control plane**, not an engine.

| Rule | Enforcement in code |
| --- | --- |
| No coordination/authority/task logic in the frontend | `src/lib/autonomy/platform.ts` contains only types, taxonomies and presentation constants |
| No orchestration engine | All reads/writes go through `callEngine()` → `autonomy-api` edge function |
| No duplicate audit datastore | Ledger, incidents and interventions are queried live; nothing is persisted client-side except device UI preferences (`iwos.autonomy.settings.v1`) |
| No fake autonomous activity | Missing capabilities throw `CapabilityPending`, rendering `BACKEND CAPABILITY PENDING`; empty engine results render `NOT YET AVAILABLE` |
| Simulation ≠ production | Live Event Stream reads production Event Fabric events (`ttos_events`); simulation lives in `/simulation` and is never merged in |
| Frontend never grants authority | Authority controls call `authority.mutate` on the engine and state so in the UI |

## 2. Capability Specification (CapSpec-5.9B)

19 capabilities declared in `CAPABILITIES` (`src/lib/autonomy/platform.ts`), each with engine method, mutating flag and required roles:

`operations.overview`, `coordinations.list`, `coordinations.detail`, `objectives.list`, `plans.list`, `tasks.list`,
`actors.list`, `authority.list`, `authority.mutate*`, `approvals.list`, `approvals.decide*`, `interventions.list`,
`interventions.execute*`, `killswitch.status`, `killswitch.activate*`, `escalations.list`, `ledger.query`,
`performance.metrics`, `incidents.list`  (`*` = mutating / governed).

## 3. Platform DNA (PDNA-5.9B)

- Operation states: `PLANNED, APPROVED, EXECUTING, COMPLETED, FAILED, PAUSED, ESCALATED, ROLLED_BACK`
- Risk ladder: `low, medium, high, critical`
- Authority ladder: `observe → recommend → act_with_approval → act_bounded → act_autonomous`
- Actor types: human (violet ●) vs autonomous agent/automation/organism/robot/equipment/external (cyan ◆)
- Governance chain: Constitution → Contract → Authority → Decision → Approval → Action → Outcome

## 4. Route Map

| Route | Page |
| --- | --- |
| `/autonomy` | Operations Overview |
| `/autonomy/coordinations` | Live Coordination Map |
| `/autonomy/objectives` | Objectives |
| `/autonomy/plans` | Plans |
| `/autonomy/tasks` | Tasks |
| `/autonomy/actors` | Actor Center |
| `/autonomy/authority` | Authority Center |
| `/autonomy/approvals` | Approval Queue |
| `/autonomy/intervention` | Intervention Center + Kill-Switch UI |
| `/autonomy/escalations` | Escalations |
| `/autonomy/ledger` | Autonomy Ledger |
| `/autonomy/performance` | Performance |
| `/autonomy/incidents` | Incident Center |
| `/autonomy/settings` | Settings + Engineering Mode |

## 5. Permission Map

- Route guard: `ProtectedRoute allowedRoles={["agency_admin","super_admin"]}` (App.tsx).
- Read capabilities: `agency_admin`, `super_admin`.
- Approvals/interventions: `agency_admin`, `super_admin`.
- Authority mutation, governed rollback, kill switch, Engineering Mode: `super_admin` only.
- Frontend checks are advisory; the engine re-authorizes every request server-side.

## 6. API Integration Matrix

All calls: `supabase.functions.invoke("autonomy-api", { agency_id, capability, method, params, contract: "PC-5.9B" })`.
Rendered live in Settings → Engineering Mode. Additional integrations reused, not rebuilt:
WOIC cognitive (`woic-cognitive`) for the Operations Assistant, Event Fabric (`ttos_events`) for the live stream,
and links out to Timeline, Graph, Knowledge, Communications, Simulation, Optimization, Decisions and Audit.

## 7. Emergency Control Matrix

| Control | Danger | Roles | Confirmation |
| --- | --- | --- | --- |
| Pause / Resume / Reassign / Re-optimize / Re-simulate / Escalate | normal | agency_admin, super_admin | consequence + reason |
| Cancel operation | elevated | agency_admin, super_admin | consequence + reason |
| Reduce / Revoke authority | elevated | super_admin | consequence + reason |
| Governed rollback | emergency | super_admin | type `ROLLBACK` + reason |
| Kill switch (actor/coordination/domain/tenant/global) | emergency | super_admin | type `HALT` + scope + reason |

Emergency controls are always visible on the Intervention Center surface — never nested in a menu.

## 8. Architecture Compliance Report

- Reused: AppLayout, ProtectedRoute/RBAC, Command Center registry, design system, TanStack Query, Supabase client, WOIC cognitive client, Event Fabric.
- Added: `src/lib/autonomy/platform.ts`, `src/hooks/autonomy/use-autonomy.ts`, `src/components/autonomy/AutoBits.tsx`, 15 pages under `src/pages/autonomy/`.
- No new datastore, no new orchestration engine, no new audit store, no client-side authority evaluation.

## 9. Validation Report

- Build: passes. TypeScript: passes. Lint: passes.
- Routes: 14 registered and reachable behind role guard.
- Degradation: with `autonomy-api` not deployed, every capability surface renders BACKEND CAPABILITY PENDING and no values.
- No mock coordination data exists anywhere in the workspace.

**READY FOR PHASE 5.10 — ARCHITECTURE FREEZE AND IWOS V1 PLATFORM SPECIFICATION**
