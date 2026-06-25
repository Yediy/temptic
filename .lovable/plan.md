# Temp Tic Launch Readiness Plan

This is a very large request (13 workstreams). To keep changes safe and reviewable without redesigning the app, I'll deliver this in **5 ordered phases**. Each phase ends with a working, buildable app you can test before I move on.

I will preserve the existing stack (React + Vite + Supabase + existing edge functions) and the existing UI of the agency/client/worker/admin portals. No re-skin, no new pricing tiers.

---

## Assumptions (please confirm or correct)

1. Resend, DocRaptor, Stripe are already provisioned as secrets (they show up in the project's secret list). I will **not** ask you to re-paste them.
2. `EMAIL_FROM`, `STRIPE_PRICE_ID_MONTHLY`, `STRIPE_PRICE_ID_YEARLY`, `VITE_SENTRY_DSN` are missing — I will request them via `add_secret` in Phase 1.
3. Lovable's built-in email infra is **not** in use here; this project sends mail directly through Resend via edge functions. I will keep it that way (you've built around it already).
4. Audit log table (`audit_logs`) already exists — I'll add a `/audit-log` UI on top of it, not a new table.
5. `notifications` table already exists — I'll add a bell UI on top of it, not a new table.
6. Demo mode already has `useIsDemo` + `withDemoGuard` — I'll apply guards to remaining mutation sites, not redesign demo mode.

If any of these are wrong, tell me before I start Phase 1.

---

## Phase 1 — Configuration & Health (foundation)

Goal: every integration is observable and the app reports honestly when something is missing.

- Request missing secrets via `add_secret`: `STRIPE_PRICE_ID_MONTHLY`, `STRIPE_PRICE_ID_YEARLY`, `EMAIL_FROM`, `VITE_SENTRY_DSN`.
- Add `/system-health` (super_admin only): pings a new `system-health` edge function that reports Healthy / Needs Setup / Error / Unknown for: Supabase DB, Storage, Stripe, Resend, DocRaptor, Sentry FE, Sentry Edge, Notifications, PDF.
- Verify Sentry: confirm `src/instrument.ts` initializes from `VITE_SENTRY_DSN`; add **Trigger Frontend Test Error** button to SuperAdminDashboard alongside the existing edge-function test button.
- Cookie banner component (Accept All / Reject Non-Essential), persisted in `localStorage`, gates non-essential analytics. Essential cookies always allowed.

## Phase 2 — Stripe end-to-end + Billing UI

- `create-checkout-session` edge fn: use `STRIPE_PRICE_ID_MONTHLY` / `_YEARLY` envs, return `{ url }` or `{ configured: false }` if Stripe is missing.
- `handle-stripe-webhook`: verify it handles `checkout.session.completed`, `customer.subscription.updated`, `customer.subscription.deleted`; persist `subscription_status`, `subscription_interval`, `current_period_end`, `stripe_customer_id`, `stripe_subscription_id` on `agencies`.
- Billing page: show Trial / Active / Past Due / Canceled / Renewal Date / Interval / single plan "Temp Tic Agency" $80mo / $816yr. Honest "Setup pending" if Stripe env missing — no fake checkout.
- Single plan only — no reintroduction of tiers.

## Phase 3 — Resend templates + Notification bell

- New shared `_shared/email/render.tsx` with branded Temp Tic layout (header w/ wordmark, CTA button helper, footer w/ legal links). All templates use it.
- Templates (React server-rendered to HTML via `@react-email/render`):
  - Agency: welcome, trial-started, billing-success, payment-failed
  - Client: ticket-ready, ticket-reminder, ticket-signed, ticket-rejected, invite-accepted
  - Worker: ticket-assigned, ticket-approved, ticket-updated
- `send-notification-email` edge fn: render template by name, send via Resend, write `notifications` row with status `queued|sent|failed|skipped`. If `RESEND_API_KEY` missing → `skipped`, never `sent`.
- AdminNotifications page: add status filter (sent / failed / skipped / queued) and template filter.
- Super-admin-only **Send test email** control on SuperAdminDashboard.
- **Notification bell** in `AppLayout` (agency-scoped) showing recent `notifications` rows with read/unread (`read_at` column — add via migration if missing).

## Phase 4 — DocRaptor PDFs + Storage hardening + Audit log UI

- `generate-pdf` edge fn: call DocRaptor REST API (`docraptor.com/docs`) with rendered HTML (daily / weekly templates), get PDF binary, upload to `ticket-assets` bucket at `{agency_id}/{ticket_id}/{copy}-v{n}.pdf`, then insert `pdf_documents` row (only after successful upload). Variants: agency, client, worker (worker copy strips signatures + rates + private notes), plus archive copy.
- PDFs include: Temp Tic wordmark, QR placeholder (verification URL), ticket number, page X of Y, generated timestamp, signature block + initials, version, history section.
- If `DOCRAPTOR_API_KEY` missing → return `{ available: false }`, UI shows honest "PDF generation unavailable".
- Storage verification: confirm `ticket-assets` is private; re-check RLS on `storage.objects` for agency/client/worker role scoping. `get-pdf-download` already issues signed URLs — verify works for each role.
- `/audit-log` page: paginated, agency-scoped (super_admin sees all). Columns: Date, User, Role, Action, Object Type, Object ID, Result, IP, User Agent — sourced from existing `audit_logs`.

## Phase 5 — Legal pages, demo mode, QA checklist

- Replace `Terms`, `Privacy` with starter copy + add `CookiePolicy` and `AcceptableUse`. All carry the "Starter template — review with counsel before public launch." banner. Use temptic.com emails (support / billing / privacy / hello).
- Audit demo guards: ensure `withDemoGuard` wraps send-ticket, sign-ticket, reject-ticket, delete actions, edit submit, invite sends, Stripe checkout, generate-pdf invocation, send-notification-email invocation. Toast: "Demo Environment: Action simulated."
- Update `/qa` (QAChecklist) with the 12 new launch tests you listed.

---

## Technical notes

- No schema redesign. Migrations only for: `notifications.read_at TIMESTAMPTZ NULL` (if absent), and grants/RLS confirmations.
- All edge fns continue to use existing `withSentry` wrapper.
- All "missing key" paths return structured `{ available: false, reason }` — UI renders "Setup pending", never fakes success.
- Build is verified after each phase.

---

## What I need from you to start

1. Approve this 5-phase plan (or tell me to merge/split phases).
2. Confirm the assumptions above.
3. Confirm you want me to **request** the 4 missing secrets via the secure form (you'll paste values).

Once you reply "go", I'll start Phase 1.
