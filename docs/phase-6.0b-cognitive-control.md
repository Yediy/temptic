# Phase 6.0B — WOIC Cognitive Control & Observability Workspace

Target architecture: **IWOS / WOIC v2.0.0-alpha.1**
Contracts: **PC-6.0B**, **CapSpec-6.0B**, **PDNA-6.0B**

## PC-6.0B — Platform Contract

1. The workspace is an **observation and control surface only**. Reasoning, memory, model
   routing, evidence scoring, claim evaluation, faculty orchestration and AI planning are
   backend responsibilities (Phase 6.0A) and are absent from the frontend.
2. All reads and the single governed write go through one organism:
   `woic-cognitive-control` (Supabase Edge Function), invoked with
   `{ agency_id, capability, method, params, contract: "PC-6.0B" }`.
3. Any capability the backend does not serve degrades to **BACKEND CAPABILITY PENDING**.
   Cognitive activity is never manufactured, inferred or simulated client-side.
4. Confidence is rendered only when reported. Otherwise the UI shows **CONFIDENCE UNSTATED**.
5. Private chain-of-thought is never displayed. Forbidden keys are stripped at the transport
   boundary (`redactPrivateReasoning`) and again at render (`MetadataBlock`).
6. `PLANNED` faculties are always labelled as *not operational* and never counted as capability.
7. Model operations are provider-neutral; no credential, key or endpoint is transmitted to the client.

## CapSpec-6.0B — Capabilities consumed (API Integration Matrix)

| Capability key | 6.0A method | Mutating | Roles |
| --- | --- | --- | --- |
| cognition.overview | cognition.overview | no | agency_admin, super_admin |
| sessions.list / sessions.get | sessions.* | no | agency_admin, super_admin |
| requests.list / requests.get / requests.flow | requests.* | no | agency_admin, super_admin |
| faculties.list / faculties.get | faculties.* | no | agency_admin, super_admin |
| evidence.list / evidence.get | evidence.* | no | agency_admin, super_admin |
| claims.list / claims.get | claims.* | no | agency_admin, super_admin |
| contradictions.list | contradictions.list | no | agency_admin, super_admin |
| uncertainty.list | uncertainty.list | no | agency_admin, super_admin |
| models.operations | models.operations | no | agency_admin, super_admin |
| budgets.usage | budgets.usage | no | agency_admin, super_admin |
| escalations.list | escalations.list | no | agency_admin, super_admin |
| escalations.acknowledge | escalations.acknowledge | **yes** | agency_admin, super_admin |
| performance.metrics | performance.metrics | no | agency_admin, super_admin |
| architecture.map | architecture.map | no | agency_admin, super_admin |

Canonical definitions live in `src/lib/cognition/platform.ts` and are rendered at
`/cognition/architecture`.

## PDNA-6.0B — Platform DNA

- **Layer:** Intelligence Control Plane (presentation).
- **Depends on:** Cognitive Control API 6.0A, Auth/RBAC, Architecture Console 5.10B, Command Center 5.4C.
- **Owns no data.** No tables, no local cognitive store, no derived cognitive state.
- **Extends by:** additional faculties and flow stages appearing in backend payloads; the flow
  visualization renders unreported stages as *not reported* rather than hiding them.

## Route Map

| Route | Page |
| --- | --- |
| `/cognition` | Cognitive Overview |
| `/cognition/sessions` | Active Sessions |
| `/cognition/requests` | Cognitive Requests + Request Inspector + Cognitive Flow |
| `/cognition/faculties` | Faculty Registry |
| `/cognition/evidence` | Evidence Explorer |
| `/cognition/claims` | Claim Explorer |
| `/cognition/contradictions` | Contradiction Center |
| `/cognition/uncertainty` | Uncertainty Center |
| `/cognition/models` | Model Operations |
| `/cognition/budgets` | Cognitive Budgets (organization / session scope) |
| `/cognition/escalations` | Escalation Center |
| `/cognition/performance` | Cognitive Performance |
| `/cognition/architecture` | Architecture integration + API matrix |
| `/cognition/settings` | Workspace settings + permission map |

## Permission Map

- Route guard: `ProtectedRoute allowedRoles={["agency_admin", "super_admin"]}`.
- Engineering mode: `super_admin` only.
- Organization-scope budgets: `agency_admin`, `super_admin`; otherwise session scope only.
- Escalation acknowledgement is offered only when the role check passes and is authorized
  again server-side; the client check merely hides the control.

## Command Center Integration

`⌘K` commands: show active cognition, open cognitive request, low-confidence requests,
contradictions, model health, expensive cognitive sessions, failed faculties, explain evidence
behind a claim, cognitive escalations.

## Architecture Compliance Report

| Requirement | Status |
| --- | --- |
| No frontend cognitive engine | Pass — transport + presentation only |
| No duplicated backend capability | Pass — single organism `woic-cognitive-control` |
| Truthful degradation | Pass — `CapabilityState` renders BACKEND CAPABILITY PENDING |
| Evidence provenance traceable | Pass — Evidence Explorer with source/provenance/freshness/reliability |
| Claim states | Pass — PROPOSED, SUPPORTED, CONTESTED, REJECTED, STALE, SUPERSEDED |
| Uncertainty explicit | Pass — Uncertainty Center + inline flags, no fabricated precision |
| Faculty status accuracy | Pass — PLANNED never presented as operational |
| Provider-neutral model ops | Pass — no provider privileged, no secrets rendered |
| No private reasoning exposed | Pass — redaction at transport and render |
| Reuse of IWOS design system | Pass — shadcn/Tailwind tokens, dark-first, existing layout shells |

## Validation Report

- TypeScript: pass (`tsgo --noEmit`).
- Lint: pass (0 errors; 1 pre-existing-style react-refresh warning on the shared bits module).
- Routes: 14 registered under `/cognition`, guarded, sidebar + ⌘K entries present.
- 6.0A integration: capability calls wired; in environments without the 6.0A organism every
  section degrades to BACKEND CAPABILITY PENDING as designed.

**WOIC COGNITIVE CONTROL SURFACE ESTABLISHED — READY FOR PHASE 6.1 (PERCEPTION & CONTEXT INTELLIGENCE)**
