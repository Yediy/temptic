# Phase 6.1B — WOIC Perception & Context Workspace

Contracts: **PC-6.1B** / **CapSpec-6.1B** / **PDNA-6.1B**
Backend organism: `woic-perception` (Phase 6.1A) — single entry point for every read.

## Purpose

Human observability surface for WOIC Perception & Context Intelligence. Authorized users can
inspect what WOIC observed, where it came from, why it was considered relevant, what context was
assembled, what was ignored, what is missing, what contradicts, what is salient, whether context is
fresh, and whether coverage is sufficient.

## Sections

| Route | Section |
| --- | --- |
| `/perception` | Perception Overview |
| `/perception/observations` | Live Observations (pin, pause, inspect) |
| `/perception/context-packs` | Context Packs + Inspector + Composition |
| `/perception/entities` | Entity Resolution |
| `/perception/relevance` | Relevance (included / excluded) |
| `/perception/attention` | Attention Signals |
| `/perception/contradictions` | Contradictions |
| `/perception/missing` | Missing Information |
| `/perception/freshness` | Context Freshness |
| `/perception/sources` | Source Health |
| `/perception/settings` | Settings, privacy scope, capability registry |

## Architectural rules honored

- **No perception in the frontend.** No entity resolution, relevance ranking, salience scoring,
  contradiction detection, or evidence evaluation is computed client-side. Every operational value
  is rendered exactly as reported by 6.1A.
- **Truthful degradation.** Missing capabilities render `BACKEND CAPABILITY PENDING` via
  `CapabilityState`; nothing synthetic is substituted.
- **Privacy.** `redactPrivate` strips private reasoning payloads at the transport boundary.
  Restricted sources show metadata only, never contents.
- **Unknowns stay unknown.** Unresolved entities, unresolved contradictions, and declared gaps are
  displayed as such and are never promoted to fact.
- **Permissions.** Routes are guarded to `agency_admin` / `super_admin`; the privacy inspector is
  additionally role-gated in the client.

## Integration

- Sidebar entry: "Perception & Context".
- ⌘K Command Center: 10 governed navigation commands (`go.perception.*`).
- Architecture Console: contract, CapSpec, DNA and dependency links surfaced in Settings.

Status: **PERCEPTION & CONTEXT WORKSPACE ESTABLISHED. READY FOR PHASE 6.2 — WORKING MEMORY &
COGNITIVE STATE.**
