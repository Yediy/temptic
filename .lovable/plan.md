
# IWOS 4.5 — Digital Time Ticket OS

Purely additive layer on top of the existing Temp Tic stack. Nothing in TTOS, WOIC, Recruit, Onboarding, Passport, Twin, Scheduling, or the legacy paper ticket system is modified. All new tables use the `tto_*` prefix (Time-Ticket OS) to avoid colliding with the existing `tickets` / `ticket_*` paper-ticket schema.

## Scope

Digital time capture (clock in/out, breaks, GPS, photos), supervisor approvals, AI validation via WOIC, worker correction center, payroll/billing prep, live labor dashboard, audit trail, and mobile experience.

## Database (single additive migration)

New tables, all tenant-scoped by `agency_id` with RLS, GRANTs, timestamps, and update triggers:

- `tto_time_tickets` — one per worker per shift/day; header, status, totals
- `tto_time_entries` — clock in/out punches with source (mobile/qr/nfc/portal)
- `tto_break_entries` — break start/end pairs
- `tto_shift_events` — scheduled vs actual, late, early, no-show
- `tto_ticket_approvals` — supervisor decisions (approve/reject/correction)
- `tto_ticket_corrections` — worker-submitted correction requests + evidence
- `tto_labor_costs` — computed pay lines (reg/OT/DT/holiday/diff/travel/bonus)
- `tto_billable_hours` — computed bill lines (rate/markup/travel/expenses)
- `tto_payroll_batches` / `tto_billing_batches` — grouped export runs
- `tto_audit_events` — immutable action log (append-only, no update/delete)
- `tto_gps_events` — optional geolocation pings
- `tto_expense_entries` — per-diem, mileage, receipts

Status enum: `open | in_progress | submitted | approved | rejected | corrected | payroll_ready | billing_ready | closed`.

Grants: `authenticated` for read/insert on rows they own or supervise; `service_role` all. RLS via existing `has_role`, `current_user_agency_ids`, and worker/client ownership helpers.

## Edge Functions

- `tto-clock` — validates + inserts punch, emits TTOS `time.clock_in` / `time.clock_out`
- `tto-submit-ticket` — closes ticket, runs WOIC validation, sets `submitted`
- `tto-approve-ticket` — supervisor approve/reject/correction, writes audit
- `tto-validate` — WOIC-backed anomaly scan (missing punches, overlaps, OT, geo mismatch, cert issues)
- `tto-prepare-payroll` — computes reg/OT/DT/holiday/diff for a batch
- `tto-prepare-billing` — computes bill lines with markup/expenses
- `tto-live-labor` — aggregated live dashboard read (active workers, hours, cost)

Every function uses `withSentry`, `_shared/auth.ts`, standardized JSON error contract, and emits TTOS events via the existing `ttos_events` table.

## Client hooks

- `src/hooks/tto/use-time-tickets.ts`
- `src/hooks/tto/use-approvals.ts`
- `src/hooks/tto/use-corrections.ts`
- `src/hooks/tto/use-live-labor.ts`
- `src/hooks/tto/use-payroll-billing.ts`

## UI (new routes, no redesign of existing pages)

Under `src/pages/tto/`:

- `TtoLayout.tsx` — tabbed shell
- `TimeTicketDashboard.tsx` — agency overview
- `WorkerTimeCenter.tsx` — worker clock in/out, my tickets, corrections
- `SupervisorApprovalCenter.tsx` — queue, bulk approve, edit, comment
- `CorrectionQueue.tsx` — corrections triage
- `PayrollPrep.tsx` — batches, exceptions, export
- `BillingPrep.tsx` — batches, invoice line items
- `LiveLaborDashboard.tsx` — real-time via Supabase Realtime channel
- `LaborAnalytics.tsx` — trends, OT, approval delay, no-show rate
- `AuditCenter.tsx` — immutable event log viewer

Routes registered in `src/App.tsx`. Sidebar entry "Time Ticket OS" added to `AppSidebar.tsx` (Agency portal only). Worker portal gets a "Time" tab; Client portal gets an "Approvals" tab — both additive.

## Technical details

- All new tables prefixed `tto_` to avoid clashing with existing `tickets` table (paper legacy).
- All state transitions go through Edge Functions, matching the existing server-side transition rule.
- WOIC integration reuses `woic-api` dispatcher; no new WOIC tables.
- TTOS integration reuses `ttos_events` + `ttos-dispatch`; no new TTOS tables.
- Audit uses `tto_audit_events` with RLS blocking UPDATE/DELETE for authenticated users, matching existing `ticket_signatures` immutability pattern.
- Realtime enabled on `tto_time_entries` and `tto_time_tickets` for the live dashboard.
- Mobile-first UI reusing existing `MobileBottomNav` and Tailwind tokens; no new palette.

## Out of scope

- No changes to the existing paper `tickets` flow — it stays intact.
- NFC check-in stubbed (schema field only, no runtime).
- No new payment/payroll provider integration; export is CSV to match existing bulk payroll export pattern.
