
-- Fix overly permissive insert policies on download_logs and audit_logs
DROP POLICY "Insert download logs" ON public.download_logs;
DROP POLICY "Insert audit logs" ON public.audit_logs;

-- Download logs: only authenticated users can insert for tickets they can access
CREATE POLICY "Insert download logs" ON public.download_logs FOR INSERT TO authenticated
  WITH CHECK (
    downloaded_by_id = auth.uid()
  );

-- Audit logs: only agency members can insert for their tickets
CREATE POLICY "Insert audit logs" ON public.audit_logs FOR INSERT TO authenticated
  WITH CHECK (
    ticket_id IN (SELECT id FROM public.tickets WHERE agency_id = public.get_user_agency_id(auth.uid()))
  );
