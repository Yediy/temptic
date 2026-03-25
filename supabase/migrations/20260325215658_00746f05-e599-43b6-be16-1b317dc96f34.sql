
-- Create client_invites table
CREATE TABLE public.client_invites (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  agency_id UUID NOT NULL REFERENCES public.agencies(id) ON DELETE CASCADE,
  client_id UUID NOT NULL REFERENCES public.clients(id) ON DELETE CASCADE,
  client_signer_id UUID NOT NULL REFERENCES public.client_signers(id) ON DELETE CASCADE,
  email TEXT NOT NULL,
  token TEXT NOT NULL DEFAULT encode(gen_random_bytes(32), 'hex') UNIQUE,
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'accepted', 'expired', 'revoked')),
  expires_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT (now() + interval '7 days'),
  accepted_at TIMESTAMP WITH TIME ZONE,
  created_by UUID REFERENCES auth.users(id),
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- RLS policies
ALTER TABLE public.client_invites ENABLE ROW LEVEL SECURITY;

-- Agency reads/manages own invites
CREATE POLICY "Agency reads own invites"
  ON public.client_invites FOR SELECT TO authenticated
  USING (agency_id = get_user_agency_id(auth.uid()));

CREATE POLICY "Agency inserts invites"
  ON public.client_invites FOR INSERT TO authenticated
  WITH CHECK (agency_id = get_user_agency_id(auth.uid()));

CREATE POLICY "Agency updates own invites"
  ON public.client_invites FOR UPDATE TO authenticated
  USING (agency_id = get_user_agency_id(auth.uid()));

-- Index for fast token lookups
CREATE INDEX idx_client_invites_token ON public.client_invites (token);
CREATE INDEX idx_client_invites_signer ON public.client_invites (client_signer_id);
