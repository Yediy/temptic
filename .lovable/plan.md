# IWOS Build 4.6 — Payroll & Billing Operating Profile

Additive extension only. Consumes verified time from TTO (Build 4.5), uses WOIC for intelligence, and TTOS for automation. No existing tables, functions, or UI will be rebuilt.

## 1. Database (additive migration)

New tables, all tenant-scoped by `agency_id` with RLS using `private.has_role` (matching the 4.5 pattern) and full GRANTs. All get `created_at` / `updated_at` + `update_updated_at_column` trigger.

- `pb_worker_pay_rates` — worker_id, agency_id, rate_type (regular/OT/DT/holiday/shift_diff), amount, effective_from/to
- `pb_client_bill_rates` — client_id, agency_id, role, rate_type, amount, markup_pct, effective_from/to
- `pb_commission_rules` — agency_id, recruiter_id (nullable=default), rule_type (placement/margin/referral/override/split), config jsonb
- `pb_payroll_runs` — agency_id, period_start/end, status (draft/review/approved/paid/exception), totals jsonb, source_batch_id (fk tto_payroll_batches)
- `pb_payroll_items` — run_id, worker_id, ticket_id, regular_hours, ot_hours, dt_hours, holiday_hours, shift_diff, bonuses, mileage, per_diem, expenses, gross_pay, taxes, deductions, net_pay
- `pb_payroll_exceptions` — run_id, item_id (nullable), category, severity, message, resolved_at, resolved_by
- `pb_invoices` — agency_id, client_id, number, status (draft/review/approved/sent/paid/overdue/void), period_start/end, subtotal, tax, credits, total, sent_at, due_at, paid_at, source_batch_id (fk tto_billing_batches)
- `pb_invoice_items` — invoice_id, ticket_id, worker_id, description, hours, bill_rate, markup, travel, expenses, tax, amount
- `pb_invoice_payments` — invoice_id, amount, method (ach/check/wire/stripe/plaid), reference, received_at, provider_event_id
- `pb_commission_records` — agency_id, recruiter_id, rule_id, placement_id (nullable), worker_id, invoice_id (nullable), basis_amount, rate, amount, status (pending/approved/paid)
- `pb_financial_forecasts` — agency_id, horizon_start/end, metric (payroll_cost/revenue/cash_flow/ar/profit), value_json, generated_at
- `pb_margin_analysis` — agency_id, scope (client/worker/assignment/branch), scope_id, period_start/end, revenue, cost, gross_margin, net_margin, computed_at

Every write emits a TTOS event (`payroll.*`, `billing.*`, `commission.*`) via the existing `ttos_events` insert pattern used by TTO.

## 2. Edge Functions (new only)

- `pb-generate-payroll` — Input: `{ agency_id, period_start, period_end, source_batch_id? }`. Pulls from `tto_labor_costs` + `tto_time_tickets` (approved only). Applies `pb_worker_pay_rates` to compute reg/OT/DT/holiday/shift_diff, taxes/deductions (rule-based stub, extensible), net pay. Writes `pb_payroll_runs` + `pb_payroll_items`. Runs exception detection → `pb_payroll_exceptions`.
- `pb-generate-invoices` — Input: `{ agency_id, period_start, period_end, source_batch_id? }`. Pulls from `tto_billable_hours`. Groups by client, applies `pb_client_bill_rates` (with markup, travel, expenses, tax). Writes `pb_invoices` + `pb_invoice_items`.
- `pb-compute-commissions` — Applies `pb_commission_rules` against placements/invoices/margins → `pb_commission_records`.
- `pb-forecast` — WOIC-backed forecast writer: consumes recent payroll/invoice history, writes `pb_financial_forecasts` and `pb_margin_analysis`. Calls `woic-api` for intelligence.
- `pb-record-payment` — Records payment against invoice, updates invoice status (paid/partial/overdue), emits TTOS event.
- `pb-compliance-scan` — Wraps `woic-compliance-scan` for tax/OT/labor law checks on a payroll run, writes exceptions.

