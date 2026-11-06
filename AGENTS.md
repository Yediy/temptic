# Project Rules

- Database privacy (RLS) regression tests live in `supabase/tests/*.sql`; each runs inside a transaction and rolls back, so it can be run safely against the live database.
