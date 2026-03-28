-- Fix: Tighten download_logs INSERT to enforce ticket ownership
-- Prevents cross-agency audit poisoning

DROP POLICY IF EXISTS "Insert download logs" ON public.download_logs;

CREATE POLICY "Insert download logs"
  ON public.download_logs
  FOR INSERT
  TO authenticated
  WITH CHECK (
    downloaded_by_id = auth.uid()
    AND ticket_id IN (
      SELECT id FROM tickets
      WHERE agency_id = get_user_agency_id(auth.uid())
         OR client_id = get_user_client_id(auth.uid())
         OR worker_id = get_user_worker_id(auth.uid())
    )
  );