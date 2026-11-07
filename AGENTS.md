# Project Rules

- Database privacy (RLS) regression tests live in `supabase/tests/*.sql`; each runs inside a transaction and rolls back, so it can be run safely against the live database.
- Screening record reads/downloads/signs go through log_screening_access / get_screening_document / sign_screening_consent so every access lands in the immutable screening_access_log; why: compliance traceability (SELECT can't be audited by triggers).
- Module events for Automation Studio are published by the private.publish_module_event DB trigger (insert / status change / delete → '<type>.<status>' in ttos_events, PII keys stripped, instant ttos-dispatch call + hourly backstop); why: catches every write path, not just UI calls.
- Sensitive automation actions (launch_drug_test, generate_payroll, escalate_issue) are never run by ttos-dispatch; it queues automation_action_approvals and they execute only via decide_automation_action, which checks private.automation_action_roles and writes the immutable automation_approval_audit; why: human sign-off with role checks for high-impact steps.
- Automation condition/action-planning logic lives in src/lib/automation/simulate.ts and is copied verbatim to supabase/functions/_shared/automation-sim.ts for ttos-dispatch; why: Studio simulations must match live engine behaviour — edit both together.
