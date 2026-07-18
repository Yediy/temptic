
# Temptic Recruit OS — Operating Profile Build (IWOS Build 4.0)

Recruit OS becomes a **profile layer** on top of existing IWOS (WOIC + TTOS). It **calls** shared services — it does not duplicate identity, workflow, document, comms, compliance, AI, or automation engines.

## Guardrails
- Additive migrations only. No changes to existing `woic_*`, `ttos_*`, or core tables.
- All AI/recommendation calls route through `woic-api` / `woic-recommend`.
- All workflow stages, notifications, tasks, and events route through TTOS (`ttos_*`, `ttos-dispatch`).
- Multi-tenant isolation via existing `agency_id` + RLS pattern (has_role, requireAgencyMember).
- No stack change. React + Vite + Supabase.

## Reuse map (do not rebuild)
| Concern | Existing service used |
|---|---|
| Identity | `woic_identities`, `woic_identity_memberships` |
| Workers/base profile | `workers`, `worker_profiles`, `worker_skills`, `worker_credentials`, `worker_documents` |
| Jobs (base) | `job_orders`, `job_requirements` |
| Clients | `clients`, `client_sites`, `client_signers` |
| Pipelines | `applications`, `candidate_submissions`, `interviews`, `offers`, `placements`, `assignments` |
| Workflow stages | TTOS automations + `ttos_tasks` |
| AI matching | `woic-recommend`, `woic_recommendations` |
| Knowledge / resume intel | `woic_knowledge_*` + existing `parse-resume` edge function |
| Notifications/comms | `ttos_notifications`, `ttos_messages` |
| Compliance | `woic_compliance_*` |
| Analytics/predictions | `woic_prediction_*` |

## New schema (additive, Recruit-OS-specific only)

Only fields the existing tables lack:

- `recruit_candidate_scores` — `agency_id`, `worker_id`, `reliability_score`, `reputation_score`, `performance_score`, `last_computed_at`, `factors jsonb`.
- `recruit_talent_preferences` — `agency_id`, `worker_id`, `preferred_roles text[]`, `preferred_locations text[]`, `min_pay_rate numeric`, `max_travel_miles int`, `availability jsonb`, `remote_ok bool`.
- `recruit_marketplace_opportunities` — `agency_id`, `job_order_id`, `kind` (`job|training|certification|advancement`), `visibility` (`public|invited|network`), `published_at`, `expires_at`, `payload jsonb`.
- `recruit_marketplace_interest` — `opportunity_id`, `worker_id`, `status` (`saved|interested|applied|dismissed`), timestamps.
- `recruit_pipelines` — `agency_id`, `name`, `is_default bool`, `job_order_id?` (nullable = agency default).
- `recruit_pipeline_stages` — `pipeline_id`, `key`, `label`, `position int`, `stage_type` (`sourcing|screening|interview|submission|offer|onboarding|active|closed`).
- `recruit_pipeline_entries` — `pipeline_id`, `stage_id`, `worker_id`, `job_order_id`, `submission_id?`, `assignment_id?`, `entered_at`, `notes`.
- `recruit_recruiter_activity` — `agency_id`, `recruiter_id`, `verb` (`call|email|note|submit|interview|placement`), `subject_entity`, `subject_id`, `metadata jsonb`.
- `recruit_client_contacts` — `agency_id`, `client_id`, `name`, `title`, `email`, `phone`, `is_primary bool`, `preferences jsonb` (only if not covered by `client_signers`; otherwise skip).

Every new public table gets GRANTs (auth + service_role) + RLS scoped by `agency_id` via `agency_members`, mirroring existing patterns.

## Edge functions (thin — reuse WOIC/TTOS)
- `recruit-score-candidate` → aggregates worker signals, writes `recruit_candidate_scores`, invokes `woic-recommend` for skill ranking.
- `recruit-match-job` → wraps `woic-recommend` with `subject_entity='job'`, persists top-N results into `woic_recommendations`.
- `recruit-recruiter-assistant` → routes to Lovable AI gateway (chat completions) with tools that fetch candidates via authenticated client; returns draft messages, summaries, next actions. All AI runs recorded in `ai_runs` + `woic_learning_history`.
- `recruit-pipeline-advance` → moves a pipeline entry, emits TTOS event, creates TTOS task if stage requires action.

## Frontend (new module, `agency` group)

New route group `/recruit/*` behind existing `ProtectedRoute` + agency_member check:

- `/recruit` — Recruit Dashboard (KPIs: time-to-fill, placement rate, pipeline health, revenue forecast — all from woic-api + supabase views).
- `/recruit/candidates` — Candidate Database (list of `workers` + score + skills + AI summary).
- `/recruit/candidates/:id` — Candidate 360 (existing passport + scores + submissions + activity + AI insights).
- `/recruit/marketplace` — Talent Marketplace (opportunities feed, worker-facing subroute at `/worker/opportunities`).
- `/recruit/jobs` — Job Orders (extends existing `job_orders`, adds pipeline + AI match tab).
- `/recruit/jobs/:id` — Job order detail with AI-matched candidates panel (calls `recruit-match-job`).
- `/recruit/clients` — Client CRM (extends `clients` with contacts, revenue, communication timeline via TTOS).
- `/recruit/clients/:id` — Client detail.
- `/recruit/pipeline` — Kanban of `recruit_pipeline_entries` grouped by stage.
- `/recruit/interviews` — Interview list + scheduling (extends `interviews`).
- `/recruit/placements` — Placement tracking (extends `placements`).
- `/recruit/analytics` — Workforce analytics (WOIC predictions + saved reports).
- `/recruit/assistant` — AI Recruiter Center (chat UI + tool calls).

Add "Recruit OS" section to `AppSidebar` (operations group) with these entries.

## Hooks
- `src/hooks/recruit/use-candidates.ts`, `use-job-orders.ts`, `use-pipeline.ts`, `use-marketplace.ts`, `use-recruit-assistant.ts` — all thin wrappers over supabase client + `supabase.functions.invoke`.

## Security
- Sensitive demographics (`eeo_demographics`) explicitly excluded from any AI ranking payload — enforced in `recruit-match-job` by selecting an allowlisted column set.
- All recommendations write `explanation` into `woic_recommendations.reasoning` so UI can render "why".
- Marketplace visibility gated by worker consent (`recruit_talent_preferences.remote_ok` / opt-in flags).

## Build phases

1. **Schema migration** (one migration) — all `recruit_*` tables + GRANTs + RLS + `updated_at` triggers. Extend `agency` module registry.
2. **Edge functions** — `recruit-score-candidate`, `recruit-match-job`, `recruit-pipeline-advance`, `recruit-recruiter-assistant`.
3. **Client hooks + shared types** (`src/lib/recruit/types.ts`, `src/hooks/recruit/*`).
4. **Route scaffolding** — layout, sidebar entries, `ProtectedRoute` wrappers, empty pages with `AsyncState`.
5. **Page implementations** — Dashboard → Candidates → Jobs → Pipeline → Marketplace → Clients → Interviews → Placements → Analytics → Assistant.
6. **Verification** — build + typecheck; Playwright smoke on `/recruit` dashboard; confirm no duplicate WOIC/TTOS logic introduced.

## Deliverable
A new "Recruit OS" module accessible from the sidebar that agencies can use to run the full staffing workflow, with every intelligence surface delegating to WOIC and every workflow/notification surface delegating to TTOS.

## Confirmation needed
This is a large surface (1 migration, 4 edge functions, ~11 pages, ~5 hook files). Reply **"proceed"** to build it in order, or tell me to trim scope (e.g. ship phases 1–4 first, then pages incrementally).
