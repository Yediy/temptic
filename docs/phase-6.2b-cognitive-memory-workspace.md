# Phase 6.2B — WOIC Cognitive Memory Workspace

Target architecture: **IWOS / WOIC v2.0.0-alpha.3**
Platform Contract: **PC-6.2B** · Capability Spec: **CapSpec-6.2B** · Platform DNA: **PDNA-6.2B**

The workspace is a human observability and control surface over WOIC Working Memory.
It contains **no working-memory engine**: no compression, eviction, scoring, checkpoint
persistence, state merging or memory promotion happens in the browser, and there is no
local checkpoint datastore. Every value rendered was reported by the Phase 6.2A Working
Memory API (`woic-memory`); when a capability is absent the UI renders
`BACKEND CAPABILITY PENDING` and shows nothing else.

## PC-6.2B — platform contract

| Rule | Enforcement |
| --- | --- |
| Single backend entry point | `MEMORY_FUNCTION = "woic-memory"` (`src/lib/memory/platform.ts`) |
| Uniform envelope | `{ agency_id, capability, method, params, contract: "PC-6.2B" }` |
| Pending is truthful | HTTP 404/501 or `code: not_implemented \| capability_pending` → `pending` state |
| Forbidden is truthful | HTTP 403 or `code: forbidden` → `NOT AUTHORIZED` state |
| No hidden reasoning | `redactPrivate()` strips chain-of-thought keys at the transport boundary |
| No local cognition | Only presentation filtering/paging exists; no re-ranking or recomputation |
| Controls are requests | Pause/resume/close/checkpoint/restore/refresh/review are 6.2A methods |

## CapSpec-6.2B — capability → method matrix

Read capabilities (roles: `agency_admin`, `super_admin`):

| Capability | Method | Surface |
| --- | --- | --- |
| `memory.overview` | `memory.overview` | Memory Overview, Lifecycle |
| `memory.sessions.list` | `memory.sessions.list` | Active Sessions, State, Budgets |
| `memory.sessions.get` | `memory.sessions.get` | Session detail |
| `memory.state.get` | `memory.state.get` | Cognitive State |
| `memory.items.list` | `memory.items.list` | Memory Items |
| `memory.goals.list` | `memory.goals.list` | Goals & Subgoals |
| `memory.questions.list` | `memory.questions.list` | Open Questions |
| `memory.hypotheses.list` | `memory.hypotheses.list` | Hypotheses |
| `memory.evidence.list` | `memory.evidence.list` | Evidence |
| `memory.checkpoints.list` | `memory.checkpoints.list` | Checkpoint Center |
| `memory.compression.list` | `memory.compression.list` | Compression |
| `memory.lifecycle.list` | `memory.lifecycle.list` | Memory Lifecycle |
| `memory.budgets.get` | `memory.budgets.get` | Budgets |
| `memory.health.get` | `memory.health.get` | Health |

Governed controls:

| Capability | Method | Required role |
| --- | --- | --- |
| `memory.session.pause` / `.resume` / `.close` | same | `agency_admin`, `super_admin` |
| `memory.checkpoint.create` | `memory.checkpoint.create` | `agency_admin`, `super_admin` |
| `memory.checkpoint.restore` | `memory.checkpoint.restore` | `super_admin` |
| `memory.context.refresh` | `memory.context.refresh` | `agency_admin`, `super_admin` |
| `memory.review.request` | `memory.review.request` | `agency_admin`, `super_admin` |

## PDNA-6.2B — platform DNA

- **Organism:** WOIC Working Memory (Generation Two).
- **Layer:** Cognition. **Domain:** Intelligence.
- **Upstream:** 6.1A Perception & Context, 6.0A Cognitive Control, Event Fabric (5.1), Timeline (5.4).
- **Downstream:** Reasoning Architecture (6.3), Autonomy (5.9), Optimization (5.8D).
- **Data ownership:** all working-memory state is owned by 6.2A. The frontend owns only
  local view settings (`iwos.memory.settings.v1`).
- **Lifecycle vocabulary:** `CREATED → ACTIVE → COMPRESSED → SUPERSEDED → {EVICTED | EXPIRED | PROMOTED} → CLOSED`.
  `EVICTED`/`EXPIRED` are **deletions**; `PROMOTED` is **preservation** into durable memory.
  The two are visually and semantically separated everywhere they appear.

## Route map

| Route | Page |
| --- | --- |
| `/memory` | Memory Overview |
| `/memory/sessions` | Active Sessions (+ operator controls) |
| `/memory/state` | Cognitive State |
| `/memory/items` | Memory Item Explorer |
| `/memory/goals` | Goals & Subgoals |
| `/memory/questions` | Open Questions |
| `/memory/hypotheses` | Hypotheses |
| `/memory/evidence` | Evidence |
| `/memory/checkpoints` | Checkpoint Center |
| `/memory/compression` | Compression |
| `/memory/lifecycle` | Memory Lifecycle |
| `/memory/budgets` | Budgets |
| `/memory/health` | Memory Health |

All routes sit behind `ProtectedRoute allowedRoles={["agency_admin", "super_admin"]}` inside `AppLayout`.

## Permission map

- Route level: `agency_admin`, `super_admin`.
- Control level: `useMemoryPermissions().can(capability)` disables any control the role may not
  invoke; restoration additionally requires `canRestoreCheckpoint` (`super_admin`).
- Backend remains authoritative — a disabled control is a UX affordance, not the security boundary.

## API integration matrix

| Backend state | UI behaviour |
| --- | --- |
| 6.2A deployed, capability implemented | Records render exactly as reported |
| 6.2A deployed, capability not implemented | `BACKEND CAPABILITY PENDING` with the API message |
| 6.2A not deployed (404 / transport error) | `BACKEND CAPABILITY PENDING` |
| 403 / `code: forbidden` | `NOT AUTHORIZED` |
| Other errors | `WORKING MEMORY API ERROR` with the message |
| Field absent from a reported record | `—` or `UNSTATED`; never a fabricated number |

## Architecture compliance report

| Requirement | Status |
| --- | --- |
| Reuses Cognitive Control / Perception design system | Pass — `MemBits` re-exports `CogBits` primitives |
| Consumes 6.2A APIs only | Pass — single `woic-memory` transport |
| No local working-memory logic | Pass — no compression/eviction/scoring/merge/promotion code |
| No local checkpoint datastore | Pass — checkpoints are listed and requested only |
| No hidden reasoning exposed | Pass — `redactPrivate()` + privacy notices |
| Lifecycle distinguishes deletion from promotion | Pass — `LIFECYCLE_DISPOSITION` |
| Budgets with threshold warnings | Pass — `BudgetBar` (9 dimensions) |
| Architecture inspector links | Pass — Contract / CapSpec / DNA / Dependencies / Health |
| Command Center integration | Pass — 7 memory commands registered |
| No biological metaphors or brain animations | Pass — layered-state iconography only |

## Validation report

- TypeScript: passes (`tsgo --noEmit`).
- Build: passes.
- Routes: 13 registered under `/memory`, guarded and reachable from the sidebar.
- Permissions: enforced at route and control level.
- Pending degradation: verified for every capability (no 6.2A deployment in this environment,
  so all surfaces render the truthful pending state rather than synthetic data).

**WOIC COGNITIVE MEMORY WORKSPACE ESTABLISHED — READY FOR PHASE 6.3 — REASONING ARCHITECTURE**
