# Temp Tic → Modular Workforce Operating System

This is a very large scope (16 modules, ~45 new tables, screening integrations, training LMS, blind review, automation engine). I will not attempt it in one turn — that would produce shallow mock pages, which you explicitly forbade. Instead, ship it in additive phases, each fully wired to Supabase with RLS and real CRUD before moving on. Everything is **additive**: no existing table, route, edge function, or workflow (agencies, clients, workers, tickets, timecards, payroll, PDFs, auth) is renamed, dropped, or replaced.

## Guiding rules (apply to every phase)

- Non-destructive migrations only. New tables/columns; never `DROP` or rename an existing one. Existing `tickets`, `client_signers`, `workers`, `agencies`, etc. stay intact.
- Existing `agencies` table = `organizations` conceptually. Add `organization_locations`, `organization_memberships` as new tables that reference `agencies.id`; do **not** rename `agencies`.
- Existing `workers` table stays. New `worker_profiles` extends it 1:1 for Passport fields; existing `user_roles` enum is extended additively.
- RLS on every new tenant table, with `service_role` grants for edge functions. EEO + screening + identity docs get stricter policies and private storage.
- Every new module page has: loading, empty, permission-denied, and error states — no static mocks shipped as "done".
- No AI-driven adjudication. AI produces suggestions with Accept/Edit/Reject; final decisions require a user + reason code + audit row.
- Screening/I-9/E-Verify/tax/banking = provider-neutral scaffolding + mock adapter clearly labeled `mock`. No claims of "live" until real credentials + production API are wired.

## Phase plan

### Phase 1 — Foundation (this deliverable)

Ship the shell and the core new domain tables so every later phase plugs in cleanly.

1. **Role & permission expansion**
   - Extend `app_role` enum with: `agency_owner`, `recruiter`, `account_manager`, `onboarding_specialist`, `compliance_specialist`, `scheduler`, `payroll_specialist`, `billing_specialist`, `client_hiring_manager`, `client_supervisor`, `candidate`. Keep existing values.
   - New `role_permissions` table (role → module key → allowed actions).
   - `private.has_module_access(user, module)` helper for RLS + UI gating.

2. **Modular navigation shell**
   - New `src/lib/modules.ts` registry: 16 modules with icon, path, required permission, portal (agency/client/worker).
   - Refactor `AppSidebar` to render from the registry, grouped and role-filtered. Existing Dashboard/Tickets/Clients/Workers/Billing/etc. routes are preserved and mapped into the new modules (Command Center = existing Dashboard, Tickets = existing, Billing = existing, Clients = existing).
   - Add mobile bottom nav (top 4 modules) + "More" sheet for the rest. Client + Worker portals get their own registries per spec.
   - Global search + command palette (`cmdk`) scoped to accessible modules.

3. **Workforce Passport core tables** (additive, referencing `workers.id`)
   - `worker_profiles` (preferred_name, general_location, travel_radius, transportation, availability_json, shift_prefs, desired_pay, rehire_eligible, completion_score cached).
   - `employment_history`, `skills` (catalog) + `worker_skills`, `credentials` (catalog) + `worker_credentials` (with issued/expires/status/document_id), `references`, `resumes`, `worker_documents`, `emergency_contacts`, `worker_preferences`.
   - `eeo_demographics` in its own table with a compliance-only RLS policy (no recruiter/hiring-manager read).
   - Storage: private bucket `worker-documents` with per-worker path + audit trigger on read via edge function.

4. **Passport UI (Talent module)**
   - `/talent` list (table + filters + saved filters shell).
   - `/talent/:id` passport view with completion score, sections (Identity, Work history, Skills, Credentials, Availability, Documents, Training, Payroll readiness, Screening readiness), and missing-item alerts.
   - Résumé upload → `parse-resume` edge function (mock adapter now, AI Gateway wiring next phase) → review screen with Accept/Edit/Reject per field. No silent overwrites.

5. **Audit + events foundation**
   - Extend existing `audit_logs` with `event_type`, `entity_type`, `entity_id`, `metadata` if missing.
   - New `automation_events` table: append-only event bus (`worker.registered`, `profile.completed`, …). Trigger functions fire on the relevant tables. Workers (edge functions) consume in later phases.

**Deliverable at end of Phase 1:** working modular shell, role-aware nav across all three portals, Workforce Passport CRUD + completion scoring + résumé review, event bus emitting events, all guarded by RLS.

### Phase 2 — Onboarding + Documents + Training

