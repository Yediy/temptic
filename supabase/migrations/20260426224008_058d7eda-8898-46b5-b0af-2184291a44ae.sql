CREATE TABLE public.rate_limit_events (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  endpoint TEXT NOT NULL,
  rate_key TEXT NOT NULL,
  ip_address TEXT,
  user_id UUID,
  user_role TEXT,
  attempt_count INTEGER,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_rate_limit_events_created_at ON public.rate_limit_events (created_at DESC);
CREATE INDEX idx_rate_limit_events_endpoint_created ON public.rate_limit_events (endpoint, created_at DESC);
CREATE INDEX idx_rate_limit_events_ip ON public.rate_limit_events (ip_address, created_at DESC);

ALTER TABLE public.rate_limit_events ENABLE ROW LEVEL SECURITY;

-- Block all client writes (service role bypasses RLS)
CREATE POLICY "Block rate_limit_events insert"
  ON public.rate_limit_events FOR INSERT TO authenticated
  WITH CHECK (false);

CREATE POLICY "Block rate_limit_events update"
  ON public.rate_limit_events FOR UPDATE TO authenticated
  USING (false);

CREATE POLICY "Block rate_limit_events delete"
  ON public.rate_limit_events FOR DELETE TO authenticated
  USING (false);

-- Only super_admin can read
CREATE POLICY "Super admin reads rate_limit_events"
  ON public.rate_limit_events FOR SELECT TO authenticated
  USING (public.has_role(auth.uid(), 'super_admin'));