-- 1. Client signers: add SELECT policy so signers can read their own record directly
CREATE POLICY "Client signer reads own record"
  ON public.client_signers FOR SELECT TO authenticated
  USING (user_id = auth.uid());

-- 2. Workers: allow reading their own ticket signatures
CREATE POLICY "Worker reads own signatures"
  ON public.ticket_signatures FOR SELECT TO authenticated
  USING (
    ticket_id IN (
      SELECT id FROM public.tickets
      WHERE worker_id = get_user_worker_id(auth.uid())
    )
  );

-- 3. Audit logs: restrict INSERT to service_role only by dropping the permissive authenticated policy
DROP POLICY IF EXISTS "Insert audit logs" ON public.audit_logs;