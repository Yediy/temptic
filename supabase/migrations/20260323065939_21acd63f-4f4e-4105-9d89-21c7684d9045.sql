-- Allow clients to UPDATE their own tickets (for sign/reject)
CREATE POLICY "Client updates own tickets"
ON public.tickets
FOR UPDATE
TO authenticated
USING (client_id = get_user_client_id(auth.uid()))
WITH CHECK (client_id = get_user_client_id(auth.uid()));

-- Allow agency to UPDATE ticket_days
CREATE POLICY "Agency updates ticket days"
ON public.ticket_days
FOR UPDATE
TO authenticated
USING (ticket_id IN (SELECT id FROM tickets WHERE agency_id = get_user_agency_id(auth.uid())))
WITH CHECK (ticket_id IN (SELECT id FROM tickets WHERE agency_id = get_user_agency_id(auth.uid())));

-- Allow clients to UPDATE client_signers
CREATE POLICY "Client updates own signer record"
ON public.client_signers
FOR UPDATE
TO authenticated
USING (user_id = auth.uid())
WITH CHECK (user_id = auth.uid());

-- Allow agency to INSERT pdf_documents
CREATE POLICY "Agency inserts pdfs"
ON public.pdf_documents
FOR INSERT
TO authenticated
WITH CHECK (ticket_id IN (SELECT id FROM tickets WHERE agency_id = get_user_agency_id(auth.uid())));