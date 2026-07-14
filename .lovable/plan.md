# Workforce OS — Phases 2–4 (autonomous execution)

You've authorized me to run each phase in sequence without pausing for approval. I will still surface the migration for each phase (Supabase requires user approval on migrations) and the security scan results, but I will not stop for a "should I continue" checkpoint between phases.

## Rules that apply to every phase (unchanged from Phase 1)

- Additive only. No existing table, route, edge function, or workflow renamed or removed. Existing `agencies`, `clients`, `client_signers`, `client_sites`, `workers`, `tickets`, `ticket_days`, `ticket_signatures`, `pdf_documents`, `audit_logs`, `notifications`, `agency_members`, `user_roles`, billing/PDF/payroll flows all stay intact.
- RLS on every new table with correct `GRANT`s, `service_role` included where edge functions touch it.
- Every new page ships with loading / empty / permission-denied / error states — no static mocks pretending to be finished.
- AI is suggestion-only. Adjudication requires a user + reason code + audit row.
- Screening / I-9 / E-Verify / tax / banking = provider-neutral scaffolding + a clearly-labeled `mock` adapter until real credentials are wired.
- Each phase ends with: typecheck clean, Supabase linter clean (or documented exception in `@security-memory`), and a short verification pass on the new routes.

## Phase 2 — Onboarding, Documents, Training

New tables (additive):
- `onboarding_templates`, `onboarding_requirements`, `onboarding_checklists`, `onboarding_items` — universal / agency / client / job / location / state / industry scoping.
- `document_templates`, `document_versions`, `document_signatures` (name, sig image, ts, IP, UA, org, assignment, PDF ref, sha256 hash).
- `training_courses`, `training_lessons` (video / reading / quiz), `training_enrollments`, `training_progress` (real watch-time deltas, not "opened"), `training_quiz_attempts`, `training_certificates`.
- New private storage bucket `signed-documents` with per-agency / per-worker path prefix RLS.

Edge functions:
- `sign-document` — hashes payload, uploads signed PDF via existing DocRaptor path, writes `document_signatures`, emits `automation_events`.
- `record-training-progress` — append-only watch-time deltas; anti-scrub guard (max delta ≤ wall-clock delta).
- `issue-training-certificate` — on completion, generates a certificate PDF and files it in the Passport.

UI:
- `/onboarding` — Kanban over the 12 canonical stages + list view. Agencies can rename labels (persisted) while system status stays canonical.
- `/onboarding/:workerId` — checklist view; drives "Cleared for Assignment".
- `/documents` — templates library + assignments; document viewer with typed-name + drawn-signature capture (reuses the existing signature pad).
- `/training` — course catalog, enrollment, lesson player with progress bar, quiz UI, certificate view.
- Passport gets `TrainingSummary`, `DocumentsSection`, `OnboardingReadiness` sections wired to real data.

Gating logic:
- `worker_profiles.cleared_for_assignment` becomes a computed boolean surfaced via a view — true only when required onboarding items complete AND required trainings completed AND required documents signed. Existing ticket creation is **not** blocked by this in Phase 2; instead the Create Ticket worker picker shows a "Not cleared" badge (non-blocking).

## Phase 3 — Jobs, Blind Review, Candidate decisions, Screening scaffold

New tables:
- `job_orders`, `job_requirements`, `applications`, `candidate_submissions`, `interviews`, `offers`, `placements`, `assignments`, `shifts`. `assignments` and `shifts` are the bridge into existing `tickets` (a shift can spawn a ticket; existing ticket flow untouched).
- `candidate_decisions` (reason codes, `ai_viewed`, `ai_followed`, `decided_by`, `decided_at`, notes).
- Screening: `screening_providers`, `screening_packages`, `screening_orders`, `screening_consents`, `screening_reports`, `screening_webhook_events`, `adverse_actions`.

Blind Review:
- SECURITY INVOKER SQL view `public.blind_candidate_view` — omits name, photo, DOB, gender, address, EEO, and any free-text field containing identifying content. All AI matching queries hit this view only; enforced at the DB layer, not the UI.

Edge functions (all with `verify_jwt` handled in code, Sentry-wrapped, JSON error contract):
- `create-screening-candidate`, `send-screening-invitation`, `retrieve-screening-report`, `receive-screening-webhook` (signature-verified), `start-pre-adverse-action`, `complete-adverse-action`.
- `match-candidates` — Lovable AI Gateway call over `blind_candidate_view`; returns ranked suggestions + rationale. No auto-decisions.

UI:
- `/jobs`, `/jobs/:id` (requirements, pipeline, submissions).
- `/candidates` list with Blind Review toggle (default ON for hiring managers).
- `/screening` orders + reports viewer with adverse-action wizard.

Mock adapter for screening is labeled `provider: "mock"` on every row and rendered with a visible "Mock data — not a real background check" banner. No claims of "live" until real credentials land.

## Phase 4 — Scheduling, Timecards extension, Reports, AI Center, Network, Automation workers

- `/scheduling` — calendar over `shifts`; drag to assign workers; conflict detection against existing tickets.
- Timecards extension — new `pay_profiles`, `bill_profiles`, `pay_rules` tables. Existing `ticket_days` / `tickets` weekly OT logic is preserved; new tables layer on top for multi-rate / differential / burden calculations. Existing exports keep working.
- `/reports` — saved queries per module, CSV export, respects RLS.
- `/ai-center` — one place to view AI runs (résumé parses, credential OCR, match rationales). All rows point back to a `resume_parse_runs`-style audit table.
- `/network` — opt-in cross-agency talent sharing scaffold (tables + consent flow only; no live sharing until agencies opt in).
- Automation worker edge functions (`process-automation-events`, invoked on `automation_events` via pg cron every minute): fan-out for the "Cleared → Placed" pipeline (notify recruiter, generate offer packet, kick off screening, enroll required training, create onboarding checklist, notify client hiring manager). Each side effect is idempotent (keyed by `event_id`).

## Order of operations per phase

For every phase I will:
1. Draft the migration (single call) — you approve, it runs, types regenerate.
2. Write shared helpers, edge functions, hooks, pages, and route wiring in parallel batches.
3. Run typecheck, Supabase linter, and a targeted Playwright smoke over the new routes.
4. If the linter flags anything not already covered by `@security-memory`, fix it before moving on.
5. Move to the next phase.

## What I will NOT do without asking

- Rename, drop, or repurpose any existing table, column, route, or edge function.
- Ship a page as "done" that isn't wired to real Supabase data.
- Claim a screening / I-9 / E-Verify / tax / banking integration is live before real credentials are configured.
- Block the existing ticket creation flow on new Phase 2/3 gates.

## Technical notes

- Enum extensions (`app_role`, any new status enums) go in their own migration when they need to be referenced later in the same transaction, per the Postgres constraint we hit in Phase 1.
- All new `SECURITY DEFINER` helpers land in the `private` schema (matches Phase 1 hardening finding fixes).
- New storage buckets: `signed-documents` (Phase 2), `training-assets` (Phase 2, public read of course thumbnails only), `screening-artifacts` (Phase 3, private, service-role only).
- New edge functions get wrapped in the existing `withSentry` + `_shared/auth.ts` helpers so the 400/401/403 JSON contract from `docs/edge-function-status-codes.md` is preserved.
- Frontend: modules already registered in `src/lib/modules.ts` — Phase 2/3/4 work flips each one from `status: "phase2"|"phase3"|"phase4"` to `status: "live"` and swaps the `ModulePlaceholder` route for the real page.

Approve this and I'll start Phase 2 with the migration.
