# Phase 6.3B — WOIC Reasoning & Evidence Workspace

Contracts: **PC-6.3B** / **CapSpec-6.3B** / **PDNA-6.3B**
Architecture: IWOS / WOIC v2.0.0-alpha.4
Backend dependency: Phase 6.3A Reasoning API (edge function `woic-reasoning`)

## 1. Platform Contract (PC-6.3B)

1. The workspace is a transport and presentation layer only. It performs **no**
   reasoning, conclusion derivation, confidence scoring, evidence weighting,
   contradiction resolution or causal inference in the browser.
2. Every value displayed originates from a 6.3A capability response. Absent
   fields render as `—` / `UNSTATED`, never as a computed substitute.
3. Private model reasoning (chain-of-thought, scratchpads, raw prompts,
   deliberation traces) is never requested, stored or rendered. `redactPrivate`
   strips forbidden keys at the transport boundary.
4. Insufficient evidence is a first-class reasoning result and is rendered as a
   structured state, not as a red error.
5. Unresolved conflict (contradiction, model disagreement) is never collapsed
   into a single confident answer.
6. Causal classification is displayed exactly as labelled by 6.3A:
   `CORRELATION ONLY`, `POSSIBLE CAUSAL RELATION`, `SUPPORTED CAUSAL RELATION`,
   `UNDETERMINED`, always alongside the evidence reported for it.
7. Operator controls are *requests*. Critique, contradiction review,
   escalation, simulation handoff and decision handoff are executed by 6.3A.
8. When a capability is unavailable the UI states `BACKEND CAPABILITY PENDING`;
   when the identity lacks permission it states `NOT AUTHORIZED`.

## 2. Capability Specification (CapSpec-6.3B)

Read capabilities: `reasoning.overview`, `reasoning.requests.list`,
`reasoning.requests.get`, `reasoning.conclusions.list`,
`reasoning.conclusions.get`, `reasoning.hypotheses.list`,
`reasoning.evidence.list`, `reasoning.contradictions.list`,
`reasoning.alternatives.list`, `reasoning.critique.list`,
`reasoning.causality.list`, `reasoning.disagreements.list`,
`reasoning.history.list`, `reasoning.health.get`.

Governed requests (executed by 6.3A): `reasoning.critique.request`,
`reasoning.contradiction.review`, `reasoning.disagreement.escalate`,
`reasoning.alternative.simulate`, `reasoning.alternative.to_decision`,
`reasoning.alternative.reason_further`, `reasoning.evidence.request`.

Transport: `supabase.functions.invoke("woic-reasoning", { body: { agency_id,
capability, method, params, contract: "PC-6.3B" } })`. A 404/501 response, an
undefined function, or codes `not_implemented` / `capability_pending` produce a
pending state; 403 / `forbidden` produce a forbidden state.

## 3. Platform DNA (PDNA-6.3B)

- Observational: the workspace watches reasoning, it does not reason.
- Truthful: pending, forbidden and insufficient states are stated plainly.
- Non-theatrical: no simulated thought bubbles, no invented confidence bars.
- Conflict-preserving: contradictions and disagreements remain visible.
- Evidence-anchored: every conclusion view exposes supporting and
  contradicting evidence with source, freshness and reliability.

## 4. Route Map

| Route | Page | Capability |
| --- | --- | --- |
| `/reasoning` | Reasoning Overview | `reasoning.overview` |
| `/reasoning/active` | Active Reasoning | `reasoning.requests.list` / `.get` |
| `/reasoning/conclusions` | Conclusions | `reasoning.conclusions.list` / `.get` |
| `/reasoning/hypotheses` | Hypotheses | `reasoning.hypotheses.list` |
| `/reasoning/evidence` | Evidence Matrix | `reasoning.evidence.list` |
| `/reasoning/contradictions` | Contradictions | `reasoning.contradictions.list` |
| `/reasoning/alternatives` | Alternatives | `reasoning.alternatives.list` |
| `/reasoning/critical-review` | Critical Review | `reasoning.critique.list` |
| `/reasoning/causality` | Causality | `reasoning.causality.list` |
| `/reasoning/disagreements` | Model Disagreement | `reasoning.disagreements.list` |
| `/reasoning/history` | Reasoning History | `reasoning.history.list` |
| `/reasoning/health` | Health + API matrix | `reasoning.health.get` |

## 5. Permission Map

| Group | Roles | Access |
| --- | --- | --- |
| Route guard | `agency_admin`, `super_admin` | All `/reasoning` routes |
| Read capabilities | `agency_admin`, `super_admin` | List/detail views |
| Critique & evidence requests | `agency_admin`, `super_admin` | Request buttons rendered |
| Contradiction review | `agency_admin`, `super_admin` | Human-review request |
| Handoffs (simulate / decide / reason further / escalate) | `agency_admin`, `super_admin` | Handoff buttons rendered |

Client-side role checks only decide which controls are rendered; 6.3A enforces
authorization and returns `NOT AUTHORIZED` where applicable.

## 6. API Integration Matrix

Rendered live at `/reasoning/health`, generated from `CAPABILITIES` in
`src/lib/reasoning/platform.ts`, listing capability, backend method, read vs.
request, and the roles permitted to invoke it.

## 7. Architecture Compliance Report

| Requirement | Status |
| --- | --- |
| No local reasoning / conclusion derivation | PASS — no derivation code paths exist |
| No local confidence or evidence scoring | PASS — `ConfidenceMeter` renders reported values only |
| No local causal inference | PASS — classification read from 6.3A, legend is descriptive |
| Chain-of-thought never displayed | PASS — `redactPrivate` + `MetadataBlock` key filtering |
| Truthful pending / forbidden states | PASS — `CapabilityState` |
| Insufficient evidence as first-class state | PASS — `InsufficientEvidenceState` |
| Conflict never collapsed | PASS — Contradictions and Model Disagreement keep both sides |
| Design system reuse | PASS — Panel/Metric/RecordTable/ListControls/Pager from cognition workspace |
| Command Center integration | PASS — 8 reasoning commands registered |

## 8. Validation Report

- Typecheck: `npx tsgo --noEmit -p tsconfig.app.json` — clean.
- Lint: `npx eslint src/pages/reasoning src/components/reasoning src/hooks/reasoning src/lib/reasoning` — 0 errors (1 pre-existing-style fast-refresh warning shared with the other workspaces).
- Build: passing.
- Routes: 12 routes mount under a role-guarded `/reasoning` block; sidebar and ⌘K entries resolve.
- Regressions: none — existing workspaces untouched apart from additive route, sidebar and command entries.
