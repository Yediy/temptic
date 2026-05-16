
ALTER TABLE public.agencies
  ADD COLUMN IF NOT EXISTS stripe_customer_id text,
  ADD COLUMN IF NOT EXISTS stripe_subscription_id text,
  ADD COLUMN IF NOT EXISTS subscription_status text,
  ADD COLUMN IF NOT EXISTS subscription_plan text,
  ADD COLUMN IF NOT EXISTS subscription_current_period_end timestamptz,
  ADD COLUMN IF NOT EXISTS subscription_cancel_at timestamptz;

CREATE UNIQUE INDEX IF NOT EXISTS agencies_stripe_customer_id_key
  ON public.agencies (stripe_customer_id)
  WHERE stripe_customer_id IS NOT NULL;

CREATE UNIQUE INDEX IF NOT EXISTS agencies_stripe_subscription_id_key
  ON public.agencies (stripe_subscription_id)
  WHERE stripe_subscription_id IS NOT NULL;

CREATE TABLE IF NOT EXISTS public.stripe_events (
  id text PRIMARY KEY,
  type text NOT NULL,
  payload jsonb NOT NULL,
  received_at timestamptz NOT NULL DEFAULT now(),
  processed_at timestamptz
);

ALTER TABLE public.stripe_events ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Block stripe_events insert"
  ON public.stripe_events FOR INSERT TO authenticated WITH CHECK (false);
CREATE POLICY "Block stripe_events update"
  ON public.stripe_events FOR UPDATE TO authenticated USING (false);
CREATE POLICY "Block stripe_events delete"
  ON public.stripe_events FOR DELETE TO authenticated USING (false);
CREATE POLICY "Super admin reads stripe_events"
  ON public.stripe_events FOR SELECT TO authenticated
  USING (public.has_role(auth.uid(), 'super_admin'));
