# Project Rules

- Database privacy (RLS) regression tests live in `supabase/tests/*.sql`; each runs inside a transaction and rolls back, so it can be run safely against the live database.
- Screening record reads/downloads/signs go through log_screening_access / get_screening_document / sign_screening_consent so every access lands in the immutable screening_access_log; why: compliance traceability (SELECT can't be audited by triggers).