All functions: shared auth helper (401/403 JSON contract), Sentry-wrapped, service-role DB writes, TTOS event emission, audit rows.

## 3. Hooks

`src/hooks/pb/use-pb.ts` — React Query hooks:
- `usePayrollRuns`, `usePayrollRun(id)`, `usePayrollItems(runId)`, `usePayrollExceptions(runId)`
- `useGeneratePayroll`, `useApprovePayrollRun`, `useMarkPayrollPaid`
- `useInvoices`, `useInvoice(id)`, `useInvoiceItems(invoiceId)`, `useGenerateInvoices`, `useSendInvoice`, `useRecordPayment`
- `usePayRates`, `useBillRates`, `useCommissionRules`, `useCommissionRecords`
- `useForecasts`, `useMarginAnalysis`, `useFinancialDashboard`

All use `useAuthGuardedAction` and explicit `agency_id` scoping.

## 4. UI (new module under `/pb`)

`src/pages/pb/PbLayout.tsx` with tabbed nav. New pages:

- `PayrollCommandCenter.tsx` — status tiles (open/pending/completed/exceptions), readiness gauge, upcoming dates, gross/net totals
- `PayrollRuns.tsx` — list + detail drawer with items table, exception panel, approve/pay actions
- `PayrollEngine.tsx` — trigger UI (period picker → `pb-generate-payroll`)
- `PayrollExceptionCenter.tsx` — grouped by category with resolve action
- `Invoices.tsx` — list w/ status filters (draft/review/sent/paid/overdue), detail drawer w/ line items, actions (approve/send/void)
- `InvoiceGenerator.tsx` — period picker → `pb-generate-invoices`
- `PaymentCenter.tsx` — payment log + record-payment form, outstanding balances
- `RateBook.tsx` — CRUD for `pb_worker_pay_rates` and `pb_client_bill_rates`
- `CommissionCenter.tsx` — commission rules CRUD + computed records list
- `MarginIntelligence.tsx` — WOIC-driven margin cards by client/worker/assignment/branch
- `FinancialForecast.tsx` — forecast charts (payroll cost, revenue, cash flow, AR, profit)
- `ExecutiveDashboard.tsx` — top-line rev/payroll/profit/margins/AR/AP/growth
- `PbAnalytics.tsx` — report generator (payroll, invoice, revenue, margin, commission, profitability)
- `PbCompliance.tsx` — trigger `pb-compliance-scan`, view findings
- `PbIntegrations.tsx` — connector status placeholders for QuickBooks, ADP, Paychex, Gusto, Stripe, Plaid, ERP, generic accounting (uses existing "activation pending" pattern until keys provided)

Add to `AppSidebar.tsx` under a "Payroll & Billing" group. Register routes in `src/App.tsx` under existing agency `ProtectedRoute` (roles: `super_admin`, `agency_admin`, `payroll`).

## 5. Security

- All tables RLS-scoped by `agency_id` via `private.has_role` + agency membership.
- Financial write actions restricted to `agency_admin`/`payroll`/`super_admin` roles.
- `pb_payroll_items`, `pb_invoice_items` are UPDATE/DELETE-blocked post-approval (trigger).
- All state changes append to `tto_audit_events` (reuse) with `module='pb'`.

## 6. Automation (TTOS)

New TTOS event types: `payroll.run.created`, `payroll.run.approved`, `payroll.exception.raised`, `invoice.created`, `invoice.sent`, `invoice.paid`, `invoice.overdue`, `commission.computed`, `forecast.updated`. TTO batch closure auto-fires generation via `ttos-dispatch` subscriber pattern.

## 7. Integrations (scaffolds)

Config-only stubs in `PbIntegrations.tsx` and a single `pb-integrations` edge function that routes by provider slug. Live wiring deferred until user provides keys (matches existing "graceful degradation" memory).

## Out of scope

- Tax engine actual filings (rules table + stub calculations only)
- Live QuickBooks/ADP/Gusto/Paychex/Plaid pushes (scaffolds only until API keys arrive)
- No changes to any existing 4.x module, table, function, or route
