
# IWOS Build 4.7 — Client Collaboration Operating Profile

Additive extension only. Reuses IWOS Foundation, WOIC, TTOS, TTO, PB, Recruit, Passport, and Onboarding. No existing systems rebuilt. All state changes emit TTOS events; intelligence delegates to WOIC.

## Scope decisions
- New tables all prefixed `cc_` (client collaboration) to avoid collision with existing `clients`, `client_signers`, `client_sites`, `client_invites`, `client_requirements`.
- Client identity keeps using existing `clients` + `client_signers`. `cc_client_users` layers portal-user linkage + granular permissions on top; it does not replace the existing client auth.
- Existing Client Portal (`/client`) stays functional. New collaboration workspace mounts at `/client/workspace/*` and progressively augments the existing portal.
- All RLS scoped via `agency_id` + client membership check (`cc_client_users.user_id = auth.uid()`).

## Phase 1 — Database migration (additive)

New tables (each: id, agency_id, timestamps, RLS ON, GRANTs to authenticated + service_role):

- `cc_workspaces` (client_id, name, settings jsonb, status)
- `cc_client_users` (client_id, user_id, role enum [corporate_admin, branch_manager, hiring_manager, project_manager, finance, read_only, custom], custom_permissions jsonb, status)
- `cc_permissions` (client_id, role, module text, actions text[]) — permission matrix
- `cc_threads` (client_id, kind [agency, worker, group], subject, participants jsonb, last_message_at)
- `cc_messages` (thread_id, sender_user_id, sender_kind, body, attachments jsonb, read_by jsonb)
- `cc_documents` (client_id, category [contract, msa, sow, insurance, compliance, invoice, safety, training, other], name, storage_path, version int, parent_id, uploaded_by, metadata jsonb)
- `cc_notifications` (client_id, user_id, kind, title, body, link, read_at, severity)
- `cc_requests` (client_id, kind [additional_workers, replacement, schedule_change, payroll_q, billing_q, compliance_review, general], subject, body, status [open, in_progress, resolved, closed], priority, assignee_user_id, metadata jsonb)
- `cc_activities` (client_id, actor_user_id, actor_kind, verb, object_type, object_id, metadata jsonb) — activity feed
- `cc_analytics_snapshots` (client_id, period_start, period_end, metrics jsonb) — periodic rollup cache
- `cc_settings` (client_id unique, preferences jsonb, notification_prefs jsonb, branding jsonb)
- `cc_audit_logs` (client_id, actor_user_id, action, target_type, target_id, ip, user_agent, payload jsonb) — immutable, no update/delete policies

Storage bucket: `client-documents` (private) for `cc_documents` uploads.

RLS pattern: `agency_id IN (select agency_id from public.agency_members where user_id = auth.uid())` OR `client_id IN (select client_id from public.cc_client_users where user_id = auth.uid() and status='active')`. Audit logs insert-only for clients, immutable for all.

## Phase 2 — Edge functions

- `cc-send-message` — post to thread, updates last_message_at, emits `ttos.event cc.message.sent`, sends notification email via existing send-transactional-email.
- `cc-create-request` — validates payload, inserts request, notifies agency assignee, logs activity + TTOS event.
- `cc-summarize-thread` — WOIC-backed conversation summary (delegates to existing `woic-conversation-summarize`).
- `cc-client-advisor` — WOIC recommend wrapper scoped to client (staffing levels, replacements, risk alerts) using `woic-recommend`.
- `cc-generate-analytics` — computes fill rate, time-to-fill, attendance, turnover, OT, labor costs from existing tables (job_orders, placements, tto_time_tickets, pb_invoices) and upserts `cc_analytics_snapshots`.
- `cc-upload-document` — signed URL issuance + audit log entry.
- `cc-approve` — dispatches approval to correct downstream function (tto-approve-ticket, pb approve invoice, etc.) with client-user auth check.

## Phase 3 — Frontend hooks

`src/hooks/cc/use-client-collab.ts` exposing:
- `useCommandCenter(clientId)` — aggregated dashboard tiles
- `useCcThreads`, `useCcMessages`, `useSendMessage`
- `useCcDocuments`, `useUploadCcDocument`
- `useCcRequests`, `useCreateCcRequest`
- `useCcNotifications`
- `useCcActivities`
- `useCcAnalytics`
- `useClientAdvisor` (WOIC recs)
- `useCcPermissions`, `useCcClientUsers`

Realtime: subscribe to `cc_messages`, `cc_notifications`, `cc_activities` via existing supabase channel pattern.

## Phase 4 — UI (`/client/workspace/*`)

New route group under existing ClientLayout:
- `ClientWorkspaceLayout.tsx` — side tabs
- `CommandCenter.tsx` — tiles + activity feed + WOIC panel
- `JobOrderCenter.tsx` — CRUD wrapper on existing `job_orders` scoped to client
- `CandidateReview.tsx` — pulls existing `candidate_submissions` + Passport
- `ApprovalCenter.tsx` — unified queue (time tickets, invoices, expenses, OT, extensions)
- `DocumentCenter.tsx` — upload/version list per category
- `CommunicationCenter.tsx` — threads + composer + AI summary button
- `ClientAnalytics.tsx` — chart tiles from snapshots
- `ClientAdvisor.tsx` — WOIC recommendations feed
- `ServiceRequests.tsx` — request kanban (open/in_progress/resolved)
- `Calendar.tsx` — merged event view
- `Permissions.tsx` — role + user management (corporate_admin only)
- `NotificationsCenter.tsx` — inbox
- `ExecutiveView.tsx` — high-level KPIs
- `ClientApiKeys.tsx` — placeholder for API keys (integration surface)

Sidebar addition inside `ClientLayout` and Agency `AppSidebar` module entry: "Client Collab" pointing to `/client/workspace`.

## Phase 5 — Automation & TTOS wiring

Register automation subscribers in `ttos_event_subscribers`:
- `cc.request.created` → notify recruiter + create task
- `cc.approval.pending > 24h` → escalate
- `cc.message.unread > 6h` → email digest
- `job_order.filled` → notify client
- `worker.assigned` → post activity + notification
- `time_ticket.submitted` → cc_notifications insert

## Technical notes
- Every `CREATE TABLE public.cc_*` followed by GRANT to authenticated + service_role, then ENABLE RLS, then policies.
- Use `private.has_role` for agency-side privileged reads.
- Audit table has only INSERT policy (via trigger check that actor_user_id = auth.uid()); no UPDATE/DELETE policies.
- Realtime enabled via `ALTER PUBLICATION supabase_realtime ADD TABLE public.cc_messages, cc_notifications, cc_activities;`.
- Fix outstanding security finding `eeo_demographics_compliance_role_check` in the same migration by scoping the compliance_specialist policy to worker agency membership.

## Deliverables
- 1 migration (13 tables + realtime + eeo fix)
- 1 storage bucket
- 7 edge functions
- 1 hooks file
- ~14 UI files + route registration in `src/App.tsx`
- Sidebar entry in `AppSidebar.tsx` and `ClientLayout.tsx`
