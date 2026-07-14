## TTOS (Temp Tic Operating System) — Phase 2

Extending Phase 1 additively. Nothing existing (auth, RLS, portals, tickets, jobs, workers, training) is rewritten. All new subsystems are namespaced under a `ttos_` prefix so they can coexist with the current `automation_events`, `audit_logs`, `notifications`, and `ai_runs` tables already in production.

### Scope framing (important)

Your prompt asks for what is effectively 12–18 months of platform work (Windows-before-Word). I will not fake it with mocks. I will ship a **real, minimal, extensible core** now, and stub the rest behind clean interfaces so future modules plug in without redesign. Every "system" below has: a table, RLS, a hook/service, and one working UI surface. Advanced flourishes (drag-and-drop workflow canvas, Slack/Teams channels, OCR, 10M-worker sharding) are explicitly deferred and noted.

### What ships this phase

**1. Event Engine + Event Bus (real)**
- `ttos_events` table: id, agency_id, module, name, actor_id, entity_type, entity_id, status, metadata jsonb, correlation_id, created_at. Append-only (no update/delete policies).
- `ttos_event_subscribers` table: module, event_name pattern, handler_key, enabled.
- `src/lib/ttos/events.ts` — `emit(event)` client helper (writes row + optional realtime broadcast).
- `supabase/functions/ttos-dispatch` — service-role worker that fans out unprocessed events to registered handlers (reuses existing `process-automation-events` idempotency pattern).
- Wire emitters into existing hooks: ticket sign/send/reject, job create, worker create, training complete, document sign, invite accept.

**2. Automation + Rule Engine (real, minimal)**
- `ttos_automations` table: trigger_event, conditions jsonb, actions jsonb, priority, enabled, retries.
- `ttos_automation_runs` table: automation_id, event_id, status, error, attempts, ran_at.
- Executor lives inside `ttos-dispatch`. Actions supported at launch: `notify`, `create_task`, `emit_event`, `update_status`. Everything else is a typed no-op placeholder that logs a run so future action types drop in.

**3. Notification Center (real, extending existing `notifications`)**
- Reuse current `notifications` table. Add `ttos_notification_deliveries` for per-channel state (in_app, email; SMS/Slack/Teams stubbed).
- `/notifications` page: unified inbox with critical/high/medium/low filter, mark-read, and channel indicators.

**4. Background Job Queue (real)**
- `ttos_jobs` table: kind, payload, status (queued/running/succeeded/failed), attempts, run_after, locked_by, locked_until.
- `supabase/functions/ttos-worker` — pulls N jobs with `FOR UPDATE SKIP LOCKED` semantics via RPC, executes, records status.
- Admin page `/admin/ttos/jobs`.

**5. Universal Timeline (real)**
- View `ttos_timeline` over `ttos_events` scoped by `entity_type/entity_id`.
- `<Timeline entityType entityId />` React component. Drop into ticket, worker, job, client detail pages (one line each — non-invasive).

**6. Universal Search (real, minimal)**
- `ttos_search_index` materialized rows: entity_type, entity_id, agency_id, title, subtitle, tags, tsv (tsvector generated column).
- Populated by triggers on tickets, workers, clients, jobs, documents.
- `<GlobalSearch />` in top nav with ⌘K, hits `search_index` via RLS.

**7. Global Task System (real)**
- `ttos_tasks` table: title, description, owner_id, agency_id, entity_type, entity_id, due_at, priority, status, dependencies uuid[].
- `/tasks` page with filters + create/complete.

**8. Audit Center (extend existing `audit_logs`)**
- Add `/admin/ttos/audit` viewer with entity/actor/date filters. No schema change — existing immutability policies already enforce this.

**9. AI Decision Queue (real, minimal — extends `ai_runs`)**
- `ttos_ai_decisions` table: run_id, recommendation, confidence, reason, status (pending/approved/rejected/modified), reviewer_id.
- `/ai-center` gets a "Decisions" tab. Nothing auto-executes.

**10. Global Settings (real)**
- `ttos_org_settings` table keyed by agency_id: branding jsonb, notifications jsonb, automation_defaults jsonb, ai_preferences jsonb, retention jsonb, security jsonb.
- `/settings/organization` page.

**11. Global Calendar (minimal)**
- `ttos_calendar_events` view unioning existing `shifts`, `interviews`, `worker_credentials.expires_at`, `training_enrollments.due_at`, ticket work dates.
- `/calendar` month view with filter chips.

**12. Internal Messaging (minimal)**
- `ttos_message_threads` + `ttos_messages` tables with RLS scoped to participant list.
- `/messages` page: threads + composer + read receipts. Attachments = storage links (bucket reused).

**13. Document Center (extend)**
- No new bucket. Add `ttos_document_index` view unioning `worker_documents`, `document_signatures`, `pdf_documents`, `signed-documents` storage.
- `/documents` page with category filter, expiration badges, preview.

### Explicitly deferred (documented, not built)

- Visual drag-and-drop **workflow canvas** — schema for `ttos_workflow_templates/instances/steps/logs` created but UI is a JSON editor for now. Building React Flow canvas is a whole phase on its own.
- **SMS / Slack / Teams / Push** channels — delivery rows accept the channel but transports throw `not_implemented`.
- **OCR** on documents — deferred until a real document ingest need exists.
- **10M workers / horizontal sharding** — Postgres + indexes suffice at current scale; sharding is premature.
- **Saved searches, keyboard shortcut palette everywhere** — ⌘K only; per-page shortcuts later.

### RLS pattern (every new table)

```
agency_id filter using private.current_agency_ids()  -- reuses existing helper
service_role: full access
authenticated: SELECT within agency; INSERT gated by role_permissions
UPDATE/DELETE denied on events, audit, deliveries (append-only)
GRANTs to authenticated + service_role in same migration
```

### Sequencing (4 sub-phases inside this build)

1. **Core spine**: migrations for events, event_subscribers, jobs, automations, automation_runs, tasks, org_settings, ai_decisions, message threads/messages, calendar view, search index, workflow tables. All GRANTs + RLS. Deploy `ttos-dispatch` and `ttos-worker` edge functions. Wire emitters into 6 existing hooks.
2. **UI surfaces**: `/notifications`, `/tasks`, `/calendar`, `/messages`, `/documents`, `/settings/organization`, `/admin/ttos/{jobs,audit,events,automations}`. Add `<Timeline>` + `<GlobalSearch>` components. Route wiring in `App.tsx`, module registry entries in `modules.ts`.
3. **Automation execution**: implement `notify`, `create_task`, `emit_event`, `update_status` action handlers. Seed 3 built-in rules (credential expiring, background check fail, ticket approved → payroll placeholder).
4. **Verify**: typecheck, run the existing auth integration test suite, and add one new integration test that emits an event and asserts a task+notification result via the dispatcher.

### Non-goals for this phase

- No changes to ticket lifecycle, RLS on tickets, PDF pipeline, Stripe, Resend transport, DocRaptor, or Sentry setup.
- No renaming existing tables. TTOS coexists.
- No new external API integrations.

### Deliverable at the end

A functioning TTOS spine: events flowing, one worker draining the queue, tasks/notifications/timeline/search/calendar/messages/settings/audit/AI-decisions pages live, three automations executing end to end, and clean interfaces for every future module to plug into via `emit()` + subscribers.

If you want a bigger or smaller cut (e.g. drop messaging + calendar to ship faster, or add the workflow canvas now), say which levers to pull before I start.