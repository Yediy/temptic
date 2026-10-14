CREATE TABLE public.tto_approval_links (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  agency_id uuid NOT NULL,
  time_ticket_id uuid NOT NULL REFERENCES public.tto_time_tickets(id) ON DELETE CASCADE,
  signer_id uuid REFERENCES public.client_signers(id) ON DELETE SET NULL,
  channel text NOT NULL,
  recipient text NOT NULL,
  token_hash text NOT NULL UNIQUE,
  expires_at timestamptz NOT NULL,
  used_at timestamptz,
  revoked_at timestamptz,
  decision text,
  decision_ip text,
  decision_user_agent text,
  created_by uuid,
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX idx_tto_approval_links_ticket ON public.tto_approval_links(time_ticket_id);
GRANT SELECT ON public.tto_approval_links TO authenticated;
GRANT ALL ON public.tto_approval_links TO service_role;
ALTER TABLE public.tto_approval_links ENABLE ROW LEVEL SECURITY;
CREATE POLICY "agency_read_approval_links" ON public.tto_approval_links FOR SELECT TO authenticated
USING (agency_id IN (SELECT private.current_user_agency_ids()));