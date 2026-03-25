
-- 1. Block direct inserts on ticket_counters (next_ticket_number uses SECURITY DEFINER)
CREATE POLICY "Block ticket_counters insert"
ON public.ticket_counters
FOR INSERT
TO authenticated
WITH CHECK (false);

-- 2. Restrict notifications INSERT to service_role only (block authenticated users)
DROP POLICY IF EXISTS "Agency inserts own notifications" ON public.notifications;
CREATE POLICY "Block notifications insert"
ON public.notifications
FOR INSERT
TO authenticated
WITH CHECK (false);

-- 3. Confirm audit_logs INSERT is explicitly blocked
CREATE POLICY "Block audit_logs insert"
ON public.audit_logs
FOR INSERT
TO authenticated
WITH CHECK (false);
