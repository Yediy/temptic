# Phase 5.7B — Platform Graph Explorer

Architecture: IWOS v1.3.0 · Constitution v1.0 · Contract PC-5.7B · CapSpec-5.7B · PDNA-5.7B

## Platform Contract (PC-5.7B)

| Clause | Commitment |
| --- | --- |
| Data source | All nodes, edges, traversals and analytics come from the `woic-graph` edge function via `src/hooks/graph/use-graph.ts`. |
| Cognition | Explanations, impact narratives and NL search route through `woic-cognitive` via `src/hooks/woic/use-cognitive.ts`. |
| No frontend graph logic | The client performs rendering and filtering only. No traversal, scoring, path-finding or risk math is implemented client-side. |
| No duplicate storage | No new tables. No client caches beyond TanStack Query and user-owned view/settings preferences in `localStorage`. |
| Tenancy | Every API call passes `agency_id` from `useAuth()`; RLS remains the enforcement boundary. |
| Routing | Mounted under `/graph`, guarded by `ProtectedRoute` for `agency_admin` and `super_admin`. |

## Capability Specification (CapSpec-5.7B)

- Navigation (15 sections): Platform Overview, Organization, Worker, Project, Knowledge, Automation, Communication, Timeline, AI Agent, Platform Domain, Dependency, Impact Analysis, Graph Search, Saved Views, Settings.
- Visualization modes (13): relationship, force-directed, hierarchy, tree, radial, timeline overlay, journey, career, compliance, dependency, executive, risk, infrastructure — each maps to a canvas layout + overlay pair.
- Node Inspector: identity, organism type, Platform DNA, constitution/contract references, attributes, health, metrics, dependencies, relationships, AI explanation and recommendations.
- Graph Search (10 kinds): natural language, semantic, relationship, shortest path, similarity, dependency, impact, organization, worker, knowledge.
- Impact Analysis (6 scenarios): worker leaves, policy changes, organization merges, automation fails, project slips, regulation changes — each combines `risk_propagation` + `find_team_dependencies` + cognitive reasoning/prediction.
- Executive dashboard: platform health, organizational health, knowledge connectivity, automation connectivity, risk concentration, critical dependencies, platform evolution.

## Platform DNA (PDNA-5.7B)

```text
GraphExplorer
├── lib/graph/platform.ts      declarative DNA: domains, modes, scenarios, settings
├── components/graph
│   ├── GraphCanvas.tsx        GPU-free canvas renderer, zoom/pan, 4 layouts, overlays
│   ├── DomainGraph.tsx        reusable scoped workspace (filters, modes, time travel)
│   └── NodeInspector.tsx      universal organism detail surface
└── pages/graph                Overview · Domain · Dependency · Impact · Search · Views · Settings
```

## Validation Report

- TypeScript project check: pass (`tsgo --noEmit`).
- Reuse audit: zero new API surfaces; `useSubgraph`, `useGraphTaxonomy`, `useGraphNeighbors`, `useShortestPath`, `useSimilarWorkers`, `useRiskPropagation`, `useTeamDependencies`, intelligence hooks and `useGraphSync` all reused as-is.
- Conflict repair: `/graph` index now resolves to Platform Overview; previous Explorer/Intelligence/Paths/Taxonomy routes preserved and still linked.
- Persistence: saved views (`iwos.graph.explorer.views.v1`) and settings (`iwos.graph.explorer.settings.v1`) are device-local, non-authoritative.

## Architecture Compliance Report

| Rule | Status |
| --- | --- |
| Consume Platform Graph Intelligence APIs only | Compliant |
| Never implement graph logic in the frontend | Compliant (layout/rendering only) |
| Never duplicate graph storage | Compliant (no tables, no mirrors) |
| Never duplicate graph traversal | Compliant (neighbors/paths served by `woic-graph`) |
| Dark-first mission-control UI, semantic tokens only | Compliant |
| Command palette integration | Compliant (4 new registry entries) |

Ready for Phase 5.8A.
