
-- Add explicit block policies for DELETE and UPDATE on ticket_signatures
CREATE POLICY "Block ticket_signatures update"
  ON public.ticket_signatures
  FOR UPDATE
  TO authenticated
  USING (false);

CREATE POLICY "Block ticket_signatures delete"
  ON public.ticket_signatures
  FOR DELETE
  TO authenticated
  USING (false);
