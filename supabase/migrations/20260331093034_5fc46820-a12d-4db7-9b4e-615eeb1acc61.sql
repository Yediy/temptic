-- 1. Restrict ticket_counters UPDATE to service_role only (used by next_ticket_number function)
DROP POLICY IF EXISTS "Agency updates own counters" ON public.ticket_counters;

CREATE POLICY "Block ticket_counters update"
  ON public.ticket_counters
  FOR UPDATE
  TO authenticated
  USING (false);

-- 2. Column-level: hide ip_address and user_agent from ticket_signatures for client/worker policies
-- Already revoked all and granted safe columns for authenticated. 
-- The scanner says ip_address/user_agent are still exposed - let's verify our grants took effect
-- by re-running the explicit column grants (the REVOKE ALL + GRANT should have excluded those columns)