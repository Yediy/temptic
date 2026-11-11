CREATE TABLE public.perception_observation_pins (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  agency_id uuid NOT NULL,
  user_id uuid NOT NULL DEFAULT auth.uid(),
  observation_id uuid NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (user_id, observation_id)
);
GRANT SELECT, INSERT, DELETE ON public.perception_observation_pins TO authenticated;
GRANT ALL ON public.perception_observation_pins TO service_role;
ALTER TABLE public.perception_observation_pins ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Own pins readable" ON public.perception_observation_pins FOR SELECT TO authenticated
  USING (user_id = auth.uid() AND agency_id IN (SELECT private.current_user_agency_ids()));
CREATE POLICY "Own pins insertable" ON public.perception_observation_pins FOR INSERT TO authenticated
  WITH CHECK (user_id = auth.uid() AND agency_id IN (SELECT private.current_user_agency_ids())
    AND EXISTS (SELECT 1 FROM public.ttos_events e WHERE e.id = observation_id AND e.agency_id = perception_observation_pins.agency_id));
CREATE POLICY "Own pins deletable" ON public.perception_observation_pins FOR DELETE TO authenticated
  USING (user_id = auth.uid());
CREATE INDEX ON public.perception_observation_pins (user_id, agency_id);