- `onboarding_templates`, `onboarding_requirements`, `onboarding_checklists`, `onboarding_items` with universal / agency / client / job / location / state / industry scoping.
- Kanban + list views over the 12 stages; agencies can customize labels (stored) while system status stays canonical.
- `document_templates` + `document_versions` + `document_signatures` (name, sig, ts, IP, UA, org, assignment, PDF, hash). Reuse existing `generate-pdf` + `ticket-assets` pattern; new bucket `signed-documents`.
- Form packages by classification (employee / IC / temp / direct-hire) — agency must confirm classification; W-2 is **not** an onboarding form.
- Training Passport: `training_courses`, `training_lessons` (video/reading/quiz), `training_enrollments`, `training_progress` (real watch-time tracking, not "page opened"), `training_quiz_attempts`, `training_certificates`.
- Gate `Cleared for Assignment` on required training + required checklist items complete.

### Phase 3 — Jobs, Blind Review, Candidate decisions, Screening scaffold

- `job_orders`, `job_requirements`, `applications`, `candidate_submissions`, `interviews`, `offers`, `placements`, `assignments`, `shifts` (assignments/shifts feed existing tickets).
- Blind Review mode: candidate cards render anonymized fields; a view-layer allowlist strictly enforced server-side via a `blind_candidate_view` (SECURITY INVOKER view) that omits name/photo/DOB/gender/address/EEO. AI matching queries this view only.
- `candidate_decisions` table with reason codes, AI-viewed / AI-followed flags.
- Screening: `screening_providers`, `screening_packages`, `screening_orders`, `screening_consents`, `screening_reports`, `screening_webhook_events`, `adverse_actions`. Edge functions: `create-screening-candidate`, `send-screening-invitation`, `retrieve-screening-report`, `receive-screening-webhook`, `start-pre-adverse-action`, `complete-adverse-action`. Mock adapter labeled `mock`, no results treated as real.

### Phase 4 — Scheduling, Timecards (extend), Payroll/Billing polish, Reports, AI Center, Network, Automation workers

- Scheduling module over `shifts`.
- Extend timecard flow off existing tickets; wire pay_profile / bill_profile.
- Reports module with saved queries per module.
- AI Center: résumé parsing, credential OCR, match explanations — all via Lovable AI Gateway, all suggestion-only.
- Network module: cross-agency talent sharing scaffold (opt-in).
- Automation worker edge functions that consume `automation_events` and execute the "Cleared → Placed" fan-out described in the spec.

## Technical section

**Migrations (Phase 1):**

1. `alter type app_role add value ...` for each new role (idempotent guard via `do $$ ... $$`).
2. `create table public.role_permissions(role app_role, module text, actions text[], primary key(role, module))` + GRANTs (`select` to authenticated, `all` to service_role) + RLS (read: authenticated; write: super_admin only via `has_role`).
3. `create table public.organization_locations(...)`, `public.organization_memberships(...)` — reference `agencies(id)`, RLS scoped via `private.get_user_agency_id`.
4. `create table public.worker_profiles(worker_id uuid pk references workers on delete cascade, ...)` + companion tables listed above. All get GRANTs + RLS.
5. `create table public.eeo_demographics(worker_id uuid pk ..., ...)` + RLS: only `compliance_specialist` or `super_admin` can select; no update by worker after submit (append-only via history table).
6. `create table public.automation_events(...)` append-only; RLS denies writes to authenticated; triggers on `workers`, `worker_profiles`, `worker_credentials`, `worker_documents`, `training_enrollments` insert into it via `security definer` functions in `private`.
7. `private.has_module_access(_user uuid, _module text) returns boolean` — joins `user_roles` + `role_permissions`.

**Storage:** new private bucket `worker-documents`; RLS on `storage.objects` limits path prefix to `{agency_id}/{worker_id}/`. Signed URLs only via edge function `get-worker-document` which logs to `audit_logs`.

**Frontend structure (Phase 1):**
- `src/lib/modules.ts` — registry.
- `src/lib/permissions.ts` — `useModuleAccess(moduleKey)` hook.
- `src/components/CommandPalette.tsx`, updated `AppSidebar.tsx`, new `MobileBottomNav.tsx`.
- `src/pages/talent/TalentList.tsx`, `src/pages/talent/TalentPassport.tsx`, `src/components/passport/*` (Identity, WorkHistory, Skills, Credentials, Availability, Documents, TrainingSummary, ScreeningReadiness, PayrollReadiness sections + `CompletionRing`).
- `src/hooks/use-passport.ts` — CRUD + completion score.
- `supabase/functions/parse-resume/index.ts` — auth-gated, calls mock adapter now; contract stable for AI Gateway swap in Phase 2.

**What Phase 1 does NOT ship (called out so nothing is misrepresented):**
- Full Kanban onboarding UI, document e-sign, LMS video player, screening provider adapters, scheduling, invoicing UI redesign, AI matching. Those are Phase 2–4 above.

## Confirm before I start

Phase 1 is still ~2–3 hours of implementation across ~30 files and one large migration. Reply **"go phase 1"** to proceed exactly as scoped, or tell me to reorder / trim (e.g. "skip Talent UI, do onboarding tables first"). If you want me to draft the migration first for review before any code, say **"migration first"**.